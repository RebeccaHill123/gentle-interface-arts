// Deterministic forward scheduler.
//
// Given onboarding inputs plus real evidence, it produces day-by-day study
// blocks that respect realistic capacity, cover the full syllabus, and lead
// with evidence-backed priorities. Pure: no I/O, no Date.now() except through
// the caller-supplied `today`.
import {
  buildSpecificTask,
  buildStudyDurations,
  getStudyPhase,
} from "@/lib/study-plan-logic";
import type { ModuleConfidence, OnboardingInput } from "@/lib/plan-store";
import { addDaysKey, diffDaysKey } from "./dates";
import { prioritiseSubjects, type SubjectPriority } from "./priority";
import type { PlanEvidence, ScheduledTask } from "./types";

/** Never schedule more than this in one day, whatever the weekly target. */
export const MAX_DAY_MINUTES = 210;
/** Default forward window the engine keeps fully scheduled. */
export const DEFAULT_HORIZON_DAYS = 28;

export interface BuildScheduleArgs {
  input: OnboardingInput;
  evidence: PlanEvidence;
  /** First day to schedule (inclusive), YYYY-MM-DD. */
  fromDate: string;
  horizonDays?: number;
  /** Schedule version stamped on the produced tasks. */
  version: number;
  /** Deterministic id prefix (plan identity). */
  planId: string;
}

function moduleFor(
  input: OnboardingInput,
  name: string,
): ModuleConfidence {
  return (
    input.modules.find((m) => m.name === name) ?? {
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      confidence: 3,
      weakSubtopics: [],
    }
  );
}

/**
 * Study days per week derived from the weekly target: a realistic capacity
 * model rather than "spread everything over seven days".
 */
export function studyDaysPerWeek(hoursPerWeek: number): number {
  const hpw = Math.max(1, hoursPerWeek);
  if (hpw <= 4) return 3;
  if (hpw <= 8) return 4;
  if (hpw <= 14) return 5;
  return 6;
}

/** Blocks per week, longest first, totalling the weekly target. */
export function weeklyBlocks(hoursPerWeek: number): number[] {
  return buildStudyDurations(hoursPerWeek);
}

/** Apportion week blocks across the week's study days, capped per day. */
export function distributeWeek(
  blocks: number[],
  daysAvailable: number,
  dayCap: number,
): { perDay: number[][]; dropped: number[] } {
  const days = Math.max(1, daysAvailable);
  const perDay: number[][] = Array.from({ length: days }, () => []);
  const totals = new Array<number>(days).fill(0);
  const dropped: number[] = [];
  for (const block of blocks) {
    // Least-loaded day that can still take the block.
    let best = -1;
    for (let i = 0; i < days; i++) {
      if (totals[i] + block > dayCap) continue;
      if (best === -1 || totals[i] < totals[best]) best = i;
    }
    if (best === -1) {
      dropped.push(block);
      continue;
    }
    perDay[best].push(block);
    totals[best] += block;
  }
  return { perDay, dropped };
}

/**
 * Which subject each block belongs to. Largest-remainder apportionment by
 * evidence weight with a per-week cap so no single subject swallows a week,
 * then round-robin so days alternate subjects.
 */
