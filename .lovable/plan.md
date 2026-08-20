# Onboarding simplification — observed vs proposed

Plan only. Nothing below is implemented.

## 1. Current flow map (observed in `src/routes/onboarding.tsx`)

```text
Landing CTA (/, /sqe, /new-york-bar) → /onboarding (no search params passed)

Step 1  Exam       SQE1 | SQE2 | NY Bar (UBE) | MPRE   (examPath derived 1:1)
Step 2  You        name (required) + exam date (required, future)
                   + hours/week slider (1–40, default 10)
                   + intensity (4 cards, default "intermediate")
Step 3  Coverage   "Cover everything" (even) vs "Advanced personalisation"
Step 4  Focus      every subject listed, confidence slider per subject,
                   weak-subtopic pickers (only when coverage = advanced);
                   blocks if modules.length === 0
Step 5  Review     summary → "Generate my plan"

→ createPendingPlan (server) → /plan-reveal?token=… → Stripe → account
```

Observed facts:
- Draft is already persisted per keystroke to `sessionStorage` (`tentra.onboarding.draft.v1`) including `step`, and onboarding resumes at that step.
- `modules` are auto-seeded from `getSubjectsForExamPath(examPath)` with `confidence: 3`, `weakSubtopics: []`. So step 4's validation can never actually fail in normal use — it is friction with no protective value.
- Step 3 only changes whether step 4 shows subtopic pickers; `coverageMode` is not read by `preview-plan.ts` or `study-plan-logic.ts` at all.
- `name` is only consumed by the dashboard greeting (`userName={input.name}`). The plan generator, plan-reveal and the Stripe webhook never read it.
- `/onboarding` has no `validateSearch`, so the SQE homepage cannot currently pass intent through.
- Server validation in `createPendingPlan` requires `examType`, future `examDate`, and `Array.isArray(modules)` — not `name`, not `intensity`, not `coverageMode`.

## 2. Absolute minimum inputs for a credible SQE plan preview

Only three, per what `generatePreviewPlan` actually consumes:

1. **examPath** (drives the syllabus subject list and subtopic depth)
2. **examDate** (drives days-to-exam, week count, and study phase)
3. **hoursPerWeek** (drives session count and per-session durations)

Everything else is a modifier that already has a safe default.

## 3. Proposed minimum viable flow (2 screens + reveal)

```text
/onboarding?exam=sqe1  (preselected from the SQE homepage)

Screen 1  "When's your exam?"
          exam-path chips (SQE1 preselected; SQE2 · NY Bar · MPRE visible)
          + date picker
          → Continue

Screen 2  "How much time have you got?"
          hours/week slider with live "what your week looks like" preview
          + optional single-tap experience row (New to it / Some prep / Resitting)
          → Build my plan

→ /plan-reveal (full week 1 visible) → payment → dashboard
```

Two required taps and one date entry before the plan appears, versus five screens today. Screen 2's experience row is optional — skipping it keeps `intermediate`.

## 4. SQE1 preselection

Yes, safely: add `validateSearch` to `/onboarding` reading an optional `exam` param (`sqe1|sqe2|ube|mpre`), defaulting to `sqe1`. Homepage, `/sqe` and pricing CTAs pass `?exam=sqe1`; `/new-york-bar` passes `?exam=ube`. All four exam options remain visible and switchable on screen 1, so no route is removed — only the default changes. `defaultPathForExam` and `pathToExamType` already handle the mapping.

## 5. Deferred-field table

| Field | Today | Proposed | Collected instead |
| --- | --- | --- | --- |
| examPath | Step 1, required | Screen 1, preselected from `?exam` | — |
| examDate | Step 2, required | Screen 1, required | — |
| hoursPerWeek | Step 2, required | Screen 2, default 10 | — |
| intensity | Step 2, 4 cards | Screen 2, optional 3-chip row, default `intermediate` | Settings / recalibrate |
| name | Step 2, **required** | Removed | After payment, on first dashboard load (also available from Google/profile) |
| coverageMode | Step 3, own screen | Removed entirely (unused by plan logic) | Replaced by the Topics page, which already does per-subtopic work |
| module confidence | Step 4, per subject | Defaulted to 3 for all | Dashboard "Rate your confidence" prompt + existing Topics page |
| weakSubtopics | Step 4, expandable | Defaulted to `[]` | Derived from real mock/quiz performance (`mock-performance.ts`), plus optional manual flagging in Topics |
| Review step | Step 5 | Removed — `/plan-reveal` is the review | — |

## 6. Recommended defaults

- `examPath`: from `?exam`, else `SQE1_FULL`
- `examType`: `pathToExamType(examPath)` (unchanged)
- `intensity`: `intermediate`
- `coverageMode`: `even` (kept in the type for back-compat, no longer surfaced)
- `hoursPerWeek`: 10
- module `confidence`: 3, `weakSubtopics`: `[]`
- `name`: `""` at plan creation; dashboard greeting falls back to a name-free headline

