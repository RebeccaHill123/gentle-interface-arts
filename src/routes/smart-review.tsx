/**
 * Smart Review — the student's performance-tracking and adaptive revision hub.
 *
 * Every statistic is computed from real saved data: canonical graded attempts
 * (correctness) and smart_review_sessions (full quiz history). Nothing here is
 * invented; empty states say so plainly.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Clock,
  Flag,
  History,
  Play,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { loadGradedAttempts, type GradedAttemptRow } from "@/lib/study-log";
import {
  loadSmartReviewSessions,
  type SmartReviewSessionRow,
} from "@/lib/smart-review/sessions";
import {
  buildSubjectPerformance,
  buildSubtopicPerformance,
  overallPerformance,
  REVIEW_STATUS_LABELS,
  type ReviewStatus,
  type SubjectPerformance,
} from "@/lib/smart-review/performance";
import { diagnoseWeakAreas, weakestAreaHeadline } from "@/lib/smart-review/diagnosis";
import { PRACTICE_CONFIG_KEY, type PracticeConfig } from "@/lib/practice/config";
import { clearSnapshot } from "@/lib/practice/session";
import { loadPlan } from "@/lib/plan-store";
import { getExamLabel } from "@/lib/exam-label";

export const Route = createFileRoute("/smart-review")({
  beforeLoad: async () => {
    const { requireAccess } = await import("@/lib/access-guard");
    await requireAccess();
  },
  component: SmartReviewPage,
  head: () => ({
    meta: [
      { title: "Smart Review · Tentra" },
      {
        name: "description",
        content:
          "Your personalised strength and weakness tracker: real quiz performance by subject and subtopic, review priorities and full quiz history.",
      },
      { property: "og:title", content: "Smart Review | Tentra" },
      {
        property: "og:description",
        content:
          "Adaptive revision driven by your real graded answers — strengths, weaknesses and what to review next.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Period = "30d" | "90d" | "all";
const PERIODS: { id: Period; label: string }[] = [
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

const STATUS_STYLE: Record<ReviewStatus, string> = {
  "needs-review": "border-rose-400/40 bg-rose-400/10 text-rose-300",
  developing: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  strong: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  "not-assessed": "border-border bg-background/60 text-muted-foreground",
};

const COUNT_OPTIONS = [5, 10, 15, 20] as const;
const DIFFICULTY_OPTIONS = [
  { id: "Easy", label: "Easy", mapped: "Foundational" as const },
  { id: "Medium", label: "Medium", mapped: "Standard" as const },
  { id: "Hard", label: "Hard", mapped: "Stretch" as const },
  { id: "Mixed", label: "Mixed", mapped: "Adaptive" as const },
];

function SmartReviewPage() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<GradedAttemptRow[] | null>(null);
  const [sessions, setSessions] = useState<SmartReviewSessionRow[] | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  // Launcher state
  const [launchSubject, setLaunchSubject] = useState<string>("");
  const [launchCount, setLaunchCount] = useState<number>(10);
  const [launchDifficulty, setLaunchDifficulty] = useState<string>("Mixed");

  const examLabel = useMemo(() => {
    const plan = loadPlan();
    return getExamLabel(plan?.input.examType, plan?.input.examPath);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadGradedAttempts(), loadSmartReviewSessions(50)])
      .then(([a, s]) => {
        if (cancelled) return;
        setAttempts(a);
        setSessions(s);
      })
      .catch(() => {
        if (cancelled) return;
        setAttempts([]);
        setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!attempts) return null;
    let rows = attempts;
    if (period !== "all") {
      const days = period === "30d" ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
      rows = rows.filter((a) => a.occurred_at >= cutoff);
    }
    if (subjectFilter !== "all") rows = rows.filter((a) => a.subject === subjectFilter);
    return rows;
  }, [attempts, period, subjectFilter]);

  const subs = useMemo(() => (filtered ? buildSubtopicPerformance(filtered) : []), [filtered]);
  const subjects: SubjectPerformance[] = useMemo(() => buildSubjectPerformance(subs), [subs]);
  const overall = useMemo(() => (filtered ? overallPerformance(filtered) : null), [filtered]);
  const recommendations = useMemo(() => diagnoseWeakAreas(subs, { max: 5 }), [subs]);
  const headline = useMemo(() => weakestAreaHeadline(subs), [subs]);

  const subjectNames = useMemo(
    () => (attempts ? [...new Set(attempts.map((a) => a.subject).filter((s): s is string => !!s))].sort() : []),
    [attempts],
  );

  // Improvement trend: earlier half vs recent half of the filtered window.
  const trend = useMemo(() => {
    if (!filtered || filtered.length < 10) return null;
    const half = Math.floor(filtered.length / 2);
    const earlier = filtered.slice(0, half);
    const recent = filtered.slice(half);
    const acc = (rows: GradedAttemptRow[]) =>
      Math.round((rows.filter((r) => r.is_correct).length / rows.length) * 100);
    return { earlier: acc(earlier), recent: acc(recent) };
  }, [filtered]);

  function startQuiz() {
    const subject = launchSubject || subjectNames[0];
    if (!subject) return;
    const diff = DIFFICULTY_OPTIONS.find((d) => d.id === launchDifficulty) ?? DIFFICULTY_OPTIONS[3];
    const config: PracticeConfig = {
      source: "practice-launcher",
      format: "smart-review",
      formatLabel: `Smart Review: ${subject}`,
      module: subject,
      questions: launchCount,
      duration: Math.max(10, launchCount * 2),
      difficulty: diff.mapped,
      timed: true,
      adaptive: launchDifficulty === "Mixed",
      rationale: `Smart Review session on ${subject} — ${launchCount} questions, ${diff.label.toLowerCase()} difficulty.`,
      reasonBits: [`${launchCount} questions`, `${diff.label} difficulty`],
      skillFocus: ["Application", "Rule accuracy", "Issue spotting"],
    };
    try {
      sessionStorage.setItem(PRACTICE_CONFIG_KEY, JSON.stringify(config));
    } catch {}
    clearSnapshot();
    navigate({ to: "/practice" });
  }

  function reviewIncorrect() {
    const target = recommendations[0];
    if (!target) return;
    const config: PracticeConfig = {
      source: "practice-launcher",
      format: "smart-review",
      formatLabel: `Review incorrect: ${target.subtopic}`,
      module: target.subject,
      topic: target.subtopic,
      questions: target.suggestedQuestions,
      duration: Math.max(10, target.suggestedQuestions * 2),
      difficulty:
        target.suggestedDifficulty === "Easy"
          ? "Foundational"
          : target.suggestedDifficulty === "Hard"
            ? "Stretch"
            : target.suggestedDifficulty === "Medium"
              ? "Standard"
              : "Adaptive",
      timed: true,
      adaptive: false,
      rationale: `Fresh questions on ${target.subtopic} — the concept you most recently missed. New scenarios, same principles.`,
      reasonBits: ["Previously missed", target.subject],
      skillFocus: ["Rule accuracy", "Application"],
    };
    try {
      sessionStorage.setItem(PRACTICE_CONFIG_KEY, JSON.stringify(config));
    } catch {}
    clearSnapshot();
    navigate({ to: "/practice" });
  }

  const loading = attempts === null || sessions === null;

  return (
    <AppShell title="Smart Review" subtitle={`${examLabel} performance tracker`}>
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          Analysing your graded answers…
        </div>
      ) : (
        <div className="space-y-6">
          {/* Start a quiz */}
          <section className="relative overflow-hidden rounded-3xl border border-pink/30 bg-gradient-to-br from-pink/10 to-blue/10 p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-pink-blue opacity-25 blur-3xl" />
            <Badge className="rounded-full bg-pink/15 text-pink hover:bg-pink/15">
              <Sparkles className="mr-1 h-3 w-3" /> Smart Review
            </Badge>
            <h2 className="mt-2 text-xl font-semibold tracking-tight">Start a review quiz</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {headline ?? "Pick a subject, set the size and difficulty — every result updates your tracker."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Subject</span>
                <select
                  value={launchSubject || subjectNames[0] || ""}
                  onChange={(e) => setLaunchSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  {subjectNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Questions</span>
                <select
                  value={launchCount}
                  onChange={(e) => setLaunchCount(Number(e.target.value))}
                  className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  {COUNT_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n} questions
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Difficulty</span>
                <select
                  value={launchDifficulty}
                  onChange={(e) => setLaunchDifficulty(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm"
                >
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <Button
                  onClick={startQuiz}
                  disabled={subjectNames.length === 0}
                  className="w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
                >
                  <Play className="mr-1 h-4 w-4" /> Start
                </Button>
              </div>
            </div>
            {subjectNames.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                Complete a practice session first and your subjects will appear here.
              </p>
            )}
          </section>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  period === p.id
                    ? "border-pink/60 bg-pink/10 text-foreground"
                    : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
            <span className="mx-1 h-4 w-px bg-border" />
            <button
              onClick={() => setSubjectFilter("all")}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                subjectFilter === "all"
                  ? "border-pink/60 bg-pink/10 text-foreground"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              All subjects
            </button>
            {subjectNames.map((s) => (
              <button
                key={s}
                onClick={() => setSubjectFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  subjectFilter === s
                    ? "border-pink/60 bg-pink/10 text-foreground"
                    : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Overall performance */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={BarChart3}
              label="Questions answered"
              value={overall ? String(overall.totalAttempted) : "0"}
            />
            <StatCard
              icon={Target}
              label="Overall accuracy"
              value={overall?.accuracy != null ? `${overall.accuracy}%` : "—"}
            />
            <StatCard
              icon={TrendingUp}
              label="Improvement"
              value={
                trend ? `${trend.earlier}% → ${trend.recent}%` : "—"
              }
              detail={trend ? "Earlier half vs recent half" : "Needs 10+ answers"}
            />
            <StatCard
              icon={Flag}
              label="Topics needing review"
              value={String(subs.filter((s) => s.status === "needs-review").length)}
            />
          </section>

          {/* What to review next */}
          <section className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Target className="h-3.5 w-3.5 text-pink" /> What to review next
              </div>
              {recommendations.length > 0 && (
                <Button
                  size="sm"
                  onClick={reviewIncorrect}
                  className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
                >
                  <BookOpenCheck className="mr-1 h-4 w-4" /> Review incorrect answers
                </Button>
              )}
            </div>
            {recommendations.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {overall && overall.totalAttempted > 0
                  ? "No weak areas detected in this window. Keep the mixed practice going."
                  : "No graded answers yet — your review priorities will appear after your first quiz."}
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {recommendations.map((r) => (
                  <li
                    key={`${r.subject}|${r.subtopic}`}
                    className="rounded-xl border border-border bg-background/40 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{r.subtopic}</span>
                      <span className="text-xs text-muted-foreground">{r.subject}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-foreground">
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink" />
                      {r.action}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Subject performance */}
          <section className="rounded-2xl border border-border bg-card/70 backdrop-blur">
            <div className="border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Performance by subject
            </div>
            {subjects.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                Nothing graded in this window yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {subjects.map((s) => {
                  const open = expandedSubject === s.subject;
                  return (
                    <div key={s.subject}>
                      <button
                        onClick={() => setExpandedSubject(open ? null : s.subject)}
                        className="flex w-full items-center gap-4 px-5 py-3.5 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{s.subject}</span>
                            {s.needsReviewCount > 0 && (
                              <Badge className="rounded-full bg-rose-400/15 text-rose-300 hover:bg-rose-400/15">
                                {s.needsReviewCount} to review
                              </Badge>
                            )}
                            {s.strongCount > 0 && (
                              <Badge className="rounded-full bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/15">
                                {s.strongCount} strong
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1.5 flex items-center gap-3">
                            <Progress value={s.accuracy ?? 0} className="h-1.5 flex-1" />
                            <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                              {s.accuracy != null ? `${s.accuracy}%` : "—"} · {s.attempted} Qs
                            </span>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                      {open && (
                        <div className="space-y-1.5 px-5 pb-4">
                          {s.subtopics.map((sub) => (
                            <div
                              key={sub.subtopic}
                              className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm"
                            >
                              <span className="min-w-0 flex-1 truncate text-foreground">
                                {sub.subtopic}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {sub.accuracy != null ? `${sub.accuracy}%` : "—"} · {sub.attempted} Qs
                                {sub.improving === true && " · improving"}
                                {sub.improving === false && " · declining"}
                              </span>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[11px] ${STATUS_STYLE[sub.status]}`}
                              >
                                {REVIEW_STATUS_LABELS[sub.status]}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Quiz history */}
          <section className="rounded-2xl border border-border bg-card/70 backdrop-blur">
            <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <History className="h-3.5 w-3.5" /> Quiz history
            </div>
            {!sessions || sessions.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                Completed quizzes will appear here with their full questions, your answers and the
                explanations.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {sessions.map((s) => {
                  const open = expandedSession === s.id;
                  const pct = Math.round(s.accuracy * 100);
                  return (
                    <div key={s.id}>
                      <button
                        onClick={() => setExpandedSession(open ? null : s.id)}
                        className="flex w-full items-center gap-4 px-5 py-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{s.subject}</span>
                            {s.subtopic && (
                              <span className="text-xs text-muted-foreground">{s.subtopic}</span>
                            )}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(s.created_at).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                            <span>· {s.difficulty}</span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                            pct >= 80
                              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                              : pct >= 60
                                ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                                : "border-rose-400/40 bg-rose-400/10 text-rose-300"
                          }`}
                        >
                          {s.correct_count}/{s.question_count} — {pct}%
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                      {open && (
                        <div className="space-y-3 px-5 pb-4">
                          {s.summary && (
                            <p className="rounded-xl border border-pink/30 bg-pink/10 p-3 text-sm text-foreground">
                              {s.summary}
                            </p>
                          )}
                          {s.questions.map((q, qi) => {
                            const a = s.answers[qi] ?? null;
                            const isFlagged = s.flagged.includes(qi);
                            const correct = !isFlagged && a === q.correctIndex;
                            return (
                              <details
                                key={qi}
                                className="rounded-xl border border-border bg-background/40 px-3 py-2"
                              >
                                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm">
                                  {isFlagged ? (
                                    <Flag className="h-3.5 w-3.5 shrink-0 text-amber-300" />
                                  ) : correct ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                  ) : (
                                    <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-400" />
                                  )}
                                  <span className="min-w-0 flex-1 truncate">{q.prompt}</span>
                                </summary>
                                <div className="mt-2 space-y-1.5 text-xs">
                                  {q.options.map((opt, oi) => (
                                    <div
                                      key={oi}
                                      className={`rounded-lg border px-2 py-1.5 ${
                                        oi === q.correctIndex
                                          ? "border-emerald-400/40 bg-emerald-400/10"
                                          : a === oi
                                            ? "border-rose-400/40 bg-rose-400/10"
                                            : "border-border"
                                      }`}
                                    >
                                      <span className="font-medium">
                                        {String.fromCharCode(65 + oi)}. {opt}
                                      </span>
                                      {q.optionExplanations?.[oi] && (
                                        <span className="mt-0.5 block text-muted-foreground">
                                          {q.optionExplanations[oi]}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  <p className="pt-1 text-muted-foreground">{q.explanation}</p>
                                  {q.memoryRule && (
                                    <p className="rounded-lg border border-pink/30 bg-pink/10 px-2 py-1.5 text-foreground">
                                      <span className="font-semibold text-pink">Memory rule: </span>
                                      {q.memoryRule}
                                    </p>
                                  )}
                                </div>
                              </details>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
      {detail && <div className="mt-0.5 text-[11px] text-muted-foreground">{detail}</div>}
    </div>
  );
}
