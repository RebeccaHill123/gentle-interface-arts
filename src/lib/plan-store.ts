// Local plan store (prototype-only, persists in localStorage)

export type ExamType = "SQE1" | "SQE2";

export interface ModuleConfidence {
  id: string;
  name: string;
  confidence: number; // 1-5
}

export interface OnboardingInput {
  name: string;
  examType: ExamType;
  examDate: string; // ISO
  hoursPerWeek: number;
  modules: ModuleConfidence[];
}

export interface StudyPlan {
  overview: string;
  weeklyFocus: { week: number; theme: string; modules: string[]; hours: number }[];
  todayTasks: { title: string; module: string; minutes: number }[];
  masteryTargets: {
    module: string;
    targetConfidence: number;
    priority: "high" | "medium" | "low";
  }[];
}

export interface StoredPlan {
  input: OnboardingInput;
  plan: StudyPlan;
  daysUntilExam: number;
  generatedAt: string;
  completedTaskIds: string[];
}

const KEY = "tentra.plan.v1";

export const SQE1_MODULES = [
  "Business Law & Practice",
  "Dispute Resolution",
  "Contract",
  "Tort",
  "Legal System",
  "Constitutional & Administrative Law",
  "Property Practice",
  "Wills & Estates",
  "Solicitors Accounts",
  "Land Law",
  "Trusts",
  "Criminal Law & Practice",
  "Ethics & Professional Conduct",
];

export const SQE2_MODULES = [
  "Client Interviewing & Attendance Note",
  "Advocacy",
  "Case & Matter Analysis",
  "Legal Research",
  "Legal Writing",
  "Legal Drafting",
];

export function loadPlan(): StoredPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredPlan;
  } catch {
    return null;
  }
}

export function savePlan(plan: StoredPlan) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(plan));
}

export function clearPlan() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export function toggleTaskCompletion(index: number) {
  const stored = loadPlan();
  if (!stored) return;
  const id = String(index);
  const set = new Set(stored.completedTaskIds);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  stored.completedTaskIds = Array.from(set);
  savePlan(stored);
}
