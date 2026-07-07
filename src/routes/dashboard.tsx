import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  BookOpen,
  Flame,
  Circle,
  Plus,
  Loader2,
  Check,
  X,
  Play,
  ArrowRight,
  Calendar,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  loadPlan,
  clearPlan,
  pullPlanFromCloud,
  toggleTaskCompletion,
  addStudySession,
  adjustModuleConfidence,
  computeStreak,
  todayKey,
  type StoredPlan,
} from "@/lib/plan-store";
import { deriveAnalytics, READINESS_LABELS, type ReadinessResult } from "@/lib/analytics-derive";
import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";
import { AppShell } from "@/components/app-shell";
import { CommandCentre } from "@/components/dashboard/command-centre";
import { getUserExamId, aggregateSubjectMinutes } from "@/lib/topic-map";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";


interface QuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) {
      throw redirect({ to: "/auth", search: { mode: "signin" } });
    }
  },
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Your dashboard · Tentra" },
      { name: "description", content: "Your personalised adaptive study dashboard." },
    ],
  }),
});

type DashboardTab = "week" | "mastery";

function DashboardPage() {
  const navigate = useNavigate();
  const [stored, setStored] = useState<StoredPlan | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState<DashboardTab>("week");
  const [quizTask, setQuizTask] = useState<{
    index: number;
    title: string;
    module: string;
    minutes: number;
  } | null>(null);

  // Hydrate plan from cloud on mount; redirect to onboarding if user has none.
  useEffect(() => {
    let active = true;
    (async () => {
      const cloud = await pullPlanFromCloud();
      if (!active) return;
      const fallback = cloud ?? loadPlan();
      if (fallback) {
        setStored(fallback);
        setHydrating(false);
      } else {
        // No plan saved for this account — send them through onboarding.
        navigate({ to: "/onboarding", replace: true });
        return;
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  // Re-read local cache when tick changes (e.g. after task toggle)
  useEffect(() => {
    if (tick === 0) return;
    setStored(loadPlan());
  }, [tick]);

  const analytics = useMemo(
    () => (stored ? deriveAnalytics(stored) : null),
    [stored],
  );

  if (hydrating || !stored || !analytics) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { input, plan, completedTaskIds, sessions } = stored;
  // Compute live so it stays in sync with the AI coach (stored value is a snapshot from onboarding).
  const daysUntilExam = input.examDate
    ? Math.max(0, Math.round((new Date(input.examDate).getTime() - Date.now()) / 86_400_000))
    : stored.daysUntilExam;
  const completed = completedTaskIds.length;
  const totalToday = plan.todayTasks.length;
  const progress = totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0;
  const streak = computeStreak(sessions);
  const readiness = analytics.readiness;

  // Weekly progress (rolling 7 days)
  const weeklyTargetMins = (input.hoursPerWeek ?? 0) * 60;
  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const weekSessions = (sessions ?? []).filter(
    (s) => new Date(s.loggedAt).getTime() >= sevenDaysAgo,
  );
  const weeklyDoneMins = weekSessions.reduce((a, s) => a + s.minutes, 0);
  const weeklyPct =
    weeklyTargetMins > 0
      ? Math.min(100, Math.round((weeklyDoneMins / weeklyTargetMins) * 100))
      : 0;
  const weeklyRemainingMins = Math.max(0, weeklyTargetMins - weeklyDoneMins);
  const activeDays = new Set(weekSessions.map((s) => s.date)).size;
  const blocksPlanned = plan.todayTasks.length;
  const blocksDone = completedTaskIds.length;
  const plannedMins = plan.todayTasks.reduce((a, t) => a + t.minutes, 0);
  const completedPlannedMins = plan.todayTasks.reduce(
    (a, t, i) => (completedTaskIds.includes(String(i)) ? a + t.minutes : a),
    0,
  );

  const handleToggle = (i: number) => {
    const done = completedTaskIds.includes(String(i));
    if (done) {
      // Un-complete without quiz
      toggleTaskCompletion(i);
      setTick((t) => t + 1);
      return;
    }
    // Open quiz before marking complete
    const task = plan.todayTasks[i];
    setQuizTask({ index: i, ...task });
  };

  const handleQuizComplete = (accuracy: number, minutesSpent: number) => {
    if (!quizTask) return;
    toggleTaskCompletion(quizTask.index);
    adjustModuleConfidence(quizTask.module, accuracy);
    addStudySession({
      date: todayKey(),
      minutes: minutesSpent,
      module: quizTask.module,
      note: `Mini-assessment: ${Math.round(accuracy * 100)}% (${quizTask.title})`,
    });
    setQuizTask(null);
    setTick((t) => t + 1);
  };

  const refresh = () => setTick((t) => t + 1);

  const nextTaskIdx = plan.todayTasks.findIndex(
    (_, i) => !completedTaskIds.includes(String(i)),
  );
  const nextTask = nextTaskIdx >= 0 ? plan.todayTasks[nextTaskIdx] : null;
  const upNextItems = plan.todayTasks
    .map((t, i) => ({ t, i, done: completedTaskIds.includes(String(i)) }))
    .filter((x) => !x.done)
    .slice(0, 3);
  const currentWeek = plan.weeklyFocus?.[0];

  return (
    <AppShell
      title="Dashboard"
      subtitle="Your calm command centre."
      actions={
        <RecordSessionDialog
          moduleNames={input.modules.map((m) => m.name)}
          onSessionLogged={refresh}
          todayTasks={plan.todayTasks}
        />
      }
    >
      <div className="space-y-8">
        <CommandCentre
          userName={input.name}
          examId={getUserExamId(input.examType)}
          subjectMinutes={aggregateSubjectMinutes(sessions ?? [])}
          onReviewWeak={() => navigate({ to: "/topics" })}
          onStartPriority={() => navigate({ to: "/focus" })}
          onStartFocus={() => navigate({ to: "/focus" })}
          onStartDiagnostic={() => navigate({ to: "/practice" })}
          onStartItem={() => {
            if (nextTaskIdx >= 0) handleToggle(nextTaskIdx);
            else navigate({ to: "/focus" });
          }}
        />

        <MetricsRow
          daysUntilExam={daysUntilExam}
          readinessScore={readiness?.score ?? null}
          streak={streak}
          weeklyPct={weeklyPct}
          weeklyDoneMins={weeklyDoneMins}
          weeklyTargetMins={weeklyTargetMins}
        />
      </div>

      {quizTask && (
        <QuizDialog
          task={quizTask}
          examType={input.examType}
          confidence={
            input.modules.find((m) => m.name === quizTask.module)?.confidence ?? 3
          }
          onClose={() => setQuizTask(null)}
          onComplete={handleQuizComplete}
        />
      )}
    </AppShell>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-base font-medium text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground/80">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function TodaysPlanCard({
  name,
  currentWeekLabel,
  plannedMins,
  completedPlannedMins,
  blocksDone,
  blocksPlanned,
  nextTask,
  moduleNames,
  todayTasks,
  onSessionLogged,
}: {
  name: string;
  currentWeekLabel: string;
  plannedMins: number;
  completedPlannedMins: number;
  blocksDone: number;
  blocksPlanned: number;
  nextTask: { title: string; module: string; minutes: number } | null;
  moduleNames: string[];
  todayTasks: { title: string; module: string; minutes: number }[];
  onSessionLogged: () => void;
}) {
  const fmtH = (m: number) => {
    if (m < 60) return `${m}m`;
    const h = m / 60;
    return `${h.toFixed(1).replace(/\.0$/, "")}h`;
  };
  const pct =
    plannedMins > 0 ? Math.round((completedPlannedMins / plannedMins) * 100) : 0;
  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card p-6 md:p-8 shadow-card">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-pink-blue opacity-[0.08] blur-3xl" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground/80">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2.5 py-1">
              <Calendar className="h-3 w-3" /> {currentWeekLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2.5 py-1">
              {fmtH(plannedMins)} planned today
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2.5 py-1">
              {blocksDone}/{blocksPlanned} blocks done
            </span>
          </div>
          <div>
            <h2 className="text-xl font-medium text-foreground md:text-2xl">
              Today's plan, {name.split(" ")[0]}.
            </h2>
            {nextTask ? (
              <p className="mt-1.5 text-sm text-muted-foreground">
                Next up:{" "}
                <span className="text-foreground/90">{nextTask.title}</span>{" "}
                · {nextTask.module} · {nextTask.minutes}m
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">
                You've cleared today's plan. Stretch, review, or rest.
              </p>
            )}
            {plannedMins > 0 && (
              <div className="mt-4 h-1 w-full max-w-xs overflow-hidden rounded-full bg-foreground/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-pink-blue transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch md:gap-2">
          <Button
            asChild
            size="sm"
            className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
          >
            <Link to="/focus">
              <Play className="h-4 w-4" /> Start focus block
            </Link>
          </Button>
          <RecordSessionDialog
            moduleNames={moduleNames}
            onSessionLogged={onSessionLogged}
            todayTasks={todayTasks}
            variant="secondary"
            label="Log session"
          />
        </div>
      </div>
    </section>
  );
}

function MetricsRow({
  daysUntilExam,
  readinessScore,
  streak,
  weeklyPct,
  weeklyDoneMins,
  weeklyTargetMins,
}: {
  daysUntilExam: number;
  readinessScore: number | null;
  streak: { current: number; longest: number; studiedToday: boolean };
  weeklyPct: number;
  weeklyDoneMins: number;
  weeklyTargetMins: number;
}) {
  const doneH = (weeklyDoneMins / 60).toFixed(1).replace(/\.0$/, "");
  const targetH = Math.round(weeklyTargetMins / 60);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <MetricCard
        label="Exam in"
        value={String(daysUntilExam)}
        sub="days"
        icon={<Calendar className="h-3.5 w-3.5" />}
        accent="pink"
      />
      <MetricCard
        label="Readiness"
        value={readinessScore !== null ? `${readinessScore}` : "—"}
        sub={readinessScore !== null ? "/ 100" : "log 3+ sessions"}
        icon={<Target className="h-3.5 w-3.5" />}
        accent="violet"
      />
      <MetricCard
        label="Streak"
        value={String(streak.current)}
        sub={streak.studiedToday ? "active today" : streak.current > 0 ? "log to keep" : "start today"}
        icon={
          <Flame
            className="h-3.5 w-3.5"
            fill={streak.studiedToday ? "currentColor" : "none"}
          />
        }
        accent={streak.studiedToday ? "pink" : "muted"}
      />
      <MetricCard
        label="This week"
        value={`${weeklyPct}%`}
        sub={`${doneH}/${targetH}h`}
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        accent="cyan"
        progress={weeklyPct}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  accent,
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: "pink" | "violet" | "cyan" | "muted";
  progress?: number;
}) {
  const accentBg =
    accent === "pink"
      ? "bg-pink/[0.06] text-pink/90"
      : accent === "violet"
        ? "bg-violet-500/[0.07] text-violet-400/90"
        : accent === "cyan"
          ? "bg-cyan/[0.07] text-cyan/90"
          : "bg-foreground/[0.04] text-muted-foreground";
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-4 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
          {label}
        </span>
        <span className={`grid h-6 w-6 place-items-center rounded-full ${accentBg}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-2xl text-foreground">{value}</span>
        {sub && <span className="text-[11px] text-muted-foreground/80">{sub}</span>}
      </div>
      {typeof progress === "number" && (
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-pink-blue transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function WeekFocusAccordion({
  allocations,
}: {
  allocations: {
    module: string;
    hours: number;
    rationale: string;
    note: string;
    subtopics?: string[];
    method?: string;
    outcome?: string;
  }[];
}) {
  const total = Math.max(1, allocations.reduce((acc, a) => acc + a.hours, 0));
  return (
    <div
      role="region"
      aria-label="This week focus by module"
      className="rounded-2xl border border-border/40 bg-card shadow-card"
    >
      <Accordion type="single" collapsible className="divide-y divide-border/40">
        {allocations.map((a) => {
          const pct = Math.round((a.hours / total) * 100);
          const meta = RATIONALE_META[a.rationale];
          const slug = a.module.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
          const itemId = `week-focus-${slug}`;
          const triggerLabel = `${a.module}, ${a.hours} hours, ${pct}% of week${meta ? `, ${meta.label}` : ""}. Expand to see focus subtopics and approach.`;
          return (
            <AccordionItem
              key={a.module}
              value={a.module}
              id={itemId}
              className="border-b-0 px-5"
            >
              <AccordionTrigger aria-label={triggerLabel} className="hover:no-underline py-4">
                <div className="flex flex-1 items-center justify-between gap-4 pr-3">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-medium text-foreground">
                      {a.module}
                    </div>
                    <div aria-hidden="true" className="mt-0.5 flex items-center gap-2">
                      {meta && (
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}>
                          {meta.label}
                        </span>
                      )}
                      <span className="text-[11px] text-muted-foreground/70">
                        {a.hours}h · {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-5 text-xs text-muted-foreground/85">
                <dl className="space-y-3">
                  <div>
                    <dt className="inline font-medium text-foreground/80">Why this week: </dt>
                    <dd className="inline">{a.note}</dd>
                  </div>
                  {a.subtopics && a.subtopics.length > 0 && (
                    <div>
                      <h4 className="sr-only">Focus subtopics</h4>
                      <div
                        aria-hidden="true"
                        className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70"
                      >
                        Focus subtopics
                      </div>
                      <ul role="list" className="mt-1.5 flex flex-wrap gap-1.5">
                        {a.subtopics.slice(0, 4).map((s) => (
                          <li
                            key={s}
                            className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {a.method && (
                    <div>
                      <dt className="inline font-medium text-foreground/80">Suggested approach: </dt>
                      <dd className="inline">{a.method}</dd>
                    </div>
                  )}
                  {a.outcome && (
                    <div>
                      <dt className="inline font-medium text-foreground/80">Outcome: </dt>
                      <dd className="inline">{a.outcome}</dd>
                    </div>
                  )}
                </dl>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}


function UpNextBlock({
  task,
  onClick,
}: {
  task: import("@/lib/plan-store").StrategyTask;
  onClick: () => void;
}) {
  const priority = task.bucket ?? (task.priority === "high" ? "must" : task.priority === "low" ? "optional" : "should");
  const meta = BUCKET_META[priority];
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group flex h-full w-full flex-col items-stretch gap-3 rounded-2xl border border-border/40 bg-card p-4 text-left shadow-card transition-all hover:border-pink/30 hover:shadow-glow"
      >
        <div className="flex items-start justify-between gap-3">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>
            {meta.label.replace(" this week", "")}
          </span>
          <span
            aria-label="Mark complete"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-muted-foreground/30 text-muted-foreground transition-colors group-hover:border-pink group-hover:text-pink"
          >
            <Check className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={3} />
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {task.title}
          </p>
          <p className="text-[11px] text-muted-foreground/80">{task.module}</p>
        </div>
        <div className="flex items-center justify-between border-t border-border/40 pt-3 text-[11px] text-muted-foreground/80">
          <span>{task.minutes}m</span>
          {task.taskType && <span>{TYPE_LABELS[task.taskType] ?? task.taskType}</span>}
        </div>
      </button>
    </li>
  );
}

function MiniRoadmap({
  weeks,
}: {
  weeks: import("@/lib/plan-store").WeeklyFocusEntry[];
}) {
  const [openWeek, setOpenWeek] = useState<number>(weeks[0]?.week ?? 1);
  const limited = weeks.slice(0, 6);
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-2 shadow-card">
      <ol className="divide-y divide-border/40">
        {limited.map((w, i) => {
          const isActive = i === 0;
          const isOpen = openWeek === w.week;
          return (
            <li key={w.week}>
              <button
                type="button"
                onClick={() => setOpenWeek(isOpen ? -1 : w.week)}
                className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-foreground/[0.02]"
              >
                <div
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                    isActive
                      ? "bg-gradient-pink-blue text-primary-foreground"
                      : "bg-foreground/[0.05] text-muted-foreground"
                  }`}
                >
                  {w.week}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {w.theme}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-pink/10 px-1.5 py-0.5 text-[10px] font-medium text-pink/90">
                        This week
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                    {w.hours}h · {w.modules.slice(0, 2).join(", ")}
                    {w.modules.length > 2 ? ` +${w.modules.length - 2}` : ""}
                  </div>
                </div>
                <ArrowRight
                  className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
              </button>
              {isOpen && (
                <div className="space-y-2 px-14 pb-4 pt-1 text-xs text-muted-foreground/85">
                  {w.reason && (
                    <p>
                      <span className="font-medium text-foreground/80">Why this week: </span>
                      {w.reason}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {w.modules.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}


function ReadinessCard({ readiness }: { readiness: ReadinessResult | null }) {
  const score = readiness?.score ?? null;
  const circumference = 2 * Math.PI * 32;
  const dash = score !== null ? (score / 100) * circumference : 0;
  const band =
    score === null
      ? "Locked"
      : score >= 80
        ? "Strong"
        : score >= 65
          ? "On track"
          : score >= 50
            ? "Building"
            : "Below pass";
  const topDrivers = readiness
    ? (Object.keys(readiness.breakdown) as (keyof typeof readiness.breakdown)[])
        .filter((k) => readiness.weights[k] > 0 && readiness.breakdown[k] !== null)
        .sort((a, b) => (readiness.breakdown[a] as number) - (readiness.breakdown[b] as number))
        .slice(0, 2)
    : [];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-2xl bg-foreground/[0.025] p-5 cursor-help">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
            Readiness
          </div>
          <div className="relative mt-2 grid h-20 w-20 place-items-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
              <defs>
                <linearGradient id="readiness-ring" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.78 0.18 160)" />
                  <stop offset="100%" stopColor="oklch(0.62 0.22 250)" />
                </linearGradient>
              </defs>
              <circle cx="40" cy="40" r="32" fill="none" stroke="oklch(0.5 0.05 285 / 0.12)" strokeWidth="4" />
              {score !== null && (
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  fill="none"
                  stroke="url(#readiness-ring)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                />
              )}
            </svg>
            <div className="text-center">
              <div className="font-display text-2xl text-foreground">
                {score !== null ? `${score}` : "—"}
              </div>
              <div className="text-[9px] tracking-wider text-muted-foreground/80">
                {score !== null ? band : "log 3+"}
              </div>
            </div>
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px]">
        {score === null ? (
          <p className="text-xs">
            Predicted readiness unlocks after 3 logged sessions. It blends completion vs target,
            weak-area confidence and review outcomes (mocks &amp; quizzes).
          </p>
        ) : (
          <div className="space-y-1.5 text-xs">
            <p className="font-medium">Predicted exam readiness: {score}%</p>
            <p className="text-muted-foreground">
              Weighted blend of completion, weak areas and review accuracy.
            </p>
            {topDrivers.length > 0 && (
              <p className="text-muted-foreground">
                Pulling you down:{" "}
                {topDrivers
                  .map((k) => `${READINESS_LABELS[k]} (${Math.round(readiness!.breakdown[k] as number)}%)`)
                  .join(", ")}
              </p>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}


function StreakCard({
  streak,
}: {
  streak: { current: number; longest: number; studiedToday: boolean; totalMinutesToday: number };
}) {
  const active = streak.studiedToday;
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 ${
        active ? "bg-pink/[0.06]" : "bg-foreground/[0.025]"
      }`}
    >
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
        Streak
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <div className="flex items-center gap-1.5">
          <Flame
            className={`h-6 w-6 ${active ? "text-pink/90" : "text-muted-foreground/60"}`}
            fill={active ? "currentColor" : "none"}
          />
          <span className="font-display text-4xl text-foreground">
            {streak.current}
          </span>
        </div>
        <span className="text-xs text-muted-foreground/80">
          {streak.current === 1 ? "day" : "days"}
        </span>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground/80">
        {active
          ? `${streak.totalMinutesToday}m logged today`
          : streak.current > 0
            ? "Log today to keep it alive"
            : "Log a session to start"}
      </div>
      {streak.longest > streak.current && (
        <div className="mt-1 text-[10px] text-muted-foreground/70">
          Best: {streak.longest}
        </div>
      )}
    </div>
  );
}

function CountdownRing({ days }: { days: number }) {
  const max = 180;
  const pct = Math.min(1, days / max);
  const circumference = 2 * Math.PI * 32;
  const dash = circumference * pct;
  return (
    <div className="rounded-2xl bg-foreground/[0.025] p-5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
        Exam in
      </div>
      <div className="relative mt-2 grid h-20 w-20 place-items-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
          <defs>
            <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.24 350)" />
              <stop offset="100%" stopColor="oklch(0.62 0.22 250)" />
            </linearGradient>
          </defs>
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            stroke="oklch(0.5 0.05 285 / 0.12)"
            strokeWidth="4"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            stroke="url(#ring)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="text-center">
          <div className="font-display text-2xl text-foreground">{days}</div>
          <div className="text-[9px] tracking-wider text-muted-foreground/80">
            days
          </div>
        </div>
      </div>
    </div>
  );
}

function MasteryHeatmap({ stored }: { stored: StoredPlan }) {
  const [expanded, setExpanded] = useState(false);

  // Build a heatmap: each module gets a row of 14 cells representing weeks ahead.
  // Cells get warmer as confidence target rises and as the week approaches the exam.
  const rows = useMemo(() => {
    return stored.input.modules.map((m) => {
      const target =
        stored.plan.masteryTargets.find((t) => t.module === m.name)
          ?.targetConfidence ?? 5;
      return {
        name: m.name,
        current: m.confidence,
        target,
        cells: Array.from({ length: 14 }, (_, w) => {
          const progress = m.confidence + ((target - m.confidence) * (w + 1)) / 14;
          return Math.max(0, Math.min(1, progress / 5));
        }),
      };
    });
  }, [stored]);

  const visibleRows = expanded ? rows : rows.slice(0, 5);
  const hiddenCount = rows.length - 5;

  // Legend swatches showing the confidence ramp
  const legendStops = [0.15, 0.35, 0.55, 0.75, 1];

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Confidence:</span>
          <span>Low</span>
          <div className="flex gap-0.5">
            {legendStops.map((v) => (
              <div
                key={v}
                className="h-4 w-5 rounded-sm"
                style={{
                  background: `linear-gradient(135deg, oklch(0.72 0.24 350 / ${v}), oklch(0.62 0.22 250 / ${v}))`,
                  border: "1px solid oklch(1 0 0 / 0.05)",
                }}
              />
            ))}
          <span className="ml-1">High</span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Each cell = 1 week (next 14 weeks)
        </div>
      </div>

      <div className="grid grid-cols-[140px_1fr_70px] items-center gap-3 px-1 text-sm font-semibold text-foreground">
        <div>Module</div>
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          14 weeks →
        </div>
        <div className="text-right">Target</div>
      </div>

      {visibleRows.map((r) => (
        <div
          key={r.name}
          className="grid grid-cols-[140px_1fr_70px] items-center gap-3"
        >
          <div className="truncate text-xs font-medium text-foreground">
            {r.name}
          </div>
          <div className="flex gap-1">
            {r.cells.map((v, i) => (
              <div
                key={i}
                className="h-6 flex-1 rounded-md transition-transform hover:scale-110"
                title={`Week ${i + 1}: ${(v * 5).toFixed(1)}/5`}
                style={{
                  background: `linear-gradient(135deg, oklch(0.72 0.24 350 / ${v}), oklch(0.62 0.22 250 / ${v}))`,
                  border: "1px solid oklch(1 0 0 / 0.05)",
                }}
              />
            ))}
          </div>
          <div className="text-right text-xs">
            <span className="text-muted-foreground">{r.current}</span>
            <span className="mx-1 text-muted-foreground">→</span>
            <span className="font-semibold text-pink">{r.target}</span>
          </div>
        </div>
      ))}

      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 w-full rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-pink/40 hover:bg-card"
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more module${hiddenCount === 1 ? "" : "s"}`}
        </button>
      )}
    </div>
  );
}

function NoPlanState() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-card">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-pink-blue shadow-glow">
          <BookOpen className="h-6 w-6 text-primary-foreground" />
        </div>
        <h1 className="mt-5 text-3xl font-normal text-foreground">
          No plan yet
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell Tentra your exam date and confidence levels and we'll build your
          personalised study plan.
        </p>
        <Button
          asChild
          className="mt-6 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
        >
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}

const RATIONALE_META: Record<string, { label: string; cls: string; dot: string }> = {
  "high-yield": { label: "High yield", cls: "bg-pink/8 text-pink/85", dot: "bg-pink" },
  "weak-area": { label: "Weak area", cls: "bg-destructive/8 text-destructive/85", dot: "bg-destructive" },
  "recency-gap": { label: "Refresh", cls: "bg-amber-500/8 text-amber-500/85", dot: "bg-amber-400" },
  "mixed-practice": { label: "Mixed practice", cls: "bg-cyan/8 text-cyan/85", dot: "bg-cyan" },
  "mock-prep": { label: "Mock recovery", cls: "bg-violet-500/8 text-violet-400/85", dot: "bg-violet-400" },
  "ethics-cornerstone": { label: "Ethics", cls: "bg-emerald-500/8 text-emerald-500/85", dot: "bg-emerald-400" },
};

const TYPE_LABELS: Record<string, string> = {
  "timed-sba": "Timed practice",
  "mistake-review": "Mistake review",
  "scenario-drill": "Scenario drill",
  "active-recall": "Active recall",
  "mixed-mock": "Mixed mock",
  "concept-deepdive": "Deep dive",
  "ethics-application": "Exam technique",
};

function RationaleChip({ rationale }: { rationale: string }) {
  const meta = RATIONALE_META[rationale] ?? { label: rationale, cls: "bg-muted text-muted-foreground" };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function TypeChip({ type }: { type: string }) {
  const label = TYPE_LABELS[type] ?? type;
  return (
    <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground">
      {label}
    </span>
  );
}

function WeeklyProgressPanel({
  doneMins,
  targetMins,
  remainingMins,
  pct,
  activeDays,
  blocksDone,
  blocksPlanned,
  plannedMins,
  completedPlannedMins,
  streak,
}: {
  doneMins: number;
  targetMins: number;
  remainingMins: number;
  pct: number;
  activeDays: number;
  blocksDone: number;
  blocksPlanned: number;
  plannedMins: number;
  completedPlannedMins: number;
  streak: { current: number; longest: number; studiedToday: boolean };
}) {
  const fmtH = (m: number) => {
    const h = m / 60;
    return h >= 10 ? `${Math.round(h)}h` : `${h.toFixed(1).replace(/\.0$/, "")}h`;
  };
  const onTrack = pct >= Math.round(((new Date().getDay() || 7) / 7) * 100) - 10;
  return (
    <section className="rounded-3xl bg-card p-8 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-medium text-foreground">Weekly progress</h2>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Flexible — study any day. {onTrack ? "You're on track." : "Slight catch-up needed."}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${
            onTrack ? "bg-emerald-500/8 text-emerald-500/85" : "bg-amber-500/8 text-amber-500/85"
          }`}
        >
          {onTrack ? "On track" : "Catch up"}
        </span>
      </div>

      <div className="mt-7 grid grid-cols-3 gap-6">
        <Stat label="Done" value={fmtH(doneMins)} sub={`of ${fmtH(targetMins)}`} accent />
        <Stat label="Remaining" value={fmtH(remainingMins)} sub="this week" />
        <Stat label="Active days" value={`${activeDays}/7`} sub={`${streak.current}d streak`} />
      </div>

      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground/80">
          <span>Hours toward weekly target</span>
          <span className="text-foreground">{pct}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-pink-blue transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium text-muted-foreground/80">
        {label}
      </div>
      <div
        className={`mt-1.5 font-display text-2xl ${
          accent ? "text-gradient-tentra" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground/70">{sub}</div>}
    </div>
  );
}

function AllocationBars({
  allocations,
}: {
  allocations: {
    module: string;
    hours: number;
    rationale: string;
    note: string;
    subtopics?: string[];
    method?: string;
    outcome?: string;
  }[];
}) {
  const total = Math.max(1, allocations.reduce((acc, a) => acc + a.hours, 0));
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <div className="text-xs text-muted-foreground/80">
          {allocations.length} modules · {total}h allocated this week
        </div>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        {allocations.map((a) => {
          const pct = (a.hours / total) * 100;
          const colour = RATIONALE_META[a.rationale]?.cls ?? "bg-muted";
          return (
            <div
              key={a.module}
              className={`${colour} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${a.module} · ${a.hours}h · ${a.rationale}`}
            />
          );
        })}
      </div>
      <ul className="divide-y divide-border/40">
        {allocations.map((a) => {
          const pct = Math.round((a.hours / total) * 100);
          return (
            <li
              key={a.module}
              className="flex items-start gap-4 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{a.module}</span>
                  <RationaleChip rationale={a.rationale} />
                </div>
                <p className="text-[11px] text-muted-foreground/80">
                  <span className="font-medium text-foreground/80">Why this week: </span>
                  {a.note}
                </p>
                {a.subtopics && a.subtopics.length > 0 && (
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
                      Focus subtopics
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {a.subtopics.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {a.method && (
                  <p className="text-[11px] text-muted-foreground/80">
                    <span className="font-medium text-foreground/80">Suggested approach: </span>
                    {a.method}
                  </p>
                )}
                {a.outcome && (
                  <p className="text-[11px] text-muted-foreground/80">
                    <span className="font-medium text-foreground/80">Outcome: </span>
                    {a.outcome}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-medium text-foreground">{a.hours}h</div>
                <div className="text-[10px] text-muted-foreground/70">{pct}%</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const BUCKET_META: Record<string, { label: string; sub: string; cls: string }> = {
  must: { label: "Must do this week", sub: "Highest-yield priorities", cls: "bg-pink/10 text-pink/90" },
  should: { label: "Should do this week", sub: "Strengthens the week", cls: "bg-cyan/10 text-cyan/90" },
  optional: { label: "Optional stretch", sub: "Catch-up or extension", cls: "bg-foreground/[0.05] text-muted-foreground" },
};

const DIFFICULTY_LABEL: Record<string, string> = {
  foundational: "Foundational",
  core: "Core",
  challenging: "Challenging",
};

function BlockGroups({
  tasks,
  completedTaskIds,
  onToggle,
}: {
  tasks: import("@/lib/plan-store").StrategyTask[];
  completedTaskIds: string[];
  onToggle: (i: number) => void;
}) {
  const indexed = tasks.map((t, i) => ({ t, i }));
  const groups: Array<{ key: "must" | "should" | "optional" }> = [
    { key: "must" }, { key: "should" }, { key: "optional" },
  ];
  const fallbackBucket = (t: import("@/lib/plan-store").StrategyTask): "must" | "should" | "optional" =>
    t.bucket ?? (t.priority === "high" ? "must" : t.priority === "low" ? "optional" : "should");

  return (
    <div className="space-y-6">
      {groups.map(({ key }) => {
        const items = indexed.filter(({ t }) => fallbackBucket(t) === key);
        if (items.length === 0) return null;
        const meta = BUCKET_META[key];
        const totalMin = items.reduce((acc, x) => acc + x.t.minutes, 0);
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${meta.cls}`}>
                  {meta.label}
                </span>
                <span className="text-[11px] text-muted-foreground/70">{meta.sub}</span>
              </div>
              <span className="text-[11px] text-muted-foreground/70">
                {items.length} block{items.length === 1 ? "" : "s"} · {totalMin}m
              </span>
            </div>
            <ul className="space-y-2">
              {items.map(({ t, i }) => {
                const done = completedTaskIds.includes(String(i));
                return (
                  <li
                    key={i}
                    className={`group flex items-start gap-4 rounded-2xl p-5 transition-colors ${
                      done ? "bg-emerald-400/[0.04]" : "bg-foreground/[0.015] hover:bg-foreground/[0.035]"
                    }`}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={done}
                          aria-label={done ? `Mark "${t.title}" incomplete` : `Mark "${t.title}" complete`}
                          onClick={() => onToggle(i)}
                          className={`relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 outline-none transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-pink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90 ${
                            done
                              ? "border-transparent bg-gradient-pink-blue text-primary-foreground shadow-glow"
                              : "border-muted-foreground/40 bg-background hover:border-pink hover:bg-pink/10"
                          }`}
                        >
                          {done ? (
                            <Check className="h-5 w-5" strokeWidth={3} />
                          ) : (
                            <Check className="h-4 w-4 text-muted-foreground/0 transition-opacity group-hover:text-pink/60 group-hover:opacity-100" strokeWidth={3} />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {done ? "Mark incomplete" : "Mark complete"}
                      </TooltipContent>
                    </Tooltip>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className={`text-sm font-medium leading-snug ${done ? "text-muted-foreground line-through decoration-emerald-400/60" : "text-foreground"}`}>
                        {t.title}
                      </p>
                      <div className={`flex flex-wrap items-center gap-1.5 ${done ? "opacity-60" : ""}`}>
                        <span className="text-[11px] text-muted-foreground">{t.module}</span>
                        {t.rationale && <RationaleChip rationale={t.rationale} />}
                        {t.taskType && <TypeChip type={t.taskType} />}
                        {t.difficulty && (
                          <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground">
                            {DIFFICULTY_LABEL[t.difficulty] ?? t.difficulty}
                          </span>
                        )}
                      </div>
                      {t.subtopic && (
                        <p className={`text-[11px] text-muted-foreground/80 ${done ? "opacity-60" : ""}`}>
                          <span className="font-medium text-foreground/80">Focus subtopic: </span>
                          {t.subtopic}
                        </p>
                      )}
                      {t.why && (
                        <p className={`text-[11px] italic text-muted-foreground/80 ${done ? "opacity-60" : ""}`}>
                          {t.why}
                        </p>
                      )}
                      {t.output && (
                        <p className={`text-[11px] text-muted-foreground/80 ${done ? "opacity-60" : ""}`}>
                          <span className="font-medium text-foreground/80">Outcome: </span>
                          {t.output}
                        </p>
                      )}
                    </div>
                    <span className={`shrink-0 text-sm font-semibold ${done ? "text-emerald-300" : "text-cyan"}`}>
                      {done ? "Done" : `${t.minutes}m`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function WeeklyFocusList({
  weeks,
}: {
  weeks: import("@/lib/plan-store").WeeklyFocusEntry[];
}) {
  return (
    <ol className="divide-y divide-border/40">
      {weeks.slice(0, 6).map((w, i) => {
        const balance = w.balance;
        const items: Array<{ key: string; label: string; value: number; cls: string }> = balance
          ? [
              { key: "review", label: "Review", value: balance.review, cls: "bg-cyan/60" },
              { key: "recall", label: "Recall", value: balance.recall, cls: "bg-pink/60" },
              { key: "practice", label: "Timed practice", value: balance.practice, cls: "bg-violet-400/60" },
              { key: "mistakes", label: "Mistake review", value: balance.mistakes, cls: "bg-amber-400/60" },
            ]
          : [];
        return (
          <li key={w.week} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium text-muted-foreground/80">
                Week {w.week}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[11px] text-muted-foreground/70">{w.hours}h</div>
                {i === 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pink/10 px-2 py-0.5 text-[10px] font-medium text-pink/90">
                    <Flame className="h-2.5 w-2.5" /> this week
                  </span>
                )}
              </div>
            </div>
            <div className="mt-1.5 text-sm font-medium text-foreground">
              {w.theme}
            </div>
            {w.reason && (
              <p className="mt-1.5 text-[11px] text-muted-foreground/80">
                <span className="font-medium text-foreground/80">Why this week? </span>
                {w.reason}
              </p>
            )}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {w.modules.slice(0, 3).map((m) => (
                <span
                  key={m}
                  className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {m}
                </span>
              ))}
            </div>
            {items.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
                  {items.map((b) => (
                    <div
                      key={b.key}
                      className={`${b.cls} transition-all`}
                      style={{ width: `${b.value}%` }}
                      title={`${b.label}: ${b.value}%`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground/70">
                  {items.map((b) => (
                    <span key={b.key} className="inline-flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${b.cls}`} />
                      {b.label} {b.value}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-card p-8 shadow-card">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground/80">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function RecordSessionDialog({
  moduleNames,
  onSessionLogged,
  todayTasks,
  variant = "primary",
  label = "Record session",
}: {
  moduleNames: string[];
  onSessionLogged: () => void;
  todayTasks: { title: string; module: string; minutes: number }[];
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState("30");
  const [moduleName, setModuleName] = useState<string>(moduleNames[0] ?? "");
  const [note, setNote] = useState("");
  const [suggestedIdx, setSuggestedIdx] = useState<string>("__none");

  const applySuggested = (value: string) => {
    setSuggestedIdx(value);
    if (value === "__none") return;
    const task = todayTasks[Number(value)];
    if (!task) return;
    setMinutes(String(task.minutes));
    if (task.module) setModuleName(task.module);
    setNote(task.title);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseInt(minutes, 10);
    if (!m || m <= 0) {
      toast.error("Add a number of minutes");
      return;
    }
    addStudySession({
      date: todayKey(),
      minutes: m,
      module: moduleName || undefined,
      note: note.trim() || undefined,
    });
    toast.success(`Logged ${m} minutes${moduleName ? ` of ${moduleName}` : ""}`);
    setOpen(false);
    setMinutes("30");
    setNote("");
    setSuggestedIdx("__none");
    onSessionLogged();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "primary" ? (
          <Button
            size="sm"
            className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
          >
            <Plus className="h-4 w-4" /> {label}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="rounded-full border border-border/60 bg-background/40 text-foreground hover:bg-foreground/[0.04]"
          >
            <Plus className="h-4 w-4" /> {label}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log a study session</DialogTitle>
          <DialogDescription>
            Track your time to keep your streak going.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {todayTasks.length > 0 && (
            <div className="space-y-2">
              <Label>Suggested activity</Label>
              <Select value={suggestedIdx} onValueChange={applySuggested}>
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder="Pick from today's plan"
                    className="block truncate"
                  />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-3rem)] sm:max-w-[28rem]">
                  <SelectItem value="__none">None — log freely</SelectItem>
                  {todayTasks.map((t, i) => (
                    <SelectItem key={i} value={String(i)}>
                      <span className="block max-w-[22rem] truncate sm:max-w-[24rem]">
                        {t.title} · {t.minutes}m
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Prefills minutes, module, and notes from today's plan.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="minutes">Minutes studied</Label>
            <Input
              id="minutes"
              type="number"
              min={1}
              max={1440}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              autoFocus
            />
          </div>
          {moduleNames.length > 0 && (
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={moduleName} onValueChange={setModuleName}>
                <SelectTrigger>
                  <SelectValue placeholder="Pick a module" />
                </SelectTrigger>
                <SelectContent>
                  {moduleNames.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="note">Notes (optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What did you cover?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
            >
              Save session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuizDialog({
  task,
  examType,
  confidence,
  onClose,
  onComplete,
}: {
  task: { index: number; title: string; module: string; minutes: number };
  examType: "SQE1" | "SQE2" | "UBE" | "MPRE";
  confidence: number;
  onClose: () => void;
  onComplete: (accuracy: number, minutesSpent: number) => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "generate-quiz",
          {
            body: {
              module: task.module,
              topic: task.title,
              examType,
              confidence,
            },
          },
        );
        if (cancelled) return;
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        const qs: QuizQuestion[] = (data?.questions ?? []).filter(
          (q: QuizQuestion) =>
            q && Array.isArray(q.options) && q.options.length === 4,
        );
        if (qs.length === 0) throw new Error("No questions returned");
        setQuestions(qs);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load quiz");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [task.module, task.title, examType, confidence]);

  const total = questions?.length ?? 0;
  const correctCount = useMemo(() => {
    if (!questions) return 0;
    return answers.reduce(
      (acc, a, i) => (a === questions[i]?.correctIndex ? acc + 1 : acc),
      0,
    );
  }, [answers, questions]);
  const accuracy = total > 0 ? correctCount / total : 0;

  const handleSelect = (optionIdx: number) => {
    if (revealed) return;
    const next = [...answers];
    next[current] = optionIdx;
    setAnswers(next);
    setRevealed(true);
  };

  const handleNext = () => {
    if (!questions) return;
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setRevealed(false);
    } else {
      setFinished(true);
    }
  };

  const handleFinish = () => {
    const minutesSpent = Math.max(
      1,
      Math.round((Date.now() - startedAt) / 60000),
    );
    onComplete(accuracy, minutesSpent);
  };

  const q = questions?.[current];
  const selected = answers[current];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mini-assessment · {task.module}</DialogTitle>
          <DialogDescription>
            10 quick questions on{" "}
            <span className="text-foreground">{task.title}</span>. Your score
            adjusts your topic mastery.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-pink" />
            <p className="text-sm">Generating your questions…</p>
          </div>
        )}

        {error && !loading && (
          <div className="space-y-3 py-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {!loading && !error && questions && !finished && q && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Question {current + 1} of {questions.length}
              </span>
              <span>
                {correctCount} correct so far
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-pink-blue transition-all"
                style={{
                  width: `${((current + (revealed ? 1 : 0)) / questions.length) * 100}%`,
                }}
              />
            </div>
            <p className="text-sm font-medium text-foreground">{q.prompt}</p>
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.correctIndex;
                const isPicked = selected === i;
                let cls =
                  "border-border bg-background/40 hover:border-pink/40 hover:bg-card";
                if (revealed) {
                  if (isCorrect)
                    cls = "border-green-500/60 bg-green-500/10 text-foreground";
                  else if (isPicked)
                    cls = "border-destructive/60 bg-destructive/10 text-foreground";
                  else cls = "border-border bg-background/30 text-muted-foreground";
                }
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelect(i)}
                    disabled={revealed}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition-all ${cls}`}
                  >
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-border text-[11px] font-semibold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{opt}</span>
                    {revealed && isCorrect && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {revealed && isPicked && !isCorrect && (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                  </button>
                );
              })}
            </div>
            {revealed && (
              <div className="rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Why: </span>
                {q.explanation}
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!revealed}
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                {current < questions.length - 1 ? "Next" : "See results"}
              </Button>
            </DialogFooter>
          </div>
        )}

        {!loading && !error && finished && questions && (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div>
              <div className="font-display text-4xl text-gradient-tentra">
                {Math.round(accuracy * 100)}%
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {correctCount} / {questions.length} correct
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {accuracy >= 0.8
                ? "Strong work — your mastery for this module will rise."
                : accuracy >= 0.5
                  ? "Solid effort. We'll nudge mastery up slightly."
                  : "Tricky one — we'll lower mastery so the plan focuses here."}
            </p>
            <DialogFooter>
              <Button
                onClick={handleFinish}
                className="w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                Mark task complete
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
