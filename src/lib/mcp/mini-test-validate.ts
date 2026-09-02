// Bounds and validation for the MCP mini-test tool.
//
// Inputs are bounded so an entitled caller cannot push an arbitrarily large
// prompt at the provider; outputs are validated so we never hand back raw
// provider tool arguments as if they were a usable assessment.

export const MAX_SUBJECT_CHARS = 80; // matches the quiz edge function's module bound
export const MAX_TOPIC_CHARS = 200; // matches the quiz edge function's topic bound
export const MAX_PROMPT_CHARS = 2000;
export const MAX_OPTION_CHARS = 600;
export const MAX_EXPLANATION_CHARS = 2000;

export type MiniTestQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

function boundedString(
  raw: unknown,
  max: number,
  label: string,
): Validated<string> {
  if (typeof raw !== "string") return { ok: false, error: `${label} must be text` };
  const value = raw.trim();
  if (!value) return { ok: false, error: `${label} must not be empty` };
  if (value.length > max) {
    return { ok: false, error: `${label} must be ${max} characters or fewer` };
  }
  return { ok: true, value };
}

export function validateMiniTestInput(input: {
  subject?: string | undefined;
  topic?: string | undefined;
  questionCount?: number | undefined;
}): Validated<{ subject?: string; topic?: string; questionCount: number }> {
  const out: { subject?: string; topic?: string; questionCount: number } = {
    questionCount: 5,
  };
  if (input.subject !== undefined) {
    const r = boundedString(input.subject, MAX_SUBJECT_CHARS, "subject");
    if (!r.ok) return r;
    out.subject = r.value;
  }
  if (input.topic !== undefined) {
    const r = boundedString(input.topic, MAX_TOPIC_CHARS, "topic");
    if (!r.ok) return r;
    out.topic = r.value;
  }
  if (input.questionCount !== undefined) {
    const n = Number(input.questionCount);
    if (!Number.isInteger(n) || n < 3 || n > 10) {
      return { ok: false, error: "questionCount must be a whole number between 3 and 10" };
    }
    out.questionCount = n;
  }
  return { ok: true, value: out };
}

/**
 * Validates provider output. Requires exactly `expectedCount` well-formed
 * questions: bounded non-empty prompt/explanation, exactly four bounded
 * non-empty options, and an integer correctIndex in 0..3.
 */
export function validateMiniTestQuestions(
  raw: unknown,
  expectedCount: number,
): Validated<MiniTestQuestion[]> {
  if (!Array.isArray(raw)) return { ok: false, error: "malformed questions" };
  if (raw.length !== expectedCount) {
    return { ok: false, error: "unexpected question count" };
  }
  const out: MiniTestQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return { ok: false, error: "malformed question" };
    const q = item as Record<string, unknown>;
    const prompt = boundedString(q["prompt"], MAX_PROMPT_CHARS, "prompt");
    if (!prompt.ok) return { ok: false, error: "malformed question" };
    const explanation = boundedString(q["explanation"], MAX_EXPLANATION_CHARS, "explanation");
    if (!explanation.ok) return { ok: false, error: "malformed question" };
    const rawOptions = q["options"];
    if (!Array.isArray(rawOptions) || rawOptions.length !== 4) {
      return { ok: false, error: "malformed options" };
    }
    const options: string[] = [];
    for (const opt of rawOptions) {
      const r = boundedString(opt, MAX_OPTION_CHARS, "option");
      if (!r.ok) return { ok: false, error: "malformed options" };
      options.push(r.value);
    }
    const correctIndex = q["correctIndex"];
    if (
      typeof correctIndex !== "number" ||
      !Number.isInteger(correctIndex) ||
      correctIndex < 0 ||
      correctIndex > 3
    ) {
      return { ok: false, error: "malformed correctIndex" };
    }
    out.push({
      prompt: prompt.value,
      explanation: explanation.value,
      options,
      correctIndex,
    });
  }
  return { ok: true, value: out };
}
