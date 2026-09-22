// The Today panel — Tentra's daily execution surface.
//
// It answers, in order: what should I do next and why, how long it takes, how
// to do it, and what happens when the day doesn't go to plan. Everything shown
// is derived from the adaptive schedule and its stored provenance.
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  NotebookPen,
  Play,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TodayHeader } from "@/components/dashboard/today-header";
import { TodayTaskCard } from "@/components/dashboard/today-task-card";
import { expectedOutput, howToDoIt } from "@/lib/plan/task-presentation";
import { dayTotals, taskState } from "@/lib/plan/today";
import { pickUpNext } from "@/lib/plan/up-next";
import type { AnalyticsBundle } from "@/lib/analytics-derive";
import type { ScheduledTask } from "@/lib/plan/types";

export interface TodayPanelProps {
  firstName?: string;
  examLabel: string;
  today: string;
  daysUntilExam: number | null;
  tasks: ScheduledTask[];
  missed: ScheduledTask[];
  /** Open tasks after today, schedule order — used for "next in your plan". */
  upcoming?: ScheduledTask[];
  analytics?: AnalyticsBundle | null;
  daysSinceLastActivity: number | null;
  weeklyDoneMins: number;
  weeklyTargetMins: number;
  activeSessionTitle?: string;
  onResumeSession?: () => void;
  onStart: (task: ScheduledTask) => void;
  onComplete: (task: ScheduledTask) => void;
  onSkip: (task: ScheduledTask) => void;
  onReschedule: (task: ScheduledTask) => void;
  onLogElsewhere: (task?: ScheduledTask) => void;
  onFreeSession?: () => void;
  /** Pull the next planned session forward into today. */
  onAddTaskToday?: () => void;
  onRecoverMissed: () => void;
  onGeneratePlan?: () => void;
}

export function TodayPanel(props: TodayPanelProps) {
  const { tasks, missed, daysSinceLastActivity } = props;

  const totals = dayTotals(tasks);
  const upNext = useMemo(
    () => pickUpNext(tasks, missed, props.upcoming ?? [], props.analytics ?? null),
    [tasks, missed, props.upcoming, props.analytics],
  );
  const next = upNext?.task;
  const rest = tasks.filter((t) => t.id !== next?.id);

  return (
    <section className="space-y-4">
      <TodayHeader
        firstName={props.firstName}
        today={props.today}
        examLabel={props.examLabel}
        daysUntilExam={props.daysUntilExam}
        tasks={tasks}
        weeklyDoneMins={props.weeklyDoneMins}
        weeklyTargetMins={props.weeklyTargetMins}
      />

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
            Tentra won't pile it all onto today. Rebuild the rest of your plan around the time you
            actually have left.
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

      {/* Up next */}
      {next && (
        <article className="relative overflow-hidden rounded-3xl border border-border/50 bg-card p-5 shadow-card md:p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-gradient-pink-blue opacity-[0.08] blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-pink/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-pink">
              <Target className="h-3 w-3" /> Recommended next
            </span>

            <div className="mt-3">
              <TodayTaskCard
                task={next}
                primary
                reason={upNext?.reason}
                onStart={props.onStart}
                onComplete={props.onComplete}
                onLogElsewhere={props.onLogElsewhere}
                onReschedule={props.onReschedule}
                onSkip={props.onSkip}
              />
            </div>

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
          </div>
        </article>
      )}

      {/* Today's study plan */}
      {rest.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1">
            <h3 className="truncate text-[13.5px] font-medium text-foreground">
              {next ? "Rest of today" : "Today's study plan"}
            </h3>
            <span className="shrink-0 text-[11.5px] text-muted-foreground">
              {totals.completedCount}/{totals.taskCount} done
              {totals.skippedCount > 0 ? ` · ${totals.skippedCount} skipped` : ""}
            </span>
          </div>
          {rest.map((t) => (
            <TodayTaskCard
              key={t.id}
              task={t}
              onStart={props.onStart}
              onComplete={props.onComplete}
              onLogElsewhere={props.onLogElsewhere}
              onReschedule={props.onReschedule}
              onSkip={props.onSkip}
            />
          ))}
        </div>
      )}

      {/* Day complete */}
      {!next && totals.allSettled && (
        <article className="rounded-3xl border border-border/50 bg-card p-6 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-6 w-6 text-pink" />
          <h3 className="mt-2 font-display text-lg text-foreground">Today is done</h3>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted-foreground">
            {totals.doneMinutes} minutes logged across {totals.completedCount} session
            {totals.completedCount === 1 ? "" : "s"}. This week you're at {props.weeklyDoneMins} of{" "}
            {props.weeklyTargetMins} min. Nothing else is needed today.
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
      )}

      {/* Nothing scheduled at all */}
      {!next && totals.taskCount === 0 && (
        <article className="rounded-3xl border border-dashed border-border/60 bg-card p-6 text-center">
          <Sparkles className="mx-auto h-5 w-5 text-pink" />
          <h3 className="mt-2 text-sm font-medium text-foreground">Nothing scheduled for today</h3>
          <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted-foreground">
            You can still study — pick one of these, or look at the wider plan.
          </p>
          <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row sm:flex-wrap">
            {props.onFreeSession && (
              <Button
                onClick={props.onFreeSession}
                className="min-h-11 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
              >
                <Play className="mr-2 h-4 w-4" /> Start a free session
              </Button>
            )}
            {props.onAddTaskToday && (
              <Button
                onClick={props.onAddTaskToday}
                variant="outline"
                className="min-h-11 rounded-full"
              >
                Add a session to today
              </Button>
            )}
            <Button
              onClick={() => props.onLogElsewhere()}
              variant="outline"
              className="min-h-11 rounded-full"
            >
              <NotebookPen className="mr-2 h-4 w-4" /> Log study done elsewhere
            </Button>
            {props.onGeneratePlan && (
              <Button
                onClick={props.onGeneratePlan}
                variant="outline"
                className="min-h-11 rounded-full"
              >
                Build my plan
              </Button>
            )}
          </div>
        </article>
      )}

      {totals.taskCount > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-1">
          <button
            type="button"
            onClick={() => props.onLogElsewhere()}
            className="min-w-0 text-left text-[12px] font-medium text-muted-foreground hover:text-foreground"
          >
            Studied outside Tentra? Log it
          </button>
          <Link
            to="/plan"
            className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-pink"
          >
            Full plan <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </section>
  );
}

/** Re-exported so callers can label buttons consistently. */
export { taskState };
