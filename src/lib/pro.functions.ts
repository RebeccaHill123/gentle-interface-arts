import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  type StripeEnv,
  createStripeClient,
  ensureSixMonthPrice,
  getStripeErrorMessage,
  isTrialEligible,
  resolveOrCreateCustomer,
  trialSubscriptionData,
} from "@/lib/stripe.server";
import { TRIAL_DAYS } from "@/lib/founding";

export type SubscriptionPlanId =
  | "founding_monthly"
  | "pro_monthly"
  | "pro_six_month";

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
    if (
      data.priceId !== "founding_monthly" &&
      data.priceId !== "pro_monthly" &&
      data.priceId !== "pro_six_month"
    ) {
      throw new Error("Invalid priceId");
    }
    if (!data.returnUrl.startsWith("http")) {
      throw new Error("Invalid returnUrl");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { userId, claims, supabase } = context;
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

      // Trial eligibility: never for existing/lapsed-with-trial customers.
      const { data: profile } = await supabase
        .from("profiles")
        .select("has_used_trial, subscription_status")
        .eq("user_id", userId)
        .maybeSingle();
      const alreadySubscribed =
        profile?.subscription_status === "active" ||
        profile?.subscription_status === "trialing" ||
        profile?.subscription_status === "past_due";
      const trialEligible =
        !alreadySubscribed &&
        (await isTrialEligible(stripe, customerId, !!profile?.has_used_trial));

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        // Card details are mandatory even when £0 is due today.
        payment_method_collection: "always",
        metadata: { userId, priceId: data.priceId },
        subscription_data: {
          ...(trialEligible ? trialSubscriptionData(TRIAL_DAYS) : {}),
          metadata: { userId, priceId: data.priceId },
        },
        // Charge exactly the displayed price — no tax added on top.
        // (managed_payments/automatic_tax intentionally omitted.)
      });

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/**
 * Whether the signed-in user would actually get the 7-day free trial if they
 * checked out now. The checkout UI must match this — otherwise we promise
 * "£0 today" and Stripe bills the first period immediately.
 */
export const getTrialEligibility = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data, context }): Promise<{ trialEligible: boolean }> => {
    const { userId, claims, supabase } = context;
    try {
      const stripe = createStripeClient(data.environment);
      const { data: profile } = await supabase
        .from("profiles")
        .select("has_used_trial, subscription_status")
        .eq("user_id", userId)
        .maybeSingle();
      const alreadySubscribed =
        profile?.subscription_status === "active" ||
        profile?.subscription_status === "trialing" ||
        profile?.subscription_status === "past_due";
      if (alreadySubscribed || profile?.has_used_trial) {
        return { trialEligible: false };
      }
      const email = (claims as { email?: string })?.email;
      const found = await stripe.customers.search({
        query: `metadata['userId']:'${userId}'`,
        limit: 1,
      });
      let customerId: string | null = found.data[0]?.id ?? null;
      if (!customerId && email) {
        const existing = await stripe.customers.list({ email, limit: 1 });
        customerId = existing.data[0]?.id ?? null;
      }
      const eligible = await isTrialEligible(stripe, customerId, false);
      return { trialEligible: eligible };
    } catch {
      // Fail closed — same as the checkout path, so copy stays truthful.
      return { trialEligible: false };
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
  isTrialing: boolean;
  trialEnd: string | null;
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
        "is_pro, grandfathered_pro, stripe_price_id, subscription_status, current_period_end, cancel_at_period_end, trial_end",
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
      isTrialing: status === "trialing",
      trialEnd: data?.trial_end
        ? new Date(data.trial_end as string).toISOString()
        : null,
      plan: (data?.stripe_price_id as SubscriptionPlanId | null) ?? null,
      status,
      currentPeriodEnd: data?.current_period_end
        ? new Date(data.current_period_end as string).toISOString()
        : null,
      cancelAtPeriodEnd: !!data?.cancel_at_period_end,
    };
  });
