CREATE TABLE public.community_members (
  user_id UUID PRIMARY KEY,
  exam_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  opted_in BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own membership" ON public.community_members FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER community_members_updated_at BEFORE UPDATE ON public.community_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.community_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_type TEXT NOT NULL,
  local_date DATE NOT NULL,
  topic TEXT NOT NULL CHECK (char_length(topic) BETWEEN 1 AND 80),
  note TEXT CHECK (note IS NULL OR char_length(note) <= 140),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date)
);
CREATE INDEX community_checkins_exam_date_idx ON public.community_checkins (exam_type, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_checkins TO authenticated;
GRANT ALL ON public.community_checkins TO service_role;
ALTER TABLE public.community_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage own checkins" ON public.community_checkins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Cohort leaderboard: only Pro, opted-in callers; only opted-in peers in the caller's exam cohort.
CREATE OR REPLACE FUNCTION public.get_community_leaderboard()
RETURNS TABLE(user_id UUID, display_name TEXT, week_minutes INTEGER, week_questions INTEGER, streak_days INTEGER, is_me BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE my_exam TEXT;
BEGIN
  SELECT m.exam_type INTO my_exam FROM community_members m
   JOIN profiles p ON p.user_id = m.user_id
   WHERE m.user_id = auth.uid() AND m.opted_in AND p.is_pro;
  IF my_exam IS NULL THEN RETURN; END IF;
  RETURN QUERY
  WITH members AS (
    SELECT m.user_id, m.display_name FROM community_members m
    JOIN profiles p ON p.user_id = m.user_id
    WHERE m.exam_type = my_exam AND m.opted_in AND p.is_pro
  ), wk AS (
    SELECT e.user_id, COALESCE(SUM(e.actual_minutes),0)::int AS mins FROM study_events e
    WHERE e.voided_at IS NULL AND e.local_date >= date_trunc('week', current_date)::date
      AND e.user_id IN (SELECT members.user_id FROM members) GROUP BY e.user_id
  ), q AS (
    SELECT g.user_id, COUNT(*)::int AS n FROM graded_attempts g
    WHERE g.voided_at IS NULL AND g.local_date >= date_trunc('week', current_date)::date
      AND g.user_id IN (SELECT members.user_id FROM members) GROUP BY g.user_id
  ), days AS (
    SELECT DISTINCT e.user_id, e.local_date FROM study_events e
    WHERE e.voided_at IS NULL AND e.actual_minutes > 0 AND e.local_date >= current_date - 120
      AND e.user_id IN (SELECT members.user_id FROM members)
  ), islands AS (
    SELECT d.user_id, MAX(d.local_date) AS last_day, COUNT(*)::int AS len
    FROM (SELECT days.*, days.local_date - (ROW_NUMBER() OVER (PARTITION BY days.user_id ORDER BY days.local_date))::int AS grp FROM days) d
    GROUP BY d.user_id, d.grp
  ), streaks AS (
    SELECT i.user_id, MAX(i.len) AS len FROM islands i WHERE i.last_day >= current_date - 1 GROUP BY i.user_id
  )
  SELECT mb.user_id, mb.display_name, COALESCE(wk.mins,0), COALESCE(q.n,0), COALESCE(s.len,0), mb.user_id = auth.uid()
  FROM members mb LEFT JOIN wk ON wk.user_id = mb.user_id LEFT JOIN q ON q.user_id = mb.user_id LEFT JOIN streaks s ON s.user_id = mb.user_id
  ORDER BY COALESCE(wk.mins,0) DESC, COALESCE(q.n,0) DESC
  LIMIT 50;
END $$;

CREATE OR REPLACE FUNCTION public.get_community_checkins()
RETURNS TABLE(id UUID, display_name TEXT, topic TEXT, note TEXT, created_at TIMESTAMPTZ, is_me BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE my_exam TEXT;
BEGIN
  SELECT m.exam_type INTO my_exam FROM community_members m
   JOIN profiles p ON p.user_id = m.user_id
   WHERE m.user_id = auth.uid() AND m.opted_in AND p.is_pro;
  IF my_exam IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT c.id, m.display_name, c.topic, c.note, c.created_at, c.user_id = auth.uid()
  FROM community_checkins c JOIN community_members m ON m.user_id = c.user_id
  WHERE c.exam_type = my_exam AND m.exam_type = my_exam AND m.opted_in
    AND c.created_at >= now() - interval '48 hours'
  ORDER BY c.created_at DESC LIMIT 40;
END $$;

REVOKE ALL ON FUNCTION public.get_community_leaderboard() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_checkins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_community_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_checkins() TO authenticated;