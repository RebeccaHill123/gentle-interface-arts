import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Sparkles,
  Play,
  Timer,
  Target,
  Brain,
  Layers,
  Scale,
  Lightbulb,
  BookOpen,
  Map,
  ScrollText,
  FileText,
  AlertTriangle,
  StickyNote,
  Library,
  Lock,
  ArrowRight,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { waitForAuthUser } from "@/lib/auth-session";
import { PracticeLauncherDialog } from "@/components/practice-launcher-dialog";
import { AIQuizBuilderDialog } from "@/components/ai-quiz-builder-dialog";

export const Route = createFileRoute("/mocks")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: MocksPage,
  head: () => ({
    meta: [
      { title: "Mocks & Practice · Tentra" },
      {
        name: "description",
        content:
          "Exam simulation and targeted practice for the SQE — timed mocks, adaptive drills and AI-generated revision.",
      },
    ],
  }),
});

type Mode = {
  title: string;
  desc: string;
  duration: string;
  focus: string;
  adaptive?: boolean;
  personalised?: boolean;
  comingSoon?: boolean;
  icon: typeof Play;
  to?: string;
  paper?: "FLK1" | "FLK2";
  accent: string;
};

const PRACTICE_MODES: Mode[] = [
  {
    title: "Full Mock",
    desc: "Sit a full-length FLK paper under exam conditions with topic-by-topic feedback.",
    duration: "180 Q · 5 hrs",
    focus: "Endurance · breadth",
    icon: Scale,
    comingSoon: true,
    accent: "from-pink/30 to-blue/30",
  },
  {
    title: "Mini FLK1 Mock",
    desc: "Exam-style mini paper drawn from FLK1 subjects: Contract, Tort, Business, Dispute Resolution, Public Law, Ethics.",
    duration: "20 Q · 30 min",
    focus: "Pacing · breadth",
    icon: Scale,
    to: "mini-flk",
    paper: "FLK1",
    accent: "from-pink/30 to-blue/20",
  },
  {
    title: "Mini FLK2 Mock",
    desc: "Exam-style mini paper drawn from FLK2 subjects: Property, Wills, Trusts, Criminal, Solicitors' Accounts, Ethics.",
    duration: "20 Q · 30 min",
    focus: "Pacing · breadth",
    icon: Scale,
    to: "mini-flk",
    paper: "FLK2",
    accent: "from-blue/30 to-pink/20",
  },
  {
    title: "Weak Area Drill",
    desc: "Targeted SBAs focused on your lowest-confidence and most-missed topics.",
    duration: "10 Q · 15 min",
    focus: "Recovery · mastery",
    adaptive: true,
    personalised: true,
    icon: Target,
    to: "practice",
    accent: "from-pink/40 to-blue/20",
  },
  {
    title: "AI Quiz Generator",
    desc: "Spin up a fresh quiz on any module or topic, calibrated to your confidence.",
    duration: "10 Q · 10 min",
    focus: "Active recall",
    adaptive: true,
    icon: Sparkles,
    to: "quiz",
    accent: "from-blue/40 to-pink/30",
  },
  {
    title: "Flashcard Sprint",
    desc: "Spaced-repetition burst on key rules, definitions and procedural steps.",
    duration: "20 cards · 5 min",
    focus: "Memory · retrieval",
    adaptive: true,
    icon: Layers,
    comingSoon: true,
    accent: "from-pink/20 to-blue/30",
  },
  {
    title: "Scenario Practice",
    desc: "Long-form client scenarios with branching SBAs in the SRA assessment style.",
    duration: "5 scenarios · 30 min",
    focus: "Application · reasoning",
    icon: Brain,
    comingSoon: true,
    accent: "from-blue/30 to-pink/30",
  },
  {
    title: "Exam Technique Drills",
    desc: "Short drills on time-per-question, elimination strategy and answer hygiene.",
    duration: "10 min",
    focus: "Strategy · pacing",
    icon: Lightbulb,
    comingSoon: true,
    accent: "from-pink/30 to-blue/20",
  },
];

type Resource = {
  title: string;
  desc: string;
  icon: typeof BookOpen;
  status: "available" | "soon";
};

