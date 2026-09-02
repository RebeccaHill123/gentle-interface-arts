// Durable, coalescing, OWNER-BOUND plan sync.
//
// Problem this solves: plan mutations used to be written to localStorage and
// pushed to the cloud fire-and-forget. A failed cloud write was only logged,
// and the next cloud read overwrote the newer local plan with stale server
// data — the user's skip / move / completion silently disappeared after a
// success toast.
//
// Shared-browser problem this also solves: the dirty marker used to carry no
// owner, so an unsynced plan left behind by user A could be flushed into user
// B's `user_plans` row on B's next sign-in. Every marker now records the
// authenticated owner captured in the originating session, a flush refuses to
// push anything it does not own, and a foreign/ownerless dirty plan is
// quarantined for recovery instead of being uploaded or destroyed.
//
// Model: every local plan write bumps a monotonic `revision` in a versioned
// local marker. A cloud flush records the revision it actually persisted as
// `syncedRevision`. `dirty === revision > syncedRevision && owner matches`. An
// older in-flight success, or one from a different account, can therefore never
// clear a newer dirty revision.
//
// This module is dependency-injected and has no direct browser or Supabase
// imports, so the invariants above are deterministically testable.
import type { StoredPlan } from "@/lib/plan-store";

export const PLAN_SYNC_KEY = "tentra.plan.sync.v1";
/** Quarantine for unsynced plans that belong to a different (or unknown) account. */
export const PLAN_RECOVERY_KEY = "tentra.plan.recovery.v1";

export const PLAN_SYNC_MARKER_VERSION = 2;

export interface PlanSyncMarker {
  version: 2;
  revision: number;
  /** Highest revision confirmed persisted server-side. */
  syncedRevision: number;
  /** Authenticated user this local plan change belongs to. */
  ownerUserId: string | null;
  /** True when the marker came from the pre-ownership v1 format. */
  legacy: boolean;
}

