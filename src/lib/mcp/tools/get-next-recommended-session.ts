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
    "Read-only. Suggests one practical next study session for the signed-in user, factoring in today's plan, missed sessions, and evidence-led weak areas (low graded accuracy, no coverage, or self-rated low confidence — in that priority order). Returns subject, topic, duration, format and the reason it was chosen, including graded accuracy with its sample size when available. Never suggests a predicted score, readiness score or mastery figure, and does not claim the plan recalibrates automatically. Requires the user to be signed in.",
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

    // 2) Otherwise evidence-led: low graded accuracy first, then no-coverage,
    // then self-rated-low. Never by minutes studied or mood.
    let attentionItem = analytics.needsAttention[0];
    if (!attentionItem && analytics.graded.perSubject.length > 0) {
      const worst = analytics.graded.perSubject[0];
      attentionItem = {
        module: worst.subject,
        evidence: "low-graded-accuracy",
        detail: `${worst.accuracy}% correct across ${worst.attempted} graded questions.`,
        sampleSize: worst.attempted,
      };
    }
    const target = attentionItem
      ? analytics.subjects.find((s) => s.module === attentionItem!.module)
      : undefined;

    if (attentionItem && target) {
      const shortWindow = (daysToExam ?? 999) < 21;
      const format =
        target.accuracy !== null && target.accuracy < 60 ? "mini test" : "review";
      const duration = shortWindow ? 45 : 60;
      const payload = {
        subject: target.module,
        topic: null as string | null,
        durationMinutes: duration,
        format,
        reason: `${attentionItem.detail} ${
          target.recencyDays !== null ? `Last touched ${target.recencyDays} days ago.` : ""
        } ${daysToExam !== null ? `${daysToExam}d to exam.` : ""}`.trim(),
        source: attentionItem.evidence,
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
      reason: "No graded evidence yet and no coverage gaps flagged — take a light review session to keep the streak alive.",
      source: "fallback",
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
