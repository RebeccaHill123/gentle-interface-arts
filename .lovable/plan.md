## Goal
Turn the single-page onboarding into a premium, multi-step flow that produces a deeply personalised SQE plan — especially for resitters and users targeting only one paper.

## New onboarding flow (`/onboarding`)
A 5-step wizard with progress bar, smooth transitions (framer-motion), glassy cards, mobile-first.

**Step 1 — Exam Path**
Card grid: SQE1 Full · FLK1 Only · FLK2 Only · SQE2 · Custom. Drives which subjects appear later.

**Step 2 — Your Story (intensity)**
- Exam date (date picker)
- Hours/week (slider with live "session shape" preview)
- Confidence level: Beginner · Intermediate · Advanced · Resitter (cards with descriptions)

**Step 3 — Coverage Mode**
Two big choice cards:
- **Cover Everything** — even weighting across all selected subjects
- **Advanced Personalisation** — pick weak modules + drill into weak subtopics

**Step 4 — Module + Subtopic weighting** (shown for both modes; collapsed in Cover-Everything)
- Show subjects for the chosen path, sourced from `src/lib/sqe-syllabus.ts`
- Confidence 1–5 per subject (existing UX, polished)
- In Advanced mode: expand a subject to multi-select weak subtopics (chip selector). Selected subtopics get extra weight.

**Step 5 — Review & Generate**
Summary card: path, exam date, hrs/wk, confidence tier, weak focus list. CTA "Build my adaptive plan" with loader.

## Data model changes
Extend `OnboardingInput` in `src/lib/plan-store.ts`:
```ts
examPath: "SQE1_FULL" | "FLK1" | "FLK2" | "SQE2" | "CUSTOM"
intensity: "beginner" | "intermediate" | "advanced" | "resitter"
coverageMode: "even" | "advanced"
modules: ModuleConfidence[]  // now includes weakSubtopics: string[]
```
`ExamType` stays for backwards compat (derived from `examPath`).

## Plan engine changes (`supabase/functions/generate-plan/index.ts`)
- Accept new fields; default-fill for legacy callers.
- Subject set = derived from `examPath` (FLK1 only / FLK2 only / both / SQE2 list / user-picked).
- Weighted score: existing PRIORITY SCORE + intensity multiplier + subtopic-weakness boost. Resitter tier shifts pacing toward mocks + targeted refresh; Beginner tier favours concept-deepdive + active-recall.
- Spaced repetition: explicitly schedule re-touches at 1/3/7/14d for weak subtopics in `weeklyFocus`.
- Update system prompt: include weak subtopics list, intensity tier, and instruction to bias tasks toward those subtopics by name.
- Deterministic fallback updated to honour the same inputs.

## UI direction
- Stepper component (5 dots + labels) at top.
- Each step in a glass card with the existing gradient pink-blue accents.
- Framer-motion fade/slide between steps.
- Sticky bottom action bar on mobile (Back / Continue).
- Reuse existing tokens — no new colors.

## Files to change
- `src/routes/onboarding.tsx` — full rewrite into wizard
- `src/lib/plan-store.ts` — extend types + persist new fields
- `supabase/functions/generate-plan/index.ts` — accept + use new inputs, update prompt + fallback
- `src/lib/sqe-syllabus.ts` — add helper `getSubjectsForPath(examPath)`

## Out of scope (this turn)
- Live re-weighting from quiz/mock results (the engine already accepts `recentMockAccuracy` + `adjustModuleConfidence` exists). We'll keep that pipeline as-is; the new inputs make it more meaningful.
- Dashboard UI changes — plan rendering already supports the existing schema.
