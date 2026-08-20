// Unified study-session state (Phase 3).
//
// One session at a time, for the whole product. Whether the student starts
// from Today's recommended block or from a free-form Focus sprint, the same
// record is created here, so:
//   - a refresh, a backgrounded tab or a phone lock never loses the timer
//     (elapsed time is derived from wall-clock stamps, not from a tick count);
//   - two sessions can never run at once;
//   - a completed session logs exactly once (`sessionId` is the idempotency
//     key used by both the auto-finish and the manual finish paths);
//   - an abandoned session is detected as stale instead of silently inflating
//     someone's study minutes.
import type { StrategyTaskType } from "@/lib/plan-store";

const ACTIVE_KEY = "tentra.session.active.v1";
const LEGACY_SPRINT_KEY = "tentra.focus.active.v1";
/** A session left running far past its target is treated as abandoned. */
export const STALE_GRACE_MS = 90 * 60 * 1000;

export interface PlannedTaskRef {
  taskId: string;
  scheduleVersion: number;
  planId: string;
}

export interface ActiveSession {
  /** Stable id; doubles as the logging idempotency key. */
  sessionId: string;
  startedAt: number;
  /** Target focus length in ms. */
  plannedMs: number;
  breakMs: number;
  phase: "focus" | "break";
  phaseStartedAt: number;
  pausedAt?: number;
  pausedTotalMs: number;
  /** Set once the focus phase has been logged, so it can never log twice. */
  loggedAt?: number;
  /** Planned-task context, absent for free-form sprints. */
  planned?: PlannedTaskRef;
  title: string;
  module?: string;
  subtopic?: string;
  activityType?: StrategyTaskType;
  why?: string;
  output?: string;
  evidenceLabel?: string;
  examPath?: string;
  /** Where the session was launched from (analytics + source attribution). */
  origin: "today" | "focus" | "topic";
}

function makeId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `s_${Date.now().toString(36)}_${rand}`;
}

export function loadSession(): ActiveSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    if (!parsed?.sessionId || typeof parsed.startedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(s: ActiveSession | null): void {
  if (typeof window === "undefined") return;
  if (!s) localStorage.removeItem(ACTIVE_KEY);
  else localStorage.setItem(ACTIVE_KEY, JSON.stringify(s));
}

export function clearSession(): void {
  saveSession(null);
}

export interface StartSessionInput {
  minutes: number;
  breakMinutes?: number;
  title: string;
  module?: string;
  subtopic?: string;
  activityType?: StrategyTaskType;
  why?: string;
  output?: string;
  evidenceLabel?: string;
  examPath?: string;
  planned?: PlannedTaskRef;
  origin: ActiveSession["origin"];
}

/**
 * Start a session. Returns the existing one untouched when a live session is
 * already running (single-session invariant) unless `replace` is set.
 */
export function startSession(
  input: StartSessionInput,
  options: { replace?: boolean } = {},
): { session: ActiveSession; started: boolean } {
  const existing = loadSession();
  if (existing && !isStale(existing) && !existing.loggedAt && !options.replace) {
    return { session: existing, started: false };
  }
  const now = Date.now();
  const session: ActiveSession = {
    sessionId: makeId(),
    startedAt: now,
    plannedMs: Math.max(1, Math.min(240, Math.round(input.minutes))) * 60_000,
    breakMs: Math.max(0, Math.min(60, Math.round(input.breakMinutes ?? 5))) * 60_000,
    phase: "focus",
    phaseStartedAt: now,
    pausedTotalMs: 0,
    title: input.title,
    module: input.module,
    subtopic: input.subtopic,
    activityType: input.activityType,
    why: input.why,
    output: input.output,
    evidenceLabel: input.evidenceLabel,
    examPath: input.examPath,
    planned: input.planned,
    origin: input.origin,
  };
  saveSession(session);
  // The legacy sprint record is superseded; remove it so no old timer resumes.
  if (typeof window !== "undefined") localStorage.removeItem(LEGACY_SPRINT_KEY);
  return { session, started: true };
}

export function elapsedMs(s: ActiveSession, now = Date.now()): number {
  const end = s.pausedAt ?? now;
  return Math.max(0, end - s.phaseStartedAt - s.pausedTotalMs);
}

export function targetMs(s: ActiveSession): number {
  return s.phase === "focus" ? s.plannedMs : s.breakMs;
}

export function remainingMs(s: ActiveSession, now = Date.now()): number {
  return Math.max(0, targetMs(s) - elapsedMs(s, now));
}

export function progress(s: ActiveSession, now = Date.now()): number {
  const t = Math.max(1, targetMs(s));
  return Math.min(1, Math.max(0, 1 - remainingMs(s, now) / t));
}

/** Minutes we are willing to credit — never more than target + a small buffer. */
export function creditableMinutes(s: ActiveSession, now = Date.now()): number {
  const raw = Math.round(elapsedMs(s, now) / 60_000);
  const cap = Math.round(s.plannedMs / 60_000) + 15;
  return Math.max(0, Math.min(cap, raw));
}

/** A session running long past its target was almost certainly abandoned. */
export function isStale(s: ActiveSession, now = Date.now()): boolean {
  return elapsedMs(s, now) > targetMs(s) + STALE_GRACE_MS;
}

export function pauseSession(s: ActiveSession, now = Date.now()): ActiveSession {
  if (s.pausedAt) return s;
  const next = { ...s, pausedAt: now };
  saveSession(next);
  return next;
}

export function resumeSession(s: ActiveSession, now = Date.now()): ActiveSession {
  if (!s.pausedAt) return s;
  const next: ActiveSession = {
    ...s,
    pausedAt: undefined,
    pausedTotalMs: s.pausedTotalMs + Math.max(0, now - s.pausedAt),
  };
  saveSession(next);
  return next;
}

/**
 * Claim the single logging slot for this session's focus phase. Returns false
 * when it has already been claimed, which makes double-logging impossible even
 * if both the timer completion and a manual "Finish" fire.
 */
export function claimLogSlot(s: ActiveSession, now = Date.now()): ActiveSession | null {
  if (s.loggedAt) return null;
  const next = { ...s, loggedAt: now };
  saveSession(next);
  return next;
}

export function startBreak(s: ActiveSession, now = Date.now()): ActiveSession {
  const next: ActiveSession = {
    ...s,
    phase: "break",
    phaseStartedAt: now,
    pausedAt: undefined,
    pausedTotalMs: 0,
  };
  saveSession(next);
  return next;
}
