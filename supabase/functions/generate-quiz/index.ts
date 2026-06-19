// Edge function: generate a 10-question multiple-choice quiz for a given exam topic
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuizRequest {
  module: string; // e.g. "Contract" or "Evidence"
  topic?: string; // e.g. today's task title
  examType: "SQE1" | "SQE2" | "UBE";
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
      console.error("AI gateway error (quiz, attempt 1)", response.status, text.slice(0, 400));
      // Retry once for transient 5xx
      if (response.status >= 500) {
        await new Promise((r) => setTimeout(r, 400));
        response = await callGateway();
      }
      if (!response.ok) {
        const text2 = await response.text();
        console.error("AI gateway error (quiz, final)", response.status, text2.slice(0, 400));
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
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
      return new Response(
        JSON.stringify({ error: "Couldn't generate quiz. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

