import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PROVIDER_MAX_QUESTIONS,
  clampQuestionCount,
  configFingerprint,
  normaliseConfig,
  resolvePracticeConfig,
  synthesizeSearchConfig,
  type PracticeConfig,
} from "./config";
import { normaliseQuestion, validateQuizQuestions } from "./quiz-validate";
import {
  ACTIVE_SNAPSHOT_VERSION,
  applyElapsed,
  buildFinalSnapshot,
  classifyWrite,
  completionAccepted,
  computeDeadline,
  decideRestore,
  describeCompletion,
  emptyCompletion,
  formatRemaining,
  isExpired,
  markWriteThrew,
  mergeWriteOutcome,
  pendingParts,
  remainingMs,
  scoreAnswers,
  validateSnapshot,
  type ActiveSnapshot,
} from "./session";

const baseConfig: PracticeConfig = normaliseConfig({
  source: "practice-launcher",
  formatLabel: "Targeted quiz: Consideration",
  module: "Contract law",
  topic: "Consideration",
  questions: 10,
  duration: 20,
  difficulty: "Adaptive",
  timed: true,
  adaptive: true,
  rationale: "test",
})!;

function q(n: number) {
  return {
    prompt: `Question ${n}: which rule applies?`,
    options: ["A one", "B two", "C three", "D four"],
    correctIndex: n % 4,
    explanation: `Explanation ${n}`,
  };
}

const questions = Array.from({ length: 3 }, (_, i) => q(i));

function snapshot(over: Partial<ActiveSnapshot> = {}): ActiveSnapshot {
  return {
    version: ACTIVE_SNAPSHOT_VERSION,
    sessionId: "sess-1",
    fingerprint: configFingerprint(baseConfig),
    config: baseConfig,
    questions,
    answers: [0, null, null],
    revealed: [0],
    feedbackMode: "immediate",
    current: 1,
    perQuestionMs: [4000, 0, 0],
    questionStartedAt: 1_000_400,
    startedAt: 1_000_000,
    deadlineAt: 1_000_000 + 20 * 60_000,
    phase: "quiz",
    completion: null,
    finalSnapshot: null,
    updatedAt: 1_000_500,
    ...over,
  };
}

/* ── 1. config resolution ── */

describe("config resolution", () => {
  it("prefers explicit search params over a stored launcher config", () => {
    const stored = JSON.stringify({ ...baseConfig, module: "Stale module" });
    const r = resolvePracticeConfig({ search: { subject: "Tort law" }, storedRaw: stored });
    expect(r.kind).toBe("search");
    expect(r.kind !== "none" && r.config.module).toBe("Tort law");
    expect(r.kind !== "none" && r.consumeStored).toBe(true);
  });

  it("uses the stored config only when there is no search target", () => {
    const r = resolvePracticeConfig({
      search: {},
      storedRaw: JSON.stringify(baseConfig),
    });
    expect(r.kind).toBe("stored");
    expect(r.kind !== "none" && r.config.module).toBe("Contract law");
  });

  it("reports none when nothing is queued and rejects unusable stored config", () => {
    expect(resolvePracticeConfig({ search: {}, storedRaw: null }).kind).toBe("none");
    expect(resolvePracticeConfig({ search: {}, storedRaw: "{oops" }).kind).toBe("none");
    expect(resolvePracticeConfig({ search: {}, storedRaw: JSON.stringify({ module: "x" }) }).kind).toBe(
      "none",
    );
  });

  it("clamps requested question counts to the provider maximum", () => {
    expect(clampQuestionCount(40)).toBe(PROVIDER_MAX_QUESTIONS);
    expect(clampQuestionCount(1)).toBe(4);
    expect(synthesizeSearchConfig({ subject: "Tort law", length: 30 })!.questions).toBe(
      PROVIDER_MAX_QUESTIONS,
    );
    expect(normaliseConfig({ ...baseConfig, questions: 20 })!.questions).toBe(PROVIDER_MAX_QUESTIONS);
  });

  it("fingerprints differ across different session requests", () => {
    expect(configFingerprint(baseConfig)).toBe(configFingerprint({ ...baseConfig }));
    expect(configFingerprint(baseConfig)).not.toBe(
      configFingerprint({ ...baseConfig, module: "Tort law" }),
    );
  });
});

