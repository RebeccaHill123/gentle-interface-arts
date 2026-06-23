# Why jasleenpawar@hotmail.co.uk isn't receiving the confirmation email

## Diagnosis (already verified)

All 7 confirmation emails for this address are logged as `status = sent` in `email_send_log` with no `error_message`. The address is **not** in `suppressed_emails`. That means:

- Our queue processed them.
- The email provider accepted them for delivery.
- Nothing on our side is broken or rate-limited.

The failure is **downstream delivery to Hotmail/Outlook**, which is a well-known issue:

1. Microsoft (hotmail.co.uk, outlook.com, live.com) runs very aggressive spam filtering and frequently routes auth confirmation emails to **Junk** or silently drops them, especially from newer sending domains.
2. Each "Resend" click creates a new email; Microsoft is more likely to throttle/drop subsequent ones from the same sender to the same recipient in a short window.
3. We get no bounce signal back, because Microsoft typically accepts the SMTP transaction then filters silently.

## What to tell this specific user

Ask them to:
- Check **Junk Email** and **Other** (Focused/Other inbox split) folders.
- Search inbox for the sender domain `tentraapp.com` (or whatever the configured sender domain is).
- Add the sender to safe senders / contacts and request **one** more confirmation.
- If still nothing, sign up with a non-Microsoft address (Gmail works reliably).

## Recommended product-side changes

1. **Add a "Having trouble?" helper** on the "Check your email" screen after signup that:
   - Tells users to check Junk/Spam.
   - Calls out Hotmail/Outlook specifically as known-problematic.
   - Suggests retrying with a different email if 2+ resends fail.
2. **Throttle the resend button** in the UI (e.g. 60s cooldown + max 3 resends per session) so users don't pile up 8 identical sends — each extra attempt makes Microsoft more likely to filter the next one.
3. **Optional follow-up**: monitor `email_send_log` for repeated sends to the same recipient with no subsequent sign-in event and surface it in the email dashboard as a "likely undelivered" signal.

## Code touch points (for implementation phase)

- Signup confirmation screen component (the one with the "Resend email" button) — add helper copy + cooldown state.
- Resend handler — enforce client-side cooldown and a max attempts counter (sessionStorage).
- No backend/migration changes required for the immediate fix.

## Not changing

- Email infrastructure, templates, sender domain, DNS — all working correctly per the logs.
- No need to switch providers; this is a Hotmail-specific deliverability quirk, not a Lovable Emails issue.
