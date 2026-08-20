// Recalibration: rewrite ONLY the future, preserve all history, explain every
// change.
//
// Guarantees:
//  - tasks dated before `today`, and any completed/skipped task, are immutable;
//  - missed high-priority work is carried forward within realistic capacity;
//  - identical evidence + trigger is a no-op (idempotent, debounce-safe);
//  - each accepted revision bumps `scheduleVersion` and appends an audit
//    record with a student-facing summary and a change list.
import type { OnboardingInput } from "@/lib/plan-store";
import { addDaysKey } from "./dates";
import { evidenceSignature, prioritiseSubjects } from "./priority";
import { buildSchedule, DEFAULT_HORIZON_DAYS, MAX_DAY_MINUTES } from "./schedule";
import type {
  PlanChange,
  PlanEvidence,
  PlanRevisionRecord,
  PlanSchedule,
  RecalibrationTrigger,
  ScheduledTask,
  SkipReason,
} from "./types";

/** Triggers that always rebuild, even when the evidence fingerprint matches. */
const FORCE_TRIGGERS: RecalibrationTrigger[] = [
  "initial",
  "availability-change",
  "manual",
];

/** Max carried-forward tasks added to a single day. */
const MAX_CARRY_PER_DAY = 2;

export interface RecalibrateArgs {
  schedule: PlanSchedule | null;
  input: OnboardingInput;
  evidence: PlanEvidence;
  trigger: RecalibrationTrigger;
  now?: string;
  horizonDays?: number;
  planId?: string;
}

export interface RecalibrateResult {
  schedule: PlanSchedule;
  /** null when nothing changed (idempotent no-op). */
  revision: PlanRevisionRecord | null;
  changed: boolean;
}

function newPlanId(): string {
  return `plan_${Math.random().toString(36).slice(2, 10)}`;
}

export function createSchedule(args: RecalibrateArgs): PlanSchedule {
  const today = args.evidence.today;
  const planId = args.planId ?? newPlanId();
  const version = 1;
  const tasks = buildSchedule({
    input: args.input,
    evidence: args.evidence,
    fromDate: today,
    horizonDays: args.horizonDays ?? DEFAULT_HORIZON_DAYS,
    version,
    planId,
  });
  const nowIso = args.now ?? new Date().toISOString();
  const priorities = prioritiseSubjects(args.evidence).slice(0, 2);
  return {
    version: 2,
    planId,
    scheduleVersion: version,
    generatedAt: nowIso,
    lastRecalibratedAt: nowIso,
    examDate: args.input.examDate,
    hoursPerWeek: args.input.hoursPerWeek,
    horizonDays: args.horizonDays ?? DEFAULT_HORIZON_DAYS,
    tasks,
    evidenceSignature: evidenceSignature(args.evidence),
    revisions: [
      {
        version,
        at: nowIso,
        trigger: "initial",
        summary: priorities.length
          ? `Plan built. Leading with ${priorities.map((p) => p.module).join(" and ")}.`
          : "Plan built from your exam date and weekly availability.",
        changes: [
          {
            kind: "added",
            detail: `${tasks.length} sessions scheduled across the next ${
              args.horizonDays ?? DEFAULT_HORIZON_DAYS
            } days.`,
          },
        ],
      },
    ],
  };
}

/** Immutable history: past days plus anything the student already acted on. */
function isHistory(task: ScheduledTask, today: string): boolean {
  return task.date < today || task.status !== "scheduled";
}

function minutesOnDay(tasks: ScheduledTask[], date: string): number {
  return tasks.filter((t) => t.date === date).reduce((a, t) => a + t.minutes, 0);
}

function carryForwardMissed(
  missed: ScheduledTask[],
  future: ScheduledTask[],
  today: string,
  version: number,
): { carried: ScheduledTask[]; changes: PlanChange[] } {
  const changes: PlanChange[] = [];
  const carried: ScheduledTask[] = [];
  const counts = new Map<string, number>();
  const ordered = [...missed].sort(
    (a, b) =>
      (a.bucket === "must" ? 0 : a.bucket === "should" ? 1 : 2) -
        (b.bucket === "must" ? 0 : b.bucket === "should" ? 1 : 2) ||
      a.date.localeCompare(b.date),
  );

  for (const task of ordered) {
    if (task.bucket === "optional") {
      changes.push({
        kind: "removed",
        module: task.module,
        date: task.date,
        detail: `Dropped optional missed session (${task.module}) to protect your realistic capacity.`,
      });
      continue;
    }
    let placed = false;
    for (let offset = 0; offset < 7; offset++) {
      const date = addDaysKey(today, offset);
      const used = counts.get(date) ?? 0;
      if (used >= MAX_CARRY_PER_DAY) continue;
      const load = minutesOnDay([...future, ...carried], date);
      if (load + task.minutes > MAX_DAY_MINUTES) continue;
      counts.set(date, used + 1);
      carried.push({ ...task, date, movedFrom: task.date, createdInVersion: version });
      changes.push({
        kind: "moved",
        module: task.module,
        date,
        detail: `Moved missed ${task.module} session from ${task.date} to ${date}.`,
      });
      placed = true;
      break;
    }
    if (!placed) {
      changes.push({
        kind: "removed",
        module: task.module,
        date: task.date,
        detail: `Couldn't fit the missed ${task.module} session without overloading your week, so it was dropped rather than stacked.`,
      });
    }
  }
  return { carried, changes };
}

