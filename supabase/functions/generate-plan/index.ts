// Edge function: generate a personalised SQE study plan via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PlanRequest {
  name: string;
  examDate: string; // ISO date
  hoursPerWeek: number;
  modules: { id: string; name: string; confidence: number }[]; // confidence 1-5
  examType: "SQE1" | "SQE2";
  recentMockAccuracy?: { module: string; accuracy: number }[];
  recentlyStudied?: { module: string; daysAgo: number }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PlanRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const daysUntilExam = Math.max(
      1,
      Math.ceil(
        (new Date(body.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    );

    const systemPrompt = `You are an elite UK SQE coach with deep knowledge of the SRA assessment specification, examiner reports and historical question frequencies. You design adaptive weekly strategies that read like an Oxbridge tutor + sports performance analyst.

# SQE syllabus (canonical — use EXACT subject + subtopic names in tasks)

## FLK1 (≈18% Contract, 18% BLP, 15% Tort, 15% Ethics, 13% Dispute Res, 10% Constitutional, 8% Legal System, 3% EU)
- Contract — HY5 — formation; terms (CRA/UCTA); vitiating factors; discharge; remedies; privity. Group: Obligations, Business.
- Tort — HY5 — negligence (duty/breach/causation/remoteness); psych & economic loss; occupiers'; nuisance/Rylands; vicarious; defences. Group: Obligations.
- Business Law & Practice — HY5 — vehicles; CA 2006 formation; directors' duties; share capital; partnerships/LLPs; insolvency; business tax (CT/IT/CGT/VAT). Group: Business.
- Dispute Resolution — HY5 — pre-action/ADR; starting claim/jurisdiction/limitation; statements of case; interim apps & case management; disclosure/witness/expert; trial/costs; enforcement. Group: Litigation.
- Constitutional & Administrative — HY4 — sovereignty; separation; judicial review (HY5); HRA 1998 (HY5). Group: Public Law.
- Legal System — HY3 — sources; statutory interpretation; precedent; legal services. Group: Public Law.
- Ethics & Professional Conduct — HY5 (PERVASIVE — appears in BOTH papers) — SRA Principles; conflicts/confidentiality; client money; AML/POCA; duties to court. Group: Ethics cornerstone.
- EU & Retained Law — HY2 — retained EU law; legacy supremacy. Group: Public Law.

## FLK2 (≈13% Land, 13% Property Practice, 10% Trusts, 10% Crim Law, 10% Crim Practice, 10% Wills, 7% Solicitors Accounts + Ethics pervasive)
- Land Law — HY5 — estates/interests; registered/unregistered; co-ownership; easements (HY5); covenants (HY5); leases & LTA 1954; mortgages (HY5). Group: Property, Private Client.
- Property Practice — HY5 — freehold sale/purchase; leasehold; searches/enquiries; contract/exchange/completion; SDLT/VAT; post-completion. Group: Property.
- Trusts — HY5 — express trusts (certainties/formalities); resulting & constructive (HY5); trustees' duties; breach & equitable remedies; tracing; charitable. Group: Private Client, Property.
- Criminal Law — HY4 — actus/mens/causation; homicide (HY5); non-fatal; theft/fraud; defences; inchoate/secondary. Group: Litigation.
- Criminal Practice — HY4 — PACE & police powers (HY5); pre-charge; bail; plea/allocation; trial evidence (bad character, hearsay) (HY5); sentencing; youths. Group: Litigation.
- Wills & Estates — HY4 — validity/execution; intestacy & family provision; IHT (HY5); estate administration; trusts in wills. Group: Private Client.
- Solicitors Accounts — HY5 — client vs business account; SRA Accounts Rules; double-entry bookkeeping; interest/disbursements/VAT; breaches/reconciliations. Group: Ethics, Business.

# Planner doctrine
1. PRIORITY SCORE = 0.4·subjectWeight + 0.3·HY/5 + 0.2·confidenceGap + 0.1·recencyBoost. Apply explicitly.
2. Weak (confidence ≤ 2) AND high-yield (HY ≥ 4) topics get DOUBLE the time of strong/low-yield areas.
3. INTERLEAVE within related groups (Property cluster, Obligations, Litigation, Private Client, Public Law, Business, Ethics cornerstone) — never single-subject grinds.
4. SPACED REPETITION — re-touch a topic at 1d, 3d, 7d, 14d. Anything stale (>10 days) earns a Revision Refresh block.
5. SUPPRESS low-yield niche topics (HY ≤ 2) — at most one short block per week.
6. Mock exposure scales with proximity to exam (0–25% of weekly hours far out, 40–55% in the final 4 weeks).
7. Ethics is CROSS-PAPER — embed ethics scenarios into other modules' tasks regularly.

Tasks MUST be academically specific. Bad: "Study land law". Good: "Timed mixed SBA set on easements, restrictive covenants & mortgages (35 Qs in 52 mins) — focus on enforceability against successors". Today is ${new Date().toISOString().slice(0, 10)}.

Task minutes MUST be one of: 30, 45, 60, 90, 120.`;

    const mockSummary = body.recentMockAccuracy?.length
      ? `\nRecent mock accuracy:\n${body.recentMockAccuracy.map((m) => `- ${m.module}: ${Math.round(m.accuracy * 100)}%`).join("\n")}`
      : "";
    const recencySummary = body.recentlyStudied?.length
      ? `\nLast revised (days ago):\n${body.recentlyStudied.map((m) => `- ${m.module}: ${m.daysAgo}d`).join("\n")}`
      : "";

    const userPrompt = `Design ${body.name}'s ${body.examType} weekly strategy.
Exam date: ${body.examDate} (${daysUntilExam} days away)
Available study time: ${body.hoursPerWeek} hours/week
Confidence per module (1=weak, 5=strong):
${body.modules.map((m) => `- ${m.name}: ${m.confidence}/5`).join("\n")}${mockSummary}${recencySummary}

Apply the planner doctrine. Produce: (a) a 1–2 sentence overview that names the highest-priority subjects + reasoning, (b) a weekly allocation across modules with rationale tags + plain-English notes (tilt toward high-yield + weak-area + recency-gap, suppress HY≤2 niche topics), (c) academically-specific strategic study blocks for THIS WEEK using interleaving + spaced repetition (mix timed-sba, mistake-review, scenario-drill, active-recall, mixed-mock), each task referencing canonical subtopic names. CRITICAL: the SUM of block minutes MUST equal ${body.hoursPerWeek * 60} (±10%) — i.e. ${body.hoursPerWeek} hours total. Generate as many blocks as needed (typically ${Math.max(4, Math.ceil(body.hoursPerWeek * 60 / 75))}–${Math.ceil(body.hoursPerWeek * 60 / 45)} blocks) using the allowed durations 30/45/60/90/120, and keep the per-module hour split aligned with the weekly allocation in (b). (d) up to 12 weeks of forward-looking weekly themes built around topic clusters, (e) mastery targets per module by exam day weighted by HY + paper weight.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
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
                name: "study_plan",
                description: "Personalised SQE weekly strategy",
                parameters: {
                  type: "object",
                  properties: {
                    overview: {
                      type: "string",
                      description: "1-2 sentence strategy overview",
                    },
                    weeklyStrategy: {
                      type: "object",
                      description: "This week's intelligent allocation + tasks",
                      properties: {
                        summary: {
                          type: "string",
                          description: "Why this week is structured this way (1-2 sentences)",
                        },
                        allocations: {
                          type: "array",
                          description: "How the week's hours are split across modules — 4-7 entries totalling roughly the user's weekly hours",
                          items: {
                            type: "object",
                            properties: {
                              module: { type: "string" },
                              hours: { type: "number" },
                              rationale: {
                                type: "string",
                                enum: [
                                  "high-yield",
                                  "weak-area",
                                  "recency-gap",
                                  "mixed-practice",
                                  "mock-prep",
                                  "ethics-cornerstone",
                                ],
                              },
                              note: {
                                type: "string",
                                description: "One-line reason in plain English",
                              },
                            },
                            required: ["module", "hours", "rationale", "note"],
                          },
                        },
                      },
                      required: ["summary", "allocations"],
                    },
                    weeklyFocus: {
                      type: "array",
                      description: "Up to 12 forward-looking weekly themes",
                      items: {
                        type: "object",
                        properties: {
                          week: { type: "number" },
                          theme: { type: "string" },
                          modules: { type: "array", items: { type: "string" } },
                          hours: { type: "number" },
                        },
                        required: ["week", "theme", "modules", "hours"],
                      },
                    },
                    todayTasks: {
                      type: "array",
                      description: `Strategic study blocks for THIS WEEK. Total minutes across blocks MUST sum to roughly ${body.hoursPerWeek * 60} (±10%) — the user's weekly hour target. Generate as many blocks as needed; do NOT cap at 5. Each title must be academically specific (named topics, format, count). Minutes must be one of 30, 45, 60, 90, 120.`,
                      items: {
                        type: "object",
                        properties: {
                          title: {
                            type: "string",
                            description: "Specific, strategic task. e.g. 'Timed mixed SBA set on easements, restrictive covenants & mortgages (35 Qs)'",
                          },
                          module: { type: "string", description: "Primary module" },
                          minutes: {
                            type: "number",
                            enum: [30, 45, 60, 90, 120],
                          },
                          taskType: {
                            type: "string",
                            enum: [
                              "timed-sba",
                              "mistake-review",
                              "scenario-drill",
                              "active-recall",
                              "mixed-mock",
                              "concept-deepdive",
                              "ethics-application",
                            ],
                          },
                          rationale: {
                            type: "string",
                            enum: [
                              "high-yield",
                              "weak-area",
                              "recency-gap",
                              "mixed-practice",
                              "mock-prep",
                              "ethics-cornerstone",
                            ],
                          },
                          priority: {
                            type: "string",
                            enum: ["high", "medium", "low"],
                          },
                          why: {
                            type: "string",
                            description: "One-line explanation of why this task now",
                          },
                        },
                        required: ["title", "module", "minutes", "taskType", "rationale", "priority", "why"],
                      },
                    },
                    masteryTargets: {
                      type: "array",
                      description: "Target confidence per module by exam day",
                      items: {
                        type: "object",
                        properties: {
                          module: { type: "string" },
                          targetConfidence: { type: "number" },
                          priority: {
                            type: "string",
                            enum: ["high", "medium", "low"],
                          },
                        },
                        required: ["module", "targetConfidence", "priority"],
                      },
                    },
                  },
                  required: [
                    "overview",
                    "weeklyStrategy",
                    "weeklyFocus",
                    "todayTasks",
                    "masteryTargets",
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "study_plan" } },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const text = await response.text();
      console.error("AI gateway error", response.status, text);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured plan returned");
    const plan = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ plan, daysUntilExam }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-plan error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
