// Supabase persistence for Full Mock Simulations.
//
// Integrity rules enforced here:
// - every read and write surfaces its error (nothing is silently swallowed);
// - reads and writes are scoped to the authenticated owner;
// - startSection is idempotent and never moves an existing started_at;
// - actual elapsed time is persisted per section (never the planned duration).
import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  isTimerState,
  resolveSectionStartedAt,
  type TimerState,
} from "@/lib/mock-integrity";
import {
  getBlueprint,
  type Pathway,
  type SimulationBlueprint,
} from "./full-mock-blueprints";

export type SimulationMode = "exam" | "practice";
export type SimulationStatus = "not_started" | "in_progress" | "completed";

export type SectionMetadata = {
  timer?: TimerState;
  elapsedSeconds?: number;
  [key: string]: unknown;
};

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
  metadata?: Record<string, unknown> | null;
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
  metadata?: SectionMetadata | null;
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

export class MockStoreError extends Error {
  cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(
      cause && typeof cause === "object" && "message" in cause
        ? `${message}: ${(cause as { message: string }).message}`
        : message,
    );
    this.name = "MockStoreError";
    this.cause = cause;
  }
}

async function requireUser() {
  const user = await waitForAuthUser();
  if (!user) throw new MockStoreError("Sign in to continue your simulation.");
  return user;
}

export function sectionTimer(section: DbSection): TimerState | null {
  const timer = section.metadata?.timer;
  return isTimerState(timer) ? timer : null;
}

export function sectionElapsedSeconds(section: DbSection): number {
  const raw = section.metadata?.elapsedSeconds;
  return typeof raw === "number" && Number.isFinite(raw)
    ? Math.max(0, Math.round(raw))
    : 0;
}

export async function createSimulation(
  pathway: Pathway,
  mode: SimulationMode,
  sectionIds?: string[],
): Promise<{ simulation: DbSimulation; sections: DbSection[] }> {
  const user = await requireUser();

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
  if (simErr || !sim) {
    throw new MockStoreError("Could not create simulation", simErr);
  }

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
  if (secErr || !sectionsData) {
    throw new MockStoreError("Could not create sections", secErr);
  }

  return {
    simulation: sim as DbSimulation,
    sections: (sectionsData as DbSection[]).sort(
      (a, b) => a.order_index - b.order_index,
    ),
  };
}

