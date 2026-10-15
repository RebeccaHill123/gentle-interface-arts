import { describe, expect, it } from "vitest";
import { stripRetiredUbeSubjects } from "./retired-subjects";
import { getSubjectsForUbePath } from "@/lib/ube-syllabus";
import type { StoredPlan } from "@/lib/plan-store";

const plan = (examType: string): StoredPlan =>
  ({
    input: {
      examType,
      examPath: examType === "UBE" ? "UBE_FULL" : "SQE1_FULL",
      modules: [{ name: "Conflict of Laws" }, { name: "Torts" }, { name: "Trusts" }],
    },
    plan: {
      overview: "",
      todayTasks: [
        { title: "a", module: "Conflict of Laws", minutes: 30 },
        { title: "b", module: "Torts", minutes: 30 },
      ],
      weeklyFocus: [],
      masteryTargets: [],
    },
    schedule: {
      tasks: [
        { module: "Family Law", status: "pending" },
        { module: "Secured Transactions (UCC Art. 9)", status: "done" },
        { module: "Torts", status: "pending" },
      ],
    },
    daysUntilExam: 1,
    generatedAt: "",
    completedTaskIds: [],
  }) as unknown as StoredPlan;

describe("retired UBE subjects (NCBE, July 2026+)", () => {
  it("are no longer in the UBE syllabus", () => {
    const names = getSubjectsForUbePath("UBE_FULL").map((s) => s.name).join("|");
    for (const s of ["Conflict of Laws", "Family Law", "Trusts & Estates", "Secured Transactions"]) {
      expect(names).not.toContain(s);
    }
  });

  it("drop from a saved bar plan's future tasks but keep completed ones", () => {
    const out = stripRetiredUbeSubjects(plan("UBE"));
    expect(out.plan.todayTasks.map((t) => t.module)).toEqual(["Torts"]);
    expect(out.input.modules.map((m) => m.name)).toEqual(["Torts", "Trusts"]);
    const tasks = (out.schedule as { tasks: { module: string }[] }).tasks.map((t) => t.module);
    expect(tasks).toEqual(["Secured Transactions (UCC Art. 9)", "Torts"]);
  });

  it("leave SQE plans untouched", () => {
    const p = plan("SQE1");
    expect(stripRetiredUbeSubjects(p)).toBe(p);
  });
});
