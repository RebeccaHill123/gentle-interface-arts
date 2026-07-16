import { createFileRoute } from "@tanstack/react-router";
import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";

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
): Promise<string | null> {
  const metaUserId = subscription?.metadata?.userId as string | undefined;
  if (metaUserId) return metaUserId;
  const customerId =
    typeof subscription?.customer === "string"
      ? subscription.customer
      : subscription?.customer?.id;
  if (!customerId) return null;
  const { data } = await admin
    .from("profiles")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

async function upsertFromSubscription(subscription: any, env: StripeEnv) {
  const admin = await getAdmin();
  const userId = await findUserIdForCustomer(admin, subscription);
  if (!userId) {
    console.error("[webhook] no user for subscription", subscription.id);
    return;
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

  await admin
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceKey,
      subscription_status: status,
      current_period_end: periodEnd,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      is_pro: activeOrGrace,
      pro_since: activeOrGrace ? new Date().toISOString() : null,
    })
    .eq("user_id", userId);
}

async function handleSubscriptionDeleted(subscription: any) {
  const admin = await getAdmin();
  const userId = await findUserIdForCustomer(admin, subscription);
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
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId);
  }
}

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
  // Load the pending row. Idempotent: bail early if already claimed.
  const { data: pending, error: pendingErr } = await admin
    .from("pending_plans")
    .select("id, status, plan_data, claimed_user_id")
    .eq("token", token)
    .maybeSingle();
  if (pendingErr || !pending) {
    console.error("[webhook] pending not found for token", token, pendingErr);
    return;
  }
  if (pending.status === "claimed") return;

  const email =
    (session.customer_details?.email as string | undefined) ??
    (session.customer_email as string | undefined) ??
    null;
  if (!email) {
    console.error("[webhook] no email on completed session", session.id);
    return;
  }

  // Mark 'paid' first so poll-endpoint can show progress.
  await admin
    .from("pending_plans")
    .update({
      status: "paid",
      email,
      stripe_session_id: session.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: session.subscription ?? null,
    })
    .eq("id", pending.id)
    .neq("status", "claimed");

  // Find or create the auth user by email.
  let userId: string | null = null;
  const { data: existing } = await admin
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();
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
      console.error("[webhook] createUser failed", createErr);
      return;
    }
    userId = created.user.id;
  }
  if (!userId) return;

  // Attach the plan to user_plans (upsert; do not clobber existing plan
  // if it exists — treat existing plan as source of truth).
  const { data: existingPlan } = await admin
    .from("user_plans")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!existingPlan) {
    await admin
      .from("user_plans")
      .insert({ user_id: userId, plan: pending.plan_data });
  }

  // Stamp Stripe fields on the profile via the shared upserter. We need
  // the full subscription for that, so fetch it.
  if (session.subscription) {
    const { createStripeClient } = await import("@/lib/stripe.server");
    const stripe = createStripeClient(env);
    try {
      const sub = await stripe.subscriptions.retrieve(session.subscription);
      // Ensure metadata.userId is set for later portal lookups.
      if (!sub.metadata?.userId) {
        await stripe.subscriptions.update(sub.id, {
          metadata: { ...(sub.metadata ?? {}), userId, pending_token: token },
        });
      }
      if (customerId) {
        await stripe.customers.update(customerId, {
          metadata: { userId },
        });
      }
      // Patch userId onto the local object so upsertFromSubscription resolves it.
      (sub as any).metadata = { ...(sub.metadata ?? {}), userId };
      await upsertFromSubscription(sub as any, env);
    } catch (err) {
      console.error("[webhook] subscription retrieve failed", err);
    }
  }

  // Generate a magic-link hashed_token so the return page can sign the
  // user in without leaving the tab. Also triggers the Supabase email hook
  // (managed) so a link is emailed as a fallback for cross-device.
  let magicHash: string | null = null;
  try {
    const origin =
      (session.return_url && new URL(session.return_url).origin) || undefined;
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: origin ? { redirectTo: `${origin}/dashboard` } : undefined,
    });
    if (linkErr) console.error("[webhook] generateLink failed", linkErr);
    magicHash =
      (link?.properties as { hashed_token?: string } | undefined)
        ?.hashed_token ?? null;
  } catch (err) {
    console.error("[webhook] generateLink threw", err);
  }

  await admin
    .from("pending_plans")
    .update({
      status: "claimed",
      claimed_user_id: userId,
      magic_link_email: email,
      magic_link_hash: magicHash,
    })
    .eq("id", pending.id)
    .neq("status", "claimed");
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
            case "customer.subscription.deleted":
              await handleSubscriptionDeleted(event.data.object);
              break;
            default:
              console.log("[webhook] unhandled", event.type);
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("[webhook] error", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
