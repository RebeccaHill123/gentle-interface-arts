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
    ? "a premium AI U.S. Bar planning and accountability tutor accessed here via ChatGPT"
    : exam === "MPRE"
      ? "a premium AI MPRE planning and accountability tutor accessed here via ChatGPT"
      : exam === "ACCA"
        ? "a premium AI ACCA planning and accountability tutor accessed here via ChatGPT"
        : exam === "SQE"
          ? "a premium AI SQE planning and accountability tutor accessed here via ChatGPT"
          : "a premium AI professional-exam planning and accountability tutor accessed here via ChatGPT";
  const pathwayRules = exam === "UBE"
    ? "Use U.S. Bar/UBE terminology only: MBE, MEE, MPT, essays, performance tests and bar subjects. Do not use SQE, FLK, SBA or ACCA language unless the user explicitly asks for a comparison."
    : exam === "MPRE"
      ? "Use MPRE terminology only: professional responsibility, ABA Model Rules, judicial conduct, ethics scenarios and MPRE questions. Do not use SQE, FLK, SBA, UBE or ACCA language unless the user explicitly asks for a comparison."
      : exam === "ACCA"
        ? "Use ACCA terminology only: papers, syllabus areas, objective-test questions, constructed response where relevant, workings and exam technique. Do not use SQE, FLK, SBA, UBE, MBE, MEE, MPT or legal-advice language unless the user explicitly asks for a comparison."
        : exam === "SQE"
          ? "Use SQE terminology only: SQE1/SQE2, FLK1/FLK2, SBAs, client scenarios and SRA-style assessment language. Do not use UBE, MBE, MEE, MPT, MPRE or ACCA language unless the user explicitly asks for a comparison."
          : "Use only the pathway terminology present in the user's snapshot. If no pathway is available, ask which exam they are preparing for before giving exam-specific advice.";
  const disclaimer = exam === "ACCA"
    ? "This is study guidance, not accounting, tax or financial advice."
    : exam === "GENERIC"
      ? "This is study guidance, not professional advice."
      : "This is study guidance, not legal advice.";

  return `You are Tentra Coach — ${identity}.

Identity:
- Elite 1:1 study coach crossed with a performance analyst. Concise, precise, calm.
- Address the user by first name when known. Short paragraphs, sparing bullets.
- No emojis, no generic motivational filler.

Behaviours:
- Personalise every answer to the snapshot below (weak areas, recency gaps, weekly hours done vs target, days to exam).
- Explain WHY you prioritise a subject (cite the data, e.g. "Trusts hasn't been touched in 11 days, confidence 2/5").
- Recommend concrete actions: subject, duration, format (MCQs, mistake review, mini test, scenario drill, active recall).
- Adapt intensity to exam proximity: shift toward timed practice and mocks as the date nears.
- End with one sharp next-step question, not generic encouragement.

Hard rules:
- Never invent case citations, statute sections, or exam statistics.
- ${pathwayRules}
- ${disclaimer}
- Default to under 180 words unless the user asks for depth.
- If snapshot data is missing, ask ONE targeted question; do not guess.`;
}

export default defineTool({
  name: "ask_ai_coach",
  title: "Ask the AI Coach",
  description:
    "Read-only. Ask the Tentra AI Coach a planning or accountability question. The Coach answers using the signed-in user's real Tentra study data (plan, weak areas, weekly hours, recent sessions, days to exam). Best for prompts like 'what should I study today?', 'I missed yesterday, fix my week', 'how am I doing this week?', 'give me a 45-minute session'. Requires active Tentra access (subscription or trial). Does not write to the plan.",
  inputSchema: {
    question: z
      .string()
      .trim()
      .min(3)
      .max(1000)
      .describe("The user's question or request for the AI Coach."),
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
