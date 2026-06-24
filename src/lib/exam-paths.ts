// Exam-aware helpers that bridge the SQE, UBE and MPRE syllabuses.
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
import { getMpreSubjects, getMpreSubjectByName, MPRE_SYLLABUS } from "@/lib/mpre-syllabus";

const SQE_PATHS: ExamPath[] = ["SQE1_FULL", "FLK1", "FLK2", "SQE2", "CUSTOM"];
const UBE_PATHS: ExamPath[] = ["UBE_FULL", "UBE_MBE", "UBE_ESSAYS", "UBE_MPT"];

export function isUbePath(path: ExamPath): boolean {
  return UBE_PATHS.includes(path);
}

export function isMprePath(path: ExamPath): boolean {
  return path === "MPRE_FULL";
}

export function defaultPathForExam(examType: ExamType): ExamPath {
  if (examType === "UBE") return "UBE_FULL";
  if (examType === "SQE2") return "SQE2";
  if (examType === "MPRE") return "MPRE_FULL";
  return "SQE1_FULL";
}

export function pathToExamType(path: ExamPath): ExamType {
  if (isUbePath(path)) return "UBE";
  if (isMprePath(path)) return "MPRE";
  return path === "SQE2" ? "SQE2" : "SQE1";
}

/**
 * Subject list (with optional component/paper tag) for a given exam path.
 * Falls back to SQE1 if an unknown path is passed.
 */
export function getSubjectsForExamPath(
  path: ExamPath,
): { name: string; component?: string }[] {
  if (isMprePath(path)) return getMpreSubjects();
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
 * Look up a subject's subtopics by name across all three syllabuses.
 */
export function getSubtopicsForSubject(name: string): { id: string; name: string }[] {
  const mpre = getMpreSubjectByName(name);
  if (mpre) return mpre.subtopics.map((t) => ({ id: t.id, name: t.name }));
  const sqe = getSqeSubjectByName(name);
  if (sqe) return sqe.subtopics.map((t) => ({ id: t.id, name: t.name }));
  const ube = getUbeSubjectByName(name);
  if (ube) return ube.subtopics.map((t) => ({ id: t.id, name: t.name }));
  return [];
}

export { MPRE_SYLLABUS };

