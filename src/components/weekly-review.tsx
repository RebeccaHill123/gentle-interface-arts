// Weekly review — an honest read of the last 7 days of scheduled work.
//
// Only schedule facts are used: minutes planned, minutes actually recorded
// against completed tasks, skips and their reasons. Accuracy claims are
// deliberately absent here; those live in Progress, sourced from graded work.
import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck2 } from "lucide-react";
import { SKIP_REASONS } from "@/lib/plan/task-presentation";
import type { PlanSchedule, ScheduledTask } from "@/lib/plan/types";
import { addDaysKey } from "@/lib/plan/dates";

export interface WeeklyReviewStats {
  plannedMinutes: number;
  completedMinutes: number;
  completedCount: number;
  plannedCount: number;
  skippedCount: number;
  topSkipReason: string | null;
  movedCount: number;
  strongestModule: string | null;
  neglectedModule: string | null;
}

export function computeWeeklyReview(
  tasks: ScheduledTask[],
  fromDate: string,
  toDate: string,
): WeeklyReviewStats {
  const window = tasks.filter((t) => t.date >= fromDate && t.date <= toDate);
  const completed = window.filter((t) => t.status === "completed");
  const skipped = window.filter((t) => t.status === "skipped");

  const perModuleDone = new Map<string, number>();
  const perModulePlanned = new Map<string, number>();
  for (const t of window) {
    perModulePlanned.set(t.module, (perModulePlanned.get(t.module) ?? 0) + t.minutes);
  }
  for (const t of completed) {
    perModuleDone.set(
      t.module,
      (perModuleDone.get(t.module) ?? 0) + (t.actualMinutes ?? t.minutes),
    );
  }

  let strongestModule: string | null = null;
  let best = 0;
  perModuleDone.forEach((m, name) => {
    if (m > best) {
      best = m;
      strongestModule = name;
    }
  });

  let neglectedModule: string | null = null;
  let worstRatio = 1;
  perModulePlanned.forEach((planned, name) => {
    const doneMins = perModuleDone.get(name) ?? 0;
    const ratio = planned > 0 ? doneMins / planned : 1;
    if (ratio < worstRatio) {
      worstRatio = ratio;
      neglectedModule = name;
    }
  });
  if (worstRatio >= 1) neglectedModule = null;

  const reasonCounts = new Map<string, number>();
  for (const t of skipped) {
    if (!t.skipReason) continue;
    reasonCounts.set(t.skipReason, (reasonCounts.get(t.skipReason) ?? 0) + 1);
  }
  let topSkipReason: string | null = null;
  let topCount = 0;
  reasonCounts.forEach((c, id) => {
    if (c > topCount) {
      topCount = c;
      topSkipReason = SKIP_REASONS.find((r) => r.id === id)?.label ?? id;
    }
  });

  return {
    plannedMinutes: window.reduce((a, t) => a + t.minutes, 0),
    completedMinutes: completed.reduce((a, t) => a + (t.actualMinutes ?? t.minutes), 0),
    completedCount: completed.length,
    plannedCount: window.length,
    skippedCount: skipped.length,
    topSkipReason,
    movedCount: window.filter((t) => !!t.movedFrom).length,
    strongestModule,
    neglectedModule,
  };
}

export function WeeklyReview({ schedule, today }: { schedule: PlanSchedule; today: string }) {
  const from = addDaysKey(today, -6);
  const stats = useMemo(
    () => computeWeeklyReview(schedule.tasks, from, today),
    [schedule.tasks, from, today],
  );

  const pct =
    stats.plannedMinutes > 0
      ? Math.round((stats.completedMinutes / stats.plannedMinutes) * 100)
      : 0;

  return (
    <section className="rounded-3xl border border-border/50 bg-card p-5 shadow-card">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-[14px] font-medium text-foreground">
          <CalendarCheck2 className="h-3.5 w-3.5 text-pink" />
          <span className="truncate">Last 7 days</span>
        </h2>
        <span className="shrink-0 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground">
          {pct}% of planned time
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat
          label="Time recorded"
          value={`${stats.completedMinutes} min`}
          sub={`of ${stats.plannedMinutes} min planned`}
        />
        <Stat
          label="Sessions"
          value={`${stats.completedCount}/${stats.plannedCount}`}
          sub={stats.skippedCount > 0 ? `${stats.skippedCount} skipped` : "none skipped"}
        />
        <Stat
          label="Moved"
          value={String(stats.movedCount)}
          sub={stats.movedCount > 0 ? "rescheduled, not lost" : "nothing rescheduled"}
        />
      </div>

      <ul className="mt-4 space-y-1.5 text-[12.5px] text-muted-foreground">
        {stats.strongestModule && (
          <li>
            Most time went to{" "}
            <span className="font-medium text-foreground">{stats.strongestModule}</span>.
          </li>
        )}
        {stats.neglectedModule && (
          <li>
            <span className="font-medium text-foreground">{stats.neglectedModule}</span> fell behind
            its planned time — Tentra will weight it in your next update.
          </li>
        )}
        {stats.topSkipReason && (
          <li>
            Most common skip reason:{" "}
            <span className="font-medium text-foreground">{stats.topSkipReason}</span>.
          </li>
        )}
        {stats.plannedCount === 0 && <li>No sessions were scheduled in this window.</li>}
      </ul>

      <Link
        to="/analytics"
        className="mt-4 inline-flex items-center gap-1 text-[12px] font-medium text-pink"
      >
        See graded performance <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-background/60 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-lg text-foreground">{value}</div>
      <div className="mt-0.5 text-[11.5px] text-muted-foreground">{sub}</div>
    </div>
  );
}
