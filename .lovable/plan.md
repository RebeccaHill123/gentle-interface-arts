# Tentra conversion audit — UK SQE landing page

Audit only. Nothing below has been implemented.

## Executive diagnosis

The landing page itself is in good shape: it is already SQE-first, product-forward, mobile-aware and instrumented. The conversion problem is almost certainly not the homepage copy — it is the **commitment structure downstream of it**. Today the only path to any usable output is: 5-step onboarding form → plan *preview* → £9.99/month card required before the user has ever touched the product. There is no free tier, no trial, no email capture, and no proof (zero reviews, testimonials, user counts, or founder credibility) anywhere on the page. For TikTok traffic — cold, mobile, low-trust, price-sensitive students — that is a hard wall, which matches the observed drop to zero sign-ups after moving paid-only.

Observed fact vs hypothesis is labelled throughout.

## What is working

- **SQE-primary hero** (`src/routes/index.tsx`, hero section): badge "Built for SQE1 · FLK1 & FLK2", H1 "The smarter way to plan your SQE revision", exam-date + hours-per-week promise. Audience and mechanism are clear in the first viewport.
- **NY Bar correctly demoted**: single "Also available" card near the page bottom plus a dedicated `/new-york-bar` route. Hierarchy is right.
- **Product shown before commitment**: `HeroPreviewCard` plus the interactive `FeatureShowcase` (Plan / Focus / Coach / Mocks / Analytics) sit directly under the hero.
- **Four-step "How Tentra works"** section with numbered `StepCard`s (`#how`).
- **Problem framing** present (static spreadsheets vs adaptive plan) and an editorial statement block.
- **Mobile CTA discipline**: sticky bottom CTA appears only after the hero CTA scrolls out (`IntersectionObserver`), `min-h-11` tap targets, edge-to-edge preview card.
- **Funnel instrumentation exists**: `homepage_viewed`, `how_it_works_viewed`, `build_plan_cta_clicked`, `pricing_section_viewed`, `founding_cta_clicked`, `checkout_started`, `checkout_abandoned`, `plan_reveal_viewed` in `src/lib/analytics.ts`.
- **Head metadata and JSON-LD** are SQE-specific and self-canonical; `/sqe` and `/new-york-bar` have their own metadata.

## Conversion blockers

### 1. Hard paywall before any product use — CRITICAL
Evidence: `/plan-reveal` shows only stats, focus tags, week-1 theme and one session, with copy "the full plan unlocks after activation"; `PendingCheckout` mounts Stripe immediately; there is no free path anywhere (`src/lib/founding.ts` exposes only `founding_monthly`). Landing CTAs all point to `/onboarding`, whose terminus is payment.
Impact: the single largest drop-off. Cold TikTok traffic converts to paid at a small fraction of warm traffic; with no free tier there is no recoverable audience and no remarketing list.

### 2. No trust or proof of any kind — CRITICAL
Evidence: the testimonial slot was replaced by a brand statement ("Less time planning. More time making progress."). No reviews, student count, university/provider mentions, founder story, screenshots-with-attribution, refund promise, or "as used by" line. Only micro-trust is "Secure checkout via Stripe · Cancel anytime".
Impact: asking for card details from an unknown brand with zero social proof. Hypothesis: this is the second-biggest blocker after the paywall.

### 3. No email/lead capture — HIGH
Evidence: no email field on the landing page; the only email the system ever sees is created by the Stripe webhook after payment. Abandoned `pending_plans` are cleaned up.
Impact: 100% of non-payers are lost permanently; no nurture, no abandoned-checkout recovery.

### 4. Five-step onboarding before value — HIGH
Evidence: `STEPS` = Exam, You, Coverage, Focus, Review; step 4 blocks progress until at least one subject is chosen; step 2 asks for name, exam date, hours and intensity.
Impact: each step is a mobile drop-off point, and every one is paid *before* the user knows what the plan looks like.

