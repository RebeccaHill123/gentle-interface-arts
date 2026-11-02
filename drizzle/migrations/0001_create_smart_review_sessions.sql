CREATE TABLE public.smart_review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  exam_path TEXT,
  subject TEXT NOT NULL,
  subtopic TEXT,
  difficulty TEXT NOT NULL DEFAULT 'Mixed',
  question_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  answered_count INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC NOT NULL,
  questions JSONB NOT NULL,
  answers JSONB NOT NULL,
  flagged JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary TEXT,
  review_focus JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

GRANT SELECT, INSERT ON public.smart_review_sessions TO authenticated;
GRANT ALL ON public.smart_review_sessions TO service_role;

ALTER TABLE public.smart_review_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own smart review sessions"
  ON public.smart_review_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own smart review sessions"
  ON public.smart_review_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX smart_review_sessions_user_created_idx
  ON public.smart_review_sessions (user_id, created_at DESC);