const RESOURCES: Resource[] = [
  {
    title: "Revision frameworks",
    desc: "Structured templates for breaking down topics, cases and procedural rules.",
    icon: BookOpen,
    status: "soon",
  },
  {
    title: "Topic roadmaps",
    desc: "Visual sequences showing how each module's topics build on one another.",
    icon: Map,
    status: "soon",
  },
  {
    title: "Exam technique guides",
    desc: "Short, original guides on pacing, elimination and assessment-style reading.",
    icon: ScrollText,
    status: "soon",
  },
  {
    title: "AI-generated summaries",
    desc: "On-demand topic summaries written from your syllabus and confidence map.",
    icon: FileText,
    status: "available",
  },
  {
    title: "Mistake review log",
    desc: "Every missed question, organised by topic, with explanations and re-test prompts.",
    icon: AlertTriangle,
    status: "soon",
  },
  {
    title: "Personal notes",
    desc: "Upload and tag your own notes — searchable alongside your study plan.",
    icon: StickyNote,
    status: "soon",
  },
  {
    title: "Flashcard collections",
    desc: "Curate decks per module and review them inside Flashcard Sprint.",
    icon: Library,
    status: "soon",
  },
];

function MocksPage() {
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

  return (
    <AppShell title="Mocks & Practice" subtitle="Exam simulation & targeted practice.">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card md:p-10">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-pink-blue opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-pink-blue opacity-10 blur-3xl" />

        <div className="relative max-w-2xl">
          <Badge className="rounded-full bg-pink/15 text-pink hover:bg-pink/15">
            <Zap className="mr-1 h-3 w-3" /> Adaptive revision
          </Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Exam simulation & targeted practice
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Build confidence with timed mocks, adaptive drills and AI-generated
            revision exercises — calibrated to your syllabus and confidence map.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              onClick={() => setPracticeOpen(true)}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
            >
              <Play className="mr-1.5 h-4 w-4" /> Start practice
            </Button>
            <Button
              variant="outline"
              onClick={() => setQuizOpen(true)}
              className="rounded-full"
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> Generate AI quiz
            </Button>
          </div>
        </div>
      </section>

      {/* PRACTICE MODES */}
      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Practice modes</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick the format that matches the time and intensity you have right now.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PRACTICE_MODES.map((m) => {
            const Icon = m.icon;
            const interactive = !m.comingSoon && !!m.to;
            const handleClick = () => {
              if (!interactive) return;
              if (m.to === "quiz") setQuizOpen(true);
              else setPracticeOpen(true);
            };
            const Wrapper: any = interactive ? "button" : "div";
            const wrapperProps = interactive
              ? { onClick: handleClick, type: "button" as const }
              : {};
            return (
              <Wrapper
                key={m.title}
                {...wrapperProps}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-5 text-left backdrop-blur transition ${
                  interactive
                    ? "hover:border-pink/40 hover:shadow-glow"
                    : "opacity-95"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${m.accent} opacity-40`}
                />
                <div className="relative flex items-start justify-between">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
                    <Icon className="h-5 w-5" />
                  </div>
                  {m.comingSoon ? (
                    <Badge variant="outline" className="rounded-full border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                      <Lock className="mr-1 h-3 w-3" /> Soon
                    </Badge>
                  ) : (
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
                  )}
                </div>

                <div className="relative mt-4">
                  <div className="text-base font-semibold text-foreground">{m.title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                </div>

                <div className="relative mt-4 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-muted-foreground">
                    {m.duration}
                  </span>
                  <span className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-muted-foreground">
                    {m.focus}
                  </span>
                  {m.adaptive && (
                    <span className="rounded-full bg-pink/15 px-2 py-0.5 font-medium text-pink">
                      Adaptive
                    </span>
                  )}
                  {m.personalised && (
                    <span className="rounded-full bg-blue/15 px-2 py-0.5 font-medium text-blue">
                      Personalised
                    </span>
                  )}
                </div>
              </Wrapper>
            );
          })}
        </div>
      </section>

      {/* STUDY RESOURCES */}
      <section className="mt-12">
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-foreground">Study resources</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Original frameworks, AI-generated materials and your own uploaded notes — all in one place.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className="flex items-start gap-3 rounded-2xl border border-border bg-card/50 p-4 backdrop-blur transition hover:border-pink/30"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-background/60 text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {r.title}
                    </div>
                    {r.status === "soon" ? (
                      <Badge variant="outline" className="rounded-full border-border text-[10px] uppercase tracking-wide text-muted-foreground">
                        Soon
                      </Badge>
                    ) : (
                      <Badge className="rounded-full bg-emerald-400/15 text-[10px] uppercase tracking-wide text-emerald-300 hover:bg-emerald-400/15">
                        Live
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          Tentra provides original frameworks and AI-generated study materials. We do
          not host or distribute third-party providers' copyrighted content.
        </p>
      </section>

      <PracticeLauncherDialog open={practiceOpen} onOpenChange={setPracticeOpen} />
      <AIQuizBuilderDialog open={quizOpen} onOpenChange={setQuizOpen} />
    </AppShell>
  );
}
