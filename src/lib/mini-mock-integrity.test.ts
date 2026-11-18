import { describe, expect, it } from "vitest";
import { getSection, MINI_SECTIONS, type Pathway } from "./full-mock-blueprints";
import { generateQuestionsForSection, miniPoolSize, sessionTopics } from "./full-mock-questions";

const mcqMinis = (["SQE", "UBE"] as Pathway[]).flatMap((p) =>
  MINI_SECTIONS[p].filter((s) => s.kind === "mcq").map((s) => [p, s] as const),
);

describe("new mini mocks", () => {
  it("are versioned so pre-v2 attempts keep their original questions", () => {
    for (const [, s] of mcqMinis) expect(s.id.endsWith("-mini-v2")).toBe(true);
    expect(getSection("SQE", "flk1-mini")?.questions).toBe(10);
    expect(getSection("UBE", "mbe-mini")?.questions).toBe(10);
  });

  it.each(mcqMinis)("%s %s has 10 distinct in-scope stems", (p, s) => {
    expect(miniPoolSize(p, s)).toBeGreaterThanOrEqual(10);
    const qs = generateQuestionsForSection(p, s, "attempt-a").mcq!;
    expect(qs).toHaveLength(10);
    expect(new Set(qs.map((q) => q.stem)).size).toBe(10);
    expect(new Set(qs.map((q) => q.id)).size).toBe(10);
    const allowed = sessionTopics(s.id);
    if (allowed) for (const q of qs) expect(allowed).toContain(q.topic);
    for (const q of qs) expect(q.options).toHaveLength(s.optionsCount);
  });

  it.each(mcqMinis)("%s %s is stable for the same attempt and remaps keys", (p, s) => {
    const a = generateQuestionsForSection(p, s, "attempt-a").mcq!;
    expect(generateQuestionsForSection(p, s, "attempt-a").mcq).toEqual(a);
    // Same item in another attempt: same correct option text, wherever it lands.
    const b = generateQuestionsForSection(p, s, "attempt-b").mcq!;
    for (const q of b) {
      const twin = a.find((x) => x.id === q.id);
      if (twin) expect(q.options[q.correctIndex]).toBe(twin.options[twin.correctIndex]);
    }
  });

  it.each(mcqMinis)("%s %s varies selection or order between attempts", (p, s) => {
    const sig = (seed: string) => generateQuestionsForSection(p, s, seed).mcq!.map((q) => `${q.id}:${q.correctIndex}`).join("|");
    const sigs = new Set(["s1", "s2", "s3", "s4"].map(sig));
    expect(sigs.size).toBeGreaterThan(1);
  });

  it("MCQ minis are timed at 1.8 min per question; MEE 30 min, MPT 90 min", () => {
    for (const [, s] of mcqMinis) expect(s.durationSeconds).toBe(s.questions * 108);
    expect(MINI_SECTIONS.UBE.find((s) => s.kind === "essay")!.durationSeconds).toBe(30 * 60);
    expect(MINI_SECTIONS.UBE.find((s) => s.kind === "mpt")!.durationSeconds).toBe(90 * 60);
  });

  it("Mini MEE and MPT draw one task, stable per attempt", () => {
    const mee = MINI_SECTIONS.UBE.find((s) => s.kind === "essay")!;
    const mpt = MINI_SECTIONS.UBE.find((s) => s.kind === "mpt")!;
    expect(generateQuestionsForSection("UBE", mee, "x").essay).toHaveLength(1);
    expect(generateQuestionsForSection("UBE", mee, "x")).toEqual(generateQuestionsForSection("UBE", mee, "x"));
    expect(generateQuestionsForSection("UBE", mpt, "x").mpt).toHaveLength(1);
  });
});
