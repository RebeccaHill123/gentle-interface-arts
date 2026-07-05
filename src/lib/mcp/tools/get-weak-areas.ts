import { defineTool } from "@lovable.dev/mcp-js";
import { buildSnapshot, loadPlan, loadProfile, requireAuth } from "../shared";

export default defineTool({
  name: "get_weak_areas",
  title: "Get weak areas",
  description:
    "Read-only. Identifies the signed-in user's likely weak or neglected subjects using logged sessions, confidence, recency and mock performance. Returns up to 5 subjects with the reason each is flagged. If data is thin, returns a friendly empty state. Requires the user to be signed in.",
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
            text: "No study plan yet — ask the user to complete onboarding.",
          },
        ],
        structuredContent: { weakAreas: [] },
      };
    }
    const { analytics } = buildSnapshot(plan, profile);
    if (!analytics.hasAnyData) {
      return {
        content: [
          {
            type: "text",
            text: "Not enough data to identify weak areas yet. Suggest the user logs a few study sessions or takes a mini test.",
          },
        ],
        structuredContent: { weakAreas: [] },
      };
    }
    const weak = analytics.weakest.slice(0, 5).map((s) => {
      const reasons: string[] = [];
      if (s.confidence <= 2) reasons.push(`low confidence (${s.confidence}/5)`);
      if ((s.recencyDays ?? 999) >= 10) reasons.push(`not touched in ${s.recencyDays}d`);
      if (s.minutes < 60) reasons.push(`only ${s.minutes} min logged`);
      if (s.accuracy !== null && s.accuracy < 55)
        reasons.push(`quiz accuracy ${s.accuracy.toFixed(0)}%`);
      if (reasons.length === 0) reasons.push(`risk score ${s.riskScore}/100`);
      return {
        subject: s.module,
        riskScore: s.riskScore,
        confidence: s.confidence,
        recencyDays: s.recencyDays,
        minutes: s.minutes,
        accuracy: s.accuracy,
        reasons,
      };
    });
    return {
      content: [{ type: "text", text: JSON.stringify({ weakAreas: weak }, null, 2) }],
      structuredContent: { weakAreas: weak },
    };
  },
});
