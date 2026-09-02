import { describe, expect, it, vi } from "vitest";
import {
  buildEventUpdatePayload,
  coalesceQueue,
  commitSessionDelete,
  commitSessionEdit,
  deleteConfirmCopy,
  focusLogMessage,
  isGradedEvent,
  noMatchError,
  outcomeMessage,
  pickExactEventMatch,
  resolveFromLedger,
  shouldMarkLogged,
  type CanonicalEventSnapshot,
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
