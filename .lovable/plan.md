# Tentra — remaining high-impact improvements (audit + plan)

Audit based on the live code, not assumptions. Analytics for 1 Aug–2 Sep show a healthy top of funnel (`/` 160 → `/onboarding` 88 → `/plan-reveal` 87) and a sharp fall at the paid handoff (`/dashboard` 29). The code explains most of that drop: the paid handoff has a genuine failure mode, and the events we do fire cannot measure unique-user conversion.

---

## Findings, highest severity first

### 1. A paying customer can be locked out of the product they just paid for (HIGH)
In `src/routes/api/public/payments/webhook.ts`, `claimPendingPlan` marks the pending row `status: "claimed"` and mints the magic-link hash at the very end, but the Stripe `subscriptions.retrieve` + `upsertFromSubscription` step before it is wrapped in a try/catch that only logs. If that step fails, the row is still marked claimed and the user is signed in — yet `profiles.is_pro` / `subscription_status` were never written, so `requireAccess` (`src/lib/access-guard.ts:37-42`) redirects them straight back to `/subscribe` after paying.

### 2. A successfully claimed plan can silently disappear, sending a payer back through onboarding (HIGH)
`src/routes/dashboard.tsx:140-152` tries cloud (`pullPlanFromCloud`) then localStorage, and if both are empty redirects to `/onboarding` with no message. If the `user_plans` insert didn't happen (webhook gap above, or a missed `checkout.session.completed`), a paid user on a fresh device is silently pushed to re-answer onboarding and regenerate a different plan. `today-panel.tsx:249-264` shows a generic "No plan yet" card in this state — indistinguishable from a genuine first run.

### 3. The funnel is unmeasurable at unique-user level, and two events are factually wrong (HIGH for decision-making)
- `checkout_completed` and `trial_started` fire the instant `src/routes/checkout.return.tsx:58-59` mounts with a token — before the claim poll resolves. They fire even when the claim later errors, so paid-conversion counts are inflated.
- Single clicks fire 3 events: onboarding submit fires `confidence_rating_completed` + `personalised_plan_build_clicked` + `plan_build_clicked` (`onboarding.tsx:488-499`); the reveal CTA fires `unlock_full_plan_clicked` + `founding_cta_clicked` + `checkout_started` (`plan-reveal.tsx:224-230`); mount fires both `onboarding_started` and `onboarding_start`. Step 1 alone fires three completion events.
- Declared but never fired anywhere: `trial_converted`, `trial_cancelled`, `first_payment_failed`, `first_study_plan_created`, `first_session_logged`. So we cannot see activation or trial→paid conversion at all.
- Asymmetric auth tracking: `sign_in_started` fires only for magic link (`auth.tsx:250`), never for Google or password; there is no `sign_in_completed` event; `trial_started` is never fired on the signed-in `/subscribe` path.
- The homepage header CTA (`index.tsx:187-193`) fires nothing, while the hero CTA does — header-driven starts are invisible.
- No anonymous→user correlation id is attached to events, so 645 pageviews cannot be resolved into unique-user funnel steps.

### 4. Dead and duplicated authenticated UI competes with Today → Focus → completion (MEDIUM)
- `/community` (`src/routes/community.tsx`) is a pure "launching soon" placeholder, yet it occupies a slot in `SECONDARY_NAV` (`app-shell.tsx:44-49`) and the mobile drawer.
- `src/routes/focus.index.tsx:100-115` renders a six-card "Coming soon" grid (heatmap, productivity trends, calendar view…) to paying users.
- `WeeklyReview` is rendered twice across the app: `dashboard.tsx:540` and `plan.tsx:119` — same component, same data.
- `/plan-preview` (348 lines) is an orphan: nothing links to it; `/plan-reveal` superseded it.
- `/flashcards` (807 lines) has no nav entry and is reachable only from a link inside `/topics:243`; `/connect` (MCP/ChatGPT) is not in `AppRoute` or any nav at all.
- `src/components/profile-menu.tsx:116-118` has a `soon()` helper that toasts "— coming soon" for menu items.
- `/mocks:208-211` and homepage copy both admit mocks are incomplete.

