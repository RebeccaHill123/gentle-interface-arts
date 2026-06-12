import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
      { name: "description", content: "Your personalised SQE study dashboard." },
    ],
  }),
});

type DashboardTab = "week" | "mastery";

function DashboardPage() {
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
      if (cloud) {
        setStored(cloud);
      } else {
        // No plan saved for this account — send them through onboarding.
        window.location.replace("/onboarding");
        return;
      }
      setHydrating(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Re-read local cache when tick changes (e.g. after task toggle)
  useEffect(() => {
    if (tick === 0) return;
    setStored(loadPlan());
  }, [tick]);

  if (hydrating || !stored) {
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
  const analytics = useMemo(() => deriveAnalytics(stored), [stored]);
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

  return (
    <AppShell
      title="Dashboard"
      subtitle="Your focus, your plan, your countdown."
      actions={
        <RecordSessionDialog
          moduleNames={input.modules.map((m) => m.name)}
          onSessionLogged={refresh}
          todayTasks={plan.todayTasks}
        />
      }
    >
      <div className="space-y-10">
        <HeroBanner
          name={input.name}
          examType={input.examType}
          daysUntilExam={daysUntilExam}
          overview={plan.overview}
          streak={streak}
          weeklyDoneMins={weeklyDoneMins}
          weeklyTargetMins={weeklyTargetMins}
          weeklyPct={weeklyPct}
          readiness={readiness}
        />


        <div className="flex gap-1 w-fit">
          {([
            { id: "week", label: "This week" },
            { id: "mastery", label: "Mastery" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-foreground/[0.06] text-foreground"
                  : "text-muted-foreground/70 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "week" && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <WeeklyProgressPanel
                doneMins={weeklyDoneMins}
                targetMins={weeklyTargetMins}
                remainingMins={weeklyRemainingMins}
                pct={weeklyPct}
                activeDays={activeDays}
                blocksDone={blocksDone}
                blocksPlanned={blocksPlanned}
                plannedMins={plannedMins}
                completedPlannedMins={completedPlannedMins}
                streak={streak}
              />

              {plan.weeklyStrategy && (
                <Panel
                  title="Weekly study strategy"
                  subtitle={plan.weeklyStrategy.summary}
                >
                  <AllocationBars allocations={plan.weeklyStrategy.allocations} />
                </Panel>
              )}

              <Panel
                title="Adaptive study blocks"
                subtitle="Complete these in any order, on any day this week. Streak counts after one block per day."
              >
                <TooltipProvider delayDuration={200}>
                  <ul className="space-y-2">
                    {plan.todayTasks.map((t, i) => {
                      const done = completedTaskIds.includes(String(i));
                      return (
                        <li
                          key={i}
                          className={`group flex items-start gap-4 rounded-2xl p-5 transition-colors ${
                            done
                              ? "bg-emerald-400/[0.04]"
                              : "bg-foreground/[0.015] hover:bg-foreground/[0.035]"
                          }`}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={done}
                                aria-label={done ? `Mark "${t.title}" incomplete` : `Mark "${t.title}" complete`}
                                onClick={() => handleToggle(i)}
                                className={`relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 outline-none transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-pink/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-90 ${
                                  done
                                    ? "border-transparent bg-gradient-pink-blue text-primary-foreground shadow-glow"
                                    : "border-muted-foreground/40 bg-background hover:border-pink hover:bg-pink/10 hover:shadow-[0_0_0_4px_hsl(var(--pink)/0.12)] hover:scale-105"
                                }`}
                              >
                                {done ? (
                                  <Check className="h-5 w-5 animate-scale-in" strokeWidth={3} />
                                ) : (
                                  <Check className="h-4 w-4 text-muted-foreground/0 transition-opacity group-hover:text-pink/60 group-hover:opacity-100" strokeWidth={3} />
                                )}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              {done ? "Mark incomplete" : "Mark complete"}
                            </TooltipContent>
                          </Tooltip>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium leading-snug transition-all ${
                                done
                                  ? "text-muted-foreground line-through decoration-emerald-400/60"
                                  : "text-foreground"
                              }`}
                            >
                              {t.title}
                            </p>
                            <div className={`mt-1 flex flex-wrap items-center gap-1.5 transition-opacity ${done ? "opacity-60" : ""}`}>
                              <span className="text-[11px] text-muted-foreground">
                                {t.module}
                              </span>
                              {t.rationale && (
                                <RationaleChip rationale={t.rationale} />
                              )}
                              {t.taskType && <TypeChip type={t.taskType} />}
                              {t.priority === "high" && !done && (
                                <span className="rounded-full bg-pink/10 px-2 py-0.5 text-[10px] font-medium text-pink/90">
                                  priority
                                </span>
                              )}
                            </div>
                            {t.why && (
                              <p className={`mt-1.5 text-[11px] italic text-muted-foreground/80 ${done ? "opacity-60" : ""}`}>
                                {t.why}
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 text-sm font-semibold transition-colors ${done ? "text-emerald-300" : "text-cyan"}`}>
                            {done ? "Done" : `${t.minutes}m`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </TooltipProvider>
              </Panel>
            </div>

            <div className="space-y-8">
              <Panel title="Weekly focus" subtitle="Your plan, week by week.">
                <ol className="divide-y divide-border/40">
                  {plan.weeklyFocus.slice(0, 6).map((w, i) => (
                    <li key={w.week} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div className="text-[11px] font-medium text-muted-foreground/80">
                          Week {w.week}
                        </div>
                        <div className="text-[11px] text-muted-foreground/70">
                          {w.hours}h
                        </div>
                      </div>
                      <div className="mt-1.5 text-sm font-medium text-foreground">
                        {w.theme}
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {w.modules.slice(0, 3).map((m) => (
                          <span
                            key={m}
                            className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {m}
                          </span>
                        ))}
                        {i === 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-pink/10 px-2 py-0.5 text-[10px] font-medium text-pink/90">
                            <Flame className="h-2.5 w-2.5" /> this week
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>
            </div>
          </div>
        )}

        {tab === "mastery" && (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Panel
                title="Topic mastery"
                subtitle="Heat shows current confidence. Cooler = needs work."
              >
                <MasteryHeatmap stored={stored} />
              </Panel>
            </div>
            <div>
              <Panel title="Mastery targets">
                <ul className="divide-y divide-border/40">
                  {plan.masteryTargets.slice(0, 8).map((t) => (
                    <li
                      key={t.module}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {t.module}
                        </div>
                        <div className="text-[11px] text-muted-foreground/80">
                          target {t.targetConfidence}/5
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          t.priority === "high"
                            ? "bg-pink/10 text-pink/90"
                            : t.priority === "medium"
                              ? "bg-cyan/10 text-cyan/90"
                              : "bg-foreground/[0.04] text-muted-foreground"
                        }`}
                      >
                        {t.priority}
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        )}
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

function HeroBanner({
  name,
  examType,
  daysUntilExam,
  overview,
  streak,
  weeklyDoneMins,
  weeklyTargetMins,
  weeklyPct,
}: {
  name: string;
  examType: string;
  daysUntilExam: number;
  overview: string;
  streak: { current: number; longest: number; studiedToday: boolean; totalMinutesToday: number };
  weeklyDoneMins: number;
  weeklyTargetMins: number;
  weeklyPct: number;
}) {
  const doneH = (weeklyDoneMins / 60).toFixed(1).replace(/\.0$/, "");
  const targetH = Math.round(weeklyTargetMins / 60);
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-card p-8 md:p-12">
      <div className="absolute inset-0 bg-gradient-hero opacity-40" />
      <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/80">
            {examType} · adaptive plan
          </div>
          <h1 className="mt-3 text-4xl font-normal text-foreground md:text-5xl">
            Welcome back,{" "}
            <span className="text-gradient-tentra inline-block italic pr-2">
              {name}
            </span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-[15px]">{overview}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CountdownRing days={daysUntilExam} />
          <StreakCard streak={streak} />
          <div className="rounded-2xl bg-foreground/[0.025] p-5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
              This week
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="font-display text-4xl text-foreground">
                {weeklyPct}%
              </div>
              <div className="text-xs text-muted-foreground/80">
                {doneH}/{targetH}h
              </div>
            </div>
            <div className="mt-3 h-1 w-32 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-pink-blue transition-all"
                style={{ width: `${weeklyPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
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
          personalised SQE study plan.
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
  allocations: { module: string; hours: number; rationale: string; note: string }[];
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
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{a.module}</span>
                  <RationaleChip rationale={a.rationale} />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground/80">{a.note}</p>
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
}: {
  moduleNames: string[];
  onSessionLogged: () => void;
  todayTasks: { title: string; module: string; minutes: number }[];
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
        <Button
          size="sm"
          className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
        >
          <Plus className="h-4 w-4" /> Record session
        </Button>
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
  examType: "SQE1" | "SQE2";
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
