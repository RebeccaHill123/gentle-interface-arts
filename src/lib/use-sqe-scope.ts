// Client-side read of the student's SQE1 assessment scope.
//
// The profile is the durable record, but every screen needs a synchronous
// answer to "which subjects belong to this student?". The stored plan carries
// the same answer (`input.sqeAssessment`, or an FLK1/FLK2 path), so UI scoping
// reads from there while the dashboard keeps profile and plan in step.
import { useMemo } from "react";
import { loadPlan } from "@/lib/plan-store";
import { planAssessment, planIsSqe1, type SqeAssessment } from "@/lib/exam-scope";

export interface SqeScope {
  isSqe1: boolean;
  /** null when this isn't an SQE1 plan, or the student hasn't answered yet. */
  assessment: SqeAssessment | null;
  /** Papers to show; empty when not applicable. */
  papers: ("FLK1" | "FLK2")[];
}

/** Non-hook read, for plain helpers outside React render. */
export function sqeScopeNow(): SqeScope {
  {
    const plan = loadPlan();
    const isSqe1 = planIsSqe1(plan);
    const assessment = planAssessment(plan);
    const papers: ("FLK1" | "FLK2")[] = !isSqe1
      ? []
      : assessment === "FLK1"
        ? ["FLK1"]
        : assessment === "FLK2"
          ? ["FLK2"]
          : ["FLK1", "FLK2"];
    return { isSqe1, assessment, papers };
  }
}

export function useSqeScope(): SqeScope {
  return useMemo(() => sqeScopeNow(), []);
}

/** True when a deck/card tagged with an FLK paper belongs in scope. */
export function paperInScope(flk: string, scope: SqeScope = sqeScopeNow()): boolean {
  if (!scope.isSqe1 || scope.papers.length === 0) return true;
  if (flk !== "FLK1" && flk !== "FLK2") return true;
  return scope.papers.includes(flk);
}
