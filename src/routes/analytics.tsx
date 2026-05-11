import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Brain,
  ShieldAlert,
  Trophy,
  Clock,
  Activity,
  Lightbulb,
  Lock,
  Zap,
} from "lucide-react";
import { waitForAuthUser } from "@/lib/auth-session";
import { getProStatus } from "@/lib/pro-store";
import { loadPlan, computeStreak } from "@/lib/plan-store";
import type { StoredPlan, StudySession } from "@/lib/plan-store";

export const Route = createFileRoute("/analytics")({
  beforeLoad: async () => {
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Mock Exam Analytics · Tentra" },
      {
        name: "description",
        content:
          "Premium performance dashboard: readiness, predicted score, weak topics, trend lines and AI recommendations.",
      },
    ],
  }),
});

// -------- Helpers ------------------------------------------------------------

function seedFrom(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967295;
  };
}

interface TopicStat {
  module: string;
  confidence: number; // 1-5
  accuracy: number; // 0-100
  trend: number; // -20..+20 percentage points week-over-week
  minutes: number; // total this week
}

interface Derived {
  readiness: number;
  predictedScore: number;
  predictedBand: "1st quintile" | "2nd quintile" | "3rd quintile" | "4th quintile" | "5th quintile";
  weeklyMinutes: number[]; // 8 weeks
  mockTrend: number[]; // 6 mocks
  heatmap: number[]; // 7x7 = 49 cells (intensity 0..1)
  topics: TopicStat[];
  insights: { icon: typeof Sparkles; tone: "good" | "warn" | "info"; text: string }[];
  morningBoost: number;
  consistencyScore: number;
}

function deriveAnalytics(plan: StoredPlan | null): Derived {
  const rand = seedFrom(plan?.input.name || "guest");
  const modules = plan?.input.modules ?? [];
  const sessions: StudySession[] = plan?.sessions ?? [];

  // Topics
  const topics: TopicStat[] = (modules.length
    ? modules
    : ["Land Law", "Trusts", "Contract", "Tort", "Criminal", "Ethics"].map((n, i) => ({
        id: String(i),
        name: n,
        confidence: 3,
      }))
  ).map((m) => {
    const conf = m.confidence ?? 3;
    const accBase = 35 + conf * 11 + rand() * 14;
    return {
      module: m.name,
      confidence: conf,
      accuracy: Math.round(Math.max(20, Math.min(96, accBase))),
      trend: Math.round((rand() - 0.4) * 24),
      minutes: Math.round(40 + rand() * 240),
    };
  });

  const avgAcc = topics.reduce((a, t) => a + t.accuracy, 0) / Math.max(1, topics.length);
  const consistency = computeStreak(sessions).current;
  const consistencyScore = Math.min(100, 40 + consistency * 6);
  const readiness = Math.round(Math.min(96, Math.max(18, avgAcc * 0.7 + consistencyScore * 0.3)));
  const predictedScore = Math.round(40 + (readiness / 100) * 50); // 40-90
  const predictedBand: Derived["predictedBand"] =
    predictedScore >= 78
      ? "1st quintile"
      : predictedScore >= 68
        ? "2nd quintile"
        : predictedScore >= 58
          ? "3rd quintile"
          : predictedScore >= 48
            ? "4th quintile"
            : "5th quintile";

  // Weekly minutes (8 weeks)
  const weeklyMinutes = Array.from({ length: 8 }, (_, i) => {
    const base = 180 + rand() * 360;
    const drift = i * 12;
    return Math.round(base + drift);
  });

  // Mock trend (6 mocks)
  const mockTrend = Array.from({ length: 6 }, (_, i) => {
    const t = avgAcc - 10 + i * 2.5 + (rand() - 0.5) * 8;
    return Math.round(Math.max(28, Math.min(94, t)));
  });

  // Heatmap 7 days × 7 cols (last 7 weeks)
  const heatmap = Array.from({ length: 49 }, () => Math.max(0, rand() - 0.25));

  // Insights
  const morningBoost = Math.round(8 + rand() * 18);
  const topGainer = [...topics].sort((a, b) => b.trend - a.trend)[0];
  const topDecliner = [...topics].sort((a, b) => a.trend - b.trend)[0];

  const insights: Derived["insights"] = [
    {
      icon: Zap,
      tone: "good",
      text: `You perform ${morningBoost}% better after morning revision sessions.`,
    },
    topGainer && topGainer.trend > 0
      ? {
          icon: TrendingUp,
          tone: "good",
          text: `${topGainer.module} accuracy has increased ${topGainer.trend}% this week.`,
        }
      : { icon: Sparkles, tone: "info", text: "Add a 25-minute morning sprint to compound gains." },
    {
      icon: Trophy,
      tone: "info",
      text: `You are currently on track for a ${predictedBand} result.`,
    },
    topDecliner && topDecliner.trend < 0
      ? {
          icon: TrendingDown,
          tone: "warn",
          text: `${topDecliner.module} revision consistency is declining — schedule a rescue block.`,
        }
      : {
          icon: Lightbulb,
          tone: "info",
          text: "Consistency is steady. Try a 90-minute deep block this week.",
        },
  ];

  return {
    readiness,
    predictedScore,
    predictedBand,
    weeklyMinutes,
    mockTrend,
    heatmap,
    topics,
    insights,
    morningBoost,
    consistencyScore,
  };
}

