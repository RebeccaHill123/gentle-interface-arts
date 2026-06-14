import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Brain,
  ShieldAlert,
  Trophy,
  Clock,
  Lightbulb,
  Lock,
  Info,
  Zap,
} from "lucide-react";
import { waitForAuthUser } from "@/lib/auth-session";
import { getProStatus } from "@/lib/pro-store";
import { loadPlan } from "@/lib/plan-store";
import {
  deriveAnalytics,
  READINESS_LABELS,
  type AnalyticsBundle,
  type ReadinessBreakdown,
  type SubjectStat,
} from "@/lib/analytics-derive";

export const Route = createFileRoute("/analytics")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Performance analytics · Tentra" },
      {
        name: "description",
        content:
          "Explainable SQE performance analytics: readiness, predicted score, weak topics and revision trends — all derived from your tracked behaviour.",
      },
    ],
  }),
});

function AnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [data, setData] = useState<AnalyticsBundle | null>(null);

  useEffect(() => {
    (async () => {
      const status = await getProStatus().catch(() => ({ isPro: false }));
      setIsPro(!!status.isPro);
      const stored = loadPlan();
      if (!stored) {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      setData(deriveAnalytics(stored));
      setLoading(false);
    })();
  }, [navigate]);

  return (
    <TooltipProvider delayDuration={150}>
      <AppShell
        title="Performance dashboard"
        subtitle="Every metric here is derived from your tracked study behaviour. Hover any number to see how it's calculated."
        actions={
          !isPro ? (
            <Button
              asChild
              size="sm"
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
            >
              <Link to="/pro">
                <Sparkles className="h-4 w-4" /> Unlock Pro
              </Link>
            </Button>
          ) : undefined
        }
      >
        {loading || !data ? (
          <div className="mt-12 flex h-64 items-center justify-center text-sm text-muted-foreground">
            Crunching your numbers…
          </div>
        ) : (
          <div className={!isPro ? "relative mt-2" : "mt-2"}>
            {!isPro && <LockedOverlay />}
            <div className={!isPro ? "pointer-events-none select-none blur-[6px]" : ""}>
              <DataBanner data={data} />

              {/* Hero */}
              <section className="mt-6 grid gap-4 md:grid-cols-3">
                <ReadinessCard data={data} />
                <PredictedScoreCard data={data} />
                <PeakCard data={data} />
              </section>

              {/* Strongest / Weakest */}
              <section className="mt-6 grid gap-4 md:grid-cols-2">
                <Panel
                  title="Strongest subjects"
                  icon={Trophy}
                  iconClass="text-emerald-400"
                  subtitle="Ranked by mock accuracy, with confidence as a tiebreaker."
                >
                  <SubjectList subjects={data.strongest} variant="good" />
                </Panel>
                <Panel
                  title="Weakest subjects"
                  icon={ShieldAlert}
                  iconClass="text-pink"
                  subtitle="Lowest accuracy or untouched high-yield areas."
                >
                  <SubjectList subjects={data.weakest} variant="bad" />
                </Panel>
              </section>

              {/* Mock trend + Weekly load */}
              <section className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Panel
                    title="Mock test trend"
                    icon={TrendingUp}
                    subtitle={
                      data.mockTrend.length
                        ? `${data.mockTrend.length} mock${data.mockTrend.length === 1 ? "" : "s"} logged · accuracy %`
                        : "Log mock or quiz sessions to populate this trend."
                    }
                  >
                    <MockTrendChart points={data.mockTrend} />
                  </Panel>
                </div>
                <Panel
                  title="Weekly study load"
                  icon={Clock}
                  subtitle="Actual minutes per week vs your weekly target."
                >
                  <WeeklyLoadChart load={data.weeklyLoad} />
                </Panel>
              </section>

              {/* At-risk + Confidence */}
              <section className="mt-6 grid gap-4 lg:grid-cols-3">
                <Panel
                  title="At-risk topics"
                  icon={ShieldAlert}
                  iconClass="text-pink"
                  subtitle="Risk = confidence gap × high-yield × syllabus weight × recency."
                >
                  <RiskList subjects={data.atRisk} />
                </Panel>
                <div className="lg:col-span-2">
                  <Panel
                    title="Confidence vs measured accuracy"
                    icon={Brain}
                    subtitle="Where self-rating diverges from observed performance."
                  >
                    <ConfidenceMatrix subjects={data.subjects} />
                  </Panel>
                </div>
              </section>

              {/* Insights */}
              <section className="mt-6">
                <Panel
                  title="Data-driven insights"
                  icon={Sparkles}
                  subtitle="Generated only when there's enough behaviour to back the claim."
                >
                  {data.insights.length ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {data.insights.map((i, idx) => (
                        <InsightCard key={idx} {...i} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Lightbulb}
                      title="No insights yet"
                      body="Log a few more study, quiz or mock sessions and we'll surface patterns we're confident about."
                    />
                  )}
                  <div className="mt-4 flex justify-end">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                    >
                      <Link to="/coach">
                        Ask Coach for a fix plan <Sparkles className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Panel>
              </section>
            </div>
          </div>
        )}
      </AppShell>
    </TooltipProvider>
  );
}

// ---------------- presentation ----------------

function DataBanner({ data }: { data: AnalyticsBundle }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 px-4 py-3 text-xs text-muted-foreground backdrop-blur">
      Calculated from{" "}
      <span className="font-semibold text-foreground">{data.totalSessions}</span> tracked
      session{data.totalSessions === 1 ? "" : "s"} ·{" "}
      <span className="font-semibold text-foreground">{Math.round(data.totalLoggedMinutes / 60)}h</span>{" "}
      logged ·{" "}
      <span className="font-semibold text-foreground">{data.totalMockSessions}</span> mock
      {data.totalMockSessions === 1 ? "" : "s"}.
    </div>
  );
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <div className="rounded-3xl border border-border bg-card/80 px-6 py-5 text-center backdrop-blur-md shadow-glow">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-pink-blue text-primary-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold">Analytics is a Tentra Pro feature</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Unlock readiness, predicted scores, weak-topic detection and AI insights.
        </p>
        <Button
          asChild
          className="mt-4 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
        >
          <Link to="/pro">
            <Sparkles className="h-4 w-4" /> Try Pro free
          </Link>
        </Button>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  iconClass,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: typeof Sparkles;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card/50 p-5 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background/60">
          <Icon className={`h-4 w-4 ${iconClass ?? "text-pink"}`} />
        </span>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-background/40 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/60">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function InfoTip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-background/60"
          aria-label="How is this calculated?"
        >
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal text-left leading-snug">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

// ---------------- hero cards ----------------

function ReadinessCard({ data }: { data: AnalyticsBundle }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const readiness = data.readiness;

  if (!readiness) {
    return (
      <HeroShell label="Exam readiness">
        <EmptyState
          icon={Target}
          title="Readiness unlocks after 3 sessions"
          body="We need a small baseline of study, quiz or mock activity before producing a credible readiness score."
        />
      </HeroShell>
    );
  }

  const dash = (readiness.score / 100) * c;
  return (
    <HeroShell
      label="Exam readiness"
      tip={
        <div className="space-y-1">
          <p className="font-semibold text-primary-foreground">How this is calculated</p>
          <p>
            Weighted blend of:
          </p>
          <ul className="space-y-0.5">
            <li>• Mock performance (40%)</li>
            <li>• Syllabus coverage (20%)</li>
            <li>• Consistency · last 14 days (15%)</li>
            <li>• Weak-topic improvement (15%)</li>
            <li>• Revision recency (10%)</li>
          </ul>
          <p className="mt-1 opacity-80">
            Components without enough data are excluded and remaining weights re-normalised.
          </p>
        </div>
      }
    >
      <div className="flex items-center gap-5">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={r} stroke="hsl(var(--border))" strokeWidth="10" fill="none" />
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--pink))" />
              <stop offset="100%" stopColor="hsl(var(--blue))" />
            </linearGradient>
          </defs>
          <circle
            cx="70"
            cy="70"
            r={r}
            stroke="url(#ringGrad)"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 70 70)"
            style={{ transition: "stroke-dasharray 1.2s ease" }}
          />
          <text
            x="70"
            y="76"
            textAnchor="middle"
            className="fill-foreground"
            style={{ fontSize: 28, fontWeight: 700 }}
          >
            {readiness.score}%
          </text>
        </svg>
        <div className="flex-1 space-y-2">
          {(Object.keys(READINESS_LABELS) as (keyof ReadinessBreakdown)[])
            .filter((k) => readiness.weights[k] > 0)
            .map((k) => {
              const v = readiness.breakdown[k];
              return (
                <div key={k} className="text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {READINESS_LABELS[k]} ·{" "}
                      <span className="opacity-70">
                        {Math.round(readiness.weights[k] * 100)}%
                      </span>
                    </span>
                    <span className="font-semibold">
                      {v === null ? "—" : `${v}%`}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full rounded-full bg-background/60">
                    <div
                      className="h-1 rounded-full bg-gradient-pink-blue"
                      style={{ width: v === null ? "0%" : `${v}%` }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </HeroShell>
  );
}

function PredictedScoreCard({ data }: { data: AnalyticsBundle }) {
  const p = data.predicted;
  if (!p) {
    const remaining = Math.max(0, 3 - data.totalMockSessions);
    return (
      <HeroShell label="Predicted SQE score">
        <EmptyState
          icon={Lock}
          title={`Complete ${remaining} more mock${remaining === 1 ? "" : "s"} to unlock`}
          body="Score prediction needs at least 3 mock or timed-quiz sessions so the trajectory and confidence interval are statistically meaningful."
        />
      </HeroShell>
    );
  }

  return (
    <HeroShell
      label="Predicted SQE score"
      tip={
        <div className="space-y-1">
          <p className="font-semibold text-primary-foreground">How this is calculated</p>
          <p>
            Blend of your overall mock average (40%) and your last 3 mocks (60%). The
            confidence interval narrows as you log more mocks.
          </p>
          <p>
            Pass likelihood is a logistic estimate around the SQE1 effective threshold (~57%).
            It is <em>not</em> an official cohort percentile.
          </p>
        </div>
      }
    >
      <div className="flex items-baseline gap-2">
        <span className="bg-gradient-pink-blue bg-clip-text text-5xl font-bold text-transparent">
          {p.score}
        </span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Confidence range: {p.confidenceLow}–{p.confidenceHigh}% · based on {p.basedOnMocks} mocks
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Estimated pass likelihood</span>
            <span className="font-semibold">{p.passLikelihood}%</span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-background/60">
            <div
              className="h-2 rounded-full bg-gradient-pink-blue transition-all duration-700"
              style={{ width: `${p.passLikelihood}%` }}
            />
          </div>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Projected band</span>
          <span className="font-semibold">{p.band}</span>
        </div>
      </div>
    </HeroShell>
  );
}

function PeakCard({ data }: { data: AnalyticsBundle }) {
  if (!data.peak) {
    return (
      <HeroShell label="Peak performance">
        <EmptyState
          icon={Zap}
          title="We're still learning your study patterns"
          body="Log around 8 sessions across different times of day and we'll identify when you perform best."
        />
      </HeroShell>
    );
  }
  const p = data.peak;
  return (
    <HeroShell
      label="Peak performance"
      tip={
        <div className="space-y-1">
          <p className="font-semibold text-primary-foreground">How this is calculated</p>
          <p>
            Sessions are bucketed by start time. We compare average session quality
            (focus × mood) of your top bucket against the rest. Only buckets with ≥2
            sessions are eligible.
          </p>
        </div>
      }
    >
      <div className="flex items-center gap-2 text-3xl font-semibold">
        <Flame className="h-6 w-6 text-orange-400" />
        +{p.uplift}%
      </div>
      <p className="mt-2 text-sm">
        You perform best in <span className="font-semibold">{p.label}</span>.
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Based on {p.sessionsInBucket} sessions in this window vs your other time blocks.
      </p>
    </HeroShell>
  );
}

function HeroShell({
  label,
  tip,
  children,
}: {
  label: string;
  tip?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 backdrop-blur">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-pink-blue opacity-20 blur-3xl" />
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        {tip && <InfoTip>{tip}</InfoTip>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

// ---------------- subject lists ----------------

function SubjectList({
  subjects,
  variant,
}: {
  subjects: SubjectStat[];
  variant: "good" | "bad";
}) {
  if (!subjects.length) {
    return (
      <EmptyState
        icon={Brain}
        title="Not enough subject data yet"
        body="Log study or quiz sessions per module to populate rankings."
      />
    );
  }
  return (
    <div className="space-y-3">
      {subjects.map((s) => {
        const value = s.accuracy ?? s.confidence * 20;
        const showAcc = s.accuracy !== null;
        return (
          <div key={s.module}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{s.module}</span>
              <span className="text-muted-foreground">
                {showAcc ? `${s.accuracy}% accuracy` : `Self-rated ${s.confidence}/5`}
                {s.trend !== null && s.trend !== 0 && (
                  <span
                    className={`ml-2 ${s.trend > 0 ? "text-emerald-300" : "text-pink"}`}
                  >
                    {s.trend > 0 ? "▲" : "▼"} {Math.abs(s.trend)}%
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1 h-2 w-full rounded-full bg-background/60">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${
                  variant === "good"
                    ? "bg-gradient-to-r from-emerald-400 to-blue"
                    : "bg-gradient-to-r from-pink to-orange-400"
                }`}
                style={{ width: `${Math.min(100, value)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {Math.round(s.minutes)} min logged ·{" "}
              {s.recencyDays === null
                ? "never revised"
                : s.recencyDays === 0
                  ? "revised today"
                  : `${s.recencyDays}d since last revised`}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function RiskList({ subjects }: { subjects: SubjectStat[] }) {
  if (!subjects.length) {
    return (
      <p className="text-xs text-muted-foreground">No subject data — add modules in onboarding.</p>
    );
  }
  return (
    <ul className="space-y-2">
      {subjects.map((s) => (
        <li
          key={s.module}
          className="flex items-center justify-between rounded-2xl border border-pink/30 bg-pink/5 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{s.module}</p>
            <p className="text-[11px] text-muted-foreground">
              HY{s.highYield} · {Math.round(s.syllabusWeight * 100)}% of paper ·{" "}
              {s.recencyDays === null
                ? "never revised"
                : `${s.recencyDays}d ago`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-pink">{s.riskScore}</p>
            <p className="text-[10px] text-muted-foreground">risk</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ConfidenceMatrix({ subjects }: { subjects: SubjectStat[] }) {
  const ranked = subjects.filter((s) => s.accuracy !== null);
  if (!ranked.length) {
    return (
      <EmptyState
        icon={Brain}
        title="Awaiting accuracy data"
        body="Log a few quiz or mock sessions per module to compare your self-rating with measured performance."
      />
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {ranked.map((s) => {
        const accAsConf = (s.accuracy ?? 0) / 20; // 0..5
        const gap = accAsConf - s.confidence; // + means overperforming vs self-rating
        const tag =
          gap > 0.5 ? "Underrated" : gap < -0.5 ? "Overconfident" : "Aligned";
        const tagClass =
          gap > 0.5
            ? "bg-emerald-400/15 text-emerald-300"
            : gap < -0.5
              ? "bg-pink/15 text-pink"
              : "bg-muted text-muted-foreground";
        return (
          <div
            key={s.module}
            className="flex items-center justify-between rounded-2xl border border-border bg-background/40 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.module}</p>
              <p className="text-[11px] text-muted-foreground">
                Self-rated {s.confidence}/5 · Accuracy {s.accuracy}%
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${tagClass}`}>
              {tag}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------- charts ----------------

function MockTrendChart({ points }: { points: AnalyticsBundle["mockTrend"] }) {
  if (points.length < 2) {
    return (
      <EmptyState
        icon={TrendingUp}
        title={
          points.length === 0
            ? "No mock sessions yet"
            : "1 mock logged — need at least 2 to show a trend"
        }
        body="Log timed quiz or mock sessions to see accuracy progression, plateaus and improvement streaks."
      />
    );
  }
  const w = 560;
  const h = 160;
  const pad = 16;
  const values = points.map((p) => p.accuracy);
  const min = Math.max(0, Math.min(...values) - 5);
  const max = Math.min(100, Math.max(...values) + 5);
  const xs = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const ys = (v: number) => h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2);
  const path = values.map((p, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(p)}`).join(" ");
  const area = `${path} L ${xs(values.length - 1)} ${h - pad} L ${pad} ${h - pad} Z`;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-40 w-full">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--pink))" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(var(--blue))" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="sparkStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--pink))" />
            <stop offset="100%" stopColor="hsl(var(--blue))" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkFill)" />
        <path d={path} fill="none" stroke="url(#sparkStroke)" strokeWidth="3" strokeLinecap="round" />
        {values.map((p, i) => (
          <circle
            key={i}
            cx={xs(i)}
            cy={ys(p)}
            r="4"
            fill="hsl(var(--background))"
            stroke="hsl(var(--pink))"
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        {points.map((p) => (
          <span key={p.index}>
            #{p.index} · {p.accuracy}%
          </span>
        ))}
      </div>
    </div>
  );
}

function WeeklyLoadChart({ load }: { load: AnalyticsBundle["weeklyLoad"] }) {
  const target = load[0]?.targetMinutes ?? 0;
  const max = Math.max(target, ...load.map((w) => w.minutes), 60);
  const recentAvg = Math.round(load.slice(-4).reduce((a, x) => a + x.minutes, 0) / 4);
  const last = load[load.length - 1]?.minutes ?? 0;
  const ratio = target > 0 ? last / target : 0;
  const tone =
    ratio < 0.6 ? "Under-training" : ratio > 1.4 ? "Over-loading" : "On track";
  return (
    <div>
      <div className="relative flex h-40 items-end gap-1.5">
        {target > 0 && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-blue/60"
            style={{ bottom: `${(target / max) * 100}%` }}
            title={`Target ${target} min`}
          />
        )}
        {load.map((w, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-blue to-pink transition-all duration-700"
              style={{ height: `${(w.minutes / max) * 100}%` }}
              title={`${w.minutes} min · week of ${w.weekStart}`}
            />
            <span className="text-[10px] text-muted-foreground">W{i + 1}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Last week: <span className="font-semibold text-foreground">{last} min</span>
          {target > 0 && <> · target {target}</>}
        </span>
        <span>4-week avg: <span className="font-semibold text-foreground">{recentAvg} min</span></span>
        <span
          className={
            tone === "On track"
              ? "text-emerald-300"
              : tone === "Under-training"
                ? "text-pink"
                : "text-orange-400"
          }
        >
          {tone}
        </span>
      </div>
    </div>
  );
}

// ---------------- insights ----------------

function InsightCard({
  tone,
  text,
  source,
}: {
  tone: "good" | "warn" | "info";
  text: string;
  source: string;
}) {
  const Icon = tone === "good" ? TrendingUp : tone === "warn" ? TrendingDown : Lightbulb;
  const toneClass =
    tone === "good"
      ? "border-emerald-400/30 bg-emerald-400/5"
      : tone === "warn"
        ? "border-pink/30 bg-pink/5"
        : "border-border bg-background/40";
  const iconColor =
    tone === "good" ? "text-emerald-300" : tone === "warn" ? "text-pink" : "text-blue";
  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${toneClass}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-background/60">
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </span>
      <div>
        <p className="text-sm leading-snug">{text}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{source}</p>
      </div>
    </div>
  );
}
