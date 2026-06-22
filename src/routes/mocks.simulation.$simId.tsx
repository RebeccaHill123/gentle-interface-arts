import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Clock,
  CheckCircle2,
  AlertTriangle,
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
  startSection,
  upsertAnswer,
  type DbAnswer,
  type DbSection,
  type DbSimulation,
} from "@/lib/full-mock-store";
import { addStudySession, adjustModuleConfidence } from "@/lib/plan-store";
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

type LocalAnswer = {
  answerIndex?: number;
  essayText?: string;
  isFlagged?: boolean;
  timeSpentSeconds?: number;
};

type LocalState = Record<string, LocalAnswer>; // keyed by question_id

const LS_PREFIX = "tentra.fullmock.";
const lsKey = (simId: string) => `${LS_PREFIX}${simId}`;

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
  const [sim, setSim] = useState<DbSimulation | null>(null);
  const [sections, setSections] = useState<DbSection[]>([]);
  const [answers, setAnswers] = useState<DbAnswer[]>([]);
  const [phase, setPhase] = useState<"overview" | "section" | "results">(
    "overview",
  );
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [local, setLocal] = useState<LocalState>({});
  const [exitConfirm, setExitConfirm] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await loadSimulation(simId);
      if (!data) {
        toast.error("Simulation not found.");
        navigate({ to: "/mocks" });
        return;
      }
      setSim(data.simulation);
      setSections(data.sections);
      setAnswers(data.answers);
      setLocal(loadLocal(simId));
      if (data.simulation.status === "completed") setPhase("results");
      setLoading(false);
    })();
  }, [simId, navigate]);

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

  // Render
  if (loading || !sim || !blueprint) {
    return (
      <AppShell title="Loading simulation…">
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (phase === "results") {
    return (
      <ResultsView
        sim={sim}
        sections={sections}
        answers={answers}
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
        local={local}
        updateLocal={updateLocal}
        onExit={() => setExitConfirm(true)}
        onSubmitted={async (updatedSection, sectionAnswers) => {
          setSections((prev) =>
            prev.map((s) => (s.id === updatedSection.id ? updatedSection : s)),
          );
          setAnswers((prev) => {
            const ids = new Set(sectionAnswers.map((a) => a.question_id));
            const filtered = prev.filter(
              (a) =>
                !(a.section_id === updatedSection.id && ids.has(a.question_id)),
            );
            return [...filtered, ...sectionAnswers];
          });
          setActiveSectionId(null);
          setPhase("overview");
        }}
        onFullyComplete={async (totalSeconds, overallScore) => {
          await completeSimulation(sim.id, overallScore, totalSeconds);
          setSim({
            ...sim,
            status: "completed",
            total_time_seconds: totalSeconds,
            overall_score: overallScore,
            completed_at: new Date().toISOString(),
          });
          try {
            addStudySession({
              date: new Date().toISOString().slice(0, 10),
              minutes: Math.round(totalSeconds / 60),
              module: blueprint.examType,
              sessionType: "mock",
              note: `${blueprint.examType} — full simulation completed`,
            });
          } catch {}
          setPhase("results");
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
                      await startSection(s.id);
                      setActiveSectionId(s.id);
                      setPhase("section");
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

        <div className="mt-6 flex justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate({ to: "/mocks" })}>
            Back to mocks
          </Button>
          {sections.every((s) => s.status === "completed") && (
            <Button
              onClick={async () => {
                const totalSeconds = sections.reduce(
                  (sum, s) => sum + s.duration_seconds,
                  0,
                );
                const mcqScores = sections
                  .map((s) => Number(s.score))
                  .filter((n) => !Number.isNaN(n));
                const overall = mcqScores.length
                  ? mcqScores.reduce((a, b) => a + b, 0) / mcqScores.length
                  : null;
                await completeSimulation(sim.id, overall, totalSeconds);
                setSim({
                  ...sim,
                  status: "completed",
                  overall_score: overall,
                  total_time_seconds: totalSeconds,
                  completed_at: new Date().toISOString(),
                });
                setPhase("results");
              }}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
            >
              View results
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
  local,
  updateLocal,
  onExit,
  onSubmitted,
  onFullyComplete,
}: {
  sim: DbSimulation;
  dbSection: DbSection;
  bpSection: SectionBlueprint;
  local: LocalState;
  updateLocal: (questionId: string, patch: Partial<LocalAnswer>) => void;
  onExit: () => void;
  onSubmitted: (updatedSection: DbSection, answers: DbAnswer[]) => Promise<void>;
  onFullyComplete: (totalSeconds: number, overallScore: number | null) => Promise<void>;
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

  const [idx, setIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(bpSection.durationSeconds);
  const [paused, setPaused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef(Date.now());
  const questionEnteredAt = useRef(Date.now());

  // Initial timer
  useEffect(() => {
    setSecondsLeft(bpSection.durationSeconds);
  }, [bpSection.durationSeconds]);

  // Tick
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setSecondsLeft((s: number) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [paused]);

  // Auto-submit when timer runs out
  useEffect(() => {
    if (secondsLeft === 0 && !submitting) {
      toast.message("Time's up — auto-submitting your section.");
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const isExam = sim.mode === "exam";
  const current = items[idx];
  const currentId = current.id;
  const currentLocal = local[currentId] ?? {};

  const trackTimeAndAdvance = (delta: number) => {
    const now = Date.now();
    const elapsed = Math.round((now - questionEnteredAt.current) / 1000);
    questionEnteredAt.current = now;
    updateLocal(currentId, {
      timeSpentSeconds: (currentLocal.timeSpentSeconds ?? 0) + elapsed,
    });
    // Persist to DB (best effort)
    upsertAnswer({
      simulationId: sim.id,
      sectionId: dbSection.id,
      questionId: currentId,
      answerValue:
        bpSection.kind === "mcq" && currentLocal.answerIndex != null
          ? String(currentLocal.answerIndex)
          : null,
      essayText: bpSection.kind !== "mcq" ? currentLocal.essayText ?? null : null,
      isFlagged: currentLocal.isFlagged ?? false,
      timeSpentSeconds: (currentLocal.timeSpentSeconds ?? 0) + elapsed,
      isCorrect:
        bpSection.kind === "mcq" && currentLocal.answerIndex != null
          ? currentLocal.answerIndex === (current as MCQQuestion).correctIndex
          : null,
    }).catch(() => {});
    setIdx((i) => Math.max(0, Math.min(items.length - 1, i + delta)));
  };

  const jumpTo = (n: number) => {
    const now = Date.now();
    const elapsed = Math.round((now - questionEnteredAt.current) / 1000);
    questionEnteredAt.current = now;
    updateLocal(currentId, {
      timeSpentSeconds: (currentLocal.timeSpentSeconds ?? 0) + elapsed,
    });
    upsertAnswer({
      simulationId: sim.id,
      sectionId: dbSection.id,
      questionId: currentId,
      answerValue:
        bpSection.kind === "mcq" && currentLocal.answerIndex != null
          ? String(currentLocal.answerIndex)
          : null,
      essayText: bpSection.kind !== "mcq" ? currentLocal.essayText ?? null : null,
      isFlagged: currentLocal.isFlagged ?? false,
      timeSpentSeconds: (currentLocal.timeSpentSeconds ?? 0) + elapsed,
      isCorrect:
        bpSection.kind === "mcq" && currentLocal.answerIndex != null
          ? currentLocal.answerIndex === (current as MCQQuestion).correctIndex
          : null,
    }).catch(() => {});
    setIdx(n);
  };

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    // Persist final state for current question
    const now = Date.now();
    const elapsed = Math.round((now - questionEnteredAt.current) / 1000);
    updateLocal(currentId, {
      timeSpentSeconds: (currentLocal.timeSpentSeconds ?? 0) + elapsed,
    });

    // Persist every question's answer
    const dbAnswers: DbAnswer[] = [];
    let correctCount = 0;
    let mcqCount = 0;
    for (const q of items) {
      const la = local[q.id] ?? (q.id === currentId
        ? { ...currentLocal, timeSpentSeconds: (currentLocal.timeSpentSeconds ?? 0) + elapsed }
        : {});
      const isMcq = bpSection.kind === "mcq";
      const answerIndex = (la as LocalAnswer).answerIndex;
      const isCorrect =
        isMcq && answerIndex != null
          ? answerIndex === (q as MCQQuestion).correctIndex
          : null;
      if (isMcq) {
        mcqCount++;
        if (isCorrect) correctCount++;
      }
      await upsertAnswer({
        simulationId: sim.id,
        sectionId: dbSection.id,
        questionId: q.id,
        answerValue: isMcq && answerIndex != null ? String(answerIndex) : null,
        essayText: !isMcq ? (la as LocalAnswer).essayText ?? null : null,
        isFlagged: (la as LocalAnswer).isFlagged ?? false,
        timeSpentSeconds: (la as LocalAnswer).timeSpentSeconds ?? 0,
        isCorrect,
      });
      dbAnswers.push({
        id: `${dbSection.id}-${q.id}`,
        simulation_id: sim.id,
        section_id: dbSection.id,
        question_id: q.id,
        answer_value: isMcq && answerIndex != null ? String(answerIndex) : null,
        essay_text: !isMcq ? (la as LocalAnswer).essayText ?? null : null,
        is_flagged: (la as LocalAnswer).isFlagged ?? false,
        time_spent_seconds: (la as LocalAnswer).timeSpentSeconds ?? 0,
        is_correct: isCorrect,
      });

    }

    // Aggregate per-topic accuracy and feed module confidence
    const perTopic = new Map<string, { right: number; total: number }>();
    for (const q of items) {
      if (bpSection.kind !== "mcq") break;
      const mcq = q as MCQQuestion;
      const la = local[q.id] ?? (q.id === currentId ? currentLocal : {});
      const ai = (la as LocalAnswer).answerIndex;
      if (ai == null) continue;
      const cur = perTopic.get(mcq.topic) ?? { right: 0, total: 0 };
      cur.total++;
      if (ai === mcq.correctIndex) cur.right++;
      perTopic.set(mcq.topic, cur);
    }
    for (const [topic, s] of perTopic) {
      try {
        adjustModuleConfidence(topic, s.right / Math.max(1, s.total));
      } catch {}
    }


    const sectionScore = mcqCount > 0 ? Math.round((correctCount / mcqCount) * 100) : null;
    await completeSection(dbSection.id, sectionScore);
    toast.success("Section submitted.");

    const updated: DbSection = {
      ...dbSection,
      status: "completed",
      completed_at: new Date().toISOString(),
      score: sectionScore,
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
  onRetake,
}: {
  sim: DbSimulation;
  sections: DbSection[];
  answers: DbAnswer[];
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
