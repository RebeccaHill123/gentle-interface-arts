// Server functions for the pending-plan checkout flow.
//
// New flow: onboarding answers → server generates a study plan and stores
// it in `pending_plans` → checkout → webhook provisions the Supabase Auth
// user, attaches the plan and issues a magic-link hashed_token → return
// page uses that token to sign the user in without leaving the tab.
//
// SECURITY: no admin/service-role imports at module scope — this file is
// reachable from the client bundle. Every server-only import happens
// inside the handler body.

import { createServerFn } from "@tanstack/react-start";
import type { OnboardingInput } from "@/lib/plan-store";
import { buildStoredPreview } from "@/lib/preview-plan";
import {
  generateToken,
  summariseForClient,
  type PendingPlanSummary,
} from "@/lib/pending-plans.summary";
import type { StripeEnv } from "@/lib/stripe.server";

// Onboarding input reaches the server via createPendingPlan. We don't
// require every OnboardingInput field to be strict; the shared plan
// builder tolerates partials the same way the local preview does today.
type PendingPlanCreateInput = {
  onboarding: OnboardingInput;
};

export type { PendingPlanSummary };


export const createPendingPlan = createServerFn({ method: "POST" })
  .inputValidator((data: PendingPlanCreateInput) => {
    if (!data.onboarding) throw new Error("Missing onboarding data");
    const o = data.onboarding;
    if (!o.examType || !o.examDate || !Array.isArray(o.modules)) {
      throw new Error("Onboarding payload is incomplete");
    }
    if (new Date(o.examDate).getTime() <= Date.now()) {
      throw new Error("Exam date must be in the future");
    }
    if (o.hoursPerWeek < 1 || o.hoursPerWeek > 60) {
      throw new Error("Hours per week must be between 1 and 60");
    }
    return data;
  })
  .handler(async ({ data }): Promise<{ token: string }> => {
    const stored = buildStoredPreview(data.onboarding);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const token = generateToken();
    const { error } = await supabaseAdmin.from("pending_plans").insert({
      token,
      // Supabase-typed Json expects plain JSON; StoredPlan/OnboardingInput
      // serialise fine so we double-cast to satisfy the type.
      plan_data: stored as never,
      onboarding_data: data.onboarding as never,
      status: "pending",
    });
    if (error) throw new Error(`Could not save plan: ${error.message}`);
    return { token };
  });

export const getPendingPlanSummary = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => {
    if (!data?.token || typeof data.token !== "string") {
      throw new Error("Missing token");
    }
    return data;
  })
  .handler(async ({ data }): Promise<PendingPlanSummary | null> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: row } = await supabaseAdmin
      .from("pending_plans")
      .select("token, status, plan_data, onboarding_data, email")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return null;
    return summariseForClient(row as never);
  });

export type PendingCheckoutResult =
  | { clientSecret: string }
  | { error: string };

export const createPendingCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { token: string; returnUrl: string; environment: StripeEnv }) => {
      if (!data.token) throw new Error("Missing token");
      if (!data.returnUrl.startsWith("http"))
        throw new Error("Invalid returnUrl");
      if (data.environment !== "sandbox" && data.environment !== "live")
        throw new Error("Invalid environment");
      return data;
    },
  )
  .handler(async ({ data }): Promise<PendingCheckoutResult> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { createStripeClient, getStripeErrorMessage } = await import(
      "@/lib/stripe.server"
    );

    try {
      const { data: row } = await supabaseAdmin
        .from("pending_plans")
        .select("token, status")
        .eq("token", data.token)
        .maybeSingle();
      if (!row) return { error: "Plan not found. Please start again." };
      if (row.status === "claimed") {
        return { error: "This plan has already been activated." };
      }

      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({
        lookup_keys: ["founding_monthly"],
        limit: 1,
      });
      if (!prices.data.length) return { error: "Price not available" };

      const { trialSubscriptionData } = await import("@/lib/stripe.server");
      const { TRIAL_DAYS } = await import("@/lib/founding");

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: prices.data[0].id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        client_reference_id: data.token,
        // Card details are mandatory even though £0 is due today.
        payment_method_collection: "always",
        metadata: { pending_token: data.token, priceId: "founding_monthly" },
        subscription_data: {
          ...trialSubscriptionData(TRIAL_DAYS),
          metadata: { pending_token: data.token, priceId: "founding_monthly" },
        },
      });


      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export type PendingClaimStatus =
  | { status: "pending" | "paid" | "expired" }
  | {
      status: "claimed";
      email: string;
      magicLinkHash: string | null;
    }
  | { status: "not_found" };

