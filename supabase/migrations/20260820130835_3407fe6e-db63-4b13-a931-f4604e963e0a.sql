CREATE TABLE public.plan_revisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  schedule_version integer NOT NULL,
  trigger text NOT NULL,
  summary text NOT NULL,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_id, schedule_version)
);

GRANT SELECT, INSERT ON public.plan_revisions TO authenticated;
GRANT ALL ON public.plan_revisions TO service_role;

ALTER TABLE public.plan_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan revisions"
  ON public.plan_revisions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plan revisions"
  ON public.plan_revisions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX plan_revisions_user_created_idx ON public.plan_revisions (user_id, created_at DESC);