import { describe, expect, it, vi } from "vitest";
import {
  MAX_SUBJECT_CHARS,
  MAX_TOPIC_CHARS,
  validateMiniTestInput,
  validateMiniTestQuestions,
} from "./mini-test-validate";
import { classifyContextLoad, CONTEXT_UNAVAILABLE_TEXT } from "./shared";

function question(over: Record<string, unknown> = {}) {
  return {
    prompt: "Which rule applies?",
    options: ["A", "B", "C", "D"],
    correctIndex: 1,
    explanation: "Because of the rule.",
    ...over,
  };
}

describe("classifyContextLoad", () => {
  it("treats a plan read error as unavailable", () => {
    const r = classifyContextLoad({ planError: "boom" });
    expect(r).toEqual({ ok: false, text: CONTEXT_UNAVAILABLE_TEXT });
  });
  it("treats a profile read error as unavailable", () => {
    expect(classifyContextLoad({ profileError: "boom" }).ok).toBe(false);
  });
  it("passes when both reads succeeded (including a genuine no-plan row)", () => {
    expect(classifyContextLoad({}).ok).toBe(true);
  });
});

describe("provider is not reached on a context read error", () => {
  async function toolLike(
    load: () => Promise<{ planError?: string; profileError?: string }>,
    provider: () => Promise<string>,
  ) {
    const outcome = classifyContextLoad(await load());
    if (!outcome.ok) return outcome.text;
    return provider();
  }

  it("skips the gateway on plan or profile error", async () => {
    const provider = vi.fn(async () => "answer");
    expect(await toolLike(async () => ({ planError: "db down" }), provider)).toBe(
      CONTEXT_UNAVAILABLE_TEXT,
    );
    expect(await toolLike(async () => ({ profileError: "db down" }), provider)).toBe(
      CONTEXT_UNAVAILABLE_TEXT,
    );
    expect(provider).not.toHaveBeenCalled();
  });

  it("calls the gateway when context loaded cleanly", async () => {
    const provider = vi.fn(async () => "answer");
    expect(await toolLike(async () => ({}), provider)).toBe("answer");
    expect(provider).toHaveBeenCalledTimes(1);
  });
});

describe("validateMiniTestInput", () => {
  it("defaults questionCount to 5", () => {
    const r = validateMiniTestInput({});
    expect(r.ok && r.value.questionCount).toBe(5);
  });
  it("rejects oversized subject and topic", () => {
    expect(validateMiniTestInput({ subject: "x".repeat(MAX_SUBJECT_CHARS + 1) }).ok).toBe(false);
    expect(validateMiniTestInput({ topic: "x".repeat(MAX_TOPIC_CHARS + 1) }).ok).toBe(false);
  });
  it("rejects blank and out-of-range values", () => {
    expect(validateMiniTestInput({ subject: "   " }).ok).toBe(false);
    expect(validateMiniTestInput({ questionCount: 99 }).ok).toBe(false);
    expect(validateMiniTestInput({ questionCount: 4.5 }).ok).toBe(false);
  });
  it("trims accepted values", () => {
    const r = validateMiniTestInput({ subject: " Contract law ", topic: " Offer ", questionCount: 3 });
    expect(r.ok && r.value).toEqual({ subject: "Contract law", topic: "Offer", questionCount: 3 });
  });
});

describe("validateMiniTestQuestions", () => {
  it("accepts exactly the requested count of well-formed questions", () => {
    const r = validateMiniTestQuestions([question(), question(), question()], 3);
    expect(r.ok).toBe(true);
  });
  it("rejects a wrong count", () => {
    expect(validateMiniTestQuestions([question()], 3).ok).toBe(false);
  });
  it("rejects non-arrays and non-objects", () => {
    expect(validateMiniTestQuestions(null, 1).ok).toBe(false);
    expect(validateMiniTestQuestions(["nope"], 1).ok).toBe(false);
  });
  it("rejects wrong option counts and empty options", () => {
    expect(validateMiniTestQuestions([question({ options: ["A", "B", "C"] })], 1).ok).toBe(false);
    expect(validateMiniTestQuestions([question({ options: ["A", "B", "C", "  "] })], 1).ok).toBe(false);
  });
  it("rejects bad correctIndex values", () => {
    for (const bad of [-1, 4, 1.5, "1", null]) {
      expect(validateMiniTestQuestions([question({ correctIndex: bad })], 1).ok).toBe(false);
    }
  });
  it("rejects empty or oversized prompt/explanation", () => {
    expect(validateMiniTestQuestions([question({ prompt: "" })], 1).ok).toBe(false);
    expect(validateMiniTestQuestions([question({ explanation: "x".repeat(5000) })], 1).ok).toBe(false);
    expect(validateMiniTestQuestions([question({ prompt: "x".repeat(5000) })], 1).ok).toBe(false);
  });
});
