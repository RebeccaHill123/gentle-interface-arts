import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { profileHasAccess, verifyClaim } from "@/lib/provisioning";

/**
 * Thrown when a paid checkout could not be fully provisioned. It must escape
 * the handler so Stripe receives a non-2xx response and retries.
 */
class ProvisioningError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "ProvisioningError";
    if (cause) console.error(`[webhook] ${message}`, cause);
  }
}

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}


function resolvePriceLookupKey(item: any): string | null {
  return (
    (item?.price?.lookup_key as string | undefined) ||
    (item?.price?.metadata?.lovable_external_id as string | undefined) ||
    null
  );
}

function toIso(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

async function findUserIdForCustomer(
  admin: any,
  subscription: any,
  env?: StripeEnv,
): Promise<string | null> {
  const metaUserId = subscription?.metadata?.userId as string | undefined;
  if (metaUserId) return metaUserId;
  const customerId =
    typeof subscription?.customer === "string"
      ? subscription.customer
      : subscription?.customer?.id;
  if (customerId) {
    const { data } = await admin
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (data?.user_id) return data.user_id;
  }

  // Fallback 1: a pending-plan row already claimed for this subscription or
  // customer (subscription.created can arrive before/after checkout.session).
  if (subscription?.id || customerId) {
    const query = admin
      .from("pending_plans")
      .select("claimed_user_id, email")
      .not("claimed_user_id", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1);
    const { data: pending } = subscription?.id
      ? await query.eq("stripe_subscription_id", subscription.id).maybeSingle()
      : await query.eq("stripe_customer_id", customerId).maybeSingle();
    if (pending?.claimed_user_id) return pending.claimed_user_id;
  }

  // Fallback 2: resolve via the Stripe Customer record — metadata.userId is
  // stamped by resolveOrCreateCustomer; otherwise match the email to a profile.
  if (customerId && env) {
    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(env);
      const customer: any = await stripe.customers.retrieve(customerId);
      const custUserId = customer?.metadata?.userId as string | undefined;
      if (custUserId) return custUserId;
      const email = customer?.email as string | undefined;
      if (email) {
        const { data: byEmail } = await admin
          .from("profiles")
          .select("user_id")
          .eq("email", email)
          .maybeSingle();
        if (byEmail?.user_id) return byEmail.user_id;
      }
    } catch (err) {
      console.error("[webhook] customer lookup failed", err);
    }
  }

  return null;
}


async function upsertFromSubscription(
  subscription: any,
  env: StripeEnv,
  options: { strict?: boolean; userId?: string } = {},
): Promise<string | null> {
  const admin = await getAdmin();
  const userId =
    options.userId ?? (await findUserIdForCustomer(admin, subscription, env));
  if (!userId) {
    if (options.strict) {
      throw new ProvisioningError(
        `no user for subscription ${subscription?.id}`,
      );
    }
    console.error("[webhook] no user for subscription", subscription.id);
    return null;
  }


  // Duplicate-trial prevention. If this profile already consumed a trial on a
  // DIFFERENT subscription, end the trial on this one immediately so Stripe
  // bills the first period straight away.
  const { data: existingProfile, error: existingProfileErr } = await admin
    .from("profiles")
    .select("has_used_trial, stripe_subscription_id, grandfathered_pro")
    .eq("user_id", userId)
    .maybeSingle();
  if (existingProfileErr && options.strict) {
    throw new ProvisioningError("profile read failed", existingProfileErr);
  }

  if (
    subscription.status === "trialing" &&
    existingProfile?.has_used_trial &&
    existingProfile.stripe_subscription_id &&
    existingProfile.stripe_subscription_id !== subscription.id
  ) {
    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(env);
      const updated = await stripe.subscriptions.update(subscription.id, {
        trial_end: "now",
      });
      subscription = updated as any;
      console.log("[webhook] duplicate trial blocked", subscription.id);
    } catch (err) {
      console.error("[webhook] could not end duplicate trial", err);
    }
  }
  const item = subscription.items?.data?.[0];
  const priceKey = resolvePriceLookupKey(item);
  const periodEnd = toIso(
    item?.current_period_end ?? subscription.current_period_end,
  );
  const status = subscription.status as string;
  const activeOrGrace =
    status === "active" ||
    status === "trialing" ||
    (status === "canceled" &&
      !!periodEnd &&
      new Date(periodEnd).getTime() > Date.now());

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  const trialStart = toIso(subscription.trial_start);
  const trialEnd = toIso(subscription.trial_end);

  const { data: updatedRows, error: updateErr } = await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceKey,
      subscription_status: status,
      current_period_end: periodEnd,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      is_pro: activeOrGrace || !!existingProfile?.grandfathered_pro,
      pro_since: activeOrGrace ? new Date().toISOString() : null,
      ...(trialStart ? { trial_start: trialStart } : {}),
      ...(trialEnd ? { trial_end: trialEnd } : {}),
      // Once a trial has been granted it is permanently consumed.
      ...(trialStart || trialEnd ? { has_used_trial: true } : {}),
    })
    .eq("user_id", userId)
    .select("user_id");
  if (updateErr) {
    if (options.strict) {
      throw new ProvisioningError("profile entitlement write failed", updateErr);
    }
    console.error("[webhook] profile entitlement write failed", updateErr);
    return null;
  }
  if (options.strict && (!updatedRows || updatedRows.length === 0)) {
    throw new ProvisioningError(
      `profile entitlement update matched no profile for ${userId}`,
    );
  }
  return userId;
}


