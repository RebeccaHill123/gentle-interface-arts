// Isolated, deterministic fixture for the /launch-video preview.
//
// Nothing here is persisted or sent anywhere. It replays the real supported
// path — a weak graded practice result feeding the adaptive planner — using the
// production pure functions only:
//   authored SQE1 bank → scoreSession → buildPlanEvidence → createSchedule /
//   recalibrate("graded-performance").
// The eligibility rule (completed, scored > 0, accuracy < 70%) is NOT
// re-implemented: the fixture answers are simply chosen to sit below it, and
// the test asserts that, mirroring src/routes/practice.tsx.
import type { OnboardingInput } from "@/lib/plan-store";
import type { PracticeConfig } from "@/lib/practice/config";
import type { QuizQuestion } from "@/lib/practice/quiz-validate";
import { buildPlanEvidence } from "@/lib/plan/evidence";
import { createSchedule, recalibrate } from "@/lib/plan/recalibrate";
import { addDaysKey } from "@/lib/plan/dates";
import type { PlanEvidence, PlanRevisionRecord, PlanSchedule, ScheduledTask } from "@/lib/plan/types";
import { scoreSession } from "@/lib/smart-review/sessions";
import { sqeQuestionsForSubject, toSqeQuizQuestion } from "@/lib/sqe-questions";

export const DEMO_TODAY = "2026-03-04";
const DEMO_YESTERDAY = addDaysKey(DEMO_TODAY, -1);
const DEMO_NOW = `${DEMO_TODAY}T18:00:00.000Z`;
export const DEMO_MODULE = "Contract";
/** Index of the question the film shows being answered. */
export const DEMO_FOCUS_INDEX = 6;

export const DEMO_INPUT: OnboardingInput = {
  name: "Amara",
  examType: "SQE1",
  examPath: "SQE1_FULL",
  intensity: "intermediate",
  examDate: "2026-07-14",
  hoursPerWeek: 12,
  modules: [
    { id: "contract", name: "Contract", confidence: 3, rated: true },
    { id: "tort", name: "Tort", confidence: 3, rated: true },
    { id: "land", name: "Land Law", confidence: 3, rated: true },
    { id: "trusts", name: "Trusts", confidence: 3, rated: true },
  ],
};

export const DEMO_CONFIG: PracticeConfig = {
  source: "practice-launcher",
  formatLabel: "SQE1 single best answer",
  module: DEMO_MODULE,
  questions: 10,
  duration: 17,
  difficulty: "Standard",
  timed: false,
  adaptive: false,
  feedbackMode: "immediate",
  rationale: "Illustrative session",
};

/** Ten authored, cited Contract items from the vetted bank. */
export const DEMO_QUESTIONS: QuizQuestion[] = sqeQuestionsForSubject("contract")
  .slice(0, 10)
  .map(toSqeQuizQuestion);

function wrongOption(q: QuizQuestion): number {
  return (q.correctIndex + 1) % q.options.length;
}

/** Six correct, four incorrect — the focus question is one of the misses. */
const MISSED = new Set([1, 4, DEMO_FOCUS_INDEX, 8]);
export const DEMO_ANSWERS: number[] = DEMO_QUESTIONS.map((q, i) =>
  MISSED.has(i) ? wrongOption(q) : q.correctIndex,
);

export interface LaunchDemo {
  score: ReturnType<typeof scoreSession>;
  accuracyPct: number;
  before: PlanSchedule;
  after: PlanSchedule;
  revision: PlanRevisionRecord | null;
  evidenceBefore: PlanEvidence;
  evidenceAfter: PlanEvidence;
  todayBefore: ScheduledTask[];
  todayAfter: ScheduledTask[];
  upcomingBefore: ScheduledTask[];
  upcomingAfter: ScheduledTask[];
  missedYesterday: ScheduledTask[];
}

function byDate(schedule: PlanSchedule, date: string): ScheduledTask[] {
  return schedule.tasks.filter((t) => t.date === date).sort((a, b) => a.id.localeCompare(b.id));
}

function upcoming(schedule: PlanSchedule, from: string, days: number): ScheduledTask[] {
  const end = addDaysKey(from, days);
  return schedule.tasks
    .filter((t) => t.status === "scheduled" && t.date > from && t.date < end)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function buildLaunchDemo(): LaunchDemo {
  const score = scoreSession({ questions: DEMO_QUESTIONS, answers: DEMO_ANSWERS, flagged: [] });
  const accuracyPct = Math.round(score.accuracy * 100);

  // Plan generated yesterday, before any graded evidence existed.
  const evidenceYesterday = buildPlanEvidence(DEMO_INPUT, null, DEMO_YESTERDAY);
  const before = createSchedule({
    schedule: null,
    input: DEMO_INPUT,
    evidence: evidenceYesterday,
    trigger: "initial",
    planId: "plan_launchdemo",
    now: `${DEMO_YESTERDAY}T08:00:00.000Z`,
  });
  // Yesterday's sessions were not done — they are now missed work.
  const missedYesterday = byDate(before, DEMO_YESTERDAY);

  // Today: the graded Contract session is the only new evidence.
  const base = buildPlanEvidence(DEMO_INPUT, null, DEMO_TODAY);
  const evidenceBefore: PlanEvidence = base;
  const evidenceAfter: PlanEvidence = {
    ...base,
    hasMistakeEvidence: true,
    daysSinceLastActivity: 0,
    subjects: base.subjects.map((s) =>
      s.module === DEMO_MODULE
        ? { ...s, accuracy: accuracyPct, gradedAttempts: score.scored, recencyDays: 0, minutes: 17 }
        : s,
    ),
  };

  const result = recalibrate({
    schedule: before,
    input: DEMO_INPUT,
    evidence: evidenceAfter,
    trigger: "graded-performance",
    now: DEMO_NOW,
  });

  return {
    score,
    accuracyPct,
    before,
    after: result.schedule,
    revision: result.revision,
    evidenceBefore,
    evidenceAfter,
    todayBefore: byDate(before, DEMO_TODAY),
    todayAfter: byDate(result.schedule, DEMO_TODAY),
    upcomingBefore: upcoming(before, DEMO_TODAY, 4),
    upcomingAfter: upcoming(result.schedule, DEMO_TODAY, 4),
    missedYesterday,
  };
}
