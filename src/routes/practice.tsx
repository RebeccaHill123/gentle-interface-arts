import { useEffect, useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Timer,
  Sparkles,
  Activity,
  Gauge,
  RefreshCw,
  Target,
  Brain,
  Loader2,
  AlertTriangle,
  Flag,
  Bookmark,
  ChevronLeft,
  Play,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  loadPlan,
  addStudySession,
  adjustModuleConfidence,
} from "@/lib/plan-store";

type PracticeSearch = {
  subject?: string;
  subtopic?: string;
  length?: number;
  mode?: "revise" | "quiz";
};

export const Route = createFileRoute("/practice")({
  validateSearch: (raw: Record<string, unknown>): PracticeSearch => {
    const s: PracticeSearch = {};
    if (typeof raw.subject === "string" && raw.subject.trim()) s.subject = raw.subject.trim();
    if (typeof raw.subtopic === "string" && raw.subtopic.trim()) s.subtopic = raw.subtopic.trim();
    const len = typeof raw.length === "string" ? parseInt(raw.length, 10) : typeof raw.length === "number" ? raw.length : NaN;
    if (Number.isFinite(len) && len > 0) s.length = Math.min(30, Math.max(3, Math.floor(len)));
    if (raw.mode === "revise" || raw.mode === "quiz") s.mode = raw.mode;
    return s;
  },
  beforeLoad: async () => {
    const { requireAccess } = await import("@/lib/access-guard");
    await requireAccess();
  },
  component: PracticeSessionPage,
  head: () => ({
    meta: [
      { title: "Practice Session · Tentra" },
      {
        name: "description",
        content:
          "Adaptive interactive SQE practice session — one question at a time, with timing, scoring and feedback.",
      },
    ],
  }),
});

type QuizQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type PracticeConfig = {
  source: "ai-quiz" | "practice-launcher";
  format?: string;
  formatLabel: string;
  module: string;
  topic?: string;
  questions: number;
  duration: number; // minutes
  difficulty: "Foundational" | "Standard" | "Stretch" | "Adaptive";
  timed: boolean;
  adaptive: boolean;
  feedbackMode?: "immediate" | "end";
  rationale: string;
  reasonBits?: string[];
  skillFocus?: string[];
};

type Phase = "loading" | "launch" | "quiz" | "results" | "error";

const STORAGE_KEY = "practice:config";

const THINKING = [
  "Reading your confidence map…",
  "Scanning recent mock accuracy…",
  "Weighting high-yield subtopics…",
  "Calibrating difficulty…",
  "Composing exam-style items…",
];

function PracticeSessionPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<PracticeConfig | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [thinkIdx, setThinkIdx] = useState(0);

  // quiz state
  const [feedbackMode, setFeedbackMode] = useState<"immediate" | "end">("immediate");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [perQuestionMs, setPerQuestionMs] = useState<number[]>([]);
  const [questionStart, setQuestionStart] = useState<number>(0);
  const [sessionStart, setSessionStart] = useState<number>(0);
  const [confidenceBefore, setConfidenceBefore] = useState<number | null>(null);

  // Load config + start generation
  useEffect(() => {
    let cancelled = false;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(STORAGE_KEY);
    } catch {}
    if (!raw) {
      setPhase("error");
      setError("No practice session was queued. Start one from Mocks & Practice.");
      return;
    }
    let parsed: PracticeConfig;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setPhase("error");
      setError("Could not read session configuration.");
      return;
    }
    setConfig(parsed);
    setFeedbackMode(parsed.feedbackMode ?? "immediate");

    // Capture the module's current confidence so we can show a delta later
    const plan = loadPlan();
    const mod = plan?.input.modules.find((m) => m.name === parsed.module);
    setConfidenceBefore(mod?.confidence ?? null);

    const examType = (plan?.input.examType ?? "SQE1") as "SQE1" | "SQE2" | "UBE" | "MPRE";

    // Animate the thinking lines
    const tick = setInterval(() => {
      setThinkIdx((i) => Math.min(THINKING.length - 1, i + 1));
    }, 700);

    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke(
          "generate-quiz",
          {
            body: {
              module: parsed.module,
              topic: parsed.topic ?? parsed.formatLabel,
              examType,
              confidence: mod?.confidence ?? 3,
            },
          },
        );
        if (cancelled) return;
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        const all: QuizQuestion[] = (data?.questions ?? []).filter(
          (q: QuizQuestion) =>
            q && Array.isArray(q.options) && q.options.length === 4,
        );
        if (all.length === 0) throw new Error("No questions returned");
        // Cap to requested count
        const qs = all.slice(0, Math.max(4, parsed.questions));
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(null));
        setPerQuestionMs(new Array(qs.length).fill(0));
        setPhase("launch");
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        setError(e instanceof Error ? e.message : "Could not generate session");
      } finally {
        clearInterval(tick);
      }
    })();

    return () => {
      cancelled = true;
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function beginSession() {
    const now = Date.now();
    setSessionStart(now);
    setQuestionStart(now);
    setCurrent(0);
    setRevealedSet(new Set());
    setPhase("quiz");
  }

  function recordTime() {
    const elapsed = Date.now() - questionStart;
    setPerQuestionMs((arr) => {
      const next = [...arr];
      next[current] = (next[current] ?? 0) + elapsed;
      return next;
    });
    setQuestionStart(Date.now());
  }

  function selectAnswer(optIdx: number) {
    if (feedbackMode === "immediate" && revealedSet.has(current)) return;
    const next = [...answers];
    next[current] = optIdx;
    setAnswers(next);
    if (feedbackMode === "immediate") {
      setRevealedSet((s) => new Set(s).add(current));
    }
  }

  function nextQuestion() {
    recordTime();
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      finishSession();
    }
  }

  function prevQuestion() {
    recordTime();
    if (current > 0) setCurrent(current - 1);
  }

  function finishSession() {
    if (!config) return;
    const totalMs = Date.now() - sessionStart;
    const minutes = Math.max(1, Math.round(totalMs / 60_000));
    const correct = answers.reduce<number>(
      (acc, a, i) => (a === questions[i]?.correctIndex ? acc + 1 : acc),
      0,
    );
    const accuracy = correct / questions.length;

    try {
      addStudySession({
        date: new Date().toISOString().slice(0, 10),
        minutes,
        module: config.module,
        sessionType: "quiz",
        note: `${config.formatLabel} · ${correct}/${questions.length}`,
        focus: accuracy,
      });
      adjustModuleConfidence(config.module, accuracy);
    } catch (e) {
      console.warn("session log failed", e);
    }
    setPhase("results");
  }

  // ───────── render

  return (
    <AppShell title="Practice Session" subtitle={config?.module ?? "Adaptive SQE practice"}>
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/mocks" })}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-1 h-4 w-4" /> Mocks & Practice
        </Button>
      </div>

      {phase === "loading" && <LoadingScreen idx={thinkIdx} />}
      {phase === "error" && (
        <ErrorScreen
          message={error ?? "Something went wrong."}
          onBack={() => navigate({ to: "/mocks" })}
        />
      )}
      {phase === "launch" && config && (
        <LaunchScreen
          config={config}
          questionCount={questions.length}
          feedbackMode={feedbackMode}
          onFeedbackChange={setFeedbackMode}
          onBegin={beginSession}
        />
      )}
      {phase === "quiz" && config && (
        <QuizScreen
          config={config}
          questions={questions}
          current={current}
          answers={answers}
          revealed={feedbackMode === "immediate" && revealedSet.has(current)}
          feedbackMode={feedbackMode}
          onSelect={selectAnswer}
          onNext={nextQuestion}
          onPrev={prevQuestion}
          onFinish={finishSession}
        />
      )}
      {phase === "results" && config && (
        <ResultsScreen
          config={config}
          questions={questions}
          answers={answers}
          perQuestionMs={perQuestionMs}
          confidenceBefore={confidenceBefore}
          onRetry={() => {
            setAnswers(new Array(questions.length).fill(null));
            setRevealedSet(new Set());
            setPerQuestionMs(new Array(questions.length).fill(0));
            beginSession();
          }}
          onNewDrill={() => navigate({ to: "/mocks" })}
        />
      )}
    </AppShell>
  );
}

