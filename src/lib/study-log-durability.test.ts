// Durability semantics for the canonical study-log repository.
//
// The invariant under test: "queued" must mean durably present. When
// localStorage rejects the write (storage full / private mode / disabled),
// callers must be told nothing was accepted, and the compatibility mirror must
// not be left showing a session that no store will ever hold.
import { beforeEach, describe, expect, it, vi } from "vitest";

// ───────── fake localStorage with a switchable rejection mode

class FakeStorage {
  map = new Map<string, string>();
  rejectWrites = false;
  getItem(k: string): string | null {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string): void {
    if (this.rejectWrites) {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      throw err;
    }
    this.map.set(k, v);
  }
  removeItem(k: string): void {
    this.map.delete(k);
  }
  clear(): void {
    this.map.clear();
  }
}

const storage = new FakeStorage();
vi.stubGlobal("window", { localStorage: storage } as unknown as Window);
vi.stubGlobal("localStorage", storage);

// ───────── transport + mirror mocks

const state = { upsertError: null as Error | null, updateError: null as Error | null, user: { id: "u1" } as { id: string } | null };

function builder() {
  const chain: Record<string, unknown> = {};
  const self = new Proxy(chain, {
    get(_t, prop) {
      if (prop === "then") {
        return (res: (v: unknown) => unknown) =>
          Promise.resolve({ data: [], error: state.updateError }).then(res);
      }
      return () => self;
    },
  });
  return self as unknown as { eq: (...a: unknown[]) => unknown };
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      upsert: async () => ({ error: state.upsertError }),
      update: () => builder(),
      select: () => builder(),
    }),
  },
}));

vi.mock("@/lib/auth-session", () => ({
  waitForAuthUser: async () => state.user,
}));

const mirror = {
  addLegacySession: vi.fn(),
  removeStudySession: vi.fn(),
  updateStudySession: vi.fn(),
  setModuleConfidence: vi.fn(),
  adjustModuleConfidence: vi.fn(),
  loadPlan: vi.fn(() => null),
};
vi.mock("@/lib/plan-store", () => mirror);

const { pendingWriteCount, recordGradedAttempts, recordStudyActivity } = await import("./study-log");

const ACTIVITY = {
  idempotencyKey: "focus:s_1",
  activityType: "study" as const,
  source: "focus_sprint" as const,
  actualMinutes: 25,
};

const ATTEMPT = {
  idempotencyKey: "practice:q1",
  sourceType: "practice" as const,
  questionFingerprint: "q_abc",
  isCorrect: true,
};

beforeEach(() => {
  storage.clear();
  storage.rejectWrites = false;
  state.upsertError = null;
  state.updateError = null;
  state.user = { id: "u1" };
  Object.values(mirror).forEach((fn) => (fn as { mockClear: () => void }).mockClear());
  mirror.loadPlan.mockReturnValue(null);
});

describe("recordStudyActivity durability", () => {
  it("confirms when the canonical upsert succeeds", async () => {
    const r = await recordStudyActivity(ACTIVITY);
    expect(r).toEqual({ ok: true, queued: false });
    expect(pendingWriteCount()).toBe(0);
  });

  it("queues when the transport fails but storage accepts", async () => {
    state.upsertError = new Error("offline");
    const r = await recordStudyActivity(ACTIVITY);
    expect(r.ok).toBe(false);
    expect(r.queued).toBe(true);
    expect(pendingWriteCount()).toBe(1);
    expect(mirror.removeStudySession).not.toHaveBeenCalled();
  });

  it("reports NOT queued and rolls the mirror back when storage rejects the write", async () => {
    state.upsertError = new Error("offline");
    storage.rejectWrites = true;
    const r = await recordStudyActivity(ACTIVITY);
    expect(r).toMatchObject({ ok: false, queued: false });
    // The mirror row we optimistically added must be unwound.
    expect(mirror.removeStudySession).toHaveBeenCalledTimes(1);
  });

  it("does not grow the queue when the same action is retried", async () => {
    state.upsertError = new Error("offline");
    await recordStudyActivity(ACTIVITY);
    await recordStudyActivity(ACTIVITY);
    await recordStudyActivity(ACTIVITY);
    expect(pendingWriteCount()).toBe(1);
  });

  it("keeps the original occurrence time across retries", async () => {
    state.upsertError = new Error("offline");
    const first = new Date("2026-09-01T23:30:00.000Z");
    await recordStudyActivity({ ...ACTIVITY, occurredAt: first });
    const queued = JSON.parse(storage.getItem("tentra.studylog.queue.v1") as string) as {
      payload: { occurred_at: string };
    }[];
    const firstOccurred = queued[0].payload.occurred_at;
    // A later retry (different wall clock, no explicit time) must not move it.
    await recordStudyActivity(ACTIVITY);
    const again = JSON.parse(storage.getItem("tentra.studylog.queue.v1") as string) as {
      payload: { occurred_at: string };
    }[];
    expect(again[0].payload.occurred_at).toBe(firstOccurred);
  });
});

describe("recordGradedAttempts durability", () => {
  it("queues verified attempts when offline", async () => {
    state.upsertError = new Error("offline");
    const r = await recordGradedAttempts([ATTEMPT]);
    expect(r.queued).toBe(true);
    expect(pendingWriteCount()).toBe(1);
  });

  it("returns not-queued when storage rejects the write", async () => {
    state.upsertError = new Error("offline");
    storage.rejectWrites = true;
    const r = await recordGradedAttempts([ATTEMPT]);
    expect(r).toMatchObject({ ok: false, queued: false });
  });

  it("coalesces the same attempt batch on retry", async () => {
    state.upsertError = new Error("offline");
    await recordGradedAttempts([ATTEMPT]);
    await recordGradedAttempts([ATTEMPT]);
    expect(pendingWriteCount()).toBe(1);
  });
});
