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
import type {
  OnboardingInput,
  StoredPlan,
  StudyPlan,
} from "@/lib/plan-store";
import { buildStoredPreview } from "@/lib/preview-plan";
import type { StripeEnv } from "@/lib/stripe.server";

const TOKEN_ALPHABET =
  "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

// Onboarding input reaches the server via createPendingPlan. We don't
// require every OnboardingInput field to be strict; the shared plan
// builder tolerates partials the same way the local preview does today.
type PendingPlanCreateInput = {
  onboarding: OnboardingInput;
};

export type PendingPlanSummary = {
  token: string;
  status: "pending" | "paid" | "claimed" | "expired";
  examLabel: string;
  examType: string;
  examDate: string;
  daysUntilExam: number;
  hoursPerWeek: number;
  weeks: number;
  focusModules: string[];
  firstWeek: { theme: string; hours: number; modules: string[] } | null;
  firstSession:
    | { title: string; minutes: number; module: string; why?: string }
    | null;
  plan: StudyPlan;
  hasEmail: boolean;
};

const EXAM_LABELS: Record<string, string> = {
  SQE1: "SQE1",
  SQE2: "SQE2",
  UBE: "NY Bar (UBE)",
  MPRE: "MPRE",
};

function summariseForClient(row: {
  token: string;
  status: string;
  plan_data: unknown;
  onboarding_data: unknown;
  email: string | null;
}): PendingPlanSummary {
  const stored = row.plan_data as StoredPlan;
  const onboarding = row.onboarding_data as OnboardingInput;
  const focus =
    stored.plan.weeklyStrategy?.allocations
      ?.slice(0, 3)
      .map((a) => a.module) ?? [];
  const firstWeek = stored.plan.weeklyFocus?.[0]
    ? {
        theme: stored.plan.weeklyFocus[0].theme,
        hours: stored.plan.weeklyFocus[0].hours,
        modules: stored.plan.weeklyFocus[0].modules ?? [],
      }
    : null;
  const t0 = stored.plan.todayTasks?.[0];
  return {
    token: row.token,
    status: row.status as PendingPlanSummary["status"],
    examLabel: EXAM_LABELS[onboarding.examType] ?? onboarding.examType,
    examType: onboarding.examType,
    examDate: onboarding.examDate,
    daysUntilExam: stored.daysUntilExam,
    hoursPerWeek: onboarding.hoursPerWeek,
    weeks: Math.max(1, Math.ceil(stored.daysUntilExam / 7)),
    focusModules: focus,
    firstWeek,
    firstSession: t0
      ? { title: t0.title, minutes: t0.minutes, module: t0.module, why: t0.why }
      : null,
    plan: stored.plan,
    hasEmail: !!row.email,
  };
}

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
      plan_data: stored as unknown as Record<string, unknown>,
      onboarding_data: data.onboarding as unknown as Record<string, unknown>,
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
        lookup_keys: ["pro_monthly"],
        limit: 1,
      });
      if (!prices.data.length) return { error: "Price not available" };

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: prices.data[0].id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        client_reference_id: data.token,
        metadata: { pending_token: data.token, priceId: "pro_monthly" },
        subscription_data: {
          metadata: { pending_token: data.token, priceId: "pro_monthly" },
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
    const { data: row } = await supabaseAdmin
      .from("pending_plans")
      .select("status, magic_link_email, magic_link_hash")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { status: "not_found" };
    if (row.status === "claimed") {
      return {
        status: "claimed",
        email: row.magic_link_email ?? "",
        magicLinkHash: row.magic_link_hash ?? null,
      };
    }
    return { status: row.status as "pending" | "paid" | "expired" };
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
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({
        lookup_keys: ["pro_monthly"],
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
        trialDays: null,
        formatted: `${symbol}${amount.toFixed(2)} / ${price.recurring.interval}`,
      };
    } catch (error) {
      const { getStripeErrorMessage } = await import("@/lib/stripe.server");
      return { error: getStripeErrorMessage(error) };
    }
  });
