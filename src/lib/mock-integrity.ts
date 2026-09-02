// Pure, testable integrity helpers for Full Mock Simulations.
//
// Everything here is deliberately side-effect free so the invariants that
// matter for exam credibility — wall-clock timing, answer recovery, honest
// scoring and single-record completion — can be unit tested without a browser
// or a database.

import type { SectionKind } from "./full-mock-blueprints";

// ---------------------------------------------------------------------------
// 1. Section timing (reload- and background-proof)

export type TimerState = {
  /** Wall-clock ms when the section was first started. Never moves forward. */
  startedAtMs: number;
  /** Total ms spent paused in completed pause intervals (practice mode only). */
  pausedAccumulatedMs: number;
  /** Wall-clock ms the current pause began, or null when running. */
  pausedAtMs: number | null;
};

export function makeTimerState(startedAtMs: number): TimerState {
  return { startedAtMs, pausedAccumulatedMs: 0, pausedAtMs: null };
}

export function isTimerState(value: unknown): value is TimerState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v['startedAtMs'] === "number" &&
    Number.isFinite(v['startedAtMs']) &&
    typeof v['pausedAccumulatedMs'] === "number" &&
    (v['pausedAtMs'] === null || typeof v['pausedAtMs'] === "number")
  );
}

/**
 * Elapsed *working* ms derived from wall clock. Backgrounding the tab or
 * reloading cannot change this value: it is a function of timestamps only, not
 * of how many interval ticks the browser managed to fire.
 */
export function elapsedMsFrom(state: TimerState, nowMs: number): number {
  const raw = Math.max(0, nowMs - state.startedAtMs);
  const openPause =
    state.pausedAtMs != null ? Math.max(0, nowMs - state.pausedAtMs) : 0;
  return Math.max(
    0,
    raw - Math.max(0, state.pausedAccumulatedMs) - openPause,
  );
}

export function elapsedSecondsFrom(state: TimerState, nowMs: number): number {
  return Math.floor(elapsedMsFrom(state, nowMs) / 1000);
}

export function remainingSecondsFrom(
  state: TimerState,
  durationSeconds: number,
  nowMs: number,
): number {
  return Math.max(0, durationSeconds - elapsedSecondsFrom(state, nowMs));
}

export function pauseTimer(state: TimerState, nowMs: number): TimerState {
  if (state.pausedAtMs != null) return state; // already paused — idempotent
  return { ...state, pausedAtMs: nowMs };
}

export function resumeTimer(state: TimerState, nowMs: number): TimerState {
  if (state.pausedAtMs == null) return state; // already running — idempotent
  return {
    startedAtMs: state.startedAtMs,
    pausedAccumulatedMs:
      Math.max(0, state.pausedAccumulatedMs) +
      Math.max(0, nowMs - state.pausedAtMs),
    pausedAtMs: null,
  };
}

/**
 * Reconcile the persisted timer with any local cache. Rules:
 * - the earliest known start wins, so a reload can never hand back time;
 * - exam mode ignores pause state entirely (no pausing allowed);
 * - in practice mode the larger accumulated pause wins, and an open pause is
 *   preserved so refreshing while paused does not silently resume the clock.
 */
export function resolveTimerState(input: {
  mode: "exam" | "practice";
  stored?: TimerState | null;
  cached?: TimerState | null;
  /** Fallback: mock_sections.started_at, when no timer metadata exists yet. */
  startedAtIso?: string | null;
  nowMs: number;
}): TimerState {
  const candidates: TimerState[] = [];
  if (input.stored && isTimerState(input.stored)) candidates.push(input.stored);
  if (input.cached && isTimerState(input.cached)) candidates.push(input.cached);
  if (!candidates.length && input.startedAtIso) {
    const t = Date.parse(input.startedAtIso);
    if (Number.isFinite(t)) candidates.push(makeTimerState(t));
  }
  if (!candidates.length) return makeTimerState(input.nowMs);

  const startedAtMs = Math.min(...candidates.map((c) => c.startedAtMs));
  if (input.mode === "exam") {
    return { startedAtMs, pausedAccumulatedMs: 0, pausedAtMs: null };
  }
  const pausedAccumulatedMs = Math.max(
    ...candidates.map((c) => Math.max(0, c.pausedAccumulatedMs)),
  );
  const openPauses = candidates
    .map((c) => c.pausedAtMs)
    .filter((v): v is number => v != null);
  return {
    startedAtMs,
    pausedAccumulatedMs,
    pausedAtMs: openPauses.length ? Math.min(...openPauses) : null,
  };
}

/**
 * `started_at` is written once. Resuming or refreshing must never overwrite the
 * original start, otherwise a candidate could refresh for extra time.
 */
export function resolveSectionStartedAt(
  existing: string | null | undefined,
  nowIso: string,
): string {
  if (existing) {
    const t = Date.parse(existing);
    if (Number.isFinite(t)) return existing;
  }
  return nowIso;
}

// ---------------------------------------------------------------------------
// 2. Answer recovery (DB ⇄ local merge)

export type LocalAnswer = {
  answerIndex?: number;
  essayText?: string;
  isFlagged?: boolean;
  timeSpentSeconds?: number;
};

export type LocalAnswerState = Record<string, LocalAnswer>;

export type MergeableDbAnswer = {
  question_id: string;
  answer_value: string | null;
  essay_text: string | null;
  is_flagged: boolean;
  time_spent_seconds: number;
};

