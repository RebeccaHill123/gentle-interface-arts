/**
 * Smart Review weak-area diagnosis.
 *
 * Turns per-subtopic performance into a differentiated "What to review next"
 * list. The recommendation distinguishes between genuinely different
 * situations instead of giving every topic the same advice:
 *
 * - "relearn"      — recent accuracy is very low: the rule itself isn't understood.
 * - "misapplies"   — the rule is partially known but applied wrongly.
 * - "isolated"     — a strong topic with a recent slip: a quick check suffices.
 * - "repeated"     — the same concept missed across multiple sittings.
 * - "reinforce"    — developing topic that simply needs more graded reps.
 *
 * Pure and browser-safe; no I/O.
 */
import {
  RECENT_WINDOW,
  type SubtopicPerformance,
} from "./performance";

export type DiagnosisKind = "relearn" | "misapplies" | "isolated" | "repeated" | "reinforce";

export interface ReviewRecommendation {
  subject: string;
  subtopic: string;
  kind: DiagnosisKind;
  /** Student-facing explanation of the pattern seen in their data. */
  detail: string;
  /** Concrete next action. */
  action: string;
  /** Suggested follow-up quiz size. */
  suggestedQuestions: number;
  /** Suggested follow-up difficulty for the generator. */
  suggestedDifficulty: "Easy" | "Medium" | "Hard" | "Mixed";
}

function diagnoseOne(s: SubtopicPerformance): ReviewRecommendation | null {
  const recent = s.recentAccuracy;
  const overall = s.accuracy;

  if (s.status === "needs-review") {
    const repeated = s.missDays >= 2;
    if (repeated) {
      return {
        subject: s.subject,
        subtopic: s.subtopic,
        kind: "repeated",
        detail: `Missed across ${s.sittings} separate sittings — this is a repeating pattern, not a one-off.`,
        action: `Book a focused review session on ${s.subtopic}, then re-test with 5 targeted questions.`,
        suggestedQuestions: 5,
        suggestedDifficulty: "Medium",
      };
    }
    if (recent !== null && recent < 40) {
      return {
        subject: s.subject,
        subtopic: s.subtopic,
        kind: "relearn",
        detail: `Recent answers suggest the underlying rule isn't secure yet (${recent}% in the last ${Math.min(RECENT_WINDOW, s.attempted)}).`,
        action: `Relearn the rule for ${s.subtopic} first, then take 5 foundational questions to confirm it.`,
        suggestedQuestions: 5,
        suggestedDifficulty: "Easy",
      };
    }
    return {
      subject: s.subject,
      subtopic: s.subtopic,
      kind: "misapplies",
      detail: `You know parts of this but are applying the rule inconsistently (${recent}% recently).`,
      action: `Complete 5 targeted application questions on ${s.subtopic}, reading each explanation in full.`,
      suggestedQuestions: 5,
      suggestedDifficulty: "Medium",
    };
  }

  if (s.status === "strong" && recent !== null && recent < 100) {
    return {
      subject: s.subject,
      subtopic: s.subtopic,
      kind: "isolated",
      detail: `A single recent slip in an otherwise strong topic (${overall}% overall).`,
      action: `A quick recall check on ${s.subtopic} is enough — no deep review needed.`,
      suggestedQuestions: 5,
      suggestedDifficulty: "Hard",
    };
  }

  if (s.status === "developing" && s.attempted < 5) {
    return {
      subject: s.subject,
      subtopic: s.subtopic,
      kind: "reinforce",
      detail: `Only ${s.attempted} graded answer${s.attempted === 1 ? "" : "s"} so far — too early to judge.`,
      action: `Build evidence with 5 more questions on ${s.subtopic}.`,
      suggestedQuestions: 5,
      suggestedDifficulty: "Mixed",
    };
  }

  return null;
}

/**
 * Ordered recommendations: needs-review patterns first (repeated → relearn →
 * misapplies), then isolated slips, then reinforcement. Never recommends
 * everything — capped and deduplicated.
 */
export function diagnoseWeakAreas(
  subs: SubtopicPerformance[],
  options: { max?: number } = {},
): ReviewRecommendation[] {
  const max = options.max ?? 5;
  const kindRank: Record<DiagnosisKind, number> = {
    repeated: 0,
    relearn: 1,
    misapplies: 2,
    isolated: 3,
    reinforce: 4,
  };
  const recs = subs
    .map(diagnoseOne)
    .filter((r): r is ReviewRecommendation => r !== null)
    .sort((a, b) => kindRank[a.kind] - kindRank[b.kind] || a.subtopic.localeCompare(b.subtopic));
  return recs.slice(0, max);
}

/** One-line headline for the weakest area, used on the dashboard card. */
export function weakestAreaHeadline(subs: SubtopicPerformance[]): string | null {
  const worst = subs.find((s) => s.status === "needs-review");
  if (worst) return `${worst.subtopic} (${worst.subject}) needs review`;
  const developing = subs.find((s) => s.status === "developing");
  if (developing) return `${developing.subtopic} (${developing.subject}) is still developing`;
  return null;
}
