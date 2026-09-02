import { describe, expect, it, vi } from "vitest";
import {
  buildEventUpdatePayload,
  canonicalOccurredAt,
  classifyUpdateReplay,
  classifyVoidReplay,
  coalesceQueue,
  coalesceWriteQueue,
  commitSessionDelete,
  commitSessionEdit,
  deleteConfirmCopy,
  focusLogMessage,
  gradedEditNotice,
  gradedSafety,
  isGradedEvent,
  noMatchError,
  outcomeMessage,
  pickExactEventMatch,
  queueContainsWrite,
  resolveFromLedger,
  shouldMarkLogged,
  type CanonicalEventSnapshot,
  type AnyQueueItem,
  type CanonicalPort,
  type QueuedMutation,
  type Resolution,
} from "./canonical-edit";

const EVENT: CanonicalEventSnapshot = {
  id: "e1",
  idempotency_key: "focus:s_1",
  occurred_at: "2026-09-01T10:00:00.000Z",
  activity_type: "study",
  source: "focus_sprint",
  metadata: { origin: "focus" },
};

function makePort(over: Partial<CanonicalPort> = {}) {
  const calls = { update: 0, void: 0, queueUpdate: 0, queueVoid: 0, mirrorUpdate: 0, mirrorRemove: 0 };
  const port: CanonicalPort = {
    resolve: async (): Promise<Resolution> => ({
      status: "mapped",
      idempotencyKey: EVENT.idempotency_key,
      via: "ledger",
      event: EVENT,
    }),
    update: async () => {
      calls.update += 1;
    },
    voidEvent: async () => {
      calls.void += 1;
    },
    queueUpdate: () => {
      calls.queueUpdate += 1;
      return true;
    },
    queueVoid: () => {
      calls.queueVoid += 1;
      return true;
    },
    mirrorUpdate: () => {
      calls.mirrorUpdate += 1;
    },
    mirrorRemove: () => {
      calls.mirrorRemove += 1;
    },
    ...over,
  };
  return { port, calls };
}

describe("resolving a displayed legacy session to its canonical event", () => {
  it("prefers the local ledger's exact idempotency key", () => {
    const led = { "a:1": { loggedAt: "2026-09-01T10:00:00.000Z" }, "b:2": { loggedAt: "x" } };
    expect(resolveFromLedger(led, "2026-09-01T10:00:00.000Z")).toBe("a:1");
    expect(resolveFromLedger(led, "nope")).toBeNull();
  });

  it("refuses an ambiguous ledger mapping", () => {
    const led = { "a:1": { loggedAt: "t" }, "b:2": { loggedAt: "t" } };
    expect(resolveFromLedger(led, "t")).toBeNull();
  });

  it("uses the owner-scoped fallback only for an unambiguous single match", () => {
    expect(pickExactEventMatch([EVENT])).toEqual({
      status: "mapped",
      idempotencyKey: EVENT.idempotency_key,
      via: "occurred_at",
      event: EVENT,
    });
    expect(pickExactEventMatch([]).status).toBe("unmapped");
    expect(pickExactEventMatch([EVENT, { ...EVENT, id: "e2" }]).status).toBe("ambiguous");
  });
});

