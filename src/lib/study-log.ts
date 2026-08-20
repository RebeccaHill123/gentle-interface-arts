// Canonical study-activity + graded-attempt repository.
//
// Source of truth policy (Phase 1):
//  - `study_events`     : canonical record of every real study action.
//  - `graded_attempts`  : canonical record of every genuinely graded answer
//                         (practice / mini test / graded recall). Full mocks
//                         stay in `mock_answers` and are read through
//                         `graded-performance.ts`.
//  - legacy `StoredPlan.sessions` : compatibility mirror only. Still written
//                         (dual-write) so existing screens keep working, never
//                         used as the basis of correctness claims.
//
// Timezone policy: `occurred_at` is UTC; `local_date` is derived from the
// user's current IANA timezone and is the only key used for streaks/weeks.
import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  addLegacySession,
  removeStudySession,
  setModuleConfidence,
  adjustModuleConfidence,
  loadPlan,
  type StudySession,
} from "@/lib/plan-store";

export type StudySource =
  | "dashboard_task"
  | "focus_sprint"
  | "manual_log"
  | "practice"
  | "mock"
  | "flashcards"
  | "chatgpt";

export type ActivityType =
  | "study"
  | "quiz"
  | "mock"
  | "review"
  | "flashcards"
  | "focus";

export type GradedSourceType =
  | "practice"
  | "mini_test"
  | "full_mock"
  | "flashcard_recall";

export interface RecordActivityInput {
  /** Stable per-action key. Repeated clicks/retries with the same key never double-count. */
  idempotencyKey: string;
  activityType: ActivityType;
  source: StudySource;
  actualMinutes: number;
  occurredAt?: Date;
  examPath?: string | null;
  subject?: string | null;
  subtopic?: string | null;
  plannedTaskId?: string | null;
  plannedMinutes?: number | null;
  /** Self-reported only. Never treated as correctness. */
  selfFocus?: number | null;
  selfMood?: 1 | 2 | 3 | 4 | 5 | null;
  /** Short, non-sensitive label mirrored into the legacy session note. */
  note?: string | null;
  /** Non-sensitive structured details only — never question text or prompts. */
  metadata?: Record<string, unknown>;
  /**
   * Graded accuracy 0..1 for this action, when it is genuinely graded.
   * Used for the legacy confidence mirror; correctness itself lives in
   * `graded_attempts`.
   */
  gradedAccuracy?: number | null;
}

export interface GradedAttemptInput {
  idempotencyKey: string;
  sourceType: GradedSourceType;
  questionFingerprint: string;
  isCorrect: boolean;
  occurredAt?: Date;
  examPath?: string | null;
  sourceRef?: string | null;
  subject?: string | null;
  subtopic?: string | null;
  selectedAnswer?: string | null;
  durationSeconds?: number | null;
  metadata?: Record<string, unknown>;
}

export interface WriteResult {
  ok: boolean;
  /** True when the canonical write could not reach the server and was queued. */
  queued: boolean;
  error?: string;
}

export interface StudyEventRow {
  id: string;
  idempotency_key: string;
  occurred_at: string;
  local_date: string;
  timezone: string | null;
  exam_path: string | null;
  subject: string | null;
  subtopic: string | null;
  activity_type: string;
  planned_task_id: string | null;
  planned_minutes: number | null;
  actual_minutes: number;
  source: string;
  self_focus: number | null;
  self_mood: number | null;
  voided_at: string | null;
}

export interface GradedAttemptRow {
  id: string;
  occurred_at: string;
  local_date: string;
  exam_path: string | null;
  source_type: string;
  source_ref: string | null;
  question_fingerprint: string;
  subject: string | null;
  subtopic: string | null;
  is_correct: boolean;
  duration_seconds: number | null;
  voided_at: string | null;
}

// ───────── timezone helpers

