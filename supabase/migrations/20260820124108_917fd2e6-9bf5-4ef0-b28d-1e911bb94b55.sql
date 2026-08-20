CREATE TABLE public.study_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  local_date DATE NOT NULL,
  timezone TEXT,
  exam_path TEXT,
  subject TEXT,
  subtopic TEXT,
  activity_type TEXT NOT NULL,
  planned_task_id TEXT,
  planned_minutes INTEGER,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL,
  self_focus NUMERIC,
  self_mood SMALLINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  voided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX study_events_user_idempotency_key ON public.study_events (user_id, idempotency_key);
CREATE INDEX study_events_user_local_date_idx ON public.study_events (user_id, local_date);
CREATE INDEX study_events_user_occurred_idx ON public.study_events (user_id, occurred_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_events TO authenticated;
GRANT ALL ON public.study_events TO service_role;
ALTER TABLE public.study_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own study events" ON public.study_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER study_events_updated_at BEFORE UPDATE ON public.study_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.graded_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  local_date DATE NOT NULL,
  timezone TEXT,
  exam_path TEXT,
  source_type TEXT NOT NULL,
  source_ref TEXT,
  study_event_id UUID REFERENCES public.study_events(id) ON DELETE SET NULL,
  question_fingerprint TEXT NOT NULL,
  subject TEXT,
  subtopic TEXT,
  is_correct BOOLEAN NOT NULL,
  selected_answer TEXT,
  duration_seconds INTEGER,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  voided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX graded_attempts_user_idempotency_key ON public.graded_attempts (user_id, idempotency_key);
CREATE INDEX graded_attempts_user_local_date_idx ON public.graded_attempts (user_id, local_date);
CREATE INDEX graded_attempts_user_subject_idx ON public.graded_attempts (user_id, subject);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.graded_attempts TO authenticated;
GRANT ALL ON public.graded_attempts TO service_role;
ALTER TABLE public.graded_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own graded attempts" ON public.graded_attempts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);