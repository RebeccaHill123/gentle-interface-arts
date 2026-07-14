## Plan

1. **Replace vague day-1 blocks with foundation-first tasks**
   - Stop generating titles like “Active recall: Civil Procedure”, “Mistake review: X”, or “Timed MCQs: Constitutional Law” when no prior basis exists.
   - For early-plan users, generate blocks such as:
     - “Build foundation: Subject-matter jurisdiction — federal question, diversity, removal”
     - “Apply foundation: Commerce Clause vs dormant Commerce Clause — 12 MBE questions in 22 minutes”
     - “Rule scaffold: negligence duty, breach, causation and remoteness”
   - Use “mistake review” only when the user has genuine mistakes/mock/practice data or when a block is explicitly created after a quiz/mock.

2. **Use the full SQE and UBE syllabus to choose precise subtopics**
   - Introduce a shared syllabus-planning layer derived from the existing Topic Map syllabus, so both preview plans and saved plans can select exact subject → chapter → subtopic → micro-topic coverage.
   - Keep SQE route terminology aligned to FLK1/FLK2/SQE2 and UBE terminology aligned to MBE/MEE/MPT.
   - For broad subjects like UBE Constitutional Law, tasks must target named subtopics and micro-topics, not the whole subject.

3. **Make plan phase depend on time to exam**
   - Add an exam-timeline phase model:
     - **Foundation phase**: far from exam or day 1/new user — concept scaffolds, rule sheets, short untimed/low-timed practice.
     - **Build/Application phase**: more mixed practice, issue spotting, short timed sets.
     - **Performance phase**: timed MCQs/SBAs, essays, mocks, MPTs, mistake review from real data.
     - **Final phase**: mock-led review, weakest objective performance areas, spaced refresh.
   - Weight tasks by days until exam, weekly hours, route, high-yield status, confidence, and genuine assessment data.

4. **Refactor deterministic plan generation**
   - Update the authenticated plan fallback in `generate-plan` so it never produces vague generic blocks.
   - Use a task-template engine that chooses task type, title, rationale, output, and timing from the user’s phase and selected syllabus node.
   - Ensure weekly minutes still roughly match the user’s `hoursPerWeek` target.

5. **Tighten the AI plan prompt and schema expectations**
   - Add explicit rules that day-1 plans must build foundations before recall/mistake review unless evidence exists.
   - Require every task to include a precise subtopic and, where available, micro-topics.
   - Require timed UBE MBE blocks to include question count and timing; MEE/MPT blocks to include essay/task timing.
   - Reject or normalize vague returned task titles before saving/displaying them.

6. **Fix anonymous preview plans too**
   - Update the local preview generator, because this is where examples like “Active recall: Civil Procedure” currently come from.
   - Preview plans should show the same foundation-first, syllabus-specific logic as signed-in generated plans.

7. **Dashboard display polish for plan usefulness**
   - Show the targeted subtopic/micro-topic in Today’s Plan cards when available.
   - Make first-week wording reflect “Foundation”, “Apply”, “Check understanding”, or “Timed practice” based on phase.
   - Keep mistake-review language off day 1 unless there is real mistake data.

8. **Validation**
   - Generate/check sample plans for SQE and UBE with:
     - day 1 / far-from-exam users,
     - short time-to-exam users,
     - low-confidence subjects,
     - users with and without mock/practice data.
   - Confirm no task title is broad subject-only and no mistake-review block appears without genuine mistake data.