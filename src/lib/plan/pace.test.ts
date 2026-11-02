import { describe, expect, it } from "vitest";
import { computePace } from "./pace";

describe("computePace", () => {
  it("is on track with no missed sessions and target met", () => {
    expect(computePace({ missedCount: 0, weeklyDoneMins: 600, weeklyTargetMins: 600 }).status).toBe("on-track");
  });
  it("is slightly behind with 1 missed session", () => {
    expect(computePace({ missedCount: 1, weeklyDoneMins: 600, weeklyTargetMins: 600 }).status).toBe("slightly-behind");
  });
  it("is behind with 3 missed sessions", () => {
    expect(computePace({ missedCount: 3, weeklyDoneMins: 600, weeklyTargetMins: 600 }).status).toBe("behind");
  });
  it("is slightly behind below 75% of the weekly target", () => {
    expect(computePace({ missedCount: 0, weeklyDoneMins: 440, weeklyTargetMins: 600 }).status).toBe("slightly-behind");
    expect(computePace({ missedCount: 0, weeklyDoneMins: 450, weeklyTargetMins: 600 }).status).toBe("on-track");
  });
});
