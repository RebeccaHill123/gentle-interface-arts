# Tentra Product Audit — SQE Paid-Product Readiness

## Executive verdict

Tentra today is a **well-designed revision timetable with a convincing analytics veneer**, not yet a credible £9.99/month SQE study product. The onboarding, plan reveal and visual craft are genuinely strong. Behind them, three structural failures undermine the core promise:

1. **The plan is not adaptive.** `todayTasks` and `weeklyFocus` are generated once at onboarding and never rebuilt. There is no caller of `generate-plan` after signup, no day rollover, no overdue model. The only way to change an exam date or weekly hours is Settings → "Re-plan", which destructively deletes the plan row (and the session history stored inside the same JSON blob).
2. **The headline numbers are not real.** `/analytics` "accuracy", "Mock performance" and "Predicted SQE score" are computed from `focus × (mood/5)` — self-reported feelings. Real graded data exists (`mock_answers.is_correct`, practice quiz accuracy) but full-mock scores are discarded before reaching the analytics pipeline, and `mock-performance.ts` (real per-topic accuracy) is never surfaced on `/analytics`.
3. **The question bank is thin.** Full mocks present a structurally correct SQE1 360-question blueprint but fill it by rotating ~14–20 unique questions roughly 18×. Practice quizzes are AI-generated at runtime, never persisted, never cached, with no grounding/RAG and no visible accuracy disclaimer.

Usage data corroborates: 53 stored plans, **41 never updated after creation**, 4 with any task completion, **0 mock answers ever recorded**, and 40 orphaned plans whose `user_id` no longer exists in `auth.users`.

Verdict: the acquisition funnel is ahead of the product. Ship no further paid-conversion optimisation until the adaptive loop and honest measurement exist.

## Product map

| Area | Route / module | Real data? | State |
|---|---|---|---|
| Onboarding (3-stage) | `onboarding.tsx`, `confidence.ts` | Yes | Strong |
| Plan reveal / paywall | `plan-reveal.tsx`, `week-one.ts` | Yes | Strong |
| Plan generation (paid) | `supabase/functions/generate-plan` | Yes, once | One-shot |
| Plan preview (free) | `study-plan-logic.ts`, `preview-plan.ts` | Yes, once | Divergent duplicate of server logic |
| Dashboard | `dashboard.tsx` (1994 lines), `command-centre.tsx` | Partly | ~1000 lines orphaned dead UI |
| Focus / sprints | `focus.*.tsx`, `focus-store.ts` | Yes | Works; double-log risk |
| Practice quizzes | `practice.tsx` | AI runtime | No persistence |
| Full mocks | `mocks.*`, `full-mock-questions.ts` | Yes (Supabase) | Bank near-empty |
| Flashcards | `flashcards.tsx`, `generated_flashcards` | Yes | localStorage-only progress, no sessions logged |
| Topics | `topics.tsx`, `topic-map.ts` | Yes | Best-in-class area |
| Analytics | `analytics.tsx`, `analytics-derive.ts` | **Proxy** | Misleading |
| AI Coach / Tutor | `coach.tsx`, `api/coach.ts`, 2 MCP tools | Grounded snapshot | Read-only; 3 duplicated prompts |
| Community | `community.tsx` | No | Static placeholder, desktop-only nav |
| Settings | `settings.tsx` | Yes | No incremental edits, no export/delete |

## Core loop — intended vs actual

```text
INTENDED:  plan -> study today -> log real performance -> recalibrate -> new plan
ACTUAL:    plan -> study today -> log proxy signal -> (dead end)
                                          |
                    adjustModuleConfidence writes a score
                                          |
                                    nothing reads it
```

## Findings register (severity ordered)

**P0 — breaks the paid promise**
- F1. Plan never regenerates; no scheduled or event-driven recalibration.
- F2. Analytics accuracy/predicted score built on mood × focus, not correctness.
- F3. Full-mock graded score discarded at `mocks.simulation.$simId.tsx` — the most rigorous data source moves no metric.
- F4. Mock bank rotates ~20 questions to fill 360 slots; a serious candidate detects this in one sitting.
- F5. No overdue / missed / rollover model; `completedTaskIds` are array indices, not date-scoped.
- F6. Settings cannot change exam date or hours without destroying plan + session history behind a native `confirm()`.

**P1 — integrity and trust**
- F7. Whole-plan last-write-wins `upsert`; two devices silently delete each other's sessions. Push is fire-and-forget with console-only failure.
- F8. Mixed timezone date keys — some sessions stamped local (`todayKey()`), some UTC (`toISOString().slice(0,10)`), corrupting streaks and 14-day consistency for non-UTC users.
- F9. Undo-complete removes neither the logged session nor the confidence adjustment.
- F10. `addStudySession` called from 6 sites with no idempotency — manual log + focus sprint double counts.
- F11. Practice results not persisted; lost on refresh. No per-question log anywhere.
- F12. Flashcard study invisible to minutes, streaks and analytics despite a `"flashcards"` session type existing in the enum and UI.
- F13. No RAG/grounding or verification for AI-generated legal content; no user-visible accuracy or "not legal advice" disclaimer in practice or coach UI.
- F14. 40/53 orphaned plans; no data export, no account-deletion flow (GDPR gap).