### 5. Price presented with no anchor or risk reversal — HIGH
Evidence: pricing card shows "£9.99 / month", "Cancel anytime", "An introductory rate for Tentra's earliest members". No struck-through comparison, no cost-vs-course-provider framing, no guarantee, no scarcity, no annual option.
Impact: £9.99 reads as an unjustified subscription rather than a bargain against £3k+ SQE prep courses.

### 6. CTA wording is inconsistent about what happens next — MEDIUM
Evidence: "Build my SQE plan" (hero), "Build my personalised plan" (pricing card), "Unlock my personalised plan" (reveal). The first two imply a free build; payment then appears.
Impact: expectation violation at the reveal step; hypothesis: measurable abandonment at `plan_reveal_viewed → checkout_started`.

### 7. TikTok landing context is generic — MEDIUM
Evidence: no `?utm`/`?src` awareness on `/` or `/onboarding`; no short-form-video asset on the page; hero preview is a static React mock rather than a motion demo.
Impact: creative-to-page message mismatch for social traffic.

### 8. Analytics cannot diagnose the funnel — MEDIUM
Evidence: `src/lib/analytics.ts` only writes to `localStorage` and forwards to `window.plausible` / `posthog` / `gtag` / `dataLayer` *if present*; no provider script is mounted in `src/routes/__root.tsx`. There is no server-side sink.
Impact: none of the existing events are actually collectable today — the drop to zero sign-ups cannot be attributed to a step.

### 9. `robots.txt` blocks `/onboarding` — LOW (correct for SEO, but note)
Evidence: `public/robots.txt` disallows `/onboarding`. Fine for indexing, but it also means no organic entry directly into the funnel; all organic traffic must pass the homepage.

### 10. Cognitive load in the mid-page — LOW
Evidence: features showcase, four steps, problem block, six SQE feature cards, statement block, pricing, six "What's included" items, NY Bar block. Considerable scroll depth before price on mobile.

### 11. Accessibility/performance — LOW
Evidence: several decorative gradient/blur layers (`BackgroundBlobs`, blurred `-z-10` glows) — `motion-reduce:hidden` is applied in places but not consistently; body copy uses fractional sizes as low as `11.5px`/`12.5px` with `text-muted-foreground`, near the contrast/legibility floor on mobile.

## Prioritised action plan

### P0 — remove the commitment wall and start collecting signal

1. **Give the plan away, gate the system.** Journey step: `/plan-reveal`. Show the full week 1 (all sessions, all subtopics) free and gate weeks 2+ / Focus / Coach / Mocks / Analytics. Hypothesis: showing real, complete output before payment lifts `plan_reveal_viewed → checkout_started` because the user has already experienced the value.
2. **Introduce a free tier or 7-day trial.** Journey step: pricing card in `src/routes/index.tsx` + `/plan-reveal` CTA + `src/lib/founding.ts`. Recommended direction: "Start free — no card needed" as the primary CTA, Founding Member £9.99 as the upgrade. Hypothesis: sign-ups recover to pre-paywall levels; paid conversion happens after activation, not before.
3. **Capture email before payment.** Journey step: end of `/onboarding` or top of `/plan-reveal` — "Email me my plan" single field. Hypothesis: recovers 100%-lost non-payers and enables abandoned-checkout email.
4. **Mount a real analytics provider.** `src/routes/__root.tsx` + `src/lib/analytics.ts`. Hypothesis: without this no other change can be evaluated. This is a prerequisite for every test below.
5. **Add first-party proof.** Journey step: new section between the problem block and pricing. Founder/why-we-built-it line, real student count once available, and honest early-stage framing rather than invented testimonials. Hypothesis: proof lifts pricing-section → CTA click.

### P1 — reduce friction and justify the price

