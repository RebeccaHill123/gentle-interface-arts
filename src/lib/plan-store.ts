// Plan store: localStorage cache + Supabase cloud sync (per-user).
import { supabase } from "@/integrations/supabase/client";
import { hasRecentAuthCallback, waitForAuthUser } from "@/lib/auth-session";

export type ExamType = "SQE1" | "SQE2";

export type ExamPath =
  | "SQE1_FULL"
  | "FLK1"
  | "FLK2"
  | "SQE2"
  | "CUSTOM";

export type IntensityTier =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "resitter";

export type CoverageMode = "even" | "advanced";

export interface ModuleConfidence {
  id: string;
  name: string;
  confidence: number; // 1-5
  weakSubtopics?: string[]; // names of subtopics user flagged as weak
}

export interface OnboardingInput {
  name: string;
  examType: ExamType; // derived from examPath; kept for back-compat
  examPath?: ExamPath;
  intensity?: IntensityTier;
  coverageMode?: CoverageMode;
  examDate: string; // ISO
  hoursPerWeek: number;
  modules: ModuleConfidence[];
}

export type StrategyRationale =
  | "high-yield"
  | "weak-area"
  | "recency-gap"
  | "mixed-practice"
  | "mock-prep"
  | "ethics-cornerstone";

export type StrategyTaskType =
  | "timed-sba"
  | "mistake-review"
  | "scenario-drill"
  | "active-recall"
  | "mixed-mock"
  | "concept-deepdive"
  | "ethics-application";

export interface WeeklyAllocation {
  module: string;
  hours: number;
  rationale: StrategyRationale;
  note: string;
}

export interface StrategyTask {
  title: string;
  module: string;
  minutes: 30 | 45 | 60 | 90 | 120 | number;
  taskType?: StrategyTaskType;
  rationale?: StrategyRationale;
  priority?: "high" | "medium" | "low";
  why?: string;
}

export interface StudyPlan {
  overview: string;
  weeklyStrategy?: {
    summary: string;
    allocations: WeeklyAllocation[];
  };
  weeklyFocus: { week: number; theme: string; modules: string[]; hours: number }[];
  todayTasks: StrategyTask[];
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
  sessionType?: "study" | "quiz" | "mock" | "review" | "flashcards" | "focus";
  mood?: 1 | 2 | 3 | 4 | 5;
  focus?: number; // 0..1
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
const DRAFT_KEY = "tentra.onboarding.draft.v1";

export interface OnboardingDraft {
  step: number;
  examPath: ExamPath;
  name: string;
  examDate: string;
  hoursPerWeek: number;
  intensity: IntensityTier;
  coverageMode: CoverageMode;
  modules: ModuleConfidence[];
}

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
    const value = JSON.parse(raw) as Partial<StoredPlan>;
    if (!value.input || !value.plan || !Array.isArray(value.input.modules)) return null;
    return {
      ...value,
      input: {
        ...value.input,
        name: value.input.name ?? "Tentra student",
        examType: value.input.examType ?? "SQE1",
        examDate: value.input.examDate ?? "",
        hoursPerWeek: value.input.hoursPerWeek ?? 0,
        modules: value.input.modules,
      },
      plan: {
        ...value.plan,
        overview: value.plan.overview ?? "Your personalised study plan.",
        todayTasks: Array.isArray(value.plan.todayTasks) ? value.plan.todayTasks : [],
        weeklyFocus: Array.isArray(value.plan.weeklyFocus) ? value.plan.weeklyFocus : [],
        masteryTargets: Array.isArray(value.plan.masteryTargets) ? value.plan.masteryTargets : [],
      },
      daysUntilExam: value.daysUntilExam ?? 0,
      generatedAt: value.generatedAt ?? new Date().toISOString(),
      completedTaskIds: Array.isArray(value.completedTaskIds) ? value.completedTaskIds : [],
      sessions: Array.isArray(value.sessions) ? value.sessions : [],
    } as StoredPlan;
  } catch {
    return null;
  }
}

export function savePlan(plan: StoredPlan) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(plan));
  // Fire-and-forget cloud sync
  void pushPlanToCloud(plan).catch((error) => console.warn("pushPlanToCloud failed", error));
}

export async function savePlanAndSync(plan: StoredPlan): Promise<void> {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(plan));
  await pushPlanToCloud(plan);
}

export function loadOnboardingDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as OnboardingDraft) : null;
  } catch {
    return null;
  }
}

export function saveOnboardingDraft(draft: OnboardingDraft) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearOnboardingDraft() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_KEY);
}

export function clearPlan() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export async function pushPlanToCloud(plan: StoredPlan): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const uid = userData.user?.id;
  if (!uid) throw new Error("Please sign in to save your plan.");
  const { error } = await (supabase as any)
    .from("user_plans")
    .upsert([{ user_id: uid, plan }], { onConflict: "user_id" });
  if (error) throw error;
}

export async function pullPlanFromCloud(): Promise<StoredPlan | null> {
  try {
    const user = await waitForAuthUser();
    const uid = user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from("user_plans")
      .select("plan")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) {
      console.warn("pullPlanFromCloud failed", error);
      return null;
    }
    if (!data) {
      // No cloud plan for this user — clear stale local cache after normal sign-in,
      // but preserve it immediately after verification while auth storage settles.
      if (typeof window !== "undefined" && !hasRecentAuthCallback()) {
        localStorage.removeItem(KEY);
      }
      return null;
    }
    const plan = data.plan as unknown as StoredPlan;
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(plan));
    }
    return plan;
  } catch (e) {
    console.warn("pullPlanFromCloud failed", e);
    return null;
  }
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

export function updateStudySession(
  loggedAt: string,
  patch: Partial<Omit<StudySession, "loggedAt">>,
) {
  const stored = loadPlan();
  if (!stored?.sessions) return;
  const idx = stored.sessions.findIndex((s) => s.loggedAt === loggedAt);
  if (idx === -1) return;
  stored.sessions[idx] = { ...stored.sessions[idx], ...patch };
  savePlan(stored);
}

export function removeStudySession(loggedAt: string) {
  const stored = loadPlan();
  if (!stored?.sessions) return;
  stored.sessions = stored.sessions.filter((s) => s.loggedAt !== loggedAt);
  savePlan(stored);
}

export function adjustModuleConfidence(moduleName: string, accuracy: number) {
  const stored = loadPlan();
  if (!stored) return;
  const mod = stored.input.modules.find((m) => m.name === moduleName);
  if (!mod) return;
  const implied = Math.max(1, Math.min(5, accuracy * 5));
  const step = 0.4;
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
