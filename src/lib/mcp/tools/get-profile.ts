import { defineTool } from "@lovable.dev/mcp-js";
import { loadPlan, loadProfile, requireAuth, todayIso, daysBetween } from "../shared";

export default defineTool({
  name: "get_profile",
  title: "Get profile",
  description:
    "Read-only. Returns the signed-in Tentra user's study-focused profile: name, exam type/path, exam date, target weekly hours, selected modules, and whether they have a study plan. No sensitive personal data is exposed. Requires the user to be signed in.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const auth = requireAuth(ctx);
    if (auth) return auth;
    const [{ profile }, { plan }] = await Promise.all([loadProfile(ctx), loadPlan(ctx)]);
    const input = plan?.input;
    const daysToExam = input?.examDate ? daysBetween(todayIso(), input.examDate) : null;
    const payload = {
      name:
        (profile?.first_name as string | undefined) ??
        (profile?.display_name as string | undefined) ??
        null,
      examType: input?.examType ?? null,
      examPath: input?.examPath ?? null,
      examDate: input?.examDate ?? null,
      daysToExam,
      targetHoursPerWeek: input?.hoursPerWeek ?? null,
      intensity: input?.intensity ?? null,
      modules:
        input?.modules?.map((m) => ({ name: m.name, confidence: m.confidence })) ?? [],
      hasStudyPlan: Boolean(plan),
      isPro: Boolean(profile?.is_pro),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
