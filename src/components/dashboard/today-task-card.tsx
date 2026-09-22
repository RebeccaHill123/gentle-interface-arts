// One planned task, as a card: what it is, how long, where it stands, and a
// single obvious action. Everything else lives in a discreet menu.
import { CalendarClock, CheckCircle2, Clock3, MoreHorizontal, NotebookPen, Play, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { activityLabel, evidenceChip } from "@/lib/plan/task-presentation";
import { taskState } from "@/lib/plan/today";
import type { ScheduledTask } from "@/lib/plan/types";

export interface TodayTaskCardProps {
  task: ScheduledTask;
  /** The first incomplete task gets the prominent action. */
  primary?: boolean;
  /** Short honest reason shown as a chip, e.g. "Scheduled for today". */
  reason?: string;
  onStart: (task: ScheduledTask) => void;
  onComplete: (task: ScheduledTask) => void;
  onLogElsewhere: (task: ScheduledTask) => void;
  onReschedule: (task: ScheduledTask) => void;
  onSkip: (task: ScheduledTask) => void;
}

const STATUS_STYLES: Record<string, string> = {
  "not-started": "bg-foreground/[0.05] text-muted-foreground",
  "in-progress": "bg-blue/10 text-blue",
  completed: "bg-pink/10 text-pink",
  skipped: "bg-violet/10 text-violet",
};

const STATUS_LABEL: Record<string, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  completed: "Complete",
  skipped: "Skipped",
};

export function TodayTaskCard(props: TodayTaskCardProps) {
  const { task, primary } = props;
  const state = taskState(task);
  const done = state === "completed";
  const remaining = Math.max(5, task.minutes - Math.round(task.partialMinutes ?? 0));

  return (
    <article
      className={`rounded-3xl border bg-card p-4 transition-colors md:p-5 ${
        primary ? "border-pink/40 shadow-card" : "border-border/50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground">
          {task.module}
        </span>
        <span className="rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground">
          {activityLabel(task)}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground">
          <Clock3 className="h-3 w-3" /> {task.minutes} min
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[state]}`}
        >
          {STATUS_LABEL[state]}
        </span>
      </div>

      <h3
        className={`mt-2.5 text-[15px] leading-snug ${
          done ? "text-muted-foreground line-through" : "text-foreground"
        }`}
      >
        {task.title}
      </h3>
      <p className="mt-1 text-[11.5px] text-muted-foreground">
        {task.subtopic ? `${task.subtopic} · ` : ""}
        {evidenceChip(task)}
      </p>
      {props.reason && (
        <p className="mt-2 inline-block rounded-full bg-pink/[0.08] px-2.5 py-1 text-[11px] font-medium text-pink">
          {props.reason}
        </p>
      )}
      {state === "in-progress" && (
        <p className="mt-2 text-[11.5px] text-muted-foreground">
          {Math.round(task.partialMinutes ?? 0)} min logged · about {remaining} min left
        </p>
      )}

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        {done ? (
          <p className="text-[12px] text-muted-foreground">
            {Math.round(task.actualMinutes ?? task.minutes)} min recorded.
          </p>
        ) : (
          <Button
            onClick={() => props.onStart(task)}
            size="lg"
            className={`min-h-12 w-full rounded-full ${
              primary
                ? "bg-gradient-pink-blue text-primary-foreground shadow-glow hover:brightness-[1.06]"
                : "border border-border/60 bg-background text-foreground hover:border-pink/40"
            }`}
          >
            <Play className="mr-2 h-4 w-4" />
            {state === "in-progress" ? `Continue · ${remaining} min` : `Start ${task.minutes}-min session`}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-pink/40 hover:text-foreground"
              aria-label={`More options for ${task.title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {!done && (
              <DropdownMenuItem onClick={() => props.onComplete(task)}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Mark complete
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => props.onLogElsewhere(task)}>
              <NotebookPen className="mr-2 h-4 w-4" /> Log study done elsewhere
            </DropdownMenuItem>
            {!done && (
              <>
                <DropdownMenuItem onClick={() => props.onReschedule(task)}>
                  <CalendarClock className="mr-2 h-4 w-4" /> Move to another day
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => props.onSkip(task)}>
                  <SkipForward className="mr-2 h-4 w-4" /> Skip this session
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
