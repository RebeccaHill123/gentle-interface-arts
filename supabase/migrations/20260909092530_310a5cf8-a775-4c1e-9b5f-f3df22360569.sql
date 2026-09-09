ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sqe_assessment text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_sqe_assessment_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_sqe_assessment_check
  CHECK (sqe_assessment IS NULL OR sqe_assessment IN ('FLK1','FLK2','BOTH'));