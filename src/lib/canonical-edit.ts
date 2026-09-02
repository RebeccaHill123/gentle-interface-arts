// Canonical-edit orchestration for legacy-mirror session rows.
//
// Policy: `study_events` is canonical; `StoredPlan.sessions` is a compatibility
// mirror. Any edit or delete a student performs on a displayed legacy session
// must therefore resolve back to the canonical event and mutate THAT, with the
// mirror kept in step as part of the same action.
//
// Everything in this module is transport-free: the Supabase adapters live in
// `study-log.ts` and are injected as a port, so the invariants below are
// directly testable.

export interface EventPatch {
  actualMinutes?: number;
  subject?: string | null;
  activityType?: string;
  selfMood?: number | null;
  /** Short display label mirrored into event metadata (never PII). */
  note?: string | null;
}

export interface CanonicalEventSnapshot {
  id: string;
  idempotency_key: string;
  occurred_at: string;
  activity_type: string;
  source: string;
  metadata?: Record<string, unknown> | null;
}

export type Resolution =
  | {
      status: "mapped";
      idempotencyKey: string;
      via: "ledger" | "occurred_at";
      event?: CanonicalEventSnapshot;
    }
  /** No canonical event exists for this displayed row (truly legacy-only). */
  | { status: "unmapped" }
  /** More than one canonical event shares the timestamp — refuse to guess. */
  | { status: "ambiguous" }
  | { status: "error"; error: string };

export type FailureReason = "unmapped" | "ambiguous" | "error";

export interface MutationOutcome {
  status: "confirmed" | "queued" | "failed";
  reason?: FailureReason;
  error?: string;
}

/** Ports the repository supplies. `update`/`void` MUST throw on any failure. */
export interface CanonicalPort {
  resolve: (loggedAt: string) => Promise<Resolution>;
  update: (idempotencyKey: string, payload: Record<string, unknown>) => Promise<void>;
  voidEvent: (idempotencyKey: string) => Promise<void>;
  /** Durable offline queue. Returns false when the item could not be persisted. */
  queueUpdate: (idempotencyKey: string, payload: Record<string, unknown>) => boolean;
  queueVoid: (idempotencyKey: string) => boolean;
  /** Compatibility mirror, applied only alongside an accepted canonical write. */
  mirrorUpdate: () => void;
  mirrorRemove: () => void;
}

// ───────── pure resolution helpers

export interface LedgerLike {
  [idempotencyKey: string]: { loggedAt: string };
}

/** Prefer the local ledger: it maps a mirror row to its canonical key exactly. */
export function resolveFromLedger(led: LedgerLike, loggedAt: string): string | null {
  const hits = Object.entries(led).filter(([, e]) => e?.loggedAt === loggedAt);
  return hits.length === 1 ? hits[0][0] : null;
}

/**
 * Fallback for a cleared ledger / new device: only an unambiguous single
 * owner-scoped match on `occurred_at` may be used.
 */
export function pickExactEventMatch(rows: CanonicalEventSnapshot[]): Resolution {
  if (rows.length === 0) return { status: "unmapped" };
  if (rows.length > 1) return { status: "ambiguous" };
  return { status: "mapped", idempotencyKey: rows[0].idempotency_key, via: "occurred_at", event: rows[0] };
}

// ───────── graded safety

const GRADED_ACTIVITY = ["quiz", "mock"];
const GRADED_SOURCE = ["practice", "mock"];

/**
 * True when the event's correctness lives in `graded_attempts`/`mock_answers`.
 * Those rows must never be silently desynchronised by this form.
 */
export function isGradedEvent(
  e?: Pick<CanonicalEventSnapshot, "activity_type" | "source"> | null,
): boolean {
  if (!e) return false;
  return GRADED_ACTIVITY.includes(e.activity_type) || GRADED_SOURCE.includes(e.source);
}

export function gradedEditNotice(graded: boolean): string | null {
  return graded
    ? "Scored answers for this session are stored separately, so accuracy, type and result notes can't be edited here."
    : null;
}

export function deleteConfirmCopy(graded: boolean): string {
  return graded
    ? "This removes the study-time, feed and streak entry for this session. Your scored answers and performance history are kept, so accuracy and analytics stay accurate."
    : "This voids the canonical study event, so minutes, streaks and analytics all update. This can't be undone.";
}

// ───────── payload building

/** Columns that are safe to edit. Occurrence time is never changed here, so
 * `local_date`/`timezone` stay correct by construction. */
export function buildEventUpdatePayload(
  patch: EventPatch,
  event?: CanonicalEventSnapshot | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (typeof patch.actualMinutes === "number") {
    out.actual_minutes = Math.max(0, Math.round(patch.actualMinutes));
  }
  if (patch.subject !== undefined) out.subject = patch.subject || null;
  if (patch.activityType !== undefined) out.activity_type = patch.activityType;
  if (patch.selfMood !== undefined) {
    out.self_mood = typeof patch.selfMood === "number" ? patch.selfMood : null;
  }
  if (patch.note !== undefined) {
    const base = (event?.metadata ?? {}) as Record<string, unknown>;
    out.metadata = { ...base, note: patch.note ? String(patch.note).slice(0, 120) : null };
  }
  return out;
}

