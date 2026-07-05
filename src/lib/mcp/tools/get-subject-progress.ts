import { defineTool } from "@lovable.dev/mcp-js";
import { buildSnapshot, loadPlan, loadProfile, requireAuth } from "../shared";

export default defineTool({
  name: "get_subject_progress",
  title: "Get subject progress",
  description:
    "Read-only. Returns per-subject progress derived from the signed-in user's study activity: total minutes studied, confidence, recency (days since last session), estimated accuracy trend, and syllabus weight. Requires the user to be signed in.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const auth = requireAuth(ctx);
    if (auth) return auth;
    const [{ plan }, { profile }] = await Promise.all([loadPlan(ctx), loadProfile(ctx)]);
    if (!plan) {
      return {
        content: [
          {
            type: "text",
            text: "No study plan yet. Ask the user to complete onboarding to unlock subject progress.",
          },
        ],
        structuredContent: { subjects: [] },
      };
    }
    const { analytics } = buildSnapshot(plan, profile);
    if (!analytics.hasAnyData) {
      return {
        content: [
          { type: "text", text: "Not enough study data yet — encourage the user to log more sessions." },
        ],
        structuredContent: { subjects: [] },
      };
    }
    const payload = {
      totalSessions: analytics.totalSessions,
      totalLoggedMinutes: analytics.totalLoggedMinutes,
      subjects: analytics.subjects.map((s) => ({
        subject: s.module,
        minutes: s.minutes,
        confidence: s.confidence,
        recencyDays: s.recencyDays,
        accuracy: s.accuracy,
        trend: s.trend,
        riskScore: s.riskScore,
        syllabusWeight: s.syllabusWeight,
      })),
      mockTrend: analytics.mockTrend,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
