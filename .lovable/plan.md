## Diagnosis

samantha.harris2921@yahoo.com signed up on 16 June at 19:40 UTC and received 3 signup emails successfully (`email_send_log` confirms `status: sent` for all). She never confirmed. Auth logs for that date have rolled off, so we can't see the exact reason, but the fact that she resent the code twice within 3 minutes suggests codes weren't being accepted.

Most likely cause: when a user clicks "Resend", Supabase invalidates the previous code, so if she typed a code from an older email she'd get a generic "invalid OTP" error. Combined with Yahoo's aggressive spam filtering / link rewriting, the UX is brittle.

The flow itself is working — 12 of the last 15 signups confirmed successfully, including Yahoo / Hotmail / iCloud users. So this is a polish issue, not a broken flow.

## Improvements

### 1. Clearer messaging around resend (`src/routes/auth.tsx`)
Today: clicking "Resend" silently invalidates the previous code, but the UI only says "Code sent". 
Change: after a successful resend show "We sent a new code — older codes no longer work. Check your inbox for the latest one." This is the single most likely cause of samantha's drop-off.

### 2. More helpful error copy on invalid OTP (`src/routes/auth.tsx`)
Today: a wrong code surfaces Supabase's raw error string. 
Change: map common errors:
- `Token has expired or is invalid` → "That code didn't work. It may be from an older email — make sure you're using the most recent code we sent. You can resend below."
- `otp_expired` → keep existing copy.

### 3. Make the email link a reliable fallback (`src/lib/email-templates/signup.tsx`)
Today: link is buried at the bottom as "Opening this email on a different device?". Yahoo and some corporate filters strip or wrap the 6-digit code visually. 
Change: keep code as the headline but rename the fallback link to a clearer secondary CTA — "Or click here to verify instantly" — and make it a styled button rather than inline text. Link still routes through `/auth/callback`, which already handles `token_hash` + `type=signup` and creates the session in the same tab.

### 4. (Optional) Admin recovery path for stuck users
For users like samantha who are now stuck (account exists, unconfirmed, can't sign in), the current path is to sign up again with the same email — which works (`signUp` re-issues a code for unconfirmed users). Worth adding one line to the sign-in error state: if a user tries to sign in with an unconfirmed email, surface "This email isn't verified yet — [resend verification code]" instead of "Invalid login credentials".

## Files touched
- `src/routes/auth.tsx` — resend messaging, OTP error mapping, unconfirmed-on-signin handling
- `src/lib/email-templates/signup.tsx` — promote fallback link to a clearer secondary CTA

No backend or schema changes. No changes to the Google / OTP architecture — just polish to reduce the confusion that almost certainly tripped up samantha.

## What to tell samantha
She can simply sign up again with the same email and a code will be re-issued; her unconfirmed account will be reused (no duplicate). Or you can manually confirm her in the backend if you want to remove the friction entirely.