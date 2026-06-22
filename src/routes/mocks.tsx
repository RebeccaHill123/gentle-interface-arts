import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Target,
  Scale,
  ArrowRight,
  Lock,
  Layers,
  BarChart3,
  Loader2,
  Crown,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  PracticeLauncherDialog,
  type PaperKey,
} from "@/components/practice-launcher-dialog";
import { AIQuizBuilderDialog } from "@/components/ai-quiz-builder-dialog";
import { loadPlan } from "@/lib/plan-store";
import { isUbePath } from "@/lib/exam-paths";
import { getProStatus } from "@/lib/pro-store";
import {
  createSimulation,
  listUserSimulations,
  type DbSimulation,
  type SimulationMode,
} from "@/lib/full-mock-store";
import { getBlueprint, type Pathway } from "@/lib/full-mock-blueprints";
import { toast } from "sonner";

export const Route = createFileRoute("/mocks")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: MocksPage,
  head: () => ({
    meta: [
      { title: "Mocks & Practice — full exam simulations & adaptive drills | Tentra" },
      {
        name: "description",
        content:
          "Full UBE and SQE1 mock exam simulations, mini mocks and adaptive drills. Build exam stamina with Tentra.",
      },
      { property: "og:title", content: "Mocks & Practice | Tentra" },
      {
        property: "og:description",
        content:
          "Full-length mock exam simulations and adaptive drills for SQE (FLK1/FLK2) and NY UBE (MBE/MEE/MPT).",
      },
      { property: "og:url", content: "https://tentraapp.com/mocks" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/mocks" }],
  }),
});

type MiniMock = {
  paper: PaperKey;
  title: string;
  desc: string;
  duration: string;
};

const SQE_MINI: MiniMock[] = [
  { paper: "FLK1", title: "FLK1 Mini Mock", desc: "20-question FLK1 mini mock.", duration: "30 min" },
  { paper: "FLK2", title: "FLK2 Mini Mock", desc: "20-question FLK2 mini mock.", duration: "30 min" },
];

const UBE_MINI: MiniMock[] = [
  { paper: "MBE", title: "Mini MBE Set", desc: "20 MBE-style SBAs across the 7 MBE subjects.", duration: "36 min" },
  { paper: "MEE", title: "Mini MEE Drill", desc: "Essay-style prompts on MEE-tested subjects.", duration: "30 min" },
  { paper: "MPT", title: "MPT Practice Task", desc: "Closed-library lawyering task with a memo or brief.", duration: "45 min" },
];

