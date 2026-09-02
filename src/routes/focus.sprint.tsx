import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Navigate, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Pause, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  clearSession,
  creditableMinutes,
  elapsedMs,
  isStale,
  loadSession,
  markLogAccepted,
  pauseSession,
  progress as sessionProgress,
  remainingMs,
  resumeSession,
  startBreak,
  targetMs,
  type ActiveSession,
} from "@/lib/focus-session";
import {
  SessionCompleteSheet,
  type SessionCompletionResult,
} from "@/components/session-complete-sheet";
import { completeScheduledTask } from "@/lib/plan/store";
import { recordStudyActivity } from "@/lib/study-log";
import { focusLogMessage, shouldMarkLogged } from "@/lib/canonical-edit";
import { MOTIVATIONAL_LINES } from "@/lib/focus-store";
import { Confetti } from "@/components/confetti";
import { toast } from "sonner";

export const Route = createFileRoute("/focus/sprint")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) {
      throw redirect({ to: "/auth", search: { mode: "signin" } });
    }
  },
  component: FocusPage,
  head: () => ({
    meta: [
      { title: "Focus session · Tentra" },
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
  const [session, setSession] = useState<ActiveSession | null>(() => loadSession());
  const [now, setNow] = useState(Date.now());
  const [lineIdx, setLineIdx] = useState(0);
  const [confettiKey, setConfettiKey] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const autoFiredRef = useRef(false);
  /** In-memory lock: stops double clicks without durably claiming the log slot. */
  const loggingRef = useRef(false);

  // Wall-clock ticking: the timer is always derived from stamps, so a
  // backgrounded tab or a locked phone can never desynchronise it.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setLineIdx((i) => (i + 1) % MOTIVATIONAL_LINES.length), 12000);
    return () => clearInterval(id);
  }, []);

  // An abandoned session is discarded rather than credited.
  useEffect(() => {
    if (session && isStale(session)) {
      clearSession();
      setSession(null);
      toast.info("That session was left running, so it wasn't logged.");
    }
  }, [session, now]);

  const phase = session?.phase ?? "focus";
  const remaining = session ? remainingMs(session, now) : 0;
  const progress = session ? sessionProgress(session, now) : 0;
  const isPaused = !!session?.pausedAt;

  // Focus phase reaching zero opens the completion flow — it never logs by
  // itself, so the recorded minutes always reflect what the student confirms.
  useEffect(() => {
    if (!session || remaining > 0) return;
    if (autoFiredRef.current) return;
    autoFiredRef.current = true;
    if (session.phase === "focus") {
      setConfettiKey((k) => k + 1);
      setSheetOpen(true);
    } else {
      clearSession();
      setSession(null);
      toast.success("Break over — ready for the next session?");
      navigate({ to: "/dashboard" });
    }
  }, [remaining, session, navigate]);

  if (!session) return <Navigate to="/focus" replace />;

  const handlePauseToggle = () => {
    setSession(session.pausedAt ? resumeSession(session) : pauseSession(session));
  };

  const handleFinish = async (result: SessionCompletionResult) => {
    // Already logged (auto-finish path) or a second click while in flight.
    if (session.loggedAt || loggingRef.current) return;
    loggingRef.current = true;
    setSaving(true);

    // Canonical write FIRST, keyed by the stable sessionId so a retry after a
    // crash is idempotent rather than a double count.
    const write = await recordStudyActivity({
      idempotencyKey: session.sessionId,
      activityType: "study",
      source: session.planned ? "dashboard_task" : "focus_sprint",
      actualMinutes: result.actualMinutes,
      plannedMinutes: Math.round(session.plannedMs / 60000),
      plannedTaskId: session.planned?.taskId ?? null,
      subject: session.module ?? null,
      subtopic: session.subtopic ?? null,
      examPath: session.examPath ?? null,
      selfFocus: result.selfFocus,
      note: `${session.title} · ${result.actualMinutes}m`,
      metadata: {
        producedOutput: result.producedOutput,
        activityType: session.activityType ?? "custom",
        origin: session.origin,
      },
    });

    if (!shouldMarkLogged(write)) {
      // Neither saved nor queued: keep the sheet open and stay retryable.
      loggingRef.current = false;
      setSaving(false);
      toast.error(focusLogMessage(write, result.actualMinutes));
      return;
    }

    const accepted = markLogAccepted(session) ?? session;
    setSession(accepted);

    if (session.planned) {
      try {
        await completeScheduledTask(session.planned.taskId, {
          actualMinutes: result.actualMinutes,
          sessionId: session.sessionId,
        });
      } catch (e) {
        console.warn("planned task completion failed", e);
        toast.error("Time logged, but we couldn't tick off the planned task. Try again from Today.");
      }
    }

    setSaving(false);
    setSheetOpen(false);
    loggingRef.current = false;

    const hasBreak = accepted.breakMs > 0 && accepted.phase === "focus";
    if (result.wantsQuickCheck && accepted.module) {
      clearSession();
      setSession(null);
      navigate({
        to: "/practice",
        search: {
          subject: accepted.module,
          ...(accepted.subtopic ? { subtopic: accepted.subtopic } : {}),
          mode: "revise" as const,
          length: 5,
        },
      });
      return;
    }
    if (hasBreak) {
      const next = startBreak(accepted);
      autoFiredRef.current = false;
      setSession(next);
      toast.success(`${focusLogMessage(write, result.actualMinutes)} Break time.`);
      return;
    }
    clearSession();
    setSession(null);
    toast.success(focusLogMessage(write, result.actualMinutes));
    navigate({ to: "/dashboard" });
  };

  const handleAbandon = () => {
    clearSession();
    setSession(null);
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="absolute -left-32 top-1/4 h-[40rem] w-[40rem] rounded-full bg-pink/15 blur-3xl animate-blob" />
        <div
          className="absolute -right-32 bottom-1/4 h-[40rem] w-[40rem] rounded-full bg-accent/15 blur-3xl animate-blob"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      <Confetti fire={confettiKey} />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card/60 px-3 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Leave running
          </button>
          <div className="rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-pink backdrop-blur">
            {phase === "focus" ? "Focus" : "Break"}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
          <div className="space-y-1">
            {session.module && (
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pink">
                {session.module}
              </div>
            )}
            <div className="text-xl font-normal text-foreground md:text-2xl">{session.title}</div>
            {session.evidenceLabel && (
              <div className="text-[11.5px] text-muted-foreground">{session.evidenceLabel}</div>
            )}
          </div>

          <TimerRing remainingMs={remaining} progress={progress} phase={phase} paused={isPaused} />

          {session.output && phase === "focus" && (
            <p className="max-w-md text-[12.5px] text-muted-foreground">
              Finish with: {session.output}
            </p>
          )}

          <p
            key={lineIdx}
            className="min-h-[2rem] max-w-md animate-fade-in text-sm italic text-muted-foreground"
          >
            "{MOTIVATIONAL_LINES[lineIdx]}"
          </p>

          <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:justify-center">
            <Button
              onClick={handlePauseToggle}
              size="lg"
              className="min-h-12 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:brightness-[1.06]"
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
            {phase === "focus" ? (
              <Button
                onClick={() => setSheetOpen(true)}
                variant="outline"
                size="lg"
                className="min-h-12 rounded-full"
              >
                <Check className="mr-2 h-4 w-4" /> Finish and log
              </Button>
            ) : (
              <Button
                onClick={handleAbandon}
                variant="outline"
                size="lg"
                className="min-h-12 rounded-full"
              >
                <SkipForward className="mr-2 h-4 w-4" /> Skip break
              </Button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
          <div>
            Elapsed{" "}
            <span className="font-semibold text-foreground">{fmt(elapsedMs(session, now))}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div>
            Target{" "}
            <span className="font-semibold text-foreground">
              {Math.round(targetMs(session) / 60000)}m
            </span>
          </div>
        </div>
      </div>

      <SessionCompleteSheet
        open={sheetOpen}
        title={session.title}
        subtitle={[session.module, session.subtopic].filter(Boolean).join(" · ")}
        suggestedMinutes={Math.max(5, creditableMinutes(session, now))}
        expectedOutput={session.output}
        canQuickCheck={!!session.module}
        saving={saving}
        onCancel={() => setSheetOpen(false)}
        onConfirm={(r) => void handleFinish(r)}
      />
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
  const size = 300;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, progress));
  const label = useMemo(() => fmt(remainingMs), [remainingMs]);

  return (
    <div className="relative w-full max-w-[300px]" style={{ aspectRatio: "1 / 1" }}>
      <div
        className={`absolute inset-0 rounded-full bg-gradient-pink-blue opacity-30 blur-2xl ${
          paused ? "" : "animate-pulse"
        }`}
      />
      <svg viewBox={`0 0 ${size} ${size}`} className="relative h-full w-full -rotate-90">
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
          <div className="font-display text-[4.5rem] leading-none tracking-tight text-foreground tabular-nums md:text-[5.5rem]">
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
