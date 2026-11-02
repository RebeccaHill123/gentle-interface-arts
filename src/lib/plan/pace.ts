// Schedule pace for the Today header: on track vs slightly behind.
// Uses only schedule facts — open sessions from earlier days and the rolling
// 7-day minutes against the weekly target.
export type PaceStatus = "on-track" | "slightly-behind" | "behind";

export interface PaceResult {
  status: PaceStatus;
  label: string;
  detail: string;
}

/** Below this share of the weekly target, the student is slightly behind. */
export const PACE_WEEKLY_THRESHOLD = 0.75;

export function computePace(input: {
  missedCount: number;
  weeklyDoneMins: number;
  weeklyTargetMins: number;
}): PaceResult {
  const { missedCount, weeklyDoneMins, weeklyTargetMins } = input;
  const share = weeklyTargetMins > 0 ? weeklyDoneMins / weeklyTargetMins : 1;
  const shortMins = Math.max(0, Math.round(weeklyTargetMins - weeklyDoneMins));

  if (missedCount >= 3) {
    return {
      status: "behind",
      label: "Behind schedule",
      detail: `${missedCount} sessions from earlier days are still open.`,
    };
  }
  if (missedCount > 0) {
    return {
      status: "slightly-behind",
      label: "Slightly behind",
      detail: `${missedCount} session${missedCount === 1 ? "" : "s"} from earlier days still open.`,
    };
  }
  if (share < PACE_WEEKLY_THRESHOLD) {
    return {
      status: "slightly-behind",
      label: "Slightly behind",
      detail: `${shortMins} min short of your weekly target.`,
    };
  }
  return { status: "on-track", label: "On track", detail: "You're keeping pace with your plan." };
}
