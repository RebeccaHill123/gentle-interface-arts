/**
 * Smart Review performance tracking.
 *
 * Builds per-subtopic performance from canonical graded attempts (the only
 * source of correctness in the app). Statuses are deliberately conservative:
 *
 * - A topic is NEVER "strong" on one correct answer — strength needs a
 *   meaningful sample across more than one sitting.
 * - An isolated error does NOT permanently label a weakness — "needs review"
 *   is driven by the recent window, so recovery is recognised.
 * - Recency matters: the recent window (latest attempts) drives the status,
 *   while the overall record provides context.
 *
 * Pure and browser-safe; no I/O.
 */
import type { GradedAttemptRow } from "@/lib/study-log";

export type ReviewStatus = "strong" | "developing" | "needs-review" | "not-assessed";

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  strong: "Strong",
  developing: "Developing",
  "needs-review": "Needs review",
  "not-assessed": "Not yet assessed",
};

/** Minimum attempts before any judgement stronger than "developing". */
export const MIN_ASSESSMENT_SAMPLE = 3;
/** Minimum attempts (across ≥2 sittings) before a topic can be called strong. */
export const MIN_STRONG_SAMPLE = 5;
/** Size of the recent-performance window. */
export const RECENT_WINDOW = 5;

export interface SubtopicPerformance {
  subject: string;
  subtopic: string;
  attempted: number;
  correct: number;
  /** 0..100 across all attempts; null when nothing attempted. */
  accuracy: number | null;
  /** 0..100 across the most recent ≤ RECENT_WINDOW attempts. */
  recentAccuracy: number | null;
  /** 0..100 across the attempts before the recent window; null when none. */
  earlierAccuracy: number | null;
  /** true/false when both windows exist; null when there is no trend yet. */
  improving: boolean | null;
  /** Distinct days on which this subtopic was attempted. */
  sittings: number;
  /** Distinct days on which at least one attempt was missed. */
  missDays: number;
  lastAttemptAt: string | null;
  status: ReviewStatus;
  /** True when the evidence says a targeted review session is warranted. */
  needsTargetedReview: boolean;
}

export interface SubjectPerformance {
  subject: string;
  attempted: number;
  correct: number;
  accuracy: number | null;
  lastAttemptAt: string | null;
  subtopics: SubtopicPerformance[];
  /** Worst-status-first counts for quick badges. */
  needsReviewCount: number;
  strongCount: number;
}

function accuracyOf(correct: number, attempted: number): number | null {
  if (attempted === 0) return null;
  return Math.round((correct / attempted) * 100);
}

function statusFor(input: {
  attempted: number;
  accuracy: number | null;
  recentAccuracy: number | null;
  sittings: number;
}): ReviewStatus {
  const { attempted, accuracy, recentAccuracy, sittings } = input;
  if (attempted === 0) return "not-assessed";
  // Recent evidence of struggle drives "needs review" — and because it uses
  // the recent window, a student who recovers is not permanently labelled.
  if (
    attempted >= MIN_ASSESSMENT_SAMPLE &&
    recentAccuracy !== null &&
    recentAccuracy < 60
  ) {
    return "needs-review";
  }
  // "Strong" demands a real sample spread over more than one sitting.
  if (
    attempted >= MIN_STRONG_SAMPLE &&
    sittings >= 2 &&
    accuracy !== null &&
    accuracy >= 85 &&
    (recentAccuracy ?? 0) >= 80
  ) {
    return "strong";
  }
  return "developing";
}

/** Rolls up graded attempts into per-subtopic performance, worst status first. */
export function buildSubtopicPerformance(attempts: GradedAttemptRow[]): SubtopicPerformance[] {
  const groups = new Map<string, GradedAttemptRow[]>();
  for (const a of attempts) {
    if (!a.subject || !a.subtopic) continue;
    const key = `${a.subject}${a.subtopic}`;
    const list = groups.get(key) ?? [];
    list.push(a);
    groups.set(key, list);
  }

  const out: SubtopicPerformance[] = [];
  for (const list of groups.values()) {
    // Attempts arrive ascending by occurred_at from the repository.
    const attempted = list.length;
    const correct = list.filter((a) => a.is_correct).length;
    const recent = list.slice(-RECENT_WINDOW);
    const earlier = list.slice(0, Math.max(0, list.length - RECENT_WINDOW));
    const recentCorrect = recent.filter((a) => a.is_correct).length;
    const earlierCorrect = earlier.filter((a) => a.is_correct).length;
    const accuracy = accuracyOf(correct, attempted);
    const recentAccuracy = accuracyOf(recentCorrect, recent.length);
    const earlierAccuracy = accuracyOf(earlierCorrect, earlier.length);
    const sittings = new Set(list.map((a) => a.local_date)).size;
    const status = statusFor({ attempted, accuracy, recentAccuracy, sittings });

    out.push({
      subject: list[0].subject as string,
      subtopic: list[0].subtopic as string,
      attempted,
      correct,
      accuracy,
      recentAccuracy,
      earlierAccuracy,
      improving:
        earlierAccuracy !== null && recentAccuracy !== null
          ? recentAccuracy > earlierAccuracy
          : null,
      sittings,
      lastAttemptAt: list[list.length - 1]?.occurred_at ?? null,
      status,
      needsTargetedReview: status === "needs-review",
    });
  }

  const rank: Record<ReviewStatus, number> = {
    "needs-review": 0,
    developing: 1,
    strong: 2,
    "not-assessed": 3,
  };
  return out.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (a.recentAccuracy ?? 101) - (b.recentAccuracy ?? 101) ||
      a.subtopic.localeCompare(b.subtopic),
  );
}

/** Groups subtopic performance into per-subject summaries. */
export function buildSubjectPerformance(subs: SubtopicPerformance[]): SubjectPerformance[] {
  const bySubject = new Map<string, SubtopicPerformance[]>();
  for (const s of subs) {
    const list = bySubject.get(s.subject) ?? [];
    list.push(s);
    bySubject.set(s.subject, list);
  }
  const out: SubjectPerformance[] = [];
  for (const [subject, list] of bySubject) {
    const attempted = list.reduce((n, s) => n + s.attempted, 0);
    const correct = list.reduce((n, s) => n + s.correct, 0);
    const lastAttemptAt = list
      .map((s) => s.lastAttemptAt)
      .filter((v): v is string => !!v)
      .sort()
      .at(-1) ?? null;
    out.push({
      subject,
      attempted,
      correct,
      accuracy: accuracyOf(correct, attempted),
      lastAttemptAt,
      subtopics: list,
      needsReviewCount: list.filter((s) => s.status === "needs-review").length,
      strongCount: list.filter((s) => s.status === "strong").length,
    });
  }
  return out.sort(
    (a, b) =>
      b.needsReviewCount - a.needsReviewCount ||
      (a.accuracy ?? 101) - (b.accuracy ?? 101) ||
      a.subject.localeCompare(b.subject),
  );
}

/** Overall Smart Review headline stats from real attempts only. */
export function overallPerformance(attempts: GradedAttemptRow[]): {
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number | null;
  lastAttemptAt: string | null;
} {
  const graded = attempts.filter((a) => a.subject);
  const totalAttempted = graded.length;
  const totalCorrect = graded.filter((a) => a.is_correct).length;
  const lastAttemptAt = graded.length ? graded[graded.length - 1].occurred_at : null;
  return {
    totalAttempted,
    totalCorrect,
    accuracy: accuracyOf(totalCorrect, totalAttempted),
    lastAttemptAt,
  };
}
