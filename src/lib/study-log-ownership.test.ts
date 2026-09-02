// Cross-account data boundaries for offline study work on a shared browser.
//
// The invariant: a queued write belongs to the account that made it. Signing in
// as somebody else must never upload, rewrite, or consume another user's queued
// events, attempts, edits, voids, or ledger mappings.
import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeStorage {
  map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  get length() {
    return this.map.size;
  }
}

const storage = new FakeStorage();
vi.stubGlobal("window", { localStorage: storage } as unknown as Window);
vi.stubGlobal("localStorage", storage);

const state = {
  upsertError: null as Error | null,
  updateError: null as Error | null,
  user: { id: "user-a" } as { id: string } | null,
  upserts: [] as { table: string; rows: Record<string, unknown>[] }[],
  updates: [] as { table: string }[],
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      upsert: async (rows: Record<string, unknown>[]) => {
        if (!state.upsertError) state.upserts.push({ table, rows });
        return { error: state.upsertError };
      },
      update: () => {
        state.updates.push({ table });
        const self: Record<string, unknown> = {};
        const proxy = new Proxy(self, {
          get(_t, prop) {
            if (prop === "then") {
              return (res: (v: unknown) => unknown) =>
                Promise.resolve({ data: [], error: state.updateError }).then(res);
            }
            return () => proxy;
          },
        });
        return proxy;
      },
    }),
  },
}));

vi.mock("@/lib/auth-session", () => ({
  waitForAuthUser: async () => state.user,
  getCachedAuthOwnerId: () => state.user?.id ?? null,
}));

vi.mock("@/lib/plan-store", () => ({
  addLegacySession: vi.fn(),
  removeStudySession: vi.fn(),
  updateStudySession: vi.fn(),
  setModuleConfidence: vi.fn(),
  adjustModuleConfidence: vi.fn(),
  loadPlan: vi.fn(() => null),
}));

const {
  flushStudyLogQueue,
  pendingWriteCount,
  recordGradedAttempts,
  recordStudyActivity,
  voidStudyActivity,
} = await import("./study-log");

const QUEUE_KEY = "tentra.studylog.queue.v1";
const LEDGER_KEY = "tentra.studylog.ledger.v1";

function queue() {
  return JSON.parse(storage.getItem(QUEUE_KEY) ?? "[]") as { ownerUserId?: string; kind: string }[];
}

const ACTIVITY = {
  idempotencyKey: "focus:s_1",
  activityType: "study" as const,
  source: "focus_sprint" as const,
  actualMinutes: 25,
};

beforeEach(() => {
  storage.clear();
  state.upsertError = null;
  state.updateError = null;
  state.user = { id: "user-a" };
  state.upserts = [];
  state.updates = [];
});

describe("queued writes are owner-bound", () => {
  it("tags queued events with the originating account", async () => {
    state.upsertError = new Error("offline");
    await recordStudyActivity(ACTIVITY);
    expect(queue()).toHaveLength(1);
    expect(queue()[0].ownerUserId).toBe("user-a");
  });

  it("tags queued graded attempts with the originating account", async () => {
    state.upsertError = new Error("offline");
    await recordGradedAttempts([
      {
        idempotencyKey: "practice:q1",
        sourceType: "practice" as const,
        questionFingerprint: "q1",
        isCorrect: true,
      },
    ]);
    expect(queue()[0]).toMatchObject({ kind: "attempts", ownerUserId: "user-a" });
  });

  it("tags queued voids with the originating account", async () => {
    state.updateError = new Error("offline");
    await voidStudyActivity("focus:s_1");
    expect(queue()[0]).toMatchObject({ kind: "void", ownerUserId: "user-a" });
  });

  it("does not queue at all when no owner can be established", async () => {
    state.user = null;
    state.upsertError = new Error("offline");
    const r = await recordStudyActivity(ACTIVITY);
    expect(r).toMatchObject({ ok: false, queued: false });
    expect(queue()).toHaveLength(0);
  });
});

describe("flush is owner-scoped", () => {
  async function queueAs(id: string, key: string) {
    state.user = { id };
    state.upsertError = new Error("offline");
    await recordStudyActivity({ ...ACTIVITY, idempotencyKey: key });
    state.upsertError = null;
  }

  it("uploads only the current account's items and leaves others untouched", async () => {
    await queueAs("user-a", "focus:a1");
    await queueAs("user-b", "focus:b1");
    expect(queue()).toHaveLength(2);

    state.user = { id: "user-b" };
    const r = await flushStudyLogQueue();
    expect(r).toEqual({ flushed: 1, remaining: 1 });
    // Only B's payload reached the server, under B's id.
    expect(state.upserts).toHaveLength(1);
    expect(state.upserts[0].rows[0]).toMatchObject({
      user_id: "user-b",
      idempotency_key: "focus:b1",
    });
    // A's item survives, still owned by A.
    expect(queue()).toEqual([expect.objectContaining({ ownerUserId: "user-a" })]);
  });

  it("never uploads a legacy ownerless queue item", async () => {
    storage.setItem(
      QUEUE_KEY,
      JSON.stringify([{ kind: "event", payload: { idempotency_key: "legacy:1" } }]),
    );
    state.user = { id: "user-b" };
    const r = await flushStudyLogQueue();
    expect(state.upserts).toHaveLength(0);
    expect(r).toEqual({ flushed: 0, remaining: 1 });
  });

  it("counts only the current account's pending writes", async () => {
    await queueAs("user-a", "focus:a1");
    await queueAs("user-b", "focus:b1");
    state.user = { id: "user-a" };
    expect(pendingWriteCount()).toBe(1);
  });
});

describe("ledger is owner-scoped", () => {
  it("does not reuse another account's mapping for the same key", async () => {
    state.upsertError = new Error("offline");
    state.user = { id: "user-a" };
    await recordStudyActivity(ACTIVITY);
    const ledger = JSON.parse(storage.getItem(LEDGER_KEY) as string) as Record<
      string,
      { ownerUserId?: string }
    >;
    expect(ledger[ACTIVITY.idempotencyKey].ownerUserId).toBe("user-a");

    // B records the same idempotency key: A's mapping must not be overwritten.
    state.user = { id: "user-b" };
    await recordStudyActivity(ACTIVITY);
    const after = JSON.parse(storage.getItem(LEDGER_KEY) as string) as Record<
      string,
      { ownerUserId?: string }
    >;
    expect(after[ACTIVITY.idempotencyKey].ownerUserId).toBe("user-a");
  });
});
