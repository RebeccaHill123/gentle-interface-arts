Add a required Terms of Use tickbox to the sign-up form on the `/auth` page.

### What
- Insert a checkbox (using the project's existing `Checkbox` component) below the confirm-password field and above the submit button.
- Label text: "I agree to the Terms of Use" with "Terms of Use" hyperlinked to `/terms` (opens in the same tab).
- Enforce that the checkbox is checked before allowing account creation: update the Zod `signUpSchema` to require `agreeTerms: z.literal(true)` and show a validation error if unchecked.
- Keep styling consistent with the existing form — same text size, muted colour, and spacing.

### Files to change
- `src/routes/auth.tsx` — add state, schema rule, UI checkbox + label, and validation error display.

No other pages or components are affected.