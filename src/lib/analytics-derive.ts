// Honest analytics derivation.
//
// Hard rules enforced here (Phase 1 truth pass):
//  - "Accuracy" ONLY ever means graded correct answers / graded answers, and
//    only ever comes from `graded-performance.ts`.
//  - Self-reported focus/mood are wellbeing signals. They are never converted
//    into accuracy, mock performance, readiness, mastery or a predicted score.
//  - No predicted SQE score is produced in this phase.
//  - Coverage uses the canonical full syllabus for the user's ExamPath.
//  - Study minutes/time are reported as effort, never as performance.
//  - Insufficient data returns `null`, never an invented number.
import type { ExamPath, StoredPlan, StudySession } from "@/lib/plan-store";
import { getSubjectByName } from "@/lib/sqe-syllabus";
import { defaultPathForExam } from "@/lib/exam-paths";
import {
  EMPTY_GRADED_RESULTS,
  MIN_SUBJECT_SAMPLE,
  type GradedResults,
} from "@/lib/graded-performance";
import { computeCoverage, type CoverageResult, type CoverageSignal } from "@/lib/syllabus-coverage";
import { localDateFor, type StudyEventRow } from "@/lib/study-log";

// ───────── types

export interface SubjectStat {
  module: string;
  /** Graded accuracy 0..100. null unless there are enough graded answers. */
  accuracy: number | null;
  /** Number of graded answers behind `accuracy`. */
  gradedAttempts: number;
  /** Self-rated 1..5. Explicitly NOT performance. */
  confidence: number;
  /** Effort only. */
  minutes: number;
  recencyDays: number | null;
  syllabusWeight: number;
  highYield: number;
}

export interface AttentionItem {
  module: string;
  /** The evidence class — never inferred from time spent or mood. */
  evidence: "low-graded-accuracy" | "no-coverage" | "self-rated-low";
  detail: string;
  sampleSize: number | null;
}

export interface WeeklyLoadPoint {
  weekStart: string; // local YYYY-MM-DD (Monday)
  minutes: number;
  targetMinutes: number;
}

export interface OnTrackWeek {
  plannedMinutes: number;
  completedMinutes: number;
  /** 0..100, null when no weekly target is set. */
  percent: number | null;
  weekStart: string;
  source: string;
}

export interface ConsistencyResult {
  studyDays: number;
  windowDays: number;
  percent: number;
  currentStreak: number;
  source: string;
}

export interface SelfReportedQuality {
  sessionsRated: number;
  avgFocusPct: number | null;
  avgMood: number | null;
  /** Always shown next to these numbers in the UI. */
  disclaimer: string;
}

export interface Insight {
  tone: "good" | "warn" | "info";
  text: string;
  source: string;
}

export interface AnalyticsBundle {
  hasAnyData: boolean;
  /** True when canonical study_events are unavailable and we fell back to the legacy plan blob. */
  usingLegacyFallback: boolean;
  totalSessions: number;
  totalLoggedMinutes: number;
  graded: GradedResults;
  coverage: CoverageResult;
  onTrack: OnTrackWeek;
  consistency: ConsistencyResult;
  selfReported: SelfReportedQuality;
  subjects: SubjectStat[];
  strongest: SubjectStat[];
  weakest: SubjectStat[];
  needsAttention: AttentionItem[];
  weeklyLoad: WeeklyLoadPoint[];
  insights: Insight[];
}

export interface DeriveOptions {
  /** Canonical graded results. Omit only when they genuinely aren't loaded yet. */
  graded?: GradedResults;
  /** Canonical study events. When empty, the legacy plan blob is used as a compatibility view. */
  events?: StudyEventRow[];
}

// ───────── helpers

const DAY_MS = 86_400_000;

/** Normalised activity record used internally — canonical or legacy. */
interface Activity {
  localDate: string;
  occurredAt: number;
  minutes: number;
  subject: string | null;
  subtopic: string | null;
  activityType: string;
  selfFocus: number | null;
  selfMood: number | null;
}

function localMondayKey(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon = 0
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return localDateFor(x);
}

function fromEvents(events: StudyEventRow[]): Activity[] {
  return events.map((e) => ({
    localDate: e.local_date,
    occurredAt: new Date(e.occurred_at).getTime(),
    minutes: e.actual_minutes ?? 0,
    subject: e.subject,
    subtopic: e.subtopic,
    activityType: e.activity_type,
    selfFocus: e.self_focus,
    selfMood: e.self_mood,
  }));
}

