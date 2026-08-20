// Week 1 schedule derivation.
//
// The generated study plan stores a set of precise session blocks
// (`plan.todayTasks`, produced by buildStudyDurations + buildSpecificTask)
// that together total the user's chosen weekly hours. This module turns
// those genuine generated blocks into a day-by-day Week 1 schedule.
//
// It NEVER invents subjects, titles, durations or activities: every field
// is read from the generated plan. The only derived values are the day
// index / calendar date, computed deterministically from the plan's own
// generation date.
//
// Pure and client-safe: no server-only imports, no I/O.

import type { StoredPlan, StrategyTask, StrategyTaskType } from "@/lib/plan-store";

export type WeekOneSession = {
  /** 1-based day within week one. */
  day: number;
  /** YYYY-MM-DD, derived from the plan's generation date. */
  date: string;
  title: string;
  module: string;
  subtopic?: string;
  minutes: number;
  /** Human label for the generated task type, when present. */
  activity?: string;
  priority?: "high" | "medium" | "low";
};

export type WeekOneSchedule = {
  theme: string | null;
  /** Hours planned for week one, as generated. */
  hours: number | null;
  modules: string[];
  sessions: WeekOneSession[];
  totalMinutes: number;
  /** Number of distinct days that carry at least one session. */
  studyDays: number;
};

const ACTIVITY_LABELS: Record<StrategyTaskType, string> = {
  "concept-deepdive": "Foundation",
  "scenario-drill": "Application",
  "timed-sba": "Timed practice",
  "active-recall": "Active recall",
  "mixed-mock": "Mixed exam set",
  "mistake-review": "Mistake review",
  "ethics-application": "Ethics application",
};

export function activityLabel(taskType?: StrategyTaskType): string | undefined {
  if (!taskType) return undefined;
  return ACTIVITY_LABELS[taskType];
}

function addDays(from: Date, days: number): string {
  const d = new Date(from.getTime());
  d.setDate(d.getDate() + days);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function isUsableTask(task: StrategyTask | undefined): task is StrategyTask {
  return !!task && typeof task.title === "string" && task.title.trim().length > 0;
}

/**
 * Spread the generated week-one blocks across the seven days that follow the
 * plan's generation date. Blocks keep their generated order, so the first
 * session of the plan remains the first session of day 1.
 */
export function buildWeekOneSchedule(stored: StoredPlan): WeekOneSchedule {
  const tasks = (stored.plan?.todayTasks ?? []).filter(isUsableTask);
  const startDate = stored.generatedAt ? new Date(stored.generatedAt) : new Date();
  const start = Number.isNaN(startDate.getTime()) ? new Date() : startDate;

  const perDay = Math.max(1, Math.ceil(tasks.length / 7));
  const sessions: WeekOneSession[] = tasks.map((task, index) => {
    const day = Math.min(7, Math.floor(index / perDay) + 1);
    return {
      day,
      date: addDays(start, day - 1),
      title: task.title,
      module: task.module,
      ...(task.subtopic ? { subtopic: task.subtopic } : {}),
      minutes: task.minutes,
      ...(activityLabel(task.taskType) ? { activity: activityLabel(task.taskType)! } : {}),
      ...(task.priority ? { priority: task.priority } : {}),
    };
  });

  const firstWeek = stored.plan?.weeklyFocus?.[0] ?? null;
  return {
    theme: firstWeek?.theme ?? null,
    hours: typeof firstWeek?.hours === "number" ? firstWeek.hours : null,
    modules: firstWeek?.modules ?? [],
    sessions,
    totalMinutes: sessions.reduce((acc, s) => acc + (s.minutes || 0), 0),
    studyDays: new Set(sessions.map((s) => s.day)).size,
  };
}

/** Group week-one sessions by their day index, preserving order. */
export function groupWeekOneByDay(
  sessions: WeekOneSession[],
): Array<{ day: number; date: string; sessions: WeekOneSession[] }> {
  const days: Array<{ day: number; date: string; sessions: WeekOneSession[] }> = [];
  for (const session of sessions) {
    const existing = days.find((d) => d.day === session.day);
    if (existing) existing.sessions.push(session);
    else days.push({ day: session.day, date: session.date, sessions: [session] });
  }
  return days;
}
