import { describe, expect, it } from "vitest";
import { SQE_FULL, SQE_FULL_LEGACY, getBlueprintForSections, getSection } from "./full-mock-blueprints";
import { generateQuestionsForSection, sessionTopics } from "./full-mock-questions";
import { getAccaPaper } from "./acca-syllabus";
import { isFutureExamAvailable } from "./acca-future-qualification";
import { resolveSqeSubtopicName } from "./sqe-syllabus";

describe("SQE1 January 2027 format", () => {
  it("has 85 questions per session and 170 per FLK", () => {
    for (const s of SQE_FULL.sections) expect(s.questions).toBe(85);
    const flk1 = SQE_FULL.sections.filter((s) => s.id.startsWith("flk1"));
    expect(flk1.reduce((n, s) => n + s.questions, 0)).toBe(170);
  });

  it("keeps each session at 153 minutes", () => {
    for (const s of SQE_FULL.sections) expect(s.durationSeconds).toBe(153 * 60);
  });

  it("FLK1 session 1 never contains Contract or Tort questions", () => {
    const qs = generateQuestionsForSection("SQE", getSection("SQE", "flk1-s1")!).mcq!;
    expect(qs).toHaveLength(85);
    expect(qs.some((q) => q.topic === "Contract" || q.topic === "Tort")).toBe(false);
  });

  it("FLK2 session 2 never contains Land Law or Trusts questions", () => {
    const qs = generateQuestionsForSection("SQE", getSection("SQE", "flk2-s2")!).mcq!;
    expect(qs.some((q) => q.topic === "Land Law" || q.topic === "Trusts")).toBe(false);
  });

  it("allows Ethics in every session", () => {
    for (const id of ["flk1-s1", "flk1-s2", "flk2-s1", "flk2-s2"]) {
      expect(sessionTopics(id)).toContain("Ethics");
    }
  });

  it("mixes subjects rather than grouping them", () => {
    const qs = generateQuestionsForSection("SQE", getSection("SQE", "flk1-s2")!).mcq!;
    const firstFive = new Set(qs.slice(0, 5).map((q) => q.topic));
    expect(firstFive.size).toBeGreaterThan(1);
  });

  it("old simulations keep their 90-question blocks", () => {
    expect(getSection("SQE", "flk1-b1")!.questions).toBe(90);
    expect(getBlueprintForSections("SQE", ["flk1-b1"])).toBe(SQE_FULL_LEGACY);
  });
});

describe("SQE topic renames", () => {
  it("maps a pre-September-2026 name to today's name", () => {
    expect(resolveSqeSubtopicName("Tracing & third-party liability")).toBe(
      "Tracing & liability of strangers (knowing receipt, dishonest assistance)",
    );
  });
});

describe("ACCA ATX-UK June 2026 to June 2027", () => {
  it("no longer lists domicile or the remittance basis", () => {
    const names = getAccaPaper("ATX")!.areas.flatMap((a) => a.subtopics.map((s) => s.name));
    expect(names.some((n) => /domicile|remittance/i.test(n))).toBe(false);
    expect(names.some((n) => n.includes("foreign income and gains"))).toBe(true);
  });
});

describe("ACCA 2027 qualification", () => {
  it("Knowledge exams start July 2027 and Expertise September 2027", () => {
    expect(isFutureExamAvailable("K1", "2027-06")).toBe(false);
    expect(isFutureExamAvailable("K1", "2027-07")).toBe(true);
    expect(isFutureExamAvailable("E1", "2027-07")).toBe(false);
    expect(isFutureExamAvailable("E1", "2027-09")).toBe(true);
  });
});
