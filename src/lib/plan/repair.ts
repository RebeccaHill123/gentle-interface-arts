// Deterministic self-healing for schedule task collections.
//
// A historical recalibration bug retained a missed past task as BOTH a
// `status:"scheduled"` past record and an appended `status:"skipped"` record
// under the same task id. Because the past scheduled copy stayed eligible as
// "missed", every dashboard pass recalibrated again, appended another duplicate
// and bumped `scheduleVersion` — producing runaway versions and absurd
// "Last 7 days" totals.
//
// Task identity (`id`) is the canonical key: exactly one record per id.
// Repair is pure, deterministic and never invents or deletes real outcomes.
import type { PlanSchedule, ScheduledTask } from "./types";

/**
 * Which copy of a duplicated id survives.
 * completed work always wins; then the active future record (an in-flight
 * carried/moved session); then recorded skips; then a stale past scheduled row.
 */
function score(task: ScheduledTask, today: string): number {
  if (task.status === "completed") return 400;
  if (task.status === "scheduled" && task.date >= today) return 300;
  if (task.status === "skipped") return 200;
  return 100; // past, still "scheduled" — the stale artefact of the bug
}

/** Carry non-destructive evidence from discarded siblings onto the winner. */
function absorb(winner: ScheduledTask, other: ScheduledTask): ScheduledTask {
  return {
    ...winner,
    actualMinutes: winner.actualMinutes ?? other.actualMinutes,
    sessionId: winner.sessionId ?? other.sessionId,
    completedAt: winner.completedAt ?? (winner.status === "completed" ? other.completedAt : undefined),
    movedFrom: winner.movedFrom ?? other.movedFrom,
    skipReason: winner.status === "skipped" ? (winner.skipReason ?? other.skipReason) : winner.skipReason,
    skippedAt: winner.status === "skipped" ? (winner.skippedAt ?? other.skippedAt) : winner.skippedAt,
  };
}

/**
 * Collapse a task list to one canonical record per id. Order is stable
 * (date, then id) so repeated runs produce byte-identical output.
 *
 * `today` only ranks a still-open future record above a recorded skip; pass ""
 * (the default) when every scheduled record should be treated as active.
 */
export function dedupeTasksById(tasks: ScheduledTask[], today = ""): ScheduledTask[] {

  const byId = new Map<string, ScheduledTask>();
  for (const task of tasks) {
    const current = byId.get(task.id);
    if (!current) {
      byId.set(task.id, task);
      continue;
    }
    const a = score(current, today);
    const b = score(task, today);
    let winner: ScheduledTask;
    let loser: ScheduledTask;
    if (b > a) {
      winner = task;
      loser = current;
    } else if (b < a) {
      winner = current;
      loser = task;
    } else {
      // Same class: prefer the newer record, deterministically.
      const newer =
        task.createdInVersion > current.createdInVersion ||
        (task.createdInVersion === current.createdInVersion && task.date > current.date);
      winner = newer ? task : current;
      loser = newer ? current : task;
    }
    byId.set(task.id, absorb(winner, loser));
  }
  return [...byId.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
  );
}

export interface RepairResult {
  schedule: PlanSchedule;
  changed: boolean;
  /** Number of duplicate task records removed. */
  removed: number;
}

/**
 * Repair a possibly-corrupted schedule. Only duplicate task identities are
 * removed — dates, statuses, recorded minutes, session ids and revisions are
 * left untouched, and `scheduleVersion` is never bumped by a repair.
 */
export function repairSchedule(schedule: PlanSchedule, today: string): RepairResult {
  const tasks = dedupeTasksById(schedule.tasks, today);
  const removed = schedule.tasks.length - tasks.length;
  if (removed === 0) return { schedule, changed: false, removed: 0 };
  return { schedule: { ...schedule, tasks }, changed: true, removed };
}
