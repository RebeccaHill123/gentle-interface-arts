import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sparkles,
  Lock,
  Flame,
  TrendingUp,
  Brain,
  Target,
  Activity,
  ShieldAlert,
  CalendarClock,
  Trophy,
  Zap,
  ArrowRight,
  
  Loader2,
  MessageCircle,
  BarChart3,
  Mic,
  Users,
} from "lucide-react";
import { waitForAuthUser } from "@/lib/auth-session";
import { getProStatus, upgradeToPro, cancelPro } from "@/lib/pro-store";
import { loadPlan, computeStreak } from "@/lib/plan-store";
import { isUbePath } from "@/lib/exam-paths";
import { computeFocusInsights } from "@/lib/focus-store";

export const Route = createFileRoute("/pro")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) {
      throw redirect({ to: "/auth", search: { mode: "signin" } });
    }
  },
  component: ProPage,
  head: () => ({
    meta: [
      { title: "Tentra Pro · Premium intelligence for ambitious students" },
      {
        name: "description",
        content:
          "AI-powered insights, mock exam forecasts, burnout alerts and smart revision scheduling.",
      },
    ],
  }),
});

function ProPage() {
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const s = await getProStatus();
      if (active) setIsPro(s.isPro);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleUpgrade() {
    if (busy || isPro) return;
    setBusy(true);
    try {
      const result = await upgradeToPro();
      if (!result.isPro) throw new Error("not activated");
      setIsPro(true);
      toast.success("Pro unlocked ✨");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("tentra:pro-changed", { detail: { isPro: true } }));
      }
    } catch {
      toast.error("Couldn't activate Pro right now. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    try {
      await cancelPro();
      setIsPro(false);
    } finally {
      setBusy(false);
    }
  }

  if (isPro === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AppShell
      title="Tentra Pro"
      subtitle="Premium intelligence for ambitious students"
      actions={<ProBadge active={isPro} />}
    >
      {isPro ? (
        <ProDashboard onCancel={handleCancel} busy={busy} />
      ) : (
        <ProUpgrade onUpgrade={handleUpgrade} busy={busy} />
      )}
    </AppShell>
  );
}

/* -------------------- PRO BADGE -------------------- */

function ProBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
        active
          ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
          : "border border-border bg-card/60 text-muted-foreground"
      }`}
    >
      <Sparkles className="h-3 w-3" />
      Pro
    </span>
  );
}

/* -------------------- UPGRADE GATE -------------------- */

function ProUpgrade({
  onUpgrade,
  busy,
}: {
  onUpgrade: () => void;
  busy: boolean;
}) {
  const isUbe = useMemo(() => {
    const plan = loadPlan();
    const path = plan?.input.examPath;
    return path ? isUbePath(path) : plan?.input.examType === "UBE";
  }, []);
  const pathwayLabel = isUbe ? "UBE" : "SQE";

  const features = [
    { icon: <Brain className="h-4 w-4" />, title: "AI-powered study insights", body: "Daily intelligence on what's working and what's slipping." },
    { icon: <BarChart3 className="h-4 w-4" />, title: "Mock exam score forecast", body: isUbe ? "Predicted UBE scores with confidence bands." : "Predicted SQE1 and SQE2 scores with confidence bands." },
    { icon: <Target className="h-4 w-4" />, title: "Weak topic detection", body: "We surface the three things to fix this week." },
    { icon: <CalendarClock className="h-4 w-4" />, title: "Smart revision scheduling", body: "Your plan re-tunes itself as you study." },
    { icon: <ShieldAlert className="h-4 w-4" />, title: "Burnout & risk alerts", body: "We protect your streak — and your sanity." },
    { icon: <Trophy className="h-4 w-4" />, title: "Peer leaderboards", body: `See where you rank among ${pathwayLabel} candidates this week.` },
    { icon: <Mic className="h-4 w-4" />, title: "Voice study coach", body: "Spoken recaps and quick-fire MCQs while you commute." },
    { icon: <Activity className="h-4 w-4" />, title: "Advanced analytics", body: "Heatmaps, focus consistency, retention curves." },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur md:p-14">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-tentra opacity-30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-gradient-pink-blue opacity-25 blur-3xl" />

        <div className="relative max-w-2xl">
          <ProBadge active />
          <h1 className="mt-5 text-4xl font-light tracking-tight text-foreground md:text-6xl">
            Train like the{" "}
            <span className="text-gradient-pink-violet font-sans">top 1%</span> of {pathwayLabel} candidates.
          </h1>
          <p className="mt-5 text-base text-muted-foreground md:text-lg">
            Tentra Pro turns your study data into intelligence — forecasts, weak-spot detection,
            burnout alerts and a coach that re-tunes your plan in real time.
          </p>

          <div className="mt-8 flex flex-wrap items-end gap-6">
            <div>
              <div className="font-display text-5xl font-light text-gradient-tentra md:text-6xl">
                Free
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Included free during Tentra Early Access ✨
              </div>
            </div>
            <Button
              size="lg"
              disabled={busy}
              onClick={onUpgrade}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Activating…
                </>
              ) : (
                <>
                  Unlock Pro free <ArrowRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-glow"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground">
              {f.icon}
            </div>
            <h3 className="mt-4 text-sm font-semibold text-foreground">{f.title}</h3>
            <p className="mt-1.5 text-xs text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      {/* Locked preview row */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-light text-foreground">A glimpse inside.</h2>
          <span className="text-xs text-muted-foreground">Unlocks instantly with Pro</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <LockedCard title="AI insights">
            <div className="space-y-2 text-xs">
              <div className="rounded-xl bg-background/60 p-3">🔥 Retention on <b>Tort</b> dropped 12% — recap scheduled.</div>
              <div className="rounded-xl bg-background/60 p-3">⚡ Your sharpest focus is between 8–10am.</div>
              <div className="rounded-xl bg-background/60 p-3">📈 You're trending toward a <b>74%</b> SQE1 mock.</div>
            </div>
          </LockedCard>
          <LockedCard title="Mock score forecast">
            <ForecastSparkline values={[58, 61, 63, 66, 68, 71, 74]} />
          </LockedCard>
          <LockedCard title="Burnout radar">
            <BurnoutGauge level="moderate" />
          </LockedCard>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mt-12 rounded-[2rem] border border-border bg-gradient-soft p-8 text-center backdrop-blur md:p-12">
        <h2 className="text-3xl font-light text-foreground md:text-4xl">
          Ready to study like an athlete?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
          Pro features are currently free during Tentra Early Access ✨ — unlock the full intelligence layer in one tap.
        </p>
        <Button
          size="lg"
          disabled={busy}
          onClick={onUpgrade}
          className="mt-6 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Activating…
            </>
          ) : (
            "Unlock Pro free"
          )}
        </Button>
      </section>
    </div>
  );
}

function LockedCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/70 p-5 backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="mt-3 select-none opacity-60 blur-[2px]">{children}</div>
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-background/60 via-background/10 to-transparent">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-card">
          <Lock className="h-3 w-3" />
          Pro
        </div>
      </div>
    </div>
  );
}

/* -------------------- PRO DASHBOARD -------------------- */

function ProDashboard({
  onCancel,
  busy,
}: {
  onCancel: () => void;
  busy: boolean;
}) {
  const stored = useMemo(() => loadPlan(), []);
  const streakObj = useMemo(
    () => (stored ? computeStreak(stored.sessions) : { current: 0, longest: 0, studiedToday: false, totalMinutesToday: 0 }),
    [stored],
  );
  const streak = streakObj.current;
  const focus = useMemo(
    () => (stored ? computeFocusInsights(stored.sessions) : null),
    [stored],
  );

  // Weekly deep work minutes from focus store; fallback 0
  const weeklyMinutes = focus?.totalFocusMinThisWeek ?? 0;
  const weeklyGoal = 600; // 10h
  const weeklyPct = Math.min(100, Math.round((weeklyMinutes / weeklyGoal) * 100));

  // Weak topics derived from confidence levels in onboarding input
  const weakTopics = useMemo(() => {
    const mods = stored?.input?.modules ?? [];
    return mods
      .map((m) => ({ name: m.name, confidence: Number(m.confidence) || 0 }))
      .sort((a, b) => a.confidence - b.confidence)
      .slice(0, 4);
  }, [stored]);

  // Forecast (mock): trend up from current confidence average
  const forecastValues = useMemo(() => {
    const avg = weakTopics.length
      ? weakTopics.reduce((s, t) => s + t.confidence, 0) / weakTopics.length
      : 3;
    const base = 50 + avg * 6; // 50–80 ish
    return Array.from({ length: 8 }).map((_, i) => Math.round(base + i * 2.5));
  }, [weakTopics]);

  const predicted = forecastValues[forecastValues.length - 1];

  // Burnout heuristic — high streak + high weekly minutes pushes risk up
  const burnoutLevel: "low" | "moderate" | "high" =
    weeklyMinutes > 900 || streak > 21
      ? "high"
      : weeklyMinutes > 500 || streak > 10
        ? "moderate"
        : "low";

  // 7-day heatmap from sessions
  const heatmap = useMemo(() => {
    const sessions = stored?.sessions ?? [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    return Array.from({ length: 7 }).map((_, i) => {
      const start = now - (6 - i) * dayMs;
      const end = start + dayMs;
      return sessions
        .filter((s) => {
          const t = new Date(s.loggedAt).getTime();
          return t >= start && t < end;
        })
        .reduce((sum, s) => sum + (s.minutes || 0), 0);
    });
  }, [stored]);

  return (
    <div>
      {/* Hero strip */}
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-7 backdrop-blur md:p-10">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-tentra opacity-25 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <ProBadge active />
            <h1 className="mt-4 text-3xl font-light tracking-tight text-foreground md:text-5xl">
              Welcome back to <span className="text-gradient-pink-violet font-sans inline-block pr-2">Pro</span>.
            </h1>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground md:text-base">
              Your intelligence layer is live. Insights refresh in real time as you study.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <StatRing label="Weekly focus" value={weeklyPct} suffix="%" />
            <StreakChip days={streak} />
            <ScoreGauge predicted={predicted} />
          </div>
        </div>
      </section>

      {/* AI insights */}
      <section className="mt-8">
        <AIInsights weakTopics={weakTopics} predicted={predicted} burnout={burnoutLevel} />
      </section>

      {/* Heatmap + Burnout */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gradient-tentra">
              Revision heatmap · last 7 days
            </h2>
            <span className="text-xs text-muted-foreground">
              {heatmap.reduce((a, b) => a + b, 0)}m this week
            </span>
          </div>
          <Heatmap values={heatmap} />
        </div>
        <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gradient-tentra">
            Burnout radar
          </h2>
          <div className="mt-4">
            <BurnoutGauge level={burnoutLevel} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {burnoutLevel === "high"
              ? "You're in the red zone. Schedule a recovery day."
              : burnoutLevel === "moderate"
                ? "Solid pace. Watch sleep and breaks."
                : "Healthy rhythm. Keep building."}
          </p>
        </div>
      </section>

      {/* Forecast + Weak topics */}
      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gradient-tentra">
              Mock exam forecast
            </h2>
            <span className="text-xs text-muted-foreground">Next 8 weeks</span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <div>
              <div className="font-display text-4xl font-light text-gradient-tentra">
                {predicted}%
              </div>
              <div className="text-xs text-muted-foreground">Predicted SQE1</div>
            </div>
            <TrendingUp className="h-5 w-5 text-pink" />
          </div>
          <div className="mt-4">
            <ForecastSparkline values={forecastValues} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gradient-tentra">
            Weak topic detection
          </h2>
          <div className="mt-4 space-y-3">
            {weakTopics.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Log a few sessions to surface weak spots.
              </p>
            ) : (
              weakTopics.map((t) => (
                <div key={t.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{t.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((t.confidence / 5) * 100)}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-background/60">
                    <div
                      className="h-full bg-gradient-pink-blue"
                      style={{ width: `${(t.confidence / 5) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Smart schedule */}
      <section className="mt-8 rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gradient-tentra">
            Smart revision schedule
          </h2>
          <span className="text-xs text-muted-foreground">AI-tuned to your data</span>
        </div>
        <SmartSchedule weakTopics={weakTopics} />
      </section>

      {/* Locked-coming-soon row */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Coming soon to Pro
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <LockedCard title="Peer leaderboard">
            <div className="flex items-center gap-2 text-xs">
              <Users className="h-4 w-4" />
              See your rank among SQE candidates.
            </div>
          </LockedCard>
          <LockedCard title="Voice study coach">
            <div className="flex items-center gap-2 text-xs">
              <Mic className="h-4 w-4" />
              Spoken recaps for your commute.
            </div>
          </LockedCard>
          <LockedCard title="Past paper AI grader">
            <div className="flex items-center gap-2 text-xs">
              <Brain className="h-4 w-4" />
              Drop in an answer, get instant feedback.
            </div>
          </LockedCard>
        </div>
      </section>

      {/* Manage */}
      <section className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-5">
        <div>
          <div className="text-sm font-semibold text-foreground">Tentra Pro membership</div>
          <div className="text-xs text-muted-foreground">
            Free during Tentra Early Access ✨
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-pink-blue px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-primary-foreground shadow-glow">
          <Sparkles className="h-3 w-3" />
          Unlocked
        </span>
      </section>

      {/* FAB */}
      <CoachFab />
    </div>
  );
}

