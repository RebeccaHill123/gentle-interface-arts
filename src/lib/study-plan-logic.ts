import { getSubtopicsForSubject, isUbePath } from "@/lib/exam-paths";
import type {
  ExamPath,
  IntensityTier,
  ModuleConfidence,
  StrategyRationale,
  StrategyTask,
  StrategyTaskType,
  StoredPlan,
  TaskBucket,
  TaskDifficulty,
} from "@/lib/plan-store";

export type StudyPhase = "foundation" | "build" | "performance" | "final";

const ALLOWED_MINUTES = [120, 90, 60, 45, 30] as const;

export function daysUntilExam(iso: string): number {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));
}

export function getStudyPhase(days: number, intensity: IntensityTier = "intermediate"): StudyPhase {
  if (days <= 21) return "final";
  if (days <= 49 || intensity === "resitter") return "performance";
  if (days <= 98 || intensity === "advanced") return "build";
  return "foundation";
}

export function buildStudyDurations(hoursPerWeek: number): Array<30 | 45 | 60 | 90 | 120> {
  const target = Math.max(30, Math.round(hoursPerWeek * 60));
  const durations: Array<30 | 45 | 60 | 90 | 120> = [];
  let remaining = target;
  while (remaining > 0) {
    const next = ALLOWED_MINUTES.find((m) => remaining >= m) ?? 30;
    durations.push(next);
    remaining -= next;
  }
  return durations;
}

export function phaseLabel(phase: StudyPhase): string {
  switch (phase) {
    case "foundation":
      return "Foundation";
    case "build":
      return "Build & apply";
    case "performance":
      return "Timed performance";
    case "final":
      return "Final review";
  }
}

export function selectPreciseSubtopic(module: ModuleConfidence, index: number): string {
  const weak = module.weakSubtopics?.filter(Boolean) ?? [];
  if (weak.length > 0) return weak[index % weak.length];
  const subtopics = getSubtopicsForSubject(module.name);
  if (subtopics.length === 0) return module.name;
  return subtopics[index % subtopics.length]?.name ?? subtopics[0].name;
}

export function taskTypeForPhase(
  phase: StudyPhase,
  index: number,
  hasMistakeEvidence: boolean,
): StrategyTaskType {
  if (hasMistakeEvidence && (phase === "performance" || phase === "final") && index % 4 === 3) {
    return "mistake-review";
  }
  if (phase === "foundation") {
    return index % 3 === 0 ? "concept-deepdive" : index % 3 === 1 ? "scenario-drill" : "timed-sba";
  }
  if (phase === "build") {
    return index % 4 === 0 ? "concept-deepdive" : index % 4 === 1 ? "timed-sba" : index % 4 === 2 ? "scenario-drill" : "active-recall";
  }
  if (phase === "performance") {
    return index % 4 === 0 ? "timed-sba" : index % 4 === 1 ? "scenario-drill" : index % 4 === 2 ? "mixed-mock" : "active-recall";
  }
  return index % 3 === 0 ? "mixed-mock" : index % 3 === 1 ? "timed-sba" : "active-recall";
}

function questionCount(minutes: number, examPath: ExamPath | undefined): number {
  if (examPath && isUbePath(examPath)) return Math.max(8, Math.floor(minutes / 1.8));
  return Math.max(8, Math.floor(minutes / 1.6));
}

