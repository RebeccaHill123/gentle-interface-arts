# Plan: align study screens by exam pathway

## Goal
Make the shared Tentra study experience correctly adapt to the active plan: SQE, US Bar/UBE, MPRE, or ACCA.

Only SQE should use SQE-specific language such as “your SQE strategist,” FLK labels, SBAs, or SQE mocks. US Bar and ACCA users should see their own wording and should not be routed through SQE-only data.

## What I will change

1. **Coach wording and prompts**
   - Derive the active exam from the user’s current plan.
   - Use separate coach labels, modes, suggested prompts, and guidance for SQE, UBE/US Bar, MPRE, and ACCA.
   - Update the server-side coach system prompt so ACCA and UBE do not inherit SQE wording.
   - Keep ACCA scoped to selected papers where available.

2. **Topics and syllabus map**
   - Add an ACCA topic map built from the existing ACCA syllabus data.
   - Filter ACCA topics to the selected ACCA papers when the plan has them.
   - Stop ACCA users falling back to the SQE1 topic map.
   - Update page metadata and labels to include ACCA.

3. **Mocks, practice tools, and flashcards**
   - Keep full mock simulations limited to the existing SQE/UBE pathways.
   - Keep ACCA users on ACCA practice drills rather than legal mock simulations.
   - Make the AI quiz builder use pathway-aware wording: SQE SBAs, UBE MBE-style questions, ACCA objective-test/business scenarios, and MPRE ethics questions.
   - Keep ACCA flashcards as an explicit practice handoff unless real ACCA flashcard decks are added later.

4. **Dashboard and analytics safety**
   - Stop the dashboard from loading SQE mock-performance data for ACCA users.
   - Make fallback task wording exam-specific instead of defaulting non-UBE users to SQE assumptions.
   - Preserve existing Today dashboard behavior and data structures.

5. **Verification**
   - Search for remaining cross-pathway wording in shared study surfaces.
   - Run the project’s TypeScript check and tests through the harness-supported commands.
   - Verify SQE, UBE, and ACCA screens do not show inappropriate pathway labels.

## Technical notes
- No new database tables.
- ACCA full mock simulations are not added because the current full-mock engine only supports SQE and UBE blueprints.
- ACCA flashcard decks are not invented; the app will clearly direct ACCA users to targeted practice instead.
- Existing syllabus, plan, practice, and dashboard components will be reused wherever possible.
