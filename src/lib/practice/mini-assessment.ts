/**
 * Dashboard mini-assessment: one fixed, validated question set per task.
 * The provider may return more (or fewer) items than requested, so the set is
 * normalised here before the assessment starts and every count in the UI is
 * derived from it.
 */
import { validateQuizQuestions, normaliseQuestion, type QuizQuestion } from "./quiz-validate";

export const MINI_ASSESSMENT_SIZE = 10;
const STORE_PREFIX = "tentra.miniAssessment.v1:";

export type MiniAssessmentBuild =
  | { ok: true; questions: QuizQuestion[] }
  | { ok: false; error: string };

/** Exactly MINI_ASSESSMENT_SIZE unique, well-formed questions — or an explicit error. */
export function buildMiniAssessment(raw: unknown): MiniAssessmentBuild {
  const r = validateQuizQuestions(raw, MINI_ASSESSMENT_SIZE, { minimum: MINI_ASSESSMENT_SIZE });
  if (!r.ok) {
    return {
      ok: false,
      error: `We couldn't put together ${MINI_ASSESSMENT_SIZE} good questions on this topic. Please try again.`,
    };
  }
  return { ok: true, questions: r.questions };
}

export type MiniAssessmentProgress = {
  questions: QuizQuestion[];
  answers: (number | null)[];
  current: number;
  revealed: boolean;
};

export function miniAssessmentKey(task: { index: number; module: string; title: string; taskId?: string }) {
  return `${STORE_PREFIX}${task.taskId ?? task.index}|${task.module}|${task.title}`;
}

/** Restores saved progress only if it still describes a valid fixed-size set. */
export function parseMiniAssessmentProgress(raw: string | null): MiniAssessmentProgress | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!Array.isArray(p.questions) || p.questions.length !== MINI_ASSESSMENT_SIZE) return null;
    const questions = p.questions.map(normaliseQuestion);
    if (questions.some((q) => !q)) return null;
    const qs = questions as QuizQuestion[];
    const rawAnswers = Array.isArray(p.answers) ? p.answers : [];
    const answers = qs.map((_, i) => {
      const a = rawAnswers[i];
      return typeof a === "number" && Number.isInteger(a) && a >= 0 && a <= 3 ? a : null;
    });
    // Resume at the first unanswered question (answers before it are preserved).
    const firstOpen = answers.findIndex((a) => a === null);
    const current = firstOpen === -1 ? MINI_ASSESSMENT_SIZE - 1 : firstOpen;
    return { questions: qs, answers, current, revealed: answers[current] !== null };
  } catch {
    return null;
  }
}

export function scoreMiniAssessment(questions: QuizQuestion[], answers: (number | null)[]) {
  const correct = questions.reduce((acc, q, i) => (answers[i] === q.correctIndex ? acc + 1 : acc), 0);
  return { correct, total: questions.length, accuracy: questions.length ? correct / questions.length : 0 };
}