export interface PlanSyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PlanSyncDeps {
  storage: PlanSyncStorage | null;
  /** Authenticated owner of the CURRENT session, or null when unknown. */
  ownerUserId: string | null;
  /** Durable local plan write. Must return false when it did not persist. */
  writePlan: (plan: StoredPlan) => boolean;
  readPlan: () => StoredPlan | null;
  /** Best-effort removal of the local plan (rollback path). */
  clearPlan?: () => void;
  /** Cloud write. Must throw on error, unmatched user row, or owner mismatch. */
  pushPlan: (plan: StoredPlan, expectedOwner: string) => Promise<void>;
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

const LOCAL_FAIL = "We couldn't save this change on this device. Try again.";
const NO_OWNER = "We couldn't confirm which account this change belongs to. Sign in and try again.";
const FOREIGN_DIRTY =
  "An unsynced plan from another account is stored on this device. It was kept for recovery and not uploaded.";

const EMPTY_MARKER: PlanSyncMarker = {
  version: 2,
  revision: 0,
  syncedRevision: 0,
  ownerUserId: null,
  legacy: false,
};

export function readPlanSyncMarker(deps: PlanSyncDeps): PlanSyncMarker {
  const storage = deps.storage;
  if (!storage) return EMPTY_MARKER;
  try {
    const raw = storage.getItem(PLAN_SYNC_KEY);
    if (!raw) return EMPTY_MARKER;
    const value = JSON.parse(raw) as Partial<PlanSyncMarker>;
    // v1 markers carried no owner: keep the revisions (so local work is not
    // silently declared clean) but treat ownership as unknown.
    const legacy = value.version === 1;
    if (!legacy && value.version !== PLAN_SYNC_MARKER_VERSION) return EMPTY_MARKER;
    const revision = Number.isFinite(value.revision) ? Number(value.revision) : 0;
    const synced = Number.isFinite(value.syncedRevision) ? Number(value.syncedRevision) : 0;
    const owner = typeof value.ownerUserId === "string" && value.ownerUserId ? value.ownerUserId : null;
    return {
      version: 2,
      revision: Math.max(0, revision),
      syncedRevision: Math.max(0, Math.min(synced, Math.max(0, revision))),
      ownerUserId: legacy ? null : owner,
      legacy,
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
    storage.setItem(
      PLAN_SYNC_KEY,
      JSON.stringify({
        version: PLAN_SYNC_MARKER_VERSION,
        revision: marker.revision,
        syncedRevision: marker.syncedRevision,
        ownerUserId: marker.ownerUserId,
      }),
    );
  } catch {
    return false;
  }
  const readBack = readPlanSyncMarker(deps);
  return (
    readBack.revision === marker.revision &&
    readBack.syncedRevision === marker.syncedRevision &&
    readBack.ownerUserId === marker.ownerUserId
  );
}

function markerIsDirty(marker: PlanSyncMarker): boolean {
  return marker.revision > marker.syncedRevision;
}

/** True only when the CURRENT user has unsynced local plan work. */
export function isPlanSyncDirty(deps: PlanSyncDeps): boolean {
  const marker = readPlanSyncMarker(deps);
  if (!markerIsDirty(marker)) return false;
  return !!deps.ownerUserId && marker.ownerUserId === deps.ownerUserId;
}

/**
 * True when unsynced local plan work exists that the current session must not
 * touch: it belongs to another account, or its owner is unknown (legacy).
 */
export function hasForeignDirtyPlan(deps: PlanSyncDeps): boolean {
  const marker = readPlanSyncMarker(deps);
  if (!markerIsDirty(marker)) return false;
  return !deps.ownerUserId || marker.ownerUserId !== deps.ownerUserId;
}

export function planSyncRevision(deps: PlanSyncDeps): number {
  return readPlanSyncMarker(deps).revision;
}

interface RecoveryRecord {
  ownerUserId: string | null;
  revision: number;
  syncedRevision: number;
  legacy: boolean;
  plan: StoredPlan | null;
  quarantinedAt: string;
}

function readRecovery(deps: PlanSyncDeps): Record<string, RecoveryRecord> {
  const storage = deps.storage;
  if (!storage) return {};
  try {
    const raw = storage.getItem(PLAN_RECOVERY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, RecoveryRecord>) : {};
  } catch {
    return {};
  }
}

/**
 * Retain a foreign/ownerless unsynced plan under an owner-safe recovery key so
 * it is neither uploaded into the wrong account nor silently destroyed.
 * Returns false when the quarantine itself could not be persisted, in which
 * case callers must not overwrite the data.
 */
export function quarantineForeignPlan(deps: PlanSyncDeps): boolean {
  const storage = deps.storage;
  if (!storage) return false;
  const marker = readPlanSyncMarker(deps);
  if (!markerIsDirty(marker)) return true;
  const slot = marker.ownerUserId ?? "unknown";
  const all = readRecovery(deps);
  const record: RecoveryRecord = {
    ownerUserId: marker.ownerUserId,
    revision: marker.revision,
    syncedRevision: marker.syncedRevision,
    legacy: marker.legacy,
    plan: deps.readPlan(),
    quarantinedAt: new Date().toISOString(),
  };
  const next = { ...all, [slot]: record };
  let raw: string;
  try {
    raw = JSON.stringify(next);
  } catch {
    return false;
  }
  try {
    storage.setItem(PLAN_RECOVERY_KEY, raw);
  } catch {
    return false;
  }
  try {
    return storage.getItem(PLAN_RECOVERY_KEY) === raw;
  } catch {
    return false;
  }
}

export function listQuarantinedPlans(deps: PlanSyncDeps): RecoveryRecord[] {
  return Object.values(readRecovery(deps));
}

/**
 * Persist the plan locally and bump the dirty revision BEFORE any cloud
 * attempt, bound to the authenticated owner of the current session. Failure
 * here means nothing is tracked — the previous local plan is restored
 * best-effort so no untracked mutation is left behind.
 */
export function markPlanDirty(deps: PlanSyncDeps, plan: StoredPlan): PlanSyncOutcome {
  const owner = deps.ownerUserId;
  if (!owner) {
    return { ok: false, state: "failed", revision: 0, error: NO_OWNER };
  }

  const prev = readPlanSyncMarker(deps);
  const prevDirtyForeign = markerIsDirty(prev) && prev.ownerUserId !== owner;
  if (prevDirtyForeign && !quarantineForeignPlan(deps)) {
    // Refusing rather than clobbering someone else's unsynced work.
    return { ok: false, state: "failed", revision: 0, error: FOREIGN_DIRTY };
  }

  const sameOwner = prev.ownerUserId === owner && !prev.legacy;
  const baseRevision = sameOwner ? prev.revision : 0;
  const baseSynced = sameOwner ? prev.syncedRevision : 0;
  const revision = baseRevision + 1;

  const previousPlan = deps.readPlan();
  let wrotePlan = false;
  try {
    wrotePlan = deps.writePlan(plan);
  } catch {
    wrotePlan = false;
  }
  if (!wrotePlan) {
    return { ok: false, state: "failed", revision: baseRevision, error: LOCAL_FAIL };
  }

  const ok = writeMarker(deps, {
    version: 2,
    revision,
    syncedRevision: baseSynced,
    ownerUserId: owner,
    legacy: false,
  });
  if (!ok) {
    // The plan changed but nothing tracks it: roll the local plan back so we
    // never leave an untracked mutation while reporting failure.
    try {
      if (previousPlan) deps.writePlan(previousPlan);
      else deps.clearPlan?.();
    } catch {
      /* best effort */
    }
    return { ok: false, state: "failed", revision: baseRevision, error: LOCAL_FAIL };
  }
  return { ok: true, state: "queued", revision };
}

/**
 * Compare-and-set completion of a flush: only the exact owner + revision that
 * was pushed may be marked synced. A newer revision stays dirty, and an auth
 * change mid-flight cannot clear anything.
 */
export function confirmPlanSynced(
  deps: PlanSyncDeps,
  flushedRevision: number,
  expectedOwner: string,
): PlanSyncOutcome {
  const current = readPlanSyncMarker(deps);
  if (
    current.ownerUserId !== expectedOwner ||
    deps.ownerUserId !== expectedOwner ||
    current.legacy
  ) {
    return { ok: true, state: "queued", revision: current.revision, error: FOREIGN_DIRTY };
  }
  const syncedRevision = Math.max(
    current.syncedRevision,
    Math.min(flushedRevision, current.revision),
  );
  const next: PlanSyncMarker = {
    version: 2,
    revision: current.revision,
    syncedRevision,
    ownerUserId: expectedOwner,
    legacy: false,
  };
  const wrote = writeMarker(deps, next);
  if (!wrote) {
    return { ok: true, state: "queued", revision: current.revision };
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
 * Push the latest local plan when the CURRENT user owns it. Immediate per-tab
 * lock: concurrent callers join the in-flight flush instead of racing duplicate
 * writes, and a mutation that lands mid-flush triggers exactly one follow-up.
 */
export function flushPlanSync(deps: PlanSyncDeps): Promise<PlanSyncOutcome> {
  if (inFlight) {
    followUpRequested = true;
    return inFlight;
  }
  const run = (async (): Promise<PlanSyncOutcome> => {
    const marker = readPlanSyncMarker(deps);
    if (!markerIsDirty(marker)) {
      return { ok: true, state: "saved", revision: marker.revision };
    }
    const owner = deps.ownerUserId;
    if (!owner || marker.ownerUserId !== owner || marker.legacy) {
      // Fail closed: never upload another account's (or an ownerless legacy)
      // unsynced plan into whoever happens to be signed in.
      return { ok: true, state: "queued", revision: marker.revision, error: FOREIGN_DIRTY };
    }
    const plan = deps.readPlan();
    if (!plan) {
      // Nothing to push (plan cleared locally) — stop reporting dirty forever.
      return confirmPlanSynced(deps, marker.revision, owner);
    }
    const flushing = marker.revision;
    try {
      await deps.pushPlan(plan, owner);
    } catch (e) {
      return {
        ok: true,
        state: "queued",
        revision: readPlanSyncMarker(deps).revision,
        error: e instanceof Error ? e.message : "Sync failed",
      };
    }
    return confirmPlanSynced(deps, flushing, owner);
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
  /** Keep local: it holds unsynced work owned by this user. */
  | { action: "keep-local"; reason: "dirty" }
  /** Accept and cache the cloud plan. */
  | { action: "accept-cloud" }
  /** Cloud genuinely has no plan and local holds nothing unsynced. */
  | { action: "clear-local" }
  /** Read failed — never touch local. */
  | { action: "keep-local"; reason: "read-failed" };

/**
 * Pure pull policy. A dirty local plan owned by this user is never overwritten;
 * an absent cloud plan clears the local cache only when there is nothing
 * unsynced. `dirty` must already be owner-scoped.
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
