import { describe, expect, it } from "vitest";
import { SQE_SYLLABUS } from "@/lib/sqe-syllabus";
import { shuffleQuestionOptions, validateQuizQuestions } from "@/lib/practice/quiz-validate";
import { SQE_QUESTIONS, sqeQuestionsFor, sqeSubjectForModule } from "./index";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

describe("SQE1 authored bank", () => {
  it("holds 60 FLK1 and 60 FLK2 items", () => {
    expect(SQE_QUESTIONS.filter((q) => q.paper === "FLK1")).toHaveLength(60);
    expect(SQE_QUESTIONS.filter((q) => q.paper === "FLK2")).toHaveLength(60);
  });

  it("has unique ids and unique stems", () => {
    expect(new Set(SQE_QUESTIONS.map((q) => q.id)).size).toBe(120);
    expect(new Set(SQE_QUESTIONS.map((q) => norm(q.prompt))).size).toBe(120);
  });

  it("gives every item five distinct options, a valid key, five option reasons and an authority", () => {
    for (const q of SQE_QUESTIONS) {
      expect(new Set(q.options.map(norm)).size, q.id).toBe(5);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(5);
      expect(q.optionExplanations, q.id).toHaveLength(5);
      expect(q.authority.trim().length, q.id).toBeGreaterThan(4);
      expect(q.explanation.trim().length, q.id).toBeGreaterThan(40);
    }
  });

  it("uses only subject/subtopic ids from the syllabus, on the right paper", () => {
    for (const q of SQE_QUESTIONS) {
      const subject = SQE_SYLLABUS.find((s) => s.id === q.subject);
      expect(subject, q.id).toBeDefined();
      expect(subject!.subtopics.some((st) => st.id === q.subtopic), `${q.id} ${q.subtopic}`).toBe(true);
      if (q.subject !== "ethics") expect(subject!.paper, q.id).toBe(q.paper);
    }
  });

  it("covers every FLK1 and FLK2 subject including accounts and ethics in both papers", () => {
    const required = ["business-law", "dispute-resolution", "contract", "tort", "constitutional", "legal-system",
      "property-practice", "land-law", "wills-estates", "trusts", "criminal-law", "criminal-practice", "solicitors-accounts"];
    for (const id of required) expect(SQE_QUESTIONS.some((q) => q.subject === id), id).toBe(true);
    expect(SQE_QUESTIONS.some((q) => q.subject === "ethics" && q.paper === "FLK1")).toBe(true);
    expect(SQE_QUESTIONS.some((q) => q.subject === "ethics" && q.paper === "FLK2")).toBe(true);
  });

  it("spreads keys across all five positions", () => {
    for (let i = 0; i < 5; i++) {
      expect(SQE_QUESTIONS.filter((q) => q.correctIndex === i).length).toBeGreaterThanOrEqual(18);
    }
  });
});

describe("SQE1 practice selection", () => {
  it("maps planner module names to subjects", () => {
    expect(sqeSubjectForModule("Business Law & Practice")).toBe("business-law");
    expect(sqeSubjectForModule("Solicitors' Accounts")).toBe("solicitors-accounts");
    expect(sqeSubjectForModule("Ethics & Professional Conduct")).toBe("ethics");
    expect(sqeSubjectForModule("Criminal Practice")).toBe("criminal-practice");
    expect(sqeSubjectForModule("Criminal Law")).toBe("criminal-law");
    expect(sqeSubjectForModule("Something else")).toBeNull();
  });

  it("serves only the chosen subject for a subject session", () => {
    const qs = sqeQuestionsFor({ module: "Contract", count: 20, seed: "s1" });
    const contract = new Set(SQE_QUESTIONS.filter((q) => q.subject === "contract").map((q) => q.prompt));
    expect(qs.length).toBe(contract.size);
    for (const q of qs) expect(contract.has(q.prompt)).toBe(true);
  });

  it("serves 20 distinct FLK2 items for a paper mixed session across several subjects", () => {
    const qs = sqeQuestionsFor({ module: "FLK2 mixed paper (Property Practice, …)", count: 20, seed: "s2" });
    expect(qs).toHaveLength(20);
    expect(new Set(qs.map((q) => q.prompt)).size).toBe(20);
    const flk2 = SQE_QUESTIONS.filter((q) => q.paper === "FLK2");
    const subjects = new Set(qs.map((q) => flk2.find((b) => b.prompt === q.prompt)!.subject));
    expect(subjects.size).toBeGreaterThanOrEqual(6);
  });

  it("is stable for the same seed and passes the practice validator", () => {
    const a = sqeQuestionsFor({ module: "Mixed practice", count: 12, seed: "x" });
    const b = sqeQuestionsFor({ module: "Mixed practice", count: 12, seed: "x" });
    expect(a.map((q) => q.prompt)).toEqual(b.map((q) => q.prompt));
    const v = validateQuizQuestions(a, 12);
    expect(v.ok).toBe(true);
  });

  it("keeps the key and option reason attached after shuffling", () => {
    const [q] = sqeQuestionsFor({ module: "Solicitors Accounts", count: 1, seed: "z" });
    const correctText = q!.options[q!.correctIndex];
    const reason = q!.optionExplanations![q!.correctIndex];
    const s = shuffleQuestionOptions(q!, 99);
    expect(s.options[s.correctIndex]).toBe(correctText);
    expect(s.optionExplanations![s.correctIndex]).toBe(reason);
    expect(s.explanation).toContain("Authority:");
  });

  it("returns nothing for unknown modules so the generator path is unchanged", () => {
    expect(sqeQuestionsFor({ module: "General revision", count: 5 })).toEqual([]);
  });
});
