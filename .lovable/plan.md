## Update landing page for dual-exam positioning

Make the Tentra homepage welcoming to both SQE and NY UBE candidates while keeping the existing visual design unchanged.

### What changes

1. **Hero tagline** (`src/routes/index.tsx`)
   - From: "The performance platform for SQE candidates."
   - To: "The performance platform for future lawyers." (with a "Built for SQE & NY UBE" sub-tagline or similar)

2. **Trust strip**
   - "Built for SQE1 & SQE2" → "Built for SQE & NY UBE"
   - "For future solicitors" → "For future lawyers"

3. **How it works**
   - Step 1 body: "Anchor the plan to your SQE1 or SQE2 sitting." → inclusive wording covering both exams.

4. **Testimonial attribution**
   - "Built for the next generation of solicitors" → "Built for the next generation of lawyers"

5. **Footer**
   - "For the next generation of solicitors." → "For the next generation of lawyers."

6. **Meta & SEO** (`src/routes/index.tsx` + `src/routes/__root.tsx` + `public/llms.txt`)
   - Titles and descriptions should mention both SQE and NY UBE without losing SQE SEO juice.

### What does NOT change
- Visual design, layout, components, animations, gradient accents, phone mockup, pricing section, or CTAs.
- Only copy strings are edited.

### Files edited
- `src/routes/index.tsx`
- `src/routes/__root.tsx`
- `public/llms.txt`