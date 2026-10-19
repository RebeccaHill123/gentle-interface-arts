import { describe, expect, it } from "vitest";
import {
  BLOCK_PRICE_ID,
  MONTHLY_PRICE_ID,
  TRIAL_DAYS,
  blockAccessEnd,
} from "@/lib/founding";

describe("pricing rules", () => {
  it("new members get the £12.99 monthly price and the 4-month block", () => {
    expect(MONTHLY_PRICE_ID).toBe("tentra_monthly");
    expect(BLOCK_PRICE_ID).toBe("tentra_4_month_block");
  });

  it("monthly plan has a 7-day free trial", () => {
    expect(TRIAL_DAYS).toBe(7);
  });

  it("4-month block gives exactly 4 months of access", () => {
    const end = blockAccessEnd(new Date("2026-10-19T12:00:00Z"));
    expect(end.toISOString()).toBe("2027-02-19T12:00:00.000Z");
  });
});
