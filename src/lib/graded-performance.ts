// Unified graded-performance read layer.
//
// The ONLY place accuracy may come from. Two canonical sources:
//   1. `graded_attempts`  — practice sessions, mini tests, graded recall.
//   2. `mock_answers`     — full mock simulations (kept where they are; read,
//                           never copied, so correctness cannot be lost).
//
// Self-reported focus/mood, study minutes and confidence ratings are NEVER
// mixed into anything returned here.
import { loadGradedAttempts, type GradedAttemptRow } from "@/lib/study-log";
import { loadMockPerformance } from "@/lib/mock-performance";
import type { Pathway } from "@/lib/full-mock-blueprints";

export interface GradedSubjectStat {
  subject: string;
  attempted: number;
  correct: number;
  accuracy: number; // 0..100
}

export interface GradedSourceBreakdown {
  practice: number;
  miniTest: number;
  fullMock: number;
  flashcardRecall: number;
}

export interface GradedResults {
  /** True only when at least one genuinely graded answer exists. */
  hasData: boolean;
  totalAttempted: number;
  totalCorrect: number;
  /** null when totalAttempted === 0 — never fabricate a number. */
  accuracy: number | null;
  perSubject: GradedSubjectStat[]; // worst accuracy first
  bySource: GradedSourceBreakdown;
  /** Most recent graded answer, ISO string. */
  lastAttemptAt: string | null;
  /** Chronological accuracy buckets for trend, only when n is meaningful. */
  trend: { label: string; accuracy: number; attempted: number }[];
}

export const EMPTY_GRADED_RESULTS: GradedResults = {
  hasData: false,
  totalAttempted: 0,
  totalCorrect: 0,
  accuracy: null,
  perSubject: [],
  bySource: { practice: 0, miniTest: 0, fullMock: 0, flashcardRecall: 0 },
  lastAttemptAt: null,
  trend: [],
};

/** Minimum graded answers before we are willing to show a subject-level %. */
export const MIN_SUBJECT_SAMPLE = 5;
/** Minimum graded answers before we show an overall accuracy figure. */
export const MIN_OVERALL_SAMPLE = 5;

interface UnifiedAttempt {
  subject: string | null;
  isCorrect: boolean;
  occurredAt: string | null;
  sourceType: string;
}

export async function loadGradedResults(pathway?: Pathway): Promise<GradedResults> {
  const [attempts, mock] = await Promise.all([
    loadGradedAttempts().catch(() => [] as GradedAttemptRow[]),
    loadMockPerformance(pathway).catch(() => null),
  ]);

  const unified: UnifiedAttempt[] = [];

  for (const a of attempts) {
    // Full-mock rows live canonically in mock_answers; skip any mirror here so
    // the same answer can never be counted twice.
    if (a.source_type === "full_mock") continue;
    unified.push({
      subject: a.subject,
      isCorrect: a.is_correct,
      occurredAt: a.occurred_at,
      sourceType: a.source_type,
    });
  }

  if (mock?.hasData) {
    for (const t of mock.perTopic) {
      for (let i = 0; i < t.correct; i++)
        unified.push({ subject: t.topic, isCorrect: true, occurredAt: null, sourceType: "full_mock" });
      for (let i = 0; i < t.attempted - t.correct; i++)
        unified.push({ subject: t.topic, isCorrect: false, occurredAt: null, sourceType: "full_mock" });
    }
  }

  if (unified.length === 0) return EMPTY_GRADED_RESULTS;

  const totalAttempted = unified.length;
  const totalCorrect = unified.filter((u) => u.isCorrect).length;

  const bySubject = new Map<string, { attempted: number; correct: number }>();
  for (const u of unified) {
    if (!u.subject) continue;
    const cur = bySubject.get(u.subject) ?? { attempted: 0, correct: 0 };
    cur.attempted += 1;
    if (u.isCorrect) cur.correct += 1;
    bySubject.set(u.subject, cur);
  }

  const perSubject: GradedSubjectStat[] = [...bySubject.entries()]
    .map(([subject, v]) => ({
      subject,
      attempted: v.attempted,
      correct: v.correct,
      accuracy: Math.round((v.correct / v.attempted) * 100),
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const bySource: GradedSourceBreakdown = {
    practice: unified.filter((u) => u.sourceType === "practice").length,
    miniTest: unified.filter((u) => u.sourceType === "mini_test").length,
    fullMock: unified.filter((u) => u.sourceType === "full_mock").length,
    flashcardRecall: unified.filter((u) => u.sourceType === "flashcard_recall").length,
  };

  const dated = unified
    .filter((u) => u.occurredAt)
    .sort((a, b) => (a.occurredAt! < b.occurredAt! ? -1 : 1));
  const lastAttemptAt = dated.length ? dated[dated.length - 1].occurredAt : null;

  // Trend: two halves, only when both halves clear the minimum sample.
  const trend: GradedResults["trend"] = [];
  if (dated.length >= MIN_OVERALL_SAMPLE * 2) {
    const half = Math.floor(dated.length / 2);
    const halves: [string, UnifiedAttempt[]][] = [
      ["Earlier", dated.slice(0, half)],
      ["Recent", dated.slice(half)],
    ];
    for (const [label, arr] of halves) {
      trend.push({
        label,
        attempted: arr.length,
        accuracy: Math.round((arr.filter((x) => x.isCorrect).length / arr.length) * 100),
      });
    }
  }

  return {
    hasData: true,
    totalAttempted,
    totalCorrect,
    accuracy:
      totalAttempted >= MIN_OVERALL_SAMPLE
        ? Math.round((totalCorrect / totalAttempted) * 100)
        : null,
    perSubject,
    bySource,
    lastAttemptAt,
    trend,
  };
}
