import { defineTool } from "@lovable.dev/mcp-js";
import { buildSnapshot, loadPlan, loadProfile, requireAuth } from "../shared";

export default defineTool({
  name: "get_weak_areas",
  title: "Get weak areas",
  description:
    "Read-only. Identifies subjects with evidence of weakness for the signed-in user: low graded accuracy (with sample size), no recorded study coverage, or a self-rated low confidence with no graded evidence yet. Never returns a predicted score, readiness score or mastery figure — only graded accuracy where it exists, explicitly labelled with its sample size, or an honest 'no graded evidence yet' otherwise. Requires the user to be signed in.",
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
            text: "Not enough data to identify weak areas yet. Suggest the user logs a few study sessions or answers some graded questions.",
          },
        ],
        structuredContent: { weakAreas: [] },
      };
    }

    // Evidence-led ordering: low graded accuracy first, then no-coverage,
    // then self-rated-low. Never ranked by minutes studied or mood.
    let items = analytics.needsAttention.slice(0, 5);
    if (items.length === 0 && analytics.graded.perSubject.length > 0) {
      // Fallback: worst graded accuracy directly, when nothing crossed the
      // needs-attention thresholds but graded data exists.
      items = analytics.graded.perSubject.slice(0, 5).map((s) => ({
        module: s.subject,
        evidence: "low-graded-accuracy" as const,
        detail: `${s.accuracy}% correct across ${s.attempted} graded questions.`,
        sampleSize: s.attempted,
      }));
    }

    if (items.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No graded evidence, coverage gaps or self-rated low-confidence subjects found yet. Encourage the user to answer some graded questions to build evidence.",
          },
        ],
        structuredContent: { weakAreas: [] },
      };
    }

    const weakAreas = items.map((n) => {
      const subject = analytics.subjects.find((s) => s.module === n.module);
      return {
        subject: n.module,
        evidence: n.evidence,
        detail: n.detail,
        gradedAccuracy: subject?.accuracy ?? null,
        gradedSampleSize: n.sampleSize,
        confidence: subject?.confidence ?? null,
        recencyDays: subject?.recencyDays ?? null,
        minutes: subject?.minutes ?? null,
      };
    });

    return {
      content: [{ type: "text", text: JSON.stringify({ weakAreas }, null, 2) }],
      structuredContent: { weakAreas },
    };
  },
});
