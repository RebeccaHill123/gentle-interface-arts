import { describe, expect, it } from "vitest";
import {
  ACCA_QUESTIONS,
  accaQuestionStyleForPrompt,
  accaQuestionsFor,
  accaQuestionsForArea,
  accaQuestionsForPaper,
} from "@/lib/acca-questions";
import { ACCA_PAPERS, accaSubjectName, getAccaPaper } from "@/lib/acca-syllabus";
import { normaliseQuestion } from "@/lib/practice/quiz-validate";

describe("ACCA question bank", () => {
  it("has a valid, well-shaped item for every question", () => {
    const ids = new Set<string>();
    for (const item of ACCA_QUESTIONS) {
      expect(ids.has(item.id)).toBe(false);
      ids.add(item.id);
      expect(getAccaPaper(item.paper)).toBeDefined();
      // the area id must exist on that paper
      const areas = getAccaPaper(item.paper)!.areas.map((a) => a.id);
      expect(areas).toContain(item.areaId);
      // and it must survive the same validation a generated question does
      expect(normaliseQuestion(item)).not.toBeNull();
      expect(item.explanation.length).toBeGreaterThan(80);
    }
  });

  it("covers every syllabus area of every paper", () => {
    for (const paper of ACCA_PAPERS) {
      for (const areaObject of paper.areas) {
        expect(accaQuestionsForArea(areaObject.id).length).toBeGreaterThanOrEqual(1);
      }
      expect(accaQuestionsForPaper(paper.code).length).toBeGreaterThanOrEqual(paper.areas.length);
    }
  });

  it("serves questions for a planner subject name, area first", () => {
    const module = accaSubjectName("FR", "Preparing consolidated financial statements");
    const qs = accaQuestionsFor({ module, topic: null, count: 3 });
    expect(qs.length).toBeGreaterThanOrEqual(1);
    const areaPrompts = accaQuestionsForArea("fr-group").map((i) => i.prompt);
    expect(areaPrompts).toContain(qs[0]!.prompt);
  });

  it("prefers a question matching the scheduled topic", () => {
    const module = accaSubjectName("TX", "Income tax & NIC");
    const qs = accaQuestionsFor({ module, topic: "benefits", count: 1 });
    expect(qs[0]!.prompt).toContain("company car");
  });

  it("is deterministic for the same module, topic and seed", () => {
    const module = accaSubjectName("AA", "Audit evidence");
    const a = accaQuestionsFor({ module, topic: null, count: 4, seed: "x" });
    const b = accaQuestionsFor({ module, topic: null, count: 4, seed: "x" });
    expect(a).toEqual(b);
  });

  it("returns nothing for a non-ACCA subject and never exceeds the count", () => {
    expect(accaQuestionsFor({ module: "Contract Law", topic: null, count: 5 })).toEqual([]);
    const module = accaSubjectName("FM", "Investment appraisal");
    expect(accaQuestionsFor({ module, topic: null, count: 2 }).length).toBeLessThanOrEqual(2);
  });

  it("builds prompt exemplars only for the entered papers", () => {
    const text = accaQuestionStyleForPrompt(["FR"], 1);
    expect(text).toContain("FR exemplar");
    expect(text).toContain("Explanation:");
    expect(accaQuestionStyleForPrompt([])).toBe("");
  });
});
