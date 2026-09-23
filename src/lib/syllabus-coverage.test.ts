import { describe, expect, it } from "vitest";
import { computeCoverage } from "@/lib/syllabus-coverage";
import { getSubjectsForExamPath } from "@/lib/exam-paths";

describe("computeCoverage for ACCA", () => {
  it("uses the student's chosen papers as the denominator", () => {
    const subjects = getSubjectsForExamPath("ACCA_PAPERS", ["FR"]);
    expect(subjects.length).toBeGreaterThan(0);

    const coverage = computeCoverage(
      "ACCA_PAPERS",
      [{ subject: subjects[0].name, minutes: 45 }],
      ["FR"],
    );

    expect(coverage.totalSubjects).toBe(subjects.length);
    expect(coverage.subjectsTouched).toBe(1);
    expect(coverage.subjectPercent).not.toBeNull();
    expect(coverage.totalSubtopics).toBeGreaterThan(0);
    expect(coverage.untouchedSubjects).not.toContain(subjects[0].name);
  });

  it("reports an empty syllabus only when no papers were chosen", () => {
    const coverage = computeCoverage("ACCA_PAPERS", [], []);
    expect(coverage.totalSubjects).toBe(0);
  });
});
