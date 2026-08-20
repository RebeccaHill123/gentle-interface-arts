// Phase 2 adaptive planning engine — shared types.
//
// The schedule is the single authoritative future plan. It is additive to the
// legacy `StoredPlan` envelope (stored under `StoredPlan.schedule`), so every
// existing reader keeps working while the engine owns forward scheduling.
//
// Invariants enforced across this module:
//  - task identity is stable (`id`) for the life of the plan;
//  - history (past dates, completed/skipped work) is never rewritten;
//  - only dates >= today may be rebuilt by a recalibration;
//  - every change carries a human explanation recorded in `revisions`.
import type {
  StrategyTaskType,
  TaskBucket,
  TaskDifficulty,
} from "@/lib/plan-store";

export type TaskStatus = "scheduled" | "completed" | "skipped";

/** Why a student skipped a session. Drives how the engine reacts. */
export type SkipReason =
  | "no-time"
  | "too-hard"
  | "already-covered"
  | "not-useful"
  | "other";

export interface ScheduledTask {
  /** Stable for the life of the plan. */
  id: string;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  module: string;
  subtopic?: string;
  title: string;
  minutes: number;
  taskType: StrategyTaskType;
  difficulty: TaskDifficulty;
  bucket: TaskBucket;
  priority: "high" | "medium" | "low";
  /** Explanation shown to the student. */
  why: string;
  output?: string;
  status: TaskStatus;
  completedAt?: string;
  /** Set when a task was carried forward from a missed day. */
  movedFrom?: string;
  /** Evidence class that put this task in the plan (stored provenance). */
  evidence?: import("./priority").PriorityEvidenceClass;
  /** Short student-facing provenance chip, generated when the task was built. */
  evidenceLabel?: string;
  /** Real minutes recorded against this task when it was completed. */
  actualMinutes?: number;
  /** Focus-session id that completed this task (idempotency trace). */
  sessionId?: string;
  /** Set when the student skipped the task. */
  skipReason?: SkipReason;
  skippedAt?: string;
  /** Schedule version that first created this task. */
  createdInVersion: number;
}

export type RecalibrationTrigger =
  | "initial"
  | "completion"
  | "missed-work"
  | "graded-performance"
  | "availability-change"
  | "return-after-inactivity"
  | "manual";

export type PlanChangeKind =
  | "added"
  | "removed"
  | "moved"
  | "reprioritised"
  | "capacity";

export interface PlanChange {
  kind: PlanChangeKind;
  detail: string;
  module?: string;
  date?: string;
}

export interface PlanRevisionRecord {
  version: number;
  at: string;
  trigger: RecalibrationTrigger;
  /** One-line student-facing summary of the revision. */
  summary: string;
  changes: PlanChange[];
}

export interface PlanSchedule {
  version: 2;
  /** Stable plan identity; survives every recalibration. */
  planId: string;
  /** Increments on every accepted recalibration (optimistic concurrency). */
  scheduleVersion: number;
  generatedAt: string;
  lastRecalibratedAt: string;
  examDate: string;
  hoursPerWeek: number;
  horizonDays: number;
  tasks: ScheduledTask[];
  revisions: PlanRevisionRecord[];
  /** Fingerprint of the evidence the future was last built from. */
  evidenceSignature?: string;
}

/** Per-subject evidence used to prioritise. Correctness first, effort never. */
export interface SubjectEvidence {
  module: string;
  /** Graded accuracy 0..100, null when the sample is too small. */
  accuracy: number | null;
  gradedAttempts: number;
  /** Effort only — used for coverage detection, never for weakness claims. */
  minutes: number;
  /** Days since last recorded activity, null when never studied. */
  recencyDays: number | null;
  /** Explicit self-rating 1..5, only when the user actually rated it. */
  confidence?: number;
  rated: boolean;
}

export interface PlanEvidence {
  /** Local "today" for the user. */
  today: string;
  subjects: SubjectEvidence[];
  /** Days since ANY recorded activity, null when nothing recorded yet. */
  daysSinceLastActivity: number | null;
  /** True when there are logged misses available for mistake-review tasks. */
  hasMistakeEvidence: boolean;
}
