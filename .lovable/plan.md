## New user journey

```text
Landing → Onboarding (6 short screens) → Plan Reveal (concise, blurred tail)
   → Stripe Checkout (email captured here) → Return page (poll webhook)
   → Auto-provision Auth user + attach plan → Magic-link email sent
   → Auto sign-in in same tab → Dashboard (with "Fine-tune your plan" card)
```

No standalone "create an account" screen. The Auth user is created **only** after Stripe confirms payment.

## Onboarding simplification

Rewrite `src/routes/onboarding.tsx` as a 6-step wizard, one decision per screen, large mobile controls, top progress bar (`Step X of 6`), back button, swipe-friendly:

1. Study route — SQE vs UBE/NY Bar
2. Exam date — date picker
3. Current progress — Not started / Some study / Substantial revision
4. Weekly study hours — slider 2–40
5. Preferred study days — day chips
6. Route-essential field (SQE: SQE1 vs SQE2; UBE: MBE-heavy vs essay-heavy) — only what `study-plan-logic.ts` genuinely needs

All detailed preferences (session length, weak topics, notifications, rest days, revision methods) are removed from onboarding and moved to a dashboard "Fine-tune your plan" card.

State stored in existing `plan-store` draft during onboarding; on completion we call the existing plan generator, then persist to a new `pending_plans` table (see below) and navigate to `/plan-reveal`.

## Concise plan reveal (`/plan-reveal`)

Replace the current full `plan-preview.tsx` reveal with a mobile-first celebratory page:

- Heading: **"Your personalised study plan is ready"**
- Cards: exam + date, weeks remaining, recommended weekly hours, top 3 focus areas, week-1 preview, first recommended session
- Remainder of the plan rendered blurred/locked with a subtle overlay
- Primary CTA: **"Start my personalised plan"**
- Beneath CTA: live price + trial terms pulled from Stripe (`stripe.prices.retrieve` on the existing `pro_monthly` lookup key) via a new public server fn `getSubscribePriceDisplay` — no hard-coded copy
- Small print: "Cancel any time. Billed after your trial."

Uses Tentra's existing pastel tokens; no new colors.

## Pending-plan storage (server-side)

New table `public.pending_plans`:

- `id uuid pk`
- `token text unique` (opaque 32-byte URL-safe, used as the Stripe `client_reference_id` and return-URL param)
- `plan_data jsonb` (the generated plan)
- `onboarding_data jsonb` (raw answers)
- `email text nullable` (filled from Stripe after checkout)
- `stripe_session_id text nullable`
- `stripe_customer_id text nullable`
- `status text` — `pending` | `paid` | `claimed` | `expired`
- `claimed_user_id uuid nullable` (fk to `auth.users` on delete set null)
- `created_at`, `updated_at`, `expires_at` (default `now() + interval '14 days'`)

RLS: no anon/authenticated access; only service role reads/writes. All access goes through server functions.

Expiry: a scheduled job every 24 h runs `UPDATE pending_plans SET status='expired' WHERE status='pending' AND expires_at < now()` and `DELETE FROM pending_plans WHERE status IN ('expired','claimed') AND updated_at < now() - interval '30 days'`. **This only touches `pending_plans` rows** — never `auth.users`, `profiles`, `user_plans`, Stripe customers, or subscriptions. The old `purge-unpaid` cron stays unscheduled and its route file stays deleted.

## Checkout flow

New server fn `createPendingCheckout({ pendingToken })`:
1. Reads the `pending_plans` row by token.
2. Creates a Stripe Checkout Session, `mode:'subscription'`, `ui_mode:'embedded_page'`, existing `pro_monthly` price, `client_reference_id = token`, `metadata.pending_token = token`, `subscription_data.metadata.pending_token = token`, `return_url = <origin>/checkout/return?token=…&session_id={CHECKOUT_SESSION_ID}`.
3. Returns `clientSecret`.

Reuse the existing embedded checkout component pattern — no redirect.

## Webhook: provision user after payment

Extend `src/routes/api/public/payments/webhook.ts`. On `checkout.session.completed`:

1. Look up `pending_plans` by `session.client_reference_id` (idempotent — if `status='paid'|'claimed'` return early).
2. Extract email from `session.customer_details.email`.
3. **Existing user path:** `supabaseAdmin.auth.admin.listUsers` filtered by email → if found, attach: set `pending_plans.status='claimed'`, `claimed_user_id`, upsert plan into `user_plans` for that user, update their `profiles` with `stripe_customer_id`, `stripe_subscription_id`, `is_pro=true`, `subscription_status`, `current_period_end`. Send magic link via `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })` with `redirectTo=/dashboard`.
4. **New user path:** `supabaseAdmin.auth.admin.createUser({ email, email_confirm: true })`. Existing `handle_new_user` trigger creates the `profiles` row. Then repeat the attach + magic-link steps.
5. Mark `pending_plans.status='paid'` first, then `'claimed'` after successful attach — guarded by row-level `UPDATE … WHERE status <> 'claimed'` so concurrent webhook retries are no-ops.

The existing `customer.subscription.*` handlers keep updating `profiles` on renewal/cancel — no change to that logic.

