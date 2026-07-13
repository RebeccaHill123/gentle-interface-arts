
-- Subscription columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grandfathered_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_key
  ON public.profiles(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_subscription_id_key
  ON public.profiles(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- Grandfather all existing Early Access Pro users (idempotent)
UPDATE public.profiles
  SET grandfathered_pro = true
  WHERE is_pro = true AND grandfathered_pro = false;

-- Extend the trigger to protect subscription fields from client writes
CREATE OR REPLACE FUNCTION public.prevent_pro_self_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
       OR NEW.pro_since IS DISTINCT FROM OLD.pro_since
       OR NEW.grandfathered_pro IS DISTINCT FROM OLD.grandfathered_pro
       OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
       OR NEW.stripe_price_id IS DISTINCT FROM OLD.stripe_price_id
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
       OR NEW.cancel_at_period_end IS DISTINCT FROM OLD.cancel_at_period_end THEN
      RAISE EXCEPTION 'Subscription status can only be changed by the server after payment verification';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_pro_self_upgrade_trg ON public.profiles;
CREATE TRIGGER prevent_pro_self_upgrade_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_pro_self_upgrade();

-- Also lock these fields at INSERT (extend existing insert trigger)
CREATE OR REPLACE FUNCTION public.prevent_pro_on_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    NEW.is_pro := false;
    NEW.pro_since := NULL;
    NEW.grandfathered_pro := false;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    NEW.stripe_price_id := NULL;
    NEW.subscription_status := NULL;
    NEW.current_period_end := NULL;
    NEW.cancel_at_period_end := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_pro_on_insert_trg ON public.profiles;
CREATE TRIGGER prevent_pro_on_insert_trg
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_pro_on_insert();
