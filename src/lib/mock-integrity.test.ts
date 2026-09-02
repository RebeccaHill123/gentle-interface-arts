import { describe, expect, it } from "vitest";
import {
  elapsedSecondsFrom,
  finalAnswerSnapshot,
  isSimulationFullyComplete,
  makeTimerState,
  mcqSectionScore,
  mergeAnswerState,
  mockActivityKeyParts,
  objectiveScore,
  pauseTimer,
  remainingSecondsFrom,
  resolveSectionStartedAt,
  resolveTimerState,
  resumeTimer,
  sectionScoreLabel,
  totalElapsedSeconds,
} from "./mock-integrity";

const T0 = 1_700_000_000_000;
const DURATION = 600; // 10 minutes

describe("exam timer: background + reload", () => {
  it("does not stretch when the tab is backgrounded (no ticks fired)", () => {
    const timer = makeTimerState(T0);
    // 4 minutes of wall clock passed with zero interval ticks.
    expect(remainingSecondsFrom(timer, DURATION, T0 + 240_000)).toBe(360);
  });

  it("does not hand back time on reload — stored start wins", () => {
    const stored = makeTimerState(T0);
    const resolved = resolveTimerState({
      mode: "exam",
      stored,
      cached: makeTimerState(T0 + 300_000), // a later, bogus local start
      nowMs: T0 + 300_000,
    });
    expect(resolved.startedAtMs).toBe(T0);
    expect(remainingSecondsFrom(resolved, DURATION, T0 + 300_000)).toBe(300);
  });

  it("ignores pause state in exam mode", () => {
    const resolved = resolveTimerState({
      mode: "exam",
      stored: { startedAtMs: T0, pausedAccumulatedMs: 120_000, pausedAtMs: T0 + 60_000 },
      nowMs: T0 + 300_000,
    });
    expect(resolved.pausedAccumulatedMs).toBe(0);
    expect(resolved.pausedAtMs).toBeNull();
    expect(elapsedSecondsFrom(resolved, T0 + 300_000)).toBe(300);
  });

  it("falls back to started_at, and expires at zero", () => {
    const resolved = resolveTimerState({
      mode: "exam",
      startedAtIso: new Date(T0).toISOString(),
      nowMs: T0 + 10_000,
    });
    expect(resolved.startedAtMs).toBe(T0);
    expect(remainingSecondsFrom(resolved, DURATION, T0 + 999_000)).toBe(0);
  });

  it("never overwrites the original started_at on resume", () => {
    const original = new Date(T0).toISOString();
    expect(resolveSectionStartedAt(original, new Date(T0 + 500_000).toISOString())).toBe(original);
    const nowIso = new Date(T0).toISOString();
    expect(resolveSectionStartedAt(null, nowIso)).toBe(nowIso);
    expect(resolveSectionStartedAt("not-a-date", nowIso)).toBe(nowIso);
  });
});

describe("practice pause/resume persistence", () => {
  it("excludes paused time from elapsed and survives resolve", () => {
    let timer = makeTimerState(T0);
    timer = pauseTimer(timer, T0 + 60_000); // 1 min worked
    timer = resumeTimer(timer, T0 + 180_000); // 2 min paused
    expect(timer.pausedAccumulatedMs).toBe(120_000);
    expect(elapsedSecondsFrom(timer, T0 + 240_000)).toBe(120);

    const restored = resolveTimerState({
      mode: "practice",
      stored: timer,
      cached: null,
      nowMs: T0 + 240_000,
    });
    expect(elapsedSecondsFrom(restored, T0 + 240_000)).toBe(120);
  });

  it("keeps an open pause across refresh so the clock does not resume itself", () => {
    const paused = pauseTimer(makeTimerState(T0), T0 + 60_000);
    const restored = resolveTimerState({
      mode: "practice",
      stored: paused,
      cached: null,
      nowMs: T0 + 600_000,
    });
    expect(restored.pausedAtMs).toBe(T0 + 60_000);
    expect(elapsedSecondsFrom(restored, T0 + 600_000)).toBe(60);
  });

  it("pause and resume are idempotent", () => {
    const t = pauseTimer(makeTimerState(T0), T0 + 1000);
    expect(pauseTimer(t, T0 + 5000)).toBe(t);
    const r = resumeTimer(t, T0 + 5000);
    expect(resumeTimer(r, T0 + 9000)).toBe(r);
  });

  it("prefers the larger accumulated pause across stores", () => {
    const resolved = resolveTimerState({
      mode: "practice",
      stored: { startedAtMs: T0, pausedAccumulatedMs: 30_000, pausedAtMs: null },
      cached: { startedAtMs: T0, pausedAccumulatedMs: 90_000, pausedAtMs: null },
      nowMs: T0 + 300_000,
    });
    expect(resolved.pausedAccumulatedMs).toBe(90_000);
  });
});

