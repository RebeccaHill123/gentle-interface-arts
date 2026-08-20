import { defineTool } from "@lovable.dev/mcp-js";
import { buildSnapshot, loadPlan, loadProfile, requireAuth } from "../shared";

export default defineTool({
  name: "get_subject_progress",
  title: "Get subject progress",
  description:
    "Read-only. Returns per-subject progress derived from the signed-in user's study activity: total minutes studied (effort only), self-rated confidence (labelled as self-rated, not performance), recency (days since last session), syllabus weight, and graded accuracy WITH its sample size where enough graded answers exist. When there is no graded evidence for a subject, accuracy is explicitly null rather than estimated. Never returns a predicted score, readiness score, mastery figure or trend inferred from anything other than graded answers. Requires the user to be signed in.",
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
      gradedOverall: analytics.graded.hasData
        ? {
            accuracy: analytics.graded.accuracy,
            totalAttempted: analytics.graded.totalAttempted,
          }
        : { accuracy: null, totalAttempted: 0, note: "No graded evidence yet." },
      subjects: analytics.subjects.map((s) => ({
        subject: s.module,
        minutes: s.minutes,
        selfRatedConfidence: s.confidence,
        recencyDays: s.recencyDays,
        gradedAccuracy: s.accuracy,
        gradedAttempts: s.gradedAttempts,
        gradedEvidence:
          s.accuracy !== null
            ? `${s.accuracy}% correct across ${s.gradedAttempts} graded questions.`
            : "No graded evidence yet.",
        syllabusWeight: s.syllabusWeight,
      })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
