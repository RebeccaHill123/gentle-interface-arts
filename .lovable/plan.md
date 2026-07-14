# Require payment during sign-up

Today, `supabase.auth.signUp()` creates the auth user + `profiles` row immediately, then `/subscribe` shows the paywall. Nothing prevents a user (like Eve Fallon) from closing the tab and leaving a permanent unpaid account behind.

We'll keep Supabase's account-first model (needed for OAuth + to attach the Stripe customer), but make the sign-up **journey** end at Stripe checkout with no detours, and auto-purge accounts that never pay.

## What changes

### 1. Move plan selection before sign-up
- Add `/subscribe` support for signed-out users: plan cards render for everyone. "Continue" on a plan stores the selected `priceId` in `sessionStorage` and routes signed-out users to `/auth?mode=signup&next=/subscribe`.
- Landing page and onboarding CTAs go to `/subscribe` instead of `/auth`, so plan choice is the first step.

### 2. Sign-up drops the user straight into Stripe checkout
- In `src/routes/auth.tsx` `goAfterAuth()`: **remove the `if (next) window.location.assign(next)` early-return** (this is the current bypass that lets `?next=/dashboard` skip the paywall). Access check always runs first.
- After a successful sign-up (email/password OTP verified, or Google OAuth returns), read `sessionStorage.pendingPriceId`. If set and no active subscription → send to `/subscribe?autostart=1`.
- `/subscribe` reads `?autostart=1` and immediately mounts `<StripeEmbeddedCheckout>` — skips the "Choose your plan" step and the extra "Continue to payment" click. Back button on the embedded form returns to plan selection.

### 3. Lock unpaid signed-in users to /subscribe
- Confirm every protected route uses `requireAccess` (it does). Add a small "Complete payment to activate your account" banner on `/subscribe` for signed-in-but-unpaid users so the state is clear.
- Sign-out remains available; that's the only escape without paying.

### 4. Auto-purge abandoned unpaid accounts
- New migration + pg_cron job: every 6 h, delete `auth.users` (cascade removes `profiles`) where:
  - `created_at < now() - interval '72 hours'` AND
  - `profiles.is_pro = false` AND `profiles.grandfathered_pro = false` AND
  - `profiles.stripe_subscription_id IS NULL` (never even started checkout — customers who reached Stripe but failed keep their row for retry).
- Runs against `supabase.auth.admin.deleteUser` via a `SECURITY DEFINER` function or a `/api/public/cron/purge-unpaid` server route hit by pg_cron with a shared secret. Server route is simpler and matches existing `email_queue` cron pattern.

### 5. Backfill: clean up existing unpaid ghosts
- One-off admin action: delete existing profiles matching the same criteria (older than 72h, no subscription, not grandfathered). Eve's row gets removed by this pass.
- Run once via a server function guarded by `has_role('admin')` — no UI needed.

## What stays the same
- Stripe integration (`createSubscriptionCheckoutSession`, embedded checkout, webhook).
- Grandfathered Early Access users (`grandfathered_pro = true`) are exempt from purge and paywall.
- Google OAuth still works — `redirect_uri` returns to `/auth`, which then routes to `/subscribe?autostart=1` if a plan is queued, or the plan chooser if not.

## Trade-offs
- Users who sign up via Google without picking a plan first land on the plan chooser (one extra click vs. today). Acceptable — Google users rarely arrive without intent.
- 72 h grace before deletion means abandoned accounts still exist briefly; a user can retry sign-up during that window (Supabase blocks the email as "already registered") — the purge frees it up. We can shorten to 24 h if you'd rather.
- No true "payment before account" flow: Stripe subscriptions need a customer, and a customer needs an auth user to attach access to. This is the standard Supabase + Stripe pattern.

## Files touched
- `src/routes/subscribe.tsx` — allow signed-out plan selection, add `?autostart=1`, banner for unpaid signed-in users.
- `src/routes/auth.tsx` — drop `next` bypass, read `pendingPriceId`, route to `/subscribe?autostart=1`.
- `src/routes/index.tsx`, `src/routes/onboarding.tsx` — CTAs to `/subscribe`.
- `src/routes/api/public/cron/purge-unpaid.ts` — new cron endpoint with shared-secret auth.
- `src/lib/admin-purge.functions.ts` — one-off backfill server function.
- New migration — pg_cron schedule + `PURGE_UNPAID_CRON_SECRET` (generated).
