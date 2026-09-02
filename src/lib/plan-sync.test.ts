import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PLAN_SYNC_KEY,
  confirmPlanSynced,
  decidePlanPull,
  flushPlanSync,
  isPlanSyncDirty,
  markPlanDirty,
  readPlanSyncMarker,
  resetPlanSyncLock,
  savePlanDurable,
  type PlanSyncDeps,
  type PlanSyncStorage,
} from "./plan-sync";
import type { StoredPlan } from "./plan-store";

function fakeStorage(opts: { failWrites?: boolean } = {}): PlanSyncStorage & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      if (opts.failWrites) throw new Error("quota");
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

function plan(tag: string): StoredPlan {
  return { tag } as unknown as StoredPlan;
}

function makeDeps(
  storage: PlanSyncStorage,
  push: (p: StoredPlan) => Promise<void>,
  opts: { failLocalWrite?: boolean } = {},
): PlanSyncDeps & { local: { plan: StoredPlan | null } } {
  const local: { plan: StoredPlan | null } = { plan: null };
  return {
    local,
    storage,
    writePlan: (p) => {
      if (opts.failLocalWrite) return false;
      local.plan = p;
      return true;
    },
    readPlan: () => local.plan,
    pushPlan: push,
  };
}

beforeEach(() => {
  resetPlanSyncLock();
});

describe("markPlanDirty", () => {
  it("persists the plan and a bumped revision before any cloud attempt", () => {
    const deps = makeDeps(fakeStorage(), async () => {});
    const out = markPlanDirty(deps, plan("a"));
    expect(out).toMatchObject({ ok: true, state: "queued", revision: 1 });
    expect(deps.local.plan).toEqual(plan("a"));
    expect(isPlanSyncDirty(deps)).toBe(true);
  });

  it("fails (no success claim) when the local plan write does not persist", () => {
    const deps = makeDeps(fakeStorage(), async () => {}, { failLocalWrite: true });
    const out = markPlanDirty(deps, plan("a"));
    expect(out.ok).toBe(false);
    expect(out.state).toBe("failed");
    expect(isPlanSyncDirty(deps)).toBe(false);
  });

  it("fails when the marker itself cannot be durably stored", () => {
    const deps = makeDeps(fakeStorage({ failWrites: true }), async () => {});
    const out = markPlanDirty(deps, plan("a"));
    expect(out.ok).toBe(false);
    expect(out.state).toBe("failed");
  });
});

