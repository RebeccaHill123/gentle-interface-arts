import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Pause, Play, Square, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  loadActiveSprint,
  saveActiveSprint,
  remainingMs,
  elapsedMs,
  MOTIVATIONAL_LINES,
  type ActiveSprint,
} from "@/lib/focus-store";
import { addStudySession, todayKey } from "@/lib/plan-store";
import { Confetti } from "@/components/confetti";
import { toast } from "sonner";

export const Route = createFileRoute("/focus/sprint")({
  beforeLoad: async () => {
    const user = await waitForAuthUser();
    if (!user) {
      throw redirect({ to: "/auth", search: { mode: "signin" } });
    }
  },
  component: FocusPage,
  head: () => ({
    meta: [
      { title: "Focus sprint · Tentra" },
      { name: "description", content: "Distraction-free deep work timer." },
    ],
  }),
});

function fmt(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function FocusPage() {
  const navigate = useNavigate();
  const [sprint, setSprint] = useState<ActiveSprint | null>(() => loadActiveSprint());
  const [now, setNow] = useState(Date.now());
  const [lineIdx, setLineIdx] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);
  const [completed, setCompleted] = useState<{
    focusMin: number;
    blocksToday: number;
  } | null>(null);
  const completedFiredRef = useRef(false);

  // If no sprint, send back to dashboard
  useEffect(() => {
    if (!sprint) {
      navigate({ to: "/dashboard" });
    }
  }, [sprint, navigate]);

  // 1s tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // Rotate motivational line every 12s
  useEffect(() => {
    const id = setInterval(
      () => setLineIdx((i) => (i + 1) % MOTIVATIONAL_LINES.length),
      12000,
    );
    return () => clearInterval(id);
  }, []);

  const phase = sprint?.phase ?? "focus";
  const remaining = sprint ? remainingMs(sprint, now) : 0;
  const target = sprint ? (phase === "focus" ? sprint.focusMs : sprint.breakMs) : 1;
  const progress = sprint ? 1 - remaining / Math.max(1, target) : 0;
  const isPaused = !!sprint?.pausedAt;

  // Detect phase completion
  useEffect(() => {
    if (!sprint) return;
    if (remaining > 0) {
      completedFiredRef.current = false;
      return;
    }
    if (completedFiredRef.current) return;
    completedFiredRef.current = true;

    if (sprint.phase === "focus") {
      // Log completed focus session
      const focusMin = Math.round(sprint.focusMs / 60000);
      addStudySession({
        date: todayKey(),
        minutes: focusMin,
        module: sprint.module,
        sessionType: "focus",
        note: sprint.topic
          ? `Focus sprint · ${focusMin}m · ${sprint.topic}`
          : `Focus sprint · ${focusMin}m`,
      });

      // Count today's focus blocks (incl. this one)
      const stored = (() => {
        try {
          const raw = localStorage.getItem("tentra.plan.v1");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      const sessionsToday = (stored?.sessions ?? []).filter(
        (s: { date: string; sessionType?: string }) =>
          s.date === todayKey() && s.sessionType === "focus",
      ).length;

      setConfettiKey((k) => k + 1);
      setCompleted({ focusMin, blocksToday: sessionsToday });

      // If a break is configured, transition into break phase paused — let user start it.
      if (sprint.breakMs > 0) {
        const next: ActiveSprint = {
          ...sprint,
          phase: "break",
          phaseStartedAt: Date.now(),
          pausedAt: Date.now(),
          pausedTotalMs: 0,
        };
        saveActiveSprint(next);
        setSprint(next);
      } else {
        saveActiveSprint(null);
      }
    } else {
      // Break completed — clear sprint.
      saveActiveSprint(null);
      toast.success("Break over — ready for the next sprint?");
    }
  }, [remaining, sprint]);

  const handlePauseToggle = () => {
    if (!sprint) return;
    if (sprint.pausedAt) {
      const addPaused = Date.now() - sprint.pausedAt;
      const next: ActiveSprint = {
        ...sprint,
        pausedAt: undefined,
        pausedTotalMs: sprint.pausedTotalMs + addPaused,
      };
      saveActiveSprint(next);
      setSprint(next);
    } else {
      const next: ActiveSprint = { ...sprint, pausedAt: Date.now() };
      saveActiveSprint(next);
      setSprint(next);
    }
  };

  const handleEnd = () => {
    if (!sprint) return;
    // If they're ending mid-focus, still log partial time (>= 2 min) so effort counts.
    if (sprint.phase === "focus") {
      const mins = Math.round(elapsedMs(sprint, Date.now()) / 60000);
      if (mins >= 2) {
        addStudySession({
          date: todayKey(),
          minutes: mins,
          module: sprint.module,
          sessionType: "focus",
          note: sprint.topic
            ? `Focus sprint (ended early) · ${mins}m · ${sprint.topic}`
            : `Focus sprint (ended early) · ${mins}m`,
        });
        toast.success(`Logged ${mins}m of focus.`);
      }
    }
    saveActiveSprint(null);
    navigate({ to: "/dashboard" });
  };

  const handleStartBreak = () => {
    if (!sprint) return;
    const next: ActiveSprint = {
      ...sprint,
      phase: "break",
      phaseStartedAt: Date.now(),
      pausedAt: undefined,
      pausedTotalMs: 0,
    };
    saveActiveSprint(next);
    setSprint(next);
    setCompleted(null);
  };

  const handleSkipBreak = () => {
    saveActiveSprint(null);
    navigate({ to: "/dashboard" });
  };

  if (!sprint) return null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="absolute -left-32 top-1/4 h-[40rem] w-[40rem] rounded-full bg-pink/15 blur-3xl animate-blob" />
        <div
          className="absolute -right-32 bottom-1/4 h-[40rem] w-[40rem] rounded-full bg-accent/15 blur-3xl animate-blob"
          style={{ animationDelay: "-4s" }}
        />
        <div
          className="absolute left-1/3 top-2/3 h-[30rem] w-[30rem] rounded-full bg-violet/15 blur-3xl animate-blob"
          style={{ animationDelay: "-8s" }}
        />
      </div>

      <Confetti fire={confettiKey} />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Exit
          </button>
          <div className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-pink backdrop-blur">
            {phase === "focus" ? "Focus" : "Break"}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          {(sprint.module || sprint.topic) && (
            <div className="space-y-1">
              {sprint.module && (
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-pink">
                  {sprint.module}
                </div>
              )}
              {sprint.topic && (
                <div className="text-2xl font-normal text-foreground md:text-3xl">
                  {sprint.topic}
                </div>
              )}
            </div>
          )}

          <TimerRing
            remainingMs={remaining}
            progress={progress}
            phase={phase}
            paused={isPaused}
          />

          <div className="min-h-[2.5rem] max-w-md">
            {completed ? (
              <div className="space-y-1 animate-fade-in">
                <div className="font-display text-2xl text-gradient-tentra">
                  Sprint complete 🎉
                </div>
                <div className="text-sm text-muted-foreground">
                  {completed.focusMin} minutes of deep work logged ·{" "}
                  {completed.blocksToday} block
                  {completed.blocksToday === 1 ? "" : "s"} today
                </div>
              </div>
            ) : (
              <p
                key={lineIdx}
                className="animate-fade-in text-sm italic text-muted-foreground md:text-base"
              >
                "{MOTIVATIONAL_LINES[lineIdx]}"
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {completed && phase === "break" ? (
              <>
                <Button
                  onClick={handleStartBreak}
                  size="lg"
                  className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start {Math.round(sprint.breakMs / 60000)}m break
                </Button>
                <Button
                  onClick={handleSkipBreak}
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                >
                  <SkipForward className="mr-2 h-4 w-4" /> Skip break
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handlePauseToggle}
                  size="lg"
                  className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
                >
                  {isPaused ? (
                    <>
                      <Play className="mr-2 h-4 w-4" /> Resume
                    </>
                  ) : (
                    <>
                      <Pause className="mr-2 h-4 w-4" /> Pause
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleEnd}
                  variant="outline"
                  size="lg"
                  className="rounded-full"
                >
                  <Square className="mr-2 h-4 w-4" /> End session
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div>
            Elapsed{" "}
            <span className="font-semibold text-foreground">
              {fmt(elapsedMs(sprint, now))}
            </span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div>
            Target{" "}
            <span className="font-semibold text-foreground">
              {Math.round(target / 60000)}m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimerRing({
  remainingMs,
  progress,
  phase,
  paused,
}: {
  remainingMs: number;
  progress: number;
  phase: "focus" | "break";
  paused: boolean;
}) {
  const size = 320;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, progress));

  const label = useMemo(() => fmt(remainingMs), [remainingMs]);

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Outer glow */}
      <div
        className={`absolute inset-0 rounded-full bg-gradient-pink-blue opacity-30 blur-2xl ${
          paused ? "" : "animate-pulse"
        }`}
      />
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="relative -rotate-90"
        width={size}
        height={size}
      >
        <defs>
          <linearGradient id="focus-ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.24 350)" />
            <stop offset="50%" stopColor="oklch(0.6 0.25 290)" />
            <stop offset="100%" stopColor="oklch(0.62 0.22 250)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="oklch(1 0 0 / 0.08)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#focus-ring)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.5s linear" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-display text-[5.5rem] leading-none tracking-tight text-foreground tabular-nums md:text-[6rem]">
            {label}
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-pink">
            {paused ? "Paused" : phase === "focus" ? "Deep work" : "Recharge"}
          </div>
        </div>
      </div>
    </div>
  );
}
