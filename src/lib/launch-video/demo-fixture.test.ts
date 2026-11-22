import { describe, expect, it } from "vitest";
import { SQE_QUESTIONS } from "@/lib/sqe-questions";
import { buildLaunchDemo, DEMO_ANSWERS, DEMO_FOCUS_INDEX, DEMO_MODULE, DEMO_QUESTIONS, DEMO_TODAY } from "./demo-fixture";

describe("launch-video demo fixture", () => {
  it("uses authored bank questions only", () => {
    expect(DEMO_QUESTIONS.length).toBeGreaterThanOrEqual(5);
    for (const q of DEMO_QUESTIONS) {
      expect(SQE_QUESTIONS.some((b) => b.prompt === q.prompt)).toBe(true);
    }
    expect(DEMO_ANSWERS[DEMO_FOCUS_INDEX]).not.toBe(DEMO_QUESTIONS[DEMO_FOCUS_INDEX].correctIndex);
  });

  it("sits below the practice route's graded-performance threshold", () => {
    const d = buildLaunchDemo();
    expect(d.score.scored).toBeGreaterThan(0);
    expect(d.score.accuracy).toBeLessThan(0.7);
  });

  it("recalibrates through the real planner with an explained revision", () => {
    const d = buildLaunchDemo();
    expect(d.revision?.trigger).toBe("graded-performance");
    expect(d.revision?.summary).toContain(DEMO_MODULE);
    expect(d.after.scheduleVersion).toBe(d.before.scheduleVersion + 1);
    expect(d.todayAfter.some((t) => t.module === DEMO_MODULE)).toBe(true);
    expect(d.missedYesterday.length).toBeGreaterThan(0);
    expect(d.after.tasks.every((t) => t.date < DEMO_TODAY || t.status !== "completed")).toBe(true);
  });

  it("is deterministic", () => {
    expect(JSON.stringify(buildLaunchDemo().todayAfter)).toBe(JSON.stringify(buildLaunchDemo().todayAfter));
  });
});
