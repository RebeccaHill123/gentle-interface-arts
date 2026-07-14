CREATE TABLE public.generated_flashcards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_kind text NOT NULL CHECK (exam_kind IN ('SQE','UBE')),
  subject text NOT NULL,
  subtopic text NOT NULL,
  deck_id text NOT NULL,
  front text NOT NULL,
  back text NOT NULL,
  exam_tip text,
  difficulty text NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
  source text NOT NULL DEFAULT 'ai',
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_gen_flashcards_lookup ON public.generated_flashcards (exam_kind, subject, subtopic);
CREATE INDEX idx_gen_flashcards_deck ON public.generated_flashcards (deck_id);

GRANT SELECT ON public.generated_flashcards TO anon, authenticated;
GRANT ALL ON public.generated_flashcards TO service_role;

ALTER TABLE public.generated_flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read generated flashcards"
  ON public.generated_flashcards FOR SELECT
  USING (true);

CREATE TABLE public.generated_deck_status (
  exam_kind text NOT NULL CHECK (exam_kind IN ('SQE','UBE')),
  subject text NOT NULL,
  subtopic text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','ready','failed')),
  card_count integer NOT NULL DEFAULT 0,
  last_error text,
  model text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (exam_kind, subject, subtopic)
);

GRANT SELECT ON public.generated_deck_status TO anon, authenticated;
GRANT ALL ON public.generated_deck_status TO service_role;

ALTER TABLE public.generated_deck_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read deck status"
  ON public.generated_deck_status FOR SELECT
  USING (true);