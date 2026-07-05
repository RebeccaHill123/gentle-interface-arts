import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";
import { deriveAnalytics, type AnalyticsBundle } from "@/lib/analytics-derive";
import type { StoredPlan, StudySession, StrategyTask } from "@/lib/plan-store";

export type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export function requireAuth(ctx: ToolContext): ToolResult | null {
  if (!ctx.isAuthenticated()) {
    return {
      content: [
        {
          type: "text",
          text: "Not signed in. Ask the user to connect their Tentra account first.",
        },
      ],
      isError: true,
    };
  }
  return null;
}

export async function loadPlan(
  ctx: ToolContext,
): Promise<{ plan: StoredPlan | null; error?: string }> {
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase
    .from("user_plans")
    .select("plan")
    .eq("user_id", ctx.getUserId())
    .maybeSingle();
  if (error) return { plan: null, error: error.message };
  return { plan: (data?.plan as unknown as StoredPlan | null) ?? null };
}

export async function loadProfile(
  ctx: ToolContext,
): Promise<{ profile: Record<string, unknown> | null; error?: string }> {
  const supabase = supabaseForUser(ctx);
  const { data, error } = await supabase
    .from("profiles")
    .select("first_name, display_name, email, is_pro")
    .eq("user_id", ctx.getUserId())
    .maybeSingle();
  if (error) return { profile: null, error: error.message };
  return { profile: (data as Record<string, unknown> | null) ?? null };
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Today's planned tasks from the strategy plan. */
export function todaysTasks(plan: StoredPlan | null): StrategyTask[] {
  return plan?.plan?.todayTasks ?? [];
}

/** Filter sessions to a rolling window (days). */
export function recentSessions(
  plan: StoredPlan | null,
  days: number,
): StudySession[] {
  const cutoff = Date.now() - days * 86_400_000;
  return (plan?.sessions ?? []).filter(
    (s) => new Date(s.loggedAt ?? s.date).getTime() >= cutoff,
  );
}

/** Build a compact snapshot used by AI Coach / Tutor prompts. */
export function buildSnapshot(
  plan: StoredPlan | null,
  profile: { first_name?: unknown; display_name?: unknown } | null,
): { text: string; analytics: AnalyticsBundle } {
  const analytics = deriveAnalytics(plan);
  const name =
    (profile?.first_name as string | undefined) ??
    (profile?.display_name as string | undefined) ??
    "the user";
  const input = plan?.input;
  const daysToExam =
    input?.examDate ? daysBetween(todayIso(), input.examDate) : null;
  const weekMins = recentSessions(plan, 7).reduce((a, s) => a + s.minutes, 0);

  const weakest = analytics.weakest
    .slice(0, 4)
    .map((s) => `${s.module} (risk ${s.riskScore})`)
    .join(", ");
  const recency = analytics.subjects
    .slice()
    .sort((a, b) => (b.recencyDays ?? 999) - (a.recencyDays ?? 999))
    .slice(0, 4)
    .map((s) => `${s.module} ${s.recencyDays ?? "never"}d`)
    .join(", ");
  const today = todaysTasks(plan)
    .slice(0, 4)
    .map((t) => `${t.module}: ${t.title} (${t.minutes}m)`)
    .join(" | ");

  const text = [
    `\n\n=== USER SNAPSHOT (personalise; do not dump verbatim) ===`,
    `Name: ${name}`,
    `Exam: ${input?.examType ?? "?"}${input?.examPath ? ` (${input.examPath})` : ""}${
      daysToExam !== null ? `, in ${daysToExam} days` : ""
    }`,
    `Weekly hours: ${(weekMins / 60).toFixed(1)}h done / ${input?.hoursPerWeek ?? "?"}h target (rolling 7d)`,
    `Today's plan: ${today || "no tasks scheduled"}`,
    `Weakest / at-risk: ${weakest || "n/a"}`,
    `Recency gaps: ${recency || "n/a"}`,
    `=== END SNAPSHOT ===`,
  ].join("\n");

  return { text, analytics };
}

/** Call the Lovable AI Gateway with a chat completion (non-streaming). */
export async function callGateway(params: {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
}): Promise<{ text: string; error?: string; status?: number }> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) return { text: "", error: "AI not configured on server.", status: 500 };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model ?? "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    if (res.status === 429)
      return { text: "", error: "AI rate limit — try again in a moment.", status: 429 };
    if (res.status === 402)
      return { text: "", error: "AI credits exhausted for this workspace.", status: 402 };
    const t = await res.text();
    console.error("mcp gateway error", res.status, t.slice(0, 300));
    return { text: "", error: "AI gateway error.", status: 502 };
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text };
}
