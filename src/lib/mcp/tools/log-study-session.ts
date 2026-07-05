import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

// Appends a study session entry to the user's plan JSON (client-side storage
// mirrors the same shape via user_plans.plan.sessions).
export default defineTool({
  name: "log_study_session",
  title: "Log study session",
  description:
    "Log a completed study session for the signed-in user (module, minutes, session type). Appended to their Tentra study plan.",
  inputSchema: {
    module: z.string().trim().min(1).describe("Module name, e.g. 'Contract' or 'Trusts'."),
    minutes: z.number().int().min(1).max(600).describe("Duration in minutes (1-600)."),
    sessionType: z
      .enum(["revision", "practice", "mock", "flashcards", "reading"])
      .optional()
      .describe("Kind of study session (default 'revision')."),
    focus: z.number().int().min(1).max(5).optional().describe("Focus/quality rating 1-5."),
    notes: z.string().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ module, minutes, sessionType, focus, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { data: row, error: readErr } = await supabase
      .from("user_plans")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();
    if (readErr) return { content: [{ type: "text", text: readErr.message }], isError: true };
    if (!row) {
      return {
        content: [
          { type: "text", text: "No study plan yet. The user must complete onboarding before logging sessions." },
        ],
        isError: true,
      };
    }
    const plan = (row.plan ?? {}) as Record<string, unknown>;
    const sessions = Array.isArray((plan as { sessions?: unknown[] }).sessions)
      ? [...((plan as { sessions: unknown[] }).sessions)]
      : [];
    const entry = {
      date: new Date().toISOString(),
      module,
      minutes,
      sessionType: sessionType ?? "revision",
      focus,
      notes,
      source: "mcp",
    };
    sessions.push(entry);
    const nextPlan = { ...plan, sessions };
    const { error: writeErr } = await supabase
      .from("user_plans")
      .update({ plan: nextPlan, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (writeErr) return { content: [{ type: "text", text: writeErr.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged ${minutes} min of ${module}.` }],
      structuredContent: { session: entry, totalSessions: sessions.length },
    };
  },
});
