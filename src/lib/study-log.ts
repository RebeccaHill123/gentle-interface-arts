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
import { getCachedAuthOwnerId, waitForAuthUser } from "@/lib/auth-session";
import {
  addLegacySession,
  removeStudySession,
  updateStudySession,
  setModuleConfidence,
  adjustModuleConfidence,
  loadPlan,
  type StudySession,
} from "@/lib/plan-store";

import {
  canonicalOccurredAt,
  classifyUpdateReplay,
  classifyVoidReplay,
  coalesceQueue,
  coalesceWriteQueue,
  commitSessionDelete,
  commitSessionEdit,
  noMatchError,
  pickExactEventMatch,
  queueContainsWrite,
  resolveFromLedger,
  type AnyQueueItem,
  type CanonicalEventSnapshot,
  type CanonicalPort,
  type CanonicalWriteItem,
  type EventPatch,
  type MutationOutcome,
  type Resolution,
} from "@/lib/canonical-edit";


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

type QueueItem = (
  | { kind: "event"; payload: Record<string, unknown> }
  | { kind: "attempts"; payload: Record<string, unknown>[] }
  | { kind: "event_update"; idempotencyKey: string; payload: Record<string, unknown> }
  | { kind: "void"; idempotencyKey: string }
) & {
  /**
   * Account this queued write belongs to, captured in the originating session.
   * Legacy items have none: they are retained but never uploaded, because
   * "whoever signs in next" is not an owner.
   */
  ownerUserId?: string | null;
};

interface LedgerEntry {
  loggedAt: string;
  module?: string;
  previousConfidence?: number;
  /** Owner of the local mirror mapping. Legacy entries have none. */
  ownerUserId?: string | null;
}

/** Synchronous owner for offline-durable local writes. */
export function currentLocalOwnerId(): string | null {
  return getCachedAuthOwnerId();
}

function ownedBy(item: { ownerUserId?: string | null }, owner: string): boolean {
  return !!item.ownerUserId && item.ownerUserId === owner;
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

/**
 * Writes and verifies by re-reading. Returns false when storage rejected the
 * write (quota exceeded, private mode, storage disabled), so no caller may
 * claim something was "queued" when nothing was persisted.
 */
function writeJson(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return false;
  }
  try {
    localStorage.setItem(key, raw);
  } catch {
    return false;
  }
  try {
    return localStorage.getItem(key) === raw;
  } catch {
    return false;
  }
}

function allLedger(): Record<string, LedgerEntry> {
  return readJson<Record<string, LedgerEntry>>(LEDGER_KEY, {});
}

/**
 * Owner-scoped ledger view. Entries belonging to another account — or legacy
 * ownerless entries — are invisible here, so one user's local mapping can never
 * be used to resolve or mutate another user's canonical rows.
 */
function ledger(owner: string | null = currentLocalOwnerId()): Record<string, LedgerEntry> {
  if (!owner) return {};
  const out: Record<string, LedgerEntry> = {};
  for (const [k, v] of Object.entries(allLedger())) {
    if (v && ownedBy(v, owner)) out[k] = v;
  }
  return out;
}

function setLedger(
  key: string,
  entry: LedgerEntry | null,
  owner: string | null = currentLocalOwnerId(),
): boolean {
  if (!owner) return false;
  const all = allLedger();
  const existing = all[key];
  if (existing && !ownedBy(existing, owner)) return false; // never touch another owner's mapping
  if (entry === null) delete all[key];
  else all[key] = { ...entry, ownerUserId: owner };
  return writeJson(LEDGER_KEY, all);
}

/**
 * Persists a canonical write to the offline queue and VERIFIES it is really
 * there. Repeated retries coalesce by idempotency key, so the queue cannot grow
 * without bound.
 */
function enqueueWrite(item: CanonicalWriteItem, owner: string | null): boolean {
  if (typeof window === "undefined") return false;
  // No owner means we cannot say whose work this is: fail closed rather than
  // create an ambiguous item that could land in the wrong account.
  if (!owner) return false;
  const all = readJson<QueueItem[]>(QUEUE_KEY, []);
  const others = all.filter((i) => !ownedBy(i, owner));
  const mine = all.filter((i) => ownedBy(i, owner));
  const owned = { ...item, ownerUserId: owner } as unknown as CanonicalWriteItem;
  const next = coalesceWriteQueue(mine as AnyQueueItem[], owned).slice(-200);
  if (!writeJson(QUEUE_KEY, [...others, ...next])) return false;
  const after = readJson<QueueItem[]>(QUEUE_KEY, []).filter((i) => ownedBy(i, owner));
  return queueContainsWrite(after as AnyQueueItem[], item);
}


