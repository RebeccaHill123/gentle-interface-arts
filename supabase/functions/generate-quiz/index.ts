// Edge function: generate a multiple-choice quiz for a given exam topic
//
// Cost-incurring: verifies the caller's bearer token and real Tentra entitlement
// BEFORE the AI gateway is touched. Status semantics: 401 unauthenticated,
// 403 no active access, 503 entitlement read failure, 400 invalid input.
//
// Smart Review extensions:
// - `count`: 5, 10, 15 or 20 questions (default 10).
// - `difficulty`: "Easy" | "Medium" | "Hard" | "Mixed" — explicit choice wins
//   over the confidence-derived default.
// - Each question carries `optionExplanations` (why every option is right or
//   wrong) and a short `memoryRule` takeaway, alongside the main `explanation`.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

const EXAM_TYPES = ["SQE1", "SQE2", "UBE", "MPRE", "ACCA"] as const;
type ExamType = (typeof EXAM_TYPES)[number];

const QUESTION_COUNTS = [5, 10, 15, 20] as const;
const DIFFICULTIES = ["Easy", "Medium", "Hard", "Mixed"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

interface QuizRequest {
  module: string;
  topic?: string;
  examType: ExamType;
  confidence: number;
  count: number;
  difficulty?: Difficulty;
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
  let count = 10;
  if (r["count"] !== undefined && r["count"] !== null) {
    const n = Number(r["count"]);
    // Smart Review offers 5/10/15/20 (QUESTION_COUNTS), but the practice
    // launcher, AI quiz builder and tutor follow-ups send any whole count 4–20.
    if (!Number.isInteger(n) || n < 4 || n > QUESTION_COUNTS[QUESTION_COUNTS.length - 1]) {
      return { ok: false, error: "Invalid count" };
    }
    count = n;
  }
  let difficulty: Difficulty | undefined;
  if (r["difficulty"] !== undefined && r["difficulty"] !== null) {
    if (
      typeof r["difficulty"] !== "string" ||
      !(DIFFICULTIES as readonly string[]).includes(r["difficulty"])
    ) {
      return { ok: false, error: "Invalid difficulty" };
    }
    difficulty = r["difficulty"] as Difficulty;
  }
  return {
    ok: true,
    value: {
      examType: examType as ExamType,
      module: mod,
      confidence,
      count,
      ...(topic ? { topic } : {}),
      ...(difficulty ? { difficulty } : {}),
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

    const difficulty: string =
      body.difficulty === "Easy"
        ? "introductory"
        : body.difficulty === "Medium"
          ? "intermediate"
          : body.difficulty === "Hard"
            ? "advanced, exam-realistic"
            : body.difficulty === "Mixed"
              ? "mixed-difficulty (a deliberate spread from introductory to advanced, exam-realistic)"
              : body.confidence <= 2
                ? "introductory"
                : body.confidence >= 4
                  ? "advanced, exam-realistic"
                  : "intermediate";

    const isUbe = body.examType === "UBE";
    const isMpre = body.examType === "MPRE";
    const isAcca = body.examType === "ACCA";
    const systemPrompt = isAcca
      ? `You are an expert ACCA tutor. You write rigorous ACCA-style objective test questions modelled on the official ACCA computer-based exams. Each question must have exactly 4 options (A-D), exactly one correct answer, and a concise explanation that shows the workings or cites the governing standard or rule. Use current IFRS, ISAs, ACCA syllabus terminology and UK tax rules as examined. Calculation questions must use plausible distractors reflecting realistic candidate errors. Never reference SQE, FLK, SBA, MBE, MEE, MPT or MPRE unless the user's topic explicitly asks for an exam comparison.`
      : isUbe
        ? `You are an expert US bar (UBE / NY Bar) tutor. You write rigorous MBE-style single-best-answer multiple-choice questions modelled on the NCBE Subject Matter Outlines. Each question must have exactly 4 options (A-D), exactly one correct answer, and a concise explanation citing the controlling rule. Use US law only (federal rules + majority common-law positions). Never reference SQE, FLK, ACCA or MPRE unless the user's topic explicitly asks for an exam comparison.`
        : isMpre
          ? `You are an expert MPRE tutor. You write rigorous MPRE-style professional-responsibility multiple-choice questions. Each question must have exactly 4 options (A-D), exactly one correct answer, and a concise rule-led explanation. Use ABA Model Rules, Model Code of Judicial Conduct and MPRE-tested professional responsibility principles. Never reference SQE, FLK, SBA, MBE, MEE, MPT, UBE or ACCA unless the user's topic explicitly asks for an exam comparison.`
          : `You are an expert UK SQE (Solicitors Qualifying Examination) tutor. You write rigorous single-best-answer multiple-choice questions in the style of the official SRA SQE assessments. Each question must have exactly 4 options (A-D), exactly one correct answer, and a concise explanation. Never reference UBE, MBE, MEE, MPT, MPRE or ACCA unless the user's topic explicitly asks for an exam comparison. Follow the SRA Functioning Legal Knowledge applying after 1 September 2026: appeals belong to Dispute Resolution or Criminal Law and Practice, criminal legal aid belongs to Criminal Law and Practice, use "obtaining information from judgment debtor" (not "oral examination"), and use "knowing receipt" and "dishonest assistance" for stranger liability in trusts. Tax questions must test applying the rules and must state in the question every monetary rate, threshold and exemption or relief value the candidate needs; never expect these figures to be recalled. Ethics and Professional Conduct can be tested within any subject.`;

    const jurisdictionNote = isAcca
      ? "Mix calculation and conceptual questions as the syllabus area demands, show full workings in the explanation, and never invent standard numbers, rates or thresholds."
      : isUbe
        ? "Make the questions varied, fact-pattern based (1.8-min MBE pace), and grounded in current US federal law and majority rules. Avoid trick wording."
        : isMpre
          ? "Make the questions varied, ethics-scenario based, and grounded in professional-responsibility duties, conflicts, confidentiality, fees, advertising, judicial conduct and discipline. Avoid trick wording."
          : "Make the questions varied, scenario-based where appropriate, and grounded in current English & Welsh law. Avoid trick wording.";

    const teachingNote =
      "For every question: the `explanation` must teach the underlying rule or concept (not just restate the answer); `optionExplanations` must give one short reason per option (in the same order as `options`) explaining why that specific option is correct or incorrect, naming the misunderstanding a wrong option reflects where identifiable; `memoryRule` must be a single concise exam takeaway or mnemonic a student can memorise.";

    const userPrompt = `Write a ${body.count}-question ${difficulty} ${body.examType} assessment.
Module: ${body.module}
${body.topic ? `Specific topic / today's task: ${body.topic}` : ""}
${jurisdictionNote}
${teachingNote}`;

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
                description: `${body.count}-question exam-specific multiple-choice assessment with teaching explanations`,
                parameters: {
                  type: "object",
                  properties: {
                    questions: {
                      type: "array",
                      description: `Exactly ${body.count} questions`,
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
                          explanation: {
                            type: "string",
                            description:
                              "Teaches the underlying rule or concept and why the correct answer is right",
                          },
                          optionExplanations: {
                            type: "array",
                            description:
                              "Exactly 4 short explanations, one per option in the same order, each saying why that option is correct or incorrect",
                            items: { type: "string" },
                          },
                          memoryRule: {
                            type: "string",
                            description:
                              "One concise exam memory rule or takeaway for this question's concept",
                          },
                        },
                        required: [
                          "prompt",
                          "options",
                          "correctIndex",
                          "explanation",
                          "optionExplanations",
                          "memoryRule",
                        ],
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

    // The model sometimes over-delivers; cap the payload (a few spares let the app drop duplicates and still reach the requested count).
    return new Response(
      JSON.stringify({ questions: quiz.questions.slice(0, body.count + 5) }),
      { headers: jsonHeaders },
    );
  } catch (e) {
    console.error("generate-quiz error", e);
    return fail(500, "Couldn't generate quiz. Please try again.");
  }
});