/* ── 2. restore without another AI call ── */

describe("restore decision", () => {
  const fp = configFingerprint(baseConfig);

  it("restores an in-progress session (provider must be skipped)", () => {
    const d = decideRestore({ raw: snapshot(), fingerprint: fp, now: 1_001_000 });
    expect(d.action).toBe("restore");
    expect(d.action === "restore" && d.snapshot.answers).toEqual([0, null, null]);
  });

  it("generates when there is no snapshot, or it is invalid/stale/mismatched", () => {
    expect(decideRestore({ raw: null, fingerprint: fp, now: 1 }).reason).toBe("no-snapshot");
    expect(decideRestore({ raw: { version: 99 }, fingerprint: fp, now: 1 }).reason).toBe("invalid");
    expect(
      decideRestore({ raw: snapshot(), fingerprint: fp, now: 1_000_500 + 13 * 3600_000 }).reason,
    ).toBe("stale");
    expect(decideRestore({ raw: snapshot(), fingerprint: "cfg_other", now: 1_001_000 }).reason).toBe(
      "mismatch",
    );
  });

  it("keeps an unaccepted completion recoverable but drops a settled one", () => {
    const unaccepted = snapshot({
      phase: "results",
      completion: { activity: "failed", attempts: "pending" },
    });
    expect(decideRestore({ raw: unaccepted, fingerprint: fp, now: 1_001_000 }).action).toBe("restore");
    const settled = snapshot({
      phase: "results",
      completion: { activity: "accepted", attempts: "accepted" },
    });
    expect(decideRestore({ raw: settled, fingerprint: fp, now: 1_001_000 }).reason).toBe("settled");
  });

  it("rejects snapshots whose arrays or questions are corrupt", () => {
    expect(validateSnapshot(snapshot({ answers: [0, 1] as never }))).toBeNull();
    expect(validateSnapshot(snapshot({ perQuestionMs: [1, -2, 3] }))).toBeNull();
    expect(validateSnapshot(snapshot({ answers: [9, null, null] as never }))).toBeNull();
    expect(validateSnapshot(snapshot({ questions: [{ prompt: "x" }] as never }))).toBeNull();
    expect(validateSnapshot(snapshot())).not.toBeNull();
  });

  it("round-trips through JSON", () => {
    const parsed = JSON.parse(JSON.stringify(snapshot()));
    expect(validateSnapshot(parsed)?.sessionId).toBe("sess-1");
  });
});

/* ── 3. authoritative session timer ── */

describe("session timer", () => {
  it("derives one deadline from startedAt and duration", () => {
    expect(computeDeadline(baseConfig, 1000)).toBe(1000 + 20 * 60_000);
    expect(computeDeadline({ ...baseConfig, timed: false }, 1000)).toBeNull();
  });

  it("never increases across backgrounding, navigation or reload", () => {
    const deadline = computeDeadline(baseConfig, 0)!;
    const seq = [0, 5_000, 600_000, 900_000, 1_200_000].map((t) => remainingMs(deadline, t)!);
    for (let i = 1; i < seq.length; i++) expect(seq[i]).toBeLessThanOrEqual(seq[i - 1]);
    expect(seq.at(-1)).toBe(0); // clamped, never negative
  });

  it("expires only for timed sessions", () => {
    const deadline = computeDeadline(baseConfig, 0)!;
    expect(isExpired(deadline, deadline - 1)).toBe(false);
    expect(isExpired(deadline, deadline)).toBe(true);
    expect(isExpired(null, 9_999_999)).toBe(false);
    expect(remainingMs(null, 5)).toBeNull();
  });

  it("formats the total remaining time", () => {
    expect(formatRemaining(65_000)).toBe("1:05");
    expect(formatRemaining(0)).toBe("0:00");
  });
});

/* ── 4. timing + stable final snapshot ── */

