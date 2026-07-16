
-- Pending plans table: stores generated study plans for anonymous visitors
-- before they pay. Rows are created BEFORE Stripe checkout, marked 'paid'
-- when the webhook fires, and 'claimed' once the Supabase Auth user is
-- provisioned and the plan attached. Expired rows are purged periodically.
-- IMPORTANT: this table's expiry job ONLY mutates pending_plans rows;
-- it never touches auth.users, profiles, user_plans, subscriptions or
-- Stripe records. There is no user-deletion workflow.

CREATE TABLE public.pending_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  plan_data jsonb NOT NULL,
  onboarding_data jsonb NOT NULL,
  email text,
  stripe_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'claimed' | 'expired'
  claimed_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  magic_link_hash text,
  magic_link_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days')
);

CREATE INDEX idx_pending_plans_token ON public.pending_plans(token);
CREATE INDEX idx_pending_plans_status ON public.pending_plans(status);
CREATE INDEX idx_pending_plans_expires_at ON public.pending_plans(expires_at);

-- No anon or authenticated grants: all access goes through service-role
-- server functions and the Stripe webhook. Anonymous visitors never read
-- their own pending row directly; the server fn returns only safe fields.
GRANT ALL ON public.pending_plans TO service_role;

ALTER TABLE public.pending_plans ENABLE ROW LEVEL SECURITY;

-- Deliberately no policies: nothing in anon/authenticated roles can read
-- or write this table. Service role bypasses RLS.

CREATE TRIGGER pending_plans_updated_at
  BEFORE UPDATE ON public.pending_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Cleanup function: SECURITY DEFINER so cron can invoke it without any
-- special role. It ONLY mutates the pending_plans table. It never calls
-- auth.admin.deleteUser, never touches profiles/user_plans/subscriptions.
CREATE OR REPLACE FUNCTION public.cleanup_expired_pending_plans()
RETURNS TABLE(expired_count bigint, deleted_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expired bigint;
  v_deleted bigint;
BEGIN
  -- Mark stale pending rows expired (safety net; abandoned pre-payment).
  UPDATE public.pending_plans
    SET status = 'expired'
    WHERE status = 'pending'
      AND expires_at < now();
  GET DIAGNOSTICS v_expired = ROW_COUNT;

  -- Delete very old expired/claimed rows to keep the table small.
  DELETE FROM public.pending_plans
    WHERE status IN ('expired', 'claimed')
      AND updated_at < now() - interval '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN QUERY SELECT v_expired, v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_pending_plans() FROM public;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_pending_plans() TO service_role;

-- Schedule daily cleanup at 03:15 UTC.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-pending-plans') THEN
    PERFORM cron.unschedule('cleanup-pending-plans');
  END IF;
  PERFORM cron.schedule(
    'cleanup-pending-plans',
    '15 3 * * *',
    $cron$ SELECT public.cleanup_expired_pending_plans(); $cron$
  );
END $$;
