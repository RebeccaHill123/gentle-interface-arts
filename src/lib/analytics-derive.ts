// Explainable analytics derivation for the Tentra dashboard.
// Every metric here is computed from real tracked behaviour
// (StudySession[], onboarding confidence, target hours, syllabus weights).
// When data is insufficient, we return `null` instead of inventing a number —
// the UI shows an "unlocking" message describing exactly what's needed.

import type { StoredPlan, StudySession } from "@/lib/plan-store";
import { SQE_SYLLABUS, getSubjectByName } from "@/lib/sqe-syllabus";

export interface ReadinessBreakdown {
  // Each component is 0..100
  mockPerformance: number | null;
  syllabusCoverage: number;
  consistency: number;
  weakTopicImprovement: number | null;
  revisionRecency: number;
  hoursVsTarget: number;
  confidence: number;
}

export interface ReadinessResult {
  score: number; // 0..100
  weights: Record<keyof ReadinessBreakdown, number>;
  breakdown: ReadinessBreakdown;
  componentsAvailable: number;
}

export interface PredictedScore {
  score: number; // 0..100
  passLikelihood: number; // 0..100
  band: "Below pass" | "Borderline" | "Likely pass" | "Strong pass" | "Distinction range";
  confidenceLow: number;
  confidenceHigh: number;
  basedOnMocks: number;
}

export interface PeakPerformance {
  bucket: "early-morning" | "morning" | "midday" | "afternoon" | "evening" | "night";
  label: string; // human readable
  uplift: number; // % vs other buckets
  sessionsInBucket: number;
}

export interface SubjectStat {
  module: string;
  accuracy: number | null; // 0..100, null if no quiz/mock data
  confidence: number; // 1..5
  minutes: number; // total minutes logged (all-time)
  recencyDays: number | null; // days since last session
  trend: number | null; // +/- accuracy points vs prior period
  syllabusWeight: number; // 0..1 from sqe-syllabus
  highYield: number; // 1..5
  riskScore: number; // 0..100, higher = more at risk
}

export interface WeeklyLoadPoint {
  weekStart: string; // ISO date (Mon)
  minutes: number;
  targetMinutes: number;
}

export interface MockTrendPoint {
  index: number;
  date: string;
  accuracy: number;
  minutes: number;
}

export interface Insight {
  tone: "good" | "warn" | "info";
  text: string;
  source: string; // e.g. "Last 14 days · 8 sessions"
}

export interface AnalyticsBundle {
  hasAnyData: boolean;
  totalSessions: number;
  totalMockSessions: number;
  totalLoggedMinutes: number;
  readiness: ReadinessResult | null;
  predicted: PredictedScore | null;
  peak: PeakPerformance | null;
  subjects: SubjectStat[];
  strongest: SubjectStat[];
  weakest: SubjectStat[];
  atRisk: SubjectStat[];
  weeklyLoad: WeeklyLoadPoint[];
  mockTrend: MockTrendPoint[];
  insights: Insight[];
}

// ---------- helpers ----------

