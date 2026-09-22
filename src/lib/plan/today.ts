// Today's totals and per-task display status.
//
// One unit everywhere: MINUTES. A task can be worked without being finished, so
// credited time is `actualMinutes` when completed and `partialMinutes` while
// still open — never both, so nothing is double counted.
import type { ScheduledTask } from "./types";

export type TodayTaskState = "not-started" | "in-progress" | "completed" | "skipped";

/** Time already credited to a single task, in minutes. */
export function creditedMinutes(t: ScheduledTask): number {
  if (t.status === "completed") return Math.max(0, Math.round(t.actualMinutes ?? t.minutes));
  return Math.max(0, Math.round(t.partialMinutes ?? 0));
}

export function taskState(t: ScheduledTask): TodayTaskState {
  if (t.status === "completed") return "completed";
  if (t.status === "skipped") return "skipped";
  return (t.partialMinutes ?? 0) > 0 ? "in-progress" : "not-started";
}

export interface DayTotals {
  /** Minutes planned across every task scheduled for the day (skips included). */
  plannedMinutes: number;
  /** Minutes actually credited today, from completed and part-worked tasks. */
  doneMinutes: number;
  /** 0..100, capped. */
  percent: number;
  taskCount: number;
  completedCount: number;
  skippedCount: number;
  openCount: number;
  /** True when there is at least one task and nothing is still open. */
  allSettled: boolean;
}

export function dayTotals(tasks: ScheduledTask[]): DayTotals {
  const plannedMinutes = tasks.reduce((a, t) => a + Math.max(0, Math.round(t.minutes)), 0);
  const doneMinutes = tasks.reduce((a, t) => a + creditedMinutes(t), 0);
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const skippedCount = tasks.filter((t) => t.status === "skipped").length;
  const openCount = tasks.filter((t) => t.status === "scheduled").length;
  return {
    plannedMinutes,
    doneMinutes,
    percent:
      plannedMinutes > 0 ? Math.min(100, Math.round((doneMinutes / plannedMinutes) * 100)) : 0,
    taskCount: tasks.length,
    completedCount,
    skippedCount,
    openCount,
    allSettled: tasks.length > 0 && openCount === 0,
  };
}

/**
 * Should a finished focus session close the planned task?
 *
 * A short session never silently completes a long task: the student's own
 * confirmation wins, and otherwise we require essentially the planned time.
 */
export function shouldCompletePlannedTask(args: {
  plannedMinutes: number;
  actualMinutes: number;
  /** Already-credited partial time on the task before this session. */
  previousPartialMinutes?: number;
  /** The student confirmed the planned output is finished. */
  confirmedComplete: boolean;
}): boolean {
  if (args.confirmedComplete) return true;
  const worked = Math.max(0, args.actualMinutes) + Math.max(0, args.previousPartialMinutes ?? 0);
  const planned = Math.max(1, args.plannedMinutes);
  return worked >= planned;
}

/** Friendly, time-of-day greeting. Kept honest and short. */
export function greetingFor(name?: string, date = new Date()): string {
  const h = date.getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}
