// Local preview plan synthesizer: produces a usable StudyPlan from onboarding
// inputs without calling the edge function. Used before sign-up so visitors
// can SEE their plan before being asked to create an account.
//
// ALLOCATION CONTRACT (all four onboarding inputs must move the output):
//   examDate          → weeks available, urgency, study phase
//   hoursPerWeek      → total scheduled minutes and number of week-one blocks
//   preparation stage → mix of learning / recall / questions / mocks
//   confidence        → per-subject hours and which subjects lead week one
// Caps and floors in @/lib/confidence guarantee full syllabus coverage and
// stop one weak subject from consuming the whole week.
import type {
  OnboardingInput,
  StudyPlan,
  StoredPlan,
  WeeklyAllocation,
  WeeklyFocusEntry,
  StrategyTask,
  ModuleConfidence,
} from "@/lib/plan-store";
import {
  buildSpecificTask,
  buildStudyDurations,
  daysUntilExam,
  getStudyPhase,
  phaseLabel,
  selectPreciseSubtopic,
} from "@/lib/study-plan-logic";
import {
  allocateWeeklyHours,
  buildConfidenceProfile,
  buildSubjectRotation,
  isRated,
  PREPARATION_STAGE_EFFECT,
} from "@/lib/confidence";

function daysUntil(iso: string): number {
  return daysUntilExam(iso);
}

/** Priority order: explicitly weaker subjects first, then syllabus order. */
function priorityOrder(modules: ModuleConfidence[]): ModuleConfidence[] {
  return [...modules].sort((a, b) => {
    const ar = isRated(a) ? 0 : 1;
    const br = isRated(b) ? 0 : 1;
    if (ar !== br) return ar - br;
    if (!isRated(a)) return 0;
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
  const intensity = input.intensity ?? "intermediate";
  const phase = getStudyPhase(days, intensity);
  const profile = buildConfidenceProfile(input.modules, input.confidenceSource);
  const hpw = Math.max(1, input.hoursPerWeek);
  const ordered = priorityOrder(input.modules);

  // Weekly allocations across the FULL syllabus: capped and floored so no
  // subject is dropped and none takes over the week.
  const allocated = allocateWeeklyHours(ordered, hpw);
  const allocations: WeeklyAllocation[] = allocated.map(({ module: m, hours }) => {
    const ratedWeak = isRated(m) && m.confidence <= 2;
    const flagged = (m.weakSubtopics?.length ?? 0) > 0;
    return {
      module: m.name,
      hours,
      rationale: ratedWeak || flagged ? "weak-area" : "high-yield",
      note: flagged
        ? `Foundation-first work on your flagged subtopics in ${m.name}.`
        : ratedWeak
          ? `You rated ${m.name} lower, so it gets extra foundation time before timed practice.`
          : isRated(m) && m.confidence >= 4
            ? `You rated ${m.name} strongly — kept ticking over with spaced review.`
            : `${phaseLabel(phase)} work on high-yield ${m.name} subtopics.`,
      subtopics: Array.from({ length: 4 }, (_, i) => selectPreciseSubtopic(m, i)).filter(
        (value, i, arr) => value && arr.indexOf(value) === i,
      ),
      method:
        phase === "foundation"
          ? "Rule scaffold, short application drill, then low-pressure questions"
          : "Targeted review followed by exam-format practice",
      outcome:
        phase === "foundation"
          ? "Create a reliable rule base on named subtopics"
          : "Improve exam application and timing on named subtopics",
    };
  });

  // Week-by-week focus (1..weeks)
  const weeklyFocus: WeeklyFocusEntry[] = [];
  const moduleNames = ordered.map((m) => m.name);
  const leadTheme =
    profile.source === "rated" && profile.weakest.length > 0
      ? `${phaseLabel(phase)}: ${profile.weakest.slice(0, 2).join(" + ")}`
      : `${phaseLabel(phase)}: ${moduleNames.slice(0, 2).join(" + ")}`;
  for (let w = 1; w <= Math.min(weeks, 6); w++) {
    const startIdx = ((w - 1) * 2) % Math.max(1, moduleNames.length);
    const slice = moduleNames.slice(startIdx, startIdx + 3);
    weeklyFocus.push({
      week: w,
      theme:
        w === 1
          ? leadTheme
          : w === weeks
            ? "Final mock prep"
            : w <= weeks / 2
              ? "Build foundations into application"
              : "Practice-heavy & weak-area surgery",
      modules: slice.length ? slice : moduleNames.slice(0, 3),
      hours: hpw,
      reason:
        w === 1
          ? profile.source === "rated"
            ? "Leads with the subjects you rated lowest while keeping the rest of the syllabus moving."
            : "Starts with balanced foundation coverage across the syllabus."
          : "Rotate precise high-yield subtopics with spaced review of earlier foundations.",
    });
  }

  // Week one blocks: hoursPerWeek decides how many and how long; confidence
  // decides which subject each block belongs to.
  const durations = buildStudyDurations(hpw);
  const rotation = buildSubjectRotation(ordered, durations.length);
  const fallback: ModuleConfidence =
    ordered[0] ?? {
      id: "mixed",
      name: input.examType === "UBE" ? "Civil Procedure" : "Contract",
      confidence: 3,
      weakSubtopics: [],
    };
  const todayTasks: StrategyTask[] = durations.map((minutes, i) =>
    buildSpecificTask({
      module: rotation[i] ?? fallback,
      index: i,
      minutes,
      examPath: input.examPath,
      phase,
      hasMistakeEvidence: false,
      intensity,
    }),
  );

  const masteryTargets = ordered.slice(0, 8).map((m) => ({
    module: m.name,
    targetConfidence: Math.min(5, m.confidence + (m.weakSubtopics?.length ? 2 : 1)),
    priority: (isRated(m) && m.confidence <= 2
      ? "high"
      : isRated(m) && m.confidence >= 4
        ? "low"
        : "medium") as "high" | "medium" | "low",
  }));

  const coverageLine =
    profile.source === "rated"
      ? `Weighted towards the ${profile.weakest.length || profile.ratedCount} subject${
          (profile.weakest.length || profile.ratedCount) === 1 ? "" : "s"
        } you rated lowest, with every other subject still covered.`
      : "Balanced starting coverage across your full syllabus.";

  const overview =
    `A ${weeks}-week, ${hpw}h/week plan built from your exam date and your stated preparation stage. ` +
    `${PREPARATION_STAGE_EFFECT[intensity]} ${coverageLine}`;

  const summary =
    profile.source === "rated" && profile.weakest.length > 0
      ? `Priority on ${profile.weakest.slice(0, 3).join(", ")} — the subjects you rated lowest. Adapts as you log sessions and practice results.`
      : `Balanced starting coverage across ${profile.subjectCount} subjects. Adapts as you log sessions and practice results.`;

  return {
    plan: {
      overview,
      weeklyStrategy: { summary, allocations },
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