async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const admin = await getAdmin();
  const userId = await findUserIdForCustomer(admin, subscription, env);
  if (!userId) return;
  // Check grandfathered — never revoke lifetime access.
  const { data: profile } = await admin
    .from("profiles")
    .select("grandfathered_pro")
    .eq("user_id", userId)
    .maybeSingle();
  await admin
    .from("profiles")
    .update({
      subscription_status: "canceled",
      cancel_at_period_end: false,
      is_pro: !!profile?.grandfathered_pro,
    })
    .eq("user_id", userId);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // Two possible flows:
  //  A) Pending-plan flow: client_reference_id is a pending_plans token.
  //     The auth user does NOT exist yet — we create/attach one, attach
  //     the stored plan, and issue a magic-link hashed_token so the
  //     return page can sign the user in without leaving the tab.
  //  B) Existing-user subscribe flow: session.metadata.userId is set
  //     (from src/lib/pro.functions.ts). We just stamp the customer id.
  const admin = await getAdmin();
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  const pendingToken =
    (session.client_reference_id as string | undefined) ??
    (session.metadata?.pending_token as string | undefined);

  if (pendingToken) {
    await claimPendingPlan({
      admin,
      token: pendingToken,
      session,
      customerId,
      env,
    });
    return;
  }

  const userId = session.metadata?.userId as string | undefined;
  if (userId && customerId) {
    const { data: rows, error } = await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId)
      .select("user_id");
    if (error) {
      throw new ProvisioningError("customer stamping failed", error);
    }
    if (!rows || rows.length === 0) {
      throw new ProvisioningError(
        `customer stamping matched no profile for ${userId}`,
      );
    }
  }
}

type ProfileSnapshot = {
  user_id: string;
  is_pro: boolean | null;
  grandfathered_pro: boolean | null;
  subscription_status: string | null;
  current_period_end: string | null;
};

