# Make Topic Map row actions functional

Today the row-level button on each sub-topic in `/topics` renders the correct label ("Start topic" / "Start quiz" / "Revise" / "Add to plan") but has no `onClick`, so nothing happens. This plan wires it up using the "smart split by action" model and adds sub-topic filtering to both `/practice` and `/flashcards`.

## Action → destination mapping

Chosen by the existing `recommendedAction` on each `SubTopic`:

| Action | Shown label | Destination | Why |
| --- | --- | --- | --- |
| `start` | Start topic | `/flashcards?subject=…&subtopic=…` | Untouched → foundation first (matches `study-plan-logic` Foundation phase) |
| `quiz` | Start quiz | `/practice?subject=…&subtopic=…&length=10` | Weak / studied / not-enough-data → build genuine performance data |
| `revise` | Revise | `/practice?subject=…&subtopic=…&length=5&mode=revise` | Improving / strong / due-for-recall → short recall set |
| `add-to-plan` | Add to plan | Adds the sub-topic to today's plan (no navigation), then toasts "Added to today's plan" with a "View plan" link to `/dashboard` | High-yield untouched → surface in Command Centre without derailing them |

The subject-level row already expands the subject; no new action added there.

## Changes

### 1. `src/routes/practice.tsx` — accept sub-topic filter from URL
- Add `validateSearch` with `zodValidator` for `subject`, `subtopic`, `length`, `mode` (all optional, using `fallback`).
- Read via `Route.useSearch()`; when `subject`/`subtopic` present:
  - Prefill the launcher's subject/topic selection.
  - Filter the question pool to that sub-topic (fall back to subject-only if no tagged questions exist for the sub-topic, and show a small "Showing all {subject} questions — no {sub-topic} bank yet" note).
  - Show a dismissible chip: `Filtered to: {sub-topic}` with a clear (×) that navigates to `/practice` with cleared search.
- Respect `length` (default 10) and `mode=revise` (shorter set, marks the session type in the summary).

### 2. `src/routes/flashcards.tsx` — accept sub-topic filter from URL
- Same `validateSearch` shape (`subject`, `subtopic`).
- Filter the deck (`flashcards-data.ts` / `flashcards-data-ube.ts`) by matching `subject` and, when possible, the sub-topic name against card tags/topic string.
- If nothing matches on sub-topic, fall back to the subject deck with the same "no dedicated deck yet" note + filter chip.
- Keep existing progress tracking behaviour.

### 3. `src/routes/topics.tsx` — wire up `SubTopicRow`
- Replace the plain `<button>` with either a `<Link to="/practice" search={{...}}>` or `<Link to="/flashcards" search={{...}}>` depending on `sub.recommendedAction`, styled identically.
- For `recommendedAction === "add-to-plan"`:
  - Keep as a `<button>` with an `onClick` that appends a task to today's plan via the existing `plan-store` helpers (foundation-first task template from `study-plan-logic` using the sub-topic name), then shows a toast (`sonner`) with a "View plan" action linking to `/dashboard`.
  - Once added, the row's action swaps to "In today's plan" (disabled) — derived from the plan on next render.
- Use TanStack `<Link to=... search={{ subject, subtopic }}>` (never string interpolation) and include `from={Route.fullPath}` where needed.

### 4. Small polish
- Update the "no activity yet" empty-state hint copy so it reads "Tap a sub-topic action below to start it in Practice or Flashcards" (only on the header of the topic map, once).
- Keep the button's hover accent as-is; add `aria-label` describing action + sub-topic name for screen readers.

## Non-goals (this pass)
- No new question or flashcard content is authored — filtering falls back gracefully when a sub-topic has no dedicated bank yet.
- Chapter-level and subject-level headers stay non-clickable (they already expand/collapse).
- No changes to the recommended-action logic in `topic-map.ts`.

## Validation
- Type-check with `tsgo` (search-param schemas + Link `to`/`search` are the main risk).
- Manually click through /topics for both SQE and UBE: each of the four action types navigates or adds to plan as described, filter chip renders, clearing it returns to unfiltered practice/flashcards.
- Verify a sub-topic with no dedicated question bank falls back to subject-level with the note visible.
