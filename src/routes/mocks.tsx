import { useMemo, useState } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Target,
  Scale,
  ArrowRight,
  Lock,
  Layers,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  PracticeLauncherDialog,
  type PaperKey,
} from "@/components/practice-launcher-dialog";
import { AIQuizBuilderDialog } from "@/components/ai-quiz-builder-dialog";
import { loadPlan } from "@/lib/plan-store";
import { isUbePath } from "@/lib/exam-paths";

export const Route = createFileRoute("/mocks")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: MocksPage,
  head: () => ({
    meta: [
      { title: "Mocks & Practice — timed mocks and adaptive drills | Tentra" },
      {
        name: "description",
        content:
          "Timed SQE and NY UBE mock exams and adaptive MCQ drills. Build exam stamina and target weak topics with Tentra.",
      },
      { property: "og:title", content: "Mocks & Practice | Tentra" },
      {
        property: "og:description",
        content:
          "Timed mock exams and adaptive drills for SQE (FLK1/FLK2) and NY UBE (MBE/MEE/MPT).",
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
  { paper: "FLK1", title: "Mini FLK1 Mock", desc: "20-question FLK1 mini mock.", duration: "30 min" },
  { paper: "FLK2", title: "Mini FLK2 Mock", desc: "20-question FLK2 mini mock.", duration: "30 min" },
];

const UBE_MINI: MiniMock[] = [
  { paper: "MBE", title: "Mini MBE Set", desc: "20 MBE-style SBAs across the 7 MBE subjects.", duration: "36 min" },
  { paper: "MEE", title: "Mini MEE Drill", desc: "Essay-style prompts on MEE-tested subjects.", duration: "30 min" },
  { paper: "MPT", title: "MPT Practice Task", desc: "Closed-library lawyering task with a memo or brief.", duration: "45 min" },
];

function MocksPage() {
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [practicePreset, setPracticePreset] = useState<
    { type: "mini-flk"; paper: PaperKey } | undefined
  >(undefined);

  const isUbe = useMemo(() => {
    const plan = loadPlan();
    const path = plan?.input.examPath;
    return path ? isUbePath(path) : plan?.input.examType === "UBE";
  }, []);

  const miniMocks = isUbe ? UBE_MINI : SQE_MINI;
  const fullMockTitle = isUbe ? "Full UBE Simulation" : "Full Mock";
  const fullMockDesc = isUbe
    ? "Sit a full-length UBE simulation: MBE + MEE + MPT under exam conditions."
    : "Sit a full-length FLK paper under exam conditions.";
  const fullMockMeta = isUbe ? "200 MBE + 6 MEE + 2 MPT · 12 hours" : "180 questions · 5 hours";

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
      {/* HERO — Full Mock featured */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card md:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-pink-blue opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-gradient-pink-blue opacity-10 blur-3xl" />

        <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <Badge variant="outline" className="rounded-full border-border text-[10px] uppercase tracking-wide text-muted-foreground">
              <Lock className="mr-1 h-3 w-3" /> Coming soon
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              {fullMockTitle}
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              {fullMockDesc}
            </p>
            <div className="mt-3 text-sm text-muted-foreground/80">
              {fullMockMeta}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                size="lg"
                disabled
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow opacity-60"
              >
                <Lock className="mr-1.5 h-4 w-4" /> Coming soon
              </Button>
            </div>
          </div>

          <div className="hidden h-32 w-32 shrink-0 place-items-center rounded-3xl bg-gradient-pink-blue text-primary-foreground opacity-70 shadow-glow md:grid">
            <Scale className="h-14 w-14" />
          </div>
        </div>
      </section>

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

      {/* WEAK AREA DRILL + FLASHCARDS — secondary pair */}
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
            <div className="text-lg font-semibold text-foreground">Weak Area Drill</div>
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
            <div className="text-lg font-semibold text-foreground">Flashcards</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Review key rules, definitions and high-yield legal principles.
            </p>
            <div className="mt-3 text-xs text-muted-foreground/80">
              {isUbe ? "Adaptive recall · MBE & MEE" : "Adaptive recall · FLK1 & FLK2"}
            </div>
          </div>
        </Link>
      </section>

      {/* MORE PRACTICE TOOLS — secondary */}
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
            <p className="mt-0.5 text-xs text-muted-foreground">
              Spin up a quiz on any topic.
            </p>
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
    </AppShell>
  );
}
