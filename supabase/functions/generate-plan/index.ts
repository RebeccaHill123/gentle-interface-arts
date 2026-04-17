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

    const systemPrompt = `You are an expert UK SQE (Solicitors Qualifying Examination) study coach. You create realistic, motivating, week-by-week study plans. Be specific to SQE syllabus. Today is ${new Date().toISOString().slice(0, 10)}.`;

    const userPrompt = `Create a personalised ${body.examType} study plan for ${body.name}.
Exam date: ${body.examDate} (${daysUntilExam} days away)
Available study time: ${body.hoursPerWeek} hours per week
Current confidence per module (1=weak, 5=strong):
${body.modules.map((m) => `- ${m.name}: ${m.confidence}/5`).join("\n")}

Generate a plan that prioritises weaker modules, includes mock exam practice in the final 4 weeks, and gives 3 specific tasks for today.`;

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
                description: "Personalised SQE study plan",
                parameters: {
                  type: "object",
                  properties: {
                    overview: {
                      type: "string",
                      description: "1-2 sentence motivating overview of the plan",
                    },
                    weeklyFocus: {
                      type: "array",
                      description:
                        "Up to 12 weeks. Each item is one week of focus.",
                      items: {
                        type: "object",
                        properties: {
                          week: { type: "number" },
                          theme: { type: "string" },
                          modules: {
                            type: "array",
                            items: { type: "string" },
                          },
                          hours: { type: "number" },
                        },
                        required: ["week", "theme", "modules", "hours"],
                      },
                    },
                    todayTasks: {
                      type: "array",
                      description: "3 concrete tasks for today",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          module: { type: "string" },
                          minutes: { type: "number" },
                        },
                        required: ["title", "module", "minutes"],
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
          JSON.stringify({
            error: "Rate limit reached. Please try again in a moment.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add credits in Lovable workspace.",
          }),
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