function summarise(
  trigger: RecalibrationTrigger,
  changes: PlanChange[],
  evidence: PlanEvidence,
): string {
  const lead = prioritiseSubjects(evidence)[0];
  const moved = changes.filter((c) => c.kind === "moved").length;
  switch (trigger) {
    case "availability-change":
      return `Rebuilt your future weeks around your new availability${
        lead ? `, still leading with ${lead.module}` : ""
      }.`;
    case "graded-performance":
      return lead
        ? `Your graded results moved ${lead.module} to the front: ${lead.reason}`
        : "Updated your upcoming sessions from your latest graded results.";
    case "missed-work":
      return moved
        ? `Reshuffled ${moved} missed session${moved === 1 ? "" : "s"} into your next available days.`
        : "Adjusted your upcoming days after missed work.";
    case "return-after-inactivity":
      return `Welcome back — upcoming days were rebuilt from today${
        lead ? `, starting with ${lead.module}` : ""
      }.`;
    case "completion":
      return lead
        ? `Updated what's next based on the work you logged. ${lead.module} now leads: ${lead.reason}`
        : "Updated what's next based on the work you logged.";
    default:
      return "Updated your upcoming sessions.";
  }
}

export function recalibrate(args: RecalibrateArgs): RecalibrateResult {
  const today = args.evidence.today;
  if (!args.schedule) {
    const schedule = createSchedule(args);
    return { schedule, revision: schedule.revisions[0], changed: true };
  }

  const current = args.schedule;
  const signature = evidenceSignature(args.evidence);
  const availabilityChanged =
    current.hoursPerWeek !== args.input.hoursPerWeek ||
    current.examDate !== args.input.examDate;

  const missedInFuture = current.tasks.filter(
    (t) => t.status === "scheduled" && t.date < today,
  );

  if (
    !FORCE_TRIGGERS.includes(args.trigger) &&
    !availabilityChanged &&
    missedInFuture.length === 0 &&
    current.evidenceSignature === signature
  ) {
    return { schedule: current, revision: null, changed: false };
  }

  const version = current.scheduleVersion + 1;
  const history = current.tasks.filter((t) => isHistory(t, today));
  const replacedFuture = current.tasks.filter((t) => !isHistory(t, today));

  const fresh = buildSchedule({
    input: args.input,
    evidence: args.evidence,
    fromDate: today,
    horizonDays: args.horizonDays ?? current.horizonDays,
    version,
    planId: current.planId,
  });

  const { carried, changes: carryChanges } = carryForwardMissed(
    missedInFuture,
    fresh,
    today,
    version,
  );

  const changes: PlanChange[] = [...carryChanges];
  const beforeByModule = countByModule(replacedFuture);
  const afterByModule = countByModule([...fresh, ...carried]);
  for (const module of new Set([
    ...Object.keys(beforeByModule),
    ...Object.keys(afterByModule),
  ])) {
    const before = beforeByModule[module] ?? 0;
    const after = afterByModule[module] ?? 0;
    if (after > before) {
      const p = prioritiseSubjects(args.evidence).find((x) => x.module === module);
      changes.push({
        kind: "reprioritised",
        module,
        detail: `${module}: ${before} → ${after} upcoming sessions. ${p?.reason ?? ""}`.trim(),
      });
    } else if (after < before) {
      changes.push({
        kind: "reprioritised",
        module,
        detail: `${module}: ${before} → ${after} upcoming sessions to make room for higher-priority work.`,
      });
    }
  }
  if (availabilityChanged) {
    changes.unshift({
      kind: "capacity",
      detail: `Weekly capacity now ${args.input.hoursPerWeek}h (was ${current.hoursPerWeek}h).`,
    });
  }

  const revision: PlanRevisionRecord = {
    version,
    at: args.now ?? new Date().toISOString(),
    trigger: availabilityChanged ? "availability-change" : args.trigger,
    summary: summarise(
      availabilityChanged ? "availability-change" : args.trigger,
      changes,
      args.evidence,
    ),
    changes,
  };

  // Missed scheduled tasks are retained as history (marked skipped) so nothing
  // silently disappears from the record.
  const retiredMissed: ScheduledTask[] = missedInFuture.map((t) => ({
    ...t,
    status: "skipped",
  }));

  const schedule: PlanSchedule = {
    ...current,
    scheduleVersion: version,
    lastRecalibratedAt: revision.at,
    examDate: args.input.examDate,
    hoursPerWeek: args.input.hoursPerWeek,
    horizonDays: args.horizonDays ?? current.horizonDays,
    evidenceSignature: signature,
    tasks: [...history, ...retiredMissed, ...fresh, ...carried].sort(
      (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id),
    ),
    revisions: [...current.revisions, revision].slice(-25),
  };

  return { schedule, revision, changed: true };
}