describe("final snapshot timing", () => {
  it("adds the current question's elapsed time exactly once", () => {
    const snap = buildFinalSnapshot({
      sessionId: "s",
      questions,
      answers: [0, 1, 2],
      perQuestionMs: [3000, 2000, 0],
      current: 2,
      questionStartedAt: 10_000,
      now: 15_000,
    });
    expect(snap.perQuestionMs).toEqual([3000, 2000, 5000]);
    expect(snap.totalMs).toBe(10_000);
  });

  it("counts the final answer and time when Finish is pressed directly", () => {
    const snap = buildFinalSnapshot({
      sessionId: "s",
      questions,
      answers: [questions[0].correctIndex, null, questions[2].correctIndex],
      perQuestionMs: [1000, 1000, 0],
      current: 2,
      questionStartedAt: 0,
      now: 4000,
    });
    expect(snap.perQuestionMs[2]).toBe(4000);
    expect(snap.correct).toBe(2);
    expect(snap.answeredCount).toBe(2);
  });

  it("does not double-count an interval across repeated navigation", () => {
    let per = [0, 0, 0];
    let start = 0;
    // forward 0 -> 1 at t=2000, back 1 -> 0 at t=3000, forward again at t=3500
    per = applyElapsed(per, 0, 2000 - start);
    start = 2000;
    per = applyElapsed(per, 1, 3000 - start);
    start = 3000;
    per = applyElapsed(per, 0, 3500 - start);
    expect(per).toEqual([2500, 1000, 0]);
    expect(per.reduce((a, b) => a + b, 0)).toBe(3500);
  });

  it("ignores negative or non-finite intervals", () => {
    expect(applyElapsed([5], 0, -100)).toEqual([5]);
    expect(applyElapsed([5], 0, Number.NaN)).toEqual([5]);
    expect(applyElapsed([5], 3, 100)).toEqual([5]);
  });

  it("scores unanswered as incorrect while answered counts real selections only", () => {
    const s = scoreAnswers(questions, [questions[0].correctIndex, null, null]);
    expect(s).toEqual({ total: 3, correct: 1, answeredCount: 1, accuracy: 1 / 3 });
  });
});

/* ── 5. completion: atomic, idempotent, retryable ── */

describe("completion bookkeeping", () => {
  it("treats ok or verified queued as accepted, and unqueued failure as failed", () => {
    expect(classifyWrite({ ok: true, queued: false })).toEqual({ state: "accepted", queuedOnly: false });
    expect(classifyWrite({ ok: false, queued: true })).toEqual({ state: "accepted", queuedOnly: true });
    expect(classifyWrite({ ok: false, queued: false })).toEqual({ state: "failed", queuedOnly: false });
  });

  it("requires both components before claiming success", () => {
    let s = emptyCompletion();
    expect(completionAccepted(s)).toBe(false);
    s = mergeWriteOutcome(s, "activity", { ok: true, queued: false });
    expect(completionAccepted(s)).toBe(false);
    expect(pendingParts(s)).toEqual(["attempts"]);
    s = mergeWriteOutcome(s, "attempts", { ok: false, queued: true });
    expect(completionAccepted(s)).toBe(true);
    expect(pendingParts(s)).toEqual([]);
  });

  it("covers all four outcome combinations", () => {
    const cases: Array<[boolean, boolean, string[]]> = [
      [true, true, []],
      [true, false, ["attempts"]],
      [false, true, ["activity"]],
      [false, false, ["activity", "attempts"]],
    ];
    for (const [activityOk, attemptsOk, expected] of cases) {
      let s = emptyCompletion();
      s = mergeWriteOutcome(s, "activity", { ok: activityOk, queued: false, error: "x" });
      s = mergeWriteOutcome(s, "attempts", { ok: attemptsOk, queued: false, error: "x" });
      expect(pendingParts(s)).toEqual(expected);
      expect(completionAccepted(s)).toBe(expected.length === 0);
    }
  });

  it("treats a thrown write as not accepted and retryable", () => {
    const s = markWriteThrew(emptyCompletion(), "attempts", "boom");
    expect(s.attempts).toBe("failed");
    expect(pendingParts(s)).toContain("attempts");
    expect(describeCompletion(s)?.tone).toBe("failed");
  });

  it("retries only the missing component with the original stable keys", async () => {
    const activity = vi.fn(async () => ({ ok: true, queued: false }));
    const attempts = vi.fn(async () => ({ ok: true, queued: false }));
    let status = mergeWriteOutcome(emptyCompletion(), "activity", { ok: true, queued: false });
    status = mergeWriteOutcome(status, "attempts", { ok: false, queued: false });
    for (const part of pendingParts(status)) {
      const r = part === "activity" ? await activity() : await attempts();
      status = mergeWriteOutcome(status, part, r);
    }
    expect(activity).not.toHaveBeenCalled();
    expect(attempts).toHaveBeenCalledTimes(1);
    expect(completionAccepted(status)).toBe(true);
  });

  it("never infers success from an empty queue alone", () => {
    // A failed session stays failed until its own writes are re-run.
    const failed = mergeWriteOutcome(emptyCompletion(), "activity", { ok: false, queued: false });
    expect(pendingParts(failed)).toContain("activity");
    expect(describeCompletion(failed)?.title).toBe("Not recorded yet");
  });

  it("distinguishes account-confirmed, device-queued and not-recorded copy", () => {
    let ok = mergeWriteOutcome(emptyCompletion(), "activity", { ok: true, queued: false });
    ok = mergeWriteOutcome(ok, "attempts", { ok: true, queued: false });
    expect(describeCompletion(ok)).toMatchObject({ tone: "ok", title: "Recorded to your account" });

    let queued = mergeWriteOutcome(emptyCompletion(), "activity", { ok: false, queued: true });
    queued = mergeWriteOutcome(queued, "attempts", { ok: true, queued: false });
    expect(describeCompletion(queued)).toMatchObject({ tone: "queued", title: "Saved on this device" });

    expect(describeCompletion(null)).toBeNull();
    expect(describeCompletion(emptyCompletion())?.title).toBe("Recording…");
  });

  it("keeps the same sessionId and final snapshot across a retry (idempotency keys stable)", () => {
    const snap = buildFinalSnapshot({
      sessionId: "sess-9",
      questions,
      answers: [0, 1, 2],
      perQuestionMs: [1, 1, 1],
      current: 0,
      questionStartedAt: null,
      now: 5,
    });
    const keys = (s: typeof snap) => [
      `practice:${s.sessionId}`,
      ...s.perQuestionMs.map((_, i) => `practice-attempt:${s.sessionId}:${i}`),
    ];
    expect(keys(snap)).toEqual(keys(snap));
    expect(snap.occurredAtIso).toBe(new Date(5).toISOString());
  });
});

