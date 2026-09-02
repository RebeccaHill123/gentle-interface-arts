// Durable, coalescing plan sync.
//
// Problem this solves: plan mutations used to be written to localStorage and
// pushed to the cloud fire-and-forget. A failed cloud write was only logged,
// and the next cloud read overwrote the newer local plan with stale server
// data — the user's skip / move / completion silently disappeared after a
// success toast.
//
// Model: every local plan write bumps a monotonic `revision` in a versioned
// local marker. A cloud flush records the revision it actually persisted as
// `syncedRevision`. `dirty === revision > syncedRevision`. An older in-flight
// success can therefore never clear a newer dirty revision, and multiple
// mutations coalesce because a flush always pushes the latest local plan.
//
// This module is dependency-injected and has no direct browser or Supabase
// imports, so the invariants above are deterministically testable.
import type { StoredPlan } from "@/lib/plan-store";

export const PLAN_SYNC_KEY = "tentra.plan.sync.v1";

export interface PlanSyncMarker {
  version: 1;
  revision: number;
  /** Highest revision confirmed persisted server-side. */
  syncedRevision: number;
}

export interface PlanSyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PlanSyncDeps {
  storage: PlanSyncStorage | null;
  /** Durable local plan write. Must return false when it did not persist. */
  writePlan: (plan: StoredPlan) => boolean;
  readPlan: () => StoredPlan | null;
  /** Cloud write. Must throw on error OR unmatched user row. */
  pushPlan: (plan: StoredPlan) => Promise<void>;
}

export type PlanSyncState =
  /** Confirmed persisted server-side. */
  | "saved"
  /** Durably stored on this device, still waiting on the server. */
  | "queued"
  /** Not stored anywhere — never claim success. */
  | "failed";

export interface PlanSyncOutcome {
  ok: boolean;
  state: PlanSyncState;
  revision: number;
  error?: string;
}

const EMPTY_MARKER: PlanSyncMarker = { version: 1, revision: 0, syncedRevision: 0 };

export function readPlanSyncMarker(deps: PlanSyncDeps): PlanSyncMarker {
  const storage = deps.storage;
  if (!storage) return EMPTY_MARKER;
  try {
    const raw = storage.getItem(PLAN_SYNC_KEY);
    if (!raw) return EMPTY_MARKER;
    const value = JSON.parse(raw) as Partial<PlanSyncMarker>;
    if (value.version !== 1) return EMPTY_MARKER;
    const revision = Number.isFinite(value.revision) ? Number(value.revision) : 0;
    const synced = Number.isFinite(value.syncedRevision) ? Number(value.syncedRevision) : 0;
    return {
      version: 1,
      revision: Math.max(0, revision),
      syncedRevision: Math.max(0, Math.min(synced, Math.max(0, revision))),
    };
  } catch {
    return EMPTY_MARKER;
  }
}

/** Writes the marker and verifies it read back, so "durable" is not assumed. */
function writeMarker(deps: PlanSyncDeps, marker: PlanSyncMarker): boolean {
  const storage = deps.storage;
  if (!storage) return false;
  try {
    storage.setItem(PLAN_SYNC_KEY, JSON.stringify(marker));
  } catch {
    return false;
  }
  const readBack = readPlanSyncMarker(deps);
  return readBack.revision === marker.revision && readBack.syncedRevision === marker.syncedRevision;
}

export function isPlanSyncDirty(deps: PlanSyncDeps): boolean {
  const marker = readPlanSyncMarker(deps);
  return marker.revision > marker.syncedRevision;
}

export function planSyncRevision(deps: PlanSyncDeps): number {
  return readPlanSyncMarker(deps).revision;
}

/**
 * Persist the plan locally and bump the dirty revision BEFORE any cloud
 * attempt. Failure here means nothing durable happened — callers must not
 * claim success.
 */
export function markPlanDirty(deps: PlanSyncDeps, plan: StoredPlan): PlanSyncOutcome {
  const prev = readPlanSyncMarker(deps);
  const revision = prev.revision + 1;
  let wrotePlan = false;
  try {
    wrotePlan = deps.writePlan(plan);
  } catch {
    wrotePlan = false;
  }
  if (!wrotePlan) {
    return {
      ok: false,
      state: "failed",
      revision: prev.revision,
      error: "We couldn't save this change on this device. Try again.",
    };
  }
  const ok = writeMarker(deps, { version: 1, revision, syncedRevision: prev.syncedRevision });
  if (!ok) {
    return {
      ok: false,
      state: "failed",
      revision: prev.revision,
      error: "We couldn't save this change on this device. Try again.",
    };
  }
  return { ok: true, state: "queued", revision };
}

