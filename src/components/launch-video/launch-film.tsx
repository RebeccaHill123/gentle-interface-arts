// Code-driven 9:16 launch film for the isolated /launch-video preview.
//
// Every frame is a pure function of the playhead `t` (seconds), so the film
// autoplays in a browser and can also be captured frame-by-frame through
// `window.__launchSeek(t)`. All product surfaces are the real components fed
// by the deterministic planner fixture — nothing is persisted.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { ArrowRight, CalendarClock, Gauge, LineChart, ListChecks, RefreshCw, Sparkles } from "lucide-react";
import { BrandMark, TentraMonogram } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { QuizScreen } from "@/components/practice/quiz-screen";
import { TodayHeader } from "@/components/dashboard/today-header";
import { TodayTaskCard } from "@/components/dashboard/today-task-card";
import {
  buildLaunchDemo,
  DEMO_ANSWERS,
  DEMO_CONFIG,
  DEMO_FOCUS_INDEX,
  DEMO_INPUT,
  DEMO_QUESTIONS,
  DEMO_TODAY,
} from "@/lib/launch-video/demo-fixture";
import type { ScheduledTask } from "@/lib/plan/types";

export const FILM_DURATION = 29;
const W = 540;
const H = 960;

declare global {
  interface Window {
    __launchSeek?: (t: number) => void;
    __launchReady?: boolean;
  }
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const easeInOut = (x: number) => {
  const c = clamp(x);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
};
/** 0→1 progress of t across [a, b], eased. */
const seg = (t: number, a: number, b: number, ease = easeInOut) => ease((t - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Visibility envelope: fades in over [a, a+f], out over [b-f, b]. */
const env = (t: number, a: number, b: number, f = 0.45) =>
  Math.min(seg(t, a, a + f, easeOut), 1 - seg(t, b - f, b));

const noop = () => {};

function Scene({ t, a, b, children, style }: { t: number; a: number; b: number; children: ReactNode; style?: CSSProperties }) {
  if (t < a - 0.05 || t > b + 0.05) return null;
  const v = env(t, a, b, 0.55);
  return (
    <div
      className="absolute inset-0"
      style={{ opacity: v, filter: v < 1 ? `blur(${(1 - v) * 8}px)` : undefined, ...style }}
    >
      {children}
    </div>
  );
}

function Headline({ t, a, b, children, sub, top = 92 }: { t: number; a: number; b: number; children: ReactNode; sub?: ReactNode; top?: number }) {
  const v = env(t, a, b, 0.5);
  if (v <= 0) return null;
  return (
    <div
      className="absolute inset-x-0 z-30 px-9 text-center"
      style={{ top, opacity: v, transform: `translateY(${(1 - v) * 18}px)`, filter: `blur(${(1 - v) * 6}px)` }}
    >
      <h2 className="font-display text-[34px] leading-[1.08] tracking-[-0.02em] text-foreground">{children}</h2>
      {sub ? <p className="mx-auto mt-3 max-w-[400px] text-[15px] leading-snug text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Cursor({ x, y, pressed, visible }: { x: number; y: number; pressed: number; visible: number }) {
  if (visible <= 0) return null;
  return (
    <div className="pointer-events-none absolute z-40" style={{ left: x, top: y, opacity: visible }}>
      <div
        className="absolute -left-5 -top-5 h-10 w-10 rounded-full bg-pink/25"
        style={{ transform: `scale(${pressed * 1.6})`, opacity: pressed > 0 ? 1 - pressed * 0.6 : 0 }}
      />
      <svg width="22" height="26" viewBox="0 0 22 26" style={{ transform: `scale(${1 - pressed * 0.12})`, filter: "drop-shadow(0 4px 8px rgb(0 0 0 / 0.25))" }}>
        <path d="M2 2 L2 21 L7.5 16.5 L11 24 L14.5 22.5 L11 15 L18.5 15 Z" fill="white" stroke="black" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Floating product surface: real UI rendered at its natural width, scaled in. */
function Panel({ width, scale, x, y, children, rotate = 0, className = "" }: { width: number; scale: number; x: number; y: number; children: ReactNode; rotate?: number; className?: string }) {
  return (
    <div
      className={`absolute left-0 top-0 origin-top-left ${className}`}
      style={{ width, transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotate}deg)` }}
    >
      {children}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1 text-[11px] text-muted-foreground shadow-card backdrop-blur">
      {children}
    </span>
  );
}

function Backdrop({ t }: { t: number }) {
  const drift = Math.sin(t * 0.35) * 30;
  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <div
        className="absolute -left-40 -top-32 h-[560px] w-[560px] rounded-full opacity-60 blur-3xl"
        style={{ background: "color-mix(in oklch, var(--pink) 32%, transparent)", transform: `translate(${drift}px, ${drift * 0.6}px)` }}
      />
      <div
        className="absolute -right-48 top-[300px] h-[620px] w-[620px] rounded-full opacity-60 blur-3xl"
        style={{ background: "color-mix(in oklch, var(--violet) 30%, transparent)", transform: `translate(${-drift}px, ${drift * 0.4}px)` }}
      />
      <div
        className="absolute -bottom-56 left-10 h-[520px] w-[520px] rounded-full opacity-50 blur-3xl"
        style={{ background: "color-mix(in oklch, var(--blue) 22%, transparent)", transform: `translate(${drift * 0.5}px, ${-drift}px)` }}
      />
    </div>
  );
}

function TaskCard({ task, reason }: { task: ScheduledTask; reason?: string }) {
  return (
    <TodayTaskCard
      task={task}
      primary
      reason={reason}
      onStart={noop}
      onComplete={noop}
      onLogElsewhere={noop}
      onReschedule={noop}
      onSkip={noop}
    />
  );
}

const shortDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

function UpcomingRow({ task, highlight }: { task: ScheduledTask; highlight: boolean }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${highlight ? "border-pink/40 bg-pink/5" : "border-border/60 bg-card"}`}
    >
      <div className="w-[74px] shrink-0 text-[11px] text-muted-foreground">{shortDate(task.date)}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] text-foreground">{task.module}</div>
        <div className="truncate text-[11px] text-muted-foreground">{task.title}</div>
      </div>
      <div className="text-[11px] text-muted-foreground">{task.minutes}m</div>
    </div>
  );
}

export function LaunchFilm({ autoplay = true }: { autoplay?: boolean }) {
  const demo = useMemo(() => buildLaunchDemo(), []);
  const [t, setT] = useState(0);
  const [scale, setScale] = useState(1);
  const startRef = useRef<number | null>(null);
  const seekingRef = useRef(false);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    window.__launchSeek = (next: number) => {
      seekingRef.current = true;
      flushSync(() => setT(next));
    };
    window.__launchReady = true;
    return () => {
      window.removeEventListener("resize", fit);
      window.__launchSeek = undefined;
      window.__launchReady = false;
    };
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    let raf = 0;
    const loop = (now: number) => {
      if (seekingRef.current) return;
      if (startRef.current === null) startRef.current = now;
      setT(((now - startRef.current) / 1000) % FILM_DURATION);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [autoplay]);

  const examLabel = "SQE1";
  const daysUntilExam = 132;

  // ── Scene 2 state: real QuizScreen driven by the playhead.
  const focus = DEMO_FOCUS_INDEX;
  const picked = DEMO_ANSWERS[focus];
  const onNextQ = t >= 11.05;
  const current = onNextQ ? focus + 1 : focus;
  const answers = DEMO_QUESTIONS.map((_, i) => {
    if (i < focus) return DEMO_ANSWERS[i];
    if (i === focus && t >= 6.55) return picked;
    return null;
  });
  const revealed = !onNextQ && t >= 7.35;

  // Quiz camera: zoom in for the options, then pan down to the explanation.
  const qScale = lerp(0.6, 0.66, seg(t, 4, 6.2));
  const qPan = onNextQ ? 0 : -lerp(0, 190, seg(t, 8.0, 9.4));
  const qX = (W - 760 * qScale) / 2;
  const qY = 250 + qPan + (1 - seg(t, 3.9, 4.8, easeOut)) * 120;

  // Cursor path (stage coordinates).
  const optY = qY + 300 * qScale + picked * 64 * qScale;
  let cx = 470;
  let cy = 880;
  let pressed = 0;
  if (t < 6.55) {
    const p = seg(t, 5.0, 6.4);
    cx = lerp(470, 200, p);
    cy = lerp(880, optY + 20, p);
  } else if (t < 10.3) {
    cx = 200;
    cy = optY + 20;
    pressed = t < 7.0 ? seg(t, 6.55, 7.0, easeOut) : 0;
  } else {
    const p = seg(t, 10.0, 10.9);
    cx = lerp(200, 440, p);
    cy = lerp(optY + 20, 860, p);
    pressed = t >= 10.95 && t < 11.4 ? seg(t, 10.95, 11.4, easeOut) : 0;
  }
  const cursorVis = env(t, 4.9, 11.8, 0.3);

  // ── Scene 3 timings.
  const acc = demo.accuracyPct;
  const ring = seg(t, 12.6, 13.8, easeOut);
  const shownAcc = Math.round(acc * ring);
  const swap = seg(t, 16.2, 17.2);
  const todayBefore = demo.todayBefore[0];
  const todayAfter = demo.todayAfter[0];
  const moved = demo.revision?.changes.find((c) => c.kind === "moved");
  const progressTasks = t < 15 ? demo.todayBefore : demo.todayAfter;

  // Scene 1 zoom.
  const s1Zoom = lerp(0.84, 1.0, seg(t, 0, 4));
  const s1Rot = lerp(9, 0, seg(t, 0, 3.4));

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-background">
      <div
        className="relative overflow-hidden"
        style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "center" }}
        aria-label="Tentra launch film"
      >
        <Backdrop t={t} />

        {/* ── Scene 1 — hook */}
        <Scene t={t} a={0} b={4.2}>
          <Headline t={t} a={0.25} b={4.0} sub="Meet the smarter way to study." top={110}>
            Your bar prep.
            <br />
            <span className="bg-gradient-pink-blue bg-clip-text text-transparent">Smarter than ever.</span>
          </Headline>
          <div className="absolute inset-0" style={{ perspective: 1400 }}>
            <div
              className="absolute left-1/2 top-[330px] w-[620px] origin-top rounded-[32px] border border-border/60 bg-card/90 p-6 shadow-card backdrop-blur"
              style={{ transform: `translateX(-50%) scale(${s1Zoom * 0.78}) rotateX(${s1Rot}deg)` }}
            >
              <div className="mb-5 flex items-center justify-between">
                <BrandMark />
                <Chip>
                  <CalendarClock className="h-3 w-3" /> Today
                </Chip>
              </div>
              <TodayHeader
                firstName={DEMO_INPUT.name}
                today={DEMO_TODAY}
                examLabel={examLabel}
                daysUntilExam={daysUntilExam}
                tasks={demo.todayBefore}
                weeklyDoneMins={150}
                weeklyTargetMins={720}
              />
              <div className="mt-5 space-y-3">
                {todayBefore ? <TaskCard task={todayBefore} reason="Scheduled for today" /> : null}
                {demo.upcomingBefore.slice(0, 2).map((task) => (
                  <UpcomingRow key={task.id} task={task} highlight={false} />
                ))}
              </div>
            </div>
          </div>
        </Scene>

        {/* ── Scene 2 — real MCQ practice */}
        <Scene t={t} a={3.9} b={12.3}>
          <Headline t={t} a={4.2} b={7.9} top={84}>
            Practice with purpose.
          </Headline>
          <Headline t={t} a={8.0} b={12.1} top={84}>
            Hundreds of MCQs.
            <br />
            Instant feedback.
          </Headline>
          <div className="absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-background from-70% via-background/85 to-transparent" style={{ height: lerp(200, 285, seg(t, 7.9, 9.2)) }} />
          <Panel width={760} scale={qScale} x={qX} y={qY}>
            <QuizScreen
              config={DEMO_CONFIG}
              questions={DEMO_QUESTIONS}
              current={current}
              answers={answers}
              revealed={revealed}
              feedbackMode="immediate"
              remainingLabel={null}
              lowTime={false}
              onSelect={noop}
              onNext={noop}
              onPrev={noop}
              onFinish={noop}
              flagged={false}
              onToggleFlag={noop}
            />
          </Panel>
          <Cursor x={cx} y={cy} pressed={pressed} visible={cursorVis} />
        </Scene>

        {/* ── Scene 3 — hero: recalibration */}
        <Scene t={t} a={12.0} b={22.3}>
          <Headline t={t} a={12.3} b={16.4} top={84}>
            Your plan adapts to you.
          </Headline>
          <Headline t={t} a={16.6} b={22.0} top={70} sub="Your study plan adjusts.">
            Fall behind?
            <br />
            Find a weak spot?
          </Headline>

          {/* Session complete → graded result */}
          <div
            className="absolute left-1/2 top-[205px] w-[440px] rounded-[28px] border border-border/60 bg-card/95 p-5 shadow-card"
            style={{
              transform: `translateX(-50%) translateY(${lerp(30, 0, seg(t, 12.1, 12.8, easeOut))}px) scale(${lerp(1, 0.82, seg(t, 14.6, 15.6))})`,
              transformOrigin: "top center",
              opacity: env(t, 12.1, 22.2),
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="grid h-[84px] w-[84px] shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(var(--pink) ${ring * acc * 3.6}deg, color-mix(in oklch, var(--foreground) 8%, transparent) 0deg)`,
                }}
              >
                <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-card font-display text-[22px] text-foreground">
                  {shownAcc}%
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Session complete</div>
                <div className="mt-1 font-display text-[19px] text-foreground">
                  {DEMO_CONFIG.module} · {demo.score.correct}/{demo.score.scored} correct
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">Graded result below 70% — shared with your planner.</div>
              </div>
            </div>
            <Progress value={(demo.score.answered / DEMO_QUESTIONS.length) * 100 * ring} className="mt-4 h-1.5" />
          </div>

          {/* Plan: today's task swaps, upcoming list rearranges */}
          <div
            className="absolute left-1/2 top-[360px] w-[620px] origin-top rounded-[32px] border border-border/60 bg-card/90 p-6 shadow-card backdrop-blur"
            style={{
              transform: `translateX(-50%) translateY(${lerp(80, 0, seg(t, 14.0, 15.0, easeOut))}px) scale(0.68)`,
              opacity: seg(t, 14.0, 14.8, easeOut),
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-[20px] text-foreground">Your plan</div>
              <Chip>
                <RefreshCw className="h-3 w-3" style={{ transform: `rotate(${seg(t, 15.4, 17.0) * 360}deg)` }} />
                {t < 15.4 ? `Version ${demo.before.scheduleVersion}` : t < 17.0 ? "Recalibrating…" : `Version ${demo.after.scheduleVersion}`}
              </Chip>
            </div>
            <TodayHeader
              firstName={DEMO_INPUT.name}
              today={DEMO_TODAY}
              examLabel={examLabel}
              daysUntilExam={daysUntilExam}
              tasks={progressTasks}
              weeklyDoneMins={150 + Math.round(17 * seg(t, 14.6, 15.6))}
              weeklyTargetMins={720}
              missedCount={t < 17 ? demo.missedYesterday.length : 0}
            />
            <div className="relative mt-4 h-[210px]">
              {todayBefore ? (
                <div className="absolute inset-x-0 top-0" style={{ opacity: 1 - swap, transform: `translateX(${-swap * 120}px) scale(${1 - swap * 0.06})` }}>
                  <TaskCard task={todayBefore} reason="Scheduled for today" />
                </div>
              ) : null}
              {todayAfter ? (
                <div className="absolute inset-x-0 top-0" style={{ opacity: swap, transform: `translateX(${(1 - swap) * 120}px)` }}>
                  <TaskCard task={todayAfter} reason="Moved up by your results" />
                </div>
              ) : null}
            </div>
            <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">Next in your plan</div>
            <div className="relative mt-2 h-[134px]">
              {demo.upcomingBefore.slice(0, 2).map((task, i) => (
                <div key={task.id} className="absolute inset-x-0" style={{ top: i * 66 + seg(t, 17.0 + i * 0.12, 17.8 + i * 0.12) * 40, opacity: 1 - seg(t, 17.0 + i * 0.12, 17.7 + i * 0.12) }}>
                  <UpcomingRow task={task} highlight={false} />
                </div>
              ))}
              {demo.upcomingAfter.slice(0, 2).map((task, i) => {
                const p = seg(t, 17.4 + i * 0.15, 18.3 + i * 0.15, easeOut);
                return (
                  <div key={task.id} className="absolute inset-x-0" style={{ top: i * 66 - (1 - p) * 40, opacity: p }}>
                    <UpcomingRow task={task} highlight={task.module === moved?.module} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Real revision summary from the planner */}
          <div
            className="absolute left-1/2 top-[838px] w-[460px] rounded-2xl border border-pink/30 bg-card/95 px-4 py-3 shadow-card"
            style={{ transform: `translateX(-50%) translateY(${(1 - seg(t, 18.4, 19.2, easeOut)) * 24}px)`, opacity: seg(t, 18.4, 19.2, easeOut) }}
          >
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              <div>
                <div className="text-[12.5px] leading-snug text-foreground">{demo.revision?.summary}</div>
                {moved ? (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Missed {moved.module} session carried forward to {moved.date ? shortDate(moved.date) : "a later day"}.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </Scene>

        {/* ── Scene 4 — everything connected */}
        <Scene t={t} a={22.0} b={26.3}>
          <Headline t={t} a={22.2} b={26.1} top={80}>
            Everything connected.
            <br />
            One smarter study plan.
          </Headline>
          {(
            [
              { label: "Personalised study plans", icon: CalendarClock, x: 28, y: 250, h: 120, node: todayAfter ? <TaskCard task={todayAfter} reason="Moved up by your results" /> : null, w: 560, s: 0.43 },
              { label: "MCQ practice", icon: ListChecks, x: 282, y: 250, node: <QuizScreen config={DEMO_CONFIG} questions={DEMO_QUESTIONS} current={focus} answers={DEMO_ANSWERS} revealed feedbackMode="immediate" remainingLabel={null} lowTime={false} onSelect={noop} onNext={noop} onPrev={noop} onFinish={noop} flagged={false} onToggleFlag={noop} />, w: 760, s: 0.305, h: 330 },
              { label: "Timed mock exams", icon: Gauge, x: 28, y: 425, node: <QuizScreen config={{ ...DEMO_CONFIG, timed: true, feedbackMode: "end" }} questions={DEMO_QUESTIONS} current={2} answers={DEMO_ANSWERS.map((a, i) => (i < 2 ? a : null))} revealed={false} feedbackMode="end" remainingLabel="14:20" lowTime={false} onSelect={noop} onNext={noop} onPrev={noop} onFinish={noop} flagged={false} onToggleFlag={noop} />, w: 760, s: 0.305, h: 330 },
              { label: "Progress tracking", icon: LineChart, x: 282, y: 640, node: <TodayHeader firstName={DEMO_INPUT.name} today={DEMO_TODAY} examLabel={examLabel} daysUntilExam={daysUntilExam} tasks={demo.todayAfter} weeklyDoneMins={167} weeklyTargetMins={720} />, w: 560, s: 0.405, h: 120 },
            ] as const
          ).map((p, i) => {
            const v = seg(t, 22.3 + i * 0.18, 23.2 + i * 0.18, easeOut);
            const float = Math.sin(t * 1.3 + i) * 3;
            const pull = lerp(1.08, 1, seg(t, 22.0, 25.8));
            return (
              <div
                key={p.label}
                className="absolute w-[230px] rounded-[22px] border border-border/60 bg-card/90 p-2.5 shadow-card backdrop-blur"
                style={{ left: p.x, top: p.y, opacity: v, transform: `translateY(${(1 - v) * 40 + float}px) scale(${pull})` }}
              >
                <div className="mb-2 flex items-center gap-1.5 px-1 text-[11.5px] font-medium text-foreground">
                  <p.icon className="h-3.5 w-3.5 text-pink" /> {p.label}
                </div>
                <div className="relative overflow-hidden rounded-[14px]" style={{ height: p.h }}>
                  <div className="origin-top-left" style={{ width: p.w, transform: `scale(${p.s * (230 - 20) / (p.w * p.s)})`, transformOrigin: "top left" }}>
                    {p.node}
                  </div>
                </div>
              </div>
            );
          })}
        </Scene>

        {/* ── Scene 5 — outro */}
        <Scene t={t} a={26.0} b={FILM_DURATION + 1}>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
            <div style={{ transform: `scale(${lerp(0.7, 1, seg(t, 26.1, 27.0, easeOut))})`, opacity: seg(t, 26.1, 26.8) }}>
              <TentraMonogram className="h-24 w-24 rounded-[26px] shadow-glow ring-1 ring-border" />
            </div>
            <div className="wordmark mt-4 text-[22px] text-foreground" style={{ opacity: seg(t, 26.3, 27.0) }}>
              Tentra
            </div>
            <h2 className="mt-8 font-display text-[32px] leading-[1.1] tracking-[-0.02em] text-foreground" style={{ opacity: seg(t, 26.6, 27.3), transform: `translateY(${(1 - seg(t, 26.6, 27.3)) * 14}px)` }}>
              Meet your new study advantage.
            </h2>
            <p className="mt-3 text-[15px] text-muted-foreground" style={{ opacity: seg(t, 26.9, 27.5) }}>
              Built for SQE &amp; NY Bar students.
            </p>
            <div className="mt-8" style={{ opacity: seg(t, 27.2, 27.8), transform: `translateY(${(1 - seg(t, 27.2, 27.8)) * 12}px)` }}>
              <Button className="h-12 rounded-full bg-gradient-pink-blue px-7 text-[15px] text-primary-foreground shadow-glow">
                Start studying smarter <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <div className="mt-6 text-[14px] tracking-wide text-foreground/80" style={{ opacity: seg(t, 27.5, 28.1) }}>
              tentraapp.com
            </div>
          </div>
        </Scene>

        {/* Brand rule: fixture-driven sessions are labelled. */}
        <div className="absolute top-5 left-1/2 z-50 -translate-x-1/2" style={{ opacity: 0.85 * env(t, 4.2, 22.0, 0.4) }}>
          <span className="rounded-full bg-card/70 px-2.5 py-1 text-[10px] tracking-wide text-muted-foreground">Illustrative session</span>
        </div>
      </div>
    </div>
  );
}
