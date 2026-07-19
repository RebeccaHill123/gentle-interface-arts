-- Lock down pending_plans to service_role only.
-- All access is via supabaseAdmin in server functions/webhook; the anon and
-- authenticated roles must never touch this table (contains emails, Stripe
-- IDs, magic-link hashes).

REVOKE ALL ON public.pending_plans FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.pending_plans TO service_role;

-- Explicit deny policies so that if a GRANT is ever mistakenly added,
-- RLS still blocks client access. service_role bypasses RLS.
DROP POLICY IF EXISTS "Deny all client access to pending_plans" ON public.pending_plans;
CREATE POLICY "Deny all client access to pending_plans"
  ON public.pending_plans
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);