6. **Compress onboarding to 3 steps.** `src/routes/onboarding.tsx`: merge Coverage + Focus into one screen, default subject selection to the full path so no blocking validation is needed, move name to after activation. Hypothesis: fewer steps raises `onboarding_start → plan_reveal_viewed`.
7. **Reframe the price with an anchor and a guarantee.** Pricing card: "Less than one hour of tutoring" / "vs £3,000+ prep courses", plus a 14-day money-back line if commercially acceptable. Hypothesis: anchoring plus risk reversal lifts checkout starts at the same price point.
8. **Align CTA promises.** Use "Build my free SQE plan" everywhere pre-payment and reserve "Unlock" for the paid step. Hypothesis: removing the expectation break reduces reveal-stage abandonment.
9. **Objection block near pricing.** Short FAQ: is it SQE1 only, what if my exam date moves, what if I fall behind, can I cancel, is my data private. Hypothesis: handles the specific hesitations that stall a subscription decision.
10. **TikTok landing continuity.** Read a `src`/`utm_source` param on `/` and swap the hero eyebrow to match the creative; add a short looping product clip in place of the static preview on mobile. Hypothesis: message match lifts hero CTA click-through from social.

### P2 — polish

11. Tighten the mid-page: fold the six SQE feature cards into the interactive showcase, drop the statement block, and pull pricing higher on mobile.
12. Add `/sqe1`, `/flk1`, `/flk2` search-intent pages modelled on the existing `/sqe` route, each with genuine syllabus content rather than SEO filler; keep them linked from the footer, not the primary nav.
13. Accessibility/performance pass: raise minimum body size to 13px, audit muted-foreground contrast, apply `motion-reduce` consistently to all blur/gradient decoration, and lazy-mount the showcase below the fold.

## Suggested revised section order

```text
1  Hero (SQE badge, H1, promise, "Build my free SQE plan", social-proof strip)
2  Product preview / interactive showcase
3  How Tentra works (4 steps)
4  The problem (spreadsheets vs adaptive plan)
5  Proof (founder note + student count + early-access framing)
6  Feature depth (SQE1 / FLK1 / FLK2 specifics)
7  Pricing (free tier primary, Founding Member £9.99 upgrade, anchor + guarantee)
8  Objections / FAQ
9  New York Bar (secondary "Also available")
10 Final CTA + footer
```

## Three highest-value A/B tests

1. **Free plan vs paywalled plan** at `/plan-reveal`: full week 1 free + upgrade prompt, versus today's locked preview. Primary metric: activated accounts per 100 homepage views.
2. **Hero CTA framing**: "Build my free SQE plan" versus "Build my SQE plan". Primary metric: hero CTA click-through, secondary: reveal-to-checkout rate.
3. **Price presentation**: bare £9.99 versus £9.99 with a cost anchor and a money-back guarantee. Primary metric: `checkout_started → checkout_completed`.

## Measurement plan

Primary conversion event: `checkout_completed` (paid activation). Secondary primary during the free-tier test: first authenticated dashboard view.

Funnel (existing events reused, additions marked NEW):

```text
homepage_viewed
  → build_plan_cta_clicked (surface, placement)
  → onboarding_start
  → onboarding_step_complete (step) [per step]
  → plan_reveal_viewed
  → founding_cta_clicked
  → checkout_started
  → checkout_completed | checkout_abandoned
  → account_access_completed → dashboard_reached
```

NEW events to add: `email_captured`, `free_plan_activated`, `paywall_viewed` (which surface blocked them), `upgrade_prompt_clicked`, `faq_item_opened`, `traffic_source_seen` (utm/src). Every event should carry `examType` and `source` so SQE vs NY Bar and TikTok vs organic can be separated.

## Facts vs hypotheses

- **Observed in code**: SQE-first hero and metadata; NY Bar secondary; interactive showcase; 4-step how-it-works; sticky mobile CTA; 5-step onboarding with blocking subject validation; `/plan-reveal` partial preview then Stripe; single £9.99 Founding Member price with no free or trial path; no testimonial/proof content; no email capture; analytics module with no mounted provider; `robots.txt` disallowing `/onboarding`.
- **Hypotheses (unmeasured)**: that the paywall and absent proof are the dominant causes of the sign-up collapse; the expected direction of each recommended change; the relative severity ranking. All of these need the P0 analytics work before they can be confirmed.
