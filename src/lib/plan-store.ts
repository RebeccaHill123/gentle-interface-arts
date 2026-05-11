// Plan store: localStorage cache + Supabase cloud sync (per-user).
import { supabase } from "@/integrations/supabase/client";
import { hasRecentAuthCallback, waitForAuthUser } from "@/lib/auth-session";

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
  // Fire-and-forget cloud sync
  void pushPlanToCloud(plan);
}

export function clearPlan() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}

export async function pushPlanToCloud(plan: StoredPlan): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;
    await (supabase as any)
      .from("user_plans")
      .upsert(
        [{ user_id: uid, plan }],
        { onConflict: "user_id" },
      );
  } catch (e) {
    console.warn("pushPlanToCloud failed", e);
  }
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
    if (error || !data) {
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
