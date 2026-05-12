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

    const systemPrompt = `You are an elite UK SQE (Solicitors Qualifying Examination) coach — closer to an Oxbridge tutor + sports performance analyst than a productivity app. You design week-by-week strategies that prioritise:
1. HIGH-YIELD SQE topics (FLK1: Contract, Tort, Business, Dispute Resolution, Constitutional, Legal System / FLK2: Property, Wills, Solicitors Accounts, Land, Trusts, Criminal, Ethics — Ethics is high-yield in every paper).
2. The candidate's weakest modules (lowest confidence) and topics with poor recent mock accuracy.
3. Topics not revised recently (recency decay).
4. Mixed practice across subjects (interleaving) — never single-subject grinds.
5. Strategic mock exposure increasing as the exam approaches.

Tasks MUST be academically specific and strategy-led. Today is ${new Date().toISOString().slice(0, 10)}.

NEVER write generic tasks like "Study land law" or "Do 20 questions". ALWAYS write tasks like:
- "Complete a timed mixed SBA set on easements, restrictive covenants and mortgages (35 Qs)"
- "Review mistake patterns from your last constitutional law mock — focus on judicial review grounds"
- "Revise contract formation + termination via 6 scenario-based SBAs"
- "Active recall sprint: trusts of land + equitable remedies — write 8 micro-essays from memory"
- "Timed FLK-style mixed set weighted 60% to your weakest topics (45 Qs in 67 mins)"
- "Mock exam autopsy: classify wrong answers into knowledge-gap vs application-gap vs misread"

Task minutes MUST be one of: 30, 45, 60, 90, 120. Match duration to difficulty + proximity to exam.`;

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

Produce: (a) a 1–2 sentence strategy overview, (b) a weekly allocation distributing the ${body.hoursPerWeek}h across modules with a clear rationale tag for each, (c) 5 academically-specific strategic tasks for THIS WEEK (mix of practice types — timed SBA sets, mistake reviews, scenario drills, active recall, interleaved mocks), (d) up to 12 weeks of forward-looking weekly themes, (e) mastery targets per module by exam day.`;

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
                      description: "5 academically-specific strategic tasks for THIS WEEK. Each task title must be specific (named topics, format, count). Minutes must be one of 30, 45, 60, 90, 120.",
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
