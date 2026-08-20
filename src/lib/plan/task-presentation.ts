// Student-facing presentation of a scheduled task.
//
// Everything here is derived from data the engine already stored on the task —
// activity type, difficulty, minutes, and the evidence provenance stamped at
// build time. Nothing is invented: if a task has no stored evidence, the chip
// falls back to an honest "Syllabus coverage" label rather than a claim.
import type { StrategyTaskType } from "@/lib/plan-store";
import type { ScheduledTask, SkipReason } from "./types";

export const ACTIVITY_LABEL: Record<StrategyTaskType, string> = {
  "timed-sba": "Timed questions",
  "mistake-review": "Mistake review",
  "scenario-drill": "Scenario drill",
  "active-recall": "Active recall",
  "mixed-mock": "Mixed mock",
  "concept-deepdive": "Learn the concept",
  "ethics-application": "Ethics application",
};

export function activityLabel(t: Pick<ScheduledTask, "taskType">): string {
  return ACTIVITY_LABEL[t.taskType] ?? "Study";
}

/** Short provenance chip. Only ever reflects stored evidence. */
export function evidenceChip(t: ScheduledTask): string {
  if (t.movedFrom) return "Moved from an earlier day";
  return t.evidenceLabel ?? "Syllabus coverage";
}

/** How to actually do the session — concrete method, not motivation. */
export function howToDoIt(t: ScheduledTask): string[] {
  const target = t.subtopic ?? t.module;
  const q = Math.max(5, Math.round(t.minutes / 1.5));
  switch (t.taskType) {
    case "timed-sba":
      return [
        `Set a timer and answer ~${q} single-best-answer questions on ${target}.`,
        "Answer without notes. Flag anything you guessed.",
        "Read the explanation for every question you got wrong or guessed.",
      ];
    case "mistake-review":
      return [
        `Reopen your recent wrong answers in ${target}.`,
        "For each one, write the rule you actually needed in a single sentence.",
        "Redo the questions you missed and check whether the reasoning holds.",
      ];
    case "scenario-drill":
      return [
        `Work through applied scenarios on ${target}.`,
        "Identify the issue, state the rule, apply it, then conclude.",
        "Compare your reasoning against the model answer, not just the outcome.",
      ];
    case "active-recall":
      return [
        `Close your notes and write everything you can recall about ${target}.`,
        "Check against your source and mark the gaps in a different colour.",
        "Re-test only the gaps at the end of the session.",
      ];
    case "mixed-mock":
      return [
        `Sit a mixed timed set covering ${t.module} alongside earlier subjects.`,
        "Keep exam conditions: no notes, no pausing.",
        "Review the whole set afterwards, strongest answers included.",
      ];
    case "concept-deepdive":
      return [
        `Build the framework for ${target} from first principles.`,
        "Write a one-page structure: rule, exceptions, and a worked example.",
        "Finish with 5 self-test questions to prove the framework holds.",
      ];
    case "ethics-application":
      return [
        `Apply the professional conduct rules to ${target}.`,
        "For each fact pattern, name the duty engaged and who it is owed to.",
        "Note any conflict, and the practical step required.",
      ];
    default:
      return [`Work through ${target} for ${t.minutes} minutes with focused notes.`];
  }
}

/** What should exist at the end of the session. */
export function expectedOutput(t: ScheduledTask): string {
  if (t.output) return t.output;
  switch (t.taskType) {
    case "timed-sba":
    case "mixed-mock":
      return "A scored question set with every wrong answer reviewed.";
    case "mistake-review":
      return "A short list of corrected rules from your own mistakes.";
    case "active-recall":
      return "A recall sheet with the gaps you found marked up.";
    case "concept-deepdive":
      return "A one-page framework you can revise from later.";
    default:
      return "Written notes you can revise from and re-test.";
  }
}

export const SKIP_REASONS: { id: SkipReason; label: string; effect: string }[] = [
  {
    id: "no-time",
    label: "No time today",
    effect: "Tentra will try to fit it into a lighter day.",
  },
  {
    id: "too-hard",
    label: "Too hard right now",
    effect: "Tentra will schedule foundations first.",
  },
  {
    id: "already-covered",
    label: "Already covered this",
    effect: "Tentra will move on and keep it for spaced review.",
  },
  {
    id: "not-useful",
    label: "Not useful for me",
    effect: "Tentra will lower the weighting of this activity type.",
  },
  { id: "other", label: "Something else", effect: "Tentra will rebalance the rest of your week." },
];

export function skipEffect(reason: SkipReason): string {
  return SKIP_REASONS.find((r) => r.id === reason)?.effect ?? "";
}

/** Preserves the engine's ordering, but surfaces the single next action. */
export function recommendedNext(tasks: ScheduledTask[]): ScheduledTask | null {
  const open = tasks.filter((t) => t.status === "scheduled");
  if (open.length === 0) return null;
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return [...open].sort(
    (a, b) =>
      rank[a.priority] - rank[b.priority] ||
      (a.movedFrom ? 0 : 1) - (b.movedFrom ? 0 : 1) ||
      a.id.localeCompare(b.id),
  )[0];
}
