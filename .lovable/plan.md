
# Add NY Bar (UBE) onboarding track

Mirror the SQE flow with a parallel UBE track (MBE + MEE + MPT). SQE remains the default and untouched for existing users.

## Scope (per your answers)
- **Exam**: UBE only (no NY Law Course/NYLE for v1).
- **Picker**: New first step in onboarding ("Which exam?") before today's Path step.
- **Depth**: Parity with SQE — real syllabus weights, tutor-quality prompts, realistic sample tasks, weak-subtopic targeting, full QA pass.
- **Existing users**: Untouched. Their stored plan keeps working; an opt-in "Add NY Bar plan" entry point comes later (out of scope here).

## What gets built

### 1. Exam-type model
- Extend `ExamType` to `"SQE1" | "SQE2" | "UBE"` and `ExamPath` with UBE values: `UBE_FULL`, `UBE_MBE`, `UBE_ESSAYS`, `UBE_MPT`, plus reusing `CUSTOM`.
- Update `OnboardingInput` and `pathToExamType` to handle UBE paths.
- Backward-compatible: existing stored plans without these values continue to load as SQE.

### 2. UBE syllabus module
New file `src/lib/ube-syllabus.ts` mirroring `sqe-syllabus.ts`:
- **MBE subjects** (7): Civil Procedure, Constitutional Law, Contracts & Sales, Criminal Law & Procedure, Evidence, Real Property, Torts — each with weight (~1/7), high-yield score, subtopics drawn from NCBE subject matter outlines.
- **MEE subjects**: Business Associations, Conflict of Laws, Family Law, Trusts & Estates, Secured Transactions, plus MBE subjects (MEE draws from both). Modeled as the 7 MEE-exclusive topics + cross-tested MBE topics.
- **MPT**: single skills module with subtopics (issue spotting, fact analysis, persuasive writing, objective memo, closing argument, statute interpretation).
- Topic groups for interleaving: "Civil Litigation" (Civ Pro, Evidence, Conflicts), "Commercial" (K, Sales, Secured Tx, BA), "Crim" (Crim Law, Crim Pro, Evidence), "Property" (Real Prop, T&E, Family), "Public Law" (Con Law).
- Helper `getSubjectsForUbePath()` plus a shared `getSubjectsForExamPath(examType, path)` switch.

### 3. Onboarding flow
`src/routes/onboarding.tsx`:
- Add new **Step 0: Exam** with two cards (SQE / NY Bar (UBE)). Persists `examType` in the draft.
- Existing **Path** step renders SQE paths or UBE paths based on chosen exam (copy and icons swapped).
- **Intensity / Coverage / Focus / Review** steps work as-is; "Focus" reads modules from `getSubjectsForExamPath`.
- Copy in Review step is exam-aware ("UBE — MBE + MEE + MPT" etc.).
- Stepper grows from 5 → 6 labels.

### 4. Plan generator (edge function)
`supabase/functions/generate-plan/index.ts`:
- Accept `examType: "SQE1" | "SQE2" | "UBE"` and UBE paths.
- Add a `UBE_FALLBACK_SUBJECTS` table (weights, high-yield, groups, subtopics) parallel to `SQE_FALLBACK_SUBJECTS`.
- Branch the system prompt: UBE prompt teaches MBE timing (~1.8 min/Q), MEE essay structure (IRAC), MPT format and timing (90 min/task), high-yield NCBE topics, mock cadence aligned to UBE windows.
- Rationale vocabulary stays the same (`high-yield`, `weak-area`, `mock-prep`, etc.) but UBE prompt uses NCBE-flavoured `why` text.
- Deterministic fallback works for UBE via the new subject table (same scoring math).

### 5. Dashboard
`src/routes/dashboard.tsx`:
- Replace any "SQE"/"FLK" hardcoded copy with exam-aware labels driven by `input.examType` (e.g. "MBE", "MEE essay", "MPT task" for UBE).
- No layout changes; same cards, gradients, badges.

### 6. Realistic UBE sample tasks
Seed deterministic-fallback `methodFor` / `outputFor` variants for UBE-only task types so an offline plan still reads like a real bar tutor wrote it (e.g. "30 mixed MBE questions at 1.8 min each, full review", "1 MEE essay in 30 min then self-grade against NCBE point sheet", "1 MPT task in 90 min").

### 7. QA pass
- Run through onboarding as a brand-new user choosing each UBE path; verify generator returns a plan, dashboard renders, sessions log, no console errors.
- Verify existing SQE users see no change (load a SQE plan from cloud, ensure no UBE code paths trigger).
- Spot-check generated copy for NCBE accuracy on at least 3 UBE subjects.

## Technical details

- **Files added**: `src/lib/ube-syllabus.ts`.
- **Files edited**: `src/lib/plan-store.ts` (types), `src/lib/sqe-syllabus.ts` (or new shared helper) for `getSubjectsForExamPath`, `src/routes/onboarding.tsx`, `supabase/functions/generate-plan/index.ts`, `src/routes/dashboard.tsx`.
- **No DB migration**: `user_plans.plan` is JSONB; the wider `examType` union is purely a TS/runtime concern.
- **No new secrets**: reuses Lovable AI Gateway.
- **No new routes**: onboarding URL stays `/onboarding`.

## Out of scope (future)
- NY Law Course / NYLE module.
- "Switch exam" UI for existing users.
- Multi-exam plans (one user, two active plans).
- California, MPRE, or other US bar variants.

## Credits
I can't quote a number — build mode is usage-based and depends on iterations and QA depth. Realistic shape: this is a meaningful chunk (new syllabus file, generator prompt branch, onboarding step, dashboard copy, QA) but smaller than the recent SQE plan-generation overhaul because the data flow, UI components, and storage are unchanged. Plan mode is 1 credit per message.
