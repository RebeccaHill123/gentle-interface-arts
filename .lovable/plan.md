## Sprint 1 — Conversion, Onboarding, First-Use Value

A large, multi-file sprint. Plan first so we agree on scope before I touch ~3k lines.

### Exam scope (applies everywhere)

Supported exams only: **SQE1, SQE2, NY Bar, MPRE**. Remove "Other legal exam" and any "more exams coming soon" copy across landing, onboarding, dashboard, settings, and SEO meta. Plan generator gated to these four.

Mapping to existing `ExamPath` in `src/lib/exam-paths.ts`:
- SQE1 → `sqe1`
- SQE2 → `sqe2`
- NY Bar → `ube-ny` (existing UBE/NY content)
- MPRE → new `mpre` path with a focused topic list (Conflicts, Confidentiality, Competence, Client Funds, Fees, Litigation Conduct, Different Roles, Safekeeping, Judicial Conduct, Regulation of the Profession). Adds an `examType: "mpre"` and routing through existing plan generator using the same allocation logic but a shorter syllabus.

### 1. Landing page (`src/routes/index.tsx`)

- Primary CTA → **"Build my study plan"** → `/onboarding` (no auth gate).
- Secondary → **"Log in"** → `/auth`.
- One-line value prop: "An adaptive study planner for SQE, NY Bar and MPRE students that tells you exactly what to study each day."
- Five-bullet value list (personalised plan / track time / weak areas / AI-guided / daily consistency).
- Strip generic "legal exam" / coming-soon language. Update `head()` meta + JSON-LD to name the four exams.

### 2. Pre-signup onboarding (`src/routes/onboarding.tsx`)

Refactor existing onboarding into 6 lean steps, **no auth required** to walk through:

1. Exam — SQE1 / SQE2 / NY Bar / MPRE (radio cards).
2. Exam timing — exact date OR target month toggle.
3. Weekly availability — `<5`, `5–10`, `10–15`, `15–20`, `20+` hours.
4. Weak areas — checklist from the selected exam's syllabus.
5. Confidence — Low / Medium / High with subtitles.
6. Study style — Short sprints / Longer deep work / Mixed.

Mobile-first, 1 question per screen, progress bar, Back/Next. Persist answers to a new `pendingOnboarding` localStorage key (independent of the existing authenticated draft) so a signed-out user can complete the flow.

On finish → compute a `StudyPlan` locally via existing generator → route to `/plan-preview` without writing to Supabase.

### 3. Plan preview (new route `src/routes/plan-preview.tsx`)

Public route. Reads `pendingOnboarding` + generated plan from storage. Shows:

- Today's recommended session
- This week's focus areas
- Weekly study hours
- Weak-area priority chips
- Simple week-by-week timeline (read-only mini roadmap)
- Suggested first focus session card
- Primary CTA **"Create account to save my plan"** → `/auth?intent=save-plan`
- Secondary **"Edit my answers"** → `/onboarding`
- Locked-feature strip: saving / tracking / focus sessions / AI tutor / analytics / adaptive adjustments / history — each with a small lock icon and tooltip.
- Microcopy: "Create an account to save this plan and let Tentra adapt it as you study."

### 4. Sign-up persistence

`/auth` reads `pendingOnboarding` from localStorage. After successful sign-up + session, in the existing post-auth bootstrap (already in onboarding/dashboard load path) we hydrate the authenticated plan draft from `pendingOnboarding`, run `savePlanAndSync`, then clear the pending key. User lands directly on a personalised dashboard — onboarding flow is skipped if a plan exists.

### 5. Email confirmation UX (`src/routes/auth.tsx`)

Replace the current post-signup state with a dedicated confirmation panel:

- Headline: "Almost there — confirm your email to save and access your plan."
- Shows the email it was sent to.
- **Resend confirmation** button (rate-limited 30s, uses `supabase.auth.resend`).
- **Change email** link → resets the form.
- "Check your junk/spam folder" note.
- Support link (mailto).
- Inline states: sent / resent / invalid email / already confirmed / expired link (parsed from URL hash error params on `/auth_/callback`).

### 6. Dashboard first-use (`src/routes/dashboard.tsx`)

Already restructured around three questions in a recent pass. Light additions for first-use:

- If `plan.completedSessions === 0`, show a one-time welcome banner above `TodaysPlanCard` with the user's first name + exam, dismissible.
- Confirm section order: Today's Plan → Metrics → This Week Focus → Up Next → Mini roadmap. Move "Materials / Mocks / Analytics / Settings" deeper navigation (already in `AppShell` sidebar — no change needed). No structural rewrite.

### 7–8. Positioning & visual style

Keep current premium gradient + typography. Copy pass on landing, onboarding, preview, and auth screens to sound exam-specific (SQE/NY Bar/MPRE) and like a coach, not a generic SaaS.

### 9. Technical guardrails

- No Supabase schema changes. No auth flow rewiring. No changes to existing `profiles` / `is_pro` rules.
- Reuse `plan-store.ts` generator. Add `mpre` to `ExamPath` union + path → exam mapping + a small MPRE syllabus block in `sqe-syllabus.ts` (or sibling).
- Existing users with a saved plan are unaffected; pending-onboarding flow is opt-in via the landing CTA.
- Routes added: `/plan-preview`. Routes touched: `/`, `/onboarding`, `/auth`, `/dashboard`.

### 10. Out of scope (call out)

- Real adaptive re-planning engine (already present, untouched).
- Full SEO/landing redesign beyond CTA + value bullets.
- New analytics events (can follow in Sprint 2).
- Localisation.

### Technical notes

- New storage key: `tentra:pending-onboarding:v1` — `{ exam, examTiming: {kind:'date'|'month', value}, weeklyHours, weakAreas[], confidence, style }`.
- Plan generator call shape: map onboarding answers → existing `StudyPlan` builder inputs; reuse `getSubjectsForExamPath` for weak-area options and to gate MPRE.
- `/plan-preview` is fully client-rendered (no loader, no server fn) so it works signed-out without SSR auth issues.
- Email resend uses `supabase.auth.resend({ type: 'signup', email })`; change-email resets local state and clears stored `pendingEmail`.

### Verification

- `bunx tsgo --noEmit`
- Playwright run: landing → onboarding (all 4 exams selectable, no "other") → preview shows plan → auth screen → confirmation state with resend.
- Manual: returning signed-in user with existing plan still lands on dashboard with no regression.

Approve and I'll implement in one pass.