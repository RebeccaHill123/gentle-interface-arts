import { describe, expect, it } from "vitest";
import {
  creditedMinutes,
  dayTotals,
  greetingFor,
  shouldCompletePlannedTask,
  taskState,
} from "./today";
import { creditPartialProgress, setTaskStatus } from "./recalibrate";
import type { PlanSchedule, ScheduledTask } from "./types";

function task(over: Partial<ScheduledTask> = {}): ScheduledTask {
  return {
    id: "t1",
    date: "2026-01-10",
    module: "Contract law",
    title: "Offer and acceptance",
    minutes: 60,
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

function schedule(tasks: ScheduledTask[]): PlanSchedule {
  return {
    version: 2,
    planId: "p1",
    scheduleVersion: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    lastRecalibratedAt: "2026-01-01T00:00:00.000Z",
    examDate: "2026-06-01",
    hoursPerWeek: 10,
    horizonDays: 30,
    tasks,
    evidenceSignature: "sig",
    revisions: [],
  } as PlanSchedule;
}

describe("today totals", () => {
  it("counts planned minutes and only credited minutes", () => {
    const totals = dayTotals([
      task({ id: "a", status: "completed", actualMinutes: 50 }),
      task({ id: "b", partialMinutes: 20 }),
      task({ id: "c" }),
    ]);
    expect(totals.plannedMinutes).toBe(180);
    expect(totals.doneMinutes).toBe(70);
    expect(totals.completedCount).toBe(1);
    expect(totals.openCount).toBe(2);
    expect(totals.allSettled).toBe(false);
    expect(totals.percent).toBe(39);
  });

  it("treats an empty day as zero, never NaN", () => {
    const totals = dayTotals([]);
    expect(totals.percent).toBe(0);
    expect(totals.allSettled).toBe(false);
  });

  it("is settled when every task is completed or skipped", () => {
    const totals = dayTotals([
      task({ id: "a", status: "completed" }),
      task({ id: "b", status: "skipped" }),
    ]);
    expect(totals.allSettled).toBe(true);
    expect(totals.skippedCount).toBe(1);
  });

  it("derives display status including in progress", () => {
    expect(taskState(task())).toBe("not-started");
    expect(taskState(task({ partialMinutes: 10 }))).toBe("in-progress");
    expect(taskState(task({ status: "completed" }))).toBe("completed");
    expect(taskState(task({ status: "skipped" }))).toBe("skipped");
  });

  it("credits planned minutes for a completed task with no recorded time", () => {
    expect(creditedMinutes(task({ status: "completed" }))).toBe(60);
  });
});

describe("partial completion rules", () => {
  it("never completes a long task from a short session alone", () => {
    expect(
      shouldCompletePlannedTask({
        plannedMinutes: 60,
        actualMinutes: 10,
        confirmedComplete: false,
      }),
    ).toBe(false);
  });

  it("completes when the student confirms the output is done", () => {
    expect(
      shouldCompletePlannedTask({ plannedMinutes: 60, actualMinutes: 10, confirmedComplete: true }),
    ).toBe(true);
  });

  it("completes when the planned time was genuinely worked", () => {
    expect(
      shouldCompletePlannedTask({
        plannedMinutes: 60,
        actualMinutes: 45,
        previousPartialMinutes: 20,
        confirmedComplete: false,
      }),
    ).toBe(true);
  });
});

describe("partial credit on the schedule", () => {
  it("accumulates partial minutes and marks it in progress", () => {
    let s = schedule([task()]);
    s = creditPartialProgress(s, "t1", 20, { sessionId: "s1" });
    s = creditPartialProgress(s, "t1", 15, { sessionId: "s2" });
    expect(s.tasks[0].partialMinutes).toBe(35);
    expect(taskState(s.tasks[0])).toBe("in-progress");
    expect(s.tasks[0].lastWorkedAt).toBeTruthy();
  });

  it("is idempotent for a replayed session id", () => {
    let s = schedule([task()]);
    s = creditPartialProgress(s, "t1", 20, { sessionId: "s1" });
    s = creditPartialProgress(s, "t1", 20, { sessionId: "s1" });
    expect(s.tasks[0].partialMinutes).toBe(20);
  });

  it("folds partial minutes into the total when completed", () => {
    let s = schedule([task()]);
    s = creditPartialProgress(s, "t1", 20, { sessionId: "s1" });
    s = setTaskStatus(s, "t1", "completed", { actualMinutes: 40, sessionId: "s2" });
    expect(s.tasks[0].actualMinutes).toBe(60);
    expect(s.tasks[0].partialMinutes).toBeUndefined();
    expect(creditedMinutes(s.tasks[0])).toBe(60);
  });

  it("does not credit a task that is no longer open", () => {
    let s = schedule([task({ status: "completed", actualMinutes: 60 })]);
    s = creditPartialProgress(s, "t1", 20, { sessionId: "s1" });
    expect(s.tasks[0].partialMinutes).toBeUndefined();
  });
});

describe("greeting", () => {
  it("uses the first name only", () => {
    expect(greetingFor("Rebecca Hill", new Date("2026-01-10T09:00:00"))).toBe(
      "Good morning, Rebecca",
    );
  });
  it("works with no name", () => {
    expect(greetingFor(undefined, new Date("2026-01-10T20:00:00"))).toBe("Good evening");
  });
});
