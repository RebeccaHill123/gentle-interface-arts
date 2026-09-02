// Regression tests for the runaway-recalibration / duplicate-task bug.
import { describe, expect, it } from "vitest";
import type { OnboardingInput } from "@/lib/plan-store";
import { createSchedule, mergeSchedules, recalibrate, setTaskStatus } from "./recalibrate";
import { dedupeTasksById, repairSchedule } from "./repair";
import { computeWeeklyReview } from "@/components/weekly-review";
import type { PlanEvidence, PlanSchedule, ScheduledTask, SubjectEvidence } from "./types";

const TODAY = "2026-03-02";
const LATER = "2026-03-09";

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
  return { accuracy: null, gradedAttempts: 0, minutes: 60, recencyDays: 1, rated: false, ...partial };
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

const base = createSchedule({
  schedule: null,
  input,
  evidence: evidence(),
  trigger: "initial",
  planId: "p1",
  now: `${TODAY}T08:00:00.000Z`,
});

function ids(schedule: PlanSchedule): string[] {
  return schedule.tasks.map((t) => t.id);
}

describe("missed-work recalibration", () => {
  const res = recalibrate({
    schedule: base,
    input,
    evidence: evidence({ today: LATER }),
    trigger: "missed-work",
    now: `${LATER}T08:00:00.000Z`,
  });

  it("produces unique task ids", () => {
    expect(new Set(ids(res.schedule)).size).toBe(res.schedule.tasks.length);
  });

  it("leaves no past task eligible for immediate reprocessing", () => {
    const stillOpenInPast = res.schedule.tasks.filter(
      (t) => t.status === "scheduled" && t.date < LATER,
    );
    expect(stillOpenInPast).toHaveLength(0);
  });

  it("gives carried-forward work a new id with provenance", () => {
    const carried = res.schedule.tasks.filter((t) => t.movedFrom && t.status === "scheduled");
    expect(carried.length).toBeGreaterThan(0);
    for (const t of carried) {
      expect(t.date >= LATER).toBe(true);
      expect(base.tasks.some((b) => b.id === t.id)).toBe(false);
      expect(t.movedFrom).toBeTruthy();
    }
  });

  it("is a no-op when rerun with identical evidence and date", () => {
    const again = recalibrate({
      schedule: res.schedule,
      input,
      evidence: evidence({ today: LATER }),
      trigger: "missed-work",
      now: `${LATER}T09:00:00.000Z`,
    });
    expect(again.changed).toBe(false);
    expect(again.revision).toBeNull();
    expect(again.schedule.scheduleVersion).toBe(res.schedule.scheduleVersion);
    expect(again.schedule).toBe(res.schedule);
  });
});

describe("repairing an already-corrupted schedule", () => {
  /** Reproduce the shipped corruption: past scheduled copy + repeated skipped copies. */
  function corrupt(): PlanSchedule {
    const past = base.tasks.find((t) => t.date === TODAY)!;
    const dupes: ScheduledTask[] = [];
    for (let v = 3; v <= 234; v++) {
      dupes.push({ ...past, status: "skipped", createdInVersion: past.createdInVersion });
    }
    return { ...base, scheduleVersion: 234, tasks: [...base.tasks, ...dupes] };
  }

  it("removes duplicate ids deterministically", () => {
    const a = repairSchedule(corrupt(), LATER);
    const b = repairSchedule(corrupt(), LATER);
    expect(a.changed).toBe(true);
    expect(a.removed).toBe(232);
    expect(new Set(ids(a.schedule)).size).toBe(a.schedule.tasks.length);
    expect(ids(a.schedule)).toEqual(ids(b.schedule));
    expect(a.schedule.scheduleVersion).toBe(234);
  });

  it("is idempotent and reports no change on a clean schedule", () => {
    const once = repairSchedule(corrupt(), LATER).schedule;
    const twice = repairSchedule(once, LATER);
    expect(twice.changed).toBe(false);
    expect(twice.schedule).toBe(once);
  });

  it("preserves completed outcomes and recorded evidence", () => {
    const done = setTaskStatus(base, base.tasks[0].id, "completed", {
      actualMinutes: 47,
      sessionId: "sess-1",
    });
    const withDupes: PlanSchedule = {
      ...done,
      tasks: [
        ...done.tasks,
        { ...base.tasks[0], status: "skipped" },
        { ...base.tasks[0], status: "scheduled" },
      ],
    };
    const repaired = repairSchedule(withDupes, LATER).schedule;
    const kept = repaired.tasks.filter((t) => t.id === base.tasks[0].id);
    expect(kept).toHaveLength(1);
    expect(kept[0].status).toBe("completed");
    expect(kept[0].actualMinutes).toBe(47);
    expect(kept[0].sessionId).toBe("sess-1");
  });

  it("keeps the active future moved copy over past skipped copies", () => {
    const original = base.tasks[0];
    const futureCopy: ScheduledTask = {
      ...original,
      date: "2026-03-11",
      status: "scheduled",
      movedFrom: original.date,
    };
    const repaired = dedupeTasksById(
      [{ ...original, status: "skipped" }, { ...original, status: "skipped" }, futureCopy],
      LATER,
    );
    expect(repaired).toHaveLength(1);
    expect(repaired[0].status).toBe("scheduled");
    expect(repaired[0].date).toBe("2026-03-11");
    expect(repaired[0].movedFrom).toBe(original.date);
  });

  it("keeps legitimately distinct historical sessions", () => {
    const distinct = dedupeTasksById(base.tasks, LATER);
    expect(distinct).toHaveLength(base.tasks.length);
  });
});

