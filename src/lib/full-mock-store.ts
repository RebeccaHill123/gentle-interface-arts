// Supabase persistence for Full Mock Simulations.
import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  getBlueprint,
  type Pathway,
  type SimulationBlueprint,
} from "./full-mock-blueprints";

export type SimulationMode = "exam" | "practice";
export type SimulationStatus = "not_started" | "in_progress" | "completed";

export type DbSimulation = {
  id: string;
  user_id: string;
  pathway: Pathway;
  exam_type: string;
  mode: SimulationMode;
  status: SimulationStatus;
  started_at: string | null;
  completed_at: string | null;
  total_time_seconds: number;
  overall_score: number | null;
};

export type DbSection = {
  id: string;
  simulation_id: string;
  section_type: string;
  title: string;
  order_index: number;
  duration_seconds: number;
  started_at: string | null;
  completed_at: string | null;
  score: number | null;
  status: SimulationStatus;
};

export type DbAnswer = {
  id: string;
  simulation_id: string;
  section_id: string;
  question_id: string;
  answer_value: string | null;
  essay_text: string | null;
  is_flagged: boolean;
  time_spent_seconds: number;
  is_correct: boolean | null;
};

export async function createSimulation(
  pathway: Pathway,
  mode: SimulationMode,
  sectionIds?: string[],
): Promise<{ simulation: DbSimulation; sections: DbSection[] }> {
  const user = await waitForAuthUser();
  if (!user) throw new Error("Sign in to start a simulation.");

  const blueprint: SimulationBlueprint = getBlueprint(pathway);
  const sectionList = sectionIds
    ? blueprint.sections.filter((s) => sectionIds.includes(s.id))
    : blueprint.sections;

  const { data: sim, error: simErr } = await supabase
    .from("mock_simulations")
    .insert({
      user_id: user.id,
      pathway,
      exam_type: blueprint.examType,
      mode,
      status: "in_progress",
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (simErr || !sim) throw simErr ?? new Error("Could not create simulation");

  const sectionRows = sectionList.map((s, idx) => ({
    simulation_id: sim.id,
    user_id: user.id,
    section_type: s.id,
    title: s.title,
    order_index: idx,
    duration_seconds: s.durationSeconds,
    status: "not_started" as const,
  }));

  const { data: sectionsData, error: secErr } = await supabase
    .from("mock_sections")
    .insert(sectionRows)
    .select("*");
  if (secErr || !sectionsData) throw secErr ?? new Error("Could not create sections");

  return {
    simulation: sim as DbSimulation,
    sections: (sectionsData as DbSection[]).sort((a, b) => a.order_index - b.order_index),
  };
}

export async function loadSimulation(simId: string): Promise<{
  simulation: DbSimulation;
  sections: DbSection[];
  answers: DbAnswer[];
} | null> {
  const { data: sim } = await supabase
    .from("mock_simulations")
    .select("*")
    .eq("id", simId)
    .maybeSingle();
  if (!sim) return null;
  const { data: sections } = await supabase
    .from("mock_sections")
    .select("*")
    .eq("simulation_id", simId)
    .order("order_index", { ascending: true });
  const { data: answers } = await supabase
    .from("mock_answers")
    .select("*")
    .eq("simulation_id", simId);
  return {
    simulation: sim as DbSimulation,
    sections: (sections ?? []) as DbSection[],
    answers: (answers ?? []) as DbAnswer[],
  };
}

export async function listUserSimulations(): Promise<DbSimulation[]> {
  const user = await waitForAuthUser();
  if (!user) return [];
  const { data } = await supabase
    .from("mock_simulations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []) as DbSimulation[];
}

export async function upsertAnswer(input: {
  simulationId: string;
  sectionId: string;
  questionId: string;
  answerValue?: string | null;
  essayText?: string | null;
  isFlagged?: boolean;
  timeSpentSeconds?: number;
  isCorrect?: boolean | null;
}) {
  const user = await waitForAuthUser();
  if (!user) return;
  await supabase
    .from("mock_answers")
    .upsert(
      {
        simulation_id: input.simulationId,
        section_id: input.sectionId,
        user_id: user.id,
        question_id: input.questionId,
        answer_value: input.answerValue ?? null,
        essay_text: input.essayText ?? null,
        is_flagged: input.isFlagged ?? false,
        time_spent_seconds: input.timeSpentSeconds ?? 0,
        is_correct: input.isCorrect ?? null,
      },
      { onConflict: "section_id,question_id" },
    );
}

export async function startSection(sectionId: string) {
  await supabase
    .from("mock_sections")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", sectionId);
}

export async function completeSection(sectionId: string, score: number | null) {
  await supabase
    .from("mock_sections")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      score,
    })
    .eq("id", sectionId);
}

export async function completeSimulation(
  simId: string,
  overallScore: number | null,
  totalTimeSeconds: number,
) {
  await supabase
    .from("mock_simulations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      overall_score: overallScore,
      total_time_seconds: totalTimeSeconds,
    })
    .eq("id", simId);
}
