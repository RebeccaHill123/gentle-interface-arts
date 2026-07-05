import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { buildSnapshot, loadPlan, loadProfile, requireAuth } from "../shared";

type Question = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export default defineTool({
  name: "generate_mini_test",
  title: "Generate a mini test",
  description:
    "Read-only. Generates a short single-best-answer mini test (default 5 questions) for the signed-in user. If no subject is provided, targets the user's weakest area. Uses their exam type (SQE1 / SQE2 / UBE / MPRE) automatically. Returns questions with 4 options each, the correct index, and a brief explanation.",
  inputSchema: {
    subject: z.string().trim().min(1).optional().describe("Module/subject to test. Omit to auto-pick the user's weakest area."),
    topic: z.string().trim().min(1).optional().describe("Optional narrower topic within the subject."),
    questionCount: z.number().int().min(3).max(10).optional().describe("Number of questions (default 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ subject, topic, questionCount }, ctx) => {
    const auth = requireAuth(ctx);
    if (auth) return auth;
    const [{ plan }, { profile }] = await Promise.all([loadPlan(ctx), loadProfile(ctx)]);
    if (!plan) {
      return {
        content: [
          { type: "text", text: "No plan yet — ask the user to complete onboarding first." },
        ],
        isError: true,
      };
    }
    const examType = plan.input.examType;
    const { analytics } = buildSnapshot(plan, profile);
    const targetModule =
      subject ??
      analytics.weakest[0]?.module ??
      analytics.subjects[0]?.module ??
      plan.input.modules[0]?.name;
    if (!targetModule) {
      return {
        content: [{ type: "text", text: "No subject available to test." }],
        isError: true,
      };
    }
    const confidence =
      plan.input.modules.find((m) => m.name === targetModule)?.confidence ?? 3;
    const count = questionCount ?? 5;

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        content: [{ type: "text", text: "AI not configured on server." }],
        isError: true,
      };
    }

    const isUbe = examType === "UBE" || examType === "MPRE";
    const difficulty =
      confidence <= 2 ? "introductory" : confidence >= 4 ? "advanced, exam-realistic" : "intermediate";
    const systemPrompt = isUbe
      ? "You are an expert US bar (UBE / NY Bar) tutor writing rigorous MBE-style single-best-answer multiple-choice questions modelled on the NCBE Subject Matter Outlines. Exactly 4 options (A–D), exactly one correct answer, concise explanation citing the controlling rule. US federal + majority common-law only."
      : "You are an expert UK SQE tutor writing rigorous single-best-answer multiple-choice questions in the style of the official SRA SQE assessments. Exactly 4 options (A–D), exactly one correct answer, concise explanation. English & Welsh law only.";
    const userPrompt = `Write a ${count}-question ${difficulty} ${examType} mini-assessment.\nModule: ${targetModule}${topic ? `\nTopic: ${topic}` : ""}\nMake questions varied, scenario-based where appropriate. No trick wording.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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
              description: "SBA multiple-choice mini-assessment",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        prompt: { type: "string" },
                        options: { type: "array", items: { type: "string" } },
                        correctIndex: { type: "number" },
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
    if (!res.ok) {
      if (res.status === 429)
        return { content: [{ type: "text", text: "AI rate limit — retry shortly." }], isError: true };
      if (res.status === 402)
        return { content: [{ type: "text", text: "AI credits exhausted." }], isError: true };
      return { content: [{ type: "text", text: "AI gateway error." }], isError: true };
    }
    const data = (await res.json()) as {
      choices?: { message?: { tool_calls?: { function?: { arguments?: string } }[] } }[];
    };
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let questions: Question[] = [];
    try {
      const parsed = args ? JSON.parse(args) : null;
      if (parsed && Array.isArray(parsed.questions)) questions = parsed.questions;
    } catch {
      // fallthrough
    }
    if (questions.length === 0) {
      return {
        content: [{ type: "text", text: "Could not generate the mini test — please try again." }],
        isError: true,
      };
    }
    const payload = { subject: targetModule, topic: topic ?? null, examType, questions };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