describe("canonical edit", () => {
  it("writes canonically and mirrors once when confirmed", async () => {
    const { port, calls } = makePort();
    const out = await commitSessionEdit(port, EVENT.occurred_at, { actualMinutes: 42 });
    expect(out).toEqual({ status: "confirmed" });
    expect(calls.update).toBe(1);
    expect(calls.mirrorUpdate).toBe(1);
    expect(calls.queueUpdate).toBe(0);
  });

  it("queues the canonical update before moving the mirror when offline", async () => {
    const { port, calls } = makePort({
      update: async () => {
        throw new Error("offline");
      },
    });
    const out = await commitSessionEdit(port, EVENT.occurred_at, { actualMinutes: 42 });
    expect(out.status).toBe("queued");
    expect(calls.queueUpdate).toBe(1);
    expect(calls.mirrorUpdate).toBe(1);
    expect(outcomeMessage(out, "update")).toBe("Updated on this device — sync pending");
  });

  it("never touches the mirror when the canonical write is neither saved nor queued", async () => {
    const { port, calls } = makePort({
      update: async () => {
        throw new Error("offline");
      },
      queueUpdate: () => false,
    });
    const out = await commitSessionEdit(port, EVENT.occurred_at, { actualMinutes: 42 });
    expect(out.status).toBe("failed");
    expect(calls.mirrorUpdate).toBe(0);
  });

  it("refuses unmapped and ambiguous rows without pretending to update", async () => {
    for (const status of ["unmapped", "ambiguous"] as const) {
      const { port, calls } = makePort({ resolve: async () => ({ status }) });
      const out = await commitSessionEdit(port, "t", { actualMinutes: 5 });
      expect(out).toEqual({ status: "failed", reason: status, error: undefined });
      expect(calls.update + calls.queueUpdate + calls.mirrorUpdate).toBe(0);
      expect(outcomeMessage(out, "update")).toMatch(/can't be changed|won't guess/);
    }
  });

  it("treats a verified no-matching-row write as failure, not something to queue", async () => {
    const { port, calls } = makePort({
      update: async () => {
        throw noMatchError("nothing matched");
      },
    });
    const out = await commitSessionEdit(port, EVENT.occurred_at, { actualMinutes: 9 });
    expect(out.status).toBe("failed");
    expect(out.reason).toBe("unmapped");
    expect(calls.queueUpdate).toBe(0);
    expect(calls.mirrorUpdate).toBe(0);
  });

  it("builds a payload of safe columns only and merges metadata notes", () => {
    const payload = buildEventUpdatePayload(
      { actualMinutes: 30.6, subject: "Contract", activityType: "review", selfMood: 4, note: "recap" },
      EVENT,
    );
    expect(payload).toEqual({
      actual_minutes: 31,
      subject: "Contract",
      activity_type: "review",
      self_mood: 4,
      metadata: { origin: "focus", note: "recap" },
    });
    // Occurrence time is never edited, so local_date/timezone cannot drift.
    expect(payload).not.toHaveProperty("occurred_at");
    expect(payload).not.toHaveProperty("local_date");
    expect(payload).not.toHaveProperty("timezone");
    expect(buildEventUpdatePayload({}, EVENT)).toEqual({});
  });
});

describe("canonical delete", () => {
  it("voids the event and removes the mirror", async () => {
    const { port, calls } = makePort();
    const out = await commitSessionDelete(port, EVENT.occurred_at);
    expect(out).toEqual({ status: "confirmed" });
    expect(calls.void).toBe(1);
    expect(calls.mirrorRemove).toBe(1);
  });

  it("leaves the visible session intact when the void was not queued", async () => {
    const { port, calls } = makePort({
      voidEvent: async () => {
        throw new Error("offline");
      },
      queueVoid: () => false,
    });
    const out = await commitSessionDelete(port, EVENT.occurred_at);
    expect(out.status).toBe("failed");
    expect(calls.mirrorRemove).toBe(0);
  });

  it("describes graded semantics honestly", () => {
    expect(isGradedEvent({ activity_type: "quiz", source: "practice" })).toBe(true);
    expect(isGradedEvent({ activity_type: "study", source: "mock" })).toBe(true);
    expect(isGradedEvent({ activity_type: "study", source: "focus_sprint" })).toBe(false);
    expect(isGradedEvent(null)).toBe(false);
    expect(deleteConfirmCopy(true)).toMatch(/scored answers and performance history are kept/i);
    expect(deleteConfirmCopy(false)).toMatch(/canonical study event/i);
  });
});

describe("offline queue coalescing", () => {
  const edit = (payload: Record<string, unknown>): QueuedMutation => ({
    kind: "event_update",
    idempotencyKey: "k",
    payload,
  });
  const del: QueuedMutation = { kind: "void", idempotencyKey: "k" };

  it("merges repeated edits instead of duplicating queue work", () => {
    let q = coalesceQueue([], edit({ actual_minutes: 10 }));
    q = coalesceQueue(q, edit({ actual_minutes: 20, subject: "Tort" }));
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ payload: { actual_minutes: 20, subject: "Tort" } });
  });

  it("lets a later delete supersede a queued edit for the same event", () => {
    let q = coalesceQueue([], edit({ actual_minutes: 10 }));
    q = coalesceQueue(q, del);
    expect(q).toEqual([del]);
    // Repeated delete clicks stay a single item.
    expect(coalesceQueue(q, del)).toEqual([del]);
  });

  it("drops an edit queued after a delete", () => {
    const q = coalesceQueue([del], edit({ actual_minutes: 99 }));
    expect(q).toEqual([del]);
  });

  it("does not disturb other events' queued work", () => {
    const other: QueuedMutation = { kind: "void", idempotencyKey: "other" };
    expect(coalesceQueue([other], del)).toEqual([other, del]);
  });
});

