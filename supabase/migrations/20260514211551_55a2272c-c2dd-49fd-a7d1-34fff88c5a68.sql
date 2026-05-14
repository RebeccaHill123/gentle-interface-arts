
-- 1) Prevent client-side modification of is_pro / pro_since on profiles.
CREATE OR REPLACE FUNCTION public.prevent_pro_self_upgrade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
       OR NEW.pro_since IS DISTINCT FROM OLD.pro_since THEN
      RAISE EXCEPTION 'Pro status can only be changed by the server after payment verification';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_pro_self_upgrade_trg ON public.profiles;
CREATE TRIGGER prevent_pro_self_upgrade_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_pro_self_upgrade();

-- Also block client INSERTs from setting is_pro=true.
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_pro_on_insert_trg ON public.profiles;
CREATE TRIGGER prevent_pro_on_insert_trg
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_pro_on_insert();

-- 2) Lock down SECURITY DEFINER email queue helpers — service_role only.
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;

-- 3) Set fixed search_path on all SECURITY DEFINER and trigger functions.
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
