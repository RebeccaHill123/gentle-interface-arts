/**
 * Interactive Smart Review quiz card rendered inside the AI Tutor conversation.
 *
 * Self-contained flow: generate → answer (answers hidden until submission) →
 * score → teach. Results are recorded through the canonical pipeline
 * (study event + graded attempts + Smart Review history) and reported back to
 * the tutor via onComplete so the conversation retains the quiz context.
 */
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  seedFromFingerprint,
  shuffleQuestionOptions,
  validateQuizQuestions,
  type QuizQuestion,
} from "@/lib/practice/quiz-validate";
import {
  makeIdempotencyKey,
  questionFingerprint,
  recordGradedAttempts,
  recordStudyActivity,
} from "@/lib/study-log";
import { buildSessionSummary } from "@/lib/smart-review/summary";
import { saveSmartReviewSession, scoreSession } from "@/lib/smart-review/sessions";
import { PRACTICE_CONFIG_KEY, type PracticeConfig } from "@/lib/practice/config";
import { clearSnapshot } from "@/lib/practice/session";

const LETTER = (i: number) => String.fromCharCode(65 + i);

export type ChatQuizSpec = {
  module: string;
  topic?: string;
  count: number;
  difficulty: "Easy" | "Medium" | "Hard" | "Mixed";
};

type CardPhase = "loading" | "quiz" | "results" | "error";

