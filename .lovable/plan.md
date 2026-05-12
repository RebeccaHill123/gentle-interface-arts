## Problem

On `/pro`, the headline reads:

> Welcome back to *Pro*.

The word "Pro" uses `italic` + `text-gradient-tentra` (which sets `background-clip: text` and a transparent fill). Italic glyphs slant past their normal bounding box on the right, and `background-clip: text` is rendered against that tighter box — so the right edge of the "o" gets sliced off. The trailing period sitting flush against it makes the clip more obvious.

## Fix

In `src/routes/pro.tsx` (line 359), wrap the gradient word so it has room to breathe:

- Add `inline-block` so it gets its own box.
- Add a touch of right padding (e.g. `pr-1`) so the italic overhang is inside the painted area.
- Keep the period outside the span so the spacing still looks right.

Resulting markup:

```tsx
Welcome back to{" "}
<span className="italic text-gradient-tentra inline-block pr-1">Pro</span>.
```

## Why not change the font/style

The italic + gradient combo is a deliberate brand treatment used elsewhere (landing page "smarter", "SQE syllabus"). Padding the inline-block keeps the look consistent and only fixes the clipping.

## Optional follow-up

The same pattern (`italic text-gradient-tentra` without `inline-block`/padding) exists in a few other places. If you want, I can sweep the codebase and apply the same fix anywhere the italic gradient text could clip — say the word and I'll include it.
