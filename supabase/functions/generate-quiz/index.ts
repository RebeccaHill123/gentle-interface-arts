// Edge function: generate a 10-question multiple-choice quiz for a given SQE topic
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuizRequest {
  module: string; // e.g. "Contract"
  topic?: string; // e.g. today's task title
  examType: "SQE1" | "SQE2";
  confidence?: number; // 1-5, used to scale difficulty
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: QuizRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const difficulty =
      (body.confidence ?? 3) <= 2
        ? "introductory"
        : (body.confidence ?? 3) >= 4
          ? "advanced, exam-realistic"
          : "intermediate";

    const systemPrompt = `You are an expert UK SQE (Solicitors Qualifying Examination) tutor. You write rigorous single-best-answer multiple-choice questions in the style of the official SRA SQE assessments. Each question must have exactly 4 options (A-D), exactly one correct answer, and a concise explanation.`;

    const userPrompt = `Write a 10-question ${difficulty} ${body.examType} mini-assessment.
Module: ${body.module}
${body.topic ? `Specific topic / today's task: ${body.topic}` : ""}
Make the questions varied, scenario-based where appropriate, and grounded in current English & Welsh law. Avoid trick wording.`;

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
                        required: [
                          "prompt",
                          "options",
                          "correctIndex",
                          "explanation",
                        ],
                      },
                    },
                  },
                  required: ["questions"],
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "mini_assessment" },
          },
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit reached. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add credits in Lovable workspace.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
    if (!toolCall) throw new Error("No quiz returned");
    const quiz = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
