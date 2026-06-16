## Goal

Make sign-up feel instant. Two problems with the current flow:
1. Email link opens a new tab (or worse, on a different device), so the user feels like they "signed in twice".
2. Even on the same device, the user lands on `/auth/callback` with a spinner instead of moving forward in context.

## Solution: dual track

**Primary:** Google sign-in — one click, no email, no password, no verification step.
**Email/password track:** Replace the magic link with a **6-digit verification code (OTP)**. User stays on the sign-up page and types the code from their email. Same tab, same device, no re-login.

The existing `/auth/callback` route stays in place as a fallback so any old verification links already in inboxes still work — but new sign-ups stop relying on it.

---

## Changes

### 1. Add Google sign-in (top of auth card)
- Run `supabase--configure_social_auth` with `providers: ["google"]` (keep email enabled).
- Add a "Continue with Google" button at the top of `src/routes/auth.tsx`, above the email form, with a thin "or" divider beneath it. Uses `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
- After successful Google sign-in: push any local onboarding plan to cloud, then go to `/dashboard` (or `/onboarding` if no plan yet) — mirrors current post-signup logic.

### 2. Switch email verification to 6-digit OTP
- In the sign-up handler in `src/routes/auth.tsx`, keep `supabase.auth.signUp(...)` (it already emails an OTP alongside the link with Supabase's default templates), but on success render an **inline OTP step** instead of the current "Check your inbox" copy.
- New inline UI in the same card:
  - Heading: "Enter the 6-digit code we sent to {email}"
  - Single 6-digit input (`InputOTP` from `src/components/ui/input-otp.tsx`).
  - On 6 digits entered → auto-submit: `supabase.auth.verifyOtp({ email, token, type: "signup" })`.
  - On success the session is set in the same tab → push local plan if any → navigate to `/dashboard` or `/onboarding`.
  - "Resend code" button (reuses existing `supabase.auth.resend({ type: "signup" })`) with 30s cooldown.
  - "Wrong email? Start over" link to reset state.
- Update the recovery email template wording in `src/lib/email-templates/signup.tsx` so the **6-digit code is the headline** and the link is secondary fallback text ("Or click here to verify from this device").

### 3. Apply the same OTP pattern to password reset
- `src/routes/forgot-password.tsx`: after submitting email, show OTP input → on verify, navigate straight to `/reset-password` with an active session (skip the link round-trip).
- `src/routes/reset-password.tsx` keeps its current link-handling logic as a fallback for emails already sent.

### 4. Keep `/auth/callback` working
No removals. Old emails in inboxes still complete via the link. New flows just don't depend on it.

---

## Files touched

- `src/routes/auth.tsx` — Google button, OTP step UI, verifyOtp wiring
- `src/routes/forgot-password.tsx` — OTP step
- `src/lib/email-templates/signup.tsx` — lead with code, demote link
- `src/lib/email-templates/recovery.tsx` — same treatment
- (no DB or server-function changes; Supabase already issues OTPs by default with signup emails)

## What the user sees

- **Google user:** Click "Continue with Google" → dashboard. Done.
- **Email user:** Fill form → "We sent a code to you@x.com" → type 6 digits → dashboard. Never leaves the tab.
- **Old emails in inbox:** Link still works via `/auth/callback`.
