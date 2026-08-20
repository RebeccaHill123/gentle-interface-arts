// Syllabus confidence: ratings, deterministic mapping, and plan weighting.
//
// PRODUCT RULE: a subject may only be described as a user's weak area or
// priority when they EXPLICITLY rated it. A defaulted/neutral module is not
// personal data, so it is never presented as a personal weakness. The
// `rated` flag on ModuleConfidence is the single source of truth for that.

import type { ModuleConfidence } from "@/lib/plan-store";

/** The four taps offered during onboarding. */
export type ConfidenceRating = "not-studied" | "low" | "okay" | "strong";

/**
 * Deterministic mapping onto the existing 1–5 confidence scale used by the
 * generator (1 = weakest, 5 = strongest):
 *
 *   not-studied → 1   (no exposure: foundation-first work)
 *   low         → 2   (studied, unreliable: treated as a weak area)
 *   okay        → 3   (workable: normal high-yield rotation)
 *   strong      → 5   (secure: maintenance and spaced review only)
 *
 * Note `okay` shares the numeric value of the historic neutral default (3).
 * The two are distinguished by `rated`, never by the number alone.
 */
export const RATING_TO_CONFIDENCE: Record<ConfidenceRating, number> = {
  "not-studied": 1,
  low: 2,
  okay: 3,
  strong: 5,
};

export const RATING_ORDER: ConfidenceRating[] = [
  "not-studied",
  "low",
  "okay",
  "strong",
];

export const RATING_LABELS: Record<ConfidenceRating, string> = {
  "not-studied": "Not studied",
  low: "Low",
  okay: "Okay",
  strong: "Strong",
};

/** Inverse mapping, used to re-hydrate a saved draft into the UI control. */
export function confidenceToRating(
  module: Pick<ModuleConfidence, "confidence" | "rated">,
): ConfidenceRating | null {
  if (!module.rated) return null;
  if (module.confidence <= 1) return "not-studied";
  if (module.confidence <= 2) return "low";
  if (module.confidence <= 3) return "okay";
  return "strong";
}

/** Where a plan's subject weighting came from. */
export type ConfidenceSource = "rated" | "not-started" | "balanced";

export function isRated(m: ModuleConfidence): boolean {
  return m.rated === true;
}

export type ConfidenceProfile = {
  source: ConfidenceSource;
  subjectCount: number;
  ratedCount: number;
  /** Explicitly rated subjects the user is least confident in (max 3). */
  weakest: string[];
  /** Explicitly rated subjects the user is most confident in (max 3). */
  strongest: string[];
};

/**
 * Summarise what the user actually told us. Legacy plans (created before
 * ratings existed) have no `rated` flags and therefore resolve to
 * "balanced" — never to personal weakness.
 */
export function buildConfidenceProfile(
  modules: ModuleConfidence[],
  declaredSource?: ConfidenceSource,
): ConfidenceProfile {
  const rated = modules.filter(isRated);
  const allNotStudied =
    rated.length > 0 &&
    rated.length === modules.length &&
    rated.every((m) => m.confidence <= 1);

  const source: ConfidenceSource =
    declaredSource === "not-started" || allNotStudied
      ? "not-started"
      : rated.length > 0
        ? "rated"
        : "balanced";

  const byConfidence = [...rated].sort((a, b) => a.confidence - b.confidence);
  const weakest =
    source === "rated"
      ? byConfidence.filter((m) => m.confidence <= 2).slice(0, 3).map((m) => m.name)
      : [];
  const strongest =
    source === "rated"
      ? [...byConfidence]
          .reverse()
          .filter((m) => m.confidence >= 4)
          .slice(0, 3)
          .map((m) => m.name)
      : [];

  return {
    source,
    subjectCount: modules.length,
    ratedCount: rated.length,
    weakest,
    strongest,
  };
}

/**
 * Relative attention weight per subject.
 *
 * Only explicit ratings move the weight. Unrated subjects sit at the neutral
 * baseline so they are covered on syllabus merit rather than invented
 * weakness. Weights are bounded so one weak subject cannot swallow the week.
 */
const UNRATED_WEIGHT = 1;

export function subjectWeight(m: ModuleConfidence): number {
  if (!isRated(m)) return UNRATED_WEIGHT;
  const base =
    m.confidence <= 1
      ? 2.2 // not studied
      : m.confidence <= 2
        ? 1.9 // low
        : m.confidence <= 3
          ? 1.2 // okay
          : m.confidence <= 4
            ? 0.9
            : 0.7; // strong
  const flagged = (m.weakSubtopics?.length ?? 0) > 0 ? 0.3 : 0;
  return base + flagged;
}

/** Max share of weekly hours any single subject may take. */
const MAX_SHARE = 0.34;
/** Min share of weekly hours every subject must keep (full-coverage floor). */
const MIN_SHARE = 0.02;