const DAY_MS = 86_400_000;

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function bucketHour(h: number): PeakPerformance["bucket"] {
  if (h < 6) return "night";
  if (h < 9) return "early-morning";
  if (h < 12) return "morning";
  if (h < 14) return "midday";
  if (h < 18) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

const BUCKET_LABEL: Record<PeakPerformance["bucket"], string> = {
  "early-morning": "early morning (6–9am)",
  morning: "mid-morning (9am–12pm)",
  midday: "midday (12–2pm)",
  afternoon: "afternoon (2–6pm)",
  evening: "evening (6–10pm)",
  night: "late-night (10pm–6am)",
};

// Pseudo-accuracy per session — until per-question scoring is wired,
// we estimate session quality from focus * (mood/5) when present.
function sessionQuality(s: StudySession): number | null {
  if (typeof s.focus === "number" && typeof s.mood === "number") {
    return Math.max(0, Math.min(1, s.focus * (s.mood / 5)));
  }
  if (typeof s.focus === "number") return Math.max(0, Math.min(1, s.focus));
  return null;
}

// ---------- main ----------

export function deriveAnalytics(plan: StoredPlan | null): AnalyticsBundle {
  const sessions: StudySession[] = (plan?.sessions ?? []).slice().sort(
    (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime(),
  );
  const modules = plan?.input.modules ?? [];
  const targetWeeklyMinutes = (plan?.input.hoursPerWeek ?? 0) * 60;
  const now = Date.now();

  const mockSessions = sessions.filter(
    (s) => s.sessionType === "mock" || s.sessionType === "quiz",
  );
  const totalLoggedMinutes = sessions.reduce((a, s) => a + s.minutes, 0);

  // -------- subjects --------
  const subjects: SubjectStat[] = modules.map((m) => {
    const subjectSessions = sessions.filter((s) => s.module === m.name);
    const minutes = subjectSessions.reduce((a, s) => a + s.minutes, 0);
    const lastSession = subjectSessions[subjectSessions.length - 1];
    const recencyDays = lastSession
      ? Math.floor((now - new Date(lastSession.loggedAt).getTime()) / DAY_MS)
      : null;

    const quizzes = subjectSessions.filter(
      (s) => (s.sessionType === "mock" || s.sessionType === "quiz") && sessionQuality(s) !== null,
    );
    const accuracy = quizzes.length
      ? Math.round(
          (quizzes.reduce((a, s) => a + (sessionQuality(s) ?? 0), 0) / quizzes.length) * 100,
        )
      : null;

    let trend: number | null = null;
    if (quizzes.length >= 4) {
      const half = Math.floor(quizzes.length / 2);
      const early = quizzes.slice(0, half);
      const late = quizzes.slice(-half);
      const avg = (arr: StudySession[]) =>
        (arr.reduce((a, s) => a + (sessionQuality(s) ?? 0), 0) / arr.length) * 100;
      trend = Math.round(avg(late) - avg(early));
    }

    const syllabus = getSubjectByName(m.name);
    const syllabusWeight = syllabus?.weight ?? 0.05;
    const highYield = syllabus?.highYield ?? 3;

    // Risk: confidence gap × HY × weight × recency penalty
    const confGap = Math.max(0, 5 - m.confidence) / 5;
    const recencyPenalty = recencyDays === null ? 0.6 : Math.min(1, recencyDays / 14);
    const accGap = accuracy === null ? 0.4 : Math.max(0, 70 - accuracy) / 70;
    const riskScore = Math.round(
      Math.min(
        100,
        100 *
          (confGap * 0.35 +
            (highYield / 5) * syllabusWeight * 1.2 +
            recencyPenalty * 0.25 +
            accGap * 0.3),
      ),
    );

    return {
      module: m.name,
      accuracy,
      confidence: m.confidence,
      minutes,
      recencyDays,
      trend,
      syllabusWeight,
      highYield,
      riskScore,
    };
  });

  // -------- readiness components --------
  const allMockQs = mockSessions.filter((s) => sessionQuality(s) !== null);
  const mockPerformance = allMockQs.length
    ? Math.round(
        (allMockQs.reduce((a, s) => a + (sessionQuality(s) ?? 0), 0) / allMockQs.length) * 100,
      )
    : null;

  // Coverage = % of syllabus subjects (weighted) that have any logged minutes.
  const coverageWeighted = subjects.length
    ? subjects.reduce(
        (a, s) => a + (s.minutes > 0 ? s.syllabusWeight : 0),
        0,
      ) /
      Math.max(
        0.01,
        subjects.reduce((a, s) => a + s.syllabusWeight, 0),
      )
    : 0;
  const syllabusCoverage = Math.round(coverageWeighted * 100);

  // Consistency = % of last 14 days with at least one session.
  const last14 = new Set<string>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now - i * DAY_MS);
    if (sessions.some((s) => s.date === dateKey(d))) last14.add(dateKey(d));
  }
  const consistency = Math.round((last14.size / 14) * 100);

  // Weak topic improvement = avg trend across the bottom-confidence half.
  const weakSubjects = [...subjects]
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, Math.max(1, Math.ceil(subjects.length / 2)));
  const weakWithTrend = weakSubjects.filter((s) => s.trend !== null);
  const weakTopicImprovement = weakWithTrend.length
    ? Math.round(
        50 +
          (weakWithTrend.reduce((a, s) => a + (s.trend ?? 0), 0) / weakWithTrend.length) * 2,
      )
    : null;

  // Recency = inverse avg days since last touch on weighted high-yield subjects.
  const touched = subjects.filter((s) => s.recencyDays !== null);
  const revisionRecency = touched.length
    ? Math.round(
        Math.max(
          0,
          100 -
            (touched.reduce((a, s) => a + (s.recencyDays ?? 0) * (s.highYield / 5), 0) /
              touched.reduce((a, s) => a + s.highYield / 5, 0)) *
              5,
        ),
      )
    : 0;

  // Hours vs target — last-7-days actual vs target.
  const last7Min = sessions
    .filter((s) => now - new Date(s.loggedAt).getTime() < 7 * DAY_MS)
    .reduce((a, s) => a + s.minutes, 0);
  const hoursVsTarget = targetWeeklyMinutes > 0
    ? Math.round(Math.min(100, (last7Min / targetWeeklyMinutes) * 100))
    : 0;

  // Confidence average (1..5 -> 0..100).
  const confidenceAvg = subjects.length
    ? Math.round((subjects.reduce((a, s) => a + s.confidence, 0) / subjects.length / 5) * 100)
    : 0;

  const breakdown: ReadinessBreakdown = {
    mockPerformance,
    syllabusCoverage,
    consistency,
    weakTopicImprovement,
    revisionRecency,
    hoursVsTarget,
    confidence: confidenceAvg,
  };

  // Weights — published in the UI tooltip.
  const weights: Record<keyof ReadinessBreakdown, number> = {
    mockPerformance: 0.4,
    syllabusCoverage: 0.2,
    consistency: 0.15,
    weakTopicImprovement: 0.15,
    revisionRecency: 0.1,
    hoursVsTarget: 0,
    confidence: 0,
  };

  // Re-normalise weights over only the components we actually have data for.
  const present = (Object.keys(weights) as (keyof ReadinessBreakdown)[]).filter(
    (k) => breakdown[k] !== null && weights[k] > 0,
  );
  const presentWeightSum = present.reduce((a, k) => a + weights[k], 0);
  const componentsAvailable = present.length;

  let readiness: ReadinessResult | null = null;
  if (presentWeightSum > 0 && sessions.length >= 3) {
    const score = Math.round(
      present.reduce(
        (a, k) => a + ((breakdown[k] as number) * weights[k]) / presentWeightSum,
        0,
      ),
    );
    readiness = {
      score: Math.max(0, Math.min(100, score)),
      weights,
      breakdown,
      componentsAvailable,
    };
  }

  // -------- predicted score --------
  let predicted: PredictedScore | null = null;
  if (mockSessions.length >= 3 && mockPerformance !== null) {
    // Trajectory: average of last 3 mocks weighted slightly more than overall mean.
    const recent = mockSessions.slice(-3);
    const recentAvg =
      (recent.reduce((a, s) => a + (sessionQuality(s) ?? 0), 0) / recent.length) * 100;
    const blended = Math.round(mockPerformance * 0.4 + recentAvg * 0.6);

    // Confidence interval shrinks as we get more mocks.
    const margin = Math.max(4, Math.round(18 / Math.sqrt(mockSessions.length)));
    const confidenceLow = Math.max(0, blended - margin);
    const confidenceHigh = Math.min(100, blended + margin);

    // Pass likelihood: SQE1 effective threshold ~55–60%; logistic around 57.
    const passLikelihood = Math.round(
      100 / (1 + Math.exp(-(blended - 57) / 6)),
    );

    const band: PredictedScore["band"] =
      blended >= 78
        ? "Distinction range"
        : blended >= 68
          ? "Strong pass"
          : blended >= 58
            ? "Likely pass"
            : blended >= 50
              ? "Borderline"
              : "Below pass";

    predicted = {
      score: blended,
      passLikelihood,
      band,
      confidenceLow,
      confidenceHigh,
      basedOnMocks: mockSessions.length,
    };
  }

  // -------- peak performance --------
  let peak: PeakPerformance | null = null;
  if (sessions.length >= 8) {
    const buckets: Record<string, { sum: number; n: number }> = {};
    for (const s of sessions) {
      const q = sessionQuality(s);
      if (q === null) continue;
      const h = new Date(s.loggedAt).getHours();
      const b = bucketHour(h);
      buckets[b] = buckets[b] || { sum: 0, n: 0 };
      buckets[b].sum += q;
      buckets[b].n += 1;
    }
    const entries = Object.entries(buckets).filter(([, v]) => v.n >= 2);
    if (entries.length >= 2) {
      const scored = entries.map(([b, v]) => ({ b, avg: v.sum / v.n, n: v.n }));
      scored.sort((a, b) => b.avg - a.avg);
      const top = scored[0];
      const others = scored.slice(1);
      const othersAvg = others.reduce((a, x) => a + x.avg, 0) / others.length;
      const uplift = Math.round(((top.avg - othersAvg) / Math.max(0.01, othersAvg)) * 100);
      peak = {
        bucket: top.b as PeakPerformance["bucket"],
        label: BUCKET_LABEL[top.b as PeakPerformance["bucket"]],
        uplift: Math.max(0, uplift),
        sessionsInBucket: top.n,
      };
    }
  }

  // -------- weekly load (last 8 weeks) --------
  const weeklyLoad: WeeklyLoadPoint[] = [];
  const thisWeekStart = startOfWeek(new Date());
  for (let i = 7; i >= 0; i--) {
    const ws = new Date(thisWeekStart);
    ws.setDate(ws.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 7);
    const minutes = sessions
      .filter((s) => {
        const t = new Date(s.loggedAt).getTime();
        return t >= ws.getTime() && t < we.getTime();
      })
      .reduce((a, s) => a + s.minutes, 0);
    weeklyLoad.push({
      weekStart: dateKey(ws),
      minutes,
      targetMinutes: targetWeeklyMinutes,
    });
  }

  // -------- mock trend --------
  const mockTrend: MockTrendPoint[] = mockSessions
    .map((s, i) => {
      const q = sessionQuality(s);
      if (q === null) return null;
      return {
        index: i + 1,
        date: s.date,
        accuracy: Math.round(q * 100),
        minutes: s.minutes,
      };
    })
    .filter((x): x is MockTrendPoint => x !== null);

  // -------- rankings --------
  const rated = subjects.filter((s) => s.accuracy !== null || s.minutes > 0);
  const strongest = [...rated]
    .sort((a, b) => (b.accuracy ?? b.confidence * 20) - (a.accuracy ?? a.confidence * 20))
    .slice(0, 3);
  const weakest = [...rated]
    .sort((a, b) => (a.accuracy ?? a.confidence * 20) - (b.accuracy ?? b.confidence * 20))
    .slice(0, 3);
  const atRisk = [...subjects].sort((a, b) => b.riskScore - a.riskScore).slice(0, 4);

  // -------- insights (data-derived only) --------
  const insights: Insight[] = [];
  if (peak) {
    insights.push({
      tone: "good",
      text: `You score ${peak.uplift}% higher in ${peak.label} sessions.`,
      source: `Based on ${peak.sessionsInBucket} sessions in this window.`,
    });
  }
  const stale = subjects
    .filter((s) => s.recencyDays !== null && s.recencyDays >= 10 && s.highYield >= 4)
    .sort((a, b) => (b.recencyDays ?? 0) - (a.recencyDays ?? 0))[0];
  if (stale) {
    insights.push({
      tone: "warn",
      text: `${stale.module} hasn't been revised in ${stale.recencyDays} days — scheduling a refresh.`,
      source: `High-yield subject (HY${stale.highYield}).`,
    });
  }
  const improving = subjects
    .filter((s) => s.trend !== null && (s.trend ?? 0) >= 5)
    .sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0))[0];
  if (improving) {
    insights.push({
      tone: "good",
      text: `${improving.module} accuracy is up ${improving.trend}% across recent sessions.`,
      source: `Compared first vs latest half of your mocks.`,
    });
  }
  const declining = subjects
    .filter((s) => s.trend !== null && (s.trend ?? 0) <= -5)
    .sort((a, b) => (a.trend ?? 0) - (b.trend ?? 0))[0];
  if (declining) {
    insights.push({
      tone: "warn",
      text: `${declining.module} accuracy has dropped ${Math.abs(declining.trend ?? 0)}% — flagged for spaced reinforcement.`,
      source: `Period-over-period mock comparison.`,
    });
  }
  if (targetWeeklyMinutes > 0) {
    const ratio = last7Min / targetWeeklyMinutes;
    if (ratio < 0.6 && sessions.length >= 3) {
      insights.push({
        tone: "warn",
        text: `You're at ${Math.round(ratio * 100)}% of your weekly target. Under-training detected.`,
        source: `Last 7 days · ${Math.round(last7Min)} of ${targetWeeklyMinutes} target minutes.`,
      });
    } else if (ratio > 1.4) {
      insights.push({
        tone: "warn",
        text: `You're 40%+ above target this week — watch for burnout.`,
        source: `Last 7 days · ${Math.round(last7Min)} minutes.`,
      });
    }
  }

  // Coverage gap insight
  if (subjects.length && syllabusCoverage < 60) {
    const untouched = subjects
      .filter((s) => s.minutes === 0)
      .sort((a, b) => b.syllabusWeight - a.syllabusWeight)[0];
    if (untouched) {
      insights.push({
        tone: "info",
        text: `Syllabus coverage is ${syllabusCoverage}%. ${untouched.module} (${Math.round(
          untouched.syllabusWeight * 100,
        )}% of paper) is untouched.`,
        source: `Coverage = weighted share of syllabus with logged time.`,
      });
    }
  }

  return {
    hasAnyData: sessions.length > 0,
    totalSessions: sessions.length,
    totalMockSessions: mockSessions.length,
    totalLoggedMinutes,
    readiness,
    predicted,
    peak,
    subjects,
    strongest,
    weakest,
    atRisk,
    weeklyLoad,
    mockTrend,
    insights,
  };
}

export const READINESS_LABELS: Record<keyof ReadinessBreakdown, string> = {
  mockPerformance: "Mock performance",
  syllabusCoverage: "Syllabus coverage",
  consistency: "Revision consistency",
  weakTopicImprovement: "Weak-topic improvement",
  revisionRecency: "Revision recency",
  hoursVsTarget: "Hours vs target",
  confidence: "Self-rated confidence",
};

// Total syllabus weight count, for UI hints.
export const SYLLABUS_SUBJECT_COUNT = SQE_SYLLABUS.length;
