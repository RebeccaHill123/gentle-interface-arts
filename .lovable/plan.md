## Goal

Make `/pro` feel like a high-quality study analytics product (calm, intentional, premium) instead of a generic gradient-heavy SaaS landing page. Scope: layout, styling, copy, component structure only. No routing, auth, DB, or business logic changes.

## Scope

In scope:
- `src/routes/pro.tsx` — the upgrade view (`ProUpgrade`) and shared `ProBadge`. The `ProDashboard` (post-upgrade) gets a light pass for visual consistency only — no logic changes.
- `src/components/app-shell.tsx` — slim sidebar tweaks (width, logo size, nav density, active state, Pro upsell card refinement).
- `src/styles.css` — add a small set of tokens (off-white page surface, refined radius scale, subtle accent gradient, restrained shadow) so the new look is system-wide and not one-off.

Out of scope:
- Pro store, auth gating, plan logic, feature data.
- New fonts (current family stays; only weight/size/tracking are tuned).
- The post-upgrade `ProDashboard` content/widgets (visual polish only — same components, calmer surfaces).

## Design direction

- **Surface:** soft off-white page background (warm neutral, not pure white). Cards sit on near-white with hairline borders, almost no shadow.
- **Radius:** step down from `2xl/[2rem]` to `xl/lg` for a less bubbly feel.
- **Gradient discipline:** keep one Tentra accent gradient (pink → violet, slightly desaturated for editorial feel). Use it only on: primary CTA, the Pro badge, and small highlights (e.g. an underline accent on a number). Remove the giant blurred blobs in the hero and the full-bleed gradient panels.
- **Shadows:** extremely subtle (1–2px blur, low opacity), used sparingly on the hero card and primary CTA only.
- **Iconography:** drop the colorful gradient icon tiles on every feature card. Use a single muted icon treatment (foreground/60 on a faint tinted square) so cards read as data, not stickers.
- **Spacing:** consistent 8px scale (4 / 8 / 16 / 24 / 32 / 48). Tighten vertical rhythm across the page.

## Page structure (upgrade view)

```text
┌──────────────────────────────────────────────────────────────┐
│ Hero card  (compact, ~single screen-third)                  │
│  • Pro badge                                                │
│  • Headline:  "Study smarter with Tentra Pro"              │
│  • Sub:       Adaptive planning, weak-spot detection…       │
│  • Price row: small pill "Free · Early Access"  +  CTA      │
│    CTA: [Unlock Pro free →]                                 │
│    Sub-CTA text: "Included during Early Access."            │
└──────────────────────────────────────────────────────────────┘

┌─ What Pro unlocks ──────────────────────────────────────────┐
│ 4 equal-height cards (responsive 1 / 2 / 4):                │
│  • Smart re-planning                                        │
│  • Weak-spot detection                                      │
│  • Mock exam feedback                                       │
│  • Burnout alerts                                           │
│ Each: muted icon, title, one-line description.              │
└──────────────────────────────────────────────────────────────┘

──── subtle divider ────

┌─ Inside Pro  (feature checklist) ───────────────────────────┐
│ Two-column checklist grid of granular unlocks               │
│ (AI insights, mock score forecast, voice coach, peer        │
│  leaderboards, advanced analytics, study heatmaps, …).      │
│ Plain check marks, no icons-on-blobs.                       │
└──────────────────────────────────────────────────────────────┘

┌─ Glimpse inside (locked previews) ──────────────────────────┐
│ Keep existing 3 LockedCards but: smaller radius, hairline   │
│ border, lighter lock chip, no glow.                         │
└──────────────────────────────────────────────────────────────┘

┌─ Footer CTA strip (compact) ────────────────────────────────┐
│ One line + button, no oversized gradient panel.             │
└──────────────────────────────────────────────────────────────┘
```

Hero specifics:
- Replace the huge `Free` display number with a small pill: `Free · Early Access`.
- Headline: `text-3xl md:text-4xl` (down from 4xl/6xl), tighter tracking.
- Sub: ~15px, max-width ~58ch.
- CTA: pill button with the accent gradient + small secondary line "Included during Early Access." beneath. No giant blurred orbs — at most one very faint, far-off radial in the top-right at ~10% opacity.