export function currentTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/** YYYY-MM-DD in the user's own timezone (never UTC). */
export function localDateFor(date: Date = new Date(), timeZone?: string | null): string {
  const tz = timeZone ?? currentTimezone();
  try {
    if (tz) {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
      // en-CA formats as YYYY-MM-DD
      return parts.replaceAll("/", "-");
    }
  } catch {
    /* fall through to local getters */
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ───────── local ledger + offline queue

const QUEUE_KEY = "tentra.studylog.queue.v1";
const LEDGER_KEY = "tentra.studylog.ledger.v1";

type QueueItem =
  | { kind: "event"; payload: Record<string, unknown> }
  | { kind: "attempts"; payload: Record<string, unknown>[] }
  | { kind: "void"; idempotencyKey: string };

interface LedgerEntry {
  loggedAt: string;
  module?: string;
  previousConfidence?: number;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — canonical row is still the server's job */
  }
}

function ledger(): Record<string, LedgerEntry> {
  return readJson<Record<string, LedgerEntry>>(LEDGER_KEY, {});
}

function setLedger(key: string, entry: LedgerEntry | null) {
  const all = ledger();
  if (entry === null) delete all[key];
  else all[key] = entry;
  writeJson(LEDGER_KEY, all);
}

function enqueue(item: QueueItem) {
  const q = readJson<QueueItem[]>(QUEUE_KEY, []);
  q.push(item);
  writeJson(QUEUE_KEY, q.slice(-200));
}

/** Number of canonical writes still waiting to reach the server. */
export function pendingWriteCount(): number {
  return readJson<QueueItem[]>(QUEUE_KEY, []).length;
}

/**
 * Retries queued canonical writes. Safe to call repeatedly — every item
 * carries its idempotency key, so reconnection cannot duplicate records.
 */
export async function flushStudyLogQueue(): Promise<{ flushed: number; remaining: number }> {
  const q = readJson<QueueItem[]>(QUEUE_KEY, []);
  if (q.length === 0) return { flushed: 0, remaining: 0 };
  const user = await waitForAuthUser();
  if (!user) return { flushed: 0, remaining: q.length };

  const remaining: QueueItem[] = [];
  let flushed = 0;
  for (const item of q) {
    try {
      if (item.kind === "event") {
        const { error } = await supabase
          .from("study_events")
          .upsert([{ ...item.payload, user_id: user.id }] as never, {
            onConflict: "user_id,idempotency_key",
            ignoreDuplicates: true,
          });
        if (error) throw error;
      } else if (item.kind === "attempts") {
        const rows = item.payload.map((p) => ({ ...p, user_id: user.id }));
        const { error } = await supabase
          .from("graded_attempts")
          .upsert(rows as never, {
            onConflict: "user_id,idempotency_key",
            ignoreDuplicates: true,
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("study_events")
          .update({ voided_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("idempotency_key", item.idempotencyKey);
        if (error) throw error;
      }
      flushed += 1;
    } catch {
      remaining.push(item);
    }
  }
  writeJson(QUEUE_KEY, remaining);
  return { flushed, remaining: remaining.length };
}

// ───────── canonical writes

/**
 * The single entry point for recording a real study action.
 *
 * Dual-write: canonical `study_events` row + legacy `StoredPlan.sessions`
 * mirror. Callers must NOT also call `addStudySession` for the same action.
 */
export async function recordStudyActivity(input: RecordActivityInput): Promise<WriteResult> {
  const occurredAt = input.occurredAt ?? new Date();
  const tz = currentTimezone();
  const localDate = localDateFor(occurredAt, tz);
  const known = ledger()[input.idempotencyKey];

  // 1. Legacy mirror (local, synchronous, idempotent on loggedAt).
  const loggedAt = known?.loggedAt ?? occurredAt.toISOString();
  if (!known) {
    const legacy: StudySession = {
      date: localDate,
      minutes: Math.max(0, Math.round(input.actualMinutes)),
      module: input.subject ?? undefined,
      note: input.note ?? undefined,
      loggedAt,
      sessionType: input.activityType,
      mood: input.selfMood ?? undefined,
      focus: typeof input.selfFocus === "number" ? input.selfFocus : undefined,
    };
    addLegacySession(legacy);

    const entry: LedgerEntry = { loggedAt };
    if (typeof input.gradedAccuracy === "number" && input.subject) {
      const before = loadPlan()?.input.modules.find((m) => m.name === input.subject)?.confidence;
      if (typeof before === "number") {
        entry.module = input.subject;
        entry.previousConfidence = before;
      }
      adjustModuleConfidence(input.subject, input.gradedAccuracy);
    }
    setLedger(input.idempotencyKey, entry);
  }

  // 2. Canonical write.
  const payload: Record<string, unknown> = {
    idempotency_key: input.idempotencyKey,
    occurred_at: occurredAt.toISOString(),
    local_date: localDate,
    timezone: tz,
    exam_path: input.examPath ?? null,
    subject: input.subject ?? null,
    subtopic: input.subtopic ?? null,
    activity_type: input.activityType,
    planned_task_id: input.plannedTaskId ?? null,
    planned_minutes: input.plannedMinutes ?? null,
    actual_minutes: Math.max(0, Math.round(input.actualMinutes)),
    source: input.source,
    self_focus: typeof input.selfFocus === "number" ? input.selfFocus : null,
    self_mood: input.selfMood ?? null,
    metadata: sanitizeMetadata(input.metadata),
    voided_at: null,
  };

  try {
    const user = await waitForAuthUser();
    if (!user) throw new Error("not signed in");
    const { error } = await supabase
      .from("study_events")
      .upsert([{ ...payload, user_id: user.id }] as never, {
        onConflict: "user_id,idempotency_key",
        ignoreDuplicates: true,
      });
    if (error) throw error;
    return { ok: true, queued: false };
  } catch (e) {
    enqueue({ kind: "event", payload });
    return {
      ok: false,
      queued: true,
      error: e instanceof Error ? e.message : "Could not save to your account yet",
    };
  }
}

/** Reverses a previously recorded action: voids the canonical row and undoes the legacy mirror. */
export async function voidStudyActivity(idempotencyKey: string): Promise<WriteResult> {
  const entry = ledger()[idempotencyKey];
  if (entry) {
    removeStudySession(entry.loggedAt);
    if (entry.module && typeof entry.previousConfidence === "number") {
      setModuleConfidence(entry.module, entry.previousConfidence);
    }
    setLedger(idempotencyKey, null);
  }
  try {
    const user = await waitForAuthUser();
    if (!user) throw new Error("not signed in");
    const { error } = await supabase
      .from("study_events")
      .update({ voided_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey);
    if (error) throw error;
    return { ok: true, queued: false };
  } catch (e) {
    enqueue({ kind: "void", idempotencyKey });
    return {
      ok: false,
      queued: true,
      error: e instanceof Error ? e.message : "Undo not synced yet",
    };
  }
}

/** Records genuinely graded answers. Never call this for self-assessed exposure. */
export async function recordGradedAttempts(
  attempts: GradedAttemptInput[],
): Promise<WriteResult> {
  if (attempts.length === 0) return { ok: true, queued: false };
  const rows = attempts.map((a) => {
    const occurredAt = a.occurredAt ?? new Date();
    const tz = currentTimezone();
    return {
      idempotency_key: a.idempotencyKey,
      occurred_at: occurredAt.toISOString(),
      local_date: localDateFor(occurredAt, tz),
      timezone: tz,
      exam_path: a.examPath ?? null,
      source_type: a.sourceType,
      source_ref: a.sourceRef ?? null,
      question_fingerprint: a.questionFingerprint,
      subject: a.subject ?? null,
      subtopic: a.subtopic ?? null,
      is_correct: a.isCorrect,
      selected_answer: a.selectedAnswer ?? null,
      duration_seconds: a.durationSeconds ?? null,
      metadata: sanitizeMetadata(a.metadata),
    } as Record<string, unknown>;
  });

  try {
    const user = await waitForAuthUser();
    if (!user) throw new Error("not signed in");
    const { error } = await supabase
      .from("graded_attempts")
      .upsert(rows.map((r) => ({ ...r, user_id: user.id })) as never, {
        onConflict: "user_id,idempotency_key",
        ignoreDuplicates: true,
      });
    if (error) throw error;
    return { ok: true, queued: false };
  } catch (e) {
    enqueue({ kind: "attempts", payload: rows });
    return {
      ok: false,
      queued: true,
      error: e instanceof Error ? e.message : "Results saved on this device only so far",
    };
  }
}

// ───────── canonical reads

export async function loadStudyEvents(): Promise<StudyEventRow[]> {
  const user = await waitForAuthUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("study_events")
    .select(
      "id,idempotency_key,occurred_at,local_date,timezone,exam_path,subject,subtopic,activity_type,planned_task_id,planned_minutes,actual_minutes,source,self_focus,self_mood,voided_at",
    )
    .eq("user_id", user.id)
    .is("voided_at", null)
    .order("occurred_at", { ascending: true });
  if (error) {
    console.warn("loadStudyEvents failed", error.message);
    return [];
  }
  return (data ?? []) as StudyEventRow[];
}

export async function loadGradedAttempts(): Promise<GradedAttemptRow[]> {
  const user = await waitForAuthUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("graded_attempts")
    .select(
      "id,occurred_at,local_date,exam_path,source_type,source_ref,question_fingerprint,subject,subtopic,is_correct,duration_seconds,voided_at",
    )
    .eq("user_id", user.id)
    .is("voided_at", null)
    .order("occurred_at", { ascending: true });
  if (error) {
    console.warn("loadGradedAttempts failed", error.message);
    return [];
  }
  return (data ?? []) as GradedAttemptRow[];
}

/**
 * Read-only diagnostic: how many legacy plan-blob sessions exist that a later
 * phase could migrate into `study_events`. Performs no writes.
 */
export function legacyMigrationDiagnostic(): {
  legacySessions: number;
  alreadyMirrored: number;
  migratable: number;
} {
  const sessions = loadPlan()?.sessions ?? [];
  const mirrored = new Set(Object.values(ledger()).map((e) => e.loggedAt));
  const alreadyMirrored = sessions.filter((s) => mirrored.has(s.loggedAt)).length;
  return {
    legacySessions: sessions.length,
    alreadyMirrored,
    migratable: sessions.length - alreadyMirrored,
  };
}

// ───────── helpers

const FORBIDDEN_METADATA_KEYS = [
  "email",
  "token",
  "prompt",
  "question",
  "questiontext",
  "stem",
  "options",
  "explanation",
  "answer_text",
  "password",
  "customer",
  "payment",
];

/** Strips anything that could carry PII, prompts, payment data or question text. */
function sanitizeMetadata(meta?: Record<string, unknown>): Record<string, unknown> {
  if (!meta) return {};
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    const key = k.toLowerCase();
    if (FORBIDDEN_METADATA_KEYS.some((bad) => key.includes(bad))) continue;
    if (v === null || ["string", "number", "boolean"].includes(typeof v)) {
      out[k] = typeof v === "string" ? v.slice(0, 120) : v;
    }
  }
  return out;
}

/** Deterministic key builder so retries of the same action collide by design. */
export function makeIdempotencyKey(...parts: (string | number | undefined | null)[]): string {
  return parts
    .filter((p) => p !== undefined && p !== null && p !== "")
    .map((p) => String(p).replace(/[^a-zA-Z0-9_:.-]/g, "-").slice(0, 60))
    .join(":");
}