export function hasContent(a: LocalAnswer | undefined): boolean {
  if (!a) return false;
  return a.answerIndex != null || !!(a.essayText && a.essayText.trim());
}

function fromDb(row: MergeableDbAnswer): LocalAnswer {
  const out: LocalAnswer = {
    isFlagged: !!row.is_flagged,
    timeSpentSeconds: Math.max(0, row.time_spent_seconds ?? 0),
  };
  if (row.answer_value != null && row.answer_value !== "") {
    const n = Number(row.answer_value);
    if (Number.isFinite(n)) out.answerIndex = n;
  }
  if (row.essay_text != null && row.essay_text !== "") {
    out.essayText = row.essay_text;
  }
  return out;
}

/**
 * Deterministic merge of persisted answers into the local draft snapshot.
 *
 * - a local draft with real content wins (it is the newer, unsaved work);
 * - anything missing locally is filled from the database, so answers survive a
 *   new device or a cleared localStorage;
 * - time spent takes the maximum of the two, flags prefer the local intent.
 */
export function mergeAnswerState(input: {
  db: MergeableDbAnswer[];
  local: LocalAnswerState;
}): LocalAnswerState {
  const merged: LocalAnswerState = {};
  for (const row of input.db) {
    merged[row.question_id] = fromDb(row);
  }
  for (const [qid, localAnswer] of Object.entries(input.local)) {
    const remote = merged[qid];
    if (!remote) {
      merged[qid] = { ...localAnswer };
      continue;
    }
    const next: LocalAnswer = { ...remote };
    if (hasContent(localAnswer)) {
      // Local content is authoritative; clear the other modality it replaces.
      if (localAnswer.answerIndex != null) next.answerIndex = localAnswer.answerIndex;
      if (localAnswer.essayText && localAnswer.essayText.trim()) {
        next.essayText = localAnswer.essayText;
      }
    }
    if (localAnswer.isFlagged != null) next.isFlagged = localAnswer.isFlagged;
    next.timeSpentSeconds = Math.max(
      remote.timeSpentSeconds ?? 0,
      localAnswer.timeSpentSeconds ?? 0,
    );
    merged[qid] = next;
  }
  return merged;
}

/**
 * The snapshot used at submission. React state updates may not have flushed, so
 * the caller passes the live current-question values explicitly and they take
 * precedence for that one question.
 */
export function finalAnswerSnapshot(input: {
  local: LocalAnswerState;
  currentQuestionId: string;
  currentAnswer: LocalAnswer;
  extraSecondsOnCurrent?: number;
}): LocalAnswerState {
  const base = { ...input.local };
  const prior = base[input.currentQuestionId] ?? {};
  const current = input.currentAnswer ?? {};
  base[input.currentQuestionId] = {
    ...prior,
    ...current,
    timeSpentSeconds:
      Math.max(prior.timeSpentSeconds ?? 0, current.timeSpentSeconds ?? 0) +
      Math.max(0, input.extraSecondsOnCurrent ?? 0),
  };
  return base;
}

// ---------------------------------------------------------------------------
// 3. Honest scoring

export type SectionObjective = {
  kind: SectionKind;
  /** Graded MCQs in the section (unanswered count as incorrect at submission). */
  graded: number;
  correct: number;
};

/**
 * Objective percentage across graded MCQ questions, weighted by question count
 * so unequal sections do not count equally. Written sections are excluded
 * entirely rather than scored as 0.
 */
export function objectiveScore(sections: SectionObjective[]): {
  graded: number;
  correct: number;
  percent: number | null;
  excludedWrittenSections: number;
} {
  let graded = 0;
  let correct = 0;
  let excluded = 0;
  for (const s of sections) {
    if (s.kind !== "mcq") {
      excluded++;
      continue;
    }
    graded += Math.max(0, s.graded);
    correct += Math.max(0, s.correct);
  }
  return {
    graded,
    correct,
    percent: graded > 0 ? Math.round((correct / graded) * 100) : null,
    excludedWrittenSections: excluded,
  };
}

export function sectionScoreLabel(
  kind: SectionKind,
  score: number | null | undefined,
  status: string,
): string {
  if (kind === "mcq") {
    return score == null ? "—" : `${Math.round(Number(score))}%`;
  }
  if (status !== "completed") return "Not auto-graded";
  return "Awaiting self-review";
}

/** MCQ section score: unanswered questions count as incorrect. */
export function mcqSectionScore(input: {
  totalQuestions: number;
  correct: number;
}): number | null {
  if (input.totalQuestions <= 0) return null;
  return Math.round((Math.max(0, input.correct) / input.totalQuestions) * 100);
}

// ---------------------------------------------------------------------------
// 4. Completion + activity record

export function isSimulationFullyComplete(
  sections: { status: string }[],
): boolean {
  return sections.length > 0 && sections.every((s) => s.status === "completed");
}

/** Stable, mock-specific key so refresh/retry cannot double-count the activity. */
export function mockActivityKeyParts(simId: string): [string, string, string] {
  return ["mock", simId, "complete"];
}

/** Sum of actual elapsed seconds recorded per section (never planned duration). */
export function totalElapsedSeconds(
  sections: { elapsedSeconds?: number | null }[],
): number {
  return sections.reduce(
    (sum, s) => sum + Math.max(0, Math.round(s.elapsedSeconds ?? 0)),
    0,
  );
}
