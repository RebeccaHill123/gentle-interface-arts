// Removes subjects an exam body has retired from a saved plan's future work.
// Completed tasks and logged sessions are kept so history is never lost.
import type { StoredPlan } from "@/lib/plan-store";
import { isRetiredUbeSubject } from "@/lib/ube-syllabus";

function isUbePlan(plan: StoredPlan): boolean {
  const path = plan.input.examPath ?? "";
  return plan.input.examType === "UBE" || path.startsWith("UBE_");
}

export function stripRetiredUbeSubjects(plan: StoredPlan): StoredPlan {
  if (!isUbePlan(plan)) return plan;
  const keep = (m?: string) => !isRetiredUbeSubject(m);

  const schedule = plan.schedule as
    | { tasks?: Array<{ module?: string; status?: string }> }
    | undefined;
  const nextSchedule =
    schedule && Array.isArray(schedule.tasks)
      ? {
          ...schedule,
          tasks: schedule.tasks.filter((t) => t.status === "done" || keep(t.module)),
        }
      : plan.schedule;

  const weeklyStrategy = plan.plan.weeklyStrategy
    ? {
        ...plan.plan.weeklyStrategy,
        allocations: (plan.plan.weeklyStrategy.allocations ?? []).filter((a) => keep(a.module)),
      }
    : undefined;

  return {
    ...plan,
    input: { ...plan.input, modules: plan.input.modules.filter((m) => keep(m.name)) },
    plan: {
      ...plan.plan,
      todayTasks: plan.plan.todayTasks.filter((t) => keep(t.module)),
      weeklyFocus: plan.plan.weeklyFocus.map((w) => ({
        ...w,
        modules: (w.modules ?? []).filter((m) => keep(m)),
      })),
      masteryTargets: plan.plan.masteryTargets.filter((t) => keep(t.module)),
      ...(weeklyStrategy ? { weeklyStrategy } : {}),
    },
    schedule: nextSchedule,
  };
}
