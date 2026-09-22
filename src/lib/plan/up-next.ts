// "Up next" — transparent, rule-based, never presented as AI.
//
// Rules run in a fixed order and each carries the honest reason it fired. A
// weakness reason is only ever produced from real graded or self-rated data;
// with no data, the recommendation falls back to coverage.
import type { AnalyticsBundle } from "@/lib/analytics-derive";
import type { ScheduledTask } from "./types";
import { taskState } from "./today";

export type UpNextRule =
  | "today"
  | "overdue"
  | "high-yield"
  | "weak-topic"
  | "next-in-plan";

export interface UpNextResult {
  task: ScheduledTask;
  rule: UpNextRule;
  /** Short student-facing explanation, e.g. "Scheduled for today". */
  reason: string;
}

/** Minimum graded sample before we are willing to call something weak. */
const MIN_GRADED_ATTEMPTS = 5;
const WEAK_ACCURACY = 65;

function openTasks(tasks: ScheduledTask[]): ScheduledTask[] {
  return tasks.filter((t) => t.status === "scheduled");
}

function firstOpen(tasks: ScheduledTask[]): ScheduledTask | undefined {
  // In-progress work comes first: finishing beats starting something new.
  const open = openTasks(tasks);
  const started = open.filter((t) => taskState(t) === "in-progress");
  return started[0] ?? open[0];
}

function weakModules(analytics: AnalyticsBundle | null): Set<string> {
  const weak = new Set<string>();
  for (const s of analytics?.graded.perSubject ?? []) {
    if (s.attempted >= MIN_GRADED_ATTEMPTS && s.accuracy < WEAK_ACCURACY) weak.add(s.subject);
  }
  return weak;
}

/**
 * Pick the single next thing to do.
 *
 * @param todayTasks tasks scheduled for today
 * @param missed     still-open tasks from earlier days
 * @param upcoming   open tasks after today, in schedule order
 */
export function pickUpNext(
  todayTasks: ScheduledTask[],
  missed: ScheduledTask[],
  upcoming: ScheduledTask[],
  analytics: AnalyticsBundle | null = null,
): UpNextResult | null {
  const openToday = openTasks(todayTasks);

  // 1. High-yield and weakness are refinements WITHIN today's open work, so the
  //    plan is never abandoned just to chase a signal.
  if (openToday.length > 0) {
    const weak = weakModules(analytics);
    const weakPick = openToday.find((t) => weak.has(t.module));
    const highYield = openToday.find((t) => t.priority === "high");
    const inProgress = openToday.find((t) => taskState(t) === "in-progress");

    if (inProgress) {
      return { task: inProgress, rule: "today", reason: "Part-finished today" };
    }
    if (weakPick) {
      return {
        task: weakPick,
        rule: "weak-topic",
        reason: "Based on your recent performance",
      };
    }
    if (highYield) {
      return { task: highYield, rule: "high-yield", reason: "Heavily tested topic" };
    }
    return { task: openToday[0], rule: "today", reason: "Scheduled for today" };
  }

  // 2. Nothing left today: pick up overdue work before pulling tomorrow forward.
  const overdue = firstOpen(missed);
  if (overdue) {
    return {
      task: overdue,
      rule: "overdue",
      reason: `Overdue from ${overdueLabel(overdue.date)}`,
    };
  }

  const next = firstOpen(upcoming);
  if (next) {
    return { task: next, rule: "next-in-plan", reason: "Next in your plan" };
  }
  return null;
}

function overdueLabel(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "an earlier day";
  return d.toLocaleDateString(undefined, { weekday: "long" });
}
