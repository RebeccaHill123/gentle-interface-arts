// Persistence + orchestration for the adaptive schedule.
//
// The schedule lives additively on the legacy `StoredPlan` envelope, so every
// existing reader keeps working. `plan.todayTasks` is mirrored from today's
// scheduled tasks (dual-write compatibility), and `completedTaskIds` keeps its
// index semantics for legacy surfaces.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {

  loadPlan,
  savePlan,
  savePlanAndSync,
  pullPlanFromCloud,
  type OnboardingInput,
  type StoredPlan,
  type StrategyTask,
} from "@/lib/plan-store";
import type { AnalyticsBundle } from "@/lib/analytics-derive";
import { buildPlanEvidence } from "./evidence";
import {
  capacityOutlook,
  mergeSchedules,
  moveTask,
  recalibrate,
  setTaskStatus,
} from "./recalibrate";
import { repairSchedule } from "./repair";

import type {
  PlanRevisionRecord,
  PlanSchedule,
  RecalibrationTrigger,
  ScheduledTask,
  SkipReason,
} from "./types";
import { localDateFor } from "@/lib/study-log";
import { diffDaysKey } from "./dates";

export function getSchedule(stored: StoredPlan | null): PlanSchedule | null {
  const schedule = stored?.schedule as PlanSchedule | undefined;
  return schedule && schedule.version === 2 ? schedule : null;
}


