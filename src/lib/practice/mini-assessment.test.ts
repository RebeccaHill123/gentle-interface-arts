import { describe, expect, it } from "vitest";
import {
  buildMiniAssessment,
  parseMiniAssessmentProgress,
  scoreMiniAssessment,
  MINI_ASSESSMENT_SIZE,
} from "./mini-assessment";

const q = (n: number) => ({
  prompt: `Question ${n}?`,
  options: [`a${n}`, `b${n}`, `c${n}`, `d${n}`],
  correctIndex: n % 4,
  explanation: `Because ${n}.`,
});

describe("buildMiniAssessment", () => {
  it("trims a 19-question response to exactly 10", () => {
    const r = buildMiniAssessment(Array.from({ length: 19 }, (_, i) => q(i)));
    expect(r.ok && r.questions.length).toBe(MINI_ASSESSMENT_SIZE);
  });
  it("drops duplicates before counting", () => {
    const raw = [...Array.from({ length: 10 }, (_, i) => q(i)), q(0), q(1), q(10)];
    const r = buildMiniAssessment([q(0), ...raw]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(new Set(r.questions.map((x) => x.prompt)).size).toBe(10);
  });
  it("rejects fewer than 10 valid questions explicitly", () => {
    const r = buildMiniAssessment([...Array.from({ length: 9 }, (_, i) => q(i)), { prompt: "bad" }]);
    expect(r.ok).toBe(false);
  });
});

describe("progress + scoring", () => {
  it("resumes at the first unanswered question, keeping answers", () => {
    const questions = Array.from({ length: 10 }, (_, i) => q(i));
    const p = parseMiniAssessmentProgress(JSON.stringify({ questions, answers: [0, 1, 2] }));
    expect(p?.current).toBe(3);
    expect(p?.answers.slice(0, 3)).toEqual([0, 1, 2]);
  });
  it("rejects stored sets that are not exactly 10", () => {
    const questions = Array.from({ length: 19 }, (_, i) => q(i));
    expect(parseMiniAssessmentProgress(JSON.stringify({ questions, answers: [] }))).toBeNull();
  });
  it("scores against the 10-question denominator", () => {
    const questions = Array.from({ length: 10 }, (_, i) => q(i));
    const s = scoreMiniAssessment(questions, questions.map((x) => x.correctIndex));
    expect(s).toEqual({ correct: 10, total: 10, accuracy: 1 });
  });
});
