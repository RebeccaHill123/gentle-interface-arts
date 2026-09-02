/**
 * Durable practice-session state: versioned local snapshot, authoritative
 * wall-clock timing, stable final snapshots and completion bookkeeping.
 *
 * Invariants:
 * - Restoring an active snapshot must NEVER trigger another generate-quiz call.
 * - Remaining time is derived from an absolute deadline, so it survives
 *   backgrounding / navigation / reload and can never increase.
 * - The final snapshot is built synchronously from current values, adding the
 *   live question's elapsed time exactly once.
 * - A completion is only "accepted" when BOTH the activity and the graded
 *   attempts were confirmed or verifiably queued.
 */

import type { PracticeConfig } from "./config";
import type { QuizQuestion } from "./quiz-validate";
import { normaliseQuestion } from "./quiz-validate";
import { normaliseConfig } from "./config";

export const ACTIVE_SNAPSHOT_KEY = "practice:active:v1";
/**
 * v2 adds `questionStartedAt` so the live question interval survives reload.
 * v1 snapshots are migrated (they simply have no recoverable live interval).
 */
export const ACTIVE_SNAPSHOT_VERSION = 2;
const SUPPORTED_SNAPSHOT_VERSIONS = [1, 2];
/** An abandoned session stops being restorable after this long. */
export const ACTIVE_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const MAX_SNAPSHOT_CHARS = 400_000;

export type WriteState = "pending" | "accepted" | "failed";

export type CompletionStatus = {
  activity: WriteState;
  attempts: WriteState;
  /** True when at least one component reached the server (not just the queue). */
  activityQueuedOnly?: boolean;
  attemptsQueuedOnly?: boolean;
  message?: string;
};

export type FinalSnapshot = {
  sessionId: string;
  perQuestionMs: number[];
  totalMs: number;
  total: number;
  correct: number;
  /** Real selections only — unanswered items are never counted as answered. */
  answeredCount: number;
  accuracy: number;
  answers: (number | null)[];
  occurredAtIso: string;
};

export type ActiveSnapshot = {
  version: number;
  sessionId: string;
  fingerprint: string;
  config: PracticeConfig;
  questions: QuizQuestion[];
  answers: (number | null)[];
  revealed: number[];
  feedbackMode: "immediate" | "end";
  current: number;
  perQuestionMs: number[];
  /** Wall-clock start of the currently open question interval (quiz phase only). */
  questionStartedAt: number | null;
  startedAt: number | null;
  deadlineAt: number | null;
  phase: "launch" | "quiz" | "results";
  completion: CompletionStatus | null;
  finalSnapshot: FinalSnapshot | null;
  updatedAt: number;
};

// ───────── validation

function numArray(v: unknown, len: number): number[] | null {
  if (!Array.isArray(v) || v.length !== len) return null;
  const out: number[] = [];
  for (const n of v) {
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return null;
    out.push(Math.floor(n));
  }
  return out;
}

function answerArray(v: unknown, len: number): (number | null)[] | null {
  if (!Array.isArray(v) || v.length !== len) return null;
  const out: (number | null)[] = [];
  for (const a of v) {
    if (a === null) out.push(null);
    else if (typeof a === "number" && Number.isInteger(a) && a >= 0 && a <= 3) out.push(a);
    else return null;
  }
  return out;
}

function writeState(v: unknown): WriteState {
  return v === "accepted" || v === "failed" ? v : "pending";
}

function validateCompletion(v: unknown): CompletionStatus | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  return {
    activity: writeState(r.activity),
    attempts: writeState(r.attempts),
    activityQueuedOnly: r.activityQueuedOnly === true,
    attemptsQueuedOnly: r.attemptsQueuedOnly === true,
    message: typeof r.message === "string" ? r.message.slice(0, 300) : undefined,
  };
}

function validateFinal(v: unknown, total: number): FinalSnapshot | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const per = numArray(r.perQuestionMs, total);
  const answers = answerArray(r.answers, total);
  if (!per || !answers) return null;
  if (typeof r.sessionId !== "string" || !r.sessionId) return null;
  if (typeof r.occurredAtIso !== "string" || Number.isNaN(Date.parse(r.occurredAtIso))) return null;
  const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
  const totalMs = num(r.totalMs);
  const correct = num(r.correct);
  const answeredCount = num(r.answeredCount);
  const accuracy = num(r.accuracy);
  if (totalMs == null || correct == null || answeredCount == null || accuracy == null) return null;
  return {
    sessionId: r.sessionId,
    perQuestionMs: per,
    totalMs: Math.max(0, Math.floor(totalMs)),
    total,
    correct: Math.max(0, Math.floor(correct)),
    answeredCount: Math.max(0, Math.floor(answeredCount)),
    accuracy: Math.min(1, Math.max(0, accuracy)),
    answers,
    occurredAtIso: r.occurredAtIso,
  };
}

