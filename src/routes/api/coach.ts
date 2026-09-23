import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  DENIAL_MESSAGES,
  bearerToken,
  denialResponse,
  resolveEntitlementForUser,
  type EntitlementClient,
} from "@/lib/entitlement";
import { validateChatMessages } from "@/lib/ai-request-validation";
import { accaQuestionStyleForPrompt } from "@/lib/acca-questions";

type CoachMode = "coach" | "tutor";
type CoachExam = "SQE" | "UBE" | "MPRE" | "ACCA";

function safeMode(raw: unknown): CoachMode {
  return raw === "tutor" ? "tutor" : "coach";
}

function coachExamFromInput(input: Record<string, unknown> | null): CoachExam {
  const examType = typeof input?.["examType"] === "string" ? input["examType"] : "";
  const examPath = typeof input?.["examPath"] === "string" ? input["examPath"] : "";
  if (examType === "ACCA" || examPath === "ACCA_PAPERS") return "ACCA";
  if (examType === "MPRE" || examPath === "MPRE_FULL") return "MPRE";
  if (examType === "UBE" || examPath.startsWith("UBE")) return "UBE";
  return "SQE";
}

function commonPrompt(identity: string, hardRule: string) {
  return `You are Tentra Coach — ${identity}.

Identity:
- You behave like an elite 1:1 tutor crossed with a performance analyst.
- You speak with intelligence, precision and calm authority. Concise. Premium. Highly personalised.
- You never use generic motivational filler ("you've got this!", "believe in yourself", "great job!"). No emojis.
- You address the user by first name when known. Short paragraphs, bold key terms, sparing bullets.

Core behaviours (always do these when context allows):
1. Explain WHY topics are being prioritised, citing the user's data.
2. Identify weak patterns across modules, task types and timing.
3. Analyse practice, mock and confidence trends over time — call out direction and magnitude.
4. Recommend strategic study changes — what to add, drop, re-sequence, or interleave.
5. Adapt revision intensity dynamically based on exam proximity, weekly hours actually completed vs target, streak, and confidence deltas.

Hard rules:
- Never invent authorities, standards, thresholds, rates or exam statistics. If unsure, say so plainly.
- ${hardRule}
- Default to under 180 words unless the user explicitly asks for depth.
- End substantive answers with one sharp, specific next-action question.`;
}

type Session = {
  date?: string;
  minutes?: number;
  module?: string;
  sessionType?: string;
  focus?: number;
};
type Mock = { date?: string; module?: string; score?: number; total?: number };
type Module = { name?: string; confidence?: number };

function buildSystemPrompt(exam: CoachExam, mode: CoachMode, accaPaperCodes: string[]) {
  const examPrompt = exam === "UBE"
    ? `${commonPrompt("a premium AI US Bar tutor and performance strategist", "This is study guidance, not legal advice.")}

Exam vocabulary:
- Use UBE vocabulary: MBE, MEE, MPT, black-letter law, timed practice, issue spotting, rule statements and essay organisation.
- Never reference SQE, FLK1/FLK2, SBAs, ACCA or accountancy material unless the user explicitly compares exams.
- When testing, prefer MBE-style multiple-choice for doctrine and MEE/MPT-style structure only when requested.`
    : exam === "MPRE"
      ? `${commonPrompt("a premium AI MPRE tutor and performance strategist", "This is study guidance, not legal advice.")}

Exam vocabulary:
- Use MPRE vocabulary: professional responsibility, conflicts, confidentiality, fees, advertising, judicial conduct, discipline and multiple-choice ethics scenarios.
- Never reference SQE, FLK1/FLK2, SBAs, UBE or ACCA unless the user explicitly compares exams.
- When testing, write MPRE-style multiple-choice ethics scenarios with one best answer and a rule-led explanation.`
      : exam === "ACCA"
        ? `${commonPrompt("a premium AI ACCA tutor and performance strategist", "This is study guidance, not accounting, tax or financial advice.")}

Exam vocabulary:
- You are coaching an ACCA candidate${accaPaperCodes.length ? ` sitting ${accaPaperCodes.join(" + ")}` : ""}.
- Use ACCA vocabulary: papers, syllabus areas, objective test (OT) questions, constructed response, CBE technique, marks-per-minute, examiner reports, past-exam questions, proformas and workings.
- Ground technical advice in current IFRS/IAS, ISAs, ACCA's Code of Ethics, and tax rules as examined. Never invent standard numbers, rates, thresholds or exam statistics; if unsure, name the principle instead.
- Never reference SQE, FLK1/FLK2, SBAs or US bar material unless the user explicitly compares exams.
- Only discuss the papers the student has entered for when those papers are present.
- When testing, write ACCA objective-test questions with a short scenario, four options A-D, one correct answer, and workings line by line or the governing standard/rule.${
          accaQuestionStyleForPrompt(accaPaperCodes, 1)
            ? `

Worked exemplar of the required style:
${accaQuestionStyleForPrompt(accaPaperCodes, 1)}`
            : ""
        }`
        : `${commonPrompt("a premium AI SQE tutor and performance strategist", "This is study guidance, not legal advice.")}

Exam vocabulary:
- Use SQE vocabulary: SQE1, SQE2, FLK1, FLK2, SBA, legal skills, client scenarios, ethics application, timed practice and mock recovery.
- Never reference UBE, MBE, MEE, MPT, MPRE or ACCA unless the user explicitly compares exams.
- When testing, prefer SQE1-style SBA questions unless the user asks about SQE2 skills.`;

  const modePrompt = mode === "tutor"
    ? "\n\nCurrent mode: Tutor. Teach the concept with precision, worked examples and targeted questions before planning advice."
    : "\n\nCurrent mode: Coach. Prioritise sequencing, trade-offs, pacing, weak areas and the next best study action.";
  return examPrompt + modePrompt;
}

