
## Goal

Make the Dashboard useful from day one on both SQE and UBE routes, cleanly separate **activity**, **performance**, **user-input** and **recommendation** data, and stop implying a Focus session tells us anything about accuracy or mastery.

## What the user sees

### 1. Route-aware everywhere
Detect the user's exam route from `input.examPath` / `input.examType`:
- `examId` stays `SQE1` | `UBE` internally.
- Add `examLabel` for UI: `"SQE"` for SQE1/SQE2/MPRE-lite routes, `"UBE"` for UBE routes.
- Hero, Topic Map snapshot title, CTAs, and empty states all read from `examLabel` (e.g. "Start building your SQE map", "Open UBE Topic Map").
- Component tag on plan blocks: shown only when the subject actually has a component (FLK1/FLK2/SQE2 for SQE, MBE/MEE/MPT for UBE), not on generic study blocks.

### 2. Today's Plan — proactive, not gated
Currently `CommandCentre` is never passed `todayItems`, so the empty state always shows. Fix:

- Map `stored.plan.todayTasks` → `TodayPlanItem[]` and pass to `CommandCentre`.
- If the plan has zero tasks for today AND the user has finished onboarding, derive fallback blocks on the fly from:
  - untouched high-yield topics for the exam
  - balanced subject coverage
  - one "Mixed practice" block per day to build performance data
- Each block: subject, topic (when known), duration or question count, "reason" line, and a Start button.
- Starting a block navigates to `/focus/sprint` with `?module=&topic=&minutes=` prefilled (existing `FocusLauncher` already supports these fields via search params — we'll add search validation on `/focus/sprint` and pre-populate).
- Removes the "No blocks scheduled today" dead-end.

### 3. Command Centre hero
For a user with **no performance data yet** (regardless of Focus minutes):
- Heading: `Start building your {examLabel} map`
- Copy: "Complete practice questions and rate your confidence to help Tentra identify weak areas. Study sessions track your coverage, progress and review history."
- Buttons: Generate / update my plan · Take diagnostic quiz · Open {examLabel} Topic Map.
- Do **not** switch to "command centre" mode just because minutes were logged — switch only when either a mock has been completed OR the user has generated a plan.

### 4. Summary cards
- **Weakest area** — pulls from real performance signal only:
  1. `mock_answers` grouped by subject/topic → accuracy
  2. `UserTopicProgress.questionsAttempted/Correct` (already respected in `topic-map.ts`)
  3. Explicit `manualConfidence` as secondary tiebreaker, never overriding worse objective data
  When no assessment data exists → **"Not enough data yet"** + "Complete practice questions to identify your weakest areas." (Replaces current "None yet".)
- **Coverage** — unchanged calculation, correct totals per route (already route-aware via `SYLLABUSES[examId]`).
- **Today's priority** — for a new user, pick from untouched high-yield / must topics (already done). Label wording changed to "Suggested next" so it does not read as a weakness verdict.

### 5. Topic Map snapshot
- Title dynamic: `{examLabel} Topic Map snapshot`.
- Rename bucket "Due for recall" → **"Due for review"** in copy (status id stays `due-for-recall` internally to avoid a syllabus-wide rename).
- Empty states rewritten per spec ("Your weak spots will appear here once you complete practice questions or assessments." / "Topics due for review will appear here as you build your study history.").
- Untouched priorities always shown when present (already works).

## What changes under the hood

### Data-source discipline
- `deriveSubTopic` in `src/lib/topic-map.ts`: keep current logic — it already refuses to infer weakness from time. One tweak: `p.timeSpentMinutes > 0 && p.questionsAttempted === 0` currently produces status `"studied"`, which is fine and matches the spec (activity ≠ mastery).
- New helper `hasPerformanceData(map)` = any subtopic has `questionsAttempted > 0` OR any completed mock exists. Drives the "not enough data" empty state on the Weakest-area card.
- New helper `applyMockAnswers(progressMap, mockAnswers)`: aggregates `mock_answers` rows into per-subtopic `questionsAttempted/Correct` when subject/topic mapping is available, otherwise per-subject accuracy only. Weakest-area card uses whichever level exists.
- `analytics-derive.ts`: leave predictions/readiness alone for now, but source `SubjectStat.accuracy` from mocks when available, `null` when not. Remove any pseudo-accuracy fallback used by the Weakest-area card (existing pseudo-accuracy stays in the older Insights section — clearly gated as "estimated"). Out of scope: rewriting the whole readiness model.

### Route-aware helpers (new file `src/lib/exam-label.ts`)
- `getExamLabel(examType|examPath): "SQE" | "UBE"`
- `getSyllabusTotalCount(examId)` — already available via `coverage()`.

### `CommandCentre` API additions
- Optional `examLabel`, `hasPerformanceData`, `todayItems`, `onGeneratePlan`, `onStartItem`. Existing props preserved.
- Weakest-area `InsightCard` gets a `mode: "value" | "empty"` so "Not enough data yet" is a first-class state, not a placeholder value.

### Focus prefill
- `src/routes/focus.sprint.tsx`: `validateSearch` for `{ module?, topic?, minutes? }`; `FocusLauncher` reads and applies them so Today's Plan blocks open the sprint pre-populated.
- Standalone Focus flow (no params) unchanged.

## Files touched

```text
src/lib/topic-map.ts                          minor: add hasPerformanceData, applyMockAnswers
src/lib/exam-label.ts                          new: examLabel + route helpers
src/components/dashboard/command-centre.tsx    hero copy, empty states, Weakest-area empty mode, snapshot title, "Due for review"
src/routes/dashboard.tsx                       map todayTasks → TodayPlanItem[], pass examLabel + hasPerformanceData + onGeneratePlan, fetch mocks
src/routes/focus.sprint.tsx                    validateSearch for prefill
src/components/focus-launcher.tsx              honor prefilled module/topic/minutes
src/lib/pro.functions.ts / new server fn       loadMockAccuracy() server fn returning per-subject/topic accuracy
```

## Explicitly out of scope
- Rewriting the readiness/prediction model in `analytics-derive.ts`.
- Building a real spaced-repetition scheduler (we rename the copy to "Due for review", threshold stays the current 7-day heuristic).
- Redesigning the authenticated app beyond the Dashboard surface.
- Changing pricing/auth/Stripe flows.

## Verification

- Preview at `/dashboard` on a fresh SQE account (no plan): hero says "Start building your SQE map", CTAs work, weakest card shows "Not enough data yet".
- Same account after generating a plan: Today's Plan lists blocks, tapping Start opens `/focus/sprint` pre-populated.
- Switch account `examPath` to `UBE_FULL`: all labels flip to UBE, subjects are UBE subjects, MBE tag appears on MBE-only subjects.
- Insert a fake `mock_answers` row via the DB tool: Weakest-area card now shows the real subject.
- Playwright at 390px width to confirm mobile layout survives the copy changes.