export async function loadSimulation(simId: string): Promise<{
  simulation: DbSimulation;
  sections: DbSection[];
  answers: DbAnswer[];
} | null> {
  const user = await requireUser();
  const { data: sim, error: simErr } = await supabase
    .from("mock_simulations")
    .select("*")
    .eq("id", simId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (simErr) throw new MockStoreError("Could not load simulation", simErr);
  if (!sim) return null;

  const { data: sections, error: secErr } = await supabase
    .from("mock_sections")
    .select("*")
    .eq("simulation_id", simId)
    .eq("user_id", user.id)
    .order("order_index", { ascending: true });
  if (secErr) throw new MockStoreError("Could not load sections", secErr);

  const { data: answers, error: ansErr } = await supabase
    .from("mock_answers")
    .select("*")
    .eq("simulation_id", simId)
    .eq("user_id", user.id);
  if (ansErr) throw new MockStoreError("Could not load your answers", ansErr);

  return {
    simulation: sim as DbSimulation,
    sections: (sections ?? []) as DbSection[],
    answers: (answers ?? []) as DbAnswer[],
  };
}

export async function listUserSimulations(): Promise<DbSimulation[]> {
  const user = await waitForAuthUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("mock_simulations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new MockStoreError("Could not load your simulations", error);
  return (data ?? []) as DbSimulation[];
}

export type AnswerInput = {
  questionId: string;
  answerValue?: string | null;
  essayText?: string | null;
  isFlagged?: boolean;
  timeSpentSeconds?: number;
  isCorrect?: boolean | null;
};

function answerRow(
  userId: string,
  simulationId: string,
  sectionId: string,
  input: AnswerInput,
) {
  return {
    simulation_id: simulationId,
    section_id: sectionId,
    user_id: userId,
    question_id: input.questionId,
    answer_value: input.answerValue ?? null,
    essay_text: input.essayText ?? null,
    is_flagged: input.isFlagged ?? false,
    time_spent_seconds: Math.max(0, Math.round(input.timeSpentSeconds ?? 0)),
    is_correct: input.isCorrect ?? null,
  };
}

/** Single-answer autosave. Throws on failure so callers can keep local drafts. */
export async function upsertAnswer(input: {
  simulationId: string;
  sectionId: string;
} & AnswerInput): Promise<void> {
  const user = await requireUser();
  const { error } = await supabase
    .from("mock_answers")
    .upsert(answerRow(user.id, input.simulationId, input.sectionId, input), {
      onConflict: "section_id,question_id",
    });
  if (error) throw new MockStoreError("Could not save your answer", error);
}

/** Bulk upsert used by the submission path — one durable write for the section. */
export async function upsertAnswers(input: {
  simulationId: string;
  sectionId: string;
  answers: AnswerInput[];
}): Promise<void> {
  if (!input.answers.length) return;
  const user = await requireUser();
  const rows = input.answers.map((a) =>
    answerRow(user.id, input.simulationId, input.sectionId, a),
  );
  const { error } = await supabase
    .from("mock_answers")
    .upsert(rows, { onConflict: "section_id,question_id" });
  if (error) throw new MockStoreError("Could not save your section answers", error);
}

/**
 * Idempotent section start. Returns the authoritative timer state: the original
 * started_at is preserved, so resuming or refreshing never grants extra time.
 */
export async function startSection(
  sectionId: string,
  options?: { nowMs?: number },
): Promise<{ startedAt: string; timer: TimerState }> {
  const user = await requireUser();
  const nowMs = options?.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const { data: existing, error: readErr } = await supabase
    .from("mock_sections")
    .select("started_at, status, metadata")
    .eq("id", sectionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readErr) throw new MockStoreError("Could not open this section", readErr);
  if (!existing) throw new MockStoreError("Section not found");

  const startedAt = resolveSectionStartedAt(existing.started_at, nowIso);
  const storedMeta = (existing.metadata ?? {}) as SectionMetadata;
  const storedTimer = isTimerState(storedMeta.timer) ? storedMeta.timer : null;
  const timer: TimerState = storedTimer ?? {
    startedAtMs: Date.parse(startedAt),
    pausedAccumulatedMs: 0,
    pausedAtMs: null,
  };

  const { data: rows, error } = await supabase
    .from("mock_sections")
    .update({
      status: existing.status === "completed" ? existing.status : "in_progress",
      started_at: startedAt,
      metadata: { ...storedMeta, timer },
    })
    .eq("id", sectionId)
    .eq("user_id", user.id)
    .select("id");
  if (error) throw new MockStoreError("Could not open this section", error);
  if (!rows || rows.length === 0) {
    throw new MockStoreError("Could not open this section");
  }
  return { startedAt, timer };
}

/** Persist practice pause/resume + running elapsed so refresh cannot reset it. */
export async function saveSectionTiming(
  sectionId: string,
  timer: TimerState,
  elapsedSeconds: number,
): Promise<void> {
  const user = await requireUser();
  const { data: existing, error: readErr } = await supabase
    .from("mock_sections")
    .select("metadata")
    .eq("id", sectionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readErr) throw new MockStoreError("Could not save your timer", readErr);
  const meta = (existing?.metadata ?? {}) as SectionMetadata;
  const { error } = await supabase
    .from("mock_sections")
    .update({
      metadata: {
        ...meta,
        timer,
        elapsedSeconds: Math.max(0, Math.round(elapsedSeconds)),
      },
    })
    .eq("id", sectionId)
    .eq("user_id", user.id);
  if (error) throw new MockStoreError("Could not save your timer", error);
}

export async function completeSection(
  sectionId: string,
  score: number | null,
  elapsedSeconds: number,
  timer?: TimerState | null,
): Promise<void> {
  const user = await requireUser();
  const { data: existing, error: readErr } = await supabase
    .from("mock_sections")
    .select("metadata")
    .eq("id", sectionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (readErr) throw new MockStoreError("Could not submit this section", readErr);
  const meta = (existing?.metadata ?? {}) as SectionMetadata;

  const { data: rows, error } = await supabase
    .from("mock_sections")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      score,
      metadata: {
        ...meta,
        ...(timer ? { timer } : {}),
        elapsedSeconds: Math.max(0, Math.round(elapsedSeconds)),
      },
    })
    .eq("id", sectionId)
    .eq("user_id", user.id)
    .select("id");
  if (error) throw new MockStoreError("Could not submit this section", error);
  if (!rows || rows.length === 0) {
    throw new MockStoreError("Could not submit this section");
  }
}

export async function completeSimulation(
  simId: string,
  overallScore: number | null,
  totalTimeSeconds: number,
): Promise<void> {
  const user = await requireUser();
  const { data: rows, error } = await supabase
    .from("mock_simulations")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      overall_score: overallScore,
      total_time_seconds: Math.max(0, Math.round(totalTimeSeconds)),
    })
    .eq("id", simId)
    .eq("user_id", user.id)
    .select("id");
  if (error) throw new MockStoreError("Could not finalise this simulation", error);
  if (!rows || rows.length === 0) {
    throw new MockStoreError("Could not finalise this simulation");
  }
}
