// The Today panel — Tentra's daily execution surface.
//
// It answers, in order: what should I do next, why does it matter, how long
// will it take, how do I do it, and what happens when I finish. Everything
// shown is derived from the adaptive schedule and its stored provenance.
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  activityLabel,
  evidenceChip,
  expectedOutput,
  howToDoIt,
  recommendedNext,
} from "@/lib/plan/task-presentation";
import type { ScheduledTask } from "@/lib/plan/types";

export interface TodayPanelProps {
  firstName?: string;
  examLabel: string;
  today: string;
  daysUntilExam: number | null;
  tasks: ScheduledTask[];
  missed: ScheduledTask[];
  daysSinceLastActivity: number | null;
  weeklyDoneMins: number;
  weeklyTargetMins: number;
  activeSessionTitle?: string;
  onResumeSession?: () => void;
  onStart: (task: ScheduledTask) => void;
  onComplete: (task: ScheduledTask) => void;
  onSkip: (task: ScheduledTask) => void;
  onReschedule: (task: ScheduledTask) => void;
  onRecoverMissed: () => void;
  onGeneratePlan?: () => void;
}

function greeting(name?: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return name ? `${part}, ${name.split(" ")[0]}` : part;
}

export function TodayPanel(props: TodayPanelProps) {
  const {
    tasks,
    missed,
    daysUntilExam,
    weeklyDoneMins,
    weeklyTargetMins,
    daysSinceLastActivity,
  } = props;

  const open = tasks.filter((t) => t.status === "scheduled");
  const done = tasks.filter((t) => t.status === "completed");
  const skipped = tasks.filter((t) => t.status === "skipped");
  const next = useMemo(() => recommendedNext(tasks), [tasks]);
  const plannedMins = tasks.reduce((a, t) => a + t.minutes, 0);
  const doneMins = done.reduce((a, t) => a + (t.actualMinutes ?? t.minutes), 0);
  const allDone = tasks.length > 0 && open.length === 0;

  return (
    <section className="space-y-4">
      {/* Header */}
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-display text-xl tracking-[-0.01em] text-foreground sm:text-2xl">
            {greeting(props.firstName)}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {new Date(`${props.today}T12:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {tasks.length > 0
              ? ` · ${plannedMins} min planned · ${doneMins} min done`
              : ` · ${props.examLabel} route`}
          </p>
        </div>
        {daysUntilExam !== null && (
          <span className="shrink-0 rounded-full border border-border/60 bg-card px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground">
            {daysUntilExam} days to exam
          </span>
        )}
      </header>

      {/* Live session */}
      {props.activeSessionTitle && (
        <button
          type="button"
          onClick={props.onResumeSession}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-pink/40 bg-pink/[0.06] px-4 py-3 text-left"
        >
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-pink">
              Session in progress
            </div>
            <div className="mt-0.5 truncate text-[13.5px] text-foreground">
              {props.activeSessionTitle}
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-pink/15 px-3 py-1.5 text-[12px] font-medium text-pink">
            Resume
          </span>
        </button>
      )}

      {/* Recovery: missed work / return after inactivity */}
      {(missed.length > 0 || (daysSinceLastActivity ?? 0) >= 4) && (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
            <RotateCcw className="h-3.5 w-3.5 text-violet" />
            {missed.length > 0
              ? `${missed.length} session${missed.length === 1 ? "" : "s"} from earlier days are still open`
              : `Welcome back — it's been ${daysSinceLastActivity} days`}
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Tentra won't pile it all onto today. Rebuild the rest of your plan around the
            time you actually have left.
          </p>
          <Button
            onClick={props.onRecoverMissed}
            variant="outline"
            className="mt-3 min-h-11 rounded-full"
          >
            Rebuild my upcoming plan
          </Button>
        </div>
      )}

      {/* Recommended next */}
      {next ? (
        <article className="relative overflow-hidden rounded-3xl border border-border/50 bg-card p-5 shadow-card md:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-pink-blue opacity-[0.08] blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-pink/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-pink">
                <Target className="h-3 w-3" /> Do this next
              </span>
              <span className="rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground">
                {activityLabel(next)}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground">
                <Clock3 className="h-3 w-3" /> {next.minutes} min
              </span>
            </div>

            <h3 className="mt-3 font-display text-lg tracking-[-0.01em] text-foreground md:text-xl">
              {next.title}
            </h3>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              {next.module}
              {next.subtopic ? ` · ${next.subtopic}` : ""} · {evidenceChip(next)}
            </p>

            {next.why && (
              <p className="mt-3 rounded-xl border border-border/50 bg-background/60 p-3 text-[12.5px] text-foreground/90">
                {next.why}
              </p>
            )}

            <div className="mt-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                How to do it
              </div>
              <ol className="mt-2 space-y-1.5">
                {howToDoIt(next).map((step, i) => (
                  <li key={i} className="flex gap-2 text-[12.5px] text-muted-foreground">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-foreground/[0.06] text-[10px] font-semibold text-foreground">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground">You'll finish with: </span>
                {expectedOutput(next)}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => props.onStart(next)}
                size="lg"
                className="min-h-12 flex-1 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:brightness-[1.06]"
              >
                <Play className="mr-2 h-4 w-4" /> Start {next.minutes}-min session
              </Button>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <Button
                  onClick={() => props.onReschedule(next)}
                  variant="outline"
                  size="lg"
                  className="min-h-12 rounded-full"
                >
                  <CalendarClock className="mr-1.5 h-4 w-4" /> Move
                </Button>
                <Button
                  onClick={() => props.onSkip(next)}
                  variant="outline"
                  size="lg"
                  className="min-h-12 rounded-full"
                >
                  <SkipForward className="mr-1.5 h-4 w-4" /> Skip
                </Button>
              </div>
            </div>
          </div>
        </article>
      ) : allDone ? (
        <article className="rounded-3xl border border-border/50 bg-card p-6 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-6 w-6 text-pink" />
          <h3 className="mt-2 font-display text-lg text-foreground">Today is done</h3>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted-foreground">
            {doneMins} minutes logged across {done.length} session
            {done.length === 1 ? "" : "s"}. Everything else stays where it is — you're ahead,
            not behind.
          </p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
            <Link
              to="/plan"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/60 px-4 text-[13px] font-medium text-foreground hover:border-pink/40"
            >
              See tomorrow's plan
            </Link>
            <Link
              to="/practice"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border/60 px-4 text-[13px] font-medium text-foreground hover:border-pink/40"
            >
              Optional extra practice
            </Link>
          </div>
        </article>
      ) : (
        <article className="rounded-3xl border border-dashed border-border/60 bg-card p-6 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-pink" />
          <h3 className="mt-2 text-sm font-medium text-foreground">No plan yet</h3>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted-foreground">
            Tentra schedules your study around your exam date and the hours you actually
            have.
          </p>
          {props.onGeneratePlan && (
            <Button
              onClick={props.onGeneratePlan}
              className="mt-4 min-h-11 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
            >
              Build my plan
            </Button>
          )}
        </article>
      )}

      {/* Rest of today */}
      {tasks.length > 0 && (
        <div className="rounded-3xl border border-border/50 bg-card p-5 shadow-card">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <h3 className="truncate text-[13.5px] font-medium text-foreground">
              Rest of today
            </h3>
            <span className="shrink-0 text-[11.5px] text-muted-foreground">
              {done.length}/{tasks.length} done
              {skipped.length > 0 ? ` · ${skipped.length} skipped` : ""}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-pink-blue transition-all"
              style={{
                width: `${Math.min(100, Math.round((done.length / Math.max(1, tasks.length)) * 100))}%`,
              }}
            />
          </div>

          <ul className="mt-4 space-y-2">
            {tasks
              .filter((t) => t.id !== next?.id)
              .map((t) => (
                <li
                  key={t.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/50 bg-background/60 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <div
                      className={`truncate text-[13px] ${
                        t.status === "completed"
                          ? "text-muted-foreground line-through"
                          : "text-foreground"
                      }`}
                    >
                      {t.title}
                    </div>
                    <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                      {activityLabel(t)} · {t.minutes} min · {evidenceChip(t)}
                    </div>
                  </div>
                  {t.status === "scheduled" ? (
                    <button
                      type="button"
                      onClick={() => props.onStart(t)}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-pink/50 hover:text-pink"
                      aria-label={`Start ${t.title}`}
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  ) : t.status === "completed" ? (
                    <span className="shrink-0 rounded-full bg-pink/10 px-2.5 py-1 text-[11px] font-medium text-pink">
                      Done
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => props.onReschedule(t)}
                      className="shrink-0 rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Skipped · move
                    </button>
                  )}
                </li>
              ))}
          </ul>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-border/50 pt-3">
            <p className="min-w-0 text-[11.5px] text-muted-foreground">
              This week: {weeklyDoneMins} of {weeklyTargetMins} min
            </p>
            <Link
              to="/plan"
              className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-pink"
            >
              Full plan <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
