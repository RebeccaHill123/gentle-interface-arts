import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { buildSnapshot, loadAiContext, requireAccess } from "../shared";
import { getExamLabel } from "@/lib/exam-label";
import {
  MAX_SUBJECT_CHARS,
  MAX_TOPIC_CHARS,
  validateMiniTestInput,
  validateMiniTestQuestions,
} from "../mini-test-validate";

export default defineTool({
  name: "generate_mini_test",
  title: "Generate a mini test",
  description:
    "Read-only. Generates a short pathway-appropriate mini test (default 5 questions) for the signed-in user. If no subject is provided, targets the user's weakest area. Uses their exam pathway (SQE / UBE / MPRE / ACCA) automatically. Returns questions with 4 options each, the correct index, and a brief explanation. Requires active Tentra access (subscription or trial).",
  inputSchema: {
    subject: z
      .string()
      .trim()
      .min(1)
      .max(MAX_SUBJECT_CHARS)
      .optional()
      .describe("Module/subject to test. Omit to auto-pick the user's weakest area."),
    topic: z
      .string()
      .trim()
      .min(1)
      .max(MAX_TOPIC_CHARS)
      .optional()
      .describe("Optional narrower topic within the subject."),
    questionCount: z.number().int().min(3).max(10).optional().describe("Number of questions (default 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ subject, topic, questionCount }, ctx) => {
    const auth = await requireAccess(ctx);
    if (auth) return auth;
    const bounded = validateMiniTestInput({ subject, topic, questionCount });
    if (!bounded.ok) {
      return { content: [{ type: "text", text: bounded.error }], isError: true };
    }
    subject = bounded.value.subject;
    topic = bounded.value.topic;

    // A plan/profile read error is not "no plan" — stop before the provider.
    const context = await loadAiContext(ctx);
    if (!context.ok) return context.error;
    const { plan, profile } = context;
    if (!plan) {
      return {
        content: [
          { type: "text", text: "No plan yet — ask the user to complete onboarding first." },
        ],
        isError: true,
      };
    }
    const examType = plan.input.examType;
    const examLabel = getExamLabel(plan.input.examType, plan.input.examPath);
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
    const count = bounded.value.questionCount;

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        content: [{ type: "text", text: "AI not configured on server." }],
        isError: true,
      };
    }

    const difficulty =
      confidence <= 2 ? "introductory" : confidence >= 4 ? "advanced, exam-realistic" : "intermediate";
    const systemPrompt = examLabel === "UBE"
      ? "You are an expert U.S. Bar tutor writing rigorous MBE-style multiple-choice questions modelled on the NCBE Subject Matter Outlines. Exactly 4 options (A–D), exactly one correct answer, concise explanation citing the controlling rule. Use U.S. federal law and majority common-law only. Never reference SQE, FLK, SBA, MPRE or ACCA unless the user's topic explicitly asks for an exam comparison."
      : examLabel === "MPRE"
        ? "You are an expert MPRE tutor writing rigorous professional-responsibility multiple-choice questions. Exactly 4 options (A–D), exactly one correct answer, concise rule-led explanation. Use ABA Model Rules, Model Code of Judicial Conduct and MPRE-tested professional responsibility principles. Never reference SQE, FLK, SBA, UBE or ACCA unless the user's topic explicitly asks for an exam comparison."
        : examLabel === "ACCA"
          ? "You are an expert ACCA tutor writing rigorous ACCA-style objective-test questions. Exactly 4 options (A–D), exactly one correct answer, concise explanation with workings or the relevant standard/rule. Use ACCA syllabus terminology. Never reference SQE, FLK, SBA, UBE, MBE, MEE, MPT or MPRE unless the user's topic explicitly asks for an exam comparison."
          : "You are an expert UK SQE tutor writing rigorous single-best-answer multiple-choice questions in the style of the official SRA SQE assessments. Exactly 4 options (A–D), exactly one correct answer, concise explanation. Use English & Welsh law only. Never reference UBE, MBE, MEE, MPT, MPRE or ACCA unless the user's topic explicitly asks for an exam comparison.";
    const userPrompt = `Write a ${count}-question ${difficulty} ${examLabel} mini-assessment.\nModule: ${targetModule}${topic ? `\nTopic: ${topic}` : ""}\nMake questions varied and scenario-based where appropriate. No trick wording.`;

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
              description: "Pathway-specific multiple-choice mini-assessment",
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
    let rawQuestions: unknown = null;
    try {
      const parsed = args ? JSON.parse(args) : null;
      if (parsed && typeof parsed === "object") rawQuestions = (parsed as Record<string, unknown>)["questions"];
    } catch {
      // fallthrough — treated as malformed below
    }
    // Never return raw provider tool arguments: validate shape before use.
    const validated = validateMiniTestQuestions(rawQuestions, count);
    if (!validated.ok) {
      console.error("mini test validation failed", validated.error);
      return {
        content: [{ type: "text", text: "Could not generate the mini test — please try again." }],
        isError: true,
      };
    }
    const questions = validated.value;
    const payload = { subject: targetModule, topic: topic ?? null, examType, questions };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
