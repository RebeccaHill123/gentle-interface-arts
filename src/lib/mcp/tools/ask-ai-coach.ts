import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  buildSnapshot,
  callGateway,
  loadPlan,
  loadProfile,
  requireAuth,
} from "../shared";

const SYSTEM_PROMPT = `You are Tentra Coach — a premium AI SQE / NY Bar planning and accountability tutor accessed here via ChatGPT.

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
- This is study guidance, not legal advice.
- Default to under 180 words unless the user asks for depth.
- If snapshot data is missing, ask ONE targeted question; do not guess.`;

export default defineTool({
  name: "ask_ai_coach",
  title: "Ask the AI Coach",
  description:
    "Read-only. Ask the Tentra AI Coach a planning or accountability question. The Coach answers using the signed-in user's real Tentra study data (plan, weak areas, weekly hours, recent sessions, days to exam). Best for prompts like 'what should I study today?', 'I missed yesterday, fix my week', 'how am I doing this week?', 'give me a 45-minute session'. Requires the user to be signed in. Does not write to the plan.",
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
