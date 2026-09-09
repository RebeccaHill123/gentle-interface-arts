import { describe, expect, it } from "vitest";
import {
  assessmentFromPath,
  assessmentToPath,
  isSqeAssessment,
  papersFor,
  planAssessment,
  scopeModules,
  subjectInScope,
} from "@/lib/exam-scope";
import { getSubjectsForExamPath } from "@/lib/exam-paths";
import type { StoredPlan } from "@/lib/plan-store";

const FLK1_SUBJECTS = [
  "Contract",
  "Tort",
  "Business Law & Practice",
  "Dispute Resolution",
  "Constitutional & Administrative Law",
];
const FLK2_SUBJECTS = [
  "Land Law",
  "Property Practice",
  "Trusts",
  "Wills & Estates",
  "Solicitors Accounts",
];

describe("SQE1 assessment scope", () => {
  it("maps each answer to the right exam path", () => {
    expect(assessmentToPath("FLK1")).toBe("FLK1");
    expect(assessmentToPath("FLK2")).toBe("FLK2");
    expect(assessmentToPath("BOTH")).toBe("SQE1_FULL");
  });

  it("never infers 'both' from a legacy full-SQE1 path", () => {
    expect(assessmentFromPath("SQE1_FULL")).toBeNull();
    expect(assessmentFromPath("FLK1")).toBe("FLK1");
    expect(assessmentFromPath("FLK2")).toBe("FLK2");
  });

  it("excludes the other paper's subjects and keeps ethics in both", () => {
    for (const name of FLK1_SUBJECTS) {
      expect(subjectInScope(name, "FLK1")).toBe(true);
      expect(subjectInScope(name, "FLK2")).toBe(false);
      expect(subjectInScope(name, "BOTH")).toBe(true);
    }
    for (const name of FLK2_SUBJECTS) {
      expect(subjectInScope(name, "FLK2")).toBe(true);
      expect(subjectInScope(name, "FLK1")).toBe(false);
      expect(subjectInScope(name, "BOTH")).toBe(true);
    }
    expect(subjectInScope("Ethics & Professional Conduct", "FLK1")).toBe(true);
    expect(subjectInScope("Ethics & Professional Conduct", "FLK2")).toBe(true);
  });

  it("resolves common subject aliases to the right paper", () => {
    expect(subjectInScope("Wills", "FLK1")).toBe(false);
    expect(subjectInScope("Criminal Litigation", "FLK1")).toBe(false);
    expect(subjectInScope("Property", "FLK1")).toBe(false);
    expect(subjectInScope("Business Law", "FLK2")).toBe(false);
    expect(subjectInScope("Public Law", "FLK2")).toBe(false);
  });

  it("scopes onboarding modules", () => {
    const modules = [...FLK1_SUBJECTS, ...FLK2_SUBJECTS].map((name, i) => ({
      id: String(i),
      name,
      confidence: 3,
      weakSubtopics: [],
    }));
    const flk1 = scopeModules(modules, "FLK1").map((m) => m.name);
    expect(flk1).toEqual(FLK1_SUBJECTS);
    const flk2 = scopeModules(modules, "FLK2").map((m) => m.name);
    expect(flk2).toEqual(FLK2_SUBJECTS);
    expect(scopeModules(modules, "BOTH")).toHaveLength(modules.length);
  });

  it("syllabus for a single paper excludes the other paper but keeps ethics", () => {
    const flk1 = getSubjectsForExamPath("FLK1").map((s) => s.name);
    expect(flk1).toContain("Contract");
    expect(flk1).not.toContain("Land Law");
    expect(flk1).not.toContain("Solicitors Accounts");
    expect(flk1.some((n) => n.includes("Ethics"))).toBe(true);

    const flk2 = getSubjectsForExamPath("FLK2").map((s) => s.name);
    expect(flk2).toContain("Land Law");
    expect(flk2).not.toContain("Business Law & Practice");
    expect(flk2).not.toContain("Contract");
    expect(flk2.some((n) => n.includes("Ethics"))).toBe(true);

    const both = getSubjectsForExamPath("SQE1_FULL").map((s) => s.name);
    expect(both).toContain("Contract");
    expect(both).toContain("Land Law");
  });

  it("papersFor matches the answer", () => {
    expect(papersFor("FLK1")).toEqual(["FLK1"]);
    expect(papersFor("FLK2")).toEqual(["FLK2"]);
    expect(papersFor("BOTH")).toEqual(["FLK1", "FLK2"]);
  });

  it("planAssessment prefers the explicit answer and stays null for legacy plans", () => {
    const base = {
      input: { examType: "SQE1", examPath: "SQE1_FULL", modules: [] },
    } as unknown as StoredPlan;
    expect(planAssessment(base)).toBeNull();

    const explicit = {
      input: { ...base.input, sqeAssessment: "BOTH" },
    } as unknown as StoredPlan;
    expect(planAssessment(explicit)).toBe("BOTH");

    const single = {
      input: { examType: "SQE1", examPath: "FLK2", modules: [] },
    } as unknown as StoredPlan;
    expect(planAssessment(single)).toBe("FLK2");

    const ube = {
      input: { examType: "UBE", examPath: "UBE_FULL", modules: [] },
    } as unknown as StoredPlan;
    expect(planAssessment(ube)).toBeNull();
  });

  it("validates stored values", () => {
    expect(isSqeAssessment("FLK1")).toBe(true);
    expect(isSqeAssessment("BOTH")).toBe(true);
    expect(isSqeAssessment(null)).toBe(false);
    expect(isSqeAssessment("SQE1_FULL")).toBe(false);
  });
});