export function validateSnapshot(raw: unknown): ActiveSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== "number" || !SUPPORTED_SNAPSHOT_VERSIONS.includes(r.version)) return null;
  if (typeof r.sessionId !== "string" || !r.sessionId) return null;
  if (typeof r.fingerprint !== "string" || !r.fingerprint) return null;
  const config = normaliseConfig(r.config);
  if (!config) return null;
  if (!Array.isArray(r.questions) || r.questions.length === 0 || r.questions.length > 60) return null;
  const questions: QuizQuestion[] = [];
  for (const q of r.questions) {
    const nq = normaliseQuestion(q);
    if (!nq) return null;
    questions.push(nq);
  }
  const total = questions.length;
  const answers = answerArray(r.answers, total);
  const perQuestionMs = numArray(r.perQuestionMs, total);
  if (!answers || !perQuestionMs) return null;
  const revealed = Array.isArray(r.revealed)
    ? r.revealed.filter(
        (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < total,
      )
    : [];
  const current =
    typeof r.current === "number" && Number.isInteger(r.current) && r.current >= 0 && r.current < total
      ? r.current
      : 0;
  const phase = r.phase === "quiz" || r.phase === "results" ? r.phase : "launch";
  const time = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : null;
  const updatedAt = time(r.updatedAt);
  if (!updatedAt) return null;
  return {
    version: ACTIVE_SNAPSHOT_VERSION,
    sessionId: r.sessionId,
    fingerprint: r.fingerprint,
    config,
    questions,
    answers,
    revealed,
    feedbackMode: r.feedbackMode === "end" ? "end" : "immediate",
    current,
    perQuestionMs,
    questionStartedAt: r.version === ACTIVE_SNAPSHOT_VERSION ? time(r.questionStartedAt) : null,
    startedAt: time(r.startedAt),
    deadlineAt: time(r.deadlineAt),
    phase,
    completion: validateCompletion(r.completion),
    finalSnapshot: validateFinal(r.finalSnapshot, total),
    updatedAt,
  };
}

// ───────── restore decision

export type RestoreDecision =
  | { action: "restore"; snapshot: ActiveSnapshot; reason: "active" | "unaccepted-results" }
  | { action: "generate"; reason: "no-snapshot" | "invalid" | "stale" | "mismatch" | "settled" };

/**
 * Decides whether an existing snapshot can be resumed. `restore` means the
 * provider must NOT be called at all.
 */
export function decideRestore(input: {
  raw: unknown;
  fingerprint: string;
  now: number;
  maxAgeMs?: number;
}): RestoreDecision {
  if (input.raw == null) return { action: "generate", reason: "no-snapshot" };
  const snapshot = validateSnapshot(input.raw);
  if (!snapshot) return { action: "generate", reason: "invalid" };
  const maxAge = input.maxAgeMs ?? ACTIVE_MAX_AGE_MS;
  if (input.now - snapshot.updatedAt > maxAge) return { action: "generate", reason: "stale" };
  if (snapshot.fingerprint !== input.fingerprint) return { action: "generate", reason: "mismatch" };
  if (snapshot.phase === "results") {
    // A fully recorded session is finished; an unaccepted one stays recoverable.
    if (snapshot.completion && completionAccepted(snapshot.completion)) {
      return { action: "generate", reason: "settled" };
    }
    return { action: "restore", snapshot, reason: "unaccepted-results" };
  }
  return { action: "restore", snapshot, reason: "active" };
}

// ───────── timing

/** Absolute deadline for a timed session; null when untimed. */
export function computeDeadline(config: PracticeConfig, startedAt: number): number | null {
  if (!config.timed) return null;
  const minutes = Math.min(240, Math.max(1, Math.floor(config.duration)));
  return startedAt + minutes * 60_000;
}

/** Remaining ms, clamped at 0 and monotonically non-increasing over real time. */
export function remainingMs(deadlineAt: number | null, now: number): number | null {
  if (deadlineAt == null) return null;
  return Math.max(0, deadlineAt - now);
}

export function isExpired(deadlineAt: number | null, now: number): boolean {
  if (deadlineAt == null) return false; // untimed sessions never auto-expire
  return now >= deadlineAt;
}

