/**
 * Personalised results summary for a completed Smart Review session.
 *
 * Deterministic and grounded ONLY in the student's actual responses — never
 * generic encouragement. References the specific questions missed and the
 * memory rules attached to them when the generator provided them.
 */
import type { QuizQuestion } from "@/lib/practice/quiz-validate";

export interface SessionSummaryInput {
  subject: string;
  questions: QuizQuestion[];
  answers: (number | null)[];
  /** Flagged (defective) questions are excluded from the score and summary. */
  flagged: number[];
}

function shortPrompt(prompt: string, max = 70): string {
  const t = prompt.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

export function buildSessionSummary(input: SessionSummaryInput): string {
  const flagged = new Set(input.flagged);
  const scored: { q: QuizQuestion; a: number | null }[] = [];
  input.questions.forEach((q, i) => {
    if (!flagged.has(i)) scored.push({ q, a: input.answers[i] ?? null });
  });
  const total = scored.length;
  if (total === 0) return "Every question in this set was flagged, so there is no score to summarise.";
  const correct = scored.filter((x) => x.a === x.q.correctIndex).length;
  const pct = Math.round((correct / total) * 100);
  const missed = scored.filter((x) => x.a !== x.q.correctIndex);

  let opener: string;
  if (pct >= 90) opener = "Excellent command of this material.";
  else if (pct >= 75) opener = "Strong performance.";
  else if (pct >= 55) opener = "A reasonable base with clear gaps to close.";
  else opener = "This area needs focused work before the exam.";

  if (missed.length === 0) {
    return `${opener} You answered all ${total} questions correctly on ${input.subject}. Consider a harder set next to keep stretching.`;
  }

  const missedBits = missed.slice(0, 3).map((m) => {
    const rule = m.q.memoryRule ? ` — ${m.q.memoryRule}` : "";
    return `“${shortPrompt(m.q.prompt)}”${rule}`;
  });
  const extra = missed.length > 3 ? ` (+${missed.length - 3} more)` : "";
  return `${opener} You scored ${correct}/${total} (${pct}%) on ${input.subject}. Revisit: ${missedBits.join("; ")}${extra}.`;
}
