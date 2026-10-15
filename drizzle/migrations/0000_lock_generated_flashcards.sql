DROP POLICY IF EXISTS "Anyone can read generated flashcards" ON public.generated_flashcards;
DROP POLICY IF EXISTS "Anyone can read deck status" ON public.generated_deck_status;
REVOKE ALL ON public.generated_flashcards FROM anon, authenticated;
REVOKE ALL ON public.generated_deck_status FROM anon, authenticated;
GRANT ALL ON public.generated_flashcards TO service_role;
GRANT ALL ON public.generated_deck_status TO service_role;