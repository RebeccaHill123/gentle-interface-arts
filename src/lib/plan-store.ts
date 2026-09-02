// Plan store: localStorage cache + Supabase cloud sync (per-user).
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { hasRecentAuthCallback, waitForAuthUser } from "@/lib/auth-session";

export type ExamType = "SQE1" | "SQE2" | "UBE" | "MPRE";

export type ExamPath =
  | "SQE1_FULL"
  | "FLK1"
  | "FLK2"
  | "SQE2"
  | "UBE_FULL"
  | "UBE_MBE"
  | "UBE_ESSAYS"
  | "UBE_MPT"
  | "MPRE_FULL"
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
  /**
   * True only when the user EXPLICITLY rated this subject. Absent/false means
   * the value is a neutral default and must never be presented as a personal
   * weakness or focus area.
   */
  rated?: boolean;
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
  /**
   * How the subject weighting was decided: explicit ratings, "I haven't
   * started the syllabus yet", or balanced coverage (nothing rated).
   */
  confidenceSource?: "rated" | "not-started" | "balanced";
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

export type TaskDifficulty = "foundational" | "core" | "challenging";
export type TaskBucket = "must" | "should" | "optional";

export interface WeeklyAllocation {
  module: string;
  hours: number;
  rationale: StrategyRationale;
  note: string;
  subtopics?: string[];
  method?: string;
  outcome?: string;
}

export interface StrategyTask {
  title: string;
  module: string;
  minutes: 30 | 45 | 60 | 90 | 120 | number;
  taskType?: StrategyTaskType;
  rationale?: StrategyRationale;
  priority?: "high" | "medium" | "low";
  why?: string;
  subtopic?: string;
  difficulty?: TaskDifficulty;
  output?: string;
  bucket?: TaskBucket;
}

export interface WeeklyFocusEntry {
  week: number;
  theme: string;
  modules: string[];
  hours: number;
  reason?: string;
  balance?: { review: number; recall: number; practice: number; mistakes: number };
}

export interface StudyPlan {
  overview: string;
  weeklyStrategy?: {
    summary: string;
    allocations: WeeklyAllocation[];
  };
  weeklyFocus: WeeklyFocusEntry[];
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
  /**
   * Phase 2 adaptive schedule (authoritative forward plan). Additive: legacy
   * readers continue to use `plan.todayTasks`, which is mirrored from it.
   * Typed loosely here to avoid a circular import with `@/lib/plan/*`.
   */
  schedule?: unknown;
}


const KEY = "tentra.plan.v1";
const DRAFT_KEY = "tentra.onboarding.draft.v1";

export interface OnboardingDraft {
  step: number;
  examType: ExamType;
  examPath: ExamPath;
  name: string;
  examDate: string;
  hoursPerWeek: number;
  intensity: IntensityTier;
  coverageMode: CoverageMode;
  modules: ModuleConfidence[];
  /** Present from the three-stage setup; older two-step drafts omit it. */
  confidenceSource?: "rated" | "not-started" | "balanced";
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
  const { data, error } = await supabase
    .from("user_plans")
    .upsert([{ user_id: uid, plan: plan as unknown as Json }], { onConflict: "user_id" })
    .select("user_id");
  if (error) throw error;
  // A write is only accepted when the intended user's row actually came back.
  if (!data || data.length === 0 || !data.some((row) => row.user_id === uid)) {
    throw new Error("Your plan change was not accepted by the server. We'll retry.");
  }
}

export type CloudPlanResult = {
  /** false when the read itself failed (network/permissions) — not "no plan". */
  ok: boolean;
  plan: StoredPlan | null;
};

/**
 * Read the cloud plan while distinguishing "this user genuinely has no plan"
 * from "we could not read it". A failed read must never erase a good local plan,
 * and a dirty (unsynced) local plan is never overwritten by cloud data: we
 * re-push first and only accept cloud once the exact local revision is
 * confirmed persisted.
 */
export async function pullPlanFromCloudResult(): Promise<CloudPlanResult> {
  try {
    const user = await waitForAuthUser();
    const uid = user?.id;
    if (!uid) return { ok: false, plan: null };

    const deps = planSyncDeps();
    if (isPlanSyncDirty(deps)) {
      await flushPlanSync(deps).catch(() => undefined);
      if (isPlanSyncDirty(deps)) {
        // Still unsynced — local is authoritative until the server confirms it.
        return { ok: false, plan: loadPlan() };
      }
    }

    const { data, error } = await supabase
      .from("user_plans")
      .select("plan")
      .eq("user_id", uid)
      .maybeSingle();

    const decision = decidePlanPull({
      dirty: isPlanSyncDirty(deps),
      readOk: !error,
      cloudHasPlan: Boolean(data),
      recentAuthCallback: typeof window !== "undefined" && hasRecentAuthCallback(),
    });

    if (error) console.warn("pullPlanFromCloud failed", error);

    if (decision.action === "keep-local") {
      return { ok: !error && decision.reason !== "read-failed", plan: loadPlan() };
    }
    if (decision.action === "clear-local") {
      if (typeof window !== "undefined") localStorage.removeItem(KEY);
      return { ok: true, plan: null };
    }
    const plan = (data as { plan: unknown }).plan as StoredPlan;
    if (typeof window !== "undefined") {
      localStorage.setItem(KEY, JSON.stringify(plan));
      return { ok: true, plan: loadPlan() };
    }
    return { ok: true, plan };
  } catch (e) {
    console.warn("pullPlanFromCloud failed", e);
    return { ok: false, plan: null };
  }
}

export async function pullPlanFromCloud(): Promise<StoredPlan | null> {
  return (await pullPlanFromCloudResult()).plan;
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

/**
 * @deprecated Use `recordStudyActivity` from `@/lib/study-log` instead — it
 * writes the canonical `study_events` row AND this legacy mirror. Calling both
 * for the same action double-counts minutes.
 */
export function addStudySession(session: Omit<StudySession, "loggedAt">) {
  const stored = loadPlan();
  if (!stored) return;
  const sessions = stored.sessions ?? [];
  sessions.push({ ...session, loggedAt: new Date().toISOString() });
  stored.sessions = sessions;
  savePlan(stored);
}

/**
 * Legacy compatibility mirror write with a caller-supplied `loggedAt`, so the
 * canonical repository can reverse it exactly on undo. Idempotent per loggedAt.
 */
export function addLegacySession(session: StudySession) {
  const stored = loadPlan();
  if (!stored) return;
  const sessions = stored.sessions ?? [];
  if (sessions.some((s) => s.loggedAt === session.loggedAt)) return;
  sessions.push(session);
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

/** Restores an exact confidence value — used to reverse an undone completion. */
export function setModuleConfidence(moduleName: string, confidence: number) {
  const stored = loadPlan();
  if (!stored) return;
  const mod = stored.input.modules.find((m) => m.name === moduleName);
  if (!mod) return;
  mod.confidence = Math.round(Math.max(1, Math.min(5, confidence)));
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
