import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PLAN_SYNC_KEY,
  confirmPlanSynced,
  decidePlanPull,
  flushPlanSync,
  hasForeignDirtyPlan,
  listQuarantinedPlans,
  isPlanSyncDirty,
  markPlanDirty,
  readPlanSyncMarker,
  quarantineForeignPlan,
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
  push: (p: StoredPlan, owner: string) => Promise<void>,
  opts: { failLocalWrite?: boolean; owner?: string | null } = {},
): PlanSyncDeps & { local: { plan: StoredPlan | null } } {
  const local: { plan: StoredPlan | null } = { plan: null };
  return {
    local,
    storage,
    ownerUserId: opts.owner === undefined ? "user-a" : opts.owner,
    writePlan: (p) => {
      if (opts.failLocalWrite) return false;
      local.plan = p;
      return true;
    },
    readPlan: () => local.plan,
    clearPlan: () => {
      local.plan = null;
    },
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
    confirmPlanSynced(deps, 99, "user-a");
    expect(readPlanSyncMarker(deps)).toMatchObject({ revision: 1, syncedRevision: 1 });
  });

  it("never moves syncedRevision backwards", () => {
    const deps = makeDeps(fakeStorage(), async () => {});
    markPlanDirty(deps, plan("a"));
    markPlanDirty(deps, plan("b"));
    confirmPlanSynced(deps, 2, "user-a");
    confirmPlanSynced(deps, 1, "user-a");
    expect(readPlanSyncMarker(deps).syncedRevision).toBe(2);
  });
});

describe("readPlanSyncMarker", () => {
  it("ignores unknown/corrupt marker versions", () => {
    const storage = fakeStorage();
    storage.setItem(
      PLAN_SYNC_KEY,
      JSON.stringify({ version: 99, revision: 7, syncedRevision: 0, ownerUserId: "user-a" }),
    );
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

describe("ownership boundaries", () => {
  it("A's dirty plan is never pushed after B signs in", async () => {
    const storage = fakeStorage();
    const pushA = vi.fn(async () => {});
    const depsA = makeDeps(storage, pushA, { owner: "user-a" });
    markPlanDirty(depsA, plan("a-plan"));

    const pushB = vi.fn(async () => {});
    const depsB = makeDeps(storage, pushB, { owner: "user-b" });
    depsB.local.plan = depsA.local.plan; // shared browser: same local plan cache
    expect(isPlanSyncDirty(depsB)).toBe(false);
    expect(hasForeignDirtyPlan(depsB)).toBe(true);

    const out = await flushPlanSync(depsB);
    expect(pushB).not.toHaveBeenCalled();
    expect(out.state).toBe("queued");
    // A's work is still intact and still A's.
    expect(readPlanSyncMarker(depsA).ownerUserId).toBe("user-a");
    expect(isPlanSyncDirty(depsA)).toBe(true);
  });

  it("A can still retry its own dirty plan after the ownership check", async () => {
    const storage = fakeStorage();
    const pushed: Array<[StoredPlan, string]> = [];
    const depsA = makeDeps(storage, async (p, owner) => {
      pushed.push([p, owner]);
    }, { owner: "user-a" });
    markPlanDirty(depsA, plan("a-plan"));
    resetPlanSyncLock();
    const out = await flushPlanSync(depsA);
    expect(out.state).toBe("saved");
    expect(pushed).toEqual([[plan("a-plan"), "user-a"]]);
  });

  it("rejects a push whose expected owner does not match (server-side check)", async () => {
    const storage = fakeStorage();
    const deps = makeDeps(storage, async (_p, owner) => {
      if (owner !== "user-a") throw new Error("wrong owner");
      throw new Error("owner mismatch at server");
    }, { owner: "user-a" });
    markPlanDirty(deps, plan("a"));
    const out = await flushPlanSync(deps);
    expect(out.state).toBe("queued");
    expect(out.error).toBe("owner mismatch at server");
    expect(isPlanSyncDirty(deps)).toBe(true);
  });

  it("an auth change mid-flight cannot clear the marker", async () => {
    const storage = fakeStorage();
    let release: (() => void) | null = null;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const deps = makeDeps(storage, async () => {
      await gate;
    }, { owner: "user-a" });
    markPlanDirty(deps, plan("a"));
    const flushing = flushPlanSync(deps);
    deps.ownerUserId = "user-b"; // session switched while the push was open
    release!();
    await flushing;
    expect(readPlanSyncMarker(deps)).toMatchObject({ ownerUserId: "user-a", syncedRevision: 0 });
  });

  it("a legacy ownerless dirty marker is never uploaded", async () => {
    const storage = fakeStorage();
    storage.setItem(PLAN_SYNC_KEY, JSON.stringify({ version: 1, revision: 3, syncedRevision: 1 }));
    const push = vi.fn(async () => {});
    const deps = makeDeps(storage, push, { owner: "user-b" });
    deps.local.plan = plan("legacy");
    expect(hasForeignDirtyPlan(deps)).toBe(true);
    const out = await flushPlanSync(deps);
    expect(push).not.toHaveBeenCalled();
    expect(out.state).toBe("queued");
  });

  it("quarantines foreign unsynced work instead of destroying it", () => {
    const storage = fakeStorage();
    const depsA = makeDeps(storage, async () => {}, { owner: "user-a" });
    markPlanDirty(depsA, plan("a-plan"));
    const depsB = makeDeps(storage, async () => {}, { owner: "user-b" });
    depsB.local.plan = depsA.local.plan;
    expect(quarantineForeignPlan(depsB)).toBe(true);
    const held = listQuarantinedPlans(depsB);
    expect(held).toHaveLength(1);
    expect(held[0]).toMatchObject({ ownerUserId: "user-a", plan: plan("a-plan") });
  });

  it("a new owner starts a fresh revision line and syncs normally", async () => {
    const storage = fakeStorage();
    const depsA = makeDeps(storage, async () => {}, { owner: "user-a" });
    markPlanDirty(depsA, plan("a-plan"));
    resetPlanSyncLock();
    const pushed: StoredPlan[] = [];
    const depsB = makeDeps(storage, async (p) => {
      pushed.push(p);
    }, { owner: "user-b" });
    const marked = markPlanDirty(depsB, plan("b-plan"));
    expect(marked).toMatchObject({ ok: true, revision: 1 });
    expect(listQuarantinedPlans(depsB)).toHaveLength(1);
    const out = await flushPlanSync(depsB);
    expect(out.state).toBe("saved");
    expect(pushed).toEqual([plan("b-plan")]);
  });

  it("refuses to mark dirty with no known owner", () => {
    const deps = makeDeps(fakeStorage(), async () => {}, { owner: null });
    const out = markPlanDirty(deps, plan("x"));
    expect(out.ok).toBe(false);
    expect(out.state).toBe("failed");
    expect(deps.local.plan).toBeNull();
  });

  it("rolls the local plan back when the marker write fails", () => {
    const storage = fakeStorage();
    const deps = makeDeps(storage, async () => {}, { owner: "user-a" });
    deps.local.plan = plan("old");
    // Marker writes start failing after the plan write succeeds.
    const original = storage.setItem;
    storage.setItem = (k: string, v: string) => {
      if (k === PLAN_SYNC_KEY) throw new Error("quota");
      original.call(storage, k, v);
    };
    const out = markPlanDirty(deps, plan("new"));
    expect(out.ok).toBe(false);
    expect(out.state).toBe("failed");
    // No untracked mutated plan is left behind.
    expect(deps.local.plan).toEqual(plan("old"));
  });
});