**P2 — quality and maintenance**
- F15. Duplicate plan engines (edge function vs client) drift for identical inputs; MPRE silently falls back to SQE subjects.
- F16. Dashboard dead code (~1000 lines) plus unused `tab` state.
- F17. Coach/Tutor mode toggle is cosmetic — same endpoint, same Coach system prompt; three duplicated prompt copies.
- F18. Quiz-gated task completion dead-ends if `generate-quiz` fails (no "mark done anyway").
- F19. Dashboard hydration has no catch — a failed cloud pull hangs the spinner forever.
- F20. Community placeholder shipped in desktop nav; `syllabusCoverage` denominator is the user's onboarding modules, not the full syllabus, so it can read 100% with syllabus gaps.

## Truth table — advertised vs implemented

| Claim | Reality | Status |
|---|---|---|
| "Personalised plan from your exam date and real hours" | True at generation time | ✅ |
| "Adapts to your progress and performance" | Never regenerates | ❌ False |
| "Recalibrates automatically" | No recalibration code path | ❌ False |
| "Predicted SQE score" | Derived from mood × focus | ❌ Misleading |
| "Tracks your weak areas" | Real for mocks (unused on /analytics); analytics version is proxy | ⚠️ Partial |
| "Full SQE1 mock (360 questions)" | ~20 unique questions rotated | ❌ Misleading |
| "Practice questions" | Real AI questions, ungrounded, unsaved | ⚠️ Partial |
| "AI Coach that knows your plan" | Real grounded snapshot, read-only | ⚠️ Partial |
| "Spaced repetition flashcards" | Binary shuffle, local-only progress | ❌ Misleading |
| "Community" | Static placeholder | ❌ Absent |

## Product strategy

Reposition from *timetable* to **performance-led study operating system**: one honest measurement layer (graded answers only), one plan engine (server, shared), one loop that visibly changes tomorrow based on today. Everything advertised must be traceable to graded data or explicit user input. Anything else says "Not enough data yet".

## Prioritised roadmap / 6-week build sequence

- **Week 1 — Truth.** Unify plan storage to per-row sessions with idempotency keys and a single local/UTC date convention. Persist full-mock and practice scores as graded results. Strip mood-based "accuracy" from `/analytics`; replace with graded accuracy or "Not enough data yet".
- **Week 2 — One engine.** Delete the client plan duplicate; call the edge function for preview and paid alike. Add MPRE. Version `StoredPlan` with explicit migrations.
- **Week 3 — Adaptive loop.** Date-scoped task completion, day rollover, overdue states, and a nightly/on-open recalibration that reads graded accuracy + confidence and rewrites `todayTasks`/`weeklyFocus`. Show a "what changed and why" diff.
- **Week 4 — Question bank.** Author/curate a real SQE1 bank (target 1,200+ FLK1/FLK2 items, blueprint-weighted), persist every attempt per question, retire rotation. Add grounding and citations to AI generation plus a visible accuracy disclaimer.
- **Week 5 — Execution + control.** Incremental Settings (exam date, hours, confidence) that trigger recalibration without data loss; remove dashboard dead code; give Coach scoped write actions ("adjust my week") with user confirmation.
- **Week 6 — Trust + retention.** True SM-2 scheduling with cloud-synced flashcard progress and logged sessions; data export and account deletion; orphaned-plan cleanup; remove or build Community.

## Acceptance criteria

- Changing the exam date in Settings updates today's tasks within one load, preserves all history, and shows a change explanation.
- Missing three days produces visible overdue items and a redistributed week, not a frozen list.
- Every number on `/analytics` traces to a graded answer row or an explicit user input; no metric derives from mood.
- Completing a full mock changes readiness and weak areas.
- No question repeats inside a single mock sitting.
- Two devices used the same day lose no sessions.
- Undo-complete fully reverses its session and confidence effects.
- Export and delete-my-data both work from Settings.

## User scenarios to validate

1. Part-time resitter, 12 weeks out, misses a week — plan rebalances, tone stays supportive, no fake weakness claims.
2. Beginner, 9 months out, scores 42% on a diagnostic — foundations expand, predicted readiness moves on graded data only.
3. Advanced candidate, 4 weeks out, two devices — mocks drive the final-review plan and nothing is lost.

## Founder decisions needed

1. **Question bank**: licence a real SQE bank, commission authored content, or fund AI + human legal review? This is the largest cost and the biggest credibility lever.
2. **Honesty timing**: soften "adaptive" and "360-question mock" marketing now, or hold until Week 3–4 ships?
3. **Cloud-first migration**: accept a one-off migration of localStorage plans into relational tables (recommended) or keep the blob?
4. **Community**: build (cohorts/leaderboards) or remove from nav?
5. **Price**: £9.99 is under-priced for the Week 1–6 product; hold as Founding Member rate and raise for new cohorts?
