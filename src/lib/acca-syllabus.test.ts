import { describe, expect, it } from "vitest";
import {
  ACCA_PAPERS,
  accaPaperLabel,
  accaSubjectName,
  accaSyllabusForPrompt,
  getAccaAreaByName,
  getAccaPaper,
  getAccaSubjectsForPapers,
  MAX_ACCA_PAPERS,
  normaliseAccaPapers,
} from "@/lib/acca-syllabus";

describe("ACCA syllabus", () => {
  it("has every paper weighted to roughly 100% of its marks", () => {
    for (const paper of ACCA_PAPERS) {
      const total = paper.areas.reduce((sum, a) => sum + a.weight, 0);
      expect(Math.abs(total - 1)).toBeLessThan(0.02);
    }
  });

  it("covers all 15 paper codes with plannable topic depth", () => {
    expect(ACCA_PAPERS).toHaveLength(15);
    for (const paper of ACCA_PAPERS) {
      expect(paper.areas.length).toBeGreaterThanOrEqual(4);
      const subtopics = paper.areas.flatMap((a) => a.subtopics);
      expect(subtopics.length).toBeGreaterThanOrEqual(24);
      // ids unique so scheduled tasks never collide
      expect(new Set(subtopics.map((s) => s.id)).size).toBe(subtopics.length);
      for (const a of paper.areas) {
        expect(a.subtopics.length).toBeGreaterThanOrEqual(4);
        for (const s of a.subtopics) expect(s.name.trim().length).toBeGreaterThan(3);
      }
    }
  });

  it("resolves papers case-insensitively", () => {
    expect(getAccaPaper("fr")?.name).toBe("Financial Reporting");
    expect(getAccaPaper("nope")).toBeUndefined();
  });

  it("drops unknown papers rather than substituting one", () => {
    expect(normaliseAccaPapers(["FR", "XX"])).toEqual(["FR"]);
    expect(normaliseAccaPapers("FR")).toEqual([]);
  });

  it("keeps at most the supported number of papers, de-duplicated", () => {
    expect(normaliseAccaPapers(["FR", "FR", "AA", "FM"])).toEqual(["FR", "AA"]);
    expect(normaliseAccaPapers(["FR", "AA"]).length).toBe(MAX_ACCA_PAPERS);
  });

  it("tags subjects with their paper so two papers never collide", () => {
    const subjects = getAccaSubjectsForPapers(["FR", "AA"]);
    expect(subjects.length).toBe(
      getAccaPaper("FR")!.areas.length + getAccaPaper("AA")!.areas.length,
    );
    expect(new Set(subjects.map((s) => s.name)).size).toBe(subjects.length);
    expect(subjects.some((s) => s.component === "AA")).toBe(true);
  });

  it("resolves a tagged subject name back to its syllabus area", () => {
    const name = accaSubjectName("FR", "Interpretation of financial statements");
    expect(getAccaAreaByName(name)?.subtopics.length).toBeGreaterThan(0);
    expect(getAccaAreaByName("Interpretation of financial statements")).toBeDefined();
    expect(getAccaAreaByName("Not a real area")).toBeUndefined();
  });

  it("labels the chosen papers for display", () => {
    expect(accaPaperLabel(["FR", "AA"])).toBe(
      "FR Financial Reporting + AA Audit & Assurance",
    );
    expect(accaPaperLabel([])).toBe("ACCA");
  });

  it("builds prompt text only for the chosen papers", () => {
    const text = accaSyllabusForPrompt(["TX"]);
    expect(text).toContain("TX Taxation (UK)");
    expect(text).not.toContain("Audit & Assurance");
    expect(accaSyllabusForPrompt([])).toBe("");
  });
});
