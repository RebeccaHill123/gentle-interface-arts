// Turn honest analytics (Phase 1) into planning evidence (Phase 2).
//
// Correctness comes from graded attempts/mocks only. Minutes are used solely to
// detect "never covered", never to claim a weakness. Self-rated confidence is
// carried through only when the user explicitly rated the subject.
import type { AnalyticsBundle } from "@/lib/analytics-derive";
import type { OnboardingInput } from "@/lib/plan-store";
import { getSubjectsForExamPath } from "@/lib/exam-paths";
import { defaultPathForExam } from "@/lib/exam-paths";
import { localDateFor } from "@/lib/study-log";
import type { PlanEvidence, SubjectEvidence } from "./types";

export function buildPlanEvidence(
  input: OnboardingInput,
  analytics: AnalyticsBundle | null,
  today: string = localDateFor(),
): PlanEvidence {
  const path = input.examPath ?? defaultPathForExam(input.examType);
  const syllabus = getSubjectsForExamPath(path).map((s) => s.name);
  const names = Array.from(
    new Set([...input.modules.map((m) => m.name), ...syllabus]),
  );

  const subjects: SubjectEvidence[] = names.map((module) => {
    const stat = analytics?.subjects.find((s) => s.module === module);
    const graded = analytics?.graded.perSubject.find((s) => s.subject === module);
    const rating = input.modules.find((m) => m.name === module);
    return {
      module,
      accuracy: graded?.accuracy ?? stat?.accuracy ?? null,
      gradedAttempts: graded?.attempted ?? stat?.gradedAttempts ?? 0,
      minutes: stat?.minutes ?? 0,
      recencyDays: stat?.recencyDays ?? null,
      confidence: rating?.confidence,
      rated: rating?.rated === true,
    };
  });

  const recencies = subjects
    .map((s) => s.recencyDays)
    .filter((v): v is number => v !== null);

  return {
    today,
    subjects,
    daysSinceLastActivity: recencies.length ? Math.min(...recencies) : null,
    hasMistakeEvidence: (analytics?.graded.totalAttempted ?? 0) > 0,
  };
}
