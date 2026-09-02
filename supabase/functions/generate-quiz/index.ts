// Edge function: generate a 10-question multiple-choice quiz for a given exam topic
//
// Cost-incurring: verifies the caller's bearer token and real Tentra entitlement
// BEFORE the AI gateway is touched. Status semantics: 401 unauthenticated,
// 403 no active access, 503 entitlement read failure, 400 invalid input.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const EXAM_TYPES = ["SQE1", "SQE2", "UBE"] as const;
type ExamType = (typeof EXAM_TYPES)[number];

interface QuizRequest {
  module: string;
  topic?: string;
  examType: ExamType;
  confidence: number;
}

function fail(status: number, error: string) {
  return new Response(JSON.stringify({ error }), { status, headers: jsonHeaders });
}

function validateBody(
  raw: unknown,
): { ok: true; value: QuizRequest } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid request body" };
  const r = raw as Record<string, unknown>;
  const examType = r["examType"];
  if (
    typeof examType !== "string" ||
    !(EXAM_TYPES as readonly string[]).includes(examType)
  ) {
    return { ok: false, error: "Invalid examType" };
  }
  const mod = typeof r["module"] === "string" ? r["module"].trim() : "";
  if (mod.length < 2 || mod.length > 80) return { ok: false, error: "Invalid module" };
  let topic: string | undefined;
  if (r["topic"] !== undefined && r["topic"] !== null) {
    if (typeof r["topic"] !== "string") return { ok: false, error: "Invalid topic" };
    const t = r["topic"].trim();
    if (t.length > 200) return { ok: false, error: "Invalid topic" };
    if (t) topic = t;
  }
  let confidence = 3;
  if (r["confidence"] !== undefined && r["confidence"] !== null) {
    const c = Number(r["confidence"]);
    if (!Number.isFinite(c)) return { ok: false, error: "Invalid confidence" };
    confidence = Math.min(5, Math.max(1, Math.round(c)));
  }
  return {
    ok: true,
    value: {
      examType: examType as ExamType,
      module: mod,
      confidence,
      ...(topic ? { topic } : {}),
    },
  };
}