export const pollPendingClaim = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => {
    if (!data?.token) throw new Error("Missing token");
    return data;
  })
  .handler(async ({ data }): Promise<PendingClaimStatus> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { isFinalStoredClaim, resolvePolledClaimStatus } = await import(
      "@/lib/provisioning"
    );
    const { data: row, error } = await supabaseAdmin
      .from("pending_plans")
      .select("status, claimed_user_id, magic_link_email, magic_link_hash")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(`Could not read claim status: ${error.message}`);
    if (!row) return { status: "not_found" };

    let profile = null as
      | {
          is_pro: boolean | null;
          grandfathered_pro: boolean | null;
          subscription_status: string | null;
          current_period_end: string | null;
        }
      | null;
    let hasPlanRow = false;
    if (isFinalStoredClaim(row) && row.claimed_user_id) {
      // Legacy rows can say "claimed" without real access or an attached plan.
      // Verify both before telling the browser it may proceed; only booleans
      // derived from these reads are exposed.
      const { data: profileRow, error: profileErr } = await supabaseAdmin
        .from("profiles")
        .select("is_pro, grandfathered_pro, subscription_status, current_period_end")
        .eq("user_id", row.claimed_user_id)
        .maybeSingle();
      if (profileErr) {
        throw new Error(`Could not verify access: ${profileErr.message}`);
      }
      profile = profileRow;
      const { data: planRow, error: planErr } = await supabaseAdmin
        .from("user_plans")
        .select("user_id")
        .eq("user_id", row.claimed_user_id)
        .maybeSingle();
      if (planErr) {
        throw new Error(`Could not verify plan: ${planErr.message}`);
      }
      hasPlanRow = !!planRow;
    }

    const status = resolvePolledClaimStatus({ row, profile, hasPlanRow });
    if (status === "claimed") {
      return {
        status: "claimed",
        email: row.magic_link_email ?? "",
        magicLinkHash: row.magic_link_hash ?? null,
      };
    }
    return { status };
  });




// Public price display. Reads Stripe live/sandbox — no auth required so the
// reveal page can show it before the user signs up.
export type PriceDisplay = {
  amount: number;
  currency: string;
  interval: string;
  intervalCount: number;
  trialDays: number | null;
  formatted: string;
};

export const getSubscribePriceDisplay = createServerFn({ method: "POST" })
  .inputValidator((data: { environment: StripeEnv }) => data)
  .handler(async ({ data }): Promise<PriceDisplay | { error: string }> => {
    try {
      const { createStripeClient, getStripeErrorMessage } = await import(
        "@/lib/stripe.server"
      );
      const { TRIAL_DAYS } = await import("@/lib/founding");
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({
        lookup_keys: ["founding_monthly"],
        limit: 1,
      });
      const price = prices.data[0];
      if (!price?.unit_amount || !price.recurring) {
        return { error: "Price unavailable" };
      }
      const amount = price.unit_amount / 100;
      const currency = price.currency.toUpperCase();
      const symbol =
        currency === "GBP"
          ? "£"
          : currency === "USD"
            ? "$"
            : currency === "EUR"
              ? "€"
              : `${currency} `;
      return {
        amount,
        currency,
        interval: price.recurring.interval,
        intervalCount: price.recurring.interval_count ?? 1,
        trialDays: TRIAL_DAYS,
        formatted: `${symbol}${amount.toFixed(2)} / ${price.recurring.interval}`,
      };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(error) };
    }
  });
