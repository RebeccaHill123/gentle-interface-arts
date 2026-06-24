// Local preview plan synthesizer: produces a usable StudyPlan from onboarding
// inputs without calling the edge function. Used before sign-up so visitors
// can SEE their plan before being asked to create an account.
import type {
  OnboardingInput,
  StudyPlan,
  StoredPlan,
  WeeklyAllocation,
  WeeklyFocusEntry,
  StrategyTask,
} from "@/lib/plan-store";

function daysUntil(iso: string): number {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000));
}

function pickModules(input: OnboardingInput) {
  // Weak first (low confidence + weakSubtopics), then by index.
  return [...input.modules].sort((a, b) => {
    const aw = a.confidence + (a.weakSubtopics?.length ? -1 : 0);
    const bw = b.confidence + (b.weakSubtopics?.length ? -1 : 0);
    return aw - bw;
  });
}

export function generatePreviewPlan(input: OnboardingInput): {
  plan: StudyPlan;
  daysUntilExam: number;
} {
  const days = daysUntil(input.examDate);
  const weeks = Math.max(1, Math.min(26, Math.ceil(days / 7)));
  const sorted = pickModules(input);
  const top = sorted.slice(0, Math.min(5, sorted.length));
  const hpw = Math.max(1, input.hoursPerWeek);

  // Weekly allocations: weight weak modules more.
  const totalWeight = sorted.reduce(
    (acc, m) => acc + (6 - m.confidence) + (m.weakSubtopics?.length ? 1 : 0),
    0,
  );
  const allocations: WeeklyAllocation[] = sorted.slice(0, 6).map((m) => {
    const w = (6 - m.confidence) + (m.weakSubtopics?.length ? 1 : 0);
    const hours = Math.max(0.5, Math.round(((w / Math.max(1, totalWeight)) * hpw) * 10) / 10);
    const weak = (m.weakSubtopics?.length ?? 0) > 0;
    return {
      module: m.name,
      hours,
      rationale: weak ? "weak-area" : m.confidence <= 2 ? "weak-area" : "high-yield",
      note: weak
        ? `Surgical reps on your flagged subtopics in ${m.name}.`
        : m.confidence <= 2
        ? `Build foundations in ${m.name} with active recall + drills.`
        : `Maintain ${m.name} with mixed practice and timed SBAs.`,
      subtopics: m.weakSubtopics?.slice(0, 4),
      method: weak ? "Spaced repetition + targeted MCQs" : "Concept review then practice questions",
      outcome: weak ? "Lift accuracy on weak subtopics by 10–15%" : "Consolidate exam-ready recall",
    };
  });

  // Week-by-week focus (1..weeks)
  const weeklyFocus: WeeklyFocusEntry[] = [];
  const moduleNames = sorted.map((m) => m.name);
  for (let w = 1; w <= Math.min(weeks, 6); w++) {
    const slice = moduleNames.slice(((w - 1) * 2) % Math.max(1, moduleNames.length), ((w - 1) * 2) % Math.max(1, moduleNames.length) + 3);
    weeklyFocus.push({
      week: w,
      theme:
        w === 1
          ? "Diagnostic & foundations"
          : w === weeks
          ? "Final mock prep"
          : w <= weeks / 2
          ? "Build & active recall"
          : "Practice-heavy & weak-area surgery",
      modules: slice.length ? slice : moduleNames.slice(0, 3),
      hours: hpw,
      reason:
        w === 1
          ? "Set baseline. Calibrate confidence with short timed sets."
          : `Focus on weakest areas in rotation; spaced review of prior weeks.`,
    });
  }

  // Today's tasks: 2-3 focused blocks from top modules.
  const blockMins = input.intensity === "advanced" ? 60 : input.intensity === "beginner" ? 30 : 45;
  const todayTasks: StrategyTask[] = top.slice(0, 3).map((m, i) => ({
    title:
      i === 0
        ? `Active recall: ${m.name}`
        : i === 1
        ? `Timed MCQs: ${m.name}`
        : `Mistake review: ${m.name}`,
    module: m.name,
    minutes: blockMins,
    taskType: i === 0 ? "active-recall" : i === 1 ? "timed-sba" : "mistake-review",
    rationale: (m.weakSubtopics?.length ?? 0) > 0 ? "weak-area" : "high-yield",
    priority: i === 0 ? "high" : "medium",
    why:
      (m.weakSubtopics?.length ?? 0) > 0
        ? `You flagged ${m.weakSubtopics!.length} weak subtopic${m.weakSubtopics!.length === 1 ? "" : "s"} here.`
        : `${m.name} is high-yield for your exam.`,
    subtopic: m.weakSubtopics?.[0],
    difficulty: m.confidence <= 2 ? "foundational" : m.confidence >= 4 ? "challenging" : "core",
    bucket: i === 0 ? "must" : "should",
  }));

  const masteryTargets = sorted.slice(0, 8).map((m) => ({
    module: m.name,
    targetConfidence: Math.min(5, m.confidence + (m.weakSubtopics?.length ? 2 : 1)),
    priority: (m.confidence <= 2 ? "high" : m.confidence <= 3 ? "medium" : "low") as
      | "high"
      | "medium"
      | "low",
  }));

  const overview =
    `A ${weeks}-week, ${hpw}h/week plan tailored to your exam, weak areas and study style. ` +
    `We'll start with diagnostics, then rotate weak-area surgery with high-yield consolidation.`;

  return {
    plan: {
      overview,
      weeklyStrategy: {
        summary: `Focused on ${top
          .slice(0, 3)
          .map((m) => m.name)
          .join(", ")}. Adapts as you log sessions.`,
        allocations,
      },
      weeklyFocus,
      todayTasks,
      masteryTargets,
    },
    daysUntilExam: days,
  };
}

export function buildStoredPreview(input: OnboardingInput): StoredPlan {
  const { plan, daysUntilExam } = generatePreviewPlan(input);
  return {
    input,
    plan,
    daysUntilExam,
    generatedAt: new Date().toISOString(),
    completedTaskIds: [],
    sessions: [],
  };
}

const PREVIEW_KEY = "tentra.preview.v1";

export function savePreviewToLocal(plan: StoredPlan) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREVIEW_KEY, JSON.stringify(plan));
}

export function loadPreviewFromLocal(): StoredPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREVIEW_KEY);
    return raw ? (JSON.parse(raw) as StoredPlan) : null;
  } catch {
    return null;
  }
}

export function clearPreviewFromLocal() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PREVIEW_KEY);
}