/**
 * Hours per subject for one week. Guarantees:
 *  - every subject receives a non-zero allocation (floor);
 *  - no subject exceeds MAX_SHARE of the week (cap);
 *  - the total stays equal to hoursPerWeek (renormalised after clamping).
 */
export function allocateWeeklyHours(
  modules: ModuleConfidence[],
  hoursPerWeek: number,
): Array<{ module: ModuleConfidence; hours: number; share: number }> {
  const hpw = Math.max(1, hoursPerWeek);
  const n = Math.max(1, modules.length);
  const cap = Math.max(MAX_SHARE, 1 / n);
  const floor = Math.min(MIN_SHARE, 1 / n);

  const weights = modules.map(subjectWeight);
  const total = weights.reduce((a, b) => a + b, 0) || n;
  const clamped = weights.map((w) =>
    Math.min(cap, Math.max(floor, w / total)),
  );
  const clampedTotal = clamped.reduce((a, b) => a + b, 0) || 1;

  return modules.map((module, i) => {
    const share = clamped[i] / clampedTotal;
    return {
      module,
      share,
      hours: Math.max(0.25, Math.round(share * hpw * 10) / 10),
    };
  });
}

/**
 * Choose which subject each of `slots` week-one study blocks belongs to.
 *
 * Largest-remainder apportionment of the slots by weight, with a per-subject
 * cap so a single low-confidence subject can never occupy the whole week.
 * Subjects are emitted round-robin (weakest first) so week one visibly leads
 * with the user's priority areas while still rotating.
 */
export function buildSubjectRotation(
  modules: ModuleConfidence[],
  slots: number,
): ModuleConfidence[] {
  if (modules.length === 0 || slots <= 0) return [];
  const ordered = [...modules].sort((a, b) => {
    const aRated = isRated(a) ? 0 : 1;
    const bRated = isRated(b) ? 0 : 1;
    if (aRated !== bRated) return aRated - bRated;
    return subjectWeight(b) - subjectWeight(a);
  });

  const perSubjectCap = Math.max(1, Math.ceil(slots * 0.4));
  const weights = ordered.map(subjectWeight);
  const total = weights.reduce((a, b) => a + b, 0) || ordered.length;

  const exact = weights.map((w) => (w / total) * slots);
  const counts = exact.map((v) => Math.min(perSubjectCap, Math.floor(v)));
  let remaining = slots - counts.reduce((a, b) => a + b, 0);

  const byRemainder = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem);
  let guard = 0;
  while (remaining > 0 && guard < slots * 4) {
    let placed = false;
    for (const { i } of byRemainder) {
      if (remaining <= 0) break;
      if (counts[i] < perSubjectCap) {
        counts[i] += 1;
        remaining -= 1;
        placed = true;
      }
    }
    if (!placed) break;
    guard += 1;
  }

  // Round-robin flatten so days alternate subjects instead of blocking them.
  const rotation: ModuleConfidence[] = [];
  const pool = counts.slice();
  while (rotation.length < slots) {
    let progressed = false;
    for (let i = 0; i < ordered.length; i++) {
      if (pool[i] > 0 && rotation.length < slots) {
        rotation.push(ordered[i]);
        pool[i] -= 1;
        progressed = true;
      }
    }
    if (!progressed) break;
  }
  while (rotation.length < slots) {
    rotation.push(ordered[rotation.length % ordered.length]);
  }
  return rotation;
}

/* ---------- Preparation stage (student-facing) ---------- */

export type PreparationStage =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "resitter";

export const PREPARATION_STAGES: Array<{
  value: PreparationStage;
  title: string;
  blurb: string;
}> = [
  {
    value: "beginner",
    title: "I haven't started yet",
    blurb: "Tentra leads with teaching and foundations before exam pressure.",
  },
  {
    value: "intermediate",
    title: "I've covered some of the syllabus",
    blurb: "A balance of learning, recall and steadily increasing practice.",
  },
  {
    value: "advanced",
    title: "I've covered most of it",
    blurb: "Recall and applied questions take the lead over first teaching.",
  },
  {
    value: "resitter",
    title: "I'm resitting",
    blurb: "Question-led from the start, with targeted repair of weak areas.",
  },
];

export const PREPARATION_STAGE_LABELS: Record<PreparationStage, string> = {
  beginner: "Not started yet",
  intermediate: "Covered some of the syllabus",
  advanced: "Covered most of the syllabus",
  resitter: "Resitting",
};

export const PREPARATION_STAGE_EFFECT: Record<PreparationStage, string> = {
  beginner:
    "Learning-first: rule scaffolds and guided application before timed sets.",
  intermediate:
    "Balanced mix of learning, active recall and exam-format questions.",
  advanced:
    "Practice-weighted: recall and timed questions with foundations as repair.",
  resitter:
    "Exam-condition led, with mixed sets and mistake repair from the outset.",
};
