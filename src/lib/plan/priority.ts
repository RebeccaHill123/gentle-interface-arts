// Evidence-led subject prioritisation for the adaptive engine.
//
// Ranking contract (highest priority first):
//   1. low graded accuracy      — objective correctness, needs sample size
//   2. no coverage              — never studied, no graded evidence
//   3. recency gap              — studied once, then untouched for 10+ days
//   4. self-rated low           — explicit rating only, SECONDARY signal
//   5. syllabus rotation        — everything else keeps ticking over
//
// Self-reported confidence can never outrank objective correctness, and study
// minutes / mood / focus never create a weakness claim.
import { MIN_SUBJECT_SAMPLE } from "@/lib/graded-performance";
import { MEANINGFUL_MINUTES } from "@/lib/syllabus-coverage";
import type { PlanEvidence, SubjectEvidence } from "./types";

export type PriorityEvidenceClass =
  | "low-graded-accuracy"
  | "no-coverage"
  | "recency-gap"
  | "self-rated-low"
  | "rotation";

export interface SubjectPriority {
  module: string;
  /** Higher = more urgent. Deterministic for a given evidence set. */
  score: number;
  evidence: PriorityEvidenceClass;
  /** Student-facing explanation; always traceable to real data. */
  reason: string;
  /** Weight used to apportion study blocks. */
  weight: number;
}

const RECENCY_GAP_DAYS = 10;

export function scoreSubject(s: SubjectEvidence): SubjectPriority {
  const hasSample = s.gradedAttempts >= MIN_SUBJECT_SAMPLE && s.accuracy !== null;
  const touched = s.minutes >= MEANINGFUL_MINUTES || s.gradedAttempts > 0;

  if (hasSample && (s.accuracy as number) < 70) {
    const acc = s.accuracy as number;
    // 100 → 0 accuracy maps to 100 → 170 score, so correctness always leads.
    return {
      module: s.module,
      score: 100 + (70 - acc),
      evidence: "low-graded-accuracy",
      reason: `${acc}% correct across ${s.gradedAttempts} graded questions.`,
      weight: 2.4,
    };
  }

  if (!touched) {
    return {
      module: s.module,
      score: 80,
      evidence: "no-coverage",
      reason: "No study time or graded answers recorded yet.",
      weight: 2.0,
    };
  }

  if (s.recencyDays !== null && s.recencyDays >= RECENCY_GAP_DAYS) {
    return {
      module: s.module,
      score: 55 + Math.min(20, s.recencyDays - RECENCY_GAP_DAYS),
      evidence: "recency-gap",
      reason: `Last worked on ${s.recencyDays} days ago — due for spaced review.`,
      weight: 1.5,
    };
  }

  if (s.rated && (s.confidence ?? 3) <= 2) {
    return {
      module: s.module,
      score: 40,
      evidence: "self-rated-low",
      reason: "You rated this low. No graded evidence yet, so it stays a supporting priority.",
      weight: 1.4,
    };
  }

  const strongGraded = hasSample && (s.accuracy as number) >= 85;
  return {
    module: s.module,
    score: strongGraded ? 8 : s.rated && (s.confidence ?? 3) >= 4 ? 12 : 20,
    evidence: "rotation",
    reason: strongGraded
      ? `${s.accuracy}% correct across ${s.gradedAttempts} graded questions — kept on maintenance review.`
      : "Kept moving on syllabus merit.",
    weight: strongGraded ? 0.7 : s.rated && (s.confidence ?? 3) >= 4 ? 0.8 : 1,
  };
}

/** Deterministic priority ordering. Ties break on subject name for stability. */
export function prioritiseSubjects(evidence: PlanEvidence): SubjectPriority[] {
  return evidence.subjects
    .map(scoreSubject)
    .sort((a, b) => b.score - a.score || a.module.localeCompare(b.module));
}

/** Stable fingerprint of the evidence a future schedule was built from. */
export function evidenceSignature(evidence: PlanEvidence): string {
  const parts = [...evidence.subjects]
    .sort((a, b) => a.module.localeCompare(b.module))
    .map(
      (s) =>
        `${s.module}:${s.accuracy ?? "-"}:${s.gradedAttempts}:${Math.round(
          s.minutes / 15,
        )}:${s.recencyDays ?? "-"}:${s.rated ? s.confidence ?? "" : ""}`,
    );
  parts.push(`idle:${evidence.daysSinceLastActivity ?? "-"}`);
  return parts.join("|");
}
