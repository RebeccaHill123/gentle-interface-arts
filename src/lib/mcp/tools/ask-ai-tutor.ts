import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  buildSnapshot,
  callGateway,
  loadAiContext,
  requireAccess,
} from "../shared";
import { getExamLabel, type ExamLabel } from "@/lib/exam-label";

function systemPromptFor(exam: ExamLabel | "GENERIC") {
  const identity = exam === "UBE"
    ? "a premium AI U.S. Bar subject tutor accessed here via ChatGPT"
    : exam === "MPRE"
      ? "a premium AI MPRE subject tutor accessed here via ChatGPT"
      : exam === "ACCA"
        ? "a premium AI ACCA subject tutor accessed here via ChatGPT"
        : exam === "SQE"
          ? "a premium AI SQE subject tutor accessed here via ChatGPT"
          : "a premium AI professional-exam subject tutor accessed here via ChatGPT";
  const pathwayRules = exam === "UBE"
    ? "UBE / NY Bar → US federal law + majority common-law rules, MBE/MEE/MPT terminology and bar-exam style. Do not use SQE, FLK, SBA or ACCA wording unless the user explicitly asks for a comparison."
    : exam === "MPRE"
      ? "MPRE → ABA Model Rules, Model Code of Judicial Conduct and professional-responsibility scenarios. Do not use SQE, FLK, SBA, UBE, MBE/MEE/MPT or ACCA wording unless the user explicitly asks for a comparison."
      : exam === "ACCA"
        ? "ACCA → ACCA paper, syllabus-area and objective-test terminology, with workings and standards where relevant. Do not use SQE, FLK, SBA, UBE, MBE/MEE/MPT or legal-advice wording unless the user explicitly asks for a comparison."
        : exam === "SQE"
          ? "SQE1/SQE2 → English & Welsh law, SRA syllabus, FLK1/FLK2 and single-best-answer terminology. Do not use UBE, MBE/MEE/MPT, MPRE or ACCA wording unless the user explicitly asks for a comparison."
          : "Use only the pathway terminology present in the user's snapshot. If no pathway is available, ask which exam they are preparing for before giving exam-specific teaching.";
  const disclaimer = exam === "ACCA"
    ? "This is study support, not accounting, tax or financial advice."
    : exam === "GENERIC"
      ? "This is study support, not professional advice."
      : "This is study support, not legal advice.";

  return `You are Tentra Tutor — ${identity}.

Identity:
- Rigorous, exam-focused, concise. Speaks like an experienced tutor at a top prep provider.
- Personalises to the user's exam pathway and weak areas from the snapshot below.
- No emojis, no filler. Short paragraphs, sparing bullets, bold key terms.

Behaviours:
- Explain concepts clearly with realistic worked examples anchored in the relevant syllabus:
  - ${pathwayRules}
- When asked to quiz or test the user, produce pathway-appropriate questions with 4 options (A–D), one correct answer, and a concise explanation.
- Prefer the user's weakest / neglected areas when they ask an open-ended "quiz me" or "test me".
- End substantive answers with one sharp follow-up (a practice question or a targeted question about their understanding).

Hard rules:
- Never invent case citations or statute sections. If unsure, name the doctrine, not a fake authority.
- ${disclaimer}
- Default under 220 words unless the user asks for depth or a full quiz.`;
}

export default defineTool({
  name: "ask_ai_tutor",
  title: "Ask the AI Tutor",
  description:
    "Read-only. Ask the Tentra AI Tutor a subject-learning or testing question. Uses the signed-in user's exam type and weak areas to personalise explanations, generate quick MCQs, review mistakes, or drill a topic. Best for 'explain this topic', 'quiz me on my weakest area', 'why did I get this wrong?', 'give me practice questions on X'. Requires active Tentra access (subscription or trial). Does not write to the plan.",
  inputSchema: {
    question: z
      .string()
      .trim()
      .min(3)
      .max(2000)
      .describe("The user's question, topic, or 'quiz me' request for the AI Tutor."),
  },
  annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ question }, ctx) => {
    const auth = await requireAccess(ctx);
    if (auth) return auth;
    // A plan/profile read error must stop us before the provider is called —
    // answering from an accidentally blank context is not acceptable here.
    const context = await loadAiContext(ctx);
    if (!context.ok) return context.error;
    const exam = context.plan ? getExamLabel(context.plan.input.examType, context.plan.input.examPath) : "GENERIC";
    const { text: snapshot } = buildSnapshot(context.plan, context.profile);
    const { text, error } = await callGateway({
      systemPrompt: systemPromptFor(exam) + snapshot,
      userPrompt: question,
    });
    if (error) return { content: [{ type: "text", text: error }], isError: true };
    return { content: [{ type: "text", text }] };
  },
});
