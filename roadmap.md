# Roadmap — Tentra Smart Review

Source: uploaded LOVABLE_PROMPT_-_TENTRA_SMART_REVIEW_pasted.md

## Phase 0 — Discovery ✅
- [x] Quiz systems: reuse /practice + src/lib/practice/*; generate-quiz edge fn (10q, confidence-based difficulty, no option shuffle)
- [x] Tutor: text-only SSE chat; add inline quiz card reusing practice pipeline
- [x] Planner: graded_attempts → buildPlanEvidence → prioritiseSubjects already adapts; "graded-performance" trigger exists; nav via AppShell NAV arrays

## Phase 1 — Data foundation ✅
- [x] smart_review_sessions table (RLS, grants, idempotent upsert); types regenerated
- [x] Subtopic rollup lib reusing graded_attempts (performance.ts, diagnosis.ts, sessions.ts, summary.ts + 15 tests)

## Phase 2 — Quiz experience ✅
- [x] generate-quiz: 5/10/15/20 counts, Easy/Medium/Hard/Mixed difficulty, per-option explanations + memory rules (deployed)
- [x] Practice flow: count+difficulty passthrough, seeded option shuffling, flag-defective (excluded from score, snapshot v3)

## Phase 3 — Intelligent feedback ✅
- [x] Results: personalised summary, question-by-question table, per-option explanations, memory rules
- [x] "What to Review Next" diagnosis (relearn / misapplies / isolated / repeated / reinforce)

## Phase 4 — Tracking & adaptation ✅
- [x] Statuses Strong / Developing / Needs Review / Not Yet Assessed (conservative rules, tested)
- [x] Adaptive follow-ups: Practise weak areas, 5 harder, Explain again (Tutor), Next topic

## Phase 5 — Integrations ✅
- [x] AI Tutor: inline interactive quiz card, context retained via transcript summary, auto-saved
- [x] /smart-review page + nav (secondary), dashboard card, analytics link
- [x] Planner: "graded-performance" recalibration fired after weak results (<70%)
- [x] Quiz history + Review Incorrect Answers on /smart-review

## Phase 6 — Polish & verify
- [ ] End-to-end verification (Playwright): /smart-review, practice quiz with flags, tutor quiz card
- [ ] Report operational vs incomplete elements
