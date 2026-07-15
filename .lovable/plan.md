
## Goal

The landing page currently shows "Today's plan" as a simple checkbox to‑do list with `Task · 30 min`. The real dashboard (`CommandCentre` → `TodayPlanCard` in `src/components/dashboard/command-centre.tsx`) shows richer, more distinctive blocks. The landing preview should reflect that so new users see what they'll actually get.

## What the real card looks like (source of truth)

Each `TodayPlanCard` renders:
- A row of small pills: **priority** (`Must do` / `Weak spot` / `High yield`, color‑coded), **subject**, **duration** with `Timer` icon (e.g. `25m`), **format** (e.g. `Quiz`, `Flashcards`, `Revision`).
- A **title** line (medium weight).
- Optional italic muted **reason** line ("Accuracy dropped 12% this week", etc.).
- A circular **Play** button on the right that fills with the pink→blue gradient on hover.
- Rounded‑2xl card, border, `shadow-card`, subtle hover lift + pink border.

## Changes

Two places in `src/routes/index.tsx` currently render the checklist mock:

1. **`HeroPreviewCard`** (~lines 417–495) — the large edge‑to‑edge hero preview.
2. **Dashboard mini‑panel** (~lines 767–796) — the small "Today's plan" tile inside the multi‑panel product showcase.

For each, replace the checkbox `<ul>` with 3 realistic plan blocks styled like `TodayPlanCard`, scaled appropriately (full size in the hero, denser in the mini panel). Example content:

- `Must do` · Contract Law · 25m · Quiz — "Consideration & promissory estoppel" — *"Weakest topic — 54% accuracy last 20 Qs"* — Play
- `Weak spot` · Tort · 20m · Flashcards — "Negligence: duty of care" — *"Due for spaced review today"* — Play
- `High yield` · Criminal · 15m · Revision — "Actus reus vs mens rea" — *"High‑yield for SQE1 — not started"* — Play

Keep the header ("Today's plan", "2 of 4 complete", `84 days to exam` chip) and the AI recommendation strip below — those already work well and echo the real dashboard.

For the hero card, keep dimensions similar so page layout doesn't shift; the new cards are slightly taller, so drop from 4 items to 3 to preserve overall height.

For the small dashboard panel, use a compact variant (smaller pills, single‑line title, no reason line, tighter spacing) so it still fits its tile.

## Technical notes

- Purely presentational — no new components extracted, no data flow changes. Inline the markup in `index.tsx` to keep the landing self‑contained (matches how `HeroPreviewCard` is already written).
- Reuse existing tokens already used elsewhere on the page: `bg-pink/10 text-pink/90`, `bg-amber-500/10 text-amber-500/90`, `bg-violet-500/10 text-violet-400/90`, `bg-foreground/[0.04]`, `border-border/60`, `shadow-card`, `bg-gradient-pink-blue`.
- Icons: add `Timer` and `Play` from `lucide-react` to the existing import if not present.
- No changes to the real dashboard, routing, or data.
