// The redesigned ACCA Qualification (2027) — kept as a SEPARATE version from
// the current papers in acca-syllabus.ts. It is not selectable for planning
// yet: topic breakdowns from ACCA's guidance packs and the official
// transition/exemption mapping still need loading, and current students'
// papers must not be replaced or credits guessed.
// Source (checked 15 Oct 2026):
// https://www.accaglobal.com/gb/en/campaigns/accountancy-redefined/future-acca-qualification.html

export const ACCA_FUTURE_VERSION = "2027" as const;

export type AccaFutureLevel = "Foundations" | "Knowledge" | "Expertise" | "Strategic Professional";

export interface AccaFutureExam {
  code: string;
  name: string;
  level: AccaFutureLevel;
  /** First month exams at this level are available (YYYY-MM). */
  firstSitting: string;
  /** Strategic Professional Options exam (one is chosen from five). */
  option?: boolean;
}

const FOUNDATIONS_FROM = "2027-07";
const KNOWLEDGE_FROM = "2027-07";
const EXPERTISE_FROM = "2027-09";
const STRATEGIC_FROM = "2027-09";

export const ACCA_FUTURE_EXAMS: AccaFutureExam[] = [
  { code: "F1", name: "Accounts Preparation", level: "Foundations", firstSitting: FOUNDATIONS_FROM },
  { code: "F2", name: "Management Information and Costing", level: "Foundations", firstSitting: FOUNDATIONS_FROM },
  { code: "F3", name: "Decision Making with Data", level: "Foundations", firstSitting: FOUNDATIONS_FROM },
  { code: "K1", name: "Financial Accounting", level: "Knowledge", firstSitting: KNOWLEDGE_FROM },
  { code: "K2", name: "Management Accounting", level: "Knowledge", firstSitting: KNOWLEDGE_FROM },
  { code: "K3", name: "Business Law", level: "Knowledge", firstSitting: KNOWLEDGE_FROM },
  { code: "E1", name: "Taxation", level: "Expertise", firstSitting: EXPERTISE_FROM },
  { code: "E2", name: "Financial Reporting", level: "Expertise", firstSitting: EXPERTISE_FROM },
  { code: "E3", name: "Audit, Risk and Control", level: "Expertise", firstSitting: EXPERTISE_FROM },
  { code: "E4", name: "Finance and Investment", level: "Expertise", firstSitting: EXPERTISE_FROM },
  { code: "E5", name: "Performance with Data Analysis", level: "Expertise", firstSitting: EXPERTISE_FROM },
  { code: "S1", name: "Business and Sustainability Reporting", level: "Strategic Professional", firstSitting: STRATEGIC_FROM },
  { code: "S2", name: "Strategic Business Leader", level: "Strategic Professional", firstSitting: STRATEGIC_FROM },
  { code: "SAA", name: "Audit and Assurance Professional", level: "Strategic Professional", firstSitting: STRATEGIC_FROM, option: true },
  { code: "SCF", name: "Corporate Finance Professional", level: "Strategic Professional", firstSitting: STRATEGIC_FROM, option: true },
  { code: "SDS", name: "Data Science Professional", level: "Strategic Professional", firstSitting: STRATEGIC_FROM, option: true },
  { code: "SPI", name: "Performance and Insights Professional", level: "Strategic Professional", firstSitting: STRATEGIC_FROM, option: true },
  { code: "STA", name: "Taxation Advisory Professional", level: "Strategic Professional", firstSitting: STRATEGIC_FROM, option: true },
];

/** Whether the redesigned qualification's exam is available for a sitting month (YYYY-MM). */
export function isFutureExamAvailable(code: string, sittingMonth: string): boolean {
  const exam = ACCA_FUTURE_EXAMS.find((e) => e.code === code.toUpperCase());
  return Boolean(exam && sittingMonth >= exam.firstSitting);
}
