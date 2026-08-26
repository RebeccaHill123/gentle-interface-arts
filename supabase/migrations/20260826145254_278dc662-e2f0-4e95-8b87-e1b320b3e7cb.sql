ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_start timestamptz,
  ADD COLUMN IF NOT EXISTS trial_end timestamptz,
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false;

-- Extend the server-only billing column protection to the new trial fields.
CREATE OR REPLACE FUNCTION public.prevent_pro_self_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
       OR NEW.pro_since IS DISTINCT FROM OLD.pro_since
       OR NEW.trial_start IS DISTINCT FROM OLD.trial_start
       OR NEW.trial_end IS DISTINCT FROM OLD.trial_end
       OR NEW.has_used_trial IS DISTINCT FROM OLD.has_used_trial THEN
      RAISE EXCEPTION 'Billing status can only be changed by the server after payment verification';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_pro_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    NEW.is_pro := false;
    NEW.pro_since := NULL;
    NEW.trial_start := NULL;
    NEW.trial_end := NULL;
    NEW.has_used_trial := false;
  END IF;
  RETURN NEW;
END;
$$;

-- Existing paying subscribers are marked as having consumed a trial only if
-- they actually had one; active non-trial subscribers keep has_used_trial
-- false but are protected from trials by the active-subscription check.
UPDATE public.profiles
SET has_used_trial = true
WHERE subscription_status = 'trialing';