export function rotateSubjects(
  priorities: SubjectPriority[],
  slots: number,
): string[] {
  if (priorities.length === 0 || slots <= 0) return [];
  const cap = Math.max(1, Math.ceil(slots * 0.4));
  const weights = priorities.map((p) => p.weight);
  const total = weights.reduce((a, b) => a + b, 0) || priorities.length;
  const exact = weights.map((w) => (w / total) * slots);
  const counts = exact.map((v) => Math.min(cap, Math.floor(v)));
  let remaining = slots - counts.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  let guard = 0;
  while (remaining > 0 && guard < slots * 4) {
    let placed = false;
    for (const { i } of order) {
      if (remaining <= 0) break;
      if (counts[i] < cap) {
        counts[i] += 1;
        remaining -= 1;
        placed = true;
      }
    }
    if (!placed) break;
    guard += 1;
  }
  const rotation: string[] = [];
  const pool = counts.slice();
  while (rotation.length < slots) {
    let progressed = false;
    for (let i = 0; i < priorities.length; i++) {
      if (pool[i] > 0 && rotation.length < slots) {
        rotation.push(priorities[i].module);
        pool[i] -= 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  while (rotation.length < slots) {
    rotation.push(priorities[rotation.length % priorities.length].module);
  }
  return rotation;
}

/**
 * Build scheduled tasks for [fromDate, fromDate + horizon). Deterministic for
 * a given (input, evidence, fromDate, version, planId).
 */
export function buildSchedule(args: BuildScheduleArgs): ScheduledTask[] {
  const { input, evidence, fromDate, version, planId } = args;
  const daysToExam = input.examDate
    ? Math.max(1, diffDaysKey(fromDate, input.examDate))
    : 90;
  const horizon = Math.max(
    1,
    Math.min(args.horizonDays ?? DEFAULT_HORIZON_DAYS, daysToExam),
  );
  const intensity = input.intensity ?? "intermediate";
  const priorities = prioritiseSubjects(evidence);
  const blocks = weeklyBlocks(input.hoursPerWeek);
  const activeDays = studyDaysPerWeek(input.hoursPerWeek);
  const dayCap = Math.min(
    MAX_DAY_MINUTES,
    Math.max(30, Math.ceil((input.hoursPerWeek * 60) / activeDays / 15) * 15),
  );

  const tasks: ScheduledTask[] = [];
  let seq = 0;

  const weeks = Math.ceil(horizon / 7);
  for (let w = 0; w < weeks; w++) {
    const weekStart = addDaysKey(fromDate, w * 7);
    const daysLeft = horizon - w * 7;
    const daysThisWeek = Math.min(7, daysLeft);
    const usableDays = Math.min(activeDays, daysThisWeek);
    const { perDay } = distributeWeek(blocks, usableDays, dayCap);
    const flatCount = perDay.reduce((a, d) => a + d.length, 0);
    const rotation = rotateSubjects(priorities, flatCount);

    // Phase is recomputed per week so the mix genuinely shifts over time.
    const phase = getStudyPhase(
      Math.max(1, daysToExam - w * 7),
      intensity,
    );

    let rotIdx = 0;
    for (let d = 0; d < perDay.length; d++) {
      const date = addDaysKey(weekStart, d);
      if (input.examDate && date >= input.examDate) continue;
      for (const minutes of perDay[d]) {
        const moduleName = rotation[rotIdx] ?? priorities[0]?.module ?? "Mixed practice";
        const priority = priorities.find((p) => p.module === moduleName);
        const base = buildSpecificTask({
          module: moduleFor(input, moduleName),
          index: rotIdx,
          minutes,
          examPath: input.examPath,
          phase,
          hasMistakeEvidence: evidence.hasMistakeEvidence,
          intensity,
        });
        rotIdx += 1;
        seq += 1;
        tasks.push({
          id: `${planId}-v${version}-${seq}`,
          date,
          module: base.module,
          subtopic: base.subtopic,
          title: base.title,
          minutes: base.minutes,
          taskType: base.taskType ?? "timed-sba",
          difficulty: base.difficulty ?? "core",
          bucket: base.bucket ?? "must",
          priority:
            priority && priority.score >= 80
              ? "high"
              : priority && priority.score >= 40
                ? "medium"
                : base.priority ?? "medium",
          why: priority ? `${priority.reason} ${base.why ?? ""}`.trim() : base.why ?? "",
          evidence: priority?.evidence ?? "rotation",
          evidenceLabel: priority?.label ?? "Syllabus coverage",
          output: base.output,
          status: "scheduled",
          createdInVersion: version,
        });
      }
    }
  }

  return tasks.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}