export function buildSpecificTask({
  module,
  index,
  minutes,
  examPath,
  phase,
  hasMistakeEvidence = false,
}: {
  module: ModuleConfidence;
  index: number;
  minutes: number;
  examPath?: ExamPath;
  phase: StudyPhase;
  hasMistakeEvidence?: boolean;
}): StrategyTask {
  const subtopic = selectPreciseSubtopic(module, index);
  const isUbe = examPath ? isUbePath(examPath) : false;
  const taskType = taskTypeForPhase(phase, index, hasMistakeEvidence);
  const q = questionCount(minutes, examPath);
  const timing = isUbe ? `${q} MBE questions in ${Math.round(q * 1.8)} mins` : `${q} SBA questions`;
  const difficulty: TaskDifficulty = phase === "foundation" || module.confidence <= 2 ? "foundational" : phase === "final" ? "challenging" : "core";
  const bucket: TaskBucket = index % 5 < 3 ? "must" : index % 5 === 3 ? "should" : "optional";
  const rationale: StrategyRationale =
    (module.weakSubtopics?.length ?? 0) > 0 || module.confidence <= 2
      ? "weak-area"
      : taskType === "mixed-mock"
        ? "mock-prep"
        : "high-yield";

  const title = (() => {
    if (taskType === "concept-deepdive") return `Build foundation: ${subtopic}`;
    if (taskType === "scenario-drill") return `Apply foundation: ${subtopic}`;
    if (taskType === "timed-sba") {
      return phase === "foundation"
        ? `Check understanding: ${subtopic} — ${timing}`
        : `Timed practice: ${subtopic} — ${timing}`;
    }
    if (taskType === "mixed-mock") {
      if (isUbe && module.name.includes("Performance Test")) return `MPT drill: ${subtopic} — 90-minute task plan and answer`;
      if (isUbe && module.name.includes("Associations")) return `MEE essay drill: ${subtopic} — 1 essay in 30 minutes`;
      return `Mixed exam set: ${subtopic} — ${timing}`;
    }
    if (taskType === "mistake-review") return `Mistake review: ${subtopic} — rework logged misses and extract the rule`;
    return `Closed-book rule recall: ${subtopic}`;
  })();

  const output = (() => {
    if (taskType === "concept-deepdive") return "A one-page rule scaffold with trigger facts and exceptions";
    if (taskType === "scenario-drill") return "Two short application paragraphs identifying issue, rule and conclusion";
    if (taskType === "timed-sba") return "Record score, timing and one rule gap from every miss";
    if (taskType === "mixed-mock") return "Score the set and log the two weakest subtopics";
    if (taskType === "mistake-review") return "Mark each logged mistake as resolved or carry forward with a corrected rule";
    return "A closed-book rule sheet to re-test in 3 days";
  })();

  return {
    title,
    module: module.name,
    minutes,
    taskType,
    rationale,
    priority: bucket === "must" ? "high" : bucket === "should" ? "medium" : "low",
    why:
      phase === "foundation"
        ? `You need a precise rule base in ${subtopic} before heavier timed practice.`
        : rationale === "weak-area"
          ? `This targets a low-confidence or flagged area in ${module.name}.`
          : `This keeps a high-yield ${module.name} area moving toward exam pace.`,
    subtopic,
    difficulty,
    output,
    bucket,
  };
}

export function isVagueTask(task: Pick<StrategyTask, "title" | "module" | "taskType" | "subtopic">, hasMistakeEvidence: boolean): boolean {
  const title = String(task.title ?? "").trim().toLowerCase();
  const module = String(task.module ?? "").trim().toLowerCase();
  const subtopic = String(task.subtopic ?? "").trim().toLowerCase();
  if (!title || !module) return true;
  if (!subtopic || subtopic === module) return true;
  if (title === module) return true;
  if ([`active recall: ${module}`, `timed mcqs: ${module}`, `timed mcq: ${module}`, `mistake review: ${module}`].includes(title)) return true;
  if (task.taskType === "mistake-review" && !hasMistakeEvidence) return true;
  return false;
}

export function normalizeStoredPlanTasks(stored: StoredPlan): StoredPlan {
  const phase = getStudyPhase(stored.daysUntilExam || daysUntilExam(stored.input.examDate), stored.input.intensity);
  const hasMistakeEvidence = (stored.sessions ?? []).some((s) => s.sessionType === "quiz" || s.sessionType === "mock");
  let changed = false;
  const modules = stored.input.modules;
  const todayTasks = stored.plan.todayTasks.map((task, index) => {
    if (!isVagueTask(task, hasMistakeEvidence)) return task;
    const module = modules.find((m) => m.name === task.module) ?? modules[index % Math.max(1, modules.length)] ?? {
      id: "mixed",
      name: task.module || "Mixed practice",
      confidence: 3,
      weakSubtopics: [],
    };
    changed = true;
    return buildSpecificTask({
      module,
      index,
      minutes: [30, 45, 60, 90, 120].includes(task.minutes) ? task.minutes : 45,
      examPath: stored.input.examPath,
      phase,
      hasMistakeEvidence,
    });
  });

  if (!changed) return stored;
  return {
    ...stored,
    plan: {
      ...stored.plan,
      overview: stored.plan.overview.replace(/mistake review/gi, hasMistakeEvidence ? "mistake review" : "answer review"),
      weeklyStrategy: stored.plan.weeklyStrategy
        ? {
            ...stored.plan.weeklyStrategy,
            summary: stored.plan.weeklyStrategy.summary.replace(/mistake review/gi, hasMistakeEvidence ? "mistake review" : "answer review"),
          }
        : stored.plan.weeklyStrategy,
      todayTasks,
    },
  };
}