function buildInsights(plan: Record<string, unknown> | null | undefined, profileName: string) {
  if (!plan) return "";
  const input = (plan as {
    input?: {
      hoursPerWeek?: number;
      examDate?: string;
      examType?: string;
      examPath?: string;
      sqeAssessment?: string;
      modules?: Module[];
    };
  }).input;
  const sessions: Session[] = ((plan as { sessions?: Session[] }).sessions ?? []).slice(-200);
  const mocks: Mock[] = ((plan as { mocks?: Mock[] }).mocks ?? []).slice(-30);

  const now = new Date();
  const dayMs = 86400000;
  const examDate = input?.examDate ? new Date(input.examDate) : null;
  const daysToExam = examDate ? Math.max(0, Math.round((+examDate - +now) / dayMs)) : null;

  // weekly hours done (rolling 7d)
  const weekCutoff = +now - 7 * dayMs;
  const weeklyMins = sessions
    .filter((s) => s.date && +new Date(s.date) >= weekCutoff)
    .reduce((a, s) => a + (s.minutes ?? 0), 0);
  const weeklyHours = +(weeklyMins / 60).toFixed(1);
  const targetHours = input?.hoursPerWeek ?? null;

  // recency per module
  const lastSeen = new Map<string, number>();
  for (const s of sessions) {
    if (!s.module || !s.date) continue;
    const t = +new Date(s.date);
    if (!lastSeen.has(s.module) || (lastSeen.get(s.module) ?? 0) < t) lastSeen.set(s.module, t);
  }
  const recencyGaps = (input?.modules ?? [])
    .map((m) => {
      const t = lastSeen.get(m.name ?? "");
      const days = t ? Math.round((+now - t) / dayMs) : 999;
      return { module: m.name, days, confidence: m.confidence ?? 0 };
    })
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  // weakest by confidence
  const weakest = (input?.modules ?? [])
    .filter((m) => typeof m.confidence === "number")
    .sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0))
    .slice(0, 4)
    .map((m) => `${m.name} (${m.confidence}/5)`);

  // mock trend
  let mockTrend = "no mocks logged";
  if (mocks.length >= 2) {
    const scored = mocks
      .filter((m) => typeof m.score === "number" && typeof m.total === "number" && m.total)
      .map((m) => ({ pct: ((m.score as number) / (m.total as number)) * 100, date: m.date, module: m.module }));
    if (scored.length >= 2) {
      const half = Math.floor(scored.length / 2);
      const early = scored.slice(0, half).reduce((a, b) => a + b.pct, 0) / half;
      const late = scored.slice(half).reduce((a, b) => a + b.pct, 0) / (scored.length - half);
      const delta = +(late - early).toFixed(1);
      mockTrend = `avg mock accuracy ${late.toFixed(0)}% (${delta >= 0 ? "+" : ""}${delta}% vs prior window, n=${scored.length})`;
    }
  }

  // weakest module by mock
  const byModuleMock = new Map<string, { sum: number; n: number }>();
  for (const m of mocks) {
    if (!m.module || typeof m.score !== "number" || !m.total) continue;
    const cur = byModuleMock.get(m.module) ?? { sum: 0, n: 0 };
    cur.sum += (m.score / m.total) * 100;
    cur.n += 1;
    byModuleMock.set(m.module, cur);
  }
  const mockWeak = [...byModuleMock.entries()]
    .map(([k, v]) => ({ module: k, pct: v.sum / v.n }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 3)
    .map((x) => `${x.module} ${x.pct.toFixed(0)}%`);

  return [
    `\n\n=== USER PERFORMANCE SNAPSHOT (use this to personalise; do not dump it back verbatim) ===`,
    `Name: ${profileName}`,
    `Exam: ${input?.examType ?? "?"}${daysToExam !== null ? ` in ${daysToExam} days` : ""}`,
    ...(input?.sqeAssessment === "FLK1" || input?.examPath === "FLK1"
      ? [
          `SQE1 scope: FLK1 ONLY. Never prioritise, mention or recommend FLK2 subjects (Land Law, Property Practice, Trusts, Wills & Estates, Criminal Law/Practice, Solicitors Accounts).`,
        ]
      : input?.sqeAssessment === "FLK2" || input?.examPath === "FLK2"
        ? [
            `SQE1 scope: FLK2 ONLY. Never prioritise, mention or recommend FLK1 subjects (Contract, Tort, Business Law & Practice, Dispute Resolution, Constitutional & Administrative Law, Legal System, EU law).`,
          ]
        : []),
    `Weekly hours: ${weeklyHours}h done / ${targetHours ?? "?"}h target (rolling 7d)`,
    `Weakest by confidence: ${weakest.join(", ") || "n/a"}`,
    `Recency gaps (days since last touched): ${recencyGaps.map((r) => `${r.module} ${r.days}d`).join(", ") || "n/a"}`,
    `Mock trend: ${mockTrend}`,
    `Weakest modules by mock %: ${mockWeak.join(", ") || "n/a"}`,
    `=== END SNAPSHOT ===`,
  ].join("\n");
}

