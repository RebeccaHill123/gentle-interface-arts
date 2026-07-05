import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_study_plan",
  title: "Get study plan",
  description:
    "Get the signed-in user's current Tentra study plan (exam type, target date, weekly hours, modules, generated sessions and mocks).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("user_plans")
      .select("plan, updated_at")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "No study plan yet. The user should complete onboarding in the app." }],
        structuredContent: { plan: null },
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data.plan, null, 2) }],
      structuredContent: { plan: data.plan, updatedAt: data.updated_at },
    };
  },
});