function countByModule(tasks: ScheduledTask[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of tasks) out[t.module] = (out[t.module] ?? 0) + 1;
  return out;
}

/** Mark a task complete/skipped without touching the rest of the schedule. */
export function setTaskStatus(
  schedule: PlanSchedule,
  taskId: string,
  status: ScheduledTask["status"],
  detail: {
    nowIso?: string;
    actualMinutes?: number;
    sessionId?: string;
    skipReason?: SkipReason;
  } = {},
): PlanSchedule {
  const now = detail.nowIso ?? new Date().toISOString();
  return {
    ...schedule,
    tasks: schedule.tasks.map((t) => {
      if (t.id !== taskId) return t;
      if (status === "completed") {
        return {
          ...t,
          status,
          completedAt: now,
          actualMinutes: detail.actualMinutes ?? t.actualMinutes,
          sessionId: detail.sessionId ?? t.sessionId,
          skipReason: undefined,
          skippedAt: undefined,
        };
      }
      if (status === "skipped") {
        return {
          ...t,
          status,
          completedAt: undefined,
          skipReason: detail.skipReason ?? "other",
          skippedAt: now,
        };
      }
      return { ...t, status, completedAt: undefined, skipReason: undefined, skippedAt: undefined };
    }),
  };
}

/** Days with remaining capacity in the next `days` days, for reschedule UI. */
export function capacityOutlook(
  schedule: PlanSchedule,
  fromDate: string,
  days = 7,
): { date: string; usedMinutes: number; freeMinutes: number }[] {
  const out: { date: string; usedMinutes: number; freeMinutes: number }[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDaysKey(fromDate, i);
    const used = minutesOnDay(schedule.tasks, date);
    out.push({ date, usedMinutes: used, freeMinutes: Math.max(0, MAX_DAY_MINUTES - used) });
  }
  return out;
}

/** Student-driven reschedule of a single future task. Capacity is respected. */
export function moveTask(
  schedule: PlanSchedule,
  taskId: string,
  toDate: string,
): { schedule: PlanSchedule; ok: boolean; reason?: string } {
  const task = schedule.tasks.find((t) => t.id === taskId);
  if (!task || task.status !== "scheduled") {
    return { schedule, ok: false, reason: "That session can no longer be moved." };
  }
  const load = minutesOnDay(schedule.tasks, toDate);
  if (load + task.minutes > MAX_DAY_MINUTES) {
    return {
      schedule,
      ok: false,
      reason: "That day is already full — pick another day to keep the plan realistic.",
    };
  }
  return {
    schedule: {
      ...schedule,
      tasks: schedule.tasks.map((t) =>
        t.id === taskId ? { ...t, date: toDate, movedFrom: t.movedFrom ?? t.date } : t,
      ),
    },
    ok: true,
  };
}

/**
 * Merge a remote schedule with local edits. Used for cross-device safety: the
 * higher version wins as the structural base, and task outcomes are unioned so
 * completed/skipped work is never lost.
 */
export function mergeSchedules(
  remote: PlanSchedule,
  local: PlanSchedule,
): PlanSchedule {
  if (remote.planId !== local.planId) {
    return remote.scheduleVersion >= local.scheduleVersion ? remote : local;
  }
  const base = remote.scheduleVersion >= local.scheduleVersion ? remote : local;
  const other = base === remote ? local : remote;
  const outcomes = new Map<string, ScheduledTask>();
  for (const t of other.tasks) if (t.status !== "scheduled") outcomes.set(t.id, t);
  for (const t of base.tasks) if (t.status !== "scheduled") outcomes.set(t.id, t);

  const seen = new Set(base.tasks.map((t) => t.id));
  const extraHistory = [...outcomes.values()].filter((t) => !seen.has(t.id));

  return {
    ...base,
    tasks: [
      ...base.tasks.map((t) => outcomes.get(t.id) ?? t),
      ...extraHistory,
    ].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)),
    revisions: dedupeRevisions([...base.revisions, ...other.revisions]),
  };
}

function dedupeRevisions(list: PlanRevisionRecord[]): PlanRevisionRecord[] {
  const map = new Map<number, PlanRevisionRecord>();
  for (const r of list) if (!map.has(r.version)) map.set(r.version, r);
  return [...map.values()].sort((a, b) => a.version - b.version).slice(-25);
}
