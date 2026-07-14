// Per-subject/topic accuracy from real completed mock answers.
// Nothing here is inferred from time spent — only from graded answers.
import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";
import { getBlueprint, type Pathway } from "@/lib/full-mock-blueprints";
import { generateQuestionsForSection } from "@/lib/full-mock-questions";

export interface TopicAccuracy {
  topic: string;
  attempted: number;
  correct: number;
  accuracy: number; // 0..100
}

export interface MockPerformance {
  hasData: boolean;
  totalAttempted: number;
  totalCorrect: number;
  perTopic: TopicAccuracy[]; // sorted, worst first
}

const EMPTY: MockPerformance = {
  hasData: false,
  totalAttempted: 0,
  totalCorrect: 0,
  perTopic: [],
};

/**
 * Loads every graded MCQ answer the current user has for their pathway
 * and buckets them by question topic (as defined in the bank).
 * Essays and MPTs are excluded because they aren't auto-graded.
 */
export async function loadMockPerformance(pathway?: Pathway): Promise<MockPerformance> {
  const user = await waitForAuthUser();
  if (!user) return EMPTY;

  const { data: sims } = await supabase
    .from("mock_simulations")
    .select("id,pathway")
    .eq("user_id", user.id);
  if (!sims || sims.length === 0) return EMPTY;

  const relevant = pathway ? sims.filter((s) => s.pathway === pathway) : sims;
  if (relevant.length === 0) return EMPTY;
  const simIds = relevant.map((s) => s.id);
  const simPathway = new Map<string, Pathway>(
    relevant.map((s) => [s.id, s.pathway as Pathway]),
  );

  const { data: sections } = await supabase
    .from("mock_sections")
    .select("id,simulation_id,section_type")
    .in("simulation_id", simIds);
  if (!sections || sections.length === 0) return EMPTY;

  const { data: answers } = await supabase
    .from("mock_answers")
    .select("section_id,question_id,is_correct")
    .in("simulation_id", simIds)
    .not("is_correct", "is", null);
  if (!answers || answers.length === 0) return EMPTY;

  // Build id -> topic map by regenerating each involved section's questions.
  const topicByQid = new Map<string, string>();
  for (const sec of sections) {
    const p = simPathway.get(sec.simulation_id);
    if (!p) continue;
    const bp = getBlueprint(p);
    const blueprint = bp.sections.find((s) => s.id === sec.section_type);
    if (!blueprint) continue;
    const gen = generateQuestionsForSection(p, blueprint);
    for (const q of gen.mcq ?? []) topicByQid.set(`${sec.id}:${q.id}`, q.topic);
    for (const q of gen.essay ?? []) topicByQid.set(`${sec.id}:${q.id}`, q.topic);
    for (const q of gen.mpt ?? []) topicByQid.set(`${sec.id}:${q.id}`, q.topic);
  }

  const perTopic = new Map<string, { attempted: number; correct: number }>();
  let totalA = 0;
  let totalC = 0;
  for (const a of answers) {
    const topic = topicByQid.get(`${a.section_id}:${a.question_id}`);
    if (!topic) continue;
    const cur = perTopic.get(topic) ?? { attempted: 0, correct: 0 };
    cur.attempted += 1;
    if (a.is_correct) cur.correct += 1;
    perTopic.set(topic, cur);
    totalA += 1;
    if (a.is_correct) totalC += 1;
  }

  const rows: TopicAccuracy[] = [...perTopic.entries()]
    .map(([topic, v]) => ({
      topic,
      attempted: v.attempted,
      correct: v.correct,
      accuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  return {
    hasData: totalA > 0,
    totalAttempted: totalA,
    totalCorrect: totalC,
    perTopic: rows,
  };
}
