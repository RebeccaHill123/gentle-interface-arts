// The practice question screen: prompt, options, immediate feedback and the
// explanation. Fully controlled by props, so the live practice route and the
// isolated /launch-video preview render the exact same UI.
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Flag, Timer, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { PracticeConfig } from "@/lib/practice/config";
import type { QuizQuestion } from "@/lib/practice/quiz-validate";

export function QuizScreen({
  config,
  questions,
  current,
  answers,
  revealed,
  feedbackMode,
  remainingLabel,
  lowTime,
  onSelect,
  onNext,
  onPrev,
  onFinish,
  flagged,
  onToggleFlag,
}: {
  config: PracticeConfig;
  questions: QuizQuestion[];
  current: number;
  answers: (number | null)[];
  revealed: boolean;
  feedbackMode: "immediate" | "end";
  /** Total time left in the session (authoritative wall clock), or null when untimed. */
  remainingLabel: string | null;
  lowTime: boolean;
  onSelect: (i: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
  flagged: boolean;
  onToggleFlag: () => void;
}) {
  const q = questions[current];
  const total = questions.length;
  const answered = answers[current];
  const progress = ((current + (revealed || answered != null ? 1 : 0)) / total) * 100;

  const isLast = current === total - 1;
  const canAdvance =
    feedbackMode === "immediate" ? revealed || answered != null : true;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Top bar */}
      <div className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            Question {current + 1} <span className="text-muted-foreground">/ {total}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleFlag}
              title={
                flagged
                  ? "Flagged as defective — excluded from your score. Tap to undo."
                  : "Flag this question as ambiguous or defective — it will be excluded from your score."
              }
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 transition ${
                flagged
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                  : "border-border bg-background/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flag className="h-3 w-3" />
              {flagged ? "Flagged" : "Flag"}
            </button>
            <span className="rounded-full border border-border bg-background/60 px-2 py-0.5">
              {config.module}
            </span>
            {remainingLabel != null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                  lowTime
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                    : "border-border bg-background/60"
                }`}
                title="Time left in this session"
              >
                <Timer className="h-3 w-3" />
                {remainingLabel} left
              </span>
            )}
          </div>
        </div>
        <Progress value={progress} className="mt-3 h-1.5" />
      </div>

      {/* Question */}
      <div className="mt-5 rounded-3xl border border-border bg-card/80 p-7 backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Single best answer
        </div>
        <p className="mt-2 text-base leading-relaxed text-foreground md:text-lg">
          {q.prompt}
        </p>

        <div className="mt-5 space-y-2.5">
          {q.options.map((opt, i) => {
            const selected = answered === i;
            const isCorrect = i === q.correctIndex;
            const showState = revealed;
            const base =
              "flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition";
            let cls = `${base} border-border bg-background/40 hover:border-pink/40`;
            if (showState) {
              if (isCorrect)
                cls = `${base} border-emerald-400/60 bg-emerald-400/10`;
              else if (selected)
                cls = `${base} border-rose-400/60 bg-rose-400/10`;
              else cls = `${base} border-border bg-background/30 opacity-70`;
            } else if (selected) {
              cls = `${base} border-pink/60 bg-pink/10`;
            }
            return (
              <button
                key={i}
                disabled={showState}
                onClick={() => onSelect(i)}
                className={cls}
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                    showState && isCorrect
                      ? "border-emerald-400/70 bg-emerald-400/20 text-emerald-300"
                      : showState && selected
                        ? "border-rose-400/70 bg-rose-400/20 text-rose-300"
                        : selected
                          ? "border-pink bg-pink text-primary-foreground"
                          : "border-border bg-background/60 text-muted-foreground"
                  }`}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 leading-relaxed">{opt}</span>
                {showState && isCorrect && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                )}
                {showState && selected && !isCorrect && (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
              </button>
            );
          })}
        </div>

        {revealed && (
          <div className="mt-5 rounded-2xl border border-border bg-background/40 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Brain className="h-3.5 w-3.5" /> Explanation
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground">
              {q.explanation}
            </p>
            <div className="mt-3 text-[11px] text-muted-foreground">
              Linked to <span className="text-foreground">{config.module}</span> ·{" "}
              {answered === q.correctIndex
                ? "Confidence trending up."
                : "Mark this for review — confidence dip recorded."}
            </div>
          </div>
        )}
      </div>

      {/* Footer nav */}
      <div className="mt-5 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onPrev}
          disabled={current === 0}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        <div className="text-xs text-muted-foreground">
          {feedbackMode === "immediate"
            ? "Pick an answer to reveal the explanation."
            : "Answers reviewed at the end."}
        </div>
        {isLast ? (
          <Button
            onClick={onFinish}
            disabled={!canAdvance}
            className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
          >
            <Flag className="mr-1 h-4 w-4" /> Finish
          </Button>
        ) : (
          <Button
            onClick={onNext}
            disabled={!canAdvance}
            className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
          >
            Next <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
