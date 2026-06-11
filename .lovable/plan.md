# Landing Page — Editorial Polish Pass

A pure visual/UX refinement of `src/routes/index.tsx`. No routing, no product, no copy structure changes beyond the small tweaks called out below. Brand tokens in `src/styles.css` stay intact; only the heading letter-spacing/weight defaults and the display font may be tightened.

## Typography & global feel

- Swap the display font to a more editorial sans (Geist or General Sans via Fontsource — Geist is already permissively licensed and fits the legal/SaaS register). Body stays Inter. Wired through `--font-display` in `src/styles.css` only — no per-component font classes.
- Soften default heading weight to 400 with tighter `-0.025em` tracking so the headlines read editorial, not startup.
- Slightly cool the `--background` warmth (less pink tint) for a calmer canvas. Gradient blobs unchanged so brand identity holds.

## Header / nav

- Drop the pill background on "Sign in" and "Get started"; use a quiet text link for Sign in and a single refined gradient CTA for Get started (smaller height, subtler shadow, smoother hover via `transition` + slight `brightness`).
- Nav links: lighter weight, smaller tracking, more breathing room. Remove hover color jump in favor of a subtle underline-from-left.
- Add a faint bottom hairline only after scroll (CSS sticky + `backdrop-blur` already present, just refine border).

## Hero

- Headline: drop from `3.6rem` → `3rem` on desktop, tighten `leading-[1.05]`, weight 300. Keep copy verbatim ("The performance platform for SQE candidates.").
- Make the gradient on "SQE candidates" more restrained: lower-saturation gradient (pink → violet only, no blue), remove italics, keep the inline-block.
- Subtitle: replace with the user's line — "Adaptive study plans, performance analytics and AI coaching — built for the demands of qualification." Slightly larger leading, max-width tightened to ~30rem.
- Spacing rhythm: eyebrow → 28px → headline → 24px → subtitle → 36px → CTA row. Currently inconsistent.
- CTA button: refine to a smoother gradient (use `--gradient-pink-blue` but with a subtle inset highlight + softer `shadow-glow`), height 52px desktop / 48px mobile, weight 500, no uppercase tracking on the label.
- Trust micro-line ("Free in early access · 30-second setup"): demote to a single muted line, no icons, smaller tracking.

## Phone mockup

- Sleeker frame: thinner bezel (`p-1.5`), deeper radius (`rounded-[2.75rem]`), realistic Dynamic-Island-style pill notch (narrower, centered, slight inset shadow).
- Replace the harsh pink drop shadow with a soft neutral shadow + a faint colored glow underneath only.
- Reduce internal padding so the dashboard panel breathes.
- Floating chips: smaller, lighter border, no gradient icon backgrounds — just a tinted dot + label. Repositioned for better balance against the phone.

## Dashboard preview (inside phone + showcase tabs)

- Cleaner cards: increase corner radius consistency, softer 1px borders at 60% opacity, replace heavy `shadow-glow` accents with `shadow-card`.
- More realistic study analytics: weekly bar chart with subtle gridline, "Today's plan" list with checkbox affordance, a single accent metric instead of multiple competing gradients.
- Reduce color count per panel to 2 (foreground + one accent). Currently every chip is gradient-filled.

## Social proof / trust strip

- Replace the bulky 4-pill grid with a single horizontal trust strip: small mono-line icons + label, separated by hairline dividers, all in muted foreground. Removes the gradient icon tiles entirely.
- Mobile: wraps to 2x2 with the same hairline treatment, no card background.

## Features section

- Tab strip: ghost buttons with underline-active state instead of filled pills.
- Section eyebrow: regular weight, looser tracking, no gradient text (eyebrows currently fight the headline gradient).
- Section heading style matches hero (light weight, tighter tracking, restrained gradient on the emphasis word).

## How it works

- Step cards: lighter borders, no hover lift, replace giant ghost numerals with small `01 / 03` style indices in the corner. Icon tiles drop the gradient fill in favor of a tinted background + colored icon.

## Testimonial + pricing blocks

- Reduce internal padding on desktop, drop the gradient wash behind quote (keep only a very faint top glow).
- Pricing card: remove the full gradient background tint, keep only the eyebrow pill and CTA as accent surfaces.

## Footer

- Lighter divider, smaller type, single line on desktop. No change to content.

## Mobile sticky CTA

- Match new CTA styling (smoother gradient, 48px height, subtle shadow, no uppercase).

## Responsive sanity

- Verify in the preview at 390px and 1280px after changes. Hero stacks; trust strip wraps to 2x2; phone mockup centers and shrinks to `max-w-[300px]`.

## Technical scope

- Files touched:
  - `src/routes/index.tsx` — all component-level changes above.
  - `src/styles.css` — display font swap, heading defaults, small background tint adjustment, optional new `--gradient-pink-violet` token for restrained accents.
  - `package.json` — add `@fontsource/geist` (or chosen alternative) if we go the Fontsource route.
- Out of scope: routing, auth, copy beyond the subtitle, brand palette, any other route.
