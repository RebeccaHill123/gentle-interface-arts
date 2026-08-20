// The Plan tab — the schedule beyond today, plus the audit trail of changes.
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CalendarClock, Compass, History } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { WeeklyReview } from "@/components/weekly-review";
import { RescheduleSheet, SkipReasonSheet } from "@/components/plan-action-sheets";
import { activityLabel, evidenceChip } from "@/lib/plan/task-presentation";
import {
  getSchedule,
  missedTasks,
  rescheduleScheduledTask,
  scheduleCapacity,
  skipScheduledTask,
  upcomingTasks,
} from "@/lib/plan/store";
import type { PlanSchedule, ScheduledTask, SkipReason } from "@/lib/plan/types";
import { loadPlan, pullPlanFromCloud, type StoredPlan } from "@/lib/plan-store";
import { localDateFor } from "@/lib/study-log";
import { getExamLabel } from "@/lib/exam-label";
import { toast } from "sonner";

export const Route = createFileRoute("/plan")({
  beforeLoad: async () => {
    const { requireAccess } = await import("@/lib/access-guard");
    await requireAccess();
  },
  component: PlanPage,
  head: () => ({
    meta: [
      { title: "Your study plan · Tentra" },
      {
        name: "description",
        content: "Your upcoming study schedule, weekly review and plan change history.",
      },
      { property: "og:title", content: "Your study plan · Tentra" },
      {
        property: "og:description",
        content: "See what Tentra has scheduled next and why it changed.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function PlanPage() {
  const navigate = useNavigate();
  const [stored, setStored] = useState<StoredPlan | null>(null);
  const [tick, setTick] = useState(0);
  const [skipTask, setSkipTask] = useState<ScheduledTask | null>(null);
  const [moveTask, setMoveTask] = useState<ScheduledTask | null>(null);

  useEffect(() => {
    let active = true;
    void pullPlanFromCloud().then((cloud) => {
      if (!active) return;
      setStored(cloud ?? loadPlan());
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (tick === 0) return;
    setStored(loadPlan());
  }, [tick]);

  const schedule: PlanSchedule | null = getSchedule(stored);
  const today = localDateFor();
  const upcoming = useMemo(
    () => (schedule ? upcomingTasks(schedule, today, 14) : []),
    [schedule, today],
  );
  const missed = useMemo(() => missedTasks(schedule, today), [schedule, today]);
  const capacity = useMemo(() => scheduleCapacity(schedule, today, 10), [schedule, today]);
  const examLabel = getExamLabel(stored?.input.examType, stored?.input.examPath);

  const byDate = useMemo(() => {
    const map = new Map<string, ScheduledTask[]>();
    for (const t of [...missed, ...upcoming]) {
      const list = map.get(t.date) ?? [];
      list.push(t);
      map.set(t.date, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [missed, upcoming]);

  const handleSkip = (reason: SkipReason) => {
    const id = skipTask?.id;
    setSkipTask(null);
    if (!id) return;
    void skipScheduledTask(id, reason).then(() => {
      setTick((t) => t + 1);
      toast.success("Skipped — Tentra will factor that into your next update.");
    });
  };

  const handleMove = (date: string) => {
    const task = moveTask;
    setMoveTask(null);
    if (!task) return;
    void rescheduleScheduledTask(task.id, date).then((res) => {
      if (!res.ok) {
        toast.error(res.reason ?? "Couldn't move that session.");
        return;
      }
      setTick((t) => t + 1);
      toast.success("Session moved.");
    });
  };

  return (
    <AppShell title="Plan" subtitle={`Your ${examLabel} schedule and what changed.`}>
      <div className="space-y-6">
        {schedule ? (
          <>
            <WeeklyReview schedule={schedule} today={today} />

            <section className="rounded-3xl border border-border/50 bg-card p-5 shadow-card">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <h2 className="truncate text-[14px] font-medium text-foreground">Next 14 days</h2>
                <Link
                  to="/topics"
                  className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-pink"
                >
                  <Compass className="h-3 w-3" /> Topic map
                </Link>
              </div>

              <div className="mt-4 space-y-5">
                {byDate.map(([date, tasks]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2">
                      <h3 className="text-[12.5px] font-semibold text-foreground">
                        {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}
                      </h3>
                      {date < today && (
                        <span className="rounded-full bg-violet/10 px-2 py-0.5 text-[10.5px] font-medium text-violet">
                          Missed
                        </span>
                      )}
                      {date === today && (
                        <span className="rounded-full bg-pink/10 px-2 py-0.5 text-[10.5px] font-medium text-pink">
                          Today
                        </span>
                      )}
                    </div>
                    <ul className="mt-2 space-y-2">
                      {tasks.map((t) => (
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
                            <div className="flex shrink-0 gap-1.5">
                              <button
                                type="button"
                                onClick={() => setMoveTask(t)}
                                className="min-h-11 rounded-full border border-border/60 px-3 text-[11.5px] text-muted-foreground hover:text-foreground"
                              >
                                Move
                              </button>
                              <button
                                type="button"
                                onClick={() => setSkipTask(t)}
                                className="min-h-11 rounded-full border border-border/60 px-3 text-[11.5px] text-muted-foreground hover:text-foreground"
                              >
                                Skip
                              </button>
                            </div>
                          ) : (
                            <span className="shrink-0 rounded-full bg-foreground/[0.05] px-2.5 py-1 text-[11px] text-muted-foreground">
                              {t.status === "completed" ? "Done" : "Skipped"}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {byDate.length === 0 && (
                  <p className="text-[12.5px] text-muted-foreground">
                    Nothing scheduled in the next two weeks.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-border/50 bg-card p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-[14px] font-medium text-foreground">
                <History className="h-3.5 w-3.5 text-violet" /> Plan change history
              </h2>
              <ul className="mt-3 space-y-3">
                {[...schedule.revisions]
                  .reverse()
                  .slice(0, 8)
                  .map((r) => (
                    <li key={r.version} className="rounded-2xl border border-border/50 p-3">
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                        <p className="min-w-0 text-[12.5px] text-foreground">{r.summary}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          v{r.version}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(r.at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {r.trigger.replace(/-/g, " ")}
                      </p>
                    </li>
                  ))}
                {schedule.revisions.length === 0 && (
                  <li className="text-[12.5px] text-muted-foreground">No changes yet.</li>
                )}
              </ul>
            </section>
          </>
        ) : (
          <section className="rounded-3xl border border-dashed border-border/60 bg-card p-8 text-center">
            <CalendarClock className="mx-auto h-5 w-5 text-pink" />
            <h2 className="mt-2 text-sm font-medium text-foreground">No plan yet</h2>
            <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted-foreground">
              Build your plan and Tentra will schedule your study around your exam date.
            </p>
            <button
              type="button"
              onClick={() => navigate({ to: "/onboarding" })}
              className="mt-4 min-h-11 rounded-full bg-gradient-pink-blue px-5 text-[13px] font-medium text-primary-foreground shadow-glow"
            >
              Build my plan
            </button>
          </section>
        )}
      </div>

      <SkipReasonSheet
        open={!!skipTask}
        taskTitle={skipTask?.title}
        onCancel={() => setSkipTask(null)}
        onSkip={handleSkip}
      />
      <RescheduleSheet
        open={!!moveTask}
        taskTitle={moveTask?.title}
        taskMinutes={moveTask?.minutes ?? 30}
        days={capacity}
        today={today}
        onCancel={() => setMoveTask(null)}
        onPick={handleMove}
      />
    </AppShell>
  );
}
