import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
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
  Home,
  CheckCircle2,
  Calendar,
  Settings,
  Bell,
  Scale,
  TrendingUp,
  Flame,
  BookOpen,
  Target,
  Circle,
  Plus,
} from "lucide-react";
import {
  loadPlan,
  toggleTaskCompletion,
  addStudySession,
  computeStreak,
  todayKey,
  type StoredPlan,
} from "@/lib/plan-store";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Your dashboard · Tentra" },
      { name: "description", content: "Your personalised SQE study dashboard." },
    ],
  }),
});

function DashboardPage() {
  const navigate = useNavigate();
  const [stored, setStored] = useState<StoredPlan | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setStored(loadPlan());
  }, [tick]);

  if (!stored) {
    return <NoPlanState />;
  }

  const { input, plan, daysUntilExam, completedTaskIds, sessions } = stored;
  const completed = completedTaskIds.length;
  const totalToday = plan.todayTasks.length;
  const progress = totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0;
  const streak = computeStreak(sessions);

  const handleToggle = (i: number) => {
    toggleTaskCompletion(i);
    setTick((t) => t + 1);
  };

  const refresh = () => setTick((t) => t + 1);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-6">
        <Sidebar />

        <div className="flex-1 space-y-6">
          <TopBar
            name={input.name}
            onReset={() => navigate({ to: "/onboarding" })}
            moduleNames={input.modules.map((m) => m.name)}
            onSessionLogged={refresh}
          />

          <HeroBanner
            name={input.name}
            examType={input.examType}
            daysUntilExam={daysUntilExam}
            progress={progress}
            completed={completed}
            total={totalToday}
            overview={plan.overview}
            streak={streak}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Panel title="Today's plan" subtitle="Knock these out and you're on track.">
                <ul className="space-y-2">
                  {plan.todayTasks.map((t, i) => {
                    const done = completedTaskIds.includes(String(i));
                    return (
                      <li key={i}>
                        <button
                          onClick={() => handleToggle(i)}
                          className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-background/40 p-4 text-left transition-all hover:border-pink/40 hover:bg-card"
                        >
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground transition-transform group-hover:scale-105">
                            {done ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Circle className="h-5 w-5 opacity-70" />
                            )}
                          </span>
                          <span className="flex-1">
                            <span
                              className={`block font-medium ${
                                done
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              }`}
                            >
                              {t.title}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {t.module}
                            </span>
                          </span>
                          <span className="text-sm font-semibold text-cyan">
                            {t.minutes}m
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Panel>

              <Panel title="Topic mastery" subtitle="Heat shows current confidence. Cooler = needs work.">
                <MasteryHeatmap stored={stored} />
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Weekly focus" subtitle="Your plan, week by week.">
                <ol className="space-y-3">
                  {plan.weeklyFocus.slice(0, 6).map((w, i) => (
                    <li
                      key={w.week}
                      className="rounded-2xl border border-border bg-background/40 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold uppercase tracking-wider text-pink">
                          Week {w.week}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {w.hours}h
                        </div>
                      </div>
                      <div className="mt-1 text-sm font-semibold text-foreground">
                        {w.theme}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {w.modules.slice(0, 3).map((m) => (
                          <span
                            key={m}
                            className="rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                      {i === 0 && (
                        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-pink-blue px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          <Flame className="h-3 w-3" /> This week
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel title="Mastery targets">
                <ul className="space-y-2">
                  {plan.masteryTargets.slice(0, 5).map((t) => (
                    <li
                      key={t.module}
                      className="flex items-center justify-between gap-3 rounded-xl bg-background/40 p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {t.module}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          target {t.targetConfidence}/5
                        </div>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          t.priority === "high"
                            ? "bg-pink/20 text-pink"
                            : t.priority === "medium"
                              ? "bg-cyan/20 text-cyan"
                              : "bg-muted text-muted-foreground"
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
        </div>
      </div>
    </div>
  );
}

function HeroBanner({
  name,
  examType,
  daysUntilExam,
  progress,
  completed,
  total,
  overview,
  streak,
}: {
  name: string;
  examType: string;
  daysUntilExam: number;
  progress: number;
  completed: number;
  total: number;
  overview: string;
  streak: { current: number; longest: number; studiedToday: boolean; totalMinutesToday: number };
}) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-8 md:p-10">
      <div className="absolute inset-0 bg-gradient-hero opacity-80" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-pink">
            {examType} · personalised plan
          </div>
          <h1 className="mt-2 text-4xl font-normal text-foreground md:text-5xl">
            Welcome back,{" "}
            <span className="text-gradient-tentra inline-block italic pr-2">
              {name}
            </span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">{overview}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CountdownRing days={daysUntilExam} />
          <StreakCard streak={streak} />
          <div className="rounded-2xl border border-border bg-background/60 p-5 backdrop-blur">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Today
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <div className="font-display text-4xl text-gradient-tentra">
                {progress}%
              </div>
              <div className="text-xs text-muted-foreground">
                {completed}/{total}
              </div>
            </div>
            <div className="mt-3 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-pink-blue transition-all"
                style={{ width: `${progress}%` }}
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
      className={`relative overflow-hidden rounded-2xl border p-5 backdrop-blur ${
        active
          ? "border-pink/40 bg-gradient-pink-blue/10"
          : "border-border bg-background/60"
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Streak
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <div className="flex items-center gap-1.5">
          <Flame
            className={`h-7 w-7 ${active ? "text-pink" : "text-muted-foreground"}`}
            fill={active ? "currentColor" : "none"}
          />
          <span className="font-display text-4xl text-foreground">
            {streak.current}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {streak.current === 1 ? "day" : "days"}
        </span>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        {active
          ? `${streak.totalMinutesToday}m logged today`
          : streak.current > 0
            ? "Log today to keep it alive"
            : "Log a session to start"}
      </div>
      {streak.longest > streak.current && (
        <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
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
    <div className="rounded-2xl border border-border bg-background/60 p-5 backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Exam in
      </div>
      <div className="relative mt-1 grid h-20 w-20 place-items-center">
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
            stroke="oklch(1 0 0 / 0.1)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r="32"
            fill="none"
            stroke="url(#ring)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
          />
        </svg>
        <div className="text-center">
          <div className="font-display text-2xl text-foreground">{days}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
            days
          </div>
        </div>
      </div>
    </div>
  );
}

function MasteryHeatmap({ stored }: { stored: StoredPlan }) {
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

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[140px_1fr_60px] items-center gap-3 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div>Module</div>
        <div>14 weeks →</div>
        <div className="text-right">Target</div>
      </div>
      {rows.map((r) => (
        <div
          key={r.name}
          className="grid grid-cols-[140px_1fr_60px] items-center gap-3"
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
          className="mt-6 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
        >
          <Link to="/onboarding">Build my plan</Link>
        </Button>
      </div>
    </div>
  );
}

function Sidebar() {
  const items = [
    { icon: Home, label: "Today", active: true },
    { icon: Calendar, label: "Plan" },
    { icon: Target, label: "Mastery" },
    { icon: Scale, label: "Mocks" },
    { icon: Settings, label: "Settings" },
  ];
  return (
    <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-3xl border border-border bg-sidebar p-5 shadow-card md:flex">
      <BrandMark />
      <nav className="mt-8 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                it.active
                  ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {it.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-2xl border border-border bg-background/40 p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-pink" />
          <div className="text-xs font-semibold text-foreground">
            Tentra Pro
          </div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Mock exams, AI feedback & smart re-planning.
        </p>
        <Button size="sm" className="mt-3 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95">
          Upgrade
        </Button>
      </div>
    </aside>
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
    <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function TopBar({
  name,
  onReset,
  moduleNames,
  onSessionLogged,
}: {
  name: string;
  onReset: () => void;
  moduleNames: string[];
  onSessionLogged: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-3 pl-5 backdrop-blur">
      <div className="md:hidden">
        <BrandMark withWordmark={false} />
      </div>
      <div className="hidden text-sm text-muted-foreground md:block">
        <Link to="/" className="hover:text-foreground">
          ← Tentra
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <RecordSessionDialog
          moduleNames={moduleNames}
          onSessionLogged={onSessionLogged}
        />
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full text-xs text-muted-foreground"
          onClick={onReset}
        >
          Re-plan
        </Button>
        <Button size="icon" variant="ghost" className="rounded-full">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-pink-blue font-semibold text-primary-foreground">
          {name.slice(0, 1).toUpperCase()}
        </div>
      </div>
    </div>
  );
}

function RecordSessionDialog({
  moduleNames,
  onSessionLogged,
}: {
  moduleNames: string[];
  onSessionLogged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState("30");
  const [moduleName, setModuleName] = useState<string>(moduleNames[0] ?? "");
  const [note, setNote] = useState("");

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
    onSessionLogged();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
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
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
            >
              Save session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