## Return page (`/checkout/return`)

Shows a "Setting up your account…" spinner. Polls a new public server fn `pollPendingClaim({ token })` every 1.5 s (max 45 s) that returns `{ status, magicLinkToken? }`:

- While `pending` → keep polling.
- On `paid` but not yet `claimed` → keep polling (webhook still finishing).
- On `claimed` → server fn calls `supabase.auth.verifyOtp` server-side is not possible for magic links, so instead: the webhook stores a one-time `access_token` on the row (generated via `generateLink({ type:'magiclink' })` — we capture `properties.hashed_token`). The return page uses it with `supabase.auth.verifyOtp({ type:'magiclink', token_hash })` client-side, which signs the user in without leaving the tab, then navigates to `/dashboard`. Magic-link email is still sent as a backup for cross-device recovery.
- On timeout → show "We've emailed you a sign-in link" fallback.

## Dashboard "Fine-tune your plan" card

New dismissible card in `src/routes/dashboard.tsx` that opens a sheet collecting: session length, weak topics, notification prefs, rest days, revision methods. Writes to existing `profiles` / `user_plans` extras. Dismissible; not blocking.

## Edge cases handled

- **Abandoned checkout:** `pending_plans` row stays `pending`, expires after 14 days, then deleted after 30. No auth user was ever created.
- **Failed payment:** Stripe doesn't fire `checkout.session.completed`; row stays `pending`; user can retry via same token.
- **Duplicate email:** existing-user path in webhook attaches instead of creating.
- **Webhook retries / double redirect:** idempotent via `status <> 'claimed'` guard and `onConflict` upserts.
- **Expired magic link:** return page shows "Request a new sign-in link" that calls `supabase.auth.signInWithOtp({ email })`.
- **Refresh mid-onboarding:** draft persisted in `plan-store` (existing).
- **Refresh on reveal:** token in URL; server fn re-reads `pending_plans`.
- **Refresh on return page:** token in URL; polling resumes.
- **Existing logged-in user hits `/onboarding`:** flow still works; if webhook finds a matching auth user we attach to it.

## Analytics

Add `track()` calls in `src/lib/analytics.ts` for: `onboarding_started`, `onboarding_step_completed` (with `step` number only), `plan_generated`, `plan_reveal_viewed`, `checkout_started`, `checkout_completed`, `account_access_completed`, `dashboard_reached`. No answers, no PII, no payment data.

## Files added / changed

**Added**
- `supabase/migrations/<ts>_pending_plans.sql` — table, RLS, grants, expiry cron
- `src/lib/pending-plans.functions.ts` — `createPendingPlan`, `createPendingCheckout`, `pollPendingClaim`, `getSubscribePriceDisplay`
- `src/routes/plan-reveal.tsx`
- `src/routes/checkout.return.tsx`
- `src/components/onboarding/*` — step components + progress bar
- `src/components/dashboard/fine-tune-card.tsx`

**Changed**
- `src/routes/onboarding.tsx` — rewritten as 6-step wizard, ends by creating pending plan + navigating to `/plan-reveal`
- `src/routes/api/public/payments/webhook.ts` — add `checkout.session.completed` handler that provisions/attaches user, attaches plan, generates magic link
- `src/routes/dashboard.tsx` — add fine-tune card
- `src/routes/subscribe.tsx` — kept for direct-subscribe path (existing users) but no longer part of new-user flow
- `src/routes/plan-preview.tsx` — kept for signed-in users viewing their existing plan; removed from onboarding path

**Not changed**
- `src/lib/study-plan-logic.ts`, `src/lib/preview-plan.ts` (generation algorithm)
- Stripe products / prices / existing `pro_monthly` price
- Existing `profiles`, `user_plans`, subscription webhook branches
- Existing users, sessions, or grandfathered flags
- No purge / delete-user job reinstated

## Confirmation on deletion safety

The pending-plan expiry job only mutates `pending_plans` rows. It never calls `auth.admin.deleteUser`, never touches `profiles`, `user_plans`, Stripe customers, subscriptions, or analytics. The previously deleted `purge-unpaid` route stays deleted. Codebase has zero remaining calls to `auth.admin.deleteUser`.

## Mobile test checklist (to run before publishing)

1. iPhone Safari + Android Chrome, 360 px and 414 px widths.
2. Complete onboarding SQE path → reveal → checkout with test card `4242…` → land on dashboard signed in.
3. Repeat for UBE path.
4. Abandon at checkout, wait, revisit `/plan-reveal?token=…` → resume works.
5. Use existing account's email in checkout → dashboard shows same account, no duplicate.
6. Decline card `4000…0002` → return page shows retry, no auth user created (verify in DB).
7. Refresh at each step: onboarding, reveal, checkout, return page.
8. Rotate device mid-onboarding.
9. Open magic-link email on a second device → signs in there too.
10. Verify Stripe dashboard shows one subscription per checkout even after webhook retry.
11. Verify no `pending_plans` row older than 14 days remains in `pending`.
12. Confirm `cron.job` still has no `purge-unpaid-accounts` entry.
