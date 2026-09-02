// Defensive validation for client-supplied AI request payloads.
//
// Client input must never be able to inject system/tool roles into a prompt, or
// push an unbounded payload into the provider (credit burn + prompt injection
// surface). These helpers are pure so the limits are unit-testable.

export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export const MAX_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_TOTAL_CHARS = 24000;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * Accepts only `user`/`assistant` roles with non-empty string content, keeps at
 * most the last MAX_MESSAGES, and enforces per-message and total size limits.
 * Anything malformed or oversized is rejected (400) rather than trimmed into
 * something the user did not ask for.
 */
export function validateChatMessages(
  raw: unknown,
): ValidationResult<ChatMessage[]> {
  const body = raw as { messages?: unknown } | null | undefined;
  const list = body?.messages;
  if (!Array.isArray(list)) return { ok: false, error: "messages must be an array" };
  if (list.length === 0) return { ok: false, error: "messages must not be empty" };
  if (list.length > 200) return { ok: false, error: "too many messages" };

  const recent = list.slice(-MAX_MESSAGES);
  const out: ChatMessage[] = [];
  let total = 0;
  for (const item of recent) {
    if (!item || typeof item !== "object") {
      return { ok: false, error: "invalid message" };
    }
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") {
      return { ok: false, error: "invalid message role" };
    }
    if (typeof content !== "string") {
      return { ok: false, error: "message content must be a string" };
    }
    const text = content.trim();
    if (!text) return { ok: false, error: "message content must not be empty" };
    if (text.length > MAX_MESSAGE_CHARS) {
      return { ok: false, error: "message too long" };
    }
    total += text.length;
    if (total > MAX_TOTAL_CHARS) {
      return { ok: false, error: "conversation too long" };
    }
    out.push({ role, content: text });
  }
  if (out.length === 0) return { ok: false, error: "messages must not be empty" };
  if (out[out.length - 1]!.role !== "user") {
    return { ok: false, error: "last message must be from the user" };
  }
  return { ok: true, value: out };
}

export const QUIZ_EXAM_TYPES = ["SQE1", "SQE2", "UBE"] as const;
export type QuizExamType = (typeof QUIZ_EXAM_TYPES)[number];

export type QuizInput = {
  examType: QuizExamType;
  module: string;
  topic?: string;
  confidence: number;
};

/** Mirrors the runtime validation inside the generate-quiz Edge Function. */
export function validateQuizInput(raw: unknown): ValidationResult<QuizInput> {
  if (!raw || typeof raw !== "object") return { ok: false, error: "invalid body" };
  const r = raw as Record<string, unknown>;
  const examType = r["examType"];
  if (
    typeof examType !== "string" ||
    !(QUIZ_EXAM_TYPES as readonly string[]).includes(examType)
  ) {
    return { ok: false, error: "invalid examType" };
  }
  const mod = typeof r["module"] === "string" ? (r["module"] as string).trim() : "";
  if (mod.length < 2 || mod.length > 80) {
    return { ok: false, error: "invalid module" };
  }
  let topic: string | undefined;
  if (r["topic"] !== undefined && r["topic"] !== null) {
    if (typeof r["topic"] !== "string") return { ok: false, error: "invalid topic" };
    const t = (r["topic"] as string).trim();
    if (t.length > 200) return { ok: false, error: "invalid topic" };
    if (t) topic = t;
  }
  let confidence = 3;
  if (r["confidence"] !== undefined && r["confidence"] !== null) {
    const c = Number(r["confidence"]);
    if (!Number.isFinite(c)) return { ok: false, error: "invalid confidence" };
    confidence = Math.min(5, Math.max(1, Math.round(c)));
  }
  return {
    ok: true,
    value: { examType: examType as QuizExamType, module: mod, confidence, ...(topic ? { topic } : {}) },
  };
}
