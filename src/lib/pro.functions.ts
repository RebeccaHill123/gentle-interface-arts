import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  ensureSixMonthPrice,
  getStripeErrorMessage,
  resolveOrCreateCustomer,
} from "@/lib/stripe.server";

export type SubscriptionPlanId = "pro_monthly" | "pro_six_month";

type CheckoutResult = { clientSecret: string } | { error: string };

export const createSubscriptionCheckoutSession = createServerFn({
  method: "POST",
})
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    priceId: SubscriptionPlanId;
    returnUrl: string;
    environment: StripeEnv;
  }) => {
    if (data.priceId !== "pro_monthly" && data.priceId !== "pro_six_month") {
      throw new Error("Invalid priceId");
    }
    if (!data.returnUrl.startsWith("http")) {
      throw new Error("Invalid returnUrl");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { userId, claims } = context;
    try {
      const stripe = createStripeClient(data.environment);

      // Resolve the target price. Ensure the 6-month price exists on first use.
      let stripePrice;
      if (data.priceId === "pro_six_month") {
        stripePrice = await ensureSixMonthPrice(stripe);
      } else {
        const prices = await stripe.prices.list({
          lookup_keys: [data.priceId],
          limit: 1,
        });
        if (!prices.data.length) throw new Error("Price not found");
        stripePrice = prices.data[0];
      }

      const email = (claims as { email?: string })?.email;
      const customerId = await resolveOrCreateCustomer(stripe, {
        email,
        userId,
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        metadata: { userId, priceId: data.priceId },
        subscription_data: {
          metadata: { userId, priceId: data.priceId },
        },
        managed_payments: { enabled: true },
      } as any);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

type PortalResult = { url: string } | { error: string };

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { returnUrl: string; environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<PortalResult> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile?.stripe_customer_id) {
      return { error: "No billing account on file." };
    }
    try {
      const stripe = createStripeClient(data.environment);
      const portal = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export interface SubscriptionSummary {
  hasAccess: boolean;
  isGrandfathered: boolean;
  isSubscriber: boolean;
  plan: SubscriptionPlanId | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const getSubscriptionSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SubscriptionSummary> => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select(
        "is_pro, grandfathered_pro, stripe_price_id, subscription_status, current_period_end, cancel_at_period_end",
      )
      .eq("user_id", userId)
      .maybeSingle();
    const status = (data?.subscription_status as string | null) ?? null;
    const isSubscriber =
      status === "active" ||
      status === "trialing" ||
      (status === "canceled" &&
        !!data?.current_period_end &&
        new Date(data.current_period_end).getTime() > Date.now());
    return {
      hasAccess: !!data?.grandfathered_pro || !!data?.is_pro || isSubscriber,
      isGrandfathered: !!data?.grandfathered_pro,
      isSubscriber,
      plan: (data?.stripe_price_id as SubscriptionPlanId | null) ?? null,
      status,
      currentPeriodEnd: data?.current_period_end
        ? new Date(data.current_period_end as string).toISOString()
        : null,
      cancelAtPeriodEnd: !!data?.cancel_at_period_end,
    };
  });
