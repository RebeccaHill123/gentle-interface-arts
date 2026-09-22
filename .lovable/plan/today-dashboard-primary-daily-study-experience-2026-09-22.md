# Today dashboard: primary daily study experience

## What exists today (audit)

- **`src/routes/dashboard.tsx`** (~2,300 lines) is the Today route. It loads the stored plan,
  derives analytics, ensures the adaptive schedule, and renders `TodayPanel`, weekly review,
  a metrics row and a "Record session" dialog.
- **`src/components/dashboard/today-panel.tsx`** already renders a greeting, a "Do this next"
  card with method steps, and a "Rest of today" list with inline complete/start buttons.
- **`src/lib/plan/store.ts`** is the single source of truth wrapper over the stored plan:
  `getSchedule`, `tasksForDate`, `missedTasks`, `scheduleCapacity`,
  `completeScheduledTask`, `skipScheduledTask`, `rescheduleScheduledTask`, `ensureSchedule`.
- **`src/lib/plan/types.ts`** — `ScheduledTask` carries module, subtopic, minutes, taskType,
  priority, why, evidence label, status, `actualMinutes`, `sessionId`.
- **Sessions**: `src/lib/focus-session.ts` (wall-clock durable timer, one session at a time)
  plus `src/routes/focus.sprint.tsx`, which logs via `recordStudyActivity` and then calls
  `completeScheduledTask` for planned work. `SessionCompleteSheet` already asks for real
  minutes and whether the output was finished.
- **Logging**: `src/lib/study-log.ts` (`recordStudyActivity`, owner-scoped, idempotency keys,
  offline queue) and `src/lib/manual-session.ts` for the dialog's acceptance rules.

## Reused, not rebuilt

Tables: `user_plans`, `study_events`, `graded_attempts`, `plan_revisions`, `profiles`.
Functions/components: everything listed above, plus `SkipReasonSheet`, `RescheduleSheet`,
`SessionCompleteSheet`, `task-presentation.ts`, `WeeklyReview`, `AppShell`.

## Data-model changes

None. No new tables, no migration. Two additive, optional fields on the existing in-plan
`ScheduledTask` JSON (already free-form inside `user_plans.plan`):

- `partialMinutes?: number` — time credited to a task that was worked but not finished.
- `lastWorkedAt?: string` — lets the card show "In progress".

Progress everywhere stays in **minutes** as the single unit.

## Implementation stages

**1. Today header** — new `TodayHeader` component: "Today" + full date, contextual greeting,
planned vs completed minutes, one slim daily progress bar, weekly minutes as a subtle line
beneath, exam countdown chip. Header holds nothing else.

**2. Task cards** — new `TodayTaskCard`: subject/exam area, topic, duration, task-type label,
status (not started / in progress / complete), one prominent action, and a discreet overflow
menu (mark complete, log elsewhere, reschedule, skip). Cards render in schedule order; the
first incomplete task gets the prominent gradient action, everything else stays quiet.

**3. Start session** — keeps the existing `startSession` → `/focus/sprint` path, carrying
subject, topic, duration and planned-task reference as it already does.

**4. Partial completion** — in `focus.sprint`, a planned task is only marked complete when the
user confirms completion in `SessionCompleteSheet`; if they answer "Partly", the logged minutes
are credited to `partialMinutes` and the task stays open and shows as in progress. Study time
is still logged exactly once via the existing idempotency key.

**5. Log completed elsewhere** — reuse the existing record-session controller, extended to
confirm subject, topic, duration, date, study type, and whether the linked planned task is
complete or partial. One `recordStudyActivity` write, no duplicate records.

**6. Up next** — new pure module `src/lib/plan/up-next.ts` with transparent rules in order:
unfinished task today → overdue task → heavily weighted exam topic → weak topic (only where
graded or rated data exists) → next task in the plan. Each returns a short honest reason
string. No invented weakness.

**7. Empty / completed states** — empty day offers: start a free session, add a task for today,
review an overdue task, view the plan. All-complete shows a calm summary of minutes studied and
weekly progress, with no pressure to do more.

**8. Reschedule & skip** — keep the existing sheets, which already respect daily capacity and
never duplicate a task. Add a one-line explanation of what will change before confirming;
no automatic whole-plan recalibration from a single skip.

**9. Tests** — extend Vitest coverage for header/day totals in minutes, partial-completion
crediting, and the up-next rule order (including "no weakness data" cases).

## Risks

- Focus-session completion is shared with free-form sprints; the partial-completion change
  touches that file, so free sprints must keep logging exactly as now (covered by tests).
- Plan mutations go through the revisioned sync layer; all writes stay inside existing
  `plan/store.ts` helpers so sync and concurrency behaviour is unchanged.
- The dashboard route is large; work stays inside Today and its directly connected flows.

No changes to branding, billing, auth, Coach/Tutor, mocks or practice.
