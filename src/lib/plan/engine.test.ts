// Deterministic fixtures for the adaptive planning engine.
import { describe, expect, it } from "vitest";
import type { OnboardingInput } from "@/lib/plan-store";
import { createSchedule, moveTask, recalibrate, mergeSchedules, setTaskStatus } from "./recalibrate";
import { prioritiseSubjects } from "./priority";
import { MAX_DAY_MINUTES } from "./schedule";
import type { PlanEvidence, SubjectEvidence } from "./types";

const TODAY = "2026-03-02";

const input: OnboardingInput = {
  name: "Test",
  examType: "SQE1",
  examPath: "SQE1_FULL",
  intensity: "intermediate",
  examDate: "2026-07-01",
  hoursPerWeek: 10,
  modules: [
    { id: "contract", name: "Contract", confidence: 3, rated: true },
    { id: "tort", name: "Tort", confidence: 3, rated: true },
    { id: "land", name: "Land Law", confidence: 2, rated: true },
    { id: "trusts", name: "Trusts", confidence: 4, rated: true },
  ],
};

function subject(partial: Partial<SubjectEvidence> & { module: string }): SubjectEvidence {
  return {
    accuracy: null,
    gradedAttempts: 0,
    minutes: 60,
    recencyDays: 1,
    rated: false,
    ...partial,
  };
}

function evidence(overrides: Partial<PlanEvidence> = {}): PlanEvidence {
  return {
    today: TODAY,
    hasMistakeEvidence: false,
    daysSinceLastActivity: 1,
    subjects: [
      subject({ module: "Contract" }),
      subject({ module: "Tort" }),
      subject({ module: "Land Law" }),
      subject({ module: "Trusts" }),
    ],
    ...overrides,
  };
}

describe("priority model", () => {
  it("ranks low graded accuracy above a self-rated-low subject", () => {
    const ranked = prioritiseSubjects(
      evidence({
        subjects: [
          subject({ module: "Contract", accuracy: 44, gradedAttempts: 20 }),
          subject({ module: "Tort", rated: true, confidence: 1 }),
        ],
      }),
    );
    expect(ranked[0].module).toBe("Contract");
    expect(ranked[0].evidence).toBe("low-graded-accuracy");
  });

  it("ignores small graded samples", () => {
    const ranked = prioritiseSubjects(
      evidence({
        subjects: [subject({ module: "Contract", accuracy: 20, gradedAttempts: 2 })],
      }),
    );
    expect(ranked[0].evidence).not.toBe("low-graded-accuracy");
  });

  it("flags a never-studied subject as no-coverage", () => {
    const ranked = prioritiseSubjects(
      evidence({
        subjects: [subject({ module: "Trusts", minutes: 0, recencyDays: null })],
      }),
    );
    expect(ranked[0].evidence).toBe("no-coverage");
  });
});

describe("scheduling and capacity", () => {
  it("never exceeds the daily capacity ceiling", () => {
    const schedule = createSchedule({
      schedule: null,
      input: { ...input, hoursPerWeek: 40 },
      evidence: evidence(),
      trigger: "initial",
      planId: "p1",
      now: `${TODAY}T08:00:00.000Z`,
    });
    const byDay = new Map<string, number>();
    for (const t of schedule.tasks) {
      byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.minutes);
    }
    for (const minutes of byDay.values()) expect(minutes).toBeLessThanOrEqual(MAX_DAY_MINUTES);
  });

  it("covers every subject over the horizon", () => {
    const schedule = createSchedule({
      schedule: null,
      input,
      evidence: evidence(),
      trigger: "initial",
      planId: "p1",
    });
    const modules = new Set(schedule.tasks.map((t) => t.module));
    for (const m of input.modules) expect(modules.has(m.name)).toBe(true);
  });

  it("is deterministic for identical inputs", () => {
    const args = { schedule: null, input, evidence: evidence(), trigger: "initial" as const, planId: "p1" };
    const a = createSchedule(args);
    const b = createSchedule(args);
    expect(a.tasks.map((t) => `${t.date}|${t.module}|${t.minutes}`)).toEqual(
      b.tasks.map((t) => `${t.date}|${t.module}|${t.minutes}`),
    );
  });
});

