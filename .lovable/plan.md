
# Transition Tentra Pro to paid (Stripe)

Goal: replace the "free during Early Access" flow with real Stripe checkout at **£16.99/month** and **£72.99/6 months**, while keeping every current Pro user on Pro forever (grandfathered).

## 1. Payments setup

1. Enable **seamless Stripe payments** (`enable_stripe_payments`). No account setup or API keys needed from you.
2. Default tax handling: **full compliance handling** (Stripe as merchant of record for digital SaaS in ~80 buyer countries, +3.5% per transaction, changeable later).
3. Create two products/prices via `batch_create_product`:
   - `Tentra Pro — Monthly` · £16.99 GBP, recurring monthly, tax code `txcd_10103001` (SaaS)
   - `Tentra Pro — 6 months` · £72.99 GBP, recurring every 6 months, same tax code
4. Landing page pricing section already advertises these prices — no copy changes needed.

## 2. Grandfather existing Early Access users

Add a migration that marks anyone currently `is_pro = true` with a new flag so they keep Pro forever without a subscription:

- New column `profiles.grandfathered_pro boolean not null default false`.
- One-time backfill: `UPDATE profiles SET grandfathered_pro = true WHERE is_pro = true`.
- All Pro-gate checks continue to read `is_pro`. Grandfathered users are never downgraded when they have no active Stripe subscription.
- Settings page shows a small "Early Access member — Pro on us, forever" badge instead of a "Manage subscription" button for these users.

## 3. Subscription state

New columns on `profiles` (server-only writes via `supabaseAdmin`, blocked from clients by existing trigger — extend the trigger to also block these):
- `stripe_customer_id text`
- `stripe_subscription_id text`
- `stripe_price_id text`
- `subscription_status text` (`active`, `trialing`, `past_due`, `canceled`, `incomplete`, null)
- `current_period_end timestamptz`
- `cancel_at_period_end boolean default false`

`is_pro` becomes derived at write-time: `grandfathered_pro OR subscription_status IN ('active','trialing')`. Set by the webhook after each Stripe event.

## 4. Checkout + portal server functions

Replace `activateEarlyAccessPro` and flip `PRO_EARLY_ACCESS_FREE` to `false`.

New authenticated server functions in `src/lib/pro.functions.ts`:
- `createProCheckoutSession({ interval: 'month' | 'six_month' })` → creates a Stripe Checkout Session for the signed-in user (creates/reuses `stripe_customer_id`), returns `{ url }`. Client redirects to `url`.
- `createBillingPortalSession()` → Stripe Billing Portal URL for managing/canceling.
- `getSubscriptionSummary()` → returns plan name, renewal date, cancel-at-period-end, grandfathered flag for the Settings/Pro UI.

## 5. Stripe webhook

New public route `src/routes/api/public/stripe-webhook.ts`:
- Verifies Stripe signature with `STRIPE_WEBHOOK_SECRET`.
- Handles `checkout.session.completed`, `customer.subscription.created|updated|deleted`, `invoice.paid`, `invoice.payment_failed`.
- Updates the subscription columns and recomputes `is_pro` via `supabaseAdmin`.
- Never trusts client input; matches customer → user via `stripe_customer_id`.

## 6. UI changes

- **`/pro`**: replace "Unlock Pro — free in Early Access" with two plan cards (Monthly £16.99 / 6-month £72.99, "Save ~28%" pill on the 6-month). Buttons call `createProCheckoutSession`. Current Pro users see plan summary + "Manage billing" (portal). Grandfathered users see "You have lifetime Pro from Early Access ❤️".
- **Profile menu**: "Unlock Pro" chip stays for non-Pro; label changes from "free in Early Access" to "£16.99/mo".
- **Settings → Subscription card**: shows current plan, renewal date, and either "Manage billing" or the grandfathered badge.
- **Landing page pricing CTAs**: point signed-in users to `/pro`, signed-out users to `/auth?mode=signup&next=/pro`.

## 7. Cutover checklist

- Enable Stripe → create products → set `PRO_EARLY_ACCESS_FREE = false`.
- Run migration (columns + backfill + trigger update).
- Configure Stripe webhook to `https://project--c0d0fdd1-6a49-47d4-acb7-092208251a0f.lovable.app/api/public/stripe-webhook` and save `STRIPE_WEBHOOK_SECRET`.
- Verify: existing Pro accounts stay Pro; new signup can subscribe monthly and 6-month; cancel via portal flips `is_pro` at period end.

## Technical notes

- Stripe integration is Lovable-managed (`enable_stripe_payments`) — no `STRIPE_SECRET_KEY` needed in code; the seamless SDK exposes helpers for checkout/portal/webhook verification.
- All Pro-mutation paths go through `supabaseAdmin` inside server functions/webhook only; the existing `prevent_pro_self_upgrade` trigger is extended to also block client writes to the new subscription columns.
- No changes to the AI-gate or feature checks — they keep reading `profiles.is_pro`.

Shall I proceed?