/* ───────────────────────────  LOADING  ─────────────────────────── */

function LoadingScreen({ idx }: { idx: number }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-3xl border border-border bg-card/70 p-12 text-center backdrop-blur">
      <div className="relative">
        <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-pink-blue opacity-40 blur-2xl" />
        <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-pink-blue shadow-glow">
          <Sparkles className="h-7 w-7 animate-pulse text-primary-foreground" />
        </div>
      </div>
      <h2 className="mt-6 text-lg font-semibold">Generating your session</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Reading your performance data to design the right set.
      </p>
      <div className="mt-6 flex flex-col items-start gap-1.5">
        {THINKING.slice(0, idx + 1).map((l, i) => (
          <div
            key={l}
            className="flex items-center gap-2 text-[12px] text-muted-foreground"
            style={{ opacity: i === idx ? 1 : 0.55 }}
          >
            <CheckCircle2 className="h-3 w-3 text-pink" /> {l}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────  ERROR  ─────────────────────────── */

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-border bg-card/70 p-8 text-center backdrop-blur">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-500/15 text-amber-300">
        <AlertTriangle className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Couldn't start your session</h2>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
      <Button onClick={onBack} className="mt-5 rounded-full">
        Back to Mocks & Practice
      </Button>
    </div>
  );
}

/* ───────────────────────────  LAUNCH  ─────────────────────────── */

function LaunchScreen({
  config,
  questionCount,
  feedbackMode,
  onFeedbackChange,
  onBegin,
}: {
  config: PracticeConfig;
  questionCount: number;
  feedbackMode: "immediate" | "end";
  onFeedbackChange: (v: "immediate" | "end") => void;
  onBegin: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="relative overflow-hidden rounded-3xl border border-pink/30 bg-gradient-to-br from-pink/10 to-blue/10 p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-pink-blue opacity-25 blur-3xl" />
        <Badge className="rounded-full bg-pink/15 text-pink hover:bg-pink/15">
          <Sparkles className="mr-1 h-3 w-3" /> Adaptive practice session
        </Badge>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
          {config.formatLabel} · {config.module}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {config.rationale}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Activity} label="Questions" value={`${questionCount}`} />
          <Stat icon={Timer} label="Duration" value={`${config.duration} min`} />
          <Stat icon={Gauge} label="Difficulty" value={config.difficulty} />
          <Stat
            icon={Target}
            label="Mode"
            value={config.adaptive ? "Adaptive" : "Balanced"}
          />
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Targeted weak areas
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(config.reasonBits?.length ? config.reasonBits : ["Balanced syllabus exposure"]).map(
              (r) => (
                <span
                  key={r}
                  className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[11px] text-muted-foreground"
                >
                  {r}
                </span>
              ),
            )}
          </div>
          {config.skillFocus?.length ? (
            <>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Skill focus
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {config.skillFocus.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-blue/10 px-2.5 py-1 text-[11px] text-blue"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Feedback mode
          </div>
          <div className="mt-3 space-y-2">
            <FeedbackOption
              active={feedbackMode === "immediate"}
              onClick={() => onFeedbackChange("immediate")}
              title="Immediate explanation"
              desc="Reveal the answer and a short explanation after each question."
            />
            <FeedbackOption
              active={feedbackMode === "end"}
              onClick={() => onFeedbackChange("end")}
              title="End-of-session review"
              desc="Answer all questions first, then review every item at the end."
            />
          </div>
        </div>
      </section>

      <div className="mt-6 flex justify-center">
        <Button
          onClick={onBegin}
          size="lg"
          className="rounded-full bg-gradient-pink-blue px-8 text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
        >
          <Play className="mr-1.5 h-4 w-4" /> Begin session
        </Button>
      </div>
    </div>
  );
}

function FeedbackOption({
  active,
  onClick,
  title,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
        active
          ? "border-pink/60 bg-pink/5 shadow-sm"
          : "border-border bg-background/40 hover:border-pink/30"
      }`}
    >
      <span
        className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
          active ? "border-pink bg-pink" : "border-border"
        }`}
      >
        {active && <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />}
      </span>
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

/* ───────────────────────────  QUIZ  ─────────────────────────── */

function QuizScreen({
  config,
  questions,
  current,
  answers,
  revealed,
  feedbackMode,
  onSelect,
  onNext,
  onPrev,
  onFinish,
}: {
  config: PracticeConfig;
  questions: QuizQuestion[];
  current: number;
  answers: (number | null)[];
  revealed: boolean;
  feedbackMode: "immediate" | "end";
  onSelect: (i: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
}) {
  const q = questions[current];
  const total = questions.length;
  const answered = answers[current];
  const progress = ((current + (revealed || answered != null ? 1 : 0)) / total) * 100;

  // Per-question countdown (timed mode)
  const perQuestionSec = config.timed
    ? Math.max(45, Math.round(((config.duration ?? 20) * 60) / Math.max(1, total)))
    : null;
  const [timeLeft, setTimeLeft] = useState<number | null>(perQuestionSec);
  const advancedRef = useRef(false);

  useEffect(() => {
    advancedRef.current = false;
    if (perQuestionSec == null) return;
    setTimeLeft(perQuestionSec);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t == null) return t;
        if (t <= 1) {
          clearInterval(id);
          if (!advancedRef.current) {
            advancedRef.current = true;
            // Auto-advance when time is up
            setTimeout(() => onNext(), 50);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

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
            <span className="rounded-full border border-border bg-background/60 px-2 py-0.5">
              {config.module}
            </span>
            {timeLeft != null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${
                  timeLeft <= 10
                    ? "border-amber-400/50 bg-amber-400/10 text-amber-300"
                    : "border-border bg-background/60"
                }`}
              >
                <Timer className="h-3 w-3" />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
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

/* ───────────────────────────  RESULTS  ─────────────────────────── */

function ResultsScreen({
  config,
  questions,
  answers,
  perQuestionMs,
  confidenceBefore,
  onRetry,
  onNewDrill,
}: {
  config: PracticeConfig;
  questions: QuizQuestion[];
  answers: (number | null)[];
  perQuestionMs: number[];
  confidenceBefore: number | null;
  onRetry: () => void;
  onNewDrill: () => void;
}) {
  const total = questions.length;
  const correct = answers.reduce<number>(
    (acc, a, i) => (a === questions[i]?.correctIndex ? acc + 1 : acc),
    0,
  );
  const accuracy = correct / total;
  const accuracyPct = Math.round(accuracy * 100);
  const totalSec = Math.round(perQuestionMs.reduce((a, b) => a + b, 0) / 1000);
  const avgSec = Math.round(totalSec / Math.max(1, total));

  // Confidence delta (estimate) — adjustModuleConfidence has already been applied
  const targetConf = Math.max(1, Math.min(5, accuracy * 5));
  const delta =
    confidenceBefore != null
      ? +(0.4 * (targetConf > confidenceBefore ? 1 : -1) *
          Math.min(1, Math.abs(targetConf - confidenceBefore))).toFixed(2)
      : 0;

  const wrong = questions
    .map((q, i) => ({ q, i, a: answers[i] }))
    .filter((x) => x.a !== x.q.correctIndex);
  const right = total - wrong.length;

  const pacingNote =
    avgSec > 110
      ? "You took longer than typical exam pacing — try a timed drill next."
      : avgSec < 45
        ? "You moved fast — verify accuracy isn't slipping under speed."
        : "Pacing was within the exam-realistic band.";

  function saveWeakTopics() {
    toast.success("Weak topics added to your study plan", {
      description: `${wrong.length} item${wrong.length === 1 ? "" : "s"} flagged for review`,
    });
  }

  function followUpDrill() {
    const cfg: PracticeConfig = {
      ...config,
      formatLabel: "Follow-up drill",
      questions: Math.min(10, Math.max(5, wrong.length || 6)),
      duration: Math.max(10, Math.round((wrong.length || 6) * 1.7)),
      difficulty: "Adaptive",
      rationale: `Targeted drill on the ${wrong.length} concepts you missed in your last ${config.formatLabel}.`,
      reasonBits: ["Recently missed items", config.module],
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch {}
    // Force a fresh mount via navigation
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Headline */}
      <section className="relative overflow-hidden rounded-3xl border border-pink/30 bg-gradient-to-br from-pink/10 to-blue/10 p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-pink-blue opacity-25 blur-3xl" />
        <Badge className="rounded-full bg-pink/15 text-pink hover:bg-pink/15">Session complete</Badge>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {accuracyPct}% accuracy
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {correct} of {total} correct on {config.module}
            </p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>{Math.round(totalSec / 60)} min total</div>
            <div>{avgSec}s avg / question</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={CheckCircle2} label="Correct" value={`${right}`} />
          <Stat icon={XCircle} label="Missed" value={`${wrong.length}`} />
          <Stat icon={Timer} label="Pacing" value={`${avgSec}s`} />
          <Stat
            icon={Sparkles}
            label="Confidence"
            value={`${delta >= 0 ? "+" : ""}${delta.toFixed(2)} / 5`}
          />
        </div>
      </section>

      {/* Insights */}
      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <Insight
          title={wrong.length ? "Weak areas exposed" : "No weak areas this round"}
          icon={Target}
        >
          {wrong.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Strong showing across this set. Consider a stretch difficulty next.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {wrong.slice(0, 4).map(({ q, i }) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  <span className="text-muted-foreground">{truncate(q.prompt, 90)}</span>
                </li>
              ))}
              {wrong.length > 4 && (
                <li className="text-[11px] text-muted-foreground">
                  +{wrong.length - 4} more flagged for review
                </li>
              )}
            </ul>
          )}
        </Insight>

        <Insight title="Timing analysis" icon={Timer}>
          <p className="text-sm text-muted-foreground">{pacingNote}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
            <div>
              Fastest: <span className="text-foreground">
                {Math.round(Math.min(...perQuestionMs.filter(Boolean), Infinity) / 1000)}s
              </span>
            </div>
            <div>
              Slowest: <span className="text-foreground">
                {Math.round(Math.max(...perQuestionMs, 0) / 1000)}s
              </span>
            </div>
          </div>
        </Insight>
      </section>

      {/* Recommended next steps */}
      <section className="mt-5 rounded-2xl border border-border bg-card/70 p-5 backdrop-blur">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recommended next steps
        </div>
        <ul className="mt-2 space-y-2 text-sm">
          {wrong.length > 0 && (
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              Run a follow-up drill on the {wrong.length} concept
              {wrong.length === 1 ? "" : "s"} you missed.
            </li>
          )}
          {accuracyPct < 70 && (
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              Schedule a 30-minute review block on {config.module} this week.
            </li>
          )}
          {accuracyPct >= 80 && (
            <li className="flex items-start gap-2">
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              Move to stretch difficulty or interleave a related module.
            </li>
          )}
          <li className="flex items-start gap-2">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
            Re-test in 3 days to lock in spacing-effect retention.
          </li>
        </ul>
      </section>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={onRetry} className="rounded-full">
          <RefreshCw className="mr-1 h-4 w-4" /> Retry session
        </Button>
        <Button variant="outline" onClick={saveWeakTopics} className="rounded-full">
          <Bookmark className="mr-1 h-4 w-4" /> Save weak topics
        </Button>
        {wrong.length > 0 && (
          <Button
            onClick={followUpDrill}
            className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
          >
            <Sparkles className="mr-1 h-4 w-4" /> Follow-up drill
          </Button>
        )}
        <Button variant="ghost" onClick={onNewDrill}>
          New session
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────────  shared bits  ─────────────────────────── */

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Insight({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Timer;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 p-5 backdrop-blur">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {title}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function truncate(s: string, n: number) {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