/**
 * Compare-and-set completion of a flush: only the exact revision that was
 * pushed may be marked synced, and a newer revision stays dirty.
 */
export function confirmPlanSynced(deps: PlanSyncDeps, flushedRevision: number): PlanSyncOutcome {
  const current = readPlanSyncMarker(deps);
  const syncedRevision = Math.max(current.syncedRevision, Math.min(flushedRevision, current.revision));
  const next: PlanSyncMarker = { version: 1, revision: current.revision, syncedRevision };
  const wrote = writeMarker(deps, next);
  if (!wrote) {
    return { ok: true, state: "queued", revision: current.revision, error: undefined };
  }
  const dirty = next.revision > next.syncedRevision;
  return { ok: true, state: dirty ? "queued" : "saved", revision: next.revision };
}

let inFlight: Promise<PlanSyncOutcome> | null = null;
let followUpRequested = false;

/** Test seam: drop the per-tab flush lock. */
export function resetPlanSyncLock() {
  inFlight = null;
  followUpRequested = false;
}

/**
 * Push the latest local plan when dirty. Immediate per-tab lock: concurrent
 * callers join the in-flight flush instead of racing duplicate writes, and a
 * mutation that lands mid-flush triggers exactly one follow-up flush.
 */
export function flushPlanSync(deps: PlanSyncDeps): Promise<PlanSyncOutcome> {
  if (inFlight) {
    followUpRequested = true;
    return inFlight;
  }
  const run = (async (): Promise<PlanSyncOutcome> => {
    const marker = readPlanSyncMarker(deps);
    if (marker.revision <= marker.syncedRevision) {
      return { ok: true, state: "saved", revision: marker.revision };
    }
    const plan = deps.readPlan();
    if (!plan) {
      // Nothing to push (plan cleared locally) — stop reporting dirty forever.
      return confirmPlanSynced(deps, marker.revision);
    }
    const flushing = marker.revision;
    try {
      await deps.pushPlan(plan);
    } catch (e) {
      return {
        ok: true,
        state: "queued",
        revision: readPlanSyncMarker(deps).revision,
        error: e instanceof Error ? e.message : "Sync failed",
      };
    }
    return confirmPlanSynced(deps, flushing);
  })();

  inFlight = run.finally(() => {
    inFlight = null;
  });

  return inFlight.then(async (outcome) => {
    if (followUpRequested) {
      followUpRequested = false;
      if (isPlanSyncDirty(deps) && !inFlight) return flushPlanSync(deps);
    }
    return outcome;
  });
}

/** Local durable write + best-effort immediate flush. */
export async function savePlanDurable(
  deps: PlanSyncDeps,
  plan: StoredPlan,
): Promise<PlanSyncOutcome> {
  const marked = markPlanDirty(deps, plan);
  if (!marked.ok) return marked;
  return flushPlanSync(deps);
}

export type PullDecision =
  /** Keep local: it holds unsynced work. */
  | { action: "keep-local"; reason: "dirty" }
  /** Accept and cache the cloud plan. */
  | { action: "accept-cloud" }
  /** Cloud genuinely has no plan and local holds nothing unsynced. */
  | { action: "clear-local" }
  /** Read failed — never touch local. */
  | { action: "keep-local"; reason: "read-failed" };

/**
 * Pure pull policy. A dirty local plan is never overwritten; an absent cloud
 * plan clears the local cache only when there is nothing unsynced.
 */
export function decidePlanPull(input: {
  dirty: boolean;
  readOk: boolean;
  cloudHasPlan: boolean;
  recentAuthCallback: boolean;
}): PullDecision {
  if (!input.readOk) return { action: "keep-local", reason: "read-failed" };
  if (input.dirty) return { action: "keep-local", reason: "dirty" };
  if (!input.cloudHasPlan) {
    if (input.recentAuthCallback) return { action: "keep-local", reason: "read-failed" };
    return { action: "clear-local" };
  }
  return { action: "accept-cloud" };
}