export function ChatQuizCard({
  spec,
  examType,
  examPath,
  onComplete,
}: {
  spec: ChatQuizSpec;
  examType: "SQE1" | "SQE2" | "UBE" | "MPRE" | "ACCA";
  examPath?: string;
  onComplete: (summaryForTutor: string) => void;
}) {
  const [phase, setPhase] = useState<CardPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [sessionId] = useState(
    () => `chatquiz_${Date.now()}_${Math.random().toString(36).slice(2)}`,
  );
  const completedRef = useRef(false);

  // Generate exactly once per card.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("generate-quiz", {
          body: {
            module: spec.module,
            topic: spec.topic ?? spec.module,
            examType,
            count: spec.count,
            difficulty: spec.difficulty,
          },
        });
        if (cancelled) return;
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        const validated = validateQuizQuestions(data?.questions, spec.count, { minimum: 4 });
        if (!validated.ok) throw new Error(validated.error);
        const seed = seedFromFingerprint(sessionId);
        setQuestions(validated.questions.map((q, i) => shuffleQuestionOptions(q, seed + i)));
        setAnswers(new Array(validated.questions.length).fill(null));
        setPhase("quiz");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Couldn't generate the quiz.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    if (completedRef.current) return;
    completedRef.current = true;
    setPhase("results");

    const score = scoreSession({ questions, answers, flagged: [] });
    const summary = buildSessionSummary({
      subject: spec.module,
      questions,
      answers,
      flagged: [],
    });
    const occurredAt = new Date();

    // Canonical recording — same pipeline as the practice route. Best-effort:
    // the on-screen results never depend on these writes succeeding.
    try {
      await recordStudyActivity({
        idempotencyKey: makeIdempotencyKey("tutor-quiz", sessionId),
        activityType: "quiz",
        source: "practice",
        actualMinutes: Math.max(1, Math.round(questions.length * 1.5)),
        occurredAt,
        subject: spec.module,
        subtopic: spec.topic ?? undefined,
        examPath: examPath ?? null,
        gradedAccuracy: score.accuracy,
        note: `Tutor quiz · ${score.correct}/${score.scored}`,
      });
      await recordGradedAttempts(
        questions.map((q, i) => {
          const selected = answers[i] ?? null;
          return {
            idempotencyKey: makeIdempotencyKey("tutor-quiz-attempt", sessionId, i),
            sourceType: "practice" as const,
            sourceRef: sessionId,
            questionFingerprint: questionFingerprint(q.prompt),
            subject: spec.module,
            subtopic: spec.topic ?? undefined,
            occurredAt,
            isCorrect: selected != null && selected === q.correctIndex,
            selectedAnswer: selected != null ? LETTER(selected) : null,
            durationSeconds: null,
            examPath: examPath ?? null,
          };
        }),
      );
      await saveSmartReviewSession({
        idempotencyKey: makeIdempotencyKey("smart-review", sessionId),
        examPath: examPath ?? null,
        subject: spec.module,
        subtopic: spec.topic ?? null,
        difficulty: spec.difficulty,
        questions,
        answers,
        flagged: [],
        summary,
      });
    } catch (e) {
      console.warn("tutor quiz recording failed", e);
    }

    onComplete(
      `Quiz completed: ${score.correct}/${score.scored} (${Math.round(score.accuracy * 100)}%) on ${spec.topic ?? spec.module}. ${summary} The results are saved to my Smart Review tracker. If I ask follow-up questions about this quiz, use this context.`,
    );
  }

  function practiseWeakAreas() {
    const missed = questions.filter((q, i) => answers[i] !== q.correctIndex);
    const config: PracticeConfig = {
      source: "practice-launcher",
      format: "smart-review",
      formatLabel: `Weak-area review: ${spec.topic ?? spec.module}`,
      module: spec.module,
      topic: spec.topic ?? spec.module,
      questions: Math.min(10, Math.max(5, missed.length || 5)),
      duration: 10,
      difficulty: "Adaptive",
      timed: true,
      adaptive: true,
      rationale: `Targeted follow-up on the ${missed.length} concept${missed.length === 1 ? "" : "s"} missed in the tutor quiz.`,
      reasonBits: ["Recently missed items", spec.module],
    };
    try {
      sessionStorage.setItem(PRACTICE_CONFIG_KEY, JSON.stringify(config));
    } catch {}
    clearSnapshot();
    window.location.href = "/practice";
  }

  if (phase === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-pink/30 bg-pink/5 p-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-pink" />
        Composing {spec.count} {spec.difficulty.toLowerCase()} questions on {spec.topic ?? spec.module}…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="rounded-2xl border border-rose-400/40 bg-rose-400/10 p-4 text-sm text-rose-200">
        {error ?? "Couldn't generate the quiz."}
      </div>
    );
  }

  if (phase === "quiz") {
    const q = questions[current];
    const total = questions.length;
    const answeredCount = answers.filter((a) => a != null).length;
    const isLast = current === total - 1;
    return (
      <div className="rounded-2xl border border-pink/30 bg-card/80 p-5 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Question {current + 1} <span className="text-muted-foreground">/ {total}</span>
          </span>
          <Badge className="rounded-full bg-pink/15 text-pink hover:bg-pink/15">
            {spec.difficulty} · answers hidden until you submit
          </Badge>
        </div>
        <Progress value={((current + 1) / total) * 100} className="mt-3 h-1.5" />
        <p className="mt-4 text-sm leading-relaxed text-foreground">{q.prompt}</p>
        <div className="mt-4 space-y-2">
          {q.options.map((opt, i) => {
            const selected = answers[current] === i;
            return (
              <button
                key={i}
                onClick={() => {
                  const next = [...answers];
                  next[current] = i;
                  setAnswers(next);
                }}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition ${
                  selected
                    ? "border-pink/60 bg-pink/10"
                    : "border-border bg-background/40 hover:border-pink/40"
                }`}
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                    selected
                      ? "border-pink bg-pink text-primary-foreground"
                      : "border-border bg-background/60 text-muted-foreground"
                  }`}
                >
                  {LETTER(i)}
                </span>
                <span className="flex-1 leading-relaxed">{opt}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            disabled={current === 0}
            onClick={() => setCurrent((c) => c - 1)}
          >
            Back
          </Button>
          <span className="text-xs text-muted-foreground">{answeredCount} of {total} answered</span>
          {isLast ? (
            <Button
              size="sm"
              onClick={() => void submit()}
              disabled={answeredCount === 0}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
            >
              Submit assessment
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setCurrent((c) => c + 1)}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    );
  }

  // results
  const score = scoreSession({ questions, answers, flagged: [] });
  const pct = Math.round(score.accuracy * 100);
  return (
    <div className="rounded-2xl border border-pink/30 bg-card/80 p-5 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-lg font-semibold tracking-tight">
          {score.correct}/{score.scored} — {pct}%
        </div>
        <Badge className="rounded-full bg-pink/15 text-pink hover:bg-pink/15">
          Saved to Smart Review
        </Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {buildSessionSummary({ subject: spec.module, questions, answers, flagged: [] })}
      </p>
      <div className="mt-3 divide-y divide-border rounded-xl border border-border">
        {questions.map((q, i) => {
          const a = answers[i] ?? null;
          const correct = a === q.correctIndex;
          return (
            <details key={i} className="group px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm">
                {correct ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span className="min-w-0 flex-1 truncate">{q.prompt}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {a != null ? LETTER(a) : "—"} → {LETTER(q.correctIndex)}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-open:rotate-180" />
              </summary>
              <div className="mt-2 space-y-1.5 text-xs">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={`rounded-lg border px-2 py-1.5 ${
                      oi === q.correctIndex
                        ? "border-emerald-400/40 bg-emerald-400/10"
                        : a === oi
                          ? "border-rose-400/40 bg-rose-400/10"
                          : "border-border"
                    }`}
                  >
                    <span className="font-medium">
                      {LETTER(oi)}. {opt}
                    </span>
                    {q.optionExplanations?.[oi] && (
                      <span className="mt-0.5 block text-muted-foreground">
                        {q.optionExplanations[oi]}
                      </span>
                    )}
                  </div>
                ))}
                <p className="pt-1 text-muted-foreground">{q.explanation}</p>
                {q.memoryRule && (
                  <p className="rounded-lg border border-pink/30 bg-pink/10 px-2 py-1.5 text-foreground">
                    <span className="font-semibold text-pink">Memory rule: </span>
                    {q.memoryRule}
                  </p>
                )}
              </div>
            </details>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {score.correct < score.scored && (
          <Button
            size="sm"
            onClick={practiseWeakAreas}
            className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
          >
            <Target className="mr-1 h-3.5 w-3.5" /> Practise my weak areas
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="rounded-full"
          onClick={() => {
            const el = document.querySelector<HTMLTextAreaElement>("textarea");
            el?.focus();
          }}
        >
          <TrendingUp className="mr-1 h-3.5 w-3.5" /> Ask the tutor about these
        </Button>
      </div>
    </div>
  );
}