describe("recalibration", () => {
  const base = createSchedule({
    schedule: null,
    input,
    evidence: evidence(),
    trigger: "initial",
    planId: "p1",
  });

  it("is a no-op when nothing changed", () => {
    const res = recalibrate({
      schedule: base,
      input,
      evidence: evidence(),
      trigger: "completion",
    });
    expect(res.changed).toBe(false);
    expect(res.schedule.scheduleVersion).toBe(base.scheduleVersion);
  });

  it("preserves history and only rebuilds the future", () => {
    const completedId = base.tasks[0].id;
    const withHistory = setTaskStatus(base, completedId, "completed");
    const res = recalibrate({
      schedule: withHistory,
      input,
      evidence: evidence({
        subjects: [
          subject({ module: "Contract", accuracy: 41, gradedAttempts: 30 }),
          subject({ module: "Tort" }),
          subject({ module: "Land Law" }),
          subject({ module: "Trusts" }),
        ],
      }),
      trigger: "graded-performance",
    });
    expect(res.changed).toBe(true);
    const kept = res.schedule.tasks.find((t) => t.id === completedId);
    expect(kept?.status).toBe("completed");
    expect(res.schedule.scheduleVersion).toBe(withHistory.scheduleVersion + 1);
    const contractAhead = res.schedule.tasks.filter(
      (t) => t.status === "scheduled" && t.module === "Contract",
    ).length;
    const before = withHistory.tasks.filter(
      (t) => t.status === "scheduled" && t.module === "Contract",
    ).length;
    expect(contractAhead).toBeGreaterThan(0);
    expect(res.revision?.summary).toContain("Contract");
    expect(contractAhead).toBeGreaterThanOrEqual(Math.min(1, before));
  });

  it("carries missed must-do work forward and records the move", () => {
    const later = "2026-03-06";
    const res = recalibrate({
      schedule: base,
      input,
      evidence: evidence({ today: later }),
      trigger: "missed-work",
    });
    const moves = res.revision?.changes.filter((c) => c.kind === "moved") ?? [];
    expect(moves.length).toBeGreaterThan(0);
    const carried = res.schedule.tasks.filter((t) => t.movedFrom);
    expect(carried.every((t) => t.date >= later)).toBe(true);
  });

  it("rebuilds when availability changes and explains the capacity change", () => {
    const res = recalibrate({
      schedule: base,
      input: { ...input, hoursPerWeek: 4 },
      evidence: evidence(),
      trigger: "completion",
    });
    expect(res.changed).toBe(true);
    expect(res.schedule.hoursPerWeek).toBe(4);
    expect(res.revision?.changes.some((c) => c.kind === "capacity")).toBe(true);
  });
});

describe("student edits and merges", () => {
  const base = createSchedule({
    schedule: null,
    input,
    evidence: evidence(),
    trigger: "initial",
    planId: "p1",
  });

  it("refuses a reschedule that would overload a day", () => {
    const target = base.tasks[0].date;
    const overloaded = {
      ...base,
      tasks: base.tasks.map((t) => (t.date === target ? { ...t, minutes: MAX_DAY_MINUTES } : t)),
    };
    const moved = moveTask(overloaded, overloaded.tasks[overloaded.tasks.length - 1].id, target);
    expect(moved.ok).toBe(false);
  });

  it("merges cross-device outcomes without losing history", () => {
    const localDone = setTaskStatus(base, base.tasks[0].id, "completed");
    const remoteSkipped = setTaskStatus(
      { ...base, scheduleVersion: base.scheduleVersion + 1 },
      base.tasks[1].id,
      "skipped",
    );
    const merged = mergeSchedules(remoteSkipped, localDone);
    expect(merged.tasks.find((t) => t.id === base.tasks[0].id)?.status).toBe("completed");
    expect(merged.tasks.find((t) => t.id === base.tasks[1].id)?.status).toBe("skipped");
  });
});