// ───────── offline queue coalescing (pure)

export type QueuedMutation =
  | { kind: "event_update"; idempotencyKey: string; payload: Record<string, unknown> }
  | { kind: "void"; idempotencyKey: string };

export type AnyQueueItem = QueuedMutation | { kind: string; [k: string]: unknown };

function isMine(i: AnyQueueItem, key: string): boolean {
  return (
    (i.kind === "event_update" || i.kind === "void") &&
    (i as QueuedMutation).idempotencyKey === key
  );
}

/**
 * Invariants:
 *  - repeated clicks never grow the queue: same-kind items merge;
 *  - a later delete supersedes any queued edit for the same event;
 *  - an edit after a queued delete is dropped (the event is going away).
 */
export function coalesceQueue(queue: AnyQueueItem[], item: QueuedMutation): AnyQueueItem[] {
  const key = item.idempotencyKey;
  if (item.kind === "void") {
    return [...queue.filter((i) => !isMine(i, key)), item];
  }
  if (queue.some((i) => i.kind === "void" && (i as QueuedMutation).idempotencyKey === key)) {
    return queue;
  }
  const existing = queue.find((i) => i.kind === "event_update" && isMine(i, key)) as
    | Extract<QueuedMutation, { kind: "event_update" }>
    | undefined;
  if (existing) {
    return queue.map((i) =>
      i === existing ? { ...existing, payload: { ...existing.payload, ...item.payload } } : i,
    );
  }
  return [...queue, item];
}

// ───────── orchestration

async function commit(
  port: CanonicalPort,
  loggedAt: string,
  run: (key: string, event?: CanonicalEventSnapshot) => Promise<void>,
  queue: (key: string, event?: CanonicalEventSnapshot) => boolean,
  mirror: () => void,
): Promise<MutationOutcome> {
  const res = await port.resolve(loggedAt);
  if (res.status !== "mapped") {
    return {
      status: "failed",
      reason: res.status,
      error: res.status === "error" ? res.error : undefined,
    };
  }
  try {
    await run(res.idempotencyKey, res.event);
    mirror();
    return { status: "confirmed" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not reach your account";
    if (queue(res.idempotencyKey, res.event)) {
      // Durably queued, so the mirror may move now — it will be reconciled.
      mirror();
      return { status: "queued", error: message };
    }
    return { status: "failed", reason: "error", error: message };
  }
}

export function commitSessionEdit(
  port: CanonicalPort,
  loggedAt: string,
  patch: EventPatch,
): Promise<MutationOutcome> {
  return commit(
    port,
    loggedAt,
    (key, event) => port.update(key, buildEventUpdatePayload(patch, event)),
    (key, event) => port.queueUpdate(key, buildEventUpdatePayload(patch, event)),
    port.mirrorUpdate,
  );
}

export function commitSessionDelete(
  port: CanonicalPort,
  loggedAt: string,
): Promise<MutationOutcome> {
  return commit(
    port,
    loggedAt,
    (key) => port.voidEvent(key),
    (key) => port.queueVoid(key),
    port.mirrorRemove,
  );
}

/** Honest, non-overclaiming copy for each outcome. */
export function outcomeMessage(
  outcome: MutationOutcome,
  action: "update" | "delete",
): string {
  if (outcome.status === "confirmed") {
    return action === "update" ? "Session updated" : "Session deleted";
  }
  if (outcome.status === "queued") {
    return action === "update"
      ? "Updated on this device — sync pending"
      : "Deleted on this device — sync pending";
  }
  if (outcome.reason === "unmapped") {
    return "This is an older entry with no linked study record, so it can't be changed here.";
  }
  if (outcome.reason === "ambiguous") {
    return "We found more than one study record at this exact time, so we won't guess which to change.";
  }
  return outcome.error ?? "Something went wrong — nothing was changed.";
}

// ───────── focus completion acceptance (pure state machine)

export type AcceptanceInput = { ok: boolean; queued: boolean };

/**
 * A focus session may only be marked logged once the canonical write was
 * accepted (server confirmed) or durably queued. A crash before acceptance
 * therefore leaves the session retryable, and the retry reuses `sessionId`
 * so it stays idempotent.
 */
export function shouldMarkLogged(result: AcceptanceInput): boolean {
  return result.ok || result.queued;
}

export function focusLogMessage(result: AcceptanceInput, minutes: number): string {
  if (result.ok) return `Logged ${minutes} min to your account.`;
  if (result.queued) return `Saved ${minutes} min on this device — will sync.`;
  return "We couldn't save this session yet. Try again.";
}