describe("flushPlanSync", () => {
  it("clears dirty only after the exact revision is confirmed persisted", async () => {
    const storage = fakeStorage();
    const push = vi.fn(async () => {});
    const deps = makeDeps(storage, push);
    markPlanDirty(deps, plan("a"));
    const out = await flushPlanSync(deps);
    expect(out.state).toBe("saved");
    expect(push).toHaveBeenCalledTimes(1);
    expect(isPlanSyncDirty(deps)).toBe(false);
    expect(readPlanSyncMarker(deps)).toMatchObject({ revision: 1, syncedRevision: 1 });
  });

  it("keeps the dirty marker and the latest local plan when the cloud write fails", async () => {
    const deps = makeDeps(fakeStorage(), async () => {
      throw new Error("offline");
    });
    markPlanDirty(deps, plan("a"));
    const out = await flushPlanSync(deps);
    expect(out.state).toBe("queued");
    expect(out.error).toBe("offline");
    expect(isPlanSyncDirty(deps)).toBe(true);
    expect(deps.local.plan).toEqual(plan("a"));
  });

  it("coalesces multiple mutations to the latest plan", async () => {
    const pushed: StoredPlan[] = [];
    const deps = makeDeps(fakeStorage(), async (p) => {
      pushed.push(p);
    });
    markPlanDirty(deps, plan("a"));
    markPlanDirty(deps, plan("b"));
    markPlanDirty(deps, plan("c"));
    await flushPlanSync(deps);
    expect(pushed).toEqual([plan("c")]);
    expect(isPlanSyncDirty(deps)).toBe(false);
  });

  it("an older in-flight success never clears a newer dirty revision", async () => {
    const storage = fakeStorage();
    let release: (() => void) | null = null;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const deps = makeDeps(storage, async () => {
      await gate;
    });
    markPlanDirty(deps, plan("a")); // revision 1
    const flushing = flushPlanSync(deps);
    markPlanDirty(deps, plan("b")); // revision 2 lands mid-flush
    release!();
    await flushing;
    // Revision 1's success may not mark revision 2 as synced.
    expect(readPlanSyncMarker(deps).revision).toBe(2);
    expect(readPlanSyncMarker(deps).syncedRevision).toBeGreaterThanOrEqual(1);
    // Follow-up flush is triggered, so the newer plan reaches the server too.
    await flushPlanSync(deps);
    expect(isPlanSyncDirty(deps)).toBe(false);
  });

  it("holds an immediate per-tab lock: concurrent callers share one push", async () => {
    let release: (() => void) | null = null;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const push = vi.fn(async () => {
      await gate;
    });
    const deps = makeDeps(fakeStorage(), push);
    markPlanDirty(deps, plan("a"));
    const a = flushPlanSync(deps);
    const b = flushPlanSync(deps);
    release!();
    await Promise.all([a, b]);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("retries the dirty latest plan on a later load", async () => {
    const storage = fakeStorage();
    let fail = true;
    const pushed: StoredPlan[] = [];
    const deps = makeDeps(storage, async (p) => {
      if (fail) throw new Error("offline");
      pushed.push(p);
    });
    await savePlanDurable(deps, plan("a"));
    expect(isPlanSyncDirty(deps)).toBe(true);

    // Simulate a fresh load: same persisted marker, new lock, network back.
    resetPlanSyncLock();
    fail = false;
    const out = await flushPlanSync(deps);
    expect(out.state).toBe("saved");
    expect(pushed).toEqual([plan("a")]);
    expect(isPlanSyncDirty(deps)).toBe(false);
  });

  it("is a no-op when nothing is dirty", async () => {
    const push = vi.fn(async () => {});
    const deps = makeDeps(fakeStorage(), push);
    const out = await flushPlanSync(deps);
    expect(out.state).toBe("saved");
    expect(push).not.toHaveBeenCalled();
  });

  it("stops reporting dirty when the local plan was cleared", async () => {
    const push = vi.fn(async () => {});
    const deps = makeDeps(fakeStorage(), push);
    markPlanDirty(deps, plan("a"));
    deps.local.plan = null;
    const out = await flushPlanSync(deps);
    expect(push).not.toHaveBeenCalled();
    expect(out.state).toBe("saved");
    expect(isPlanSyncDirty(deps)).toBe(false);
  });
});

describe("confirmPlanSynced", () => {
  it("cannot mark a revision that does not exist yet", () => {
    const deps = makeDeps(fakeStorage(), async () => {});
    markPlanDirty(deps, plan("a"));
    confirmPlanSynced(deps, 99);
    expect(readPlanSyncMarker(deps)).toMatchObject({ revision: 1, syncedRevision: 1 });
  });

  it("never moves syncedRevision backwards", () => {
    const deps = makeDeps(fakeStorage(), async () => {});
    markPlanDirty(deps, plan("a"));
    markPlanDirty(deps, plan("b"));
    confirmPlanSynced(deps, 2);
    confirmPlanSynced(deps, 1);
    expect(readPlanSyncMarker(deps).syncedRevision).toBe(2);
  });
});

describe("readPlanSyncMarker", () => {
  it("ignores unknown/corrupt marker versions", () => {
    const storage = fakeStorage();
    storage.setItem(PLAN_SYNC_KEY, JSON.stringify({ version: 99, revision: 7, syncedRevision: 0 }));
    const deps = makeDeps(storage, async () => {});
    expect(readPlanSyncMarker(deps)).toMatchObject({ revision: 0, syncedRevision: 0 });
    storage.setItem(PLAN_SYNC_KEY, "{not json");
    expect(readPlanSyncMarker(deps)).toMatchObject({ revision: 0, syncedRevision: 0 });
  });
});

describe("decidePlanPull", () => {
  it("never overwrites a dirty local plan with cloud data", () => {
    expect(
      decidePlanPull({ dirty: true, readOk: true, cloudHasPlan: true, recentAuthCallback: false }),
    ).toEqual({ action: "keep-local", reason: "dirty" });
  });

  it("accepts cloud data when local is clean", () => {
    expect(
      decidePlanPull({ dirty: false, readOk: true, cloudHasPlan: true, recentAuthCallback: false }),
    ).toEqual({ action: "accept-cloud" });
  });

  it("keeps local when the read itself failed", () => {
    expect(
      decidePlanPull({ dirty: false, readOk: false, cloudHasPlan: false, recentAuthCallback: false }),
    ).toEqual({ action: "keep-local", reason: "read-failed" });
  });

  it("clears the local cache only for a genuinely empty cloud with nothing dirty", () => {
    expect(
      decidePlanPull({ dirty: false, readOk: true, cloudHasPlan: false, recentAuthCallback: false }),
    ).toEqual({ action: "clear-local" });
    expect(
      decidePlanPull({ dirty: true, readOk: true, cloudHasPlan: false, recentAuthCallback: false }),
    ).toEqual({ action: "keep-local", reason: "dirty" });
    expect(
      decidePlanPull({ dirty: false, readOk: true, cloudHasPlan: false, recentAuthCallback: true }),
    ).toEqual({ action: "keep-local", reason: "read-failed" });
  });
});
