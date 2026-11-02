/**
 * Smart Review session history.
 *
 * `graded_attempts` deliberately never stores question text, so quiz history
 * with full questions, answers and explanations lives here instead, in the
 * `smart_review_sessions` table (own-user RLS). Writes are idempotent via
 * (user_id, idempotency_key) so a retried submission can never double-count.
 */
import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";
import type { QuizQuestion } from "@/lib/practice/quiz-validate";

export interface SmartReviewSessionInput {
  /** Stable per-submission key — retries with the same key never duplicate. */
  idempotencyKey: string;
  examPath?: string | null;
  subject: string;
  subtopic?: string | null;
  difficulty: string;
  questions: QuizQuestion[];
  answers: (number | null)[];
  /** Indices of questions the student flagged as defective — excluded from the score. */
  flagged: number[];
  summary?: string | null;
  reviewFocus?: { subject: string; subtopic: string; status: string }[];
}

export interface SmartReviewSessionRow {
  id: string;
  exam_path: string | null;
  subject: string;
  subtopic: string | null;
  difficulty: string;
  question_count: number;
  correct_count: number;
  answered_count: number;
  accuracy: number;
  questions: QuizQuestion[];
  answers: (number | null)[];
  flagged: number[];
  summary: string | null;
  review_focus: { subject: string; subtopic: string; status: string }[];
  created_at: string;
}

/** Score excluding flagged (defective) questions; unanswered count as incorrect. */
export function scoreSession(input: {
  questions: QuizQuestion[];
  answers: (number | null)[];
  flagged: number[];
}): { scored: number; correct: number; answered: number; accuracy: number } {
  const flagged = new Set(input.flagged);
  let scored = 0;
  let correct = 0;
  let answered = 0;
  input.questions.forEach((q, i) => {
    if (flagged.has(i)) return;
    scored++;
    const a = input.answers[i];
    if (a != null) {
      answered++;
      if (a === q.correctIndex) correct++;
    }
  });
  return { scored, correct, answered, accuracy: scored ? correct / scored : 0 };
}

export async function saveSmartReviewSession(
  input: SmartReviewSessionInput,
): Promise<{ ok: boolean; error?: string }> {
  const user = await waitForAuthUser();
  if (!user) return { ok: false, error: "not signed in" };
  const { scored, correct, answered, accuracy } = scoreSession(input);
  const { error } = await supabase.from("smart_review_sessions").upsert(
    {
      user_id: user.id,
      idempotency_key: input.idempotencyKey,
      exam_path: input.examPath ?? null,
      subject: input.subject,
      subtopic: input.subtopic ?? null,
      difficulty: input.difficulty,
      question_count: scored,
      correct_count: correct,
      answered_count: answered,
      accuracy,
      questions: input.questions,
      answers: input.answers,
      flagged: input.flagged,
      summary: input.summary ?? null,
      review_focus: input.reviewFocus ?? [],
    },
    { onConflict: "user_id,idempotency_key", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function loadSmartReviewSessions(limit = 50): Promise<SmartReviewSessionRow[]> {
  const user = await waitForAuthUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("smart_review_sessions")
    .select(
      "id,exam_path,subject,subtopic,difficulty,question_count,correct_count,answered_count,accuracy,questions,answers,flagged,summary,review_focus,created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(Math.min(200, Math.max(1, limit)));
  if (error) {
    console.warn("loadSmartReviewSessions failed", error.message);
    return [];
  }
  return (data ?? []) as unknown as SmartReviewSessionRow[];
}