describe("focus completion acceptance", () => {
  it("only marks logged after confirmation or durable queueing", () => {
    expect(shouldMarkLogged({ ok: true, queued: false })).toBe(true);
    expect(shouldMarkLogged({ ok: false, queued: true })).toBe(true);
    // Crash window: nothing accepted => session must stay retryable.
    expect(shouldMarkLogged({ ok: false, queued: false })).toBe(false);
  });

  it("distinguishes account-saved from device-saved copy", () => {
    expect(focusLogMessage({ ok: true, queued: false }, 25)).toBe("Logged 25 min to your account.");
    expect(focusLogMessage({ ok: false, queued: true }, 25)).toBe(
      "Saved 25 min on this device — will sync.",
    );
    expect(focusLogMessage({ ok: false, queued: false }, 25)).toMatch(/couldn't save/i);
  });

  it("keeps a retry idempotent by reusing the same sessionId", async () => {
    const seen: string[] = [];
    const record = vi.fn(async ({ idempotencyKey }: { idempotencyKey: string }) => {
      seen.push(idempotencyKey);
      return seen.length === 1 ? { ok: false, queued: false } : { ok: true, queued: false };
    });
    const sessionId = "s_abc";
    let first = await record({ idempotencyKey: sessionId });
    expect(shouldMarkLogged(first)).toBe(false);
    const second = await record({ idempotencyKey: sessionId });
    expect(shouldMarkLogged(second)).toBe(true);
    expect(seen).toEqual([sessionId, sessionId]);
    void first;
  });
});

// ───────── follow-up integrity: durable queue, replay, graded safety, timing

describe("coalesceWriteQueue / queueContainsWrite", () => {
  const ev = (key: string, minutes = 10) => ({
    kind: "event" as const,
    payload: { idempotency_key: key, actual_minutes: minutes },
  });
  const at = (keys: string[]) => ({
    kind: "attempts" as const,
    payload: keys.map((k) => ({ idempotency_key: k })),
  });

  it("replaces an event item with the same idempotency key instead of growing", () => {
    let q: AnyQueueItem[] = [];
    q = coalesceWriteQueue(q, ev("a", 10));
    q = coalesceWriteQueue(q, ev("a", 25));
    expect(q).toHaveLength(1);
    expect((q[0] as unknown as { payload: { actual_minutes: number } }).payload.actual_minutes).toBe(25);
  });

  it("keeps distinct events separate", () => {
    let q: AnyQueueItem[] = [];
    q = coalesceWriteQueue(q, ev("a"));
    q = coalesceWriteQueue(q, ev("b"));
    expect(q).toHaveLength(2);
    expect(queueContainsWrite(q, ev("b"))).toBe(true);
    expect(queueContainsWrite(q, ev("c"))).toBe(false);
  });

  it("replaces an attempts batch only when the key set matches exactly", () => {
    let q: AnyQueueItem[] = [];
    q = coalesceWriteQueue(q, at(["q1", "q2"]));
    q = coalesceWriteQueue(q, at(["q2", "q1"]));
    expect(q).toHaveLength(1);
    q = coalesceWriteQueue(q, at(["q1", "q3"]));
    expect(q).toHaveLength(2);
    expect(queueContainsWrite(q, at(["q1", "q2", "q3"]))).toBe(true);
    expect(queueContainsWrite(q, at(["q9"]))).toBe(false);
  });
});

describe("replay classification", () => {
  it("only counts an update as flushed on exactly one owner-scoped match", () => {
    expect(classifyUpdateReplay({ matched: 1 })).toBe("flushed");
    expect(classifyUpdateReplay({ matched: 0 })).toBe("retain");
    expect(classifyUpdateReplay({ matched: 2 })).toBe("retain");
    expect(classifyUpdateReplay({ matched: 1, error: new Error("nope") })).toBe("retain");
  });

  it("treats an already-voided exact event as idempotent success", () => {
    expect(classifyVoidReplay({ matched: 1 })).toBe("flushed");
    expect(classifyVoidReplay({ matched: 0 }, { total: 1, voided: 1 })).toBe("flushed");
  });

  it("retains a void replay on zero, multiple or unreadable candidates", () => {
    expect(classifyVoidReplay({ matched: 0 }, { total: 0, voided: 0 })).toBe("retain");
    expect(classifyVoidReplay({ matched: 0 }, { total: 2, voided: 2 })).toBe("retain");
    expect(classifyVoidReplay({ matched: 0 }, { total: 1, voided: 1, error: new Error("x") })).toBe("retain");
    expect(classifyVoidReplay({ matched: 0 })).toBe("retain");
    expect(classifyVoidReplay({ matched: 3 })).toBe("retain");
  });
});

describe("gradedSafety", () => {
  const quizEvent: CanonicalEventSnapshot = { ...EVENT, activity_type: "quiz", source: "practice" };

  it("treats a displayed quiz/mock as graded even with no snapshot", () => {
    const s = gradedSafety({ displayedType: "quiz", resolution: { status: "mapped", idempotencyKey: "k", via: "ledger" } });
    expect(s.graded).toBe(true);
    expect(s.snapshotAvailable).toBe(false);
    expect(s.canEditNote).toBe(false);
    expect(s.canEditType).toBe(false);
    expect(deleteConfirmCopy(s.graded)).toContain("scored answers");
  });

  it("locks note/type for a non-graded row when the snapshot is unavailable", () => {
    const s = gradedSafety({ displayedType: "study", resolution: { status: "mapped", idempotencyKey: "k", via: "ledger" } });
    expect(s.graded).toBe(false);
    expect(s.canEditNote).toBe(false);
    expect(s.canEditType).toBe(false);
    expect(gradedEditNotice(s.graded, s.snapshotAvailable)).toContain("locked");
  });

  it("unlocks note/type only for a non-graded row with a snapshot", () => {
    const s = gradedSafety({ displayedType: "study", resolution: { status: "mapped", idempotencyKey: "k", via: "ledger", event: EVENT } });
    expect(s).toMatchObject({ graded: false, snapshotAvailable: true, canEditNote: true, canEditType: true });
    expect(gradedEditNotice(s.graded, s.snapshotAvailable)).toBeNull();
  });

  it("still detects graded from the snapshot when the displayed type looks plain", () => {
    const s = gradedSafety({ displayedType: "study", resolution: { status: "mapped", idempotencyKey: "k", via: "ledger", event: quizEvent } });
    expect(s.graded).toBe(true);
    expect(s.canEditNote).toBe(false);
  });
});

describe("buildEventUpdatePayload metadata backstop", () => {
  it("never replaces metadata when no snapshot was read", () => {
    const out = buildEventUpdatePayload({ note: "hello", actualMinutes: 30 }, undefined);
    expect(out.metadata).toBeUndefined();
    expect(out.actual_minutes).toBe(30);
  });

  it("merges onto the existing metadata when the snapshot is present", () => {
    const out = buildEventUpdatePayload({ note: "hello" }, EVENT);
    expect(out.metadata).toEqual({ origin: "focus", note: "hello" });
  });

  it("keeps top-level fields editable without a snapshot", () => {
    const out = buildEventUpdatePayload({ subject: "Contract", selfMood: 4 }, null);
    expect(out).toEqual({ subject: "Contract", self_mood: 4 });
  });
});

describe("canonicalOccurredAt", () => {
  it("uses the ledger's original time so a retry cannot move the action", () => {
    const original = "2026-09-01T23:45:00.000Z";
    const later = new Date("2026-09-02T00:10:00.000Z");
    expect(canonicalOccurredAt(original, null, later).toISOString()).toBe(original);
  });

  it("does not cross a day boundary on retry", () => {
    const original = "2026-09-01T23:59:00.000Z";
    const retryNow = new Date("2026-09-02T00:01:00.000Z");
    const got = canonicalOccurredAt(original, null, retryNow);
    expect(got.toISOString().slice(0, 10)).toBe("2026-09-01");
  });

  it("falls back to the supplied time, then now, for a brand-new action", () => {
    const supplied = new Date("2026-08-30T09:00:00.000Z");
    expect(canonicalOccurredAt(undefined, supplied, new Date()).toISOString()).toBe(
      supplied.toISOString(),
    );
    const now = new Date("2026-08-31T09:00:00.000Z");
    expect(canonicalOccurredAt(undefined, null, now)).toBe(now);
    expect(canonicalOccurredAt("not-a-date", null, now)).toBe(now);
  });
});

describe("focus acceptance", () => {
  it("keeps a session retryable when the write was neither saved nor queued", () => {
    expect(shouldMarkLogged({ ok: false, queued: false })).toBe(false);
    expect(focusLogMessage({ ok: false, queued: false }, 25)).toContain("Try again");
  });

  it("accepts a verified queued write", () => {
    expect(shouldMarkLogged({ ok: false, queued: true })).toBe(true);
  });
});
