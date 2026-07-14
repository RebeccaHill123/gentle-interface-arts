// Focus sprint state — lives in localStorage so a refresh during a sprint
// keeps the timer in sync. The dashboard activity feed is the source of
// truth for completed sessions (via plan-store's addStudySession).

import type { StudySession } from "@/lib/plan-store";

const KEY = "tentra.focus.active.v1";
const PREFS_KEY = "tentra.focus.prefs.v1";

export interface FocusPreset {
  id: string;
  label: string;
  focusMin: number;
  breakMin: number;
}

export const FOCUS_PRESETS: FocusPreset[] = [
  { id: "classic", label: "Classic 25 / 5", focusMin: 25, breakMin: 5 },
  { id: "deep", label: "Deep work 50 / 10", focusMin: 50, breakMin: 10 },
  { id: "sprint", label: "Quick sprint 15 / 3", focusMin: 15, breakMin: 3 },
  { id: "marathon", label: "Marathon 90 / 20", focusMin: 90, breakMin: 20 },
];

export interface ActiveSprint {
  startedAt: number; // epoch ms
  focusMs: number;
  breakMs: number;
  module?: string;
  topic?: string;
  presetId: string;
  pausedAt?: number; // epoch ms when paused
  pausedTotalMs: number; // total paused time accumulated
  phase: "focus" | "break";
  phaseStartedAt: number;
}

export interface FocusPrefs {
  lastPresetId: string;
  lastModule?: string;
  customFocusMin: number;
  customBreakMin: number;
}

export function loadActiveSprint(): ActiveSprint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveSprint;
  } catch {
    return null;
  }
}

export function saveActiveSprint(s: ActiveSprint | null) {
  if (typeof window === "undefined") return;
  if (!s) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, JSON.stringify(s));
}

export function loadFocusPrefs(): FocusPrefs {
  if (typeof window === "undefined") {
    return { lastPresetId: "classic", customFocusMin: 30, customBreakMin: 5 };
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as FocusPrefs;
  } catch {
    /* ignore */
  }
  return { lastPresetId: "classic", customFocusMin: 30, customBreakMin: 5 };
}

export function saveFocusPrefs(p: FocusPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

/**
 * Programmatically stage a focus sprint (e.g. from a planned Today's Plan
 * block). The caller navigates to /focus/sprint after this returns.
 */
export function startPlannedSprint(input: {
  module?: string;
  topic?: string;
  focusMin: number;
  breakMin?: number;
}) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const focusMs = Math.max(1, Math.min(180, input.focusMin)) * 60 * 1000;
  const breakMs = Math.max(0, Math.min(60, input.breakMin ?? 5)) * 60 * 1000;
  saveActiveSprint({
    startedAt: now,
    focusMs,
    breakMs,
    module: input.module || undefined,
    topic: input.topic?.trim() || undefined,
    presetId: "custom",
    pausedTotalMs: 0,
    phase: "focus",
    phaseStartedAt: now,
  });
}

export function elapsedMs(s: ActiveSprint, now = Date.now()): number {
  const end = s.pausedAt ?? now;
  return Math.max(0, end - s.phaseStartedAt - s.pausedTotalMs);
}

export function remainingMs(s: ActiveSprint, now = Date.now()): number {
  const target = s.phase === "focus" ? s.focusMs : s.breakMs;
  return Math.max(0, target - elapsedMs(s, now));
}

// Focus sessions are logged with sessionType "focus".
export function isFocusSession(s: StudySession): boolean {
  return s.sessionType === "focus";
}

export interface FocusInsights {
  totalFocusMinThisWeek: number;
  completedBlocksThisWeek: number;
  longestStreakBlocks: number; // longest run of consecutive completed focus sessions (gap < 30min)
  preferredLengthMin: number | null;
  bestTimeOfDay: { label: string; minutes: number } | null;
  trend: number[]; // last 7 days deep work minutes, oldest first
  totalAllTimeMin: number;
}

const HOUR_BUCKETS: { label: string; start: number; end: number }[] = [
  { label: "Early morning", start: 5, end: 9 },
  { label: "Late morning", start: 9, end: 12 },
  { label: "Afternoon", start: 12, end: 17 },
  { label: "Evening", start: 17, end: 21 },
  { label: "Late night", start: 21, end: 29 }, // 21..05
];