/**
 * Enqueue a canonical mutation with coalescing, and verify it is really there
 * before any caller is allowed to move the compatibility mirror.
 */
function enqueueMutation(
  item: { kind: "event_update"; idempotencyKey: string; payload: Record<string, unknown> } | { kind: "void"; idempotencyKey: string },
  owner: string | null = currentLocalOwnerId(),
): boolean {
  if (typeof window === "undefined") return false;
  if (!owner) return false;
  const all = readJson<QueueItem[]>(QUEUE_KEY, []);
  const others = all.filter((i) => !ownedBy(i, owner));
  const mine = all.filter((i) => ownedBy(i, owner));
  const next = coalesceQueue(mine as AnyQueueItem[], { ...item, ownerUserId: owner } as never);
  writeJson(QUEUE_KEY, [...others, ...next.slice(-200)]);
  const after = readJson<QueueItem[]>(QUEUE_KEY, []).filter((i) => ownedBy(i, owner));
  if (item.kind === "void") {
    return after.some((i) => i.kind === "void" && i.idempotencyKey === item.idempotencyKey);
  }
  // An edit dropped because a delete is already queued counts as accepted:
  // the event is going away, so nothing is lost.
  return after.some(
    (i) =>
      (i.kind === "event_update" || i.kind === "void") &&
      i.idempotencyKey === item.idempotencyKey,
  );
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

  // Items belonging to other accounts (or legacy ownerless items) are retained
  // untouched: their user_id must never be rewritten to the current user.
  const remaining: QueueItem[] = q.filter((item) => !ownedBy(item, user.id));
  const mine = q.filter((item) => ownedBy(item, user.id));
  let flushed = 0;
  for (const item of mine) {
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
      } else if (item.kind === "event_update") {
        const { data, error } = await supabase
          .from("study_events")
          .update(item.payload as never)
          .eq("user_id", user.id)
          .eq("idempotency_key", item.idempotencyKey)
          .is("voided_at", null)
          .select("id");
        // Zero matches is NOT success: a preceding queued insert may not have
        // landed yet, so keep the item rather than diverge from the mirror.
        if (classifyUpdateReplay({ error: error ?? undefined, matched: data?.length ?? 0 }) === "retain") {
          remaining.push(item);
          continue;
        }
      } else {
        const { data, error } = await supabase
          .from("study_events")
          .update({ voided_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("idempotency_key", item.idempotencyKey)
          .is("voided_at", null)
          .select("id");
        let existing: { error?: unknown; total: number; voided: number } | undefined;
        if (!error && (data?.length ?? 0) === 0) {
          // Already voided by an earlier replay? That is idempotent success.
          const probe = await supabase
            .from("study_events")
            .select("id,voided_at")
            .eq("user_id", user.id)
            .eq("idempotency_key", item.idempotencyKey)
            .limit(2);
          const rows = (probe.data ?? []) as { voided_at: string | null }[];
          existing = {
            error: probe.error ?? undefined,
            total: rows.length,
            voided: rows.filter((r) => !!r.voided_at).length,
          };
        }
        if (
          classifyVoidReplay({ error: error ?? undefined, matched: data?.length ?? 0 }, existing) ===
          "retain"
        ) {
          remaining.push(item);
          continue;
        }
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
  // Owner is bound in the originating session, before any cloud attempt.
  let owner = currentLocalOwnerId();
  const known = ledger(owner)[input.idempotencyKey];
  // An action must never move in time merely because it was retried: when the
  // ledger already holds this key, its original loggedAt is the canonical basis.
  const occurredAt = canonicalOccurredAt(known?.loggedAt, input.occurredAt ?? null);
  const tz = currentTimezone();
  const localDate = localDateFor(occurredAt, tz);

  // 1. Legacy mirror (local, synchronous, idempotent on loggedAt).
  const loggedAt = known?.loggedAt ?? occurredAt.toISOString();
  const createdMirror = !known;
  let restoreConfidence: { module: string; value: number } | null = null;
  if (createdMirror) {
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
        restoreConfidence = { module: input.subject, value: before };
      }
      adjustModuleConfidence(input.subject, input.gradedAccuracy);
    }
    setLedger(input.idempotencyKey, entry, owner);
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
    owner = user.id;
    const { error } = await supabase
      .from("study_events")
      .upsert([{ ...payload, user_id: user.id }] as never, {
        onConflict: "user_id,idempotency_key",
        ignoreDuplicates: true,
      });
    if (error) throw error;
    return { ok: true, queued: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not save to your account yet";
    if (enqueueWrite({ kind: "event", payload }, owner)) {
      return { ok: false, queued: true, error: message };
    }
    // Nothing durable anywhere: roll the mirror back so the UI does not show a
    // session that no store will ever hold, and stay honestly retryable.
    if (createdMirror) {
      removeStudySession(loggedAt);
      if (restoreConfidence) setModuleConfidence(restoreConfidence.module, restoreConfidence.value);
      setLedger(input.idempotencyKey, null, owner);
    }
    return {
      ok: false,
      queued: false,
      error: "We couldn't save this to your account or to this device. Try again.",
    };
  }
}

/** Reverses a previously recorded action: voids the canonical row and undoes the legacy mirror. */
export async function voidStudyActivity(idempotencyKey: string): Promise<WriteResult> {
  let owner = currentLocalOwnerId();
  const entry = ledger(owner)[idempotencyKey];
  // The mirror is only unwound once the canonical void was accepted, so a
  // failed undo can never hide a session that still exists server-side.
  const unwindMirror = () => {
    if (!entry) return;
    removeStudySession(entry.loggedAt);
    if (entry.module && typeof entry.previousConfidence === "number") {
      setModuleConfidence(entry.module, entry.previousConfidence);
    }
    setLedger(idempotencyKey, null, owner);
  };

  try {
    const user = await waitForAuthUser();
    if (!user) throw new Error("not signed in");
    owner = user.id;
    const { error } = await supabase
      .from("study_events")
      .update({ voided_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("idempotency_key", idempotencyKey);
    if (error) throw error;
    unwindMirror();
    return { ok: true, queued: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Undo not synced yet";
    if (enqueueMutation({ kind: "void", idempotencyKey }, owner)) {
      unwindMirror();
      return { ok: false, queued: true, error: message };
    }
    return {
      ok: false,
      queued: false,
      error: "We couldn't record this undo yet, so nothing was changed.",
    };
  }
}

/** Records genuinely graded answers. Never call this for self-assessed exposure. */
export async function recordGradedAttempts(
  attempts: GradedAttemptInput[],
): Promise<WriteResult> {
  if (attempts.length === 0) return { ok: true, queued: false };
  let owner = currentLocalOwnerId();
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
    owner = user.id;
    const { error } = await supabase
      .from("graded_attempts")
      .upsert(rows.map((r) => ({ ...r, user_id: user.id })) as never, {
        onConflict: "user_id,idempotency_key",
        ignoreDuplicates: true,
      });
    if (error) throw error;
    return { ok: true, queued: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Results saved on this device only so far";
    if (enqueueWrite({ kind: "attempts", payload: rows }, owner)) {
      return { ok: false, queued: true, error: message };
    }
    return {
      ok: false,
      queued: false,
      error: "We couldn't save these results to your account or this device. Try again.",
    };
  }
}



// ───────── canonical edit / delete of a displayed legacy session

const EVENT_SNAPSHOT_COLUMNS = "id,idempotency_key,occurred_at,activity_type,source,metadata";

/**
 * Maps a displayed `StudySession.loggedAt` back to its canonical event.
 * Ledger first (exact); otherwise a strictly unambiguous owner-scoped lookup.
 */
export async function resolveCanonicalEventForSession(loggedAt: string): Promise<Resolution> {
  const key = resolveFromLedger(ledger(), loggedAt);
  let user: Awaited<ReturnType<typeof waitForAuthUser>> = null;
  try {
    user = await waitForAuthUser();
  } catch {
    user = null;
  }

  if (key) {
    if (!user) return { status: "mapped", idempotencyKey: key, via: "ledger" };
    const { data, error } = await supabase
      .from("study_events")
      .select(EVENT_SNAPSHOT_COLUMNS)
      .eq("user_id", user.id)
      .eq("idempotency_key", key)
      .is("voided_at", null)
      .limit(2);
    // Offline / transient read failure: the mapping itself is still trustworthy.
    if (error) return { status: "mapped", idempotencyKey: key, via: "ledger" };
    const rows = (data ?? []) as CanonicalEventSnapshot[];
    return {
      status: "mapped",
      idempotencyKey: key,
      via: "ledger",
      event: rows.length === 1 ? rows[0] : undefined,
    };
  }

  if (!user) {
    return {
      status: "error",
      error: "You need to be signed in and online to change this entry.",
    };
  }
  const { data, error } = await supabase
    .from("study_events")
    .select(EVENT_SNAPSHOT_COLUMNS)
    .eq("user_id", user.id)
    .eq("occurred_at", loggedAt)
    .is("voided_at", null)
    .limit(3);
  if (error) return { status: "error", error: error.message };
  return pickExactEventMatch((data ?? []) as CanonicalEventSnapshot[]);
}

async function updateEventRow(idempotencyKey: string, payload: Record<string, unknown>) {
  const user = await waitForAuthUser();
  if (!user) throw new Error("not signed in");
  const { data, error } = await supabase
    .from("study_events")
    .update(payload as never)
    .eq("user_id", user.id)
    .eq("idempotency_key", idempotencyKey)
    .is("voided_at", null)
    .select("id");
  if (error) throw error;
  if (!data || data.length !== 1) {
    throw noMatchError("No single matching study record was found, so nothing was changed.");
  }
}

async function voidEventRow(idempotencyKey: string) {
  const user = await waitForAuthUser();
  if (!user) throw new Error("not signed in");
  const { data, error } = await supabase
    .from("study_events")
    .update({ voided_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("idempotency_key", idempotencyKey)
    .is("voided_at", null)
    .select("id");
  if (error) throw error;
  if (!data || data.length !== 1) {
    throw noMatchError("No single matching study record was found, so nothing was removed.");
  }
}

function portFor(loggedAt: string, mirrorPatch: Partial<StudySession>): CanonicalPort {
  const owner = currentLocalOwnerId();
  return {
    resolve: resolveCanonicalEventForSession,
    update: updateEventRow,
    voidEvent: voidEventRow,
    queueUpdate: (key, payload) =>
      enqueueMutation({ kind: "event_update", idempotencyKey: key, payload }, owner),
    queueVoid: (key) => enqueueMutation({ kind: "void", idempotencyKey: key }, owner),
    mirrorUpdate: () => updateStudySession(loggedAt, mirrorPatch),
    mirrorRemove: () => {
      const key = resolveFromLedger(ledger(owner), loggedAt);
      removeStudySession(loggedAt);
      if (key) setLedger(key, null, owner);
    },
  };
}

/** Canonical edit of one displayed session. The mirror moves only with it. */
export function updateSessionCanonically(
  loggedAt: string,
  patch: EventPatch,
  mirrorPatch: Partial<StudySession>,
): Promise<MutationOutcome> {
  return commitSessionEdit(portFor(loggedAt, mirrorPatch), loggedAt, patch);
}

/** Canonical void of one displayed session. Graded answers are left intact. */
export function deleteSessionCanonically(loggedAt: string): Promise<MutationOutcome> {
  return commitSessionDelete(portFor(loggedAt, {}), loggedAt);
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

/**
 * Stable, non-reversible fingerprint for a question. Question text/prompts must
 * never be persisted in analytics tables, so we store this instead.
 */
export function questionFingerprint(...parts: (string | number | undefined | null)[]): string {
  const raw = parts
    .filter((p) => p !== undefined && p !== null && p !== "")
    .map((p) => String(p).trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    h1 = (h1 ^ c) * 16777619 >>> 0;
    h2 = (h2 + c * (i + 1)) >>> 0;
  }
  return `q_${h1.toString(36)}${h2.toString(36)}`;
}