export function formatRemaining(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Adds an elapsed interval to one question's accumulated time. */
export function applyElapsed(per: number[], index: number, elapsedMs: number): number[] {
  const next = [...per];
  if (index < 0 || index >= next.length) return next;
  const add = Number.isFinite(elapsedMs) && elapsedMs > 0 ? Math.floor(elapsedMs) : 0;
  next[index] = (next[index] ?? 0) + add;
  return next;
}

/** End of the attributable window: bounded by the deadline for timed sessions. */
export function timingBound(deadlineAt: number | null, now: number): number {
  return deadlineAt == null ? now : Math.min(now, deadlineAt);
}

/**
 * For timed sessions the authoritative session length is
 * `min(now, deadlineAt) - startedAt`. Any interval not attributed to a
 * question (e.g. time while the tab was closed) is folded ONCE into the
 * current question so per-question durations and totalMs agree.
 */
export function reconcileTotals(input: {
  perQuestionMs: number[];
  current: number;
  startedAt: number | null;
  deadlineAt: number | null;
  now: number;
}): number[] {
  const per = [...input.perQuestionMs];
  if (input.startedAt == null || input.deadlineAt == null) return per;
  const authoritative = Math.max(0, timingBound(input.deadlineAt, input.now) - input.startedAt);
  const sum = per.reduce((a, b) => a + b, 0);
  const gap = authoritative - sum;
  if (gap <= 0) return per;
  return applyElapsed(per, input.current, gap);
}

/**
 * Recovers timing after a reload.
 * - Timed: wall-clock keeps running while away, bounded by the deadline, and
 *   totals are reconciled against startedAt→min(now, deadlineAt).
 * - Untimed: only already-observed active time (up to the last persist) is
 *   kept; closed-tab time is never invented. Timing resumes from `now`.
 */
export function restoreTiming(input: { snapshot: ActiveSnapshot; now: number }): {
  perQuestionMs: number[];
  questionStartedAt: number | null;
} {
  const s = input.snapshot;
  if (s.phase !== "quiz") {
    return { perQuestionMs: [...s.perQuestionMs], questionStartedAt: null };
  }
  const timed = s.deadlineAt != null;
  const endBound = timed ? timingBound(s.deadlineAt, input.now) : s.updatedAt;
  let per = [...s.perQuestionMs];
  if (s.questionStartedAt != null) {
    per = applyElapsed(per, s.current, endBound - s.questionStartedAt);
  }
  if (timed) {
    per = reconcileTotals({
      perQuestionMs: per,
      current: s.current,
      startedAt: s.startedAt,
      deadlineAt: s.deadlineAt,
      now: input.now,
    });
    // Expired while away: no further live interval may open.
    if (isExpired(s.deadlineAt, input.now)) return { perQuestionMs: per, questionStartedAt: null };
  }
  return { perQuestionMs: per, questionStartedAt: input.now };
}

// ───────── scoring + final snapshot

export function scoreAnswers(
  questions: QuizQuestion[],
  answers: (number | null)[],
): { total: number; correct: number; answeredCount: number; accuracy: number } {
  const total = questions.length;
  let correct = 0;
  let answeredCount = 0;
  for (let i = 0; i < total; i++) {
    const a = answers[i];
    if (a != null) answeredCount++;
    // Unanswered items score as incorrect at final submission.
    if (a != null && a === questions[i]?.correctIndex) correct++;
  }
  return { total, correct, answeredCount, accuracy: total ? correct / total : 0 };
}

/**
 * Builds the one stable snapshot used for displayed totals AND every graded
 * attempt duration. The live question's elapsed time is folded in exactly once,
 * bounded by the deadline, and timed totals are reconciled to the authoritative
 * startedAt → min(now, deadlineAt) interval.
 */
export function buildFinalSnapshot(input: {
  sessionId: string;
  questions: QuizQuestion[];
  answers: (number | null)[];
  perQuestionMs: number[];
  current: number;
  questionStartedAt: number | null;
  startedAt?: number | null;
  deadlineAt?: number | null;
  now: number;
  occurredAt?: Date;
}): FinalSnapshot {
  const deadlineAt = input.deadlineAt ?? null;
  const end = timingBound(deadlineAt, input.now);
  const elapsed = input.questionStartedAt != null ? Math.max(0, end - input.questionStartedAt) : 0;
  let per = applyElapsed(input.perQuestionMs, input.current, elapsed);
  per = reconcileTotals({
    perQuestionMs: per,
    current: input.current,
    startedAt: input.startedAt ?? null,
    deadlineAt,
    now: input.now,
  });
  const { total, correct, answeredCount, accuracy } = scoreAnswers(input.questions, input.answers);
  return {
    sessionId: input.sessionId,
    perQuestionMs: per,
    totalMs: per.reduce((a, b) => a + b, 0),
    total,
    correct,
    answeredCount,
    accuracy,
    answers: [...input.answers],
    occurredAtIso: (input.occurredAt ?? new Date(input.now)).toISOString(),
  };
}

// ───────── completion bookkeeping

export function emptyCompletion(): CompletionStatus {
  return { activity: "pending", attempts: "pending" };
}

/** Confirmed OR verifiably queued counts as accepted for a component. */
export function classifyWrite(result: { ok: boolean; queued: boolean }): {
  state: WriteState;
  queuedOnly: boolean;
} {
  if (result.ok) return { state: "accepted", queuedOnly: false };
  if (result.queued) return { state: "accepted", queuedOnly: true };
  return { state: "failed", queuedOnly: false };
}

export function mergeWriteOutcome(
  status: CompletionStatus,
  part: "activity" | "attempts",
  result: { ok: boolean; queued: boolean; error?: string },
): CompletionStatus {
  const { state, queuedOnly } = classifyWrite(result);
  const next: CompletionStatus = { ...status };
  next[part] = state;
  if (part === "activity") next.activityQueuedOnly = queuedOnly;
  else next.attemptsQueuedOnly = queuedOnly;
  next.message = state === "failed" ? result.error : status.message;
  if (next.activity !== "failed" && next.attempts !== "failed") next.message = undefined;
  return next;
}

export function markWriteThrew(
  status: CompletionStatus,
  part: "activity" | "attempts",
  message?: string,
): CompletionStatus {
  return mergeWriteOutcome(status, part, { ok: false, queued: false, error: message });
}

export function completionAccepted(status: CompletionStatus): boolean {
  return status.activity === "accepted" && status.attempts === "accepted";
}

/** Which components still need re-running on Retry. */
export function pendingParts(status: CompletionStatus): Array<"activity" | "attempts"> {
  const out: Array<"activity" | "attempts"> = [];
  if (status.activity !== "accepted") out.push("activity");
  if (status.attempts !== "accepted") out.push("attempts");
  return out;
}

export type SaveLabel = {
  tone: "ok" | "queued" | "failed";
  title: string;
  detail: string;
};

/** Honest copy: account-confirmed vs device-queued vs not durably recorded. */
export function describeCompletion(status: CompletionStatus | null): SaveLabel | null {
  if (!status) return null;
  if (status.activity === "failed" || status.attempts === "failed") {
    const which =
      status.activity === "failed" && status.attempts === "failed"
        ? "your session and your answers"
        : status.activity === "failed"
          ? "your session"
          : "your individual answers";
    return {
      tone: "failed",
      title: "Not recorded yet",
      detail: `We couldn't durably record ${which} on this device or your account. Your results are safe on screen — tap Retry to record them.`,
    };
  }
  if (status.activity === "pending" || status.attempts === "pending") {
    return {
      tone: "queued",
      title: "Recording…",
      detail: "Saving your session and answers.",
    };
  }
  if (status.activityQueuedOnly || status.attemptsQueuedOnly) {
    return {
      tone: "queued",
      title: "Saved on this device",
      detail: "Your results are queued here and will sync to your account when you're back online.",
    };
  }
  return {
    tone: "ok",
    title: "Recorded to your account",
    detail: "This session, your answers and your confidence update are saved.",
  };
}

// ───────── snapshot persistence (browser)

function boundedJson(snapshot: ActiveSnapshot): string | null {
  try {
    const json = JSON.stringify(snapshot);
    if (json.length > MAX_SNAPSHOT_CHARS) return null;
    return json;
  } catch {
    return null;
  }
}

/** Write-then-read verification; returns false when storage refused it. */
export function persistSnapshot(snapshot: ActiveSnapshot): boolean {
  const json = boundedJson(snapshot);
  if (!json) return false;
  try {
    localStorage.setItem(ACTIVE_SNAPSHOT_KEY, json);
    return localStorage.getItem(ACTIVE_SNAPSHOT_KEY) === json;
  } catch {
    return false;
  }
}

export function readSnapshotRaw(): unknown {
  try {
    const raw = localStorage.getItem(ACTIVE_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSnapshot(): void {
  try {
    localStorage.removeItem(ACTIVE_SNAPSHOT_KEY);
  } catch {}
}
