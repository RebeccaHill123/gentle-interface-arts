// Canonical syllabus coverage.
//
// The denominator is ALWAYS the complete syllabus for the user's ExamPath from
// the canonical syllabus source — never just the subjects they picked during
// onboarding (which previously allowed 100% coverage with real syllabus gaps).
import type { ExamPath } from "@/lib/plan-store";
import { getSubjectsForExamPath, getSubtopicsForSubject } from "@/lib/exam-paths";

export interface CoverageResult {
  examPath: ExamPath;
  /** Every subject in the canonical syllabus for this path. */
  totalSubjects: number;
  subjectsTouched: number;
  totalSubtopics: number;
  subtopicsTouched: number;
  /** 0..100, subject-level. null when the syllabus source is empty. */
  subjectPercent: number | null;
  /** 0..100, subtopic-level (the honest, stricter figure). */
  subtopicPercent: number | null;
  untouchedSubjects: string[];
  source: string;
}

export interface CoverageSignal {
  subject: string;
  subtopic?: string | null;
  minutes: number;
}

/** A subject/subtopic counts as covered once it has meaningful studied time. */
export const MEANINGFUL_MINUTES = 10;

export function computeCoverage(
  examPath: ExamPath,
  signals: CoverageSignal[],
): CoverageResult {
  const subjects = getSubjectsForExamPath(examPath);
  const minutesBySubject = new Map<string, number>();
  const minutesBySubtopic = new Map<string, number>();

  for (const s of signals) {
    if (!s.subject) continue;
    minutesBySubject.set(s.subject, (minutesBySubject.get(s.subject) ?? 0) + s.minutes);
    if (s.subtopic) {
      const key = `${s.subject}::${s.subtopic}`;
      minutesBySubtopic.set(key, (minutesBySubtopic.get(key) ?? 0) + s.minutes);
    }
  }

  let totalSubtopics = 0;
  let subtopicsTouched = 0;
  const untouchedSubjects: string[] = [];
  let subjectsTouched = 0;

  for (const subject of subjects) {
    const mins = minutesBySubject.get(subject.name) ?? 0;
    if (mins >= MEANINGFUL_MINUTES) subjectsTouched += 1;
    else untouchedSubjects.push(subject.name);

    const subtopics = getSubtopicsForSubject(subject.name);
    totalSubtopics += subtopics.length;
    for (const st of subtopics) {
      if ((minutesBySubtopic.get(`${subject.name}::${st.name}`) ?? 0) >= MEANINGFUL_MINUTES) {
        subtopicsTouched += 1;
      }
    }
  }

  return {
    examPath,
    totalSubjects: subjects.length,
    subjectsTouched,
    totalSubtopics,
    subtopicsTouched,
    subjectPercent: subjects.length
      ? Math.min(100, Math.round((subjectsTouched / subjects.length) * 100))
      : null,
    subtopicPercent: totalSubtopics
      ? Math.min(100, Math.round((subtopicsTouched / totalSubtopics) * 100))
      : null,
    untouchedSubjects,
    source: `Canonical ${examPath} syllabus · ${subjects.length} subjects, ${totalSubtopics} subtopics`,
  };
}
