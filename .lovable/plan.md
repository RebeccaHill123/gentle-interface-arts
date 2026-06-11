## Plan: Terms of Use & Privacy Policy

### What I'll build

1. **`/terms` route** (`src/routes/terms.tsx`)
   - Full Terms of Use content from your Word doc (18 sections, governing law England & Wales, last updated June 2026).
   - Styled with Tentra's premium look: BackgroundBlobs, hairline borders, soft gradients, refined typography (`prose`-style layout with numbered headings).
   - Includes `head()` metadata: title, description, canonical, og tags.
   - Back-to-home link in header.

2. **`/privacy` route** (`src/routes/privacy.tsx`)
   - Full Privacy Policy content from your Word doc (14 sections, UK GDPR, ICO reference).
   - Same premium styling as Terms page for visual consistency.
   - `head()` metadata for SEO.

3. **Landing page footer update** (`src/routes/index.tsx`)
   - Add "Terms" and "Privacy" links to the existing footer row, between the brand mark and the copyright.
   - Use `<Link>` from `@tanstack/react-router` (not `<a>`), styled to match existing muted footer text with hover state.

4. **Sitemap update** (`src/routes/sitemap[.]xml.ts`)
   - Add `/terms` and `/privacy` URLs so they're discoverable.

### Notes

- Content is used verbatim from your Word docs (no edits to legal wording).
- No backend, no auth — these are public static pages.
- Pages will be responsive on mobile and desktop.
- I won't add links to the auth or in-app shell footer in this pass (let me know if you want them there too).
