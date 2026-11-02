# Roadmap — Tentra Smart Review

Source: uploaded LOVABLE_PROMPT_-_TENTRA_SMART_REVIEW_pasted.md

## Phase 0 — Discovery
- [ ] Map existing quiz/MCQ/question-bank systems (agent sub_fc5aqzrp)
- [ ] Map AI Tutor/Coach architecture (agent sub_qhx65g8c)
- [ ] Map dashboard, analytics, adaptive planner (agent sub_t5xe4hz6)

## Phase 1 — Data foundation
- [ ] Schema: quiz attempts, per-question responses, subtopic performance rollup (RLS + grants)
- [ ] Reuse graded_attempts where possible; idempotent submissions

## Phase 2 — Quiz experience
- [ ] Smart Review quiz runner: 5/10/15/20 MCQs, difficulty, A–D options, progress, shuffled answers
- [ ] Submission + scoring; flag defective questions

## Phase 3 — Intelligent feedback
- [ ] Results screen: score, personalised summary, per-question table
- [ ] Explanations: rule, why each wrong option is wrong, memory rule
- [ ] "What to Review Next" diagnosis

## Phase 4 — Tracking & adaptation
- [ ] Strength/weakness tracker (Strong / Developing / Needs Review / Not Yet Assessed)
- [ ] Adaptive follow-ups: Practise weak areas, Harder questions, Explain again (Tutor), Next topic

## Phase 5 — Integrations
- [ ] AI Tutor: launch quizzes, retain quiz context, auto-save results
- [ ] Smart Review dashboard section + link from main dashboard/analytics
- [ ] Planner: weak-topic reinforcement in schedule recalculation
- [ ] Quiz history + Review Incorrect Answers

## Phase 6 — Polish & verify
- [ ] Branding consistent (lilac/blue/pink, premium editorial)
- [ ] End-to-end tests of acceptance criteria
