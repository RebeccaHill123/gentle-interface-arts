// Today's header: date, greeting, planned vs done time and one progress bar.
// Deliberately light on statistics — the weekly line sits quietly underneath.
import { dayTotals, greetingFor } from "@/lib/plan/today";
import { computePace } from "@/lib/plan/pace";
import type { ScheduledTask } from "@/lib/plan/types";

export function TodayHeader({
  firstName,
  today,
  examLabel,
  daysUntilExam,
  tasks,
  weeklyDoneMins,
  weeklyTargetMins,
  missedCount = 0,
}: {
  firstName?: string;
  today: string;
  examLabel: string;
  daysUntilExam: number | null;
  tasks: ScheduledTask[];
  weeklyDoneMins: number;
  weeklyTargetMins: number;
  missedCount?: number;
}) {
  const totals = dayTotals(tasks);
  const pace = computePace({ missedCount, weeklyDoneMins, weeklyTargetMins });
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
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11.5px] font-medium text-muted-foreground">
            {daysUntilExam !== null ? `${daysUntilExam} days to ${examLabel}` : examLabel}
          </span>
          <span
            title={pace.detail}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              pace.status === "on-track"
                ? "bg-violet/10 text-violet"
                : "bg-pink/10 text-pink"
            }`}
          >
            {pace.label}
          </span>
        </div>
      </div>
      <p className="mt-2 text-[11.5px] text-muted-foreground">{pace.detail}</p>

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