/* -------------------- SUB-COMPONENTS -------------------- */

function StatRing({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  const size = 88;
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="flex items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.24 350)" />
              <stop offset="100%" stopColor="oklch(0.62 0.22 250)" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="oklch(0.5 0.05 285 / 0.12)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#ringGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="font-display text-lg font-light text-foreground">
              {value}
              {suffix}
            </div>
          </div>
        </div>
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function StreakChip({ days }: { days: number }) {
  return (
    <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-background/70 px-4 py-3">
      <Flame className="h-5 w-5 text-pink drop-shadow-[0_0_8px_oklch(0.72_0.24_350/0.6)] animate-pulse" />
      <div>
        <div className="font-display text-2xl font-light text-gradient-tentra leading-none">
          {days}
        </div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Day streak
        </div>
      </div>
    </div>
  );
}

function ScoreGauge({ predicted }: { predicted: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/70 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Predicted score
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <div className="font-display text-2xl font-light text-gradient-tentra">
          {predicted}
        </div>
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}

function AIInsights({
  weakTopics,
  predicted,
  burnout,
}: {
  weakTopics: { name: string; confidence: number }[];
  predicted: number;
  burnout: "low" | "moderate" | "high";
}) {
  const insights = useMemo(() => {
    const arr: { icon: React.ReactNode; text: React.ReactNode }[] = [];
    if (weakTopics[0]) {
      arr.push({
        icon: <Zap className="h-4 w-4" />,
        text: (
          <>
            Your confidence on <b>{weakTopics[0].name}</b> is your biggest leverage point this week.
          </>
        ),
      });
    }
    arr.push({
      icon: <TrendingUp className="h-4 w-4" />,
      text: (
        <>
          You're trending toward a <b>{predicted}%</b> SQE1 mock — up from your starting baseline.
        </>
      ),
    });
    if (burnout === "high") {
      arr.push({
        icon: <ShieldAlert className="h-4 w-4" />,
        text: <>Burnout risk is elevated. Try a 24-hour reset.</>,
      });
    } else {
      arr.push({
        icon: <Brain className="h-4 w-4" />,
        text: <>Your sharpest focus is in the morning — schedule deep work before 11am.</>,
      });
    }
    return arr;
  }, [weakTopics, predicted, burnout]);

  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % insights.length), 6000);
    return () => clearInterval(t);
  }, [insights.length]);

  const current = insights[i];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-transparent bg-card/80 p-6 backdrop-blur"
      style={{
        backgroundImage:
          "linear-gradient(var(--card), var(--card)) padding-box, linear-gradient(120deg, oklch(0.72 0.24 350), oklch(0.62 0.22 250)) border-box",
        border: "1px solid transparent",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold uppercase tracking-wider text-gradient-tentra">
            AI insight
          </div>
        </div>
        <div className="flex gap-1">
          {insights.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === i ? "w-6 bg-gradient-pink-blue" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-start gap-3">
        <div className="text-foreground/70">{current.icon}</div>
        <p className="text-base text-foreground md:text-lg">{current.text}</p>
      </div>
    </div>
  );
}

function Heatmap({ values }: { values: number[] }) {
  const max = Math.max(60, ...values);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="mt-4 grid grid-cols-7 gap-2">
      {values.map((v, i) => {
        const intensity = Math.min(1, v / max);
        return (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className="h-16 w-full rounded-lg ring-1 ring-border/60"
              style={{
                background: `linear-gradient(180deg, oklch(0.72 0.24 350 / ${0.15 + intensity * 0.7}), oklch(0.62 0.22 250 / ${0.15 + intensity * 0.7}))`,
                boxShadow:
                  intensity > 0.6
                    ? "0 0 18px -2px oklch(0.72 0.24 350 / 0.5)"
                    : undefined,
              }}
              title={`${v} minutes`}
            />
            <div className="text-[10px] font-medium text-muted-foreground">
              {days[i]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BurnoutGauge({ level }: { level: "low" | "moderate" | "high" }) {
  const pct = level === "low" ? 28 : level === "moderate" ? 62 : 88;
  const color =
    level === "low"
      ? "oklch(0.72 0.18 160)"
      : level === "moderate"
        ? "oklch(0.78 0.18 80)"
        : "oklch(0.66 0.24 25)";
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-3xl font-light capitalize" style={{ color }}>
          {level}
        </span>
        <span className="text-xs text-muted-foreground">{pct}/100</span>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-background/60">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, oklch(0.72 0.18 160), oklch(0.78 0.18 80), oklch(0.66 0.24 25))`,
          }}
        />
      </div>
    </div>
  );
}

function ForecastSparkline({ values }: { values: number[] }) {
  const w = 280;
  const h = 80;
  const min = Math.min(...values) - 4;
  const max = Math.max(...values) + 4;
  const range = Math.max(1, max - min);
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-20 w-full">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.72 0.24 350 / 0.45)" />
          <stop offset="100%" stopColor="oklch(0.62 0.22 250 / 0)" />
        </linearGradient>
        <linearGradient id="sparkLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.72 0.24 350)" />
          <stop offset="100%" stopColor="oklch(0.62 0.22 250)" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkFill)" />
      <polyline
        points={pts}
        fill="none"
        stroke="url(#sparkLine)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmartSchedule({
  weakTopics,
}: {
  weakTopics: { name: string; confidence: number }[];
}) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const fallback = ["Tort", "Contract", "Land Law", "Trusts"];
  const topics = (weakTopics.length ? weakTopics.map((t) => t.name) : fallback);
  return (
    <div className="mt-4 grid gap-2 md:grid-cols-7">
      {days.map((d, i) => {
        const topic = topics[i % topics.length];
        const minutes = 30 + (i % 3) * 15;
        return (
          <div
            key={d}
            className="rounded-xl border border-border bg-background/60 p-3"
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {d}
            </div>
            <div className="mt-1 text-sm font-medium text-foreground">
              {topic}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {minutes}m · deep work
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CoachFab() {
  return (
    <button
      onClick={() => toast("Coach AI is warming up…")}
      className="fixed bottom-6 right-6 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-transform hover:scale-105"
      aria-label="Ask Coach AI"
    >
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-gradient-pink-blue opacity-20" />
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
