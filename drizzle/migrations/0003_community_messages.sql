CREATE OR REPLACE FUNCTION public.my_community_exam()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.exam_type FROM community_members m JOIN profiles p ON p.user_id = m.user_id
  WHERE m.user_id = auth.uid() AND m.opted_in AND p.is_pro
$$;
REVOKE ALL ON FUNCTION public.my_community_exam() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_community_exam() TO authenticated;

CREATE TABLE public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX community_messages_exam_created_idx ON public.community_messages (exam_type, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.community_messages TO authenticated;
GRANT ALL ON public.community_messages TO service_role;
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cohort members read cohort messages" ON public.community_messages FOR SELECT TO authenticated
  USING (exam_type = public.my_community_exam());
CREATE POLICY "Members post to own cohort" ON public.community_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND exam_type = public.my_community_exam()
    AND display_name = (SELECT m.display_name FROM public.community_members m WHERE m.user_id = auth.uid()));
CREATE POLICY "Authors delete own messages" ON public.community_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;