## Problem

The Flashcards page currently only contains SQE content (FLK1 / FLK2 decks). For users on a UBE (US Bar / NY Bar) exam path, the cards on display are not examinable law for them — they need MBE / MEE / MPT content instead.

The rest of the app already branches on `plan.input.examType` / `isUbePath` (see `mocks.tsx`, `practice.tsx`, `dashboard.tsx`), but `flashcards.tsx` does not.

## Goal

When a user's selected exam path is UBE, the Flashcards page shows UBE decks (US law, MBE/MEE/MPT) instead of SQE decks. SQE users see the existing SQE decks unchanged.

## Changes

### 1. New data module: `src/lib/flashcards-data-ube.ts`

Mirror the shape of `flashcards-data.ts` but for UBE:

- New types `UbeArea = "MBE" | "MEE" | "MPT"` reusing the existing `Difficulty`, `Flashcard`, `Deck` shapes (extend `flk` field to accept a generic `area` string, or add a parallel `area` field — see Technical notes).
- `UBE_DECKS`: one deck per UBE_SYLLABUS subject (Civil Procedure, Constitutional Law, Contracts & Sales, Criminal Law & Procedure, Evidence, Real Property, Torts, Business Associations, Conflict of Laws, Family Law, Trusts & Estates, Secured Transactions, MPT) — 13 decks total, tagged by component (MBE/MEE/MPT).
- `UBE_CARDS`: 5–7 high-yield cards per deck, written as black-letter US rules with exam tips. Examples of the kind of cards (not exhaustive):
  - Civ Pro: SMJ thresholds, PJ Int'l Shoe test, Erie, claim/issue preclusion, Rule 12 timing.
  - Con Law: standing (injury/causation/redressability), levels of scrutiny, dormant Commerce Clause, free speech forum analysis.
  - Contracts: UCC vs common law triggers, mailbox rule, SOF categories, perfect tender, expectation damages.
  - Crim: common-law murder + felony murder, Miranda triggers, 4A warrant exceptions, accomplice liability.
  - Evidence: hearsay definition, 803/804 exceptions, character evidence rules, confrontation clause.
  - Real Property: RAP, recording acts (race / notice / race-notice), mortgages priority, easement creation.
  - Torts: negligence elements, products liability theories, defamation public/private figures, intentional torts.
  - BA: agency authority types, BJR, piercing the veil, derivative suits.
  - Conflict of Laws: vested rights vs Second Restatement, FF&C judgment recognition.
  - Family Law: equitable distribution vs community property, UCCJEA, child-support guidelines.
  - Trusts & Estates: will execution requirements, intestacy, anti-lapse, trustee duties.
  - Secured Transactions: attachment, perfection methods, PMSI super-priority.
  - MPT: objective memo vs persuasive brief structure, closed-library rule, fact analysis framework.

All cards are original, plain-English summaries of black-letter rules — no copying from bar-prep vendors.

### 2. Update `src/lib/flashcards-data.ts`

Add a small helper so the page can pull the right dataset:

```ts
export type ExamKind = "SQE" | "UBE";
export function getDecksFor(kind: ExamKind): Deck[]
export function getCardsFor(kind: ExamKind): Flashcard[]
export function getDeckFor(kind, id)
export function getCardsByDeckFor(kind, deckId)
```

Internally these route to either the SQE arrays already in this file or the new UBE arrays.

### 3. Update `src/routes/flashcards.tsx`

- Read the active exam path from `plan-store` (same pattern as `mocks.tsx`): compute `isUbe` from `isUbePath(plan.input.examPath)` with `plan.input.examType === "UBE"` as fallback.
- Replace direct imports of `DECKS`, `CARDS`, `getDeck`, `getCardsByDeck` with the `*For(kind)` helpers.
- Replace the FLK1 / FLK2 filter chips with MBE / MEE / MPT chips when `isUbe` is true. Keep Weak / Starred chips for both.
- Update the hero badge ("FLK1 · FLK2") and copy ("Build fast recall across high-yield SQE rules…") to UBE-equivalent strings ("MBE · MEE · MPT", "Build fast recall across high-yield UBE rules, doctrines and exam traps.") when `isUbe`.
- Update route `head()` title and description conditionally is not possible at module scope; instead, keep a generic title ("Flashcards — adaptive rule recall | Tentra") that works for both. SQE-specific OG copy is replaced with neutral copy mentioning both exams.

### 4. Per-card progress

Card IDs in the new UBE dataset are namespaced (`ube-<deck>-<slug>`) so they cannot collide with SQE card IDs in `localStorage`. No changes needed to `flashcards-progress.ts`.

## Out of scope

- Server-side storage of flashcard progress (still localStorage per existing code).
- Adaptive scheduling beyond what `buildQueue` already does.
- Vendor-style explanations or case citations beyond a one-line rule + tip.

## Technical notes

- The existing `Flashcard.flk: FlkArea` field is used in the UI to render a badge. The cleanest change is to widen the badge type to `string` (e.g. `area: string`) in the shared shape, or keep two parallel types and have `flashcards.tsx` render whichever field is present. Plan to add a generic `area: string` field on the `Flashcard`/`Deck` types and keep `flk` as a deprecated alias on SQE cards so no other code breaks.
- The page already gates on auth and uses `AppShell` — no routing changes needed.
- Card count target: ~70–90 UBE cards total in this first pass (matches the ~70 SQE cards already shipped).
