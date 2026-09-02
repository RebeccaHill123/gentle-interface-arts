/**
 * Sign-out data boundary.
 *
 * A shared browser must not leave one account's study state visible to (or
 * uploadable by) the next person who signs in. This module removes the local
 * state owned by a departing user via an explicit allowlist — never
 * `localStorage.clear()`, so device preferences survive.
 *
 * Cleanup is best-effort: sign-out itself must still succeed when storage is
 * unavailable. It is only ever run AFTER a confirmed successful sign-out.
 */

export interface BoundaryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

/** Exact keys holding user-owned study state. */
export const OWNED_KEYS = [
  "tentra.plan.v1", // cached plan for the signed-in user
  "tentra.plan.sync.v1", // dirty-sync marker (owner-bound, but stale after sign-out)
  "tentra.studylog.queue.v1", // owner-filtered below
  "tentra.studylog.ledger.v1", // owner-filtered below
  "practice:active:v1",
  "practice:config",
  "tentra.session.active.v1",
  "tentra.focus.active.v1",
  "tentra.focus.lastSummary.v1",
  "tentra.preview.v1",
  "tentra:analytics:events:v1",
  "tentra.auth.owner.v1",
] as const;

/** Prefixes for per-entity user state (mock snapshots/drafts, card progress). */
export const OWNED_PREFIXES = [
  "tentra.fullmock.",
  "tentra.flashcards.",
] as const;

/**
 * Keys deliberately preserved: device preferences that reveal nothing about
 * the departing account (theme, Focus timer defaults, remember-me email hint).
 */
export const PRESERVED_KEYS = [
  "tentra.theme",
  "tentra.focus.prefs.v1",
  "tentra.rememberMe",
] as const;

/**
 * Owner-scoped keys where other accounts' entries must survive: we strip only
 * the departing owner's items instead of dropping the whole key.
 */
const OWNER_FILTERED: Array<{ key: string; shape: "array" | "record" }> = [
  { key: "tentra.studylog.queue.v1", shape: "array" },
  { key: "tentra.studylog.ledger.v1", shape: "record" },
];

function stripOwner(storage: BoundaryStorage, key: string, shape: "array" | "record", owner: string) {
  const raw = storage.getItem(key);
  if (raw === null) return;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (shape === "array" && Array.isArray(parsed)) {
      const kept = parsed.filter(
        (item) => !(item && typeof item === "object" && (item as { ownerUserId?: string }).ownerUserId === owner),
      );
      if (kept.length === 0) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(kept));
      return;
    }
    if (shape === "record" && parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const kept: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (v && typeof v === "object" && (v as { ownerUserId?: string }).ownerUserId === owner) continue;
        kept[k] = v;
      }
      if (Object.keys(kept).length === 0) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(kept));
      return;
    }
    // Unrecognised shape (legacy/ownerless): retain it rather than uploading or
    // destroying data we cannot attribute.
  } catch {
    // Unparseable: leave it alone; it cannot be attributed to this owner.
  }
}

/**
 * Remove local study state owned by `ownerUserId`. Returns the removed keys.
 * Never throws.
 */
export function clearLocalUserData(
  ownerUserId: string | null,
  storage: BoundaryStorage | null,
): { removed: string[]; ok: boolean } {
  if (!storage) return { removed: [], ok: false };
  const removed: string[] = [];
  const filtered = new Set(OWNER_FILTERED.map((f) => f.key));
  try {
    if (ownerUserId) {
      for (const f of OWNER_FILTERED) stripOwner(storage, f.key, f.shape, ownerUserId);
    }

    for (const key of OWNED_KEYS) {
      if (filtered.has(key)) continue;
      if (storage.getItem(key) === null) continue;
      storage.removeItem(key);
      removed.push(key);
    }

    const prefixed: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      if (OWNED_PREFIXES.some((p) => key.startsWith(p))) prefixed.push(key);
    }
    for (const key of prefixed) {
      storage.removeItem(key);
      removed.push(key);
    }
    return { removed, ok: true };
  } catch {
    return { removed, ok: false };
  }
}
