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
import {
  buildSpecificTask,
  buildStudyDurations,
  daysUntilExam,
  getStudyPhase,
  phaseLabel,
  selectPreciseSubtopic,
} from "@/lib/study-plan-logic";

function daysUntil(iso: string): number {
  return daysUntilExam(iso);
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
  const phase = getStudyPhase(days, input.intensity);
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
        ? `Foundation-first work on your flagged subtopics in ${m.name}.`
        : m.confidence <= 2
        ? `Build foundations in ${m.name} before moving to timed practice.`
        : `${phaseLabel(phase)} work on high-yield ${m.name} subtopics.`,
      subtopics: Array.from({ length: 4 }, (_, i) => selectPreciseSubtopic(m, i)).filter(
        (value, i, arr) => value && arr.indexOf(value) === i,
      ),
      method: phase === "foundation" ? "Rule scaffold, short application drill, then low-pressure questions" : "Targeted review followed by exam-format practice",
      outcome: phase === "foundation" ? "Create a reliable rule base on named subtopics" : "Improve exam application and timing on named subtopics",
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
          ? `${phaseLabel(phase)}: ${slice.length ? slice.join(" + ") : moduleNames.slice(0, 2).join(" + ")}`
          : w === weeks
          ? "Final mock prep"
          : w <= weeks / 2
          ? "Build foundations into application"
          : "Practice-heavy & weak-area surgery",
      modules: slice.length ? slice : moduleNames.slice(0, 3),
      hours: hpw,
      reason:
        w === 1
          ? "Start with precise syllabus foundations before relying on recall or mistake review."
          : `Rotate precise high-yield subtopics with spaced review of earlier foundations.`,
    });
  }

  // Today's tasks: precise foundation-first blocks from the user's full syllabus route.
  const durations = buildStudyDurations(hpw);
  const todayTasks: StrategyTask[] = durations.map((minutes, i) => {
    const module = top[i % Math.max(1, top.length)] ?? sorted[0] ?? {
      id: "mixed",
      name: input.examType === "UBE" ? "Civil Procedure" : "Contract",
      confidence: 3,
      weakSubtopics: [],
    };
    return buildSpecificTask({
      module,
      index: i,
      minutes,
      examPath: input.examPath,
      phase,
      hasMistakeEvidence: false,
    });
  });

  const masteryTargets = sorted.slice(0, 8).map((m) => ({
    module: m.name,
    targetConfidence: Math.min(5, m.confidence + (m.weakSubtopics?.length ? 2 : 1)),
    priority: (m.confidence <= 2 ? "high" : m.confidence <= 3 ? "medium" : "low") as
      | "high"
      | "medium"
      | "low",
  }));

  const overview =
    `A ${weeks}-week, ${hpw}h/week plan tailored to your exam date, syllabus route and confidence profile. ` +
    `Week 1 starts in ${phaseLabel(phase).toLowerCase()} mode with named subtopics before heavier recall, mocks or mistake review.`;

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
