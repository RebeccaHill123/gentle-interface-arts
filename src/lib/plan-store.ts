// Plan store: localStorage cache + Supabase sync (per user).
import { supabase } from "@/integrations/supabase/client";

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

export interface StudySession {
  date: string; // YYYY-MM-DD
  minutes: number;
  module?: string;
  note?: string;
  loggedAt: string; // ISO
}

export interface StoredPlan {
  input: OnboardingInput;
  plan: StudyPlan;
  daysUntilExam: number;
  generatedAt: string;
  completedTaskIds: string[];
  sessions?: StudySession[];
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

export function addStudySession(session: Omit<StudySession, "loggedAt">) {
  const stored = loadPlan();
  if (!stored) return;
  const sessions = stored.sessions ?? [];
  sessions.push({ ...session, loggedAt: new Date().toISOString() });
  stored.sessions = sessions;
  savePlan(stored);
}

/**
 * Adjust a module's confidence (1-5) based on quiz accuracy.
 * accuracy is a number 0..1. We move the current value toward the implied
 * score (accuracy * 5) by a small step, so a single quiz nudges mastery
 * without overwriting it.
 */
export function adjustModuleConfidence(moduleName: string, accuracy: number) {
  const stored = loadPlan();
  if (!stored) return;
  const mod = stored.input.modules.find((m) => m.name === moduleName);
  if (!mod) return;
  const implied = Math.max(1, Math.min(5, accuracy * 5));
  const step = 0.4; // how much one quiz can move the needle
  const next = mod.confidence + (implied - mod.confidence) * step;
  mod.confidence = Math.round(Math.max(1, Math.min(5, next)));
  savePlan(stored);
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function computeStreak(sessions: StudySession[] | undefined): {
  current: number;
  longest: number;
  studiedToday: boolean;
  totalMinutesToday: number;
} {
  if (!sessions || sessions.length === 0) {
    return { current: 0, longest: 0, studiedToday: false, totalMinutesToday: 0 };
  }
  const days = new Set(sessions.map((s) => s.date));
  const today = new Date();
  const tKey = toDateKey(today);
  const studiedToday = days.has(tKey);
  const totalMinutesToday = sessions
    .filter((s) => s.date === tKey)
    .reduce((acc, s) => acc + s.minutes, 0);

  let current = 0;
  const cursor = new Date(today);
  if (!studiedToday) cursor.setDate(cursor.getDate() - 1);
  while (days.has(toDateKey(cursor))) {
    current++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sorted = Array.from(days).sort();
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of sorted) {
    const d = new Date(key);
    if (prev) {
      const diff = Math.round((d.getTime() - prev.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prev = d;
  }

  return { current, longest, studiedToday, totalMinutesToday };
}
