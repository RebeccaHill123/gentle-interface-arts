## Goal

Add a way for users to launch a **Mini FLK1** or **Mini FLK2** practice assessment from `/mocks`. Each one is a timed, exam-style mini-mock drawing questions only from the subjects belonging to that FLK paper.

## Where it slots in

The Mocks page already has a "Practice modes" grid. Today it has a generic "Timed Mini Mock" card marked Coming Soon. We'll replace that single placeholder with **two live cards**:

- **Mini FLK1** — 20 SBAs · 30 min · drawn from FLK1 subjects (Contract, Tort, Business Law, Dispute Resolution, Constitutional, Legal System, Ethics).
- **Mini FLK2** — 20 SBAs · 30 min · drawn from FLK2 subjects (Property, Wills & Estates, Trusts, Criminal Law/Practice, Solicitors' Accounts, Ethics).

Both are exam-style: timed, mixed across the paper's subjects, weighted by syllabus `weight` and `highYield` from `src/lib/sqe-syllabus.ts`.

## How clicking one launches the session

Reuse the existing `PracticeLauncherDialog` flow rather than adding a parallel UI. Two small extensions:

1. **New practice type** `"mini-flk"` with a `paper: "FLK1" | "FLK2"` field on the launch config.
2. When the user clicks Mini FLK1/2 on `/mocks`, skip the format step and open the dialog **pre-configured** at the review step with:
   - format: `mini-flk`
   - paper: FLK1 or FLK2
   - subject: `"Mixed (FLK1)"` / `"Mixed (FLK2)"` (not auto, not a single subject)
   - duration: 30 min, questions: 20, timed: true, difficulty: Standard (Adaptive if user has analytics signal).
   - rationale: "Exam-style sample of FLK1 weighted by syllabus share."
3. On Begin, write `practice:config` to sessionStorage with `paper` included and navigate to `/practice` — same as today.

## Practice page changes

`/practice` already reads `practice:config`. Update its question generation so when `format === "mini-flk"`, it filters the syllabus pool by `paper` before sampling. No UI change needed beyond the header showing "Mini FLK1" / "Mini FLK2".

## Files to touch

- `src/routes/mocks.tsx` — replace the single "Timed Mini Mock" entry with two entries (Mini FLK1, Mini FLK2). Wire their `onClick` to open `PracticeLauncherDialog` with a new prop `preset={{ type: "mini-flk", paper: "FLK1" | "FLK2" }}`.
- `src/components/practice-launcher-dialog.tsx` — accept optional `preset` prop. When present on open, jump straight to step 3 with the values prefilled and the `paper` carried through into the `practice:config`. Add `mini-flk` to the `PracticeType` union with its own icon (Scale) and skill focus (`["Pacing", "Breadth", "Application"]`).
- `src/routes/practice.tsx` — when `config.format === "mini-flk"`, filter the syllabus pool by `config.paper` before building the question set; show the paper label in the header.

## Out of scope

- Full 180-question mock (kept as Coming Soon).
- Per-subject FLK breakdowns or separate FLK landing pages.
- Saving FLK results as a distinct entity — they flow through the existing practice/session storage.