describe("merge safety", () => {
  it("returns unique ids and does not reintroduce duplicates", () => {
    const local = setTaskStatus(base, base.tasks[0].id, "completed");
    const remote: PlanSchedule = {
      ...base,
      scheduleVersion: base.scheduleVersion + 1,
      tasks: [...base.tasks, { ...base.tasks[0], status: "skipped" }],
    };
    const merged = mergeSchedules(remote, local);
    expect(new Set(ids(merged)).size).toBe(merged.tasks.length);
    expect(merged.tasks.filter((t) => t.id === base.tasks[0].id)).toHaveLength(1);
  });

  it("keeps the active future moved copy when the remote copy is still dirty", () => {
    const original = base.tasks[0];
    const futureCopy: ScheduledTask = {
      ...original,
      date: "2026-03-11",
      status: "scheduled",
      movedFrom: original.date,
    };
    const dirtyRemote: PlanSchedule = {
      ...base,
      scheduleVersion: base.scheduleVersion + 3,
      tasks: [
        { ...original, status: "skipped" },
        { ...original, status: "skipped" },
        ...base.tasks.slice(1),
        futureCopy,
      ],
    };
    const cleanLocal: PlanSchedule = {
      ...base,
      tasks: [...base.tasks.slice(1), futureCopy],
    };
    const merged = mergeSchedules(dirtyRemote, cleanLocal, LATER);
    const kept = merged.tasks.filter((t) => t.id === original.id);
    expect(kept).toHaveLength(1);
    expect(kept[0].status).toBe("scheduled");
    expect(kept[0].date).toBe("2026-03-11");
    expect(kept[0].movedFrom).toBe(original.date);
    expect(new Set(ids(merged)).size).toBe(merged.tasks.length);
  });

  it("prefers a completed copy over an active future moved duplicate", () => {
    const original = base.tasks[0];
    const futureCopy: ScheduledTask = {
      ...original,
      date: "2026-03-11",
      status: "scheduled",
      movedFrom: original.date,
    };
    const remote: PlanSchedule = {
      ...base,
      scheduleVersion: base.scheduleVersion + 1,
      tasks: [...base.tasks.slice(1), futureCopy],
    };
    const local = setTaskStatus(base, original.id, "completed", { actualMinutes: 40 });
    const merged = mergeSchedules(remote, local, LATER);
    const kept = merged.tasks.filter((t) => t.id === original.id);
    expect(kept).toHaveLength(1);
    expect(kept[0].status).toBe("completed");
    expect(kept[0].actualMinutes).toBe(40);
  });

  it("keeps a genuine skip over a stale ordinary scheduled copy", () => {
    const original = base.tasks[0];
    const remote: PlanSchedule = {
      ...base,
      scheduleVersion: base.scheduleVersion + 1,
      tasks: base.tasks,
    };
    const local = setTaskStatus(base, original.id, "skipped", { skipReason: "no-time" });
    const merged = mergeSchedules(remote, local, TODAY);
    const kept = merged.tasks.filter((t) => t.id === original.id);
    expect(kept).toHaveLength(1);
    expect(kept[0].status).toBe("skipped");
  });

  it("merge then repair again is a no-op", () => {
    const original = base.tasks[0];
    const futureCopy: ScheduledTask = {
      ...original,
      date: "2026-03-11",
      status: "scheduled",
      movedFrom: original.date,
    };
    const dirtyRemote: PlanSchedule = {
      ...base,
      scheduleVersion: base.scheduleVersion + 2,
      tasks: [{ ...original, status: "skipped" }, ...base.tasks.slice(1), futureCopy],
    };
    const merged = mergeSchedules(dirtyRemote, base, LATER);
    const again = repairSchedule(merged, LATER);
    expect(again.changed).toBe(false);
    expect(JSON.stringify(mergeSchedules(merged, merged, LATER).tasks)).toBe(
      JSON.stringify(merged.tasks),
    );
  });
});

describe("weekly review", () => {
  it("does not double-count duplicate task ids", () => {
    const task = base.tasks.find((t) => t.date === TODAY)!;
    const clean = computeWeeklyReview([task], TODAY, TODAY);
    const dupes = Array.from({ length: 200 }, () => ({ ...task }));
    const corrupted = computeWeeklyReview(dupes, TODAY, TODAY);
    expect(corrupted.plannedMinutes).toBe(clean.plannedMinutes);
    expect(corrupted.plannedCount).toBe(1);
    expect(corrupted.skippedCount).toBe(0);
  });
});
