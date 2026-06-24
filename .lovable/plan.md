## Goal
Make the "This Week Focus" accordions on `/dashboard` fully accessible to keyboard and screen-reader users, with calmer expand/collapse motion. No data, routing, or business-logic changes.

## Scope
- `src/routes/dashboard.tsx` → `WeekFocusAccordion` only
- `src/components/ui/accordion.tsx` → shared trigger/content styling (used by other accordions too — changes will be purely additive a11y/motion polish, no API change)

## Changes

### 1. `WeekFocusAccordion` (dashboard.tsx)
- Wrap the `Accordion` in a labelled region: `role="region"` + `aria-label="This week focus by module"` on the outer container so SR users land in a named landmark.
- Give each `AccordionItem` a stable `id` (`week-focus-${slug(module)}`) so the trigger/content `aria-controls`/`aria-labelledby` pairing Radix generates is predictable.
- Add an `aria-label` to each `AccordionTrigger` that reads the full row in natural language, e.g. `"${module}, ${hours} hours, ${pct}% of week, ${rationaleLabel}. Expand to see focus subtopics and approach."` — currently SR users hear three disconnected fragments.
- Mark the small rationale pill and `Xh · Y%` meta as `aria-hidden="true"` (since the trigger label already conveys them) to avoid double announcements.
- Inside `AccordionContent`, replace the visual-only "Focus subtopics" caption with a real `<h4 className="sr-only">Focus subtopics</h4>` plus the existing visual caption marked `aria-hidden`, and render the subtopic chips as a `<ul role="list">` of `<li>` items instead of a flex of `<span>`s.
- The "Why this week", "Suggested approach", "Outcome" paragraphs become a `<dl>` with `<dt>`/`<dd>` pairs so SR users get labelled fields. Visual styling preserved via classes on `dt`/`dd`.

### 2. Shared accordion primitive (`accordion.tsx`)
- Replace the hover underline on `AccordionTrigger` with a proper focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md` so keyboard focus is clearly visible (the current `hover:underline` + `hover:no-underline` override in dashboard means there is no visible focus indicator).
- Add `aria-hidden="true"` to the decorative `ChevronDown`.
- Smooth motion: keep the existing `animate-accordion-down/up` keyframes but bump duration to `duration-300 ease-out` on the content wrapper, and respect `motion-reduce:transition-none motion-reduce:animate-none` on both the chevron rotation and the content animation so users with `prefers-reduced-motion` get an instant toggle.

### 3. Verification
- `bunx tsgo --noEmit` clean.
- Playwright check: tab through dashboard, screenshot focused trigger to confirm visible ring; press Enter/Space to expand; press ArrowDown to move between triggers (Radix built-in); confirm `aria-expanded` flips and content height animates.
- Run the project a11y skill mental checklist on the section (labels, focus, motion, semantics).

## Non-goals
- No copy rewrite of module/rationale text.
- No restructure of other dashboard sections.
- No change to the `Accordion` public API.