## 7. Technical risks and safeguards

| Removal | Risk | Safeguard |
| --- | --- | --- |
| `name` required | Dashboard greeting renders "Welcome back, " with an empty name; `OnboardingInput.name` is typed non-optional | Make the greeting name-optional first, and keep `name: ""` in the payload so no type or server-validation change is forced |
| module confidence defaults to 3 | `preview-plan.ts` weights allocations by `(6 - confidence)`; uniform 3 gives an even split, so week 1 looks less "personalised" | Compensate by ordering subjects by syllabus high-yield weight rather than confidence when all values are equal, so the plan still reads deliberately |
| `weakSubtopics` empty | `rationale: "weak-area"` never fires on a first plan | Acceptable — the foundation-first phase is the correct week-1 output anyway; weak-area work should come from real assessment data |
| `coverageMode` removed | Field exists in `OnboardingDraft`, `OnboardingInput` and stored plans | Keep the optional field and keep writing `"even"`; only delete the UI. No migration needed |
| Step-5 review removed | Users lose a confirm step before a server write | `/plan-reveal` already shows every input back and can offer "Change my answers" |
| Draft `step` values | Existing sessionStorage drafts carry `step: 3–5`, which would exceed the new step count | Clamp on load (`Math.min(newStepCount, draft.step)`) — the code already clamps, so verify the new bound |
| `?exam` param | Unknown values | `validateSearch` whitelist, fall back to `sqe1` |

## 8. Drafts and later refinement

- Keep the existing per-keystroke `sessionStorage` draft; consider moving to `localStorage` so a TikTok user who leaves the browser can resume.
- Preserve resume-at-step behaviour with the clamped bound.
- Add a single **"Recalibrate my plan"** entry point (dashboard + settings) that reopens the full input set — exam date, hours, intensity, per-subject confidence — as an edit screen rather than a wizard. This is where the deferred fields land.
- Contextual capture inside the dashboard: a dismissible "Rate your confidence across the syllabus" card, and a name prompt on first authenticated load.

## 9. Suggested microcopy

**Screen 1**
- Eyebrow: `Step 1 of 2`
- H1: `When's your SQE?`
- Sub: `We build your plan backwards from exam day.`
- Chip row label: `Exam` — `SQE1` · `SQE2` · `NY Bar` · `MPRE`
- Field label: `Exam date`
- Helper: `Not fixed yet? Use your best guess — you can change it any time.`
- CTA: `Continue`

**Screen 2**
- Eyebrow: `Step 2 of 2`
- H1: `How much time have you got?`
- Sub: `Be honest — Tentra adapts when life gets in the way.`
- Slider label: `Hours per week`
- Live helper: existing `sessionShape` string (`Steady — 4–5 mixed sessions/wk`)
- Optional row label: `Where are you now? (optional)` — `New to it` · `Some prep done` · `Resitting`
- CTA: `Build my plan`
- Micro: `Takes about 20 seconds. No card needed to see your plan.` (only if the free-preview P0 item ships)

**Reveal**
- Secondary link under the CTA: `Change my answers`

## 10. Events for step-level abandonment

Reuse `onboarding_start`, `onboarding_step_complete`, `onboarding_completed`, `plan_reveal_viewed`. Add:

- `onboarding_step_viewed` — `{ step, stepLabel, examPath, source }` (the missing denominator; today only completions fire)
- `onboarding_field_changed` — `{ field }`, throttled, to see which control stalls users
- `onboarding_exam_switched` — `{ from, to }`, to validate SQE1 preselection
- `onboarding_resumed` — `{ step }`
- `onboarding_abandoned` — fired on `pagehide` with `{ step, secondsOnStep }`
- `traffic_source_seen` — `{ source }` from `?src`/`utm_source`, stamped onto every later event

All events should carry `examPath` and `source` so SQE vs NY Bar and TikTok vs organic separate cleanly. Note the P0 prerequisite from the previous audit: no analytics provider is mounted in `__root.tsx`, so none of this is collectable until one is.

## 11. Recommended implementation sequence

1. Mount an analytics provider and add `onboarding_step_viewed` to the **current** 5-step flow. Get one baseline funnel.
2. Make `name` optional end-to-end (dashboard greeting first, then drop the field).
3. Add `validateSearch` with `?exam` and pass it from all landing CTAs.
4. Merge to the 2-screen flow: delete the Coverage screen, default confidence, delete the Review screen.
5. Add the "Change my answers" link on `/plan-reveal`.
6. Add "Recalibrate my plan" plus the dashboard confidence and name prompts.
7. Move the draft to `localStorage` and verify step clamping.
8. Compare the new funnel against the step 1 baseline before touching pricing.