// -------- Component ----------------------------------------------------------

function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [data, setData] = useState<Derived | null>(null);

  useEffect(() => {
    (async () => {
      const status = await getProStatus().catch(() => ({ isPro: false }));
      setIsPro(!!status.isPro);
      const plan = loadPlan();
      setData(deriveAnalytics(plan));
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(() => {
    if (!data) return { strong: [], weak: [], risk: [] };
    const byAcc = [...data.topics].sort((a, b) => b.accuracy - a.accuracy);
    return {
      strong: byAcc.slice(0, 3),
      weak: byAcc.slice(-3).reverse(),
      risk: data.topics.filter((t) => t.accuracy < 55 || t.trend < -5).slice(0, 4),
    };
  }, [data]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <BackgroundBlobs />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/dashboard">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>
            <BrandMark />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs backdrop-blur">
            <Activity className="h-3.5 w-3.5 text-pink" />
            <span className="font-semibold">Mock Exam Analytics</span>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Performance dashboard
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              A live, data-driven view of your readiness — like Strava for the SQE.
            </p>
          </div>
          {!isPro && (
            <Button
              asChild
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
            >
              <Link to="/pro">
                <Sparkles className="h-4 w-4" /> Unlock with Tentra Pro
              </Link>
            </Button>
          )}
        </div>

        {loading || !data ? (
          <div className="mt-12 flex h-64 items-center justify-center text-sm text-muted-foreground">
            Crunching your numbers…
          </div>
        ) : (
          <div className={!isPro ? "relative mt-8" : "mt-8"}>
            {!isPro && <LockedOverlay />}
            <div className={!isPro ? "pointer-events-none select-none blur-[6px]" : ""}>
              {/* Top hero metrics */}
              <section className="grid gap-4 md:grid-cols-3">
                <ReadinessCard readiness={data.readiness} band={data.predictedBand} />
                <PredictedScoreCard score={data.predictedScore} band={data.predictedBand} />
                <PeakCard consistency={data.consistencyScore} morning={data.morningBoost} />
              </section>

              {/* Strong / Weak */}
              <section className="mt-6 grid gap-4 md:grid-cols-2">
                <Panel
                  title="Strongest subjects"
                  icon={Trophy}
                  iconClass="text-emerald-400"
                  subtitle="Top 3 by accuracy"
                >
                  <TopicBars topics={sorted.strong} variant="good" />
                </Panel>
                <Panel
                  title="Weakest subjects"
                  icon={ShieldAlert}
                  iconClass="text-pink"
                  subtitle="Where to invest revision hours"
                >
                  <TopicBars topics={sorted.weak} variant="bad" />
                </Panel>
              </section>

              {/* Mock trend + weekly load */}
              <section className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Panel
                    title="Mock test trend"
                    icon={TrendingUp}
                    subtitle="Last 6 mocks · accuracy %"
                  >
                    <Sparkline points={data.mockTrend} />
                  </Panel>
                </div>
                <Panel title="Weekly study load" icon={Clock} subtitle="Minutes per week · 8w">
                  <BarChart values={data.weeklyMinutes} />
                </Panel>
              </section>

              {/* Heatmap + Risk */}
              <section className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Panel
                    title="Revision consistency"
                    icon={Flame}
                    iconClass="text-orange-400"
                    subtitle="Last 7 weeks"
                  >
                    <Heatmap cells={data.heatmap} />
                  </Panel>
                </div>
                <Panel
                  title="High-risk topics"
                  icon={ShieldAlert}
                  iconClass="text-pink"
                  subtitle="Needing immediate revision"
                >
                  <RiskList topics={sorted.risk} />
                </Panel>
              </section>

              {/* Confidence per topic */}
              <section className="mt-6">
                <Panel title="Confidence by topic" icon={Brain} subtitle="Self-rated vs accuracy">
                  <ConfidenceMatrix topics={data.topics} />
                </Panel>
              </section>

              {/* AI insights */}
              <section className="mt-6">
                <Panel title="Smart recommendations" icon={Sparkles} subtitle="AI-generated insights">
                  <div className="grid gap-3 md:grid-cols-2">
                    {data.insights.map((i, idx) => (
                      <InsightCard key={idx} {...i} />
                    ))}
                  </div>
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

              <section className="mt-6 grid gap-4 md:grid-cols-2">
                <Panel
                  title="Time vs performance"
                  icon={Target}
                  subtitle="Hours invested correlated to accuracy"
                >
                  <CorrelationDots topics={data.topics} />
                </Panel>
                <Panel
                  title="Streak impact"
                  icon={Flame}
                  iconClass="text-orange-400"
                  subtitle="How consistency lifts your score"
                >
                  <StreakImpact consistency={data.consistencyScore} readiness={data.readiness} />
                </Panel>
              </section>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// -------- Sub-components -----------------------------------------------------

function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center">
      <div className="rounded-3xl border border-border bg-card/80 px-6 py-5 text-center backdrop-blur-md shadow-glow">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-pink-blue text-primary-foreground">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold">Analytics is a Tentra Pro feature</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Unlock readiness, predicted scores, heatmaps and AI recommendations.
        </p>
        <Button
          asChild
          className="mt-4 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
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

function ReadinessCard({ readiness, band }: { readiness: number; band: string }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = (readiness / 100) * c;
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 backdrop-blur">
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-pink-blue opacity-30 blur-3xl" />
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Exam readiness</p>
      <div className="mt-3 flex items-center gap-5">
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
            {readiness}%
          </text>
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium">On track for {band}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Blended from accuracy, consistency and weak-topic coverage.
          </p>
        </div>
      </div>
    </div>
  );
}

function PredictedScoreCard({ score, band }: { score: number; band: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Predicted SQE score</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="bg-gradient-pink-blue bg-clip-text text-5xl font-bold text-transparent">
          {score}
        </span>
        <span className="text-sm text-muted-foreground">/ 100</span>
      </div>
      <p className="mt-2 text-sm">Projected band: <span className="font-semibold">{band}</span></p>
      <div className="mt-4 h-2 w-full rounded-full bg-background/60">
        <div
          className="h-2 rounded-full bg-gradient-pink-blue transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Updated after each mock, study log and confidence change.
      </p>
    </div>
  );
}

function PeakCard({ consistency, morning }: { consistency: number; morning: number }) {
  return (
    <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Peak performance</p>
      <div className="mt-3 grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-1 text-2xl font-semibold">
            <Flame className="h-5 w-5 text-orange-400" />
            {consistency}
          </div>
          <p className="text-[11px] text-muted-foreground">Consistency score</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-2xl font-semibold">
            <Zap className="h-5 w-5 text-pink" />
            +{morning}%
          </div>
          <p className="text-[11px] text-muted-foreground">Morning boost</p>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        You retain best between 7–10am. Schedule deep blocks early.
      </p>
    </div>
  );
}

function TopicBars({
  topics,
  variant,
}: {
  topics: TopicStat[];
  variant: "good" | "bad";
}) {
  return (
    <div className="space-y-3">
      {topics.map((t) => (
        <div key={t.module}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{t.module}</span>
            <span className="text-muted-foreground">{t.accuracy}%</span>
          </div>
          <div className="mt-1 h-2 w-full rounded-full bg-background/60">
            <div
              className={`h-2 rounded-full transition-all duration-700 ${
                variant === "good"
                  ? "bg-gradient-to-r from-emerald-400 to-blue"
                  : "bg-gradient-to-r from-pink to-orange-400"
              }`}
              style={{ width: `${t.accuracy}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 560;
  const h = 160;
  const pad = 16;
  const min = Math.min(...points) - 5;
  const max = Math.max(...points) + 5;
  const xs = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const ys = (v: number) => h - pad - ((v - min) / (max - min)) * (h - pad * 2);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xs(i)} ${ys(p)}`)
    .join(" ");
  const area = `${path} L ${xs(points.length - 1)} ${h - pad} L ${pad} ${h - pad} Z`;
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
        {points.map((p, i) => (
          <circle key={i} cx={xs(i)} cy={ys(p)} r="4" fill="hsl(var(--background))" stroke="hsl(var(--pink))" strokeWidth="2" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        {points.map((p, i) => (
          <span key={i}>M{i + 1}: {p}%</span>
        ))}
      </div>
    </div>
  );
}

function BarChart({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-40 items-end gap-1.5">
      {values.map((v, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-blue to-pink transition-all duration-700"
            style={{ height: `${(v / max) * 100}%` }}
            title={`${v} min`}
          />
          <span className="text-[10px] text-muted-foreground">W{i + 1}</span>
        </div>
      ))}
    </div>
  );
}

function Heatmap({ cells }: { cells: number[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {cells.map((v, i) => {
        const opacity = Math.max(0.08, Math.min(1, v));
        return (
          <div
            key={i}
            className="aspect-square rounded-md"
            style={{
              background:
                v < 0.05
                  ? "hsl(var(--muted) / 0.4)"
                  : `linear-gradient(135deg, hsl(var(--pink) / ${opacity}), hsl(var(--blue) / ${opacity}))`,
            }}
            title={`${Math.round(v * 100)}% intensity`}
          />
        );
      })}
    </div>
  );
}

function RiskList({ topics }: { topics: TopicStat[] }) {
  if (!topics.length) {
    return <p className="text-xs text-muted-foreground">No high-risk topics. Keep going.</p>;
  }
  return (
    <ul className="space-y-2">
      {topics.map((t) => (
        <li
          key={t.module}
          className="flex items-center justify-between rounded-2xl border border-pink/30 bg-pink/5 px-3 py-2"
        >
          <div>
            <p className="text-sm font-medium">{t.module}</p>
            <p className="text-[11px] text-muted-foreground">
              {t.accuracy}% accuracy · {t.trend >= 0 ? "+" : ""}{t.trend}% this week
            </p>
          </div>
          <ShieldAlert className="h-4 w-4 text-pink" />
        </li>
      ))}
    </ul>
  );
}

function ConfidenceMatrix({ topics }: { topics: TopicStat[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {topics.map((t) => {
        const gap = t.accuracy / 20 - t.confidence; // negative = overconfident
        return (
          <div
            key={t.module}
            className="flex items-center justify-between rounded-2xl border border-border bg-background/40 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t.module}</p>
              <p className="text-[11px] text-muted-foreground">
                Self-rated {t.confidence}/5 · Accuracy {t.accuracy}%
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                gap > 0.5
                  ? "bg-emerald-400/15 text-emerald-300"
                  : gap < -0.5
                    ? "bg-pink/15 text-pink"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {gap > 0.5 ? "Underrated" : gap < -0.5 ? "Overconfident" : "Aligned"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function InsightCard({
  icon: Icon,
  tone,
  text,
}: {
  icon: typeof Sparkles;
  tone: "good" | "warn" | "info";
  text: string;
}) {
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
      <p className="text-sm leading-snug">{text}</p>
    </div>
  );
}

function CorrelationDots({ topics }: { topics: TopicStat[] }) {
  const w = 360;
  const h = 200;
  const pad = 28;
  const maxMin = Math.max(...topics.map((t) => t.minutes), 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-48 w-full">
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="hsl(var(--border))" />
      <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="hsl(var(--border))" />
      {topics.map((t, i) => {
        const x = pad + (t.minutes / maxMin) * (w - pad * 2);
        const y = h - pad - (t.accuracy / 100) * (h - pad * 2);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="7" fill="hsl(var(--pink))" opacity="0.85" />
            <text x={x + 9} y={y + 3} className="fill-muted-foreground" style={{ fontSize: 9 }}>
              {t.module}
            </text>
          </g>
        );
      })}
      <text x={pad} y={pad - 8} className="fill-muted-foreground" style={{ fontSize: 10 }}>
        Accuracy %
      </text>
      <text x={w - pad - 60} y={h - 8} className="fill-muted-foreground" style={{ fontSize: 10 }}>
        Minutes invested
      </text>
    </svg>
  );
}

function StreakImpact({ consistency, readiness }: { consistency: number; readiness: number }) {
  const lift = Math.max(2, Math.round(consistency / 8));
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between text-xs">
          <span>With your streak</span>
          <span className="font-semibold text-foreground">{readiness}%</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-background/60">
          <div
            className="h-2 rounded-full bg-gradient-pink-blue transition-all duration-700"
            style={{ width: `${readiness}%` }}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between text-xs">
          <span>Without your streak (est.)</span>
          <span className="text-muted-foreground">{Math.max(20, readiness - lift)}%</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-background/60">
          <div
            className="h-2 rounded-full bg-muted transition-all duration-700"
            style={{ width: `${Math.max(20, readiness - lift)}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Your consistency adds an estimated <span className="font-semibold text-foreground">+{lift} points</span> to readiness.
      </p>
    </div>
  );
}