function bucketForHour(h: number): string {
  for (const b of HOUR_BUCKETS) {
    if (h >= b.start && h < b.end) return b.label;
    if (b.end > 24 && (h >= b.start || h < b.end - 24)) return b.label;
  }
  return "Late night";
}

export function computeFocusInsights(
  sessions: StudySession[] | undefined,
): FocusInsights {
  const empty: FocusInsights = {
    totalFocusMinThisWeek: 0,
    completedBlocksThisWeek: 0,
    longestStreakBlocks: 0,
    preferredLengthMin: null,
    bestTimeOfDay: null,
    trend: [0, 0, 0, 0, 0, 0, 0],
    totalAllTimeMin: 0,
  };
  const focusList = (sessions ?? []).filter(isFocusSession);
  if (focusList.length === 0) return empty;

  const now = new Date();
  const weekStart = new Date(now);
  const day = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - day);
  weekStart.setHours(0, 0, 0, 0);

  let totalFocusMinThisWeek = 0;
  let completedBlocksThisWeek = 0;
  let totalAllTimeMin = 0;
  const lengthCounts = new Map<number, number>();
  const bucketMins = new Map<string, number>();

  focusList.forEach((s) => {
    totalAllTimeMin += s.minutes;
    const ts = new Date(s.loggedAt);
    if (ts >= weekStart) {
      totalFocusMinThisWeek += s.minutes;
      completedBlocksThisWeek += 1;
    }
    // Bucket by canonical length (round to nearest 5)
    const len = Math.max(5, Math.round(s.minutes / 5) * 5);
    lengthCounts.set(len, (lengthCounts.get(len) ?? 0) + 1);

    const h = ts.getHours();
    const b = bucketForHour(h);
    bucketMins.set(b, (bucketMins.get(b) ?? 0) + s.minutes);
  });

  // Preferred length = most-used bucket
  let preferredLengthMin: number | null = null;
  let topCount = 0;
  lengthCounts.forEach((c, len) => {
    if (c > topCount) {
      topCount = c;
      preferredLengthMin = len;
    }
  });

  // Best time of day
  let bestTimeOfDay: FocusInsights["bestTimeOfDay"] = null;
  let topBucketMins = 0;
  bucketMins.forEach((m, label) => {
    if (m > topBucketMins) {
      topBucketMins = m;
      bestTimeOfDay = { label, minutes: m };
    }
  });

  // Longest streak of consecutive completed sprints (gap < 30 min between end and next start)
  const sorted = focusList
    .slice()
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
  let longestStreakBlocks = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prevEnd = new Date(sorted[i - 1].loggedAt).getTime();
    const thisStart =
      new Date(sorted[i].loggedAt).getTime() - sorted[i].minutes * 60 * 1000;
    const gap = thisStart - prevEnd;
    if (gap >= 0 && gap < 30 * 60 * 1000) {
      run += 1;
      longestStreakBlocks = Math.max(longestStreakBlocks, run);
    } else {
      run = 1;
    }
  }

  // 7-day trend (oldest first)
  const trend: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const mins = focusList
      .filter((s) => s.date === key)
      .reduce((a, b) => a + b.minutes, 0);
    trend.push(mins);
  }

  return {
    totalFocusMinThisWeek,
    completedBlocksThisWeek,
    longestStreakBlocks,
    preferredLengthMin,
    bestTimeOfDay,
    trend,
    totalAllTimeMin,
  };
}

export const MOTIVATIONAL_LINES: string[] = [
  "Stay focused — momentum builds consistency.",
  "Small reps, compounding gains.",
  "Done beats perfect. Keep moving.",
  "One question at a time. One topic at a time.",
  "You don't have to feel like it. You just have to start.",
  "Deep work today, easy exam tomorrow.",
  "The hardest part is staying in the chair. You're already winning.",
  "Breathe. Focus. Repeat.",
  "Future-you is watching. Make them proud.",
  "Quality time, not quantity time.",
];