async function readProfile(
  admin: any,
  userId: string,
): Promise<ProfileSnapshot | null> {
  const { data, error } = await admin
    .from("profiles")
    .select(
      "user_id, is_pro, grandfathered_pro, subscription_status, current_period_end",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ProvisioningError("profile read failed", error);
  return (data as ProfileSnapshot | null) ?? null;
}

async function hasPlanRow(admin: any, userId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("user_plans")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ProvisioningError("user_plans read failed", error);
  return !!data;
}

/**
 * Provision a paid pending plan into a real, entitled account.
 *
 * Every step is verified. If any step cannot be confirmed the function throws
 * a ProvisioningError, the row stays at `paid` (retriable), and Stripe retries
 * the delivery. Safe to run repeatedly: user creation, plan attachment,
 * entitlement stamping and the final claim are all idempotent.
 */
async function claimPendingPlan({
  admin,
  token,
  session,
  customerId,
  env,
}: {
  admin: any;
  token: string;
  session: any;
  customerId: string | null;
  env: StripeEnv;
}) {
  const { data: pending, error: pendingErr } = await admin
    .from("pending_plans")
    .select(
      "id, status, plan_data, claimed_user_id, email, magic_link_email, magic_link_hash",
    )
    .eq("token", token)
    .maybeSingle();
  if (pendingErr) {
    throw new ProvisioningError("pending_plans read failed", pendingErr);
  }
  if (!pending) {
    // Unknown token — nothing we can ever provision. Do not ask Stripe to
    // retry forever.
    console.error("[webhook] pending not found for token", token);
    return;
  }

  const email: string | null =
    (session.customer_details?.email as string | undefined) ??
    (session.customer_email as string | undefined) ??
    (pending.magic_link_email as string | undefined) ??
    (pending.email as string | undefined) ??
    null;

  // A previously "claimed" row is not trusted: re-verify plan + entitlement,
  // and replay provisioning if it was only partially completed.
  if (pending.status === "claimed" && pending.claimed_user_id) {
    const profile = await readProfile(admin, pending.claimed_user_id);
    const planRow = await hasPlanRow(admin, pending.claimed_user_id);
    const verification = verifyClaim({
      status: pending.status,
      claimedUserId: pending.claimed_user_id,
      profile,
      profileExists: !!profile,
      hasPlanRow: planRow,
      magicLinkHash: pending.magic_link_hash,
    });
    if (verification.complete) return; // nothing to do, no mutation
    console.warn(
      "[webhook] repairing partially claimed pending plan",
      token,
      verification.missing,
    );
  }

  if (!email) {
    throw new ProvisioningError(
      `no email available for completed session ${session.id}`,
    );
  }

  // Record the paid facts first so the return page can honestly say the
  // payment is confirmed while setup continues. Never downgrade a claimed row.
  const paidPatch: Record<string, unknown> = {
    email,
    stripe_session_id: session.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: session.subscription ?? null,
  };
  if (pending.status !== "claimed") paidPatch.status = "paid";
  const { error: paidErr } = await admin
    .from("pending_plans")
    .update(paidPatch)
    .eq("id", pending.id);
  if (paidErr) {
    throw new ProvisioningError("could not record paid state", paidErr);
  }

  // 1. Auth user + profile row.
  let userId: string | null = pending.claimed_user_id ?? null;
  if (!userId) {
    const { data: existing, error: existingErr } = await admin
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (existingErr) {
      throw new ProvisioningError("profile lookup by email failed", existingErr);
    }
    if (existing?.user_id) {
      userId = existing.user_id;
    } else {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { source: "checkout", password_set: false },
        });
      if (createErr || !created?.user) {
        // A concurrent delivery may have created the user already.
        const { data: retry } = await admin
          .from("profiles")
          .select("user_id")
          .eq("email", email)
          .maybeSingle();
        if (retry?.user_id) userId = retry.user_id;
        else throw new ProvisioningError("createUser failed", createErr);
      } else {
        userId = created.user.id;
      }
    }
  }
  if (!userId) throw new ProvisioningError("could not resolve a user id");

  let profile = await readProfile(admin, userId);
  if (!profile) {
    // The auth trigger normally creates this; make sure it exists.
    const { error: insertProfileErr } = await admin
      .from("profiles")
      .upsert({ user_id: userId, email }, { onConflict: "user_id" });
    if (insertProfileErr) {
      throw new ProvisioningError("profile creation failed", insertProfileErr);
    }
    profile = await readProfile(admin, userId);
    if (!profile) {
      throw new ProvisioningError(`profile still missing for ${userId}`);
    }
  }

  // 2. Plan attachment — never overwrite an existing user's plan.
  if (!(await hasPlanRow(admin, userId))) {
    const { error: planErr } = await admin
      .from("user_plans")
      .insert({ user_id: userId, plan: pending.plan_data });
    // A concurrent delivery may have inserted it first (unique user_id).
    if (planErr && !(await hasPlanRow(admin, userId))) {
      throw new ProvisioningError("plan attachment failed", planErr);
    }
  }
  if (!(await hasPlanRow(admin, userId))) {
    throw new ProvisioningError(`plan row missing for ${userId}`);
  }

  // 3. Entitlement from the real Stripe subscription.
  if (session.subscription) {
    const { createStripeClient } = await import("@/lib/stripe.server");
    const stripe = createStripeClient(env);
    let sub: any;
    try {
      sub = await stripe.subscriptions.retrieve(session.subscription);
      if (!sub.metadata?.userId) {
        await stripe.subscriptions.update(sub.id, {
          metadata: { ...(sub.metadata ?? {}), userId, pending_token: token },
        });
      }
      if (customerId) {
        await stripe.customers.update(customerId, { metadata: { userId } });
      }
    } catch (err) {
      throw new ProvisioningError("subscription retrieve failed", err);
    }
    sub.metadata = { ...(sub.metadata ?? {}), userId };
    await upsertFromSubscription(sub, env, { strict: true, userId });
    profile = await readProfile(admin, userId);
  }

  if (!profileHasAccess(profile)) {
    throw new ProvisioningError(
      `entitlement not active for ${userId} after provisioning`,
    );
  }

  // 4. First-access magic link. Reuse an existing hash when repairing.
  let magicHash: string | null = pending.magic_link_hash ?? null;
  if (!magicHash) {
    try {
      const origin =
        (session.return_url && new URL(session.return_url).origin) || undefined;
      const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: origin ? { redirectTo: `${origin}/dashboard` } : undefined,
      });
      if (linkErr) throw linkErr;
      magicHash =
        (link?.properties as { hashed_token?: string } | undefined)
          ?.hashed_token ?? null;
    } catch (err) {
      throw new ProvisioningError("magic link generation failed", err);
    }
  }
  if (!magicHash) {
    throw new ProvisioningError("no usable magic-link hash generated");
  }

  // 5. Final claim — then re-read to prove it landed for the right user.
  const { error: claimErr } = await admin
    .from("pending_plans")
    .update({
      status: "claimed",
      claimed_user_id: userId,
      magic_link_email: email,
      magic_link_hash: magicHash,
    })
    .eq("id", pending.id);
  if (claimErr) {
    throw new ProvisioningError("claim update failed", claimErr);
  }

  const { data: finalRow, error: finalErr } = await admin
    .from("pending_plans")
    .select("status, claimed_user_id, magic_link_hash")
    .eq("id", pending.id)
    .maybeSingle();
  if (finalErr) {
    throw new ProvisioningError("claim verification read failed", finalErr);
  }
  const finalCheck = verifyClaim({
    status: finalRow?.status,
    claimedUserId: finalRow?.claimed_user_id,
    expectedUserId: userId,
    profile,
    profileExists: true,
    hasPlanRow: true,
    magicLinkHash: finalRow?.magic_link_hash,
  });
  if (!finalCheck.complete) {
    throw new ProvisioningError(
      `claim could not be verified: ${finalCheck.missing.join(", ")}`,
    );
  }
}