export function tasksForDate(schedule: PlanSchedule, date: string): ScheduledTask[] {
  return schedule.tasks
    .filter((t) => t.date === date)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function upcomingTasks(
  schedule: PlanSchedule,
  fromDate: string,
  days = 7,
): ScheduledTask[] {
  return schedule.tasks
    .filter((t) => {
      const delta = diffDaysKey(fromDate, t.date);
      return delta >= 0 && delta < days;
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

function toStrategyTask(t: ScheduledTask): StrategyTask {
  return {
    title: t.title,
    module: t.module,
    minutes: t.minutes,
    taskType: t.taskType,
    priority: t.priority,
    why: t.why,
    subtopic: t.subtopic,
    difficulty: t.difficulty,
    output: t.output,
    bucket: t.bucket,
  };
}

/** Mirror today's schedule into the legacy plan shape. */
export function applySchedule(
  stored: StoredPlan,
  schedule: PlanSchedule,
  today: string = localDateFor(),
): StoredPlan {
  const todays = tasksForDate(schedule, today);
  return {
    ...stored,
    schedule,
    plan: {
      ...stored.plan,
      todayTasks: todays.map(toStrategyTask),
    },
    completedTaskIds: todays
      .map((t, i) => (t.status === "completed" ? String(i) : null))
      .filter((v): v is string => v !== null),
  } as StoredPlan;
}

export interface EnsureScheduleResult {
  stored: StoredPlan;
  schedule: PlanSchedule;
  revision: PlanRevisionRecord | null;
}

/**
 * Ensure the plan has an up-to-date schedule, recalibrating when a trigger
 * fires. Idempotent: unchanged evidence with a non-forcing trigger is a no-op.
 */
export async function ensureSchedule(
  stored: StoredPlan,
  analytics: AnalyticsBundle | null,
  trigger: RecalibrationTrigger = "completion",
  options: { persist?: boolean; today?: string } = {},
): Promise<EnsureScheduleResult> {
  const today = options.today ?? localDateFor();
  const evidence = buildPlanEvidence(stored.input, analytics, today);
  // Self-heal first: a schedule corrupted by the historical duplicate-task bug
  // is repaired deterministically before any recalibration decision is made.
  const raw = getSchedule(stored);
  const repair = raw ? repairSchedule(raw, today) : null;
  const existing = repair?.schedule ?? null;
  if (repair?.changed) {
    console.warn(`plan repair: removed ${repair.removed} duplicate task record(s)`);
  }
  const idle = evidence.daysSinceLastActivity;
  const effectiveTrigger: RecalibrationTrigger =
    !existing
      ? "initial"
      : idle !== null && idle >= 7
        ? "return-after-inactivity"
        : trigger;

  const result = recalibrate({
    schedule: existing,
    input: stored.input,
    evidence,
    trigger: effectiveTrigger,
  });

  if (!result.changed && existing) {
    // Persist the repair itself exactly once — repeated loads find it clean and
    // save nothing, so no render/save loop is possible.
    if (!repair?.changed) return { stored, schedule: existing, revision: null };
    const repaired = applySchedule(stored, existing, today);
    if (options.persist !== false) {
      savePlan(repaired);
      void persistSchedule(repaired).catch((e) => console.warn("persistSchedule failed", e));
    }
    return { stored: repaired, schedule: existing, revision: null };
  }

  const next = applySchedule(stored, result.schedule, today);
  if (options.persist !== false) {
    savePlan(next);
    void persistSchedule(next).catch((e) => console.warn("persistSchedule failed", e));
    if (result.revision) {
      void logRevision(result.schedule.planId, result.revision).catch(() => {});
    }
  }
  return { stored: next, schedule: result.schedule, revision: result.revision };

}

/** Best-effort audit trail of every accepted recalibration. Never blocks the UI. */
export async function logRevision(
  planId: string,
  revision: PlanRevisionRecord,
): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const uid = data.user?.id;
  if (!uid) return;
  await supabase.from("plan_revisions").upsert(
    [
      {
        user_id: uid,
        plan_id: planId,
        schedule_version: revision.version,
        trigger: revision.trigger,
        summary: revision.summary,
        changes: revision.changes as unknown as Json,
      },
    ],
    { onConflict: "user_id,plan_id,schedule_version", ignoreDuplicates: true },
  );
}


/**
 * Cloud write with cross-device safety: re-read the remote plan and merge task
 * outcomes before writing, so a stale local copy can never delete history.
 */
export async function persistSchedule(next: StoredPlan): Promise<StoredPlan> {
  const local = getSchedule(next);
  if (!local) {
    await savePlanAndSync(next);
    return next;
  }
  let merged = next;
  try {
    const remote = await pullPlanFromCloud();
    const remoteSchedule = getSchedule(remote);
    if (remoteSchedule && remoteSchedule.planId === local.planId) {
      merged = applySchedule(next, mergeSchedules(remoteSchedule, local, localDateFor()));
    }
  } catch (e) {
    console.warn("schedule merge skipped", e);
  }
  await savePlanAndSync(merged);
  return merged;
}

async function mutate(
  fn: (schedule: PlanSchedule) => { schedule: PlanSchedule; ok?: boolean; reason?: string },
): Promise<{ stored: StoredPlan | null; ok: boolean; reason?: string }> {
  const stored = loadPlan();
  const schedule = getSchedule(stored);
  if (!stored || !schedule) return { stored, ok: false, reason: "No schedule yet." };
  const res = fn(schedule);
  if (res.ok === false) return { stored, ok: false, reason: res.reason };
  const next = applySchedule(stored, res.schedule);
  savePlan(next);
  void persistSchedule(next).catch((e) => console.warn("persistSchedule failed", e));
  return { stored: next, ok: true };
}

export function completeScheduledTask(
  taskId: string,
  detail: { actualMinutes?: number; sessionId?: string } = {},
) {
  return mutate((s) => ({ schedule: setTaskStatus(s, taskId, "completed", detail) }));
}

export function reopenScheduledTask(taskId: string) {
  return mutate((s) => ({ schedule: setTaskStatus(s, taskId, "scheduled") }));
}

export function skipScheduledTask(taskId: string, skipReason?: SkipReason) {
  return mutate((s) => ({ schedule: setTaskStatus(s, taskId, "skipped", { skipReason }) }));
}

/** Remaining capacity per day for the reschedule picker. */
export function scheduleCapacity(schedule: PlanSchedule | null, fromDate: string, days = 7) {
  if (!schedule) return [];
  return capacityOutlook(schedule, fromDate, days);
}

/** Scheduled work that is still open on days before `today`. */
export function missedTasks(schedule: PlanSchedule | null, today: string): ScheduledTask[] {
  if (!schedule) return [];
  return schedule.tasks
    .filter((t) => t.status === "scheduled" && t.date < today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function rescheduleScheduledTask(taskId: string, toDate: string) {
  return mutate((s) => moveTask(s, taskId, toDate));
}

/** Availability / exam-date change: rebuild the future immediately. */
export async function applyPlanSettings(
  patch: Partial<Pick<OnboardingInput, "hoursPerWeek" | "examDate">>,
  analytics: AnalyticsBundle | null,
): Promise<EnsureScheduleResult | null> {
  const stored = loadPlan();
  if (!stored) return null;
  const updated: StoredPlan = {
    ...stored,
    input: { ...stored.input, ...patch },
  };
  return ensureSchedule(updated, analytics, "availability-change");
}

export function latestRevision(schedule: PlanSchedule | null): PlanRevisionRecord | null {
  if (!schedule || schedule.revisions.length === 0) return null;
  return schedule.revisions[schedule.revisions.length - 1];
}
