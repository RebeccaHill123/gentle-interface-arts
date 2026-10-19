// Founding Member offer configuration.
//
// The Founding Member introductory rate is intentionally an INTRODUCTORY
// price, not a promotional discount. To close it to new customers in the
// future without affecting anyone already subscribed:
//
//   1. Set VITE_FOUNDING_OPEN=false in the environment. This hides the
//      Founding Member checkout entry points from new users.
//   2. Optionally introduce a replacement price (e.g. `pro_standard_monthly`)
//      and wire it into `createPendingCheckoutSession` /
//      `getSubscribePriceDisplay` as the fallback when the flag is off.
//
// Existing Stripe subscriptions on the Founding Member price continue at
// their original rate — Stripe does not migrate subscribers when a price
// is deactivated. No code path in this app raises the price of an active
// subscription automatically.
//
// The `pro_six_month` price is preserved in Stripe (see stripe.server.ts
// `ensureSixMonthPrice`) so it can be re-surfaced later without recreating.

/** Legacy introductory price — existing subscribers stay on it. */
export const LEGACY_FOUNDING_PRICE_ID = "founding_monthly" as const;

/** Current plans offered to new members. */
export const MONTHLY_PRICE_ID = "tentra_monthly" as const;
export const BLOCK_PRICE_ID = "tentra_4_month_block" as const;
export const BLOCK_MONTHS = 4 as const;
export const MONTHLY_PRICE_LABEL = "£12.99";
export const BLOCK_PRICE_LABEL = "£39.99";

export type PlanChoice = "monthly" | "block";

/** Kept for existing imports: the monthly price new members subscribe to. */
export const FOUNDING_MEMBER_PRICE_ID = MONTHLY_PRICE_ID;

/** Access end for a one-off block bought at `from`. */
export function blockAccessEnd(from: Date = new Date()): Date {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + BLOCK_MONTHS);
  return d;
}

export const FOUNDING_MEMBER_OPEN =
  (import.meta.env.VITE_FOUNDING_OPEN ?? "true") !== "false";

// ---------------------------------------------------------------------------
// 7-day free trial (card required, £0 today, then £9.99/month)
// ---------------------------------------------------------------------------

export const TRIAL_DAYS = 7 as const;

/** Trial end / first billing date for a trial started at `from`. */
export function trialEndDate(from: Date = new Date()): Date {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d;
}

/** Long, unambiguous date for checkout copy, e.g. "3 September 2026". */
export function formatTrialDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Convenience: the billing date string shown before the user confirms. */
export function firstBillingDateLabel(from: Date = new Date()): string {
  return formatTrialDate(trialEndDate(from));
}
