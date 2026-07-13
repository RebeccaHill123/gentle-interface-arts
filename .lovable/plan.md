## Plan

Change the journey to this order:

```text
Landing “Get started”
→ Build plan onboarding
→ Plan preview
→ Create account / sign in
→ Choose plan + payment
→ Dashboard / saved plan
```

### What I’ll change

1. **Landing page CTAs**
   - Point “Get started” to `/onboarding` instead of `/subscribe`.
   - Keep signed-in users going to dashboard as they do now.

2. **After plan preview**
   - Keep the existing “Create account to save my plan” step.
   - Send users to auth with a return path that continues to payment after signup/signin.

3. **After email signup / signin / verification**
   - If the user came from onboarding and has a local preview plan, save that plan to their account.
   - Then route them to `/subscribe`, not straight to dashboard/onboarding.

4. **Payment completion**
   - After successful payment/access, route them to dashboard if their plan was saved, otherwise onboarding as fallback.

5. **Copy cleanup**
   - Update any misleading text like “Unlocks with a free account” so it reflects the paid flow.

### Files likely affected

- `src/routes/index.tsx`
- `src/routes/plan-preview.tsx`
- `src/routes/auth.tsx`
- `src/routes/auth_.callback.tsx`
- `src/routes/subscribe.tsx`

### Validation

I’ll verify the core browser flow: clicking “Get started” lands on onboarding, completing preview sends to auth, and auth continues to subscription/payment.