describe("DB/local answer merge", () => {
  const db = [
    {
      question_id: "q1",
      answer_value: "2",
      essay_text: null,
      is_flagged: false,
      time_spent_seconds: 40,
    },
    {
      question_id: "q2",
      answer_value: null,
      essay_text: "remote essay",
      is_flagged: true,
      time_spent_seconds: 90,
    },
  ];

  it("recovers DB answers when local storage is empty (new device)", () => {
    const merged = mergeAnswerState({ db, local: {} });
    expect(merged['q1']?.answerIndex).toBe(2);
    expect(merged['q2']?.essayText).toBe("remote essay");
    expect(merged['q2']?.isFlagged).toBe(true);
  });

  it("prefers a nonempty local draft over the remote value", () => {
    const merged = mergeAnswerState({
      db,
      local: { q1: { answerIndex: 3 }, q2: { essayText: "local draft" } },
    });
    expect(merged['q1']?.answerIndex).toBe(3);
    expect(merged['q2']?.essayText).toBe("local draft");
  });

  it("does not let an empty local entry erase a remote answer", () => {
    const merged = mergeAnswerState({ db, local: { q1: {}, q2: { essayText: "   " } } });
    expect(merged['q1']?.answerIndex).toBe(2);
    expect(merged['q2']?.essayText).toBe("remote essay");
  });

  it("keeps local-only questions and takes max time spent", () => {
    const merged = mergeAnswerState({
      db,
      local: { q1: { timeSpentSeconds: 10 }, q9: { answerIndex: 1 } },
    });
    expect(merged['q1']?.timeSpentSeconds).toBe(40);
    expect(merged['q9']?.answerIndex).toBe(1);
  });
});

describe("final current-answer snapshot", () => {
  it("includes the live current answer even when state has not flushed", () => {
    const snap = finalAnswerSnapshot({
      local: { q1: { answerIndex: 0, timeSpentSeconds: 20 } },
      currentQuestionId: "q1",
      currentAnswer: { answerIndex: 3, timeSpentSeconds: 20 },
      extraSecondsOnCurrent: 7,
    });
    expect(snap['q1']?.answerIndex).toBe(3);
    expect(snap['q1']?.timeSpentSeconds).toBe(27);
  });

  it("adds an unseen current question to the snapshot", () => {
    const snap = finalAnswerSnapshot({
      local: {},
      currentQuestionId: "q5",
      currentAnswer: { essayText: "typed but unsaved" },
      extraSecondsOnCurrent: 3,
    });
    expect(snap['q5']?.essayText).toBe("typed but unsaved");
    expect(snap['q5']?.timeSpentSeconds).toBe(3);
  });
});

describe("honest scoring", () => {
  it("excludes ungraded written sections from the objective percentage", () => {
    const r = objectiveScore([
      { kind: "mcq", graded: 10, correct: 5 },
      { kind: "essay", graded: 0, correct: 0 },
      { kind: "mpt", graded: 0, correct: 0 },
    ]);
    expect(r.percent).toBe(50);
    expect(r.excludedWrittenSections).toBe(2);
  });

  it("weights MCQ sections by question count, not equally", () => {
    // Simple averaging would give 60%; weighted gives 25/100 = 25%.
    const r = objectiveScore([
      { kind: "mcq", graded: 90, correct: 18 },
      { kind: "mcq", graded: 10, correct: 7 },
    ]);
    expect(r.graded).toBe(100);
    expect(r.percent).toBe(25);
  });

  it("returns null rather than 0 when nothing is auto-graded", () => {
    const r = objectiveScore([{ kind: "essay", graded: 0, correct: 0 }]);
    expect(r.percent).toBeNull();
  });

  it("counts unanswered MCQs as incorrect in the section score", () => {
    expect(mcqSectionScore({ totalQuestions: 10, correct: 5 })).toBe(50);
    expect(mcqSectionScore({ totalQuestions: 0, correct: 0 })).toBeNull();
  });

  it("labels written sections honestly", () => {
    expect(sectionScoreLabel("essay", null, "completed")).toBe("Awaiting self-review");
    expect(sectionScoreLabel("mpt", null, "in_progress")).toBe("Not auto-graded");
    expect(sectionScoreLabel("mcq", 62.4, "completed")).toBe("62%");
    expect(sectionScoreLabel("mcq", null, "completed")).toBe("—");
  });
});

describe("completion + activity semantics", () => {
  it("is only fully complete when every section is completed", () => {
    expect(isSimulationFullyComplete([])).toBe(false);
    expect(
      isSimulationFullyComplete([{ status: "completed" }, { status: "in_progress" }]),
    ).toBe(false);
    expect(
      isSimulationFullyComplete([{ status: "completed" }, { status: "completed" }]),
    ).toBe(true);
  });

  it("uses a stable per-simulation idempotency key", () => {
    expect(mockActivityKeyParts("sim-1")).toEqual(["mock", "sim-1", "complete"]);
    expect(mockActivityKeyParts("sim-1")).toEqual(mockActivityKeyParts("sim-1"));
    expect(mockActivityKeyParts("sim-2")).not.toEqual(mockActivityKeyParts("sim-1"));
  });

  it("totals actual elapsed seconds, never planned duration", () => {
    expect(
      totalElapsedSeconds([{ elapsedSeconds: 120 }, { elapsedSeconds: null }, {}]),
    ).toBe(120);
  });
});
