// Today's header: date, greeting, planned vs done time and one progress bar.
// Deliberately light on statistics — the weekly line sits quietly underneath.
import { dayTotals, greetingFor } from "@/lib/plan/today";
import type { ScheduledTask } from "@/lib/plan/types";

export function TodayHeader({
  firstName,
  today,
  examLabel,
  daysUntilExam,
  tasks,
  weeklyDoneMins,
  weeklyTargetMins,
}: {
  firstName?: string;
  today: string;
  examLabel: string;
  daysUntilExam: number | null;
  tasks: ScheduledTask[];
  weeklyDoneMins: number;
  weeklyTargetMins: number;
}) {
  const totals = dayTotals(tasks);
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const weeklyPct =
    weeklyTargetMins > 0
      ? Math.min(100, Math.round((weeklyDoneMins / weeklyTargetMins) * 100))
      : 0;

  return (
    <header className="rounded-3xl border border-border/50 bg-card p-5 shadow-card md:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl tracking-[-0.01em] text-foreground sm:text-2xl">
            Today
          </h2>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">
            {dateLabel} · {greetingFor(firstName)}
          </p>
        </div>
        {daysUntilExam !== null ? (
          <span className="shrink-0 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground">
            {daysUntilExam} days to {examLabel}
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground">
            {examLabel}
          </span>
        )}
      </div>

      {totals.taskCount > 0 && (
        <div className="mt-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
            <p className="min-w-0 text-[13px] text-foreground">
              <span className="font-medium">{totals.plannedMinutes} min planned</span>
              <span className="text-muted-foreground">
                {" "}
                · {totals.doneMinutes} min done
              </span>
            </p>
            <span className="shrink-0 text-[11.5px] text-muted-foreground">
              {totals.completedCount}/{totals.taskCount} sessions
            </span>
          </div>
          <div
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={totals.percent}
            aria-label="Today's study progress"
          >
            <div
              className="h-full rounded-full bg-gradient-pink-blue transition-all"
              style={{ width: `${totals.percent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            This week: {weeklyDoneMins} of {weeklyTargetMins} min ({weeklyPct}%)
          </p>
        </div>
      )}
    </header>
  );
}
