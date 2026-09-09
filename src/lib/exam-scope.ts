// SQE1 assessment scope (FLK1 / FLK2 / both).
//
// The stored plan already carries an `examPath` ("FLK1" | "FLK2" | "SQE1_FULL")
// which drives the syllabus, evidence and coverage. This module is the single
// source of truth for translating the student's answer ("which part of SQE1 are
// you preparing for?") into that path, and for deciding whether a given subject
// belongs in the student's experience at all.
//
// Ethics & Professional Conduct is assessed in BOTH FLK papers, so it is
// deliberately in scope for every SQE1 assessment choice.
import { SQE_SYLLABUS, type FLKPaper } from "@/lib/sqe-syllabus";
import type { ExamPath, ModuleConfidence, StoredPlan } from "@/lib/plan-store";

export type SqeAssessment = "FLK1" | "FLK2" | "BOTH";

export const SQE_ASSESSMENT_OPTIONS: {
  value: SqeAssessment;
  label: string;
  blurb: string;
}[] = [
  {
    value: "FLK1",
    label: "FLK1 only",
    blurb: "Contract, Tort, Business Law, Dispute Resolution, Public Law, Legal System, Ethics.",
  },
  {
    value: "FLK2",
    label: "FLK2 only",
    blurb: "Land Law, Property, Trusts, Wills & Estates, Criminal, Solicitors Accounts, Ethics.",
  },
  {
    value: "BOTH",
    label: "Both FLK1 and FLK2",
    blurb: "Full SQE1 — study time is shared across both papers.",
  },
];

/** Subjects examined across both FLK papers, so never excluded. */
const CROSS_PAPER_SUBJECTS = new Set(["Ethics & Professional Conduct"]);

export function assessmentToPath(a: SqeAssessment): ExamPath {
  if (a === "FLK1") return "FLK1";
  if (a === "FLK2") return "FLK2";
  return "SQE1_FULL";
}

/**
 * Derive the assessment from a path. `SQE1_FULL` is intentionally NOT treated
 * as an explicit "both": legacy plans were created before the question existed,
 * so callers must consult the stored preference instead of assuming.
 */
export function assessmentFromPath(path?: ExamPath | null): SqeAssessment | null {
  if (path === "FLK1") return "FLK1";
  if (path === "FLK2") return "FLK2";
  return null;
}

export function isSqe1Path(path?: ExamPath | null): boolean {
  return path === "SQE1_FULL" || path === "FLK1" || path === "FLK2";
}

/** True when this plan is an SQE1 plan, i.e. the FLK question applies. */
export function planIsSqe1(stored: StoredPlan | null | undefined): boolean {
  if (!stored) return false;
  const path = stored.input.examPath;
  if (path) return isSqe1Path(path);
  return stored.input.examType === "SQE1";
}

export function papersFor(a: SqeAssessment): FLKPaper[] {
  if (a === "FLK1") return ["FLK1"];
  if (a === "FLK2") return ["FLK2"];
  return ["FLK1", "FLK2"];
}

function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Common aliases used by decks, AI-named topics and older plans, so a subject
 * written a different way still resolves to the correct paper.
 */
const SUBJECT_ALIASES: Record<string, FLKPaper> = {
  "wills": "FLK2",
  "wills & administration of estates": "FLK2",
  "wills and administration of estates": "FLK2",
  "administration of estates": "FLK2",
  "land": "FLK2",
  "property": "FLK2",
  "accounts": "FLK2",
  "solicitors' accounts": "FLK2",
  "criminal litigation": "FLK2",
  "criminal": "FLK2",
  "criminal law": "FLK2",
  "criminal practice": "FLK2",
  "civil litigation": "FLK1",
  "business law": "FLK1",
  "public law": "FLK1",
  "constitutional and administrative law": "FLK1",
  "eu law": "FLK1",
  "legal services": "FLK1",
};

/** The FLK paper a subject belongs to, or undefined when unknown/cross-paper. */
export function paperForSubject(name: string): FLKPaper | undefined {
  const want = normalise(name);
  if (CROSS_PAPER_SUBJECTS.has(name) || want.includes("ethics")) return undefined;
  const alias = SUBJECT_ALIASES[want];
  if (alias) return alias;
  const match = SQE_SYLLABUS.find((s) => {
    const n = normalise(s.name);
    return n === want || n.includes(want) || want.includes(n);
  });
  return match?.paper;
}

/**
 * Fail-open only for genuinely unknown subjects (custom/AI-named topics) — a
 * subject that maps to the excluded paper is always out of scope.
 */
export function subjectInScope(name: string, a: SqeAssessment | null): boolean {
  if (!a || a === "BOTH") return true;
  const paper = paperForSubject(name);
  if (!paper) return true;
  return paper === a;
}

/** Filter a list of onboarding modules to the chosen assessment. */
export function scopeModules(
  modules: ModuleConfidence[],
  a: SqeAssessment | null,
): ModuleConfidence[] {
  if (!a || a === "BOTH") return modules;
  return modules.filter((m) => subjectInScope(m.name, a));
}

/** The explicit assessment recorded on a plan, when there is one. */
export function planAssessment(stored: StoredPlan | null | undefined): SqeAssessment | null {
  if (!stored || !planIsSqe1(stored)) return null;
  const explicit = stored.input.sqeAssessment;
  if (explicit === "FLK1" || explicit === "FLK2" || explicit === "BOTH") return explicit;
  return assessmentFromPath(stored.input.examPath);
}

export function assessmentLabel(a: SqeAssessment): string {
  return a === "BOTH" ? "FLK1 & FLK2" : a;
}

/** Exam-date question heading, matched to the assessment being sat. */
export function assessmentDateHeading(a: SqeAssessment | null): string {
  if (a === "FLK1") return "When are you sitting FLK1?";
  if (a === "FLK2") return "When are you sitting FLK2?";
  return "When are you sitting SQE1?";
}

export function isSqeAssessment(value: unknown): value is SqeAssessment {
  return value === "FLK1" || value === "FLK2" || value === "BOTH";
}
