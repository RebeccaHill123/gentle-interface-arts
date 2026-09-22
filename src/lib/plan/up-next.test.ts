import { describe, expect, it } from "vitest";
import { pickUpNext } from "./up-next";
import type { ScheduledTask } from "./types";
import type { AnalyticsBundle } from "@/lib/analytics-derive";

function task(over: Partial<ScheduledTask> = {}): ScheduledTask {
  return {
    id: "t1",
    date: "2026-01-10",
    module: "Contract law",
    title: "Offer and acceptance",
    minutes: 45,
    taskType: "concept-deepdive",
    difficulty: "core",
    bucket: "must",
    priority: "medium",
    why: "",
    status: "scheduled",
    createdInVersion: 1,
    ...over,
  };
}

function analyticsWith(
  perSubject: { subject: string; attempted: number; accuracy: number }[],
): AnalyticsBundle {
  return { graded: { perSubject } } as unknown as AnalyticsBundle;
}

describe("pickUpNext", () => {
  it("returns null with nothing to do", () => {
    expect(pickUpNext([], [], [])).toBeNull();
  });

  it("prefers today's open work", () => {
    const res = pickUpNext([task({ id: "a" })], [task({ id: "m", date: "2026-01-08" })], []);
    expect(res?.task.id).toBe("a");
    expect(res?.rule).toBe("today");
    expect(res?.reason).toBe("Scheduled for today");
  });

  it("finishes part-worked work before starting something new", () => {
    const res = pickUpNext([task({ id: "a" }), task({ id: "b", partialMinutes: 15 })], [], []);
    expect(res?.task.id).toBe("b");
    expect(res?.reason).toBe("Part-finished today");
  });

  it("uses graded performance only when the sample is real", () => {
    const tasks = [task({ id: "a" }), task({ id: "b", module: "Tort law" })];
    const thin = pickUpNext(tasks, [], [], analyticsWith([
      { subject: "Tort law", attempted: 2, accuracy: 20 },
    ]));
    expect(thin?.task.id).toBe("a");
    expect(thin?.rule).toBe("today");

    const solid = pickUpNext(tasks, [], [], analyticsWith([
      { subject: "Tort law", attempted: 20, accuracy: 41 },
    ]));
    expect(solid?.task.id).toBe("b");
    expect(solid?.rule).toBe("weak-topic");
    expect(solid?.reason).toBe("Based on your recent performance");
  });

  it("falls back to a heavily tested topic with no performance data", () => {
    const res = pickUpNext([task({ id: "a" }), task({ id: "b", priority: "high" })], [], []);
    expect(res?.task.id).toBe("b");
    expect(res?.reason).toBe("Heavily tested topic");
  });

  it("picks up overdue work once today is clear", () => {
    const res = pickUpNext(
      [task({ id: "a", status: "completed" })],
      [task({ id: "m", date: "2026-01-08" })],
      [task({ id: "u", date: "2026-01-12" })],
    );
    expect(res?.task.id).toBe("m");
    expect(res?.rule).toBe("overdue");
    expect(res?.reason).toMatch(/^Overdue from /);
  });

  it("falls through to the next task in the plan", () => {
    const res = pickUpNext([], [], [task({ id: "u", date: "2026-01-12" })]);
    expect(res?.task.id).toBe("u");
    expect(res?.rule).toBe("next-in-plan");
    expect(res?.reason).toBe("Next in your plan");
  });

  it("never recommends a skipped or completed task", () => {
    const res = pickUpNext(
      [task({ id: "a", status: "skipped" }), task({ id: "b", status: "completed" })],
      [],
      [],
    );
    expect(res).toBeNull();
  });
});