function fromLegacy(sessions: StudySession[]): Activity[] {
  return sessions.map((s) => ({
    // Legacy rows mixed local and UTC keys; re-derive from the timestamp so
    // every date key in analytics is the user's local date.
    localDate: s.loggedAt ? localDateFor(new Date(s.loggedAt)) : s.date,
    occurredAt: new Date(s.loggedAt ?? `${s.date}T12:00:00Z`).getTime(),
    minutes: s.minutes ?? 0,
    subject: s.module ?? null,
    subtopic: null,
    activityType: s.sessionType ?? "study",
    selfFocus: typeof s.focus === "number" ? s.focus : null,
    selfMood: typeof s.mood === "number" ? s.mood : null,
  }));
}

function computeLocalStreak(dates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!dates.has(localDateFor(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dates.has(localDateFor(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ───────── main

export function deriveAnalytics(
  plan: StoredPlan | null,
  opts: DeriveOptions = {},
): AnalyticsBundle {
  const graded = opts.graded ?? EMPTY_GRADED_RESULTS;
  const modules = plan?.input.modules ?? [];
  const examPath: ExamPath =
    plan?.input.examPath ?? defaultPathForExam(plan?.input.examType ?? "SQE1");
  const targetWeeklyMinutes = Math.max(0, (plan?.input.hoursPerWeek ?? 0) * 60);

  const canonical = opts.events ?? [];
  const usingLegacyFallback = canonical.length === 0;
  const activities = (
    usingLegacyFallback ? fromLegacy(plan?.sessions ?? []) : fromEvents(canonical)
  ).sort((a, b) => a.occurredAt - b.occurredAt);

  const now = Date.now();
  const totalLoggedMinutes = activities.reduce((a, s) => a + s.minutes, 0);

  // ── subjects: effort + graded accuracy, kept strictly separate
  const gradedBySubject = new Map(graded.perSubject.map((s) => [s.subject, s]));
  const subjects: SubjectStat[] = modules.map((m) => {
    const mine = activities.filter((s) => s.subject === m.name);
    const minutes = mine.reduce((a, s) => a + s.minutes, 0);
    const last = mine[mine.length - 1];
    const g = gradedBySubject.get(m.name);
    const syllabus = getSubjectByName(m.name);
    return {
      module: m.name,
      accuracy: g && g.attempted >= MIN_SUBJECT_SAMPLE ? g.accuracy : null,
      gradedAttempts: g?.attempted ?? 0,
      confidence: m.confidence,
      minutes,
      recencyDays: last ? Math.floor((now - last.occurredAt) / DAY_MS) : null,
      syllabusWeight: syllabus?.weight ?? 0,
      highYield: syllabus?.highYield ?? 3,
    };
  });

  // ── coverage against the canonical full syllabus
  const signals: CoverageSignal[] = activities
    .filter((a) => a.subject)
    .map((a) => ({ subject: a.subject!, subtopic: a.subtopic, minutes: a.minutes }));
  const coverage = computeCoverage(examPath, signals);

  // ── on track this week (planned vs completed real minutes)
  const weekStart = localMondayKey(new Date());
  const weekMinutes = activities
    .filter((a) => a.localDate >= weekStart)
    .reduce((a, s) => a + s.minutes, 0);
  const onTrack: OnTrackWeek = {
    plannedMinutes: targetWeeklyMinutes,
    completedMinutes: weekMinutes,
    percent:
      targetWeeklyMinutes > 0
        ? Math.min(999, Math.round((weekMinutes / targetWeeklyMinutes) * 100))
        : null,
    weekStart,
    source: usingLegacyFallback
      ? "Your saved sessions (this device's plan history)"
      : "Recorded study events",
  };

  // ── consistency (local dates only)
  const dateSet = new Set(activities.map((a) => a.localDate));
  const windowDays = 14;
  let studyDays = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(now - i * DAY_MS);
    if (dateSet.has(localDateFor(d))) studyDays += 1;
  }
  const consistency: ConsistencyResult = {
    studyDays,
    windowDays,
    percent: Math.round((studyDays / windowDays) * 100),
    currentStreak: computeLocalStreak(dateSet),
    source: `Days with at least one recorded session · last ${windowDays} days`,
  };

  // ── self-reported wellbeing (kept away from performance)
  const rated = activities.filter((a) => a.selfFocus !== null || a.selfMood !== null);
  const focusVals = rated.map((a) => a.selfFocus).filter((v): v is number => v !== null);
  const moodVals = rated.map((a) => a.selfMood).filter((v): v is number => v !== null);
  const selfReported: SelfReportedQuality = {
    sessionsRated: rated.length,
    avgFocusPct: focusVals.length
      ? Math.round((focusVals.reduce((a, v) => a + v, 0) / focusVals.length) * 100)
      : null,
    avgMood: moodVals.length
      ? Math.round((moodVals.reduce((a, v) => a + v, 0) / moodVals.length) * 10) / 10
      : null,
    disclaimer: "Self-reported by you at the end of a session — not a performance measure.",
  };

  // ── rankings: graded only, with sample size
  const withGraded = subjects.filter((s) => s.accuracy !== null);
  const strongest = [...withGraded].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0)).slice(0, 3);
  const weakest = [...withGraded].sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0)).slice(0, 3);

  // ── needs attention: evidence-led only
  const needsAttention: AttentionItem[] = [];
  for (const s of withGraded) {
    if ((s.accuracy ?? 100) < 60) {
      needsAttention.push({
        module: s.module,
        evidence: "low-graded-accuracy",
        detail: `${s.accuracy}% correct across ${s.gradedAttempts} graded questions.`,
        sampleSize: s.gradedAttempts,
      });
    }
  }
  for (const name of coverage.untouchedSubjects) {
    const s = subjects.find((x) => x.module === name);
    needsAttention.push({
      module: name,
      evidence: "no-coverage",
      detail: `No meaningful study time recorded yet${s && s.highYield >= 4 ? " · high-yield subject" : ""}.`,
      sampleSize: null,
    });
  }
  for (const m of modules) {
    if (m.rated && m.confidence <= 2 && !needsAttention.some((n) => n.module === m.name)) {
      needsAttention.push({
        module: m.name,
        evidence: "self-rated-low",
        detail: `You rated your confidence ${m.confidence}/5. No graded evidence yet.`,
        sampleSize: null,
      });
    }
  }

  // ── weekly effort (last 8 weeks, local weeks)
  const weeklyLoad: WeeklyLoadPoint[] = [];
  for (let i = 7; i >= 0; i--) {
    const ws = new Date(now - i * 7 * DAY_MS);
    const key = localMondayKey(ws);
    const endDate = new Date(ws);
    endDate.setDate(endDate.getDate() + 7);
    const endKey = localMondayKey(endDate);
    const minutes = activities
      .filter((a) => a.localDate >= key && a.localDate < endKey)
      .reduce((a, s) => a + s.minutes, 0);
    weeklyLoad.push({ weekStart: key, minutes, targetMinutes: targetWeeklyMinutes });
  }

  // ── insights (each states its evidence; none derived from mood)
  const insights: Insight[] = [];
  if (graded.hasData && graded.trend.length === 2) {
    const [early, late] = graded.trend;
    const delta = late.accuracy - early.accuracy;
    if (Math.abs(delta) >= 5) {
      insights.push({
        tone: delta > 0 ? "good" : "warn",
        text: `Graded accuracy has ${delta > 0 ? "risen" : "fallen"} ${Math.abs(delta)} points, ${early.accuracy}% → ${late.accuracy}%.`,
        source: `Earlier ${early.attempted} vs recent ${late.attempted} graded questions.`,
      });
    }
  }
  if (!graded.hasData) {
    insights.push({
      tone: "info",
      text: "No graded answers recorded yet, so no accuracy is shown anywhere.",
      source: "Accuracy requires answered practice, mini-test or mock questions.",
    });
  }
  if (coverage.subtopicPercent !== null && coverage.untouchedSubjects.length) {
    insights.push({
      tone: "info",
      text: `${coverage.subjectsTouched}/${coverage.totalSubjects} syllabus subjects have recorded study time.`,
      source: coverage.source,
    });
  }
  if (targetWeeklyMinutes > 0 && activities.length >= 3 && onTrack.percent !== null) {
    if (onTrack.percent < 60) {
      insights.push({
        tone: "warn",
        text: `You're at ${onTrack.percent}% of your planned hours this week.`,
        source: `${Math.round(weekMinutes)} of ${targetWeeklyMinutes} planned minutes since ${weekStart}.`,
      });
    } else if (onTrack.percent > 140) {
      insights.push({
        tone: "warn",
        text: `You're well above your planned hours this week — watch for burnout.`,
        source: `${Math.round(weekMinutes)} of ${targetWeeklyMinutes} planned minutes.`,
      });
    }
  }

  return {
    hasAnyData: activities.length > 0 || graded.hasData,
    usingLegacyFallback,
    totalSessions: activities.length,
    totalLoggedMinutes,
    graded,
    coverage,
    onTrack,
    consistency,
    selfReported,
    subjects,
    strongest,
    weakest,
    needsAttention,
    weeklyLoad,
    insights,
  };
}

/** Loads canonical inputs and derives the honest bundle. */
export async function loadAnalytics(plan: StoredPlan | null): Promise<AnalyticsBundle> {
  const [{ loadGradedResults }, { loadStudyEvents }] = await Promise.all([
    import("@/lib/graded-performance"),
    import("@/lib/study-log"),
  ]);
  const [graded, events] = await Promise.all([
    loadGradedResults().catch(() => EMPTY_GRADED_RESULTS),
    loadStudyEvents().catch(() => []),
  ]);
  return deriveAnalytics(plan, { graded, events });
}
