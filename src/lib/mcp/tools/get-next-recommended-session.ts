import { defineTool } from "@lovable.dev/mcp-js";
import {
  buildSnapshot,
  daysBetween,
  loadPlan,
  loadProfile,
  requireAuth,
  todayIso,
  todaysTasks,
} from "../shared";

export default defineTool({
  name: "get_next_recommended_session",
  title: "Get next recommended session",
  description:
    "Read-only. Suggests one practical next study session for the signed-in user, factoring in today's plan, missed sessions, recent activity, weak areas and days remaining to the exam. Returns subject, topic, duration, format and the reason it was chosen. Requires the user to be signed in.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const auth = requireAuth(ctx);
    if (auth) return auth;
    const [{ plan }, { profile }] = await Promise.all([loadPlan(ctx), loadProfile(ctx)]);
    if (!plan) {
      return {
        content: [
          { type: "text", text: "No plan yet — ask the user to complete onboarding." },
        ],
        structuredContent: { recommendation: null },
      };
    }
    const { analytics } = buildSnapshot(plan, profile);
    const daysToExam = plan.input.examDate
      ? daysBetween(todayIso(), plan.input.examDate)
      : null;

    // 1) First, an unfinished task from today's plan.
    const completed = new Set(plan.completedTaskIds ?? []);
    const todays = todaysTasks(plan);
    const openToday = todays.findIndex((_, i) => !completed.has(String(i)));
    if (openToday >= 0) {
      const t = todays[openToday];
      const payload = {
        subject: t.module,
        topic: t.title,
        durationMinutes: t.minutes,
        format:
          t.taskType === "timed-sba"
            ? "MCQs"
            : t.taskType === "mistake-review"
              ? "review"
              : t.taskType === "mixed-mock"
                ? "mini test"
                : "study",
        reason:
          t.why ??
          `On today's plan (${t.priority ?? "medium"} priority). ${daysToExam !== null ? `${daysToExam}d to exam.` : ""}`,
        source: "todays-plan",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    // 2) Otherwise weakest / at-risk subject → suggest a session.
    const target = analytics.atRisk[0] ?? analytics.weakest[0];
    if (target) {
      const shortWindow = (daysToExam ?? 999) < 21;
      const format = target.accuracy !== null && target.accuracy < 60 ? "mini test" : "review";
      const duration = shortWindow ? 45 : 60;
      const payload = {
        subject: target.module,
        topic: null as string | null,
        durationMinutes: duration,
        format,
        reason: `Weak area — confidence ${target.confidence}/5, ${
          target.recencyDays ?? "no"
        } days since last touched${
          target.accuracy !== null ? `, accuracy ${target.accuracy.toFixed(0)}%` : ""
        }. ${daysToExam !== null ? `${daysToExam}d to exam.` : ""}`,
        source: "weak-area",
      };
      return {
        content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    }

    // 3) Fallback — light review.
    const payload = {
      subject: plan.input.modules[0]?.name ?? "Any module",
      topic: null,
      durationMinutes: 30,
      format: "review",
      reason: "Nothing pressing — take a light review session to keep the streak alive.",
      source: "fallback",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
