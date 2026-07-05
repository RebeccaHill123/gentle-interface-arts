import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { loadPlan, requireAuth } from "../shared";

export default defineTool({
  name: "get_recent_study_sessions",
  title: "Get recent study sessions",
  description:
    "Read-only. Returns recent logged study sessions for the signed-in user (date, duration in minutes, subject, notes, session type). Useful for reviewing what has been studied lately. Requires the user to be signed in.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional().describe("Max sessions to return (default 20)."),
    days: z.number().int().min(1).max(365).optional().describe("Only include sessions from the last N days (default 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, days }, ctx) => {
    const auth = requireAuth(ctx);
    if (auth) return auth;
    const { plan, error } = await loadPlan(ctx);
    if (error) return { content: [{ type: "text", text: error }], isError: true };
    const cutoff = Date.now() - (days ?? 30) * 86_400_000;
    const sessions = (plan?.sessions ?? [])
      .filter((s) => new Date(s.loggedAt ?? s.date).getTime() >= cutoff)
      .sort((a, b) => (a.loggedAt < b.loggedAt ? 1 : -1))
      .slice(0, limit ?? 20)
      .map((s) => ({
        date: s.date,
        durationMinutes: s.minutes,
        subject: s.module ?? null,
        sessionType: s.sessionType ?? "study",
        notes: s.note ?? null,
        loggedAt: s.loggedAt,
      }));
    if (sessions.length === 0) {
      return {
        content: [
          { type: "text", text: "No study sessions logged yet in the selected window." },
        ],
        structuredContent: { sessions: [] },
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(sessions, null, 2) }],
      structuredContent: { sessions },
    };
  },
});
