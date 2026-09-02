/**
 * Validates provider-generated quiz questions before they can launch a session.
 * Pure, browser-safe, and deliberately standalone so the Edge Function keeps its
 * own copy of the equivalent rules (no cross-runtime import coupling).
 */

export const MAX_PROMPT_CHARS = 1200;
export const MAX_OPTION_CHARS = 400;
export const MAX_EXPLANATION_CHARS = 2000;

export type QuizQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

function bounded(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

/** One question is usable only if every field is present, bounded and well-shaped. */
export function normaliseQuestion(raw: unknown): QuizQuestion | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const prompt = bounded(r.prompt, MAX_PROMPT_CHARS);
  const explanation = bounded(r.explanation, MAX_EXPLANATION_CHARS);
  if (!prompt || !explanation) return null;
  if (!Array.isArray(r.options) || r.options.length !== 4) return null;
  const options: string[] = [];
  for (const o of r.options) {
    const opt = bounded(o, MAX_OPTION_CHARS);
    if (!opt) return null;
    options.push(opt);
  }
  if (new Set(options.map((o) => o.toLowerCase())).size !== 4) return null;
  const idx = r.correctIndex;
  if (typeof idx !== "number" || !Number.isInteger(idx) || idx < 0 || idx > 3) return null;
  return { prompt, options, correctIndex: idx, explanation };
}

export type QuizValidation =
  | { ok: true; questions: QuizQuestion[] }
  | { ok: false; error: string };

/** A session is still worth running with at least this many usable questions. */
export const MIN_USABLE_QUESTIONS = 4;

/**
 * Returns up to `requested` usable, non-duplicate questions. A short set is
 * accepted (the session then honestly runs with fewer questions) as long as at
 * least `minimum` usable questions survived validation.
 * `requested` must already be clamped to the provider's real maximum.
 */
export function validateQuizQuestions(
  raw: unknown,
  requested: number,
  options: { minimum?: number } = {},
): QuizValidation {
  if (!Array.isArray(raw)) return { ok: false, error: "The generator returned no questions." };
  const want = Math.max(1, Math.floor(requested));
  const minimum = Math.max(1, Math.min(want, Math.floor(options.minimum ?? MIN_USABLE_QUESTIONS)));
  const seen = new Set<string>();
  const out: QuizQuestion[] = [];
  for (const item of raw) {
    const q = normaliseQuestion(item);
    if (!q) continue;
    const key = q.prompt.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
    if (out.length === want) break;
  }
  if (out.length < minimum) {
    return {
      ok: false,
      error: `We only got ${out.length} usable question${out.length === 1 ? "" : "s"} — at least ${minimum} are needed. Please try again.`,
    };
  }
  return { ok: true, questions: out };
}

