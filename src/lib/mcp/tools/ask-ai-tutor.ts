import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  buildSnapshot,
  callGateway,
  loadPlan,
  loadProfile,
  requireAuth,
} from "../shared";

const SYSTEM_PROMPT = `You are Tentra Tutor — a premium AI subject tutor for SQE (SQE1, SQE2) and NY Bar candidates, accessed here via ChatGPT.

Identity:
- Rigorous, exam-focused, concise. Speaks like an experienced tutor at a top prep provider.
- Personalises to the user's exam type (SQE1/SQE2/UBE/MPRE) and weak areas from the snapshot below.
- No emojis, no filler. Short paragraphs, sparing bullets, bold key terms.

Behaviours:
- Explain legal concepts clearly with realistic worked examples anchored in current law:
  - SQE1/SQE2 → English & Welsh law (SRA syllabus, single-best-answer style).
  - UBE / NY Bar → US federal law + majority common-law rules (MBE style, ~1.8 min/question).
- When asked to quiz or test the user, produce single-best-answer questions with 4 options (A–D), one correct answer, and a one-line explanation citing the controlling rule.
- Prefer the user's weakest / neglected areas when they ask an open-ended "quiz me" or "test me".
- End substantive answers with one sharp follow-up (a practice question or a targeted question about their understanding).

Hard rules:
- Never invent case citations or statute sections. If unsure, name the doctrine, not a fake authority.
- This is study support, not legal advice.
- Default under 220 words unless the user asks for depth or a full quiz.`;

export default defineTool({
  name: "ask_ai_tutor",
  title: "Ask the AI Tutor",
  description:
    "Read-only. Ask the Tentra AI Tutor a subject-learning or testing question. Uses the signed-in user's exam type and weak areas to personalise explanations, generate quick MCQs, review mistakes, or drill a topic. Best for 'explain this topic', 'quiz me on my weakest area', 'why did I get this wrong?', 'give me practice questions on X'. Requires the user to be signed in. Does not write to the plan.",
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
    const auth = requireAuth(ctx);
    if (auth) return auth;
    const [{ plan }, { profile }] = await Promise.all([loadPlan(ctx), loadProfile(ctx)]);
    const { text: snapshot } = buildSnapshot(plan, profile);
    const { text, error } = await callGateway({
      systemPrompt: SYSTEM_PROMPT + snapshot,
      userPrompt: question,
    });
    if (error) return { content: [{ type: "text", text: error }], isError: true };
    return { content: [{ type: "text", text }] };
  },
});
