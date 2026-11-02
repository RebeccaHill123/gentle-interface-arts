/**
 * Smart Review results: personalised summary, question-by-question table,
 * deep teaching explanations, weak-area diagnosis and adaptive follow-ups.
 *
 * Every number and claim comes from the student's actual responses and the
 * canonical graded-attempt history — never generic encouragement.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ChevronDown,
  Compass,
  Flag,
  Sparkles,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PracticeConfig } from "@/lib/practice/config";
import { PRACTICE_CONFIG_KEY } from "@/lib/practice/config";
import type { QuizQuestion } from "@/lib/practice/quiz-validate";
import { clearSnapshot } from "@/lib/practice/session";
import { buildSessionSummary } from "@/lib/smart-review/summary";
import { scoreSession } from "@/lib/smart-review/sessions";
import { loadGradedAttempts, type GradedAttemptRow } from "@/lib/study-log";
import {
  buildSubtopicPerformance,
  REVIEW_STATUS_LABELS,
  type SubtopicPerformance,
} from "@/lib/smart-review/performance";
import { diagnoseWeakAreas, type ReviewRecommendation } from "@/lib/smart-review/diagnosis";

const LETTER = (i: number) => String.fromCharCode(65 + i);

function launchFollowUp(cfg: PracticeConfig) {
  try {
    sessionStorage.setItem(PRACTICE_CONFIG_KEY, JSON.stringify(cfg));
  } catch {}
  clearSnapshot();
  window.location.href = "/practice";
}

export function SmartReviewResults({
  config,
  questions,
  answers,
  flagged,
}: {
  config: PracticeConfig;
  questions: QuizQuestion[];
  answers: (number | null)[];
  flagged: number[];
}) {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<GradedAttemptRow[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGradedAttempts()
      .then((rows) => {
        if (!cancelled) setAttempts(rows);
      })
      .catch(() => {
        if (!cancelled) setAttempts([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const flaggedSet = useMemo(() => new Set(flagged), [flagged]);
  const score = useMemo(
    () => scoreSession({ questions, answers, flagged }),
    [questions, answers, flagged],
  );
  const summary = useMemo(
    () => buildSessionSummary({ subject: config.module, questions, answers, flagged }),
    [config.module, questions, answers, flagged],
  );

  // Subtopic diagnosis for this module, from the canonical attempt history
  // (which by now includes this session's answers).
  const moduleSubs: SubtopicPerformance[] = useMemo(() => {
    if (!attempts) return [];
    return buildSubtopicPerformance(attempts.filter((a) => a.subject === config.module));
  }, [attempts, config.module]);

  const recommendations: ReviewRecommendation[] = useMemo(
    () => diagnoseWeakAreas(moduleSubs, { max: 3 }),
    [moduleSubs],
  );

  const missed = questions
    .map((q, i) => ({ q, i, a: answers[i] ?? null }))
    .filter((x) => !flaggedSet.has(x.i) && x.a !== x.q.correctIndex);

  function practiseWeakAreas() {
    const target = recommendations[0];
    launchFollowUp({
      ...config,
      formatLabel: target ? `Weak-area review: ${target.subtopic}` : `Weak-area review: ${config.module}`,
      topic: target ? target.subtopic : config.topic,
      questions: target?.suggestedQuestions ?? 5,
      duration: Math.max(10, (target?.suggestedQuestions ?? 5) * 2),
      difficulty:
        target?.suggestedDifficulty === "Easy"
          ? "Foundational"
          : target?.suggestedDifficulty === "Hard"
            ? "Stretch"
            : target?.suggestedDifficulty === "Medium"
              ? "Standard"
              : "Adaptive",
      rationale: target
        ? target.action
        : `Targeted practice on the concepts you missed in ${config.module}.`,
      reasonBits: target ? [target.detail] : ["Recently missed items"],
    });
  }

  function tryHarder() {
    launchFollowUp({
      ...config,
      formatLabel: `Harder set: ${config.topic ?? config.module}`,
      questions: 5,
      duration: 10,
      difficulty: "Stretch",
      rationale: `Five harder, exam-realistic questions on ${config.topic ?? config.module} — same principles, tougher application.`,
      reasonBits: ["Increased difficulty", config.module],
    });
  }

  function explainAgain() {
    const first = missed[0];
    const prompt = first
      ? `In my ${config.module} quiz I got this question wrong:\n\n"${first.q.prompt}"\n\nI answered ${first.a != null ? LETTER(first.a) : "nothing"}, but the correct answer was ${LETTER(first.q.correctIndex)}. Explain the underlying rule again from first principles, why my answer was wrong, and give me a memory rule.`
      : `Explain the key rules of ${config.topic ?? config.module} again from first principles, with a worked example and a memory rule for each.`;
    try {
      sessionStorage.setItem("coach:autosend", prompt);
    } catch {}
    window.location.href = "/coach";
  }

  return (
    <div className="mt-5 space-y-5">
      {/* Personalised summary */}
      <section className="rounded-2xl border border-pink/30 bg-gradient-to-br from-pink/10 to-blue/10 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-pink" /> Your review summary
        </div>
        <p className="mt-2 text-sm leading-relaxed text-foreground">{summary}</p>
        {flagged.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {flagged.length} flagged question{flagged.length === 1 ? "" : "s"} excluded from your
            score.
          </p>
        )}
      </section>

      {/* Question-by-question results */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur">
        <div className="border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Question by question
        </div>
        <div className="divide-y divide-border">
          {questions.map((q, i) => {
            const a = answers[i] ?? null;
            const isFlagged = flaggedSet.has(i);
            const correct = !isFlagged && a === q.correctIndex;
            return (
              <div key={i} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-8 shrink-0 text-xs text-muted-foreground">Q{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">{q.prompt}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a != null ? LETTER(a) : "—"} → {LETTER(q.correctIndex)}
                </span>
                {isFlagged ? (
                  <Badge className="shrink-0 rounded-full bg-amber-400/15 text-amber-300 hover:bg-amber-400/15">
                    <Flag className="mr-1 h-3 w-3" /> Excluded
                  </Badge>
                ) : correct ? (
                  <Badge className="shrink-0 rounded-full bg-emerald-400/15 text-emerald-300 hover:bg-emerald-400/15">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Correct
                  </Badge>
                ) : (
                  <Badge className="shrink-0 rounded-full bg-rose-400/15 text-rose-300 hover:bg-rose-400/15">
                    <XCircle className="mr-1 h-3 w-3" /> Incorrect
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Detailed teaching explanations */}
      <section className="rounded-2xl border border-border bg-card/70 backdrop-blur">
        <div className="border-b border-border px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Explanations — every option, every question
        </div>
        <div className="divide-y divide-border">
          {questions.map((q, i) => {
            const a = answers[i] ?? null;
            const isFlagged = flaggedSet.has(i);
            const correct = !isFlagged && a === q.correctIndex;
            return (
              <details key={i} className="group px-5 py-3">
                <summary className="flex cursor-pointer list-none items-center gap-3 text-sm">
                  {isFlagged ? (
                    <Flag className="h-4 w-4 shrink-0 text-amber-300" />
                  ) : correct ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                  )}
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                    Q{i + 1} — {q.prompt}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
                </summary>
                <div className="mt-3 space-y-3 rounded-2xl border border-border bg-background/40 p-4 text-sm">
                  <p className="leading-relaxed text-foreground">{q.prompt}</p>
                  <div className="grid gap-1.5">
                    {q.options.map((opt, oi) => {
                      const isCorrect = oi === q.correctIndex;
                      const isYours = a === oi;
                      return (
                        <div
                          key={oi}
                          className={`rounded-xl border p-2.5 ${
                            isCorrect
                              ? "border-emerald-400/50 bg-emerald-400/10"
                              : isYours
                                ? "border-rose-400/50 bg-rose-400/10"
                                : "border-border bg-background/30"
                          }`}
                        >
                          <div className="text-xs font-semibold">
                            {LETTER(oi)}. {opt}
                            {isCorrect && <span className="ml-2 text-emerald-300">Correct answer</span>}
                            {isYours && !isCorrect && (
                              <span className="ml-2 text-rose-300">Your answer</span>
                            )}
                          </div>
                          {q.optionExplanations?.[oi] && (
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                              {q.optionExplanations[oi]}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <Brain className="h-3.5 w-3.5" /> The rule
                    </div>
                    <p className="mt-1 leading-relaxed text-foreground">{q.explanation}</p>
                  </div>
                  {q.memoryRule && (
                    <div className="rounded-xl border border-pink/30 bg-pink/10 p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-pink">
                        Memory rule
                      </div>
                      <p className="mt-1 text-sm text-foreground">{q.memoryRule}</p>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* What to review next */}
      <section className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Target className="h-3.5 w-3.5 text-pink" /> What to review next
        </div>
        {attempts === null ? (
          <p className="mt-2 text-sm text-muted-foreground">Analysing your history…</p>
        ) : recommendations.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No weak subtopics on record for {config.module}. Keep building evidence with mixed
            practice.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recommendations.map((r) => (
              <li key={`${r.subject}|${r.subtopic}`} className="rounded-xl border border-border bg-background/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{r.subtopic}</span>
                  <Badge className="rounded-full bg-blue/15 text-blue hover:bg-blue/15">
                    {r.kind === "repeated"
                      ? "Repeating pattern"
                      : r.kind === "relearn"
                        ? "Relearn the rule"
                        : r.kind === "misapplies"
                          ? "Applied inconsistently"
                          : r.kind === "isolated"
                            ? "Isolated slip"
                            : "Build evidence"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                <p className="mt-1.5 flex items-start gap-1.5 text-sm text-foreground">
                  <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink" />
                  {r.action}
                </p>
              </li>
            ))}
          </ul>
        )}
        {moduleSubs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {moduleSubs.slice(0, 6).map((s) => (
              <span
                key={s.subtopic}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${
                  s.status === "needs-review"
                    ? "border-rose-400/40 bg-rose-400/10 text-rose-300"
                    : s.status === "strong"
                      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                      : "border-border bg-background/60 text-muted-foreground"
                }`}
              >
                {s.subtopic} · {REVIEW_STATUS_LABELS[s.status]}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Adaptive follow-ups */}
      <section className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Adaptive follow-ups
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {missed.length > 0 && (
            <Button
              onClick={practiseWeakAreas}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
            >
              <Target className="mr-1 h-4 w-4" /> Practise my weak areas
            </Button>
          )}
          <Button variant="outline" onClick={tryHarder} className="rounded-full">
            <TrendingUp className="mr-1 h-4 w-4" /> Try 5 harder questions
          </Button>
          {missed.length > 0 && (
            <Button variant="outline" onClick={explainAgain} className="rounded-full">
              <BookOpenCheck className="mr-1 h-4 w-4" /> Explain this rule again
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => navigate({ to: "/dashboard" })}
            className="rounded-full"
          >
            <Compass className="mr-1 h-4 w-4" /> Continue to next topic
          </Button>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Follow-up sets test the same principles with fresh scenarios — never the same questions
          repeated.
        </p>
      </section>
    </div>
  );
}