function MocksPage() {
  const navigate = useNavigate();
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [practicePreset, setPracticePreset] = useState<
    { type: "mini-flk"; paper: PaperKey } | undefined
  >(undefined);

  const [fullMockOpen, setFullMockOpen] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [sims, setSims] = useState<DbSimulation[]>([]);
  const [proLoaded, setProLoaded] = useState(false);

  const isUbe = useMemo(() => {
    const plan = loadPlan();
    const path = plan?.input.examPath;
    return path ? isUbePath(path) : plan?.input.examType === "UBE";
  }, []);
  const pathway: Pathway = isUbe ? "UBE" : "SQE";

  useEffect(() => {
    (async () => {
      const [pro, list] = await Promise.all([getProStatus(), listUserSimulations()]);
      setIsPro(pro.isPro);
      setProLoaded(true);
      setSims(list);
    })();
  }, []);

  const miniMocks = isUbe ? UBE_MINI : SQE_MINI;
  const fullMockTitle = isUbe ? "Full UBE Simulation" : "Full SQE1 Simulation";
  const fullMockDesc = isUbe
    ? "Sit a full-length UBE simulation: MBE + MEE + MPT under exam conditions."
    : "Sit a full-length SQE1 simulation: FLK1 and FLK2 SBA papers under exam conditions.";
  const fullMockMeta = isUbe
    ? "200 MBE + 6 MEE + 2 MPT · 12 hours"
    : "360 SBAs across FLK1 and FLK2 · ~10 hours";

  const inProgressSim = sims.find((s) => s.pathway === pathway && s.status === "in_progress");

  const openMiniPaper = (paper: PaperKey) => {
    setPracticePreset({ type: "mini-flk", paper });
    setPracticeOpen(true);
  };

  const openPractice = () => {
    setPracticePreset(undefined);
    setPracticeOpen(true);
  };

  return (
    <AppShell title="Mocks & Practice" subtitle="Exam simulation & targeted practice.">
      {/* HERO — Full Simulation */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card md:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-pink-blue opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-gradient-pink-blue opacity-10 blur-3xl" />

        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <Badge variant="outline" className="rounded-full border-border text-[10px] uppercase tracking-wide text-muted-foreground">
              <Sparkles className="mr-1 h-3 w-3" /> {pathway} pathway
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              {fullMockTitle}
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">{fullMockDesc}</p>
            <div className="mt-3 text-sm text-muted-foreground/80">{fullMockMeta}</div>

            <div className="mt-6 flex flex-wrap gap-3">
              {inProgressSim ? (
                <Button
                  size="lg"
                  onClick={() =>
                    navigate({
                      to: "/mocks/simulation/$simId",
                      params: { simId: inProgressSim.id },
                    })
                  }
                  className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
                >
                  Resume simulation <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={() => setFullMockOpen(true)}
                  className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
                >
                  Start Full Simulation
                </Button>
              )}
              {!isPro && proLoaded && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate({ to: "/pro" })}
                  className="rounded-full"
                >
                  <Crown className="mr-1.5 h-4 w-4" /> Unlock with Pro
                </Button>
              )}
            </div>
          </div>

          <div className="hidden h-32 w-32 shrink-0 place-items-center rounded-3xl bg-gradient-pink-blue text-primary-foreground opacity-70 shadow-glow md:grid">
            <Scale className="h-14 w-14" />
          </div>
        </div>
      </section>

      {/* SQE2 placeholder for SQE pathway */}
      {!isUbe && (
        <section className="mt-4">
          <div className="flex items-center justify-between rounded-2xl border border-dashed border-border bg-card/50 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-background/60">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold">SQE2 Simulation</div>
                <p className="text-xs text-muted-foreground">Skills-based assessments — coming soon.</p>
              </div>
            </div>
            <Badge variant="outline" className="rounded-full">Coming soon</Badge>
          </div>
        </section>
      )}

      {/* MINI MOCKS */}
      <section className={`mt-8 grid gap-4 ${miniMocks.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        {miniMocks.map((m) => (
          <button
            key={m.paper}
            type="button"
            onClick={() => openMiniPaper(m.paper)}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-6 text-left backdrop-blur transition hover:border-pink/40 hover:shadow-glow"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-pink-blue opacity-10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
                <Scale className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
            <div className="relative mt-6">
              <div className="text-lg font-semibold text-foreground">{m.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
              <div className="mt-3 text-xs text-muted-foreground/80">{m.duration}</div>
            </div>
          </button>
        ))}
      </section>

      {/* DRILLS + FLASHCARDS */}
      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={openPractice}
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-6 text-left backdrop-blur transition hover:border-pink/40 hover:shadow-glow"
        >
          <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-gradient-pink-blue opacity-10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
              <Target className="h-5 w-5" />
            </div>
            <span className="rounded-full bg-pink/15 px-2 py-0.5 text-[11px] font-medium text-pink">
              Adaptive
            </span>
          </div>
          <div className="relative mt-6">
            <div className="text-lg font-semibold text-foreground">
              {isUbe ? "Mixed MBE Drill" : "Weak Topic Drill"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Targeted questions on your weakest topics.
            </p>
          </div>
          <ArrowRight className="relative mt-4 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </button>

        <Link
          to="/flashcards"
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-6 text-left backdrop-blur transition hover:border-pink/40 hover:shadow-glow"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-pink-blue opacity-10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
              <Layers className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
          <div className="relative mt-6">
            <div className="text-lg font-semibold text-foreground">Flashcard Decks</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Review key rules, definitions and high-yield legal principles.
            </p>
            <div className="mt-3 text-xs text-muted-foreground/80">
              {isUbe ? "Adaptive recall · MBE & MEE" : "Adaptive recall · FLK1 & FLK2"}
            </div>
          </div>
        </Link>
      </section>

      {/* PAST PERFORMANCE */}
      {sims.length > 0 && (
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Past simulations
            </h3>
            <Link to="/analytics" className="text-xs text-muted-foreground hover:text-foreground">
              <BarChart3 className="mr-1 inline h-3 w-3" /> Full analytics
            </Link>
          </div>
          <div className="grid gap-3">
            {sims.slice(0, 5).map((s) => (
              <button
                key={s.id}
                onClick={() =>
                  navigate({ to: "/mocks/simulation/$simId", params: { simId: s.id } })
                }
                className="flex items-center justify-between rounded-2xl border border-border bg-card/50 p-4 text-left hover:border-pink/40"
              >
                <div>
                  <div className="text-sm font-medium">{s.exam_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.started_at ? new Date(s.started_at).toLocaleDateString() : ""} ·{" "}
                    {s.mode === "exam" ? "Exam mode" : "Practice mode"} ·{" "}
                    {s.status === "completed" ? "Completed" : "In progress"}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {s.overall_score != null ? `${Math.round(Number(s.overall_score))}%` : "—"}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* MORE PRACTICE TOOLS */}
      <section className="mt-12">
        <div className="mb-4">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            More practice tools
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setQuizOpen(true)}
          className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card/40 p-4 text-left transition hover:border-pink/30 hover:bg-card/60"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-background/60 text-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">AI Quiz Generator</div>
            <p className="mt-0.5 text-xs text-muted-foreground">Spin up a quiz on any topic.</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
        </button>
      </section>

      <PracticeLauncherDialog
        open={practiceOpen}
        onOpenChange={(v) => {
          setPracticeOpen(v);
          if (!v) setPracticePreset(undefined);
        }}
        preset={practicePreset}
      />
      <AIQuizBuilderDialog open={quizOpen} onOpenChange={setQuizOpen} />

      <FullMockDialog
        open={fullMockOpen}
        onOpenChange={setFullMockOpen}
        pathway={pathway}
        isPro={isPro}
      />
    </AppShell>
  );
}

// =============================================================================
// FullMockDialog

function FullMockDialog({
  open,
  onOpenChange,
  pathway,
  isPro,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  pathway: Pathway;
  isPro: boolean;
}) {
  const navigate = useNavigate();
  const blueprint = getBlueprint(pathway);
  const [mode, setMode] = useState<SimulationMode>("practice");
  const [selected, setSelected] = useState<string[]>([]); // empty = full
  const [launching, setLaunching] = useState(false);

  const toggleSection = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  async function launchFull() {
    await launch(undefined);
  }
  async function launchSections() {
    if (selected.length === 0) {
      toast.error("Pick at least one section to start.");
      return;
    }
    await launch(selected);
  }
  async function launch(sectionIds?: string[]) {
    if (launching) return;
    setLaunching(true);
    try {
      // Free preview: only allow first section in practice mode
      const effectiveSections =
        !isPro
          ? [blueprint.sections[0].id]
          : sectionIds;
      const { simulation } = await createSimulation(pathway, mode, effectiveSections);
      onOpenChange(false);
      navigate({
        to: "/mocks/simulation/$simId",
        params: { simId: simulation.id },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start simulation");
    } finally {
      setLaunching(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl border-border bg-card/95 p-0 backdrop-blur-xl">
        <div className="relative overflow-hidden rounded-t-3xl">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-pink-blue opacity-20 blur-3xl" />
          <DialogHeader className="space-y-1.5 px-6 pb-2 pt-6 text-left">
            <Badge className="w-fit rounded-full bg-pink/15 text-pink hover:bg-pink/15">
              {blueprint.examType}
            </Badge>
            <DialogTitle className="text-xl tracking-tight">
              Start your full simulation
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {blueprint.totalDurationLabel} · {blueprint.sections.length} sections.
              Answers autosave to your account.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[60vh] space-y-5 overflow-y-auto px-6 pb-2">
          {!isPro && (
            <div className="flex items-start gap-3 rounded-2xl border border-pink/30 bg-pink/5 p-4">
              <Crown className="mt-0.5 h-4 w-4 text-pink" />
              <div className="text-sm">
                <div className="font-medium">Free preview</div>
                <p className="text-xs text-muted-foreground">
                  You can sit the first section as a demo. Upgrade to Tentra Pro to
                  unlock and save the full simulation.
                </p>
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sections
            </div>
            <div className="mt-2 grid gap-2">
              {blueprint.sections.map((s, idx) => {
                const checked = selected.includes(s.id);
                const disabled = !isPro && idx > 0;
                return (
                  <label
                    key={s.id}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                      checked
                        ? "border-pink bg-pink/5"
                        : "border-border bg-background/50 hover:border-pink/30"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-pink"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleSection(s.id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{s.title}</div>
                        {disabled && (
                          <Badge variant="outline" className="rounded-full text-[10px]">
                            <Lock className="mr-1 h-2.5 w-2.5" /> Pro
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.questions} {s.kind === "mcq" ? "Qs" : s.kind === "essay" ? "essays" : "tasks"} ·{" "}
                        {Math.round(s.durationSeconds / 60)} min
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Leave all unchecked to sit the full exam in order.
            </p>
          </div>

          <div className="flex items-start justify-between rounded-2xl border border-border bg-background/40 p-4">
            <div className="pr-4">
              <div className="text-sm font-medium">Exam mode</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Timer cannot be paused. Review only at the end.
              </p>
            </div>
            <Switch
              checked={mode === "exam"}
              onCheckedChange={(v) => setMode(v ? "exam" : "practice")}
            />
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 px-6 pb-6 pt-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {selected.length > 0 && (
            <Button onClick={launchSections} disabled={launching} className="rounded-full">
              {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : `Start ${selected.length} section${selected.length === 1 ? "" : "s"}`}
            </Button>
          )}
          <Button
            onClick={launchFull}
            disabled={launching}
            className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
          >
            {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : isPro ? "Start full simulation" : "Start free preview"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
