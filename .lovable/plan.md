# Dual-market public acquisition update

## Goal
Make Tentra’s existing public journey speak equally to UK SQE and U.S. Bar (UBE)/MPRE candidates while preserving the pastel premium design, interactive product showcase, pricing, authentication, checkout, and all study-plan logic.

## Homepage
- Rewrite homepage title, description, Open Graph copy, and `SoftwareApplication` description around personalised SQE1/SQE2 and U.S. Bar (UBE)/MPRE study planning; keep the existing £9.99 GBP offer and self-referencing URL.
- Replace the SQE-first badge, headline, supporting copy, and trust line with the supplied headline and a concise “Plan → Track → Adapt with AI” dual-market message.
- Make header, hero, inline, pricing, and mobile sticky actions exam-neutral and stop attaching `exam=sqe1` to generic homepage links.
- Update “Inside Tentra,” “How Tentra works,” the missed-session problem statement, feature cards, and product-preview examples so both supported pathways are represented without implying support for every state-specific U.S. exam or promising unavailable mock formats.
- Replace the bottom New York-specific promotion with a compact “One study system. Two exam pathways.” reassurance showing SQE1/SQE2 and UBE/MPRE side-by-side. Keep `/new-york-bar` itself intact.
- Change the homepage analytics market value from `SQE` to `SQE_UBE` while preserving existing event names.

## Onboarding and acquisition routing
- Keep explicit `exam=sqe1`, `sqe2`, `ube`, and `mpre` links working exactly as direct-entry selections.
- For a generic `/onboarding` visit, retain no implicit acquisition exam: open the exam choices immediately, require an explicit selection before date entry/continuation, and avoid visually or logically treating SQE1 as chosen.
- Rename the UBE option to “U.S. Bar (UBE)” and use neutral MBE/MEE/MPT copy, CTA wording, and date wording.
- Update the onboarding page description to cover both SQE and U.S. Bar pathways.
- Preserve SQE’s required FLK assessment choice after SQE1 selection and leave the New York-specific route unchanged.

## Technical details
- Make the onboarding search validator return an optional exam rather than defaulting missing/invalid values to `sqe1`.
- Track whether an exam was explicitly selected separately from the internal form state, so existing drafts and valid direct links resume correctly while generic visitors cannot continue accidentally.
- Keep all current route values and plan types unchanged; this is copy and acquisition-selection behavior only.
- Add focused deterministic tests for generic exam choice and all four explicit exam parameters where practical, then run the full test suite, TypeScript check, and production build.

## Scope and reporting
- Do not change authenticated product screens, study-plan generation, payment/webhook behavior, pricing, or publish the app.
- Report exact changed files and verification totals. List remaining New York-specific public copy intentionally left untouched, especially the existing `/new-york-bar` page and cross-link references outside the main homepage/acquisition flow.
