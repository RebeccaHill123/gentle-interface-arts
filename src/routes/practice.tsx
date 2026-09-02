import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  AlertTriangle,
  Flag,
  ChevronLeft,
  Play,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { loadPlan } from "@/lib/plan-store";
import {
  recordStudyActivity,
  recordGradedAttempts,
  makeIdempotencyKey,
  flushStudyLogQueue,
} from "@/lib/study-log";
import {
  PRACTICE_CONFIG_KEY,
  PROVIDER_MAX_QUESTIONS,
  configFingerprint,
  resolvePracticeConfig,
  type PracticeConfig,
  type PracticeSearch,
} from "@/lib/practice/config";
import { validateQuizQuestions, type QuizQuestion } from "@/lib/practice/quiz-validate";
import {
  ACTIVE_MAX_AGE_MS,
  ACTIVE_SNAPSHOT_VERSION,
  applyElapsed,
  validateSnapshot,

  buildFinalSnapshot,
  clearSnapshot,
  completionAccepted,
  computeDeadline,
  decideRestore,
  describeCompletion,
  emptyCompletion,
  formatRemaining,
  isExpired,
  markWriteThrew,
  mergeWriteOutcome,
  pendingParts,
  persistSnapshot,
  readSnapshotRaw,
  remainingMs,
  restoreTiming,
  timingBound,
  type ActiveSnapshot,
  type CompletionStatus,
  type FinalSnapshot,
} from "@/lib/practice/session";

function newSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function fingerprint(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return `q_${(h >>> 0).toString(36)}`;
}

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
          "Adaptive interactive practice for the SQE and the US bar (UBE) — one question at a time, with session timing, scoring and feedback.",
      },
    ],
  }),
});

type Phase = "loading" | "launch" | "quiz" | "results" | "error";

const THINKING = [
  "Reading your confidence map…",
  "Scanning recent mock accuracy…",
  "Weighting high-yield subtopics…",
  "Calibrating difficulty…",
  "Composing exam-style items…",
];

function PracticeSessionPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [config, setConfig] = useState<PracticeConfig | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [thinkIdx, setThinkIdx] = useState(0);

  // quiz state (refs mirror everything the finalisation path must read synchronously)
  const [feedbackMode, setFeedbackMode] = useState<"immediate" | "end">("immediate");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());
  const [perQuestionMs, setPerQuestionMs] = useState<number[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());
  const [confidenceBefore, setConfidenceBefore] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string>(() => newSessionId());
  const [examPath, setExamPath] = useState<string | undefined>(undefined);
  const [completion, setCompletion] = useState<CompletionStatus | null>(null);
  const [finalSnapshot, setFinalSnapshot] = useState<FinalSnapshot | null>(null);
  const [retrying, setRetrying] = useState(false);
  const retryLockRef = useRef(false);

  const questionsRef = useRef<QuizQuestion[]>([]);
  const answersRef = useRef<(number | null)[]>([]);
  const perRef = useRef<number[]>([]);
  const currentRef = useRef(0);
  const questionStartRef = useRef<number | null>(null);
  const sessionIdRef = useRef(sessionId);
  const fingerprintRef = useRef<string>("");
  const finishingRef = useRef(false);
  const configRef = useRef<PracticeConfig | null>(null);
  const examPathRef = useRef<string | undefined>(undefined);
  const completionRef = useRef<CompletionStatus | null>(null);
  const finalRef = useRef<FinalSnapshot | null>(null);
  const feedbackRef = useRef<"immediate" | "end">("immediate");
  const revealedRef = useRef<Set<number>>(new Set());
  const phaseRef = useRef<Phase>("loading");
  const startedAtRef = useRef<number | null>(null);
  const deadlineRef = useRef<number | null>(null);

  const snapshotNow = useCallback((): ActiveSnapshot | null => {
    const cfg = configRef.current;
    if (!cfg || questionsRef.current.length === 0) return null;
    const p = phaseRef.current;
    if (p !== "launch" && p !== "quiz" && p !== "results") return null;
    return {
      version: ACTIVE_SNAPSHOT_VERSION,
      sessionId: sessionIdRef.current,
      fingerprint: fingerprintRef.current,
      config: cfg,
      questions: questionsRef.current,
      answers: answersRef.current,
      revealed: Array.from(revealedRef.current),
      feedbackMode: feedbackRef.current,
      current: currentRef.current,
      perQuestionMs: perRef.current,
      questionStartedAt: p === "quiz" ? questionStartRef.current : null,
      startedAt: startedAtRef.current,
      deadlineAt: deadlineRef.current,
      phase: p,
      completion: completionRef.current,
      finalSnapshot: finalRef.current,
      updatedAt: Date.now(),
    };
  }, []);

  const persist = useCallback(() => {
    const snap = snapshotNow();
    if (snap) persistSnapshot(snap);
  }, [snapshotNow]);

  function setPhaseTracked(p: Phase) {
    phaseRef.current = p;
    setPhase(p);
  }

  // ───────── load config, restore or generate exactly once
  useEffect(() => {
    let cancelled = false;
    let storedRaw: string | null = null;
    try {
      storedRaw = sessionStorage.getItem(PRACTICE_CONFIG_KEY);
    } catch {}

    const resolution = resolvePracticeConfig({ search, storedRaw });
    if (resolution.kind !== "none" && resolution.consumeStored) {
      // Consume the launcher config so a completed session can never be reused.
      try {
        sessionStorage.removeItem(PRACTICE_CONFIG_KEY);
      } catch {}
    }

    // A reload of a launcher-started session has no search params and the
    // stored config was already consumed — recover the config from the durable
    // snapshot rather than discarding in-progress work.
    let cfg: PracticeConfig | null = resolution.kind === "none" ? null : resolution.config;
    let fp: string | null = cfg ? configFingerprint(cfg) : null;
    const snapshotRaw = readSnapshotRaw();
    if (!cfg) {
      const snap = validateSnapshot(snapshotRaw);
      const fresh = snap && Date.now() - snap.updatedAt <= ACTIVE_MAX_AGE_MS;
      const settled = !!snap?.completion && completionAccepted(snap.completion);
      if (snap && fresh && !settled) {
        cfg = snap.config;
        fp = snap.fingerprint;
      }
    }

    if (!cfg || !fp) {
      setPhaseTracked("error");
      setError("No practice session was queued. Start one from Mocks & Practice.");
      return;
    }

    configRef.current = cfg;
    setConfig(cfg);
    fingerprintRef.current = fp;

    const plan = loadPlan();
    const mod = plan?.input.modules.find((m) => m.name === cfg!.module);
    setConfidenceBefore(mod?.confidence ?? null);
    const examType = (plan?.input.examType ?? "SQE1") as "SQE1" | "SQE2" | "UBE" | "MPRE";
    examPathRef.current = plan?.input.examType ?? undefined;
    setExamPath(plan?.input.examType ?? undefined);

    const decision = decideRestore({ raw: snapshotRaw, fingerprint: fp, now: Date.now() });

    if (decision.action === "restore") {
      const s = decision.snapshot;
      sessionIdRef.current = s.sessionId;
      setSessionId(s.sessionId);
      questionsRef.current = s.questions;
      setQuestions(s.questions);
      answersRef.current = s.answers;
      setAnswers(s.answers);
      revealedRef.current = new Set(s.revealed);
      setRevealedSet(new Set(s.revealed));
      feedbackRef.current = s.feedbackMode;
      setFeedbackMode(s.feedbackMode);
      currentRef.current = s.current;
      setCurrent(s.current);
      startedAtRef.current = s.startedAt;
      setStartedAt(s.startedAt);
      deadlineRef.current = s.deadlineAt;
      setDeadlineAt(s.deadlineAt);
      completionRef.current = s.completion;
      setCompletion(s.completion);
      finalRef.current = s.finalSnapshot;
      setFinalSnapshot(s.finalSnapshot);
      // Recover the live interval exactly once (bounded by the deadline).
      const timing = restoreTiming({ snapshot: s, now: Date.now() });
      perRef.current = timing.perQuestionMs;
      setPerQuestionMs(timing.perQuestionMs);
      questionStartRef.current = timing.questionStartedAt;
      setNow(Date.now());
      if (s.phase === "results") finishingRef.current = true;
      setPhaseTracked(s.phase);
      // Restored: the provider is never called.
      return () => {
        cancelled = true;
      };
    }

    clearSnapshot();
    setFeedbackMode(cfg.feedbackMode ?? "immediate");
    feedbackRef.current = cfg.feedbackMode ?? "immediate";

    const tick = setInterval(() => {
      setThinkIdx((i) => Math.min(THINKING.length - 1, i + 1));
    }, 700);

    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("generate-quiz", {
          body: {
            module: cfg.module,
            topic: cfg.topic ?? cfg.formatLabel,
            examType,
            confidence: mod?.confidence ?? 3,
          },
        });
        if (cancelled) return;
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);
        const validated = validateQuizQuestions(data?.questions, cfg.questions);
        if (!validated.ok) throw new Error(validated.error);
        const qs = validated.questions;
        questionsRef.current = qs;
        setQuestions(qs);
        answersRef.current = new Array(qs.length).fill(null);
        setAnswers(answersRef.current);
        perRef.current = new Array(qs.length).fill(0);
        setPerQuestionMs(perRef.current);
        setPhaseTracked("launch");
        persist();
      } catch (e) {
        if (cancelled) return;
        setPhaseTracked("error");
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

  // ───────── authoritative session clock
  useEffect(() => {
    if (phase !== "quiz") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "quiz") return;
    if (isExpired(deadlineAt, now) && !finishingRef.current) {
      void finishSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, phase, deadlineAt]);

  // Bounded periodic timing persistence + persistence on unload.
  useEffect(() => {
    if (phase !== "quiz") return;
    const id = setInterval(persist, 10_000);
    const onHide = () => persist();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [phase, persist]);

  function beginSession() {
    const start = Date.now();
    const cfg = configRef.current;
    startedAtRef.current = start;
    setStartedAt(start);
    const deadline = cfg ? computeDeadline(cfg, start) : null;
    deadlineRef.current = deadline;
    setDeadlineAt(deadline);
    questionStartRef.current = start;
    currentRef.current = 0;
    setCurrent(0);
    revealedRef.current = new Set();
    setRevealedSet(new Set());
    setNow(start);
    setPhaseTracked("quiz");
    persist();
  }

  /** Folds the live question's elapsed interval in exactly once. */
  function accumulateCurrent() {
    const start = questionStartRef.current;
    if (start == null) return;
    const at = Date.now();
    const end = timingBound(deadlineRef.current, at);
    perRef.current = applyElapsed(perRef.current, currentRef.current, end - start);
    questionStartRef.current = at;
    setPerQuestionMs(perRef.current);
  }

  function selectAnswer(optIdx: number) {
    if (feedbackMode === "immediate" && revealedRef.current.has(currentRef.current)) return;
    const next = [...answersRef.current];
    next[currentRef.current] = optIdx;
    answersRef.current = next;
    setAnswers(next);
    if (feedbackMode === "immediate") {
      revealedRef.current = new Set(revealedRef.current).add(currentRef.current);
      setRevealedSet(new Set(revealedRef.current));
    }
    persist();
  }

  function goTo(index: number) {
    accumulateCurrent();
    currentRef.current = index;
    setCurrent(index);
    persist();
  }

  function nextQuestion() {
    if (currentRef.current < questionsRef.current.length - 1) {
      goTo(currentRef.current + 1);
    } else {
      void finishSession();
    }
  }

  function prevQuestion() {
    if (currentRef.current > 0) goTo(currentRef.current - 1);
  }

  async function runWrites(
    snap: FinalSnapshot,
    parts: Array<"activity" | "attempts">,
    startingStatus: CompletionStatus,
  ): Promise<CompletionStatus> {
    const cfg = configRef.current;
    if (!cfg) return startingStatus;
    let status = startingStatus;
    const occurredAt = new Date(snap.occurredAtIso);
    const minutes = Math.max(1, Math.round(snap.totalMs / 60_000));

    const commit = (next: CompletionStatus) => {
      status = next;
      completionRef.current = next;
      setCompletion(next);
      persist();
    };

    if (parts.includes("activity")) {
      try {
        const result = await recordStudyActivity({
          idempotencyKey: makeIdempotencyKey("practice", snap.sessionId),
          activityType: "quiz",
          source: "practice",
          actualMinutes: minutes,
          occurredAt,
          subject: cfg.module,
          subtopic: cfg.topic ?? undefined,
          examPath: examPathRef.current ?? null,
          gradedAccuracy: snap.accuracy,
          note: `${cfg.formatLabel} · ${snap.correct}/${snap.total}`,
        });
        commit(mergeWriteOutcome(status, "activity", result));
      } catch (e) {
        console.warn("practice activity write threw", e);
        commit(markWriteThrew(status, "activity", "We couldn't record this session yet."));
      }
    }

    if (parts.includes("attempts")) {
      try {
        const attempts = questionsRef.current.map((q, i) => {
          const selected = snap.answers[i] ?? null;
          return {
            idempotencyKey: makeIdempotencyKey("practice-attempt", snap.sessionId, i),
            sourceType: "practice" as const,
            sourceRef: snap.sessionId,
            questionFingerprint: fingerprint(q.prompt ?? String(i)),
            subject: cfg.module,
            subtopic: cfg.topic ?? undefined,
            occurredAt,
            isCorrect: selected != null && selected === q.correctIndex,
            selectedAnswer: selected != null ? String.fromCharCode(65 + selected) : null,
            durationSeconds: Math.round((snap.perQuestionMs[i] ?? 0) / 1000),
            examPath: examPathRef.current ?? null,
          };
        });
        const result = await recordGradedAttempts(attempts);
        commit(mergeWriteOutcome(status, "attempts", result));
      } catch (e) {
        console.warn("practice attempts write threw", e);
        commit(markWriteThrew(status, "attempts", "We couldn't record your answers yet."));
      }
    }

    if (completionAccepted(status) && !status.activityQueuedOnly && !status.attemptsQueuedOnly) {
      clearSnapshot();
    }
    return status;
  }

  async function finishSession() {
    const cfg = configRef.current;
    if (!cfg) return;
    if (finishingRef.current) {
      setPhaseTracked("results");
      return;
    }
    finishingRef.current = true;

    const snap = buildFinalSnapshot({
      sessionId: sessionIdRef.current,
      questions: questionsRef.current,
      answers: answersRef.current,
      perQuestionMs: perRef.current,
      current: currentRef.current,
      questionStartedAt: questionStartRef.current,
      startedAt: startedAtRef.current,
      deadlineAt: deadlineRef.current,
      now: Date.now(),
    });
    questionStartRef.current = null;
    perRef.current = snap.perQuestionMs;
    setPerQuestionMs(snap.perQuestionMs);
    finalRef.current = snap;
    setFinalSnapshot(snap);
    const initial = emptyCompletion();
    completionRef.current = initial;
    setCompletion(initial);
    setPhaseTracked("results");
    persist();

    await runWrites(snap, ["activity", "attempts"], initial);
  }

  /** Re-runs only the components that were never accepted, with the original keys. */
  async function retryCompletion() {
    const snap = finalRef.current;
    const status = completionRef.current;
    // Ref lock: guards the window before setRetrying commits.
    if (!snap || !status || retryLockRef.current) return;
    retryLockRef.current = true;
    setRetrying(true);
    try {
      const parts = pendingParts(status);
      let next = status;
      if (parts.length > 0) next = await runWrites(snap, parts, status);
      if (completionAccepted(next) && (next.activityQueuedOnly || next.attemptsQueuedOnly)) {
        const flush = await flushStudyLogQueue();
        if (flush.remaining === 0) {
          const cleared: CompletionStatus = {
            ...next,
            activityQueuedOnly: false,
            attemptsQueuedOnly: false,
          };
          completionRef.current = cleared;
          setCompletion(cleared);
          clearSnapshot();
        }
      }
    } finally {
      retryLockRef.current = false;
      setRetrying(false);
    }
  }

  function restartSession() {
    const id = newSessionId();
    sessionIdRef.current = id;
    setSessionId(id);
    answersRef.current = new Array(questionsRef.current.length).fill(null);
    setAnswers(answersRef.current);
    perRef.current = new Array(questionsRef.current.length).fill(0);
    setPerQuestionMs(perRef.current);
    revealedRef.current = new Set();
    setRevealedSet(new Set());
    completionRef.current = null;
    setCompletion(null);
    finalRef.current = null;
    setFinalSnapshot(null);
    finishingRef.current = false;
    clearSnapshot();
    beginSession();
  }

  const remaining = phase === "quiz" ? remainingMs(deadlineAt, now) : null;
  const subtitle =
    config?.module ??
    (examPath === "UBE" || examPath === "MPRE" ? "Adaptive US bar practice" : "Adaptive practice");

  return (
    <AppShell title="Practice Session" subtitle={subtitle}>
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
          onFeedbackChange={(v) => {
            feedbackRef.current = v;
            setFeedbackMode(v);
            persist();
          }}
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
          remainingLabel={remaining != null ? formatRemaining(remaining) : null}
          lowTime={remaining != null && remaining <= 60_000}
          onSelect={selectAnswer}
          onNext={nextQuestion}
          onPrev={prevQuestion}
          onFinish={() => void finishSession()}
        />
      )}
      {phase === "results" && config && finalSnapshot && (
        <ResultsScreen
          config={config}
          questions={questions}
          final={finalSnapshot}
          confidenceBefore={confidenceBefore}
          completion={completion}
          retrying={retrying}
          onRetryWrites={() => void retryCompletion()}
          onRetry={restartSession}
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
  remainingLabel,
  lowTime,
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
  /** Total time left in the session (authoritative wall clock), or null when untimed. */
  remainingLabel: string | null;
  lowTime: boolean;
  onSelect: (i: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
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

/* ───────────────────────────  RESULTS  ─────────────────────────── */

function ResultsScreen({
  config,
  questions,
  final,
  confidenceBefore,
  completion,
  retrying,
  onRetryWrites,
  onRetry,
  onNewDrill,
}: {
  config: PracticeConfig;
  questions: QuizQuestion[];
  final: FinalSnapshot;
  confidenceBefore: number | null;
  completion: CompletionStatus | null;
  retrying: boolean;
  onRetryWrites: () => void;
  onRetry: () => void;
  onNewDrill: () => void;
}) {
  // Every displayed number comes from the one stable final snapshot.
  const answers = final.answers;
  const perQuestionMs = final.perQuestionMs;
  const positiveMs = perQuestionMs.filter((m) => m > 0);
  const total = final.total;
  const correct = final.correct;
  const accuracy = final.accuracy;
  const accuracyPct = Math.round(accuracy * 100);
  const totalSec = Math.round(final.totalMs / 1000);
  const avgSec = Math.round(totalSec / Math.max(1, total));
  const saveLabel = describeCompletion(completion);
  const recorded = completion ? completionAccepted(completion) : false;

  // Confidence delta (estimate) — only claimed once the activity was accepted.
  const targetConf = Math.max(1, Math.min(5, accuracy * 5));
  const delta =
    confidenceBefore != null
      ? +(0.4 * (targetConf > confidenceBefore ? 1 : -1) *
          Math.min(1, Math.abs(targetConf - confidenceBefore))).toFixed(2)
      : 0;
  const confidenceApplied = completion?.activity === "accepted";

  const wrong = questions
    .map((q, i) => ({ q, i, a: answers[i] }))
    .filter((x) => x.a == null || x.a !== x.q.correctIndex);
  const right = total - wrong.length;

  const pacingNote =
    avgSec > 110
      ? "You took longer than typical exam pacing — try a timed drill next."
      : avgSec < 45
        ? "You moved fast — verify accuracy isn't slipping under speed."
        : "Pacing was within the exam-realistic band.";

  function followUpDrill() {
    const cfg: PracticeConfig = {
      ...config,
      formatLabel: "Follow-up drill",
      questions: Math.min(PROVIDER_MAX_QUESTIONS, Math.max(5, wrong.length || 6)),
      duration: Math.max(10, Math.round((wrong.length || 6) * 1.7)),
      difficulty: "Adaptive",
      rationale: `Targeted drill on the ${wrong.length} concepts you missed in your last ${config.formatLabel}.`,
      reasonBits: ["Recently missed items", config.module],
    };
    try {
      sessionStorage.setItem(PRACTICE_CONFIG_KEY, JSON.stringify(cfg));
    } catch {}
    clearSnapshot();
    // Fresh mount with no search target so the queued follow-up config is used.
    window.location.href = "/practice";
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
              {final.answeredCount < total
                ? ` · ${final.answeredCount} answered, ${total - final.answeredCount} left blank (scored incorrect)`
                : ""}
            </p>
            {!recorded && (
              <p className="mt-1 text-xs text-amber-300">Not fully recorded yet.</p>
            )}
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
            label={confidenceApplied ? "Confidence" : "Confidence (pending)"}
            value={
              confidenceApplied ? `${delta >= 0 ? "+" : ""}${delta.toFixed(2)} / 5` : "not yet applied"
            }
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
          {positiveMs.length === 0 ? (
            <p className="mt-3 text-[11px] text-muted-foreground">— No timing data for this session yet.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div>
                Fastest: <span className="text-foreground">
                  {Math.round(Math.min(...positiveMs) / 1000)}s
                </span>
              </div>
              <div>
                Slowest: <span className="text-foreground">
                  {Math.round(Math.max(...positiveMs) / 1000)}s
                </span>
              </div>
            </div>
          )}
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

      {saveLabel && (
        <section
          className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm ${
            saveLabel.tone === "ok"
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
              : saveLabel.tone === "queued"
                ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                : "border-rose-400/40 bg-rose-400/10 text-rose-200"
          }`}
        >
          <span className="min-w-0">
            <span className="font-medium">{saveLabel.title}</span> — {saveLabel.detail}
          </span>
          {saveLabel.tone !== "ok" && (
            <Button
              size="sm"
              variant="outline"
              disabled={retrying}
              onClick={onRetryWrites}
              className="rounded-full"
            >
              {retrying ? "Retrying…" : "Retry"}
            </Button>
          )}
        </section>
      )}

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" onClick={onRetry} className="rounded-full">
          <RefreshCw className="mr-1 h-4 w-4" /> Retry session
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