## Copy changes

- Page meta title: `Tentra Pro · Smarter study for serious candidates`.
- Hero H1: `Study smarter with Tentra Pro`.
- Hero sub: `Adaptive planning, weak-spot detection, mock feedback and real-time study insights for serious exam candidates.`
- Primary CTA: `Unlock Pro free`. Sub-text: `Included during Early Access.`
- Top 4-card section heading: `What Pro unlocks`.
- Card copy (one line each):
  - Smart re-planning — "Your weekly plan re-tunes itself as you study."
  - Weak-spot detection — "We surface the three things to fix this week."
  - Mock exam feedback — "Predicted scores and per-topic guidance after every mock."
  - Burnout alerts — "Early warnings when your pace pushes into the red zone."
- Checklist section heading: `Inside Pro` with short intro line.
- Remove: "premium intelligence for ambitious students", "Train like the top 1%", "Ready to study like an athlete?", emoji from default insight strings in copy that's part of the marketing pitch (keep in dynamic insights).
- App-shell page subtitle changes from "Premium intelligence for ambitious students" to "Smarter study for serious candidates".

## Sidebar polish (`app-shell.tsx`)

- Slim the sidebar by ~8–12px.
- Reduce logo/avatar circle by ~4–6px; tighten brand row spacing.
- Nav items: smaller vertical padding, tighter gap; active state becomes a subtle filled pill in `--accent` with foreground text (replacing whatever gradient/glow currently fires).
- "Tentra Pro" upsell card: smaller, hairline border, single-line label + tiny CTA chevron; drop background gradient — use a faint tinted surface with one small gradient dot/star icon.

## Technical details

Tokens added/tuned in `src/styles.css` (token names are placeholders — final names follow existing convention):
- `--surface-page` — warm off-white (e.g. `oklch(0.985 0.005 80)`); used as new page background where the current `bg-background` would otherwise read pure.
- `--surface-card` — near-white card surface with very low chroma.
- `--border-hairline` — slightly lighter than current border for the calmer card look.
- `--radius-card` reduced (e.g. 14px) and applied to feature/checklist/locked cards.
- `--shadow-soft` — single tiny shadow used only on hero + CTA.
- `--gradient-accent` — the single intentional gradient (pink → violet, desaturated). Replaces ad-hoc uses of `bg-gradient-tentra` / `bg-gradient-pink-blue` on chrome.

`ProUpgrade` rewrite:
- Drop the two large `blur-3xl` orb divs.
- Replace `Free` display block with a `<span>` pill component.
- Reshape `features` array: trim to the four headline cards for the top grid; keep the longer list as the data source for the new `Inside Pro` checklist.
- Card markup unified: `rounded-[var(--radius-card)] border bg-[var(--surface-card)] p-5` with muted icon container `bg-muted text-foreground/70` (no gradient fill).
- Footer CTA: compact flex row instead of large padded panel.

`ProDashboard` light pass:
- Replace `rounded-2xl` → smaller radius token on the hero strip and inner cards.
- Remove the `blur-3xl` orb on the hero strip.
- Swap `text-gradient-tentra` uppercase section headings for plain `text-foreground` / `text-muted-foreground` headings to match the new editorial tone.
- No data, computation, or component logic touched.

`AppShell`:
- Update `title`/`subtitle` props where this page calls it.
- Adjust sidebar styling (Tailwind classes only) per Sidebar polish above.
- Upsell card markup simplified — same link target, same condition.

## Acceptance checks

- Desktop (≥1280) and mobile (≤420) screenshots of `/pro` show: compact hero (no big "Free"), 4 feature cards equal height, "Inside Pro" checklist, smaller locked preview cards, compact footer CTA.
- No `blur-3xl` orbs on `/pro`.
- Only one gradient style appears on the page (CTA + badge + tiny accent), no full-panel gradient backgrounds.
- Sidebar visibly slimmer, nav active state is a calm filled pill, upsell card is single-row minimal.
- `bunx tsgo --noEmit` passes.
- No changes to `getProStatus`, `upgradeToPro`, `cancelPro`, route guards, or any store.
