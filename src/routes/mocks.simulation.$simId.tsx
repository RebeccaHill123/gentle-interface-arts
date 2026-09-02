import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Clock,
  CheckCircle2,
  
  Pause,
  Play,
  Menu,
  FileText,
  Library,
  Scale,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  getBlueprint,
  getSection,
  type SectionBlueprint,
} from "@/lib/full-mock-blueprints";
import {
  generateQuestionsForSection,
  type EssayQuestion,
  type MCQQuestion,
  type MPTQuestion,
} from "@/lib/full-mock-questions";
import {
  completeSection,
  completeSimulation,
  loadSimulation,
  saveSectionTiming,
  sectionElapsedSeconds,
  sectionTimer,
  startSection,
  upsertAnswer,
  upsertAnswers,
  type DbAnswer,
  type DbSection,
  type DbSimulation,
} from "@/lib/full-mock-store";
import {
  elapsedSecondsFrom,
  finalAnswerSnapshot,
  hasContent,
  isSimulationFullyComplete,
  makeTimerState,
  mcqSectionScore,
  mergeAnswerState,
  mockActivityKeyParts,
  objectiveScore,
  pauseTimer,
  remainingSecondsFrom,
  resolveTimerState,
  resumeTimer,
  sectionScoreLabel,
  totalElapsedSeconds,
  type LocalAnswer,
  type LocalAnswerState,
  type TimerState,
} from "@/lib/mock-integrity";
import { adjustModuleConfidence } from "@/lib/plan-store";
import { recordStudyActivity, makeIdempotencyKey, flushStudyLogQueue, type WriteResult } from "@/lib/study-log";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/mocks/simulation/$simId")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: SimulationPage,
  head: () => ({
    meta: [
      { title: "Full Exam Simulation · Tentra" },
      {
        name: "description",
        content: "Realistic full-length mock exam simulation with timed sections.",
      },
    ],
  }),
});

type LocalState = LocalAnswerState; // keyed by question_id

const LS_PREFIX = "tentra.fullmock.";
const lsKey = (simId: string) => `${LS_PREFIX}${simId}`;
const timerKey = (simId: string, sectionId: string) =>
  `${LS_PREFIX}timer.${simId}.${sectionId}`;

function loadLocal(simId: string): LocalState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(lsKey(simId));
    return raw ? (JSON.parse(raw) as LocalState) : {};
  } catch {
    return {};
  }
}
function saveLocal(simId: string, state: LocalState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(lsKey(simId), JSON.stringify(state));
  } catch {}
}

function loadCachedTimer(simId: string, sectionId: string): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(timerKey(simId, sectionId));
    return raw ? (JSON.parse(raw) as TimerState) : null;
  } catch {
    return null;
  }
}
function saveCachedTimer(simId: string, sectionId: string, timer: TimerState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(timerKey(simId, sectionId), JSON.stringify(timer));
  } catch {}
}
function clearCachedTimer(simId: string, sectionId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(timerKey(simId, sectionId));
  } catch {}
}



function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