### 5. Retention rests entirely on the user remembering to return (MEDIUM)
Streaks, progress, plan revisions ("What changed in your plan") and a real computed Weekly Review all exist. But there is no reminder mechanism of any kind: the email queue (`src/routes/lovable/email/queue/process.ts:113`) only processes `auth_emails` and `transactional_emails` — no digest/nudge/streak queue exists. The only pull-back is the in-app "Welcome back" banner at `today-panel.tsx:115-135`, which requires the user to already be in the app. There is also no in-product trial-day counter, so a trialist never sees how much of their 7 days remains.

### 6. Two parallel checkout implementations with different behaviour (MEDIUM, do not merge yet)
Anonymous flow: `PendingCheckout` → `createPendingCheckoutSession` → `/checkout/return` with a 60s claim poll and inline magic-link sign-in. Signed-in flow: `subscribe.tsx` → `createSubscriptionCheckoutSession` → 40s `sub.refresh()` loop, no auto sign-in. Both work; the divergence is a maintenance and consistency risk, not a live bug. Worth documenting, not worth refactoring with existing payers live.

### 7. Smaller mobile/clarity gaps (LOW)
`index.tsx:108-118` computes `showStickyCta` but appears to render no sticky CTA (the reveal page's sticky CTA is the working one) — mobile homepage lacks the persistent CTA that plan-reveal has, on ~71% mobile traffic. On `/plan-reveal`, if payments aren't configured the "Unlock my full plan" button looks normal and only reveals an error after being clicked.

---

## Implementation batches (max 4)

### Batch 1 — Never lose a paying customer (MUST DO)
**User outcome:** anyone who completes payment reaches a working dashboard with their own plan, and if anything goes wrong they see a real recovery path instead of being bounced to `/subscribe` or `/onboarding`.

**Files:** `src/routes/api/public/payments/webhook.ts`, `src/routes/dashboard.tsx`, `src/components/dashboard/today-panel.tsx`, possibly `src/lib/access-guard.ts`.

**Work:** make `claimPendingPlan` treat profile provisioning as required — do not mark `claimed` unless `is_pro`/`subscription_status` were written (or write a minimal entitlement from the session before the retrieve, so a Stripe read failure cannot produce an entitled-but-not-marked user); keep it idempotent so Stripe retries repair rather than duplicate. In `dashboard.tsx`, when cloud and local plan are both empty *and* the user has access, show an explicit "We're still restoring your plan" state with retry + support instead of the silent `/onboarding` redirect.

**Acceptance criteria:** simulated Stripe-retrieve failure leaves the pending row unclaimed and a retry fully provisions the user; an entitled user with no `user_plans` row and empty localStorage sees the restore state, not onboarding; existing payers' dashboards load unchanged.

**Regression tests:** happy-path anonymous purchase end to end; repeat webhook delivery (idempotency); signed-in `/subscribe` purchase; existing payer with a plan already in `user_plans` (plan must not be overwritten).

**Risk:** MEDIUM-HIGH (billing/entitlement code). Changes must be additive and idempotent; no changes to price, tax, or trial logic.

---

### Batch 2 — Make the funnel measurable and truthful (MUST DO)
**User outcome:** invisible to users; we can finally see unique-user conversion from homepage → onboarding → reveal → checkout → activation → trial outcome.

**Files:** `src/lib/analytics.ts`, `src/routes/checkout.return.tsx`, `src/routes/onboarding.tsx`, `src/routes/plan-reveal.tsx`, `src/routes/auth.tsx`, `src/routes/index.tsx`, `src/routes/subscribe.tsx`, `src/components/dashboard/today-panel.tsx` / `src/routes/dashboard.tsx`.

**Work:** attach a persistent anonymous id (plus authenticated user id once known, no PII) to every event so steps de-duplicate into unique users. Move `checkout_completed` / `trial_started` to fire only after the claim poll confirms success, and add a failure event for confirmed-failed claims. Collapse the triple-fire clusters to one canonical event per user action (keep legacy names only where needed for continuity). Add the missing symmetry: track sign-in/sign-up start and completion for all three auth methods, fire `trial_started` on the signed-in path, and instrument the homepage header CTA. Wire the five declared-but-dead events: `first_study_plan_created`, `first_session_logged` (from the existing completion path in `study-log`/Focus), and trial lifecycle (`trial_converted`, `trial_cancelled`, `first_payment_failed`) from the webhook's existing handlers via a server-side sink.

**Acceptance criteria:** one user completing the whole funnel produces exactly one event per step; a failed claim produces no `checkout_completed`; first completed task fires `first_session_logged` once; no email, card, token or plan content in any event payload.

**Regression tests:** analytics no-ops safely with no provider present and during SSR; onboarding/reveal/checkout flows behave identically with tracking changed.

**Risk:** LOW (instrumentation only), except the webhook touch, which must be non-blocking and never able to throw inside the handler.

---

### Batch 3 — Strip the distractions around Today → Focus (SHOULD DO)
**User outcome:** every nav destination leads somewhere real; the daily loop is the obvious centre of the product.

**Files:** `src/components/app-shell.tsx`, `src/routes/community.tsx`, `src/routes/focus.index.tsx`, `src/routes/plan.tsx`, `src/routes/plan-preview.tsx`, `src/components/profile-menu.tsx`, `src/routes/mocks.tsx`.

**Work:** remove `/community` from nav and delete the placeholder route (or hard-redirect it to `/dashboard`); delete the "Coming soon" grid in `focus.index.tsx`; keep `WeeklyReview` on one surface only (recommend `/analytics` or `/plan`, not both dashboard and plan); delete the orphan `/plan-preview`; give `/flashcards` a real nav entry (it is a substantial feature currently reachable only via `/topics`) and decide whether `/connect` gets a Settings entry or stays intentionally unlisted; remove or replace `soon()` menu items and the "coming soon" mock badge with honest copy.

**Acceptance criteria:** no nav item leads to a placeholder; no "coming soon" text in authenticated UI; build and typecheck clean after route deletions (`routeTree.gen.ts` regenerates); mobile bottom nav unchanged for the five primary items.

**Regression tests:** every remaining nav item loads for an entitled user; no dangling `Link`/`navigate` to deleted routes; deep links to removed routes do not 500.

**Risk:** LOW.

---

### Batch 4 — First-week activation and a reason to come back (SHOULD DO; email nudge OPTIONAL)
**User outcome:** a new trialist immediately knows what to do first, how many trial days remain, and what they achieved after their first session.

**Files:** `src/components/dashboard/today-panel.tsx`, `src/routes/dashboard.tsx`, `src/routes/settings.tsx`, `src/routes/index.tsx`, `src/routes/plan-reveal.tsx`.

**Work:** first-run dashboard state that names the single recommended first task and why, using the existing task-presentation data (no new engine work). Persistent, honest trial-day indicator ("Day 2 of 7 · free until <date>") sourced from the existing `trial_end` profile field, matching the recently fixed eligibility copy — including the ineligible/reactivation case. After the first completed session, show what was captured and the next scheduled task (uses existing completion + revision data). Add the mobile sticky CTA on the homepage that the reveal page already has, and disable/explain the reveal CTA when payments are unavailable instead of failing on click. **OPTIONAL, only if credits allow:** a single day-3 trial reminder email through the existing queue infrastructure — treat as separate and last, since no retention queue exists yet.

**Acceptance criteria:** brand-new entitled user sees exactly one recommended next action; trial counter matches `trial_end` and shows nothing for non-trial members; post-completion feedback appears without a page reload; homepage sticky CTA appears on mobile after the hero and nowhere on desktop.

**Regression tests:** existing users with plans see no first-run state; completion still writes `study_events`/`graded_attempts` exactly once; grandfathered and cancelled-but-in-grace members see correct (non-trial) messaging.

**Risk:** LOW for the in-app work; MEDIUM for the optional email (new sending path) — ship it separately or not at all.

---

## Leave alone explicitly

- The deterministic planning and recalibration engine (`src/lib/plan/*`, `study-plan-logic.ts`) — recently rebuilt and working.
- `study_events` / `graded_attempts` schema, `study-log.ts`, `graded-performance.ts`, `analytics-derive.ts` honesty rules.
- Stripe price, tax behaviour, trial-eligibility logic and the recently corrected checkout/settings copy (`src/lib/founding.ts`, `src/lib/stripe.server.ts`, `pro.functions.ts`).
- RLS policies, the Pro-grant trigger, and auth redirect canonicalisation (`auth-redirect.ts`).
- AI Coach and AI Tutor, and the MCP tool surface.
- The two parallel checkout implementations — document the divergence, do not merge while payers are live.
- Question-bank/flashcard content volume, mocks build-out, community features.

## Sequencing

Batch 1 → Batch 2 → Batch 3 → Batch 4. Batch 1 protects revenue and trust; Batch 2 makes every later decision evidence-based; Batches 3 and 4 sharpen the paid experience.
