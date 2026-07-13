
# Tentra: paid-only, subscription at signup

Every user pays to access Tentra. No Pro tier, no free tier, no "unlock". Existing Early Access users are grandfathered forever.

## 1. New user flow

```
Sign up → Choose plan → Stripe Checkout → Onboarding → Personalised plan → App
        (email / Google)   (Monthly / 6mo)     (embedded)
```

- After sign-up, the app routes the user to `/subscribe` (new page) instead of `/onboarding`.
- Two plan cards: **£16.99 / month** and **£72.99 / 6 months** (save ~28%, most popular).
- Stripe Embedded Checkout renders inline. `return_url` = `/onboarding?checkout=success&session_id={CHECKOUT_SESSION_ID}`.
- On return, we poll `subscription_status` until the webhook confirms `active|trialing`, then unlock `/onboarding`.
- Onboarding, dashboard, topics, coach, focus, mocks, flashcards — all move under the existing `_authenticated` gate **and** a new subscription gate. Anyone signed in without an active subscription (and not grandfathered) is redirected to `/subscribe`.

## 2. Existing users — grandfathered

Migration:
- New `profiles.grandfathered_pro boolean default false`.
- Backfill: every current row with `is_pro = true` gets `grandfathered_pro = true` (so all Early Access users keep access forever with no card on file).
- Access check becomes: `grandfathered_pro OR subscription_status IN ('active','trialing') OR (subscription_status = 'canceled' AND current_period_end > now())`.

Grandfathered users see a small "Founding member · lifetime access" badge in Settings, no "Manage billing" button, no upgrade CTAs anywhere.

## 3. Subscription state

New columns on `profiles` (server-only writes, blocked from clients by extended `prevent_pro_self_upgrade` trigger):
- `stripe_customer_id text`
- `stripe_subscription_id text`
- `stripe_price_id text` — `pro_monthly` or `pro_six_month`
- `subscription_status text`
- `current_period_end timestamptz`
- `cancel_at_period_end boolean default false`

`is_pro` is deprecated as a concept but the column stays and is derived by the webhook (`grandfathered_pro OR active-subscription`) so no downstream code breaks.

## 4. Products & prices in Stripe

- Product: **Tentra** (tax code `txcd_10103001`, SaaS).
- Price `pro_monthly` — £16.99 GBP, monthly (created via `batch_create_product`).
- Price `pro_six_month` — £72.99 GBP, every 6 months. The product tool only supports `day|week|month|year` intervals, so this specific price is created idempotently at first use via the Stripe SDK inside a server function (`ensureSemiAnnualPrice`) with `interval: 'month', interval_count: 6, lookup_key: 'pro_six_month'`. Lookup keys are stable across sandbox and live, so the same code creates it in whichever environment first calls it.

## 5. Server functions & webhook

Replace `activateEarlyAccessPro`. New authenticated `createServerFn`s in `src/lib/pro.functions.ts`:
- `createSubscriptionCheckoutSession({ priceId })` — resolves the price via lookup_key (calling `ensureSemiAnnualPrice` if needed), resolves/creates a Stripe Customer with `metadata.userId`, returns `{ clientSecret }` for Embedded Checkout with `managed_payments: { enabled: true }`.
- `createBillingPortalSession()` — Stripe Billing Portal URL.
- `getSubscriptionSummary()` — plan name, next renewal, cancel-at-period-end, grandfathered flag, has-access boolean. Used by the subscription gate, Settings, and `/subscribe`.

Webhook: `src/routes/api/public/payments/webhook.ts`. Verifies Stripe signature, handles `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`; updates the profile columns and recomputes `is_pro` via `supabaseAdmin`. Matches customer → user via `stripe_customer_id`.

## 6. Subscription gate

New `useSubscription()` hook (browser) reads `profiles` with realtime subscription for the current user and exposes `{ hasAccess, isGrandfathered, plan, renewsAt, cancelAtPeriodEnd, loading }`.

New wrapper in `src/routes/_authenticated/route.tsx` (or a nested `_paid.tsx` layout):
- Grandfathered → pass through.
- `hasAccess === true` → pass through.
- Otherwise → `redirect({ to: '/subscribe' })`.

`/subscribe` and `/settings` are the only authenticated routes that stay reachable without a subscription (so users can subscribe or sign out). `/auth`, `/`, `/pro` (deleted), legal pages stay public.

## 7. UI changes

- **New `/subscribe`**: two plan cards + Embedded Checkout, a compact benefits list, "Sign out" and "Contact support" links. Uses same premium visual language as `/pro`. No "start for free" copy.
- **Delete `/pro`** route entirely.
- **Profile menu**: remove "Unlock Pro — free in Early Access" and "Membership" pointing at `/pro`. Replace with "Billing" → Stripe Billing Portal (or, for grandfathered users, "Founding member" badge only, no billing link).
- **Settings → Subscription card**: shows current plan, renewal date, "Manage billing" button (portal), or the founding-member badge. `Re-plan` and account cards unchanged.
- **Landing page**:
  - Pricing section CTAs → signed-out: `/auth?mode=signup&next=/subscribe`; signed-in without access: `/subscribe`; signed-in with access: `/dashboard`.
  - Remove any "Free during Early Access" copy.
- **Post-signup routing** (`src/routes/auth.tsx` / OAuth callback): after `SIGNED_IN`, if the user has no access → go to `/subscribe`; else onboarding or dashboard.
- **Onboarding return handler**: on `/onboarding?checkout=success`, show a "Payment received — building your plan…" state and poll `getSubscriptionSummary` until `hasAccess` is true (webhook has fired), then continue into onboarding.
- Remove: `activateEarlyAccessPro`, `upgradeToPro`, `cancelPro`, `PRO_EARLY_ACCESS_FREE`, pro-changed toast events, "Unlock Pro" buttons, `<PlanBadge isPro />` (or repurpose as founding-member badge only).

## 8. Cutover checklist

- Migration: columns + trigger extension + grandfather backfill.
- `batch_create_product` for `pro_monthly`.
- Server function `ensureSemiAnnualPrice` creates `pro_six_month` on first checkout.
- Webhook already registered by `enable_stripe_payments`; nothing to configure manually.
- Sandbox: sign up a new test user → `/subscribe` → pay with `4242 4242 4242 4242` → confirm webhook fires and access unlocks → onboarding → dashboard.
- Sandbox: sign in as existing `is_pro=true` user → land on dashboard directly, no `/subscribe` detour.
- Sandbox: cancel via Billing Portal → access persists until `current_period_end` → then redirects to `/subscribe`.

## Technical notes

- All Stripe API calls go through `createStripeClient(env)` from `@/lib/stripe.server` (gateway-proxied). Environment derived from `VITE_PAYMENTS_CLIENT_TOKEN` prefix.
- `managed_payments: { enabled: true }` on every checkout session — Stripe handles UK/EU VAT, tax filing, disputes, fraud, receipts. +3.5% per transaction on top of standard Stripe fees. Bank statements show `LINK.COM* TENTRA`. Configurable later.
- Publishable Stripe/Supabase keys stay in code; secrets (`STRIPE_SANDBOX_API_KEY`, `PAYMENTS_SANDBOX_WEBHOOK_SECRET`, live equivalents) are already provisioned.
- Grandfather backfill is idempotent (`WHERE grandfathered_pro = false AND is_pro = true`).