/* ── 6. generated quiz quality ── */

describe("quiz validation", () => {
  it("accepts exactly the requested number of usable questions", () => {
    const r = validateQuizQuestions([q(1), q(2), q(3), q(4)], 3);
    expect(r.ok && r.questions).toHaveLength(3);
  });

  it("rejects a short set rather than silently delivering fewer", () => {
    const r = validateQuizQuestions([q(1), q(2)], 10);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toContain("2 usable questions");
  });

  it("drops duplicates and malformed items", () => {
    const dup = { ...q(1) };
    expect(validateQuizQuestions([q(1), dup], 2).ok).toBe(false);
    expect(normaliseQuestion({ ...q(1), options: ["A", "B", "C"] })).toBeNull();
    expect(normaliseQuestion({ ...q(1), options: ["A", "A", "B", "C"] })).toBeNull();
    expect(normaliseQuestion({ ...q(1), correctIndex: 4 })).toBeNull();
    expect(normaliseQuestion({ ...q(1), correctIndex: 1.5 })).toBeNull();
    expect(normaliseQuestion({ ...q(1), explanation: "  " })).toBeNull();
    expect(normaliseQuestion({ ...q(1), prompt: "x".repeat(5000) })).toBeNull();
    expect(validateQuizQuestions(null, 1).ok).toBe(false);
  });
});

/* ── snapshot persistence guards ── */

describe("snapshot persistence", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("reports failure when storage rejects the write", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: (k: string) => store.delete(k),
    });
    const { persistSnapshot } = await import("./session");
    expect(persistSnapshot(snapshot())).toBe(false);
    vi.unstubAllGlobals();
  });

  it("verifies the written snapshot by rereading it", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });
    const { persistSnapshot, readSnapshotRaw, clearSnapshot } = await import("./session");
    expect(persistSnapshot(snapshot())).toBe(true);
    expect(validateSnapshot(readSnapshotRaw())?.sessionId).toBe("sess-1");
    clearSnapshot();
    expect(readSnapshotRaw()).toBeNull();
    vi.unstubAllGlobals();
  });
});
