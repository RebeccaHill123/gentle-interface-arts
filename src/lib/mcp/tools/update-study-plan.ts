import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { loadPlan, requireAuth } from "../shared";
import { supabaseForUser } from "../supabase";
import type { StoredPlan } from "@/lib/plan-store";

/**
 * Restricted, safe update to the user's plan:
 * - target weekly hours
 * - exam date
 * - module confidence
 * We deliberately do NOT allow rewriting sessions, tasks or strategy JSON here.
 */
export default defineTool({
  name: "update_study_plan",
  title: "Update study plan (limited)",
  description:
    "WRITE action. Updates a small, safe subset of the signed-in user's study plan: target weekly hours, exam date, or the confidence rating for a specific module. Does NOT rewrite the AI-generated strategy, tasks or logged sessions. Requires explicit user confirmation before saving — always read the change back to the user and confirm before calling this tool.",
  inputSchema: {
    hoursPerWeek: z.number().int().min(1).max(80).optional().describe("New weekly study-hour target."),
    examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("New exam date (YYYY-MM-DD)."),
    moduleConfidence: z
      .object({
        module: z.string().trim().min(1),
        confidence: z.number().int().min(1).max(5),
      })
      .optional()
      .describe("Update a single module's confidence (1–5)."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ hoursPerWeek, examDate, moduleConfidence }, ctx) => {
    const auth = requireAuth(ctx);
    if (auth) return auth;
    if (hoursPerWeek === undefined && examDate === undefined && !moduleConfidence) {
      return {
        content: [{ type: "text", text: "Nothing to update — provide at least one field." }],
        isError: true,
      };
    }
    const { plan, error } = await loadPlan(ctx);
    if (error) return { content: [{ type: "text", text: error }], isError: true };
    if (!plan) {
      return {
        content: [{ type: "text", text: "No study plan yet — cannot update." }],
        isError: true,
      };
    }

    const nextInput = { ...plan.input };
    const changes: string[] = [];
    if (hoursPerWeek !== undefined) {
      nextInput.hoursPerWeek = hoursPerWeek;
      changes.push(`weekly hours → ${hoursPerWeek}`);
    }
    if (examDate !== undefined) {
      nextInput.examDate = examDate;
      changes.push(`exam date → ${examDate}`);
    }
    if (moduleConfidence) {
      const modules = [...nextInput.modules];
      const idx = modules.findIndex(
        (m) => m.name.toLowerCase() === moduleConfidence.module.toLowerCase(),
      );
      if (idx === -1) {
        return {
          content: [
            {
              type: "text",
              text: `Module '${moduleConfidence.module}' is not on the user's plan.`,
            },
          ],
          isError: true,
        };
      }
      modules[idx] = { ...modules[idx], confidence: moduleConfidence.confidence };
      nextInput.modules = modules;
      changes.push(
        `${moduleConfidence.module} confidence → ${moduleConfidence.confidence}/5`,
      );
    }

    const nextPlan: StoredPlan = { ...plan, input: nextInput };
    const supabase = supabaseForUser(ctx);
    const { error: writeErr } = await supabase
      .from("user_plans")
      .update({ plan: nextPlan as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq("user_id", ctx.getUserId());
    if (writeErr)
      return { content: [{ type: "text", text: writeErr.message }], isError: true };
    return {
      content: [{ type: "text", text: `Updated plan: ${changes.join(", ")}.` }],
      structuredContent: { updates: changes },
    };
  },
});