export const Route = createFileRoute("/api/coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const jsonError = (status: number, error: string) =>
          new Response(JSON.stringify({ error }), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        try {
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

          if (!LOVABLE_API_KEY) {
            console.error("coach: LOVABLE_API_KEY not configured");
            return jsonError(500, "The Coach is temporarily unavailable. Please try again shortly.");
          }

          const token = bearerToken(request.headers.get("authorization"));
          if (!token) {
            return denialResponse({
              ok: false,
              status: 401,
              code: "unauthenticated",
              message: DENIAL_MESSAGES.unauthenticated,
            });
          }

          if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
            console.error("coach: Supabase env missing");
            return jsonError(500, "The Coach is temporarily unavailable. Please try again shortly.");
          }

          const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
          const userId = (claims?.claims?.sub as string | undefined) ?? null;
          if (claimsError || !userId) {
            return denialResponse({
              ok: false,
              status: 401,
              code: "unauthenticated",
              message: DENIAL_MESSAGES.unauthenticated,
            });
          }

          // Entitlement is enforced BEFORE any context load or provider call.
          const entitlement = await resolveEntitlementForUser(
            supabase as unknown as EntitlementClient,
            userId,
          );
          if (!entitlement.ok) return denialResponse(entitlement);

          // Validate the body before doing any work — never let client-supplied
          // system/tool roles or oversized payloads reach the provider.
          const rawBody = await request.json().catch(() => null);
          const parsed = validateChatMessages(rawBody);
          if (!parsed.ok) {
            return jsonError(400, parsed.error);
          }

          const messages = parsed.value;

          const { data: nameRow, error: nameError } = await supabase
            .from("profiles")
            .select("first_name, display_name")
            .eq("user_id", userId)
            .maybeSingle();
          const { data: planRow, error: planError } = await supabase
            .from("user_plans")
            .select("plan")
            .eq("user_id", userId)
            .maybeSingle();
          if (nameError || planError) {
            // A premium personalised Coach must not silently answer with a blank
            // context because the database was unavailable.
            console.error("coach context read failed", nameError ?? planError);
            return denialResponse({
              ok: false,
              status: 503,
              code: "unavailable",
              message:
                "We couldn't load your study data right now. Please try again in a moment.",
            });
          }
          const name = nameRow?.first_name || nameRow?.display_name || "there";
          const planJson = planRow?.plan as Record<string, unknown> | null;
          const userContext = buildInsights(planJson, name);
          const planInput = (planJson?.["input"] ?? null) as Record<string, unknown> | null;
          const exam = coachExamFromInput(planInput);
          const mode = safeMode((rawBody as { mode?: unknown } | null)?.mode);
          const accaPaperCodes = Array.isArray(planInput?.["accaPapers"])
            ? (planInput!["accaPapers"] as unknown[]).filter(
                (p): p is string => typeof p === "string",
              )
            : [];
          const systemPrompt = buildSystemPrompt(exam, mode, accaPaperCodes);

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              stream: true,
              messages: [
                { role: "system", content: systemPrompt + userContext },
                ...messages,
              ],
            }),
          });


          if (!aiRes.ok) {
            if (aiRes.status === 429) {
              return jsonError(429, "The Coach is busy right now. Please try again in a moment.");
            }
            if (aiRes.status === 402) {
              // Operator-facing detail (credits/billing) stays in server logs only.
              console.error("Coach AI gateway 402 — workspace AI credits unavailable");
              return jsonError(
                402,
                "The Coach is temporarily unavailable. Please try again later.",
              );
            }
            const t = await aiRes.text();
            console.error("Coach AI gateway error", aiRes.status, t.slice(0, 400));
            return jsonError(502, "The Coach is temporarily unavailable. Please try again shortly.");
          }

          return new Response(aiRes.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        } catch (e) {
          // Log the internal detail; never return provider/database/config text.
          console.error("coach error", e);
          return jsonError(500, "Something went wrong. Please try again.");
        }

      },
    },
  },
});
