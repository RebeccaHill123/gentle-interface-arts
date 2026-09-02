import type { ToolContext } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./supabase";
import {
  resolveEntitlementForUser,
  type EntitlementClient,
} from "@/lib/entitlement";
import { deriveAnalytics, type AnalyticsBundle } from "@/lib/analytics-derive";
import type { GradedResults } from "@/lib/graded-performance";
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

/**
 * Authorization for cost-incurring / premium-content tools. Verifies the
 * connection AND the user's real entitlement (same rules as the app), and
 * distinguishes "not entitled" from "temporarily unavailable".
 */
export async function requireAccess(ctx: ToolContext): Promise<ToolResult | null> {
  const auth = requireAuth(ctx);
  if (auth) return auth;
  let result;
  try {
    result = await resolveEntitlementForUser(
      supabaseForUser(ctx) as unknown as EntitlementClient,
      ctx.getUserId(),
    );
  } catch (e) {
    console.error("mcp entitlement read failed", e);
    return {
      content: [
        {
          type: "text",
          text: "Tentra is temporarily unable to confirm this account's access. Ask the user to try again in a moment.",
        },
      ],
      isError: true,
    };
  }
  if (result.ok) return null;
  const text =
    result.status === 503
      ? "Tentra is temporarily unable to confirm this account's access. Ask the user to try again in a moment."
      : result.status === 401
        ? "Not signed in. Ask the user to connect their Tentra account first."
        : "This feature needs active Tentra access (subscription or trial). Ask the user to start or renew their plan at tentraapp.com.";
  return { content: [{ type: "text", text }], isError: true };
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

/**
 * Evidence-led priority ordering: low graded accuracy first, then
 * no-coverage, then self-rated-low. Never ranks by minutes or mood.
 */
function evidenceLedSummary(analytics: AnalyticsBundle, limit = 4): string {
  const items = analytics.needsAttention.slice(0, limit).map((n) => {
    if (n.evidence === "low-graded-accuracy") return `${n.module} (${n.detail})`;
    if (n.evidence === "no-coverage") return `${n.module} (no study time recorded)`;
    return `${n.module} (self-rated low, no graded evidence yet)`;
  });
  if (items.length) return items.join(", ");
  // Fallback: worst graded accuracy directly from graded results.
  const fallback = analytics.graded.perSubject
    .slice(0, limit)
    .map((s) => `${s.subject} (${s.accuracy}% over ${s.attempted} graded questions)`);
  return fallback.length ? fallback.join(", ") : "n/a — no graded or coverage evidence yet";
}

function gradedSummary(graded: GradedResults): string {
  if (!graded.hasData || graded.accuracy === null) {
    return "No graded data yet — no accuracy figure available.";
  }
  return `${graded.accuracy}% correct across ${graded.totalAttempted} graded questions.`;
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

  const needsAttentionSummary = evidenceLedSummary(analytics);
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
    `Syllabus coverage: ${
      analytics.coverage.subtopicPercent !== null
        ? `${analytics.coverage.subtopicPercent}% (${analytics.coverage.subjectsTouched}/${analytics.coverage.totalSubjects} subjects touched)`
        : "not enough data yet"
    }`,
    `Graded accuracy: ${gradedSummary(analytics.graded)}`,
    `Consistency: ${analytics.consistency.studyDays}/${analytics.consistency.windowDays} days studied, ${analytics.consistency.currentStreak}-day streak`,
    `Self-rated confidence (not a performance measure): ${
      analytics.selfReported.avgFocusPct !== null
        ? `avg focus ${analytics.selfReported.avgFocusPct}%`
        : "not rated yet"
    }`,
    `Today's plan: ${today || "no tasks scheduled"}`,
    `Needs attention (evidence-led): ${needsAttentionSummary}`,
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
