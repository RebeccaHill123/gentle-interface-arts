import { defineTool } from "@lovable.dev/mcp-js";
import { loadPlan, requireAuth, todayIso, todaysTasks } from "../shared";

export default defineTool({
  name: "get_study_plan",
  title: "Get study plan",
  description:
    "Read-only. Returns the signed-in user's current Tentra study plan: overview, this week's focus, today's planned sessions (subject, topic, suggested duration, completion status), weekly strategy allocations, and mastery targets. Requires the user to be signed in.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const auth = requireAuth(ctx);
    if (auth) return auth;
    const { plan, error } = await loadPlan(ctx);
    if (error) return { content: [{ type: "text", text: error }], isError: true };
    if (!plan) {
      return {
        content: [
          {
            type: "text",
            text: "No study plan yet. Ask the user to complete onboarding in Tentra to generate one.",
          },
        ],
        structuredContent: { hasPlan: false },
      };
    }
    const completed = new Set(plan.completedTaskIds ?? []);
    const today = todayIso();
    const todayMinutes = (plan.sessions ?? [])
      .filter((s) => s.date === today)
      .reduce((a, s) => a + s.minutes, 0);

    const payload = {
      hasPlan: true,
      exam: {
        type: plan.input.examType,
        path: plan.input.examPath ?? null,
        examDate: plan.input.examDate ?? null,
      },
      targetHoursPerWeek: plan.input.hoursPerWeek,
      overview: plan.plan.overview,
      todaysSessions: todaysTasks(plan).map((t, i) => ({
        subject: t.module,
        topic: t.title,
        durationMinutes: t.minutes,
        priority: t.priority ?? null,
        why: t.why ?? null,
        completed: completed.has(String(i)),
      })),
      todayMinutesLogged: todayMinutes,
      thisWeeksFocus: plan.plan.weeklyFocus ?? [],
      weeklyStrategy: plan.plan.weeklyStrategy ?? null,
      masteryTargets: plan.plan.masteryTargets ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