async function handleInvoicePaymentFailed(invoice: any, env: StripeEnv) {
  const subId = invoice?.subscription;
  if (!subId) return;
  const { createStripeClient } = await import("@/lib/stripe.server");
  const stripe = createStripeClient(env);
  const sub = await stripe.subscriptions.retrieve(subId);
  // Status is now past_due / incomplete / unpaid — upsert applies the
  // existing payment-failure access rules (no is_pro unless grandfathered).
  await upsertFromSubscription(sub as any, env);
}

async function handleTrialWillEnd(subscription: any, env: StripeEnv) {
  // Stripe sends this ~3 days before the trial ends and emails the customer
  // when "Send trial-ending reminders" is enabled in the Dashboard. We only
  // keep our own copy of the trial-end timestamp in sync.
  await upsertFromSubscription(subscription, env);
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          return Response.json({ received: true, ignored: "invalid env" });
        }
        const env: StripeEnv = rawEnv;
        try {
          const event = await verifyWebhook(request, env);
          switch (event.type) {
            case "checkout.session.completed":
              await handleCheckoutCompleted(event.data.object, env);
              break;
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "invoice.paid":
              // For invoice.paid the object is an invoice — refresh from subscription.
              if (event.type === "invoice.paid") {
                const subId = (event.data.object as any).subscription;
                if (subId) {
                  const { createStripeClient } = await import(
                    "@/lib/stripe.server"
                  );
                  const stripe = createStripeClient(env);
                  const sub = await stripe.subscriptions.retrieve(subId);
                  await upsertFromSubscription(sub, env);
                }
              } else {
                await upsertFromSubscription(event.data.object, env);
              }
              break;
            case "invoice.payment_failed":
              await handleInvoicePaymentFailed(event.data.object, env);
              break;
            case "customer.subscription.trial_will_end":
              await handleTrialWillEnd(event.data.object, env);
              break;
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(event.data.object, env);
              break;
            default:
              console.log("[webhook] unhandled", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] error", e);
          // ProvisioningError means payment succeeded but access is not yet
          // fully provisioned: answer non-2xx so Stripe retries the delivery.
          if (e instanceof ProvisioningError) {
            return new Response("Provisioning incomplete — retry", {
              status: 500,
            });
          }
          return new Response("Webhook error", { status: 400 });

        }
      },
    },
  },
});
