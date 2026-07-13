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

async function handleCheckoutCompleted(session: any) {
  // The subscription.created event carries the source of truth; this is a
  // fast-path so the app can flip the user to "active" without waiting.
  if (!session.subscription) return;
  const admin = await getAdmin();
  const userId = session.metadata?.userId as string | undefined;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (userId && customerId) {
    await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("user_id", userId);
  }
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
              await handleCheckoutCompleted(event.data.object);
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
