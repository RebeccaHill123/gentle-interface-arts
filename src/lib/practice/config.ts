/**
 * Practice session configuration resolution.
 *
 * Invariants:
 * - Explicit validated search parameters ALWAYS win: a Focus quick-check or
 *   Topic Map link creates a fresh config and never reuses a stored one.
 * - A launcher-provided (sessionStorage) config is only used when there is no
 *   explicit search target, and it is consumed on use so a completed session
 *   can never be silently relaunched.
 * - The requested question count is clamped to what the generator can actually
 *   deliver, so the UI never promises more questions than it hands over.
 */

/** The generate-quiz function is prompt-and-schema bound to a 10-question set. */
export const PROVIDER_MAX_QUESTIONS = 10;
export const PROVIDER_MIN_QUESTIONS = 4;

export const PRACTICE_CONFIG_KEY = "practice:config";

export type PracticeSearch = {
  subject?: string;
  subtopic?: string;
  length?: number;
  mode?: "revise" | "quiz";
};

export type PracticeConfig = {
  source: "ai-quiz" | "practice-launcher";
  format?: string;
  formatLabel: string;
  module: string;
  topic?: string;
  questions: number;
  duration: number; // minutes
  difficulty: "Foundational" | "Standard" | "Stretch" | "Adaptive";
  timed: boolean;
  adaptive: boolean;
  feedbackMode?: "immediate" | "end";
  rationale: string;
  reasonBits?: string[];
  skillFocus?: string[];
};

export function clampQuestionCount(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : PROVIDER_MAX_QUESTIONS;
  return Math.min(PROVIDER_MAX_QUESTIONS, Math.max(PROVIDER_MIN_QUESTIONS, v));
}

const MAX_TEXT = 400;

function text(v: unknown, max = MAX_TEXT): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

function stringList(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.map((x) => text(x, 120)).filter((x): x is string => !!x).slice(0, 8);
  return out.length ? out : undefined;
}

/** Validates and normalises an untrusted stored/synthesised config. */
export function normaliseConfig(raw: unknown): PracticeConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const module = text(r.module, 120);
  const formatLabel = text(r.formatLabel, 160);
  if (!module || !formatLabel) return null;
  const questions = clampQuestionCount(r.questions);
  const durationRaw =
    typeof r.duration === "number" && Number.isFinite(r.duration) ? Math.floor(r.duration) : 0;
  const duration = Math.min(240, Math.max(5, durationRaw || questions * 2));
  const difficulty =
    r.difficulty === "Foundational" ||
    r.difficulty === "Standard" ||
    r.difficulty === "Stretch" ||
    r.difficulty === "Adaptive"
      ? r.difficulty
      : "Adaptive";
  return {
    source: r.source === "ai-quiz" ? "ai-quiz" : "practice-launcher",
    format: text(r.format, 60),
    formatLabel,
    module,
    topic: text(r.topic, 160),
    questions,
    duration,
    difficulty,
    timed: r.timed !== false,
    adaptive: r.adaptive !== false,
    feedbackMode: r.feedbackMode === "end" ? "end" : "immediate",
    rationale: text(r.rationale, 600) ?? `Targeted practice on ${module}.`,
    reasonBits: stringList(r.reasonBits),
    skillFocus: stringList(r.skillFocus),
  };
}

export function parseStoredConfig(raw: string | null | undefined): PracticeConfig | null {
  if (!raw) return null;
  try {
    return normaliseConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Builds a fresh config from explicit, already-validated search params. */
export function synthesizeSearchConfig(search: PracticeSearch): PracticeConfig | null {
  const subject = text(search.subject, 120);
  if (!subject) return null;
  const subtopic = text(search.subtopic, 160);
  const isRevise = search.mode === "revise";
  const questions = clampQuestionCount(search.length ?? (isRevise ? 5 : PROVIDER_MAX_QUESTIONS));
  const target = subtopic ?? subject;
  return normaliseConfig({
    source: "practice-launcher",
    format: isRevise ? "recall" : "targeted",
    formatLabel: `${isRevise ? "Recall check" : "Targeted quiz"}: ${target}`,
    module: subject,
    topic: target,
    questions,
    duration: Math.max(10, questions * 2),
    difficulty: "Adaptive",
    timed: true,
    adaptive: true,
    rationale: subtopic
      ? `Generated from the Topic Map — ${isRevise ? "short recall set" : "targeted practice"} on “${subtopic}”.`
      : `Generated from the Topic Map — targeted on ${subject}.`,
    reasonBits: [`focused on ${target}`],
    skillFocus: isRevise
      ? ["Recall", "Speed", "Rule accuracy"]
      : ["Application", "Issue spotting", "Accuracy"],
  });
}

export type ConfigResolution =
  | { kind: "search" | "stored"; config: PracticeConfig; consumeStored: boolean }
  | { kind: "none" };

/**
 * Search params take precedence; a stored launcher config is a fallback only.
 * `consumeStored` tells the caller to clear the stored config either way, so a
 * stale one can never be picked up by a later mount.
 */
export function resolvePracticeConfig(input: {
  search: PracticeSearch;
  storedRaw?: string | null;
}): ConfigResolution {
  const fromSearch = synthesizeSearchConfig(input.search);
  if (fromSearch) return { kind: "search", config: fromSearch, consumeStored: true };
  const stored = parseStoredConfig(input.storedRaw ?? null);
  if (stored) return { kind: "stored", config: stored, consumeStored: true };
  return { kind: "none" };
}

/** Stable fingerprint over the fields that define "the same session request". */
export function configFingerprint(config: PracticeConfig): string {
  const basis = [
    config.source,
    config.format ?? "",
    config.module,
    config.topic ?? "",
    String(config.questions),
    String(config.duration),
    config.difficulty,
    config.timed ? "timed" : "untimed",
  ].join("|");
  let h = 0;
  for (let i = 0; i < basis.length; i++) h = (Math.imul(31, h) + basis.charCodeAt(i)) | 0;
  return `cfg_${(h >>> 0).toString(36)}`;
}
