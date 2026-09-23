// Route-aware display helpers. `examId` in topic-map.ts stays SQE1|UBE for
// internal syllabus lookup; UI-facing labels live here so we can show
// "SQE", "UBE", "MPRE" or "ACCA" without leaking versioned identifiers.
import type { ExamPath, ExamType } from "@/lib/plan-store";
import { isUbePath, isMprePath, isAccaPath } from "@/lib/exam-paths";

export type ExamLabel = "SQE" | "UBE" | "MPRE" | "ACCA";

export function getExamLabel(
  examType?: string | null,
  examPath?: ExamPath | null,
): ExamLabel {
  if (examPath) {
    if (isUbePath(examPath)) return "UBE";
    if (isMprePath(examPath)) return "MPRE";
    if (isAccaPath(examPath)) return "ACCA";
    return "SQE";
  }
  if (examType === "UBE") return "UBE";
  if (examType === "MPRE") return "MPRE";
  if (examType === "ACCA") return "ACCA";
  return "SQE";
}

/** Human string for the exam route ("SQE1 & SQE2" / "UBE" / "MPRE" / "ACCA"). */
export function getExamRouteName(examType?: string | null, examPath?: ExamPath | null): string {
  const label = getExamLabel(examType, examPath);
  if (label === "SQE") return "SQE";
  return label;
}

/** True when the route uses component tags worth surfacing (FLK1/FLK2, MBE/MEE/MPT, paper codes). */
export function routeUsesComponentTags(label: ExamLabel): boolean {
  return label === "SQE" || label === "UBE" || label === "ACCA";
}

export function typeFromLabel(label: ExamLabel): ExamType {
  if (label === "UBE") return "UBE";
  if (label === "MPRE") return "MPRE";
  if (label === "ACCA") return "ACCA";
  return "SQE1";
}
