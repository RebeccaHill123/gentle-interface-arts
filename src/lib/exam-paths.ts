// Exam-aware helpers that bridge the SQE and UBE syllabuses.
import type { ExamPath, ExamType } from "@/lib/plan-store";
import {
  getSubjectByName as getSqeSubjectByName,
  getSubjectsForPath as getSqeSubjectsForPath,
  type ExamPath as SqeExamPath,
} from "@/lib/sqe-syllabus";
import {
  getUbeSubjectByName,
  getSubjectsForUbePath,
  type UBEExamPath,
} from "@/lib/ube-syllabus";

const SQE_PATHS: ExamPath[] = ["SQE1_FULL", "FLK1", "FLK2", "SQE2", "CUSTOM"];
const UBE_PATHS: ExamPath[] = ["UBE_FULL", "UBE_MBE", "UBE_ESSAYS", "UBE_MPT"];

export function isUbePath(path: ExamPath): boolean {
  return UBE_PATHS.includes(path);
}

export function defaultPathForExam(examType: ExamType): ExamPath {
  if (examType === "UBE") return "UBE_FULL";
  if (examType === "SQE2") return "SQE2";
  return "SQE1_FULL";
}

export function pathToExamType(path: ExamPath): ExamType {
  if (isUbePath(path)) return "UBE";
  return path === "SQE2" ? "SQE2" : "SQE1";
}

/**
 * Subject list (with optional component/paper tag) for a given exam path.
 * Falls back to SQE1 if an unknown path is passed.
 */
export function getSubjectsForExamPath(
  path: ExamPath,
): { name: string; component?: string }[] {
  if (isUbePath(path)) {
    return getSubjectsForUbePath(path as UBEExamPath).map((s) => ({
      name: s.name,
      component: s.component,
    }));
  }
  if (SQE_PATHS.includes(path)) {
    return getSqeSubjectsForPath(path as SqeExamPath).map((s) => ({
      name: s.name,
      component: s.paper,
    }));
  }
  return getSqeSubjectsForPath("SQE1_FULL").map((s) => ({ name: s.name, component: s.paper }));
}

/**
 * Look up a subject's subtopics by name across both syllabuses.
 * Returns a normalised shape so onboarding's "advanced" step can render
 * subtopic chips for either exam.
 */
export function getSubtopicsForSubject(name: string): { id: string; name: string }[] {
  const sqe = getSqeSubjectByName(name);
  if (sqe) return sqe.subtopics.map((t) => ({ id: t.id, name: t.name }));
  const ube = getUbeSubjectByName(name);
  if (ube) return ube.subtopics.map((t) => ({ id: t.id, name: t.name }));
  return [];
}
