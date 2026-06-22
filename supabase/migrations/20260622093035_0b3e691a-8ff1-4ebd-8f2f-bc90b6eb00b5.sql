
-- mock_simulations
CREATE TABLE public.mock_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pathway TEXT NOT NULL CHECK (pathway IN ('UBE','SQE')),
  exam_type TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'practice' CHECK (mode IN ('exam','practice')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_time_seconds INTEGER NOT NULL DEFAULT 0,
  overall_score NUMERIC,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_simulations TO authenticated;
GRANT ALL ON public.mock_simulations TO service_role;
ALTER TABLE public.mock_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own simulations" ON public.mock_simulations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mock_simulations_updated_at BEFORE UPDATE ON public.mock_simulations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX mock_simulations_user_idx ON public.mock_simulations(user_id, created_at DESC);

-- mock_sections
CREATE TABLE public.mock_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES public.mock_simulations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score NUMERIC,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_sections TO authenticated;
GRANT ALL ON public.mock_sections TO service_role;
ALTER TABLE public.mock_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own sections" ON public.mock_sections
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mock_sections_updated_at BEFORE UPDATE ON public.mock_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX mock_sections_sim_idx ON public.mock_sections(simulation_id, order_index);

-- mock_answers
CREATE TABLE public.mock_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES public.mock_simulations(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.mock_sections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer_value TEXT,
  essay_text TEXT,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_answers TO authenticated;
GRANT ALL ON public.mock_answers TO service_role;
ALTER TABLE public.mock_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own answers" ON public.mock_answers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER mock_answers_updated_at BEFORE UPDATE ON public.mock_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX mock_answers_sim_idx ON public.mock_answers(simulation_id);
CREATE INDEX mock_answers_section_idx ON public.mock_answers(section_id);
