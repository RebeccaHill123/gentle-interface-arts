import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_mock_simulations",
  title: "List mock simulations",
  description: "List the user's recent Tentra mock exam simulations with score and status.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max results to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("mock_simulations")
      .select("id, exam_type, pathway, mode, status, overall_score, total_time_seconds, started_at, completed_at")
      .eq("user_id", ctx.getUserId())
      .order("started_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { simulations: data ?? [] },
    };
  },
});
