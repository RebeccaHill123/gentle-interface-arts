import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { loadPlan, requireAuth, todayIso } from "../shared";
import { supabaseForUser } from "../supabase";
import type { StoredPlan, StudySession } from "@/lib/plan-store";

export default defineTool({
  name: "log_study_session",
  title: "Log a study session",
  description:
    "WRITE action. Logs a completed study session for the signed-in user (subject, duration in minutes, optional topic/notes, date). Source is recorded as 'ChatGPT' so it's distinguishable from the in-app timer. Requires explicit user confirmation before saving — always read the details back to the user and confirm before calling this tool.",
  inputSchema: {
    subject: z
      .string()
      .trim()
      .min(1)
      .describe("Subject / module, e.g. 'Contract', 'Trusts', 'Torts'."),
    durationMinutes: z
      .number()
      .int()
      .min(1)
      .max(600)
      .describe("Duration studied, in minutes (1–600)."),
    topic: z.string().trim().min(1).max(200).optional().describe("Optional narrower topic/note."),
    notes: z.string().max(500).optional().describe("Optional freeform notes."),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Session date (YYYY-MM-DD). Defaults to today."),
    sessionType: z
      .enum(["study", "quiz", "mock", "review", "flashcards", "focus"])
      .optional()
      .describe("Kind of session (default 'study')."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ subject, durationMinutes, topic, notes, date, sessionType }, ctx) => {
    const auth = requireAuth(ctx);
    if (auth) return auth;
    const { plan, error } = await loadPlan(ctx);
    if (error) return { content: [{ type: "text", text: error }], isError: true };
    if (!plan) {
      return {
        content: [
          {
            type: "text",
            text: "No study plan yet — the user must complete onboarding before logging sessions.",
          },
        ],
        isError: true,
      };
    }
    const noteParts = [topic, notes].filter((s): s is string => Boolean(s));
    const entry: StudySession = {
      date: date ?? todayIso(),
      minutes: durationMinutes,
      module: subject,
      note: [noteParts.join(" — "), "(via ChatGPT)"].filter(Boolean).join(" "),
      loggedAt: new Date().toISOString(),
      sessionType: sessionType ?? "study",
    };
    const sessions = [...(plan.sessions ?? []), entry];
    const nextPlan: StoredPlan = { ...plan, sessions };
    const supabase = supabaseForUser(ctx);
    const { error: writeErr } = await supabase
      .from("user_plans")
      .update({ plan: nextPlan as unknown as Record<string, unknown>, updated_at: new Date().toISOString() })
      .eq("user_id", ctx.getUserId());
    if (writeErr)
      return { content: [{ type: "text", text: writeErr.message }], isError: true };
    return {
      content: [
        {
          type: "text",
          text: `Logged ${durationMinutes} min of ${subject}${topic ? ` — ${topic}` : ""} on ${entry.date}.`,
        },
      ],
      structuredContent: { session: entry, totalSessions: sessions.length },
    };
  },
});