function SimulationPage() {
  const { simId } = Route.useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sim, setSim] = useState<DbSimulation | null>(null);
  const [sections, setSections] = useState<DbSection[]>([]);
  const [answers, setAnswers] = useState<DbAnswer[]>([]);
  const [phase, setPhase] = useState<"overview" | "section" | "results">(
    "overview",
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeTimer, setActiveTimer] = useState<TimerState | null>(null);
  const [local, setLocal] = useState<LocalState>({});
  const [exitConfirm, setExitConfirm] = useState(false);
  const [mockSaveResult, setMockSaveResult] = useState<WriteResult | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  // Immediate lock: state updates do not flush fast enough to stop a double click.
  const finalizeLock = useRef(false);
  const finalizedRef = useRef(false);

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await loadSimulation(simId);
      if (!data) {
        toast.error("Simulation not found.");
        navigate({ to: "/mocks" });
        return;
      }
      setSim(data.simulation);
      setSections(data.sections);
      setAnswers(data.answers);
      // Recover answers persisted from any device; a newer local draft wins.
      const merged = mergeAnswerState({
        db: data.answers,
        local: loadLocal(simId),
      });
      setLocal(merged);
      saveLocal(simId, merged);
      if (data.simulation.status === "completed") {
        finalizedRef.current = true;
        setPhase("results");
      }
    } catch (err) {
      console.error("[mock] load failed", err);
      setLoadError(
        err instanceof Error
          ? err.message
          : "We couldn't load this simulation. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [simId, navigate]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Browser-close guard while a section is in progress
  useEffect(() => {
    if (phase !== "section") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const blueprint = useMemo(() => (sim ? getBlueprint(sim.pathway) : null), [sim]);

  const updateLocal = useCallback(
    (questionId: string, patch: Partial<LocalAnswer>) => {
      setLocal((prev) => {
        const next = { ...prev, [questionId]: { ...prev[questionId], ...patch } };
        saveLocal(simId, next);
        return next;
      });
    },
    [simId],
  );

  /**
   * The one canonical finalisation route. Both "last section submitted" and
   * "View results" go through here, so the completion record cannot be
   * bypassed and cannot be written twice.
   */
  const finalizeSimulation = useCallback(
    async (allSections: DbSection[]) => {
      if (!sim || !blueprint) return;
      if (finalizeLock.current) return;
      finalizeLock.current = true;
      setFinalizing(true);
      setFinalizeError(null);
      try {
        if (!isSimulationFullyComplete(allSections)) {
          // Partial exams stay in progress: never recorded as a completed mock.
          setPhase("overview");
          return;
        }
        const totalSeconds = totalElapsedSeconds(
          allSections.map((s) => ({ elapsedSeconds: sectionElapsedSeconds(s) })),
        );
        const objective = objectiveScore(
          allSections.map((s) => {
            const bp = getSection(sim.pathway, s.section_type);
            const sectionAnswers = answers.filter((a) => a.section_id === s.id);
            return {
              kind: bp?.kind ?? "mcq",
              graded: sectionAnswers.filter((a) => a.is_correct != null).length,
              correct: sectionAnswers.filter((a) => a.is_correct === true).length,
            };
          }),
        );
        if (!finalizedRef.current || sim.status !== "completed") {
          await completeSimulation(sim.id, objective.percent, totalSeconds);
        }
        finalizedRef.current = true;
        setSim({
          ...sim,
          status: "completed",
          overall_score: objective.percent,
          total_time_seconds: totalSeconds,
          completed_at: sim.completed_at ?? new Date().toISOString(),
        });
        // One canonical activity record, keyed by the simulation, so refreshes
        // and retries cannot double-count it.
        const result = await recordStudyActivity({
          idempotencyKey: makeIdempotencyKey(...mockActivityKeyParts(sim.id)),
          activityType: "mock",
          source: "mock",
          actualMinutes: Math.round(totalSeconds / 60),
          examPath: blueprint.examType,
          subject: blueprint.examType,
          note: `${blueprint.examType} — full simulation completed`,
          metadata: {
            pathway: sim.pathway,
            overallScore: objective.percent,
            gradedQuestions: objective.graded,
            ungradedWrittenSections: objective.excludedWrittenSections,
          },
        });
        setMockSaveResult(result);
        if (!result.ok && result.queued) {
          toast.warning(
            "Saved on this device — we'll sync your results when you're back online.",
          );
        }
        setPhase("results");
      } catch (err) {
        console.error("[mock] finalise failed", err);
        setFinalizeError(
          err instanceof Error
            ? err.message
            : "We couldn't finalise your results. Please try again.",
        );
        setPhase("overview");
      } finally {
        setFinalizing(false);
        finalizeLock.current = false;
      }
    },
    [sim, blueprint, answers],
  );


  // Render
  if (loading) {
    return (
      <AppShell title="Loading simulation…">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (loadError || !sim || !blueprint) {
    return (
      <AppShell title="Simulation">
        <section className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold">We couldn't load this simulation</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loadError ?? "Your work is safe on this device."}
          </p>
          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => {
                setLoading(true);
                void reload();
              }}
              className="rounded-full"
            >
              Try again
            </Button>
            <Button variant="ghost" onClick={() => navigate({ to: "/mocks" })} className="rounded-full">
              Back to mocks
            </Button>
          </div>
        </section>
      </AppShell>
    );
  }

  if (phase === "results") {
    return (
      <ResultsView
        sim={sim}
        sections={sections}
        answers={answers}
        saveResult={mockSaveResult}
        onRetrySave={() => {
          flushStudyLogQueue().then((r) => {
            setMockSaveResult(r.remaining === 0 ? { ok: true, queued: false } : { ok: false, queued: true });
          });
        }}
        onRetake={() => navigate({ to: "/mocks" })}
      />
    );
  }

  if (phase === "section" && activeSectionId) {
    const dbSection = sections.find((s) => s.id === activeSectionId)!;
    const bpSection = getSection(sim.pathway, dbSection.section_type)!;
    return (
      <SectionRunner
        sim={sim}
        dbSection={dbSection}
        bpSection={bpSection}
        initialTimer={activeTimer}
        local={local}
        updateLocal={updateLocal}
        onExit={() => setExitConfirm(true)}
        onSubmitted={async (updatedSection, sectionAnswers) => {
          const nextSections = sections.map((s) =>
            s.id === updatedSection.id ? updatedSection : s,
          );
          setSections(nextSections);
          setAnswers((prev) => {
            const ids = new Set(sectionAnswers.map((a) => a.question_id));
            const filtered = prev.filter(
              (a) =>
                !(a.section_id === updatedSection.id && ids.has(a.question_id)),
            );
            return [...filtered, ...sectionAnswers];
          });
          setActiveSectionId(null);
          setActiveTimer(null);
          setPhase("overview");
          if (isSimulationFullyComplete(nextSections)) {
            // Same canonical route as the "View results" button.
            await finalizeSimulation(nextSections);
          }
        }}
      />
    );
  }


  // OVERVIEW
  return (
    <>
      <AppShell
        title={blueprint.examType}
        subtitle={`${blueprint.totalDurationLabel} · ${sim.mode === "exam" ? "Exam mode" : "Practice mode"}`}
      >
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-pink-blue opacity-25 blur-3xl" />
          <div className="relative">
            <Badge className="rounded-full bg-pink/15 text-pink hover:bg-pink/15">
              {sim.mode === "exam" ? "Exam mode" : "Practice mode"}
            </Badge>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Your sections
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete each section in order. Answers autosave to your account.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {sections.map((s, idx) => {
            const bp = getSection(sim.pathway, s.section_type)!;
            const sectionAnswers = answers.filter((a) => a.section_id === s.id);
            const answered = sectionAnswers.filter(
              (a) => a.answer_value || a.essay_text,
            ).length;
            const done = s.status === "completed";
            const canStart =
              idx === 0 || sections[idx - 1].status === "completed";
            return (
              <div
                key={s.id}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-card/70 p-6 backdrop-blur",
                  done
                    ? "border-emerald-500/30"
                    : canStart
                      ? "border-border hover:border-pink/40"
                      : "border-border/60 opacity-70",
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Section {idx + 1}
                    </div>
                    <div className="mt-1 text-lg font-semibold">{s.title}</div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {bp.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5">
                        <Clock className="h-3 w-3" /> {formatTime(bp.durationSeconds)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5">
                        {bp.questions} {bp.kind === "mcq" ? "Qs" : bp.kind === "essay" ? "essays" : "tasks"}
                      </span>
                      {done && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-500">
                          <CheckCircle2 className="h-3 w-3" /> Completed
                          {s.score != null && ` · ${Math.round(Number(s.score))}%`}
                        </span>
                      )}
                      {!done && answered > 0 && (
                        <span className="rounded-full bg-pink/15 px-2 py-0.5 text-pink">
                          {answered}/{bp.questions} saved
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
                    <Scale className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    disabled={!canStart || done}
                    onClick={async () => {
                      try {
                        const now = Date.now();
                        const { timer } = await startSection(s.id, { nowMs: now });
                        const resolved = resolveTimerState({
                          mode: sim.mode,
                          stored: timer,
                          cached: loadCachedTimer(simId, s.id),
                          startedAtIso: s.started_at,
                          nowMs: now,
                        });
                        saveCachedTimer(simId, s.id, resolved);
                        setActiveTimer(resolved);
                        setActiveSectionId(s.id);
                        setPhase("section");
                      } catch (err) {
                        console.error("[mock] start section failed", err);
                        toast.error(
                          err instanceof Error
                            ? err.message
                            : "Could not open this section. Please try again.",
                        );
                      }
                    }}
                    className="rounded-full"
                  >
                    {done ? "Completed" : canStart ? "Start section" : "Locked"}
                  </Button>
                </div>
              </div>
            );
          })}
        </section>

        {finalizeError && (
          <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <span>{finalizeError} Your work is saved.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void finalizeSimulation(sections)}
              className="rounded-full"
            >
              Retry
            </Button>
          </section>
        )}

        <div className="mt-6 flex justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate({ to: "/mocks" })}>
            Back to mocks
          </Button>
          {isSimulationFullyComplete(sections) && (
            <Button
              disabled={finalizing}
              onClick={() => void finalizeSimulation(sections)}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
            >
              {finalizing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalising
                </>
              ) : (
                <>View results</>
              )}
            </Button>
          )}
        </div>

      </AppShell>

      <AlertDialog open={exitConfirm} onOpenChange={setExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exit simulation?</AlertDialogTitle>
            <AlertDialogDescription>
              Your answers are saved. You can resume this simulation later from
              the mocks page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => navigate({ to: "/mocks" })}>
              Exit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =============================================================================
// SECTION RUNNER

function SectionRunner({
  sim,
  dbSection,
  bpSection,
  initialTimer,
  local,
  updateLocal,
  onExit,
  onSubmitted,
}: {
  sim: DbSimulation;
  dbSection: DbSection;
  bpSection: SectionBlueprint;
  initialTimer: TimerState | null;
  local: LocalState;
  updateLocal: (questionId: string, patch: Partial<LocalAnswer>) => void;
  onExit: () => void;
  onSubmitted: (updatedSection: DbSection, answers: DbAnswer[]) => Promise<void>;
}) {
  const questions = useMemo(
    () => generateQuestionsForSection(sim.pathway, bpSection),
    [sim.pathway, bpSection],
  );
  const items: (MCQQuestion | EssayQuestion | MPTQuestion)[] = useMemo(() => {
    if (bpSection.kind === "mcq") return questions.mcq ?? [];
    if (bpSection.kind === "essay") return questions.essay ?? [];
    return questions.mpt ?? [];
  }, [bpSection.kind, questions]);

  const isExam = sim.mode === "exam";

  // Authoritative timer: derived from persisted timestamps, so backgrounding
  // the tab or reloading the page can never hand back time.
  const [timer, setTimer] = useState<TimerState>(() =>
    resolveTimerState({
      mode: sim.mode,
      stored: initialTimer ?? sectionTimer(dbSection),
      cached: loadCachedTimer(sim.id, dbSection.id),
      startedAtIso: dbSection.started_at,
      nowMs: Date.now(),
    }),
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"synced" | "local">("synced");
  const submitLock = useRef(false);
  const [idx, setIdx] = useState(0);
  const questionEnteredAt = useRef(Date.now());

  const secondsLeft = remainingSecondsFrom(timer, bpSection.durationSeconds, nowMs);
  const paused = timer.pausedAtMs != null;
  const elapsed = elapsedSecondsFrom(timer, nowMs);

  // Wall-clock refresh: recompute rather than decrement.
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const persistTimer = useCallback(
    (next: TimerState, atMs: number) => {
      setTimer(next);
      saveCachedTimer(sim.id, dbSection.id, next);
      void saveSectionTiming(
        dbSection.id,
        next,
        elapsedSecondsFrom(next, atMs),
      ).catch((err) => {
        console.error("[mock] timer save failed", err);
        setSaveState("local");
      });
    },
    [sim.id, dbSection.id],
  );

  // Keep the persisted running elapsed roughly current so a crash mid-section
  // does not report the planned duration later.
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      const at = Date.now();
      saveCachedTimer(sim.id, dbSection.id, timer);
      void saveSectionTiming(dbSection.id, timer, elapsedSecondsFrom(timer, at)).catch(
        () => setSaveState("local"),
      );
    }, 60_000);
    return () => clearInterval(t);
  }, [paused, timer, sim.id, dbSection.id]);

  // Auto-submit when the clock runs out — the same finalisation path as the button.
  useEffect(() => {
    if (secondsLeft === 0 && !submitLock.current) {
      toast.message("Time's up — auto-submitting your section.");
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);


  const current = items[idx];
  const currentId = current.id;
  const currentLocal = local[currentId] ?? {};

  const answerInputFor = (q: { id: string }, la: LocalAnswer) => {
    const isMcq = bpSection.kind === "mcq";
    return {
      questionId: q.id,
      answerValue: isMcq && la.answerIndex != null ? String(la.answerIndex) : null,
      essayText: !isMcq ? la.essayText ?? null : null,
      isFlagged: la.isFlagged ?? false,
      timeSpentSeconds: la.timeSpentSeconds ?? 0,
      isCorrect:
        isMcq && la.answerIndex != null
          ? la.answerIndex === (q as MCQQuestion).correctIndex
          : null,
    };
  };

  /** Autosave on navigation. Local drafts are always kept; failures surface. */
  const persistCurrent = (extraSeconds: number) => {
    const la: LocalAnswer = {
      ...currentLocal,
      timeSpentSeconds: (currentLocal.timeSpentSeconds ?? 0) + extraSeconds,
    };
    updateLocal(currentId, { timeSpentSeconds: la.timeSpentSeconds });
    void upsertAnswer({
      simulationId: sim.id,
      sectionId: dbSection.id,
      ...answerInputFor(current, la),
    })
      .then(() => setSaveState("synced"))
      .catch((err) => {
        console.error("[mock] autosave failed", err);
        setSaveState("local");
      });
  };

  const consumeQuestionTime = () => {
    const now = Date.now();
    const spent = Math.round((now - questionEnteredAt.current) / 1000);
    questionEnteredAt.current = now;
    return Math.max(0, spent);
  };

  const trackTimeAndAdvance = (delta: number) => {
    persistCurrent(consumeQuestionTime());
    setIdx((i) => Math.max(0, Math.min(items.length - 1, i + delta)));
  };

  const jumpTo = (n: number) => {
    persistCurrent(consumeQuestionTime());
    setIdx(n);
  };

  async function submit() {
    // Immediate lock: state updates do not flush fast enough to stop a double click.
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setSubmitError(null);

    const nowAt = Date.now();
    const extra = consumeQuestionTime();
    // Include the live current answer even if React state has not flushed.
    const snapshot = finalAnswerSnapshot({
      local,
      currentQuestionId: currentId,
      currentAnswer: currentLocal,
      extraSecondsOnCurrent: extra,
    });

    const isMcq = bpSection.kind === "mcq";
    let correctCount = 0;
    const answerInputs = items.map((q) => {
      const la = snapshot[q.id] ?? {};
      const input = answerInputFor(q, la);
      if (isMcq && input.isCorrect) correctCount++;
      return input;
    });

    const elapsedSeconds = elapsedSecondsFrom(timer, nowAt);
    // Unanswered MCQs count as incorrect: denominator is every question.
    const sectionScore = isMcq
      ? mcqSectionScore({ totalQuestions: items.length, correct: correctCount })
      : null;

    try {
      // Durable answers first, completion only after they land.
      await upsertAnswers({
        simulationId: sim.id,
        sectionId: dbSection.id,
        answers: answerInputs,
      });
      await completeSection(dbSection.id, sectionScore, elapsedSeconds, timer);
    } catch (err) {
      console.error("[mock] section submit failed", err);
      // Stay in the section, keep every local draft, allow a retry.
      setSubmitError(
        err instanceof Error
          ? err.message
          : "We couldn't submit this section. Your answers are saved on this device.",
      );
      setSaveState("local");
      setSubmitting(false);
      submitLock.current = false;
      return;
    }

    setSaveState("synced");
    clearCachedTimer(sim.id, dbSection.id);
    toast.success("Section submitted.");

    const dbAnswers: DbAnswer[] = answerInputs.map((a) => ({
      id: `${dbSection.id}-${a.questionId}`,
      simulation_id: sim.id,
      section_id: dbSection.id,
      question_id: a.questionId,
      answer_value: a.answerValue,
      essay_text: a.essayText,
      is_flagged: a.isFlagged,
      time_spent_seconds: a.timeSpentSeconds,
      is_correct: a.isCorrect,
      metadata: {},
    }));

    const updated: DbSection = {
      ...dbSection,
      status: "completed",
      completed_at: new Date().toISOString(),
      score: sectionScore,
      metadata: { ...(dbSection.metadata ?? {}), timer, elapsedSeconds },
    };
    await onSubmitted(updated, dbAnswers);
  }


  return (
    <AppShell title={bpSection.title} subtitle={`Section · ${bpSection.kind === "mcq" ? "Multiple choice" : bpSection.kind === "essay" ? "Essay" : "Performance test"}`}>
      {/* Header bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-border bg-card/85 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">
            Question {idx + 1} of {items.length}
          </div>
          <Progress value={((idx + 1) / items.length) * 100} className="mt-2 h-1.5 w-48" />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="rounded-full">
            <Clock className="mr-1 h-3 w-3" /> {formatTime(secondsLeft)}
          </Badge>
          {!isExam && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPaused((p) => !p)}
              className="rounded-full"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          )}
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full md:hidden">
                <Menu className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Question palette</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 pb-6">
                <Palette items={items} local={local} idx={idx} jumpTo={jumpTo} />
              </div>
            </DrawerContent>
          </Drawer>
          <Button variant="ghost" size="sm" onClick={onExit} className="rounded-full">
            Exit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          {bpSection.kind === "mcq" && (
            <MCQItem
              q={current as MCQQuestion}
              optionsCount={bpSection.optionsCount}
              selectedIndex={currentLocal.answerIndex}
              isFlagged={currentLocal.isFlagged ?? false}
              onSelect={(i) => updateLocal(currentId, { answerIndex: i })}
              onFlag={() =>
                updateLocal(currentId, { isFlagged: !currentLocal.isFlagged })
              }
            />
          )}
          {bpSection.kind === "essay" && (
            <EssayItem
              q={current as EssayQuestion}
              text={currentLocal.essayText ?? ""}
              isFlagged={currentLocal.isFlagged ?? false}
              onText={(t) => updateLocal(currentId, { essayText: t })}
              onFlag={() =>
                updateLocal(currentId, { isFlagged: !currentLocal.isFlagged })
              }
            />
          )}
          {bpSection.kind === "mpt" && (
            <MPTItem
              q={current as MPTQuestion}
              text={currentLocal.essayText ?? ""}
              isFlagged={currentLocal.isFlagged ?? false}
              onText={(t) => updateLocal(currentId, { essayText: t })}
              onFlag={() =>
                updateLocal(currentId, { isFlagged: !currentLocal.isFlagged })
              }
            />
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              disabled={idx === 0}
              onClick={() => trackTimeAndAdvance(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <div className="text-xs text-muted-foreground">
              {currentLocal.answerIndex != null || currentLocal.essayText ? "Saved" : "Not answered"}
            </div>
            {idx < items.length - 1 ? (
              <Button
                onClick={() => trackTimeAndAdvance(1)}
                className="rounded-full bg-gradient-pink-blue text-primary-foreground"
              >
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={submitting}
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting
                  </>
                ) : (
                  <>Submit section</>
                )}
              </Button>
            )}
          </div>
        </div>

        <aside className="hidden md:block">
          <div className="sticky top-24 rounded-2xl border border-border bg-card/70 p-4 backdrop-blur">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Palette
              </div>
              <div className="text-xs text-muted-foreground">
                {Object.values(local).filter((l) => l.answerIndex != null || l.essayText).length}/{items.length}
              </div>
            </div>
            <Palette items={items} local={local} idx={idx} jumpTo={jumpTo} />
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function Palette({
  items,
  local,
  idx,
  jumpTo,
}: {
  items: { id: string }[];
  local: LocalState;
  idx: number;
  jumpTo: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
      {items.map((q, i) => {
        const la = local[q.id] ?? {};
        const answered = la.answerIndex != null || (la.essayText && la.essayText.length > 0);
        const flagged = la.isFlagged;
        const active = i === idx;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => jumpTo(i)}
            className={cn(
              "relative grid h-9 place-items-center rounded-md border text-xs font-medium transition",
              active && "border-pink ring-2 ring-pink/40",
              answered
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-500"
                : "border-border bg-background/60 text-muted-foreground hover:bg-background/80",
            )}
          >
            {i + 1}
            {flagged && (
              <Flag className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-pink" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ----- MCQ item ---------------------------------------------------------------
function MCQItem({
  q,
  optionsCount,
  selectedIndex,
  isFlagged,
  onSelect,
  onFlag,
}: {
  q: MCQQuestion;
  optionsCount: 4 | 5;
  selectedIndex: number | undefined;
  isFlagged: boolean;
  onSelect: (i: number) => void;
  onFlag: () => void;
}) {
  const letters = ["A", "B", "C", "D", "E"];
  return (
    <article className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="outline" className="rounded-full text-[10px] uppercase">
          {q.topic}
        </Badge>
        <Button
          size="sm"
          variant={isFlagged ? "default" : "ghost"}
          onClick={onFlag}
          className="rounded-full"
        >
          <Flag className="mr-1 h-3.5 w-3.5" /> {isFlagged ? "Flagged" : "Flag"}
        </Button>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-foreground">
        {q.stem}
      </p>
      <ul className="mt-5 space-y-2">
        {q.options.slice(0, optionsCount).map((opt, i) => {
          const selected = selectedIndex === i;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => onSelect(i)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition",
                  selected
                    ? "border-pink bg-pink/10"
                    : "border-border bg-background/60 hover:border-pink/40 hover:bg-background/80",
                )}
              >
                <span
                  className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                    selected ? "border-pink bg-pink text-white" : "border-border text-muted-foreground",
                  )}
                >
                  {letters[i]}
                </span>
                <span className="text-sm leading-relaxed text-foreground">{opt}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

// ----- Essay item -------------------------------------------------------------
function EssayItem({
  q,
  text,
  isFlagged,
  onText,
  onFlag,
}: {
  q: EssayQuestion;
  text: string;
  isFlagged: boolean;
  onText: (t: string) => void;
  onFlag: () => void;
}) {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const [outline, setOutline] = useState("");
  return (
    <article className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="outline" className="rounded-full text-[10px] uppercase">
          {q.topic}
        </Badge>
        <Button
          size="sm"
          variant={isFlagged ? "default" : "ghost"}
          onClick={onFlag}
          className="rounded-full"
        >
          <Flag className="mr-1 h-3.5 w-3.5" /> {isFlagged ? "Flagged" : "Flag"}
        </Button>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-foreground">
        {q.prompt}
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-[200px_1fr]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Outline (optional)
          </div>
          <Textarea
            value={outline}
            onChange={(e) => setOutline(e.target.value)}
            placeholder="Issue · Rule · Application · Conclusion"
            className="mt-2 h-48 resize-none"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Answer
            </div>
            <div className="text-xs text-muted-foreground">{wordCount} words</div>
          </div>
          <Textarea
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder="Type your essay answer here…"
            className="mt-2 h-72"
          />
        </div>
      </div>
    </article>
  );
}

// ----- MPT item ---------------------------------------------------------------
function MPTItem({
  q,
  text,
  isFlagged,
  onText,
  onFlag,
}: {
  q: MPTQuestion;
  text: string;
  isFlagged: boolean;
  onText: (t: string) => void;
  onFlag: () => void;
}) {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  return (
    <article className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <Badge variant="outline" className="rounded-full text-[10px] uppercase">
          {q.topic}
        </Badge>
        <Button
          size="sm"
          variant={isFlagged ? "default" : "ghost"}
          onClick={onFlag}
          className="rounded-full"
        >
          <Flag className="mr-1 h-3.5 w-3.5" /> {isFlagged ? "Flagged" : "Flag"}
        </Button>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-foreground">
        {q.prompt}
      </p>
      <Tabs defaultValue="file" className="mt-4">
        <TabsList>
          <TabsTrigger value="file">
            <FileText className="mr-1 h-3.5 w-3.5" /> File
          </TabsTrigger>
          <TabsTrigger value="library">
            <Library className="mr-1 h-3.5 w-3.5" /> Library
          </TabsTrigger>
          <TabsTrigger value="answer">Answer</TabsTrigger>
        </TabsList>
        <TabsContent value="file">
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background/60 p-4 text-sm leading-relaxed text-foreground">
            {q.file}
          </pre>
        </TabsContent>
        <TabsContent value="library">
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-background/60 p-4 text-sm leading-relaxed text-foreground">
            {q.library}
          </pre>
        </TabsContent>
        <TabsContent value="answer">
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Your response
            </div>
            <div className="text-xs text-muted-foreground">{wordCount} words</div>
          </div>
          <Textarea
            value={text}
            onChange={(e) => onText(e.target.value)}
            placeholder="Draft your memo / brief here…"
            className="mt-2 h-96"
          />
        </TabsContent>
      </Tabs>
    </article>
  );
}

// =============================================================================
// RESULTS

function ResultsView({
  sim,
  sections,
  answers,
  saveResult,
  onRetrySave,
  onRetake,
}: {
  sim: DbSimulation;
  sections: DbSection[];
  answers: DbAnswer[];
  saveResult: WriteResult | null;
  onRetrySave: () => void;
  onRetake: () => void;
}) {
  const navigate = useNavigate();
  const blueprint = getBlueprint(sim.pathway);
  const mcqSections = sections.filter(
    (s) => getSection(sim.pathway, s.section_type)?.kind === "mcq",
  );
  const mcqAnswers = answers.filter((a) => a.answer_value !== null);
  const correct = mcqAnswers.filter((a) => a.is_correct === true).length;
  const total = mcqAnswers.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;
  const flaggedCount = answers.filter((a) => a.is_flagged).length;

  // Topic breakdown (MCQ only — derive topic from answer.question_id prefix)
  const topicStats = new Map<string, { right: number; total: number }>();
  for (const a of mcqAnswers) {
    // We can't derive topic without questions; fall back to section title
    const sec = sections.find((s) => s.id === a.section_id);
    const key = sec?.title ?? "Other";
    const cur = topicStats.get(key) ?? { right: 0, total: 0 };
    cur.total++;
    if (a.is_correct) cur.right++;
    topicStats.set(key, cur);
  }
  const weak = Array.from(topicStats.entries())
    .map(([name, s]) => ({ name, accuracy: Math.round((s.right / Math.max(1, s.total)) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  const totalMinutes = Math.round(sim.total_time_seconds / 60);

  return (
    <AppShell title="Simulation results" subtitle={blueprint.examType}>
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-card md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-pink-blue opacity-25 blur-3xl" />
        <div className="relative grid gap-4 md:grid-cols-4">
          <Stat label="Overall score" value={accuracy != null ? `${accuracy}%` : "—"} />
          <Stat label="Questions answered" value={`${total}`} />
          <Stat label="Flagged" value={`${flaggedCount}`} />
          <Stat label="Total time" value={totalMinutes ? `${totalMinutes} min` : "—"} />
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Section breakdown
        </h3>
        <div className="mt-4 grid gap-3">
          {sections.map((s) => {
            const bp = getSection(sim.pathway, s.section_type)!;
            const sectionAnswers = answers.filter((a) => a.section_id === s.id);
            const ans = sectionAnswers.length;
            return (
              <div key={s.id} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{s.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {ans}/{bp.questions} {bp.kind === "mcq" ? "answered" : "submitted"}
                      {bp.kind !== "mcq" && " · self-review pending"}
                    </div>
                  </div>
                  <Badge variant="outline" className="rounded-full">
                    {s.score != null ? `${Math.round(Number(s.score))}%` : bp.kind === "mcq" ? "—" : "Submitted"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {weak.length > 0 && (
        <section className="mt-6 rounded-2xl border border-border bg-card/70 p-6 backdrop-blur">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Weak areas
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {weak.map((w) => (
              <li key={w.name} className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2">
                <span>{w.name}</span>
                <span className="text-muted-foreground">{w.accuracy}% accuracy</span>
              </li>
            ))}
          </ul>
          <Button
            className="mt-4 rounded-full"
            variant="outline"
            onClick={() => {
              for (const w of weak) {
                try {
                  adjustModuleConfidence(w.name, -0.1);
                } catch {}
              }
              toast.success("Added weak areas to your study plan");
            }}
          >
            Add weak areas to my study plan
          </Button>
        </section>
      )}

      {saveResult && !saveResult.ok && saveResult.queued && (
        <section className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm text-amber-200">
          <span>Saved on this device — we'll sync your results when you're back online.</span>
          <Button size="sm" variant="outline" onClick={onRetrySave} className="rounded-full">
            Retry
          </Button>
        </section>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onRetake} className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow">
          Retake simulation
        </Button>
        <Button variant="outline" onClick={() => navigate({ to: "/analytics" })} className="rounded-full">
          View analytics
        </Button>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}