/** Mirrors src/lib/provisioning.ts profileHasAccess exactly. */
function profileHasAccess(p: Record<string, unknown> | null): boolean {
  if (!p) return false;
  const status = (p["subscription_status"] as string | null) ?? null;
  const end = p["current_period_end"] as string | null;
  const graceActive =
    status === "canceled" && !!end && new Date(end).getTime() > Date.now();
  return (
    !!p["grandfathered_pro"] ||
    !!p["is_pro"] ||
    status === "active" ||
    status === "trialing" ||
    graceActive
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ---- Authentication (never assume the platform verified the JWT) --------
    const authHeader = req.headers.get("authorization") ?? "";
    const token = /^Bearer\s+(.+)$/i.exec(authHeader.trim())?.[1]?.trim() ?? "";
    if (token.length < 10) return fail(401, "Sign in to continue.");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_PUBLISHABLE_KEY =
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      console.error("generate-quiz: Supabase env missing");
      return fail(503, "Temporarily unavailable. Please try again shortly.");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userError || !userId) return fail(401, "Sign in to continue.");

    // ---- Entitlement (before any gateway usage) ----------------------------
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_pro, grandfathered_pro, subscription_status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError) {
      console.error("generate-quiz entitlement read failed", profileError.message);
      return fail(
        503,
        "We couldn't confirm your subscription right now. Please try again in a moment.",
      );
    }
    if (!profileHasAccess(profile as Record<string, unknown> | null)) {
      return fail(403, "This feature needs an active Tentra subscription or trial.");
    }

    // ---- Input validation --------------------------------------------------
    const rawBody = await req.json().catch(() => null);
    const parsed = validateBody(rawBody);
    if (!parsed.ok) return fail(400, parsed.error);
    const body = parsed.value;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("generate-quiz: LOVABLE_API_KEY not configured");
      return fail(503, "Quiz generation is temporarily unavailable.");
    }

    const difficulty =
      body.confidence <= 2
        ? "introductory"
        : body.confidence >= 4
          ? "advanced, exam-realistic"
          : "intermediate";

    const isUbe = body.examType === "UBE";
    const systemPrompt = isUbe
      ? `You are an expert US bar (UBE / NY Bar) tutor. You write rigorous MBE-style single-best-answer multiple-choice questions modelled on the NCBE Subject Matter Outlines. Each question must have exactly 4 options (A-D), exactly one correct answer, and a concise explanation citing the controlling rule. Use US law only (federal rules + majority common-law positions).`
      : `You are an expert UK SQE (Solicitors Qualifying Examination) tutor. You write rigorous single-best-answer multiple-choice questions in the style of the official SRA SQE assessments. Each question must have exactly 4 options (A-D), exactly one correct answer, and a concise explanation.`;

    const jurisdictionNote = isUbe
      ? "Make the questions varied, fact-pattern based (1.8-min MBE pace), and grounded in current US federal law and majority rules. Avoid trick wording."
      : "Make the questions varied, scenario-based where appropriate, and grounded in current English & Welsh law. Avoid trick wording.";

    const userPrompt = `Write a 10-question ${difficulty} ${body.examType} mini-assessment.
Module: ${body.module}
${body.topic ? `Specific topic / today's task: ${body.topic}` : ""}
${jurisdictionNote}`;

    const callGateway = async () =>
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "mini_assessment",
                description: "10-question SQE multiple-choice mini-assessment",
                parameters: {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      description: "Exactly 10 questions",
                      items: {
                        type: "object",
                        properties: {
                          prompt: { type: "string" },
                          options: {
                            type: "array",
                            description: "Exactly 4 answer options",
                            items: { type: "string" },
                          },
                          correctIndex: {
                            type: "number",
                            description: "0-3, index of the correct option",
                          },
                          explanation: { type: "string" },
                        },
                        required: ["prompt", "options", "correctIndex", "explanation"],
                      },
                    },
                  },
                  required: ["questions"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "mini_assessment" } },
        }),
      });

    const extractQuiz = (data: any): { questions: unknown[] } | null => {
      const message = data?.choices?.[0]?.message;
      const toolArgs = message?.tool_calls?.[0]?.function?.arguments;
      if (toolArgs) {
        try {
          const parsed = typeof toolArgs === "string" ? JSON.parse(toolArgs) : toolArgs;
          if (parsed && Array.isArray(parsed.questions)) return parsed;
        } catch (err) {
          console.error("Could not parse tool args", err);
        }
      }
      const content = message?.content;
      if (typeof content === "string" && content.trim()) {
        const match =
          content.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? content.match(/\{[\s\S]*\}/)?.[0];
        if (match) {
          try {
            const parsed = JSON.parse(match);
            if (parsed && Array.isArray(parsed.questions)) return parsed;
          } catch (err) {
            console.error("Could not parse content JSON", err);
          }
        }
      }
      return null;
    };

    let response = await callGateway();
    if (!response.ok) {
      if (response.status === 429) {
        return fail(429, "Rate limit reached. Please try again in a moment.");
      }
      if (response.status === 402) {
        return fail(402, "AI credits exhausted. Add credits in Lovable workspace.");
      }
      const text = await response.text();
      console.error("AI gateway error (quiz, attempt 1)", response.status, text.slice(0, 400));
      // Retry once for transient 5xx
      if (response.status >= 500) {
        await new Promise((r) => setTimeout(r, 400));
        response = await callGateway();
      }
      if (!response.ok) {
        const text2 = await response.text();
        console.error("AI gateway error (quiz, final)", response.status, text2.slice(0, 400));
        return fail(502, "Couldn't generate quiz. Please try again.");
      }
    }

    let data = await response.json();
    let quiz = extractQuiz(data);

    // Retry once if the model didn't return a tool_call
    if (!quiz) {
      console.warn("No tool_call returned, retrying quiz generation once");
      await new Promise((r) => setTimeout(r, 300));
      const retry = await callGateway();
      if (retry.ok) {
        data = await retry.json();
        quiz = extractQuiz(data);
      } else {
        const text = await retry.text();
        console.error("AI gateway error (quiz retry)", retry.status, text.slice(0, 400));
      }
    }

    if (!quiz) {
      console.error("Quiz extraction failed after retry", JSON.stringify(data).slice(0, 500));
      return fail(502, "Couldn't generate quiz. Please try again.");
    }

    return new Response(JSON.stringify(quiz), { headers: jsonHeaders });
  } catch (e) {
    console.error("generate-quiz error", e);
    return fail(500, "Couldn't generate quiz. Please try again.");
  }
});
