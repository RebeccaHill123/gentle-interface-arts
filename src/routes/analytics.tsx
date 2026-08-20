import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  ShieldAlert,
  Trophy,
  Clock,
  Lightbulb,
  Lock,
  Info,
  BookOpen,
  Heart,
  AlertTriangle,
} from "lucide-react";
import { getProStatus } from "@/lib/pro-store";
import { loadPlan } from "@/lib/plan-store";
import { loadAnalytics, type AnalyticsBundle, type AttentionItem } from "@/lib/analytics-derive";

export const Route = createFileRoute("/analytics")({
  beforeLoad: async () => {
    const { requireAccess } = await import("@/lib/access-guard");
    await requireAccess();
  },
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Study analytics · Tentra" },
      {
        name: "description",
        content:
          "Honest study analytics: planned vs completed study time, syllabus coverage, graded practice accuracy and consistency — all derived from what you've actually recorded, with sample sizes shown.",
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
      const bundle = await loadAnalytics(stored);
      setData(bundle);
      setLoading(false);
    })();
  }, [navigate]);

  return (
    <TooltipProvider delayDuration={150}>
      <AppShell
        title="Study analytics"
        subtitle="Every number here is derived from what you've actually recorded. Sample sizes and sources are shown throughout — nothing is predicted or invented."
        actions={
          !isPro ? (
            <Button
              asChild
              size="sm"
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
            >
              <Link to="/settings">
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

              {/* On track + Coverage */}
              <section className="mt-6 grid gap-4 md:grid-cols-2">
                <OnTrackCard data={data} />
                <CoverageCard data={data} />
              </section>

              {/* Practice accuracy */}
              <section className="mt-6">
                <AccuracyCard data={data} />
              </section>

              {/* Consistency + Needs attention */}
              <section className="mt-6 grid gap-4 lg:grid-cols-3">
                <Panel
                  title="Consistency"
                  icon={Flame}
                  iconClass="text-orange-400"
                  subtitle={data.consistency.source}
                >
                  <ConsistencyCard data={data} />
                </Panel>
                <div className="lg:col-span-2">
                  <Panel
                    title="Needs attention"
                    icon={ShieldAlert}
                    iconClass="text-pink"
                    subtitle="Evidence-led only — every item below is backed by a graded score, missing coverage, or your own low rating."
                  >
                    <NeedsAttention items={data.needsAttention} />
                  </Panel>
                </div>
              </section>

              {/* Weekly effort + Insights */}
              <section className="mt-6 grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Panel
                    title="Weekly study effort"
                    icon={Clock}
                    subtitle="Minutes actually logged per week vs your weekly target. This measures effort, not performance."
                  >
                    <WeeklyLoadChart load={data.weeklyLoad} />
                  </Panel>
                </div>
                <Panel
                  title="Insights"
                  icon={Lightbulb}
                  subtitle="Generated only when there's enough evidence to back the claim."
                >
                  {data.insights.length ? (
                    <div className="space-y-3">
                      {data.insights.map((i, idx) => (
                        <InsightCard key={idx} {...i} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      icon={Lightbulb}
                      title="No insights yet"
                      body="Log a few more study or practice sessions and we'll surface patterns we're confident about."
                    />
                  )}
                </Panel>
              </section>

              {/* Self-reported quality — clearly secondary */}
              <section className="mt-6">
                <SelfReportedCard data={data} />
              </section>

              <div className="mt-4 flex justify-end">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link to="/coach">
                    Ask Coach for a fix plan <Sparkles className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
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
    <div className="space-y-2">
      <div className="rounded-2xl border border-border bg-card/40 px-4 py-3 text-xs text-muted-foreground backdrop-blur">
        Calculated from{" "}
        <span className="font-semibold text-foreground">{data.totalSessions}</span> recorded
        session{data.totalSessions === 1 ? "" : "s"} ·{" "}
        <span className="font-semibold text-foreground">{Math.round(data.totalLoggedMinutes / 60)}h</span>{" "}
        logged ·{" "}
        <span className="font-semibold text-foreground">{data.graded.totalAttempted}</span> graded
        answer{data.graded.totalAttempted === 1 ? "" : "s"}.
      </div>
      {data.usingLegacyFallback && (
        <div className="flex items-start gap-2 rounded-2xl border border-dashed border-border bg-background/40 px-4 py-2 text-[11px] text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            These metrics are based on this device's saved history until new sessions are
            recorded through the app.
          </span>
        </div>
      )}
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
          Unlock syllabus coverage, graded accuracy, consistency tracking and evidence-led
          attention flags.
        </p>
        <Button
          asChild
          className="mt-4 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
        >
          <Link to="/settings">
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
  action,
}: {
  icon: typeof Sparkles;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-dashed border-border bg-background/40 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/60">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
        {action && <div className="mt-2">{action}</div>}
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

// ---------------- 1. On track this week ----------------

function OnTrackCard({ data }: { data: AnalyticsBundle }) {
  const { onTrack } = data;
  const plannedHours = Math.round((onTrack.plannedMinutes / 60) * 10) / 10;
  const completedHours = Math.round((onTrack.completedMinutes / 60) * 10) / 10;

  return (
    <Panel title="On track this week" icon={Target} subtitle={onTrack.source}>
      {onTrack.plannedMinutes === 0 ? (
        <EmptyState
          icon={Target}
          title="No weekly target set"
          body="Set a weekly study hours target in onboarding to see progress against it."
        />
      ) : (
        <div>
          <div className="flex items-baseline gap-2">
            <span className="bg-gradient-pink-blue bg-clip-text text-4xl font-bold text-transparent">
              {completedHours}h
            </span>
            <span className="text-sm text-muted-foreground">of {plannedHours}h planned</span>
          </div>
          {onTrack.percent !== null && (
            <>
              <div className="mt-3 h-2 w-full rounded-full bg-background/60">
                <div
                  className="h-2 rounded-full bg-gradient-pink-blue transition-all duration-700"
                  style={{ width: `${Math.min(100, onTrack.percent)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{onTrack.percent}% of this week's target</p>
            </>
          )}
        </div>
      )}
    </Panel>
  );
}

// ---------------- 2. Syllabus coverage ----------------

function CoverageCard({ data }: { data: AnalyticsBundle }) {
  const { coverage } = data;
  return (
    <Panel title="Syllabus coverage" icon={BookOpen} subtitle={coverage.source}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold">
            {coverage.subjectsTouched}/{coverage.totalSubjects}
          </p>
          <p className="text-[11px] text-muted-foreground">subjects with study time</p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {coverage.subtopicsTouched}/{coverage.totalSubtopics}
          </p>
          <p className="text-[11px] text-muted-foreground">subtopics with study time</p>
        </div>
      </div>
      {coverage.untouchedSubjects.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-medium text-muted-foreground">Not yet touched</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {coverage.untouchedSubjects.slice(0, 6).map((s) => (
              <span
                key={s}
                className="rounded-full border border-border bg-background/50 px-2 py-1 text-[10px] text-muted-foreground"
              >
                {s}
              </span>
            ))}
            {coverage.untouchedSubjects.length > 6 && (
              <span className="rounded-full border border-border bg-background/50 px-2 py-1 text-[10px] text-muted-foreground">
                +{coverage.untouchedSubjects.length - 6} more
              </span>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---------------- 3. Practice accuracy ----------------

function AccuracyCard({ data }: { data: AnalyticsBundle }) {
  const { graded } = data;

  if (!graded.hasData || graded.accuracy === null) {
    return (
      <Panel title="Practice accuracy" icon={Trophy} iconClass="text-emerald-400">
        <EmptyState
          icon={Trophy}
          title="Not enough practice data yet"
          body={
            graded.hasData
              ? `You have ${graded.totalAttempted} graded answer${graded.totalAttempted === 1 ? "" : "s"} so far — at least 5 are needed before we show an accuracy figure.`
              : "Answer some practice questions, mini-tests or mock questions and your graded accuracy will appear here."
          }
          action={
            <div className="flex gap-2">
              <Button asChild size="sm" className="rounded-full">
                <Link to="/practice">Start practice</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to="/mocks">Try a mock</Link>
              </Button>
            </div>
          }
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="Practice accuracy"
      icon={Trophy}
      iconClass="text-emerald-400"
      subtitle="Graded correct answers only — practice, mini-tests, mocks and flashcard recall. Never self-reported."
    >
      <div className="flex items-baseline gap-2">
        <span className="bg-gradient-pink-blue bg-clip-text text-4xl font-bold text-transparent">
          {graded.accuracy}%
        </span>
        <span className="text-sm text-muted-foreground">n = {graded.totalAttempted}</span>
      </div>

      {graded.trend.length === 2 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {graded.trend[0].label} {graded.trend[0].accuracy}% (n={graded.trend[0].attempted}) →{" "}
          {graded.trend[1].label} {graded.trend[1].accuracy}% (n={graded.trend[1].attempted})
        </p>
      )}

      {graded.perSubject.length > 0 && (
        <div className="mt-4 space-y-2">
          {graded.perSubject.map((s) => (
            <div key={s.subject}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{s.subject}</span>
                <span className="text-muted-foreground">
                  {s.accuracy}% · n = {s.attempted}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-background/60">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-blue transition-all duration-700"
                  style={{ width: `${s.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-border pt-3 text-center text-[11px]">
        <div>
          <p className="font-semibold text-foreground">{graded.bySource.practice}</p>
          <p className="text-muted-foreground">Practice</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{graded.bySource.miniTest}</p>
          <p className="text-muted-foreground">Mini-tests</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{graded.bySource.fullMock}</p>
          <p className="text-muted-foreground">Full mocks</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{graded.bySource.flashcardRecall}</p>
          <p className="text-muted-foreground">Flashcards</p>
        </div>
      </div>
    </Panel>
  );
}

// ---------------- 4. Consistency ----------------

function ConsistencyCard({ data }: { data: AnalyticsBundle }) {
  const { consistency } = data;
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">
          {consistency.studyDays}/{consistency.windowDays}
        </span>
        <span className="text-xs text-muted-foreground">days studied</span>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-background/60">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-orange-400 to-pink transition-all duration-700"
          style={{ width: `${consistency.percent}%` }}
        />
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm">
        <Flame className="h-4 w-4 text-orange-400" />
        <span className="font-semibold">{consistency.currentStreak}</span>
        <span className="text-xs text-muted-foreground">day current streak</span>
      </div>
    </div>
  );
}

// ---------------- 5. Needs attention ----------------

const EVIDENCE_LABELS: Record<AttentionItem["evidence"], string> = {
  "low-graded-accuracy": "Low graded accuracy",
  "no-coverage": "No study time recorded yet",
  "self-rated-low": "You rated this low — no graded evidence yet",
};

function NeedsAttention({ items }: { items: AttentionItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Nothing flagged"
        body="No subjects currently meet the evidence bar for attention — low graded accuracy, missing coverage, or a low self-rating."
      />
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item, idx) => (
        <li
          key={`${item.module}-${idx}`}
          className="flex items-start justify-between gap-3 rounded-2xl border border-pink/30 bg-pink/5 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.module}</p>
            <p className="text-[11px] font-medium text-pink">{EVIDENCE_LABELS[item.evidence]}</p>
            <p className="text-[11px] text-muted-foreground">{item.detail}</p>
          </div>
          {item.sampleSize !== null && (
            <span className="shrink-0 text-[10px] text-muted-foreground">n = {item.sampleSize}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------- 6. Self-reported quality (secondary) ----------------

function SelfReportedCard({ data }: { data: AnalyticsBundle }) {
  const { selfReported } = data;
  return (
    <div className="rounded-3xl border border-dashed border-border bg-background/30 p-5 opacity-90">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background/60">
          <Heart className="h-4 w-4 text-muted-foreground" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground">
            Self-reported session quality
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Based on {selfReported.sessionsRated} session{selfReported.sessionsRated === 1 ? "" : "s"} you rated
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-border bg-card/40 px-3 py-2 text-[11px] text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{selfReported.disclaimer}</span>
      </div>
      {selfReported.sessionsRated > 0 ? (
        <div className="mt-3 grid grid-cols-2 gap-4">
          <div>
            <p className="text-lg font-semibold">
              {selfReported.avgFocusPct === null ? "—" : `${selfReported.avgFocusPct}%`}
            </p>
            <p className="text-[11px] text-muted-foreground">avg self-rated focus</p>
          </div>
          <div>
            <p className="text-lg font-semibold">
              {selfReported.avgMood === null ? "—" : `${selfReported.avgMood}/5`}
            </p>
            <p className="text-[11px] text-muted-foreground">avg self-rated mood</p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Rate your focus and mood at the end of a session to see this.
        </p>
      )}
    </div>
  );
}

// ---------------- charts ----------------

function WeeklyLoadChart({ load }: { load: AnalyticsBundle["weeklyLoad"] }) {
  const target = load[0]?.targetMinutes ?? 0;
  const max = Math.max(target, ...load.map((w) => w.minutes), 60);
  const recentAvg = Math.round(load.slice(-4).reduce((a, x) => a + x.minutes, 0) / 4);
  const last = load[load.length - 1]?.minutes ?? 0;
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
              title={`${w.minutes} min effort · week of ${w.weekStart}`}
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
        <span>
          4-week avg: <span className="font-semibold text-foreground">{recentAvg} min</span>
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
