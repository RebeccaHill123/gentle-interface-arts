# Fix "Unlock Pro free" error

## Root cause

Clicking "Unlock Pro free" calls the `activateEarlyAccessPro` server function. It fails with `Error: [object Response]` (visible in runtime errors) because the request reaches the server without an `Authorization` header, so `requireSupabaseAuth` rejects with a 401 `Response`.

Two problems:

1. **`attachSupabaseAuth` is not registered globally.** A search for `functionMiddleware` / `attachSupabaseAuth` finds only the attacher file itself — there is no `src/start.ts` calling `createStart({ functionMiddleware: [attachSupabaseAuth, ...] })`. Without it, no server function call from the browser carries the user's bearer token, so every `.middleware([requireSupabaseAuth])` fn 401s.
2. **`supabaseAdmin` is imported at module scope in `src/lib/pro.functions.ts`.** Server-function modules are part of the client module graph (only handler bodies are stripped). A top-level `import { supabaseAdmin } from "@/integrations/supabase/client.server"` can leak the service-role module into client chunks and break the build/runtime. It must be loaded inside the handler with `await import(...)`.

## Changes

### 1. Create `src/start.ts`
Register the existing `attachSupabaseAuth` (from `@/integrations/supabase/auth-attacher`) as a global `functionMiddleware`, keeping `errorMiddleware` on `requestMiddleware`. This is the canonical wiring required whenever any server fn uses `requireSupabaseAuth`.

### 2. Edit `src/lib/pro.functions.ts`
- Remove the top-level `import { supabaseAdmin } from "@/integrations/supabase/client.server"`.
- Inside `.handler()`, do `const { supabaseAdmin } = await import("@/integrations/supabase/client.server")` before the update.

No other files change. No DB or UI changes.

## Verification

- Sign in, click "Unlock Pro free": toast should show success and Pro becomes active (no "Couldn't activate Pro right now" error).
- Network tab: the `_serverFn/...activateEarlyAccessPro` POST returns 200 instead of 401.
