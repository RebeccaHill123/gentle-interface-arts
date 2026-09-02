# Release-Critical Integrity Audit — Findings and Smallest Safe Repairs

Baseline (measured this session): `bunx vitest run` → **202 tests passing / 9 files**; `tsgo --noEmit` → **clean**. Production build not run (plan/audit mode only).

Scope note: the recently repaired areas (provisioning/webhooks, full mocks, canonical study activity, AI entitlement on `/api/coach` + `generate-quiz`, Practice restore/completion) were re-checked and confirmed sound. The Stripe checkout/webhook pipeline in particular verifies `error` and matched-row results on every write and is idempotent on Stripe retries — no money-related defect found.

**4 confirmed defects, 1 risk cluster.** Ranked by severity.

---

## 1. CONFIRMED — Paid plan generation is gated only in the browser

- Where: `supabase/functions/generate-plan/index.ts` → `Deno.serve` handler (lines ~490-497); client gate at `src/routes/onboarding.tsx:524-556`.
- Path: `onboarding.tsx` reads `profiles.is_pro / grandfathered_pro / subscription_status`, computes `hasAccess`, and only then calls `supabase.functions.invoke("generate-plan")`. The function itself checks only that a non-empty `Bearer` header is present — there is no `profiles` lookup and no `is_pro` / `subscription_status` check anywhere in the file. Any authenticated, non-paying user (free account, expired subscription, cancelled) can invoke it directly and receive a complete paid-tier personalised plan plus the model spend it costs.
- Contrast: `/api/coach` (`src/routes/api/coach.ts:163-231`) and `generate-quiz` already call the shared entitlement resolver. `generate-plan` was missed by that pass.
- Confirmed defect (verified by reading the handler), not a risk.

Smallest safe repair: in the `generate-plan` handler, after the bearer check, verify the caller's identity and entitlement server-side (same shape as `generate-quiz`): resolve the user from the JWT, read the entitlement row, and return 403 `{ error: "subscription_required" }` when not entitled. One exception: pre-payment plan previews must keep working — if onboarding legitimately generates a plan before checkout, allow that path only through the existing server-side pending-plan token (validated as `pending`, not `claimed`), never through an unentitled user session.

Regression tests: entitled user → 200; authenticated-but-unentitled user → 403 and **no provider call**; missing/garbage bearer → 401; valid pending-plan token pre-payment → 200; already-`claimed` token → 403.

---

## 2. CONFIRMED — Plan changes can be silently reverted after a "success" toast

- Where: `src/lib/plan/store.ts` → `mutate()` (line 213-224) and `persistSchedule()` (193-210); `src/lib/plan-store.ts` → `savePlan()` (228-233) and `pullPlanFromCloudResult()` (286-318); call sites `src/routes/plan.tsx:54-59`, `src/routes/focus.index.tsx:28-37`, `src/routes/settings.tsx:59-79`.
- Path: every schedule mutation (complete, skip, reschedule, reopen, plan settings) writes `localStorage` then fires `void persistSchedule(next).catch(e => console.warn(...))`. The cloud write failure is only logged — no queue, no retry, no user signal — while the UI has already shown "Session moved." / "Plan updated". On the next mount of `/plan` or `/focus`, `pullPlanFromCloudResult()` unconditionally does `localStorage.setItem(KEY, JSON.stringify(plan))` with whatever the cloud holds. The unsynced local mutation is overwritten and the user's action disappears with no error ever shown. This is the "reload/navigation loses submitted work + success shown before acceptance" class, and it applies to completions, which also feeds plan progress.
- Confirmed defect: both halves (unqueued fire-and-forget write, unconditional overwrite on read) were read directly.

Smallest safe repair, two parts, no redesign:
1. Persist a monotonic local revision/`updatedAt` on the stored plan. In `pullPlanFromCloudResult`, only overwrite local when the cloud copy is not older than the local copy (or when local has no pending-sync marker); otherwise keep local and re-push.
2. Reuse the existing durable pattern from `src/lib/study-log.ts`: mark the plan `dirty` before the cloud write, clear it only after a verified write, retry the flush on next load/visibility, and surface a persistent "Changes not yet saved" indicator instead of a silent `console.warn`.

Regression tests: mutation with cloud write failing → local retains change, dirty flag set, no false "saved" claim; next load with a stale cloud plan → local change preserved and re-pushed; successful flush clears dirty; genuinely-empty cloud (new device) still clears stale local cache as today.

---

## 3. CONFIRMED — "Logged N minutes" is shown even when nothing was saved anywhere

- Where: `src/routes/dashboard.tsx` → `RecordSessionDialog.handleSubmit` (lines 1855-1877).
- Path: `void recordStudyActivity({...})` is fired without awaiting, then `toast.success("Logged N minutes")`, `setOpen(false)` and `onSessionLogged()` run unconditionally. `recordStudyActivity` (`src/lib/study-log.ts:389-476`) explicitly returns `{ ok:false, queued:false, error: "We couldn't save this to your account or this device. Try again." }` after rolling back its local mirror when both the Supabase write and the offline queue fail. That message can never reach the user, and the dashboard refreshes as if a session existed.
- Correct sibling pattern already in the same file: `handleRescheduleConfirmed` (497-507) awaits and branches on `res.ok`.
- Confirmed defect (code re-read and quoted verbatim).

Smallest safe repair: make `handleSubmit` async, await the result, keep the dialog open and show `toast.error(res.error)` when `!res.ok`; show a "Saved offline — will sync" message when `ok && queued`; only then close, reset and call `onSessionLogged()`. Add an in-flight ref lock so a double submit cannot fire two writes with different `Date.now()` idempotency keys.

Regression tests: write fails hard → error toast, dialog stays open, `onSessionLogged` not called; queued write → offline message; success → success toast and refresh; two rapid submits → exactly one `recordStudyActivity` call.

---

## 4. CONFIRMED — Skipping a session claims success on failure

- Where: `src/routes/plan.tsx` → `handleSkip` (lines 90-98).
- Path: `skipScheduledTask(id, reason)` resolves `{ ok, reason }` and returns `ok:false` (e.g. `"No schedule yet."` from `plan/store.ts:218`) without mutating anything. `handleSkip` ignores the result and always shows "Skipped — Tentra will factor that into your next update.", so the user believes the plan adapted when it did not. The adjacent `handleMove` (100-112) handles this correctly.
- Confirmed defect.

Smallest safe repair: mirror `handleMove` — `if (!res.ok) { toast.error(res.reason ?? "Couldn't skip that session."); return; }`.

Regression test: `skipScheduledTask` resolving `ok:false` → error toast, no success toast, no `setTick`.

---

## 5. RISK (not confirmed) — Entitlement/summary reads swallow errors, and one optimistic UI path never reconciles

- `src/lib/pro.functions.ts` → `getSubscriptionSummary` (189-195) and `createBillingPortalSession` (153-157) destructure `{ data }` without checking `error`. A transient database error resolves to `hasAccess: false` / "No billing account on file", i.e. a paying customer can be told they have no subscription. Fails closed, so not a bypass, but it is a plausible "paid user locked out" support incident. `src/lib/pending-plans.functions.ts:76-81` has the same shape, turning a transient error into "plan not found".
- `src/routes/dashboard.tsx` → `handleQuizComplete` (419-457) marks the task complete and bumps `setTick` synchronously, then fires `void recordStudyActivity(...)`. If the write hits the rollback branch, no later re-render is tied to that promise, so the dashboard can display a completed task no store holds. Sibling `voidStudyActivity(...).then(() => setTick(...))` does this correctly.

Smallest safe repair: check `error` on those three reads and distinguish "unavailable" from "not entitled" / "not found" (return an explicit unavailable state that the UI shows as a retry, matching how `api/coach.ts` returns 503); in `handleQuizComplete`, attach `.then(res => { if (!res.ok) toast.error(res.error); setTick(t => t + 1); })`.

Regression tests: entitlement read error → unavailable state, never `hasAccess:false`; quiz write failure → error surfaced and UI re-rendered from the rolled-back store.

---

## Explicitly checked and found sound

- Stripe checkout/webhook: no double-charge path (`fetchClientSecret` runs once per mount, not per click); all provisioning writes check `error` and `.select()` row counts and throw `ProvisioningError` so Stripe retries; `claimPendingPlan` re-verifies real profile/plan state before treating a redelivery as a no-op.
- Analytics/dashboard statistics: canonical reads filter `.is("voided_at", null)`, upserts dedupe on `(user_id, idempotency_key)`, full-mock rows are excluded from the `graded_attempts` unification to avoid double counting, and legacy plan-blob sessions are used only as a flagged fallback when canonical events are empty — no synthetic/duplicate corruption found.
- Destructive actions: `settings.tsx handleReplan` deletes `user_plans` scoped to `.eq("user_id", user.id)` with the `error` checked; `voidStudyActivity` is likewise user-scoped.
- Focus sprint logging: `loggedAt` + `loggingRef` guard plus stable idempotency key — no double-record.
- Navigation: every `<Link to=...>` in the audited routes resolves to a real route file; the "coming soon" panels (community, SQE2 tile) are non-interactive, not fake buttons.
