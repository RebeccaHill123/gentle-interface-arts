import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Calendar,
  Target,
  Brain,
  LayoutDashboard,
  MessageSquareText,
  BarChart3,
  Flame,
  ClipboardCheck,
  TrendingUp,
  Zap,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Tentra — your personalised SQE study plan" },
      {
        name: "description",
        content:
          "Tentra builds a personalised SQE study plan from your exam date and confidence. Built for UK law students.",
      },
      { property: "og:title", content: "Tentra — your personalised SQE plan" },
      {
        property: "og:description",
        content:
          "Tell us your exam date. We build the plan. You just study.",
      },
    ],
  }),
});

function LandingPage() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />

      <div className="relative">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <BrandMark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#how" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-9 w-32 animate-pulse rounded-full bg-card/60" />
            ) : isAuthenticated ? (
              <Button
                asChild
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-[0_10px_30px_-12px_rgba(180,80,160,0.35)] hover:opacity-95"
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-1 h-4 w-4" /> Go to Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="rounded-full">
                  <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
                </Button>
                <Button asChild className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-[0_10px_30px_-12px_rgba(180,80,160,0.35)] hover:opacity-95">
                  <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
                </Button>
              </>
            )}
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-6 pt-12 pb-12 md:pt-20 md:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-gradient-tentra" />
              Built for SQE1 & SQE2 candidates
            </span>
            <h1 className="mt-6 text-[2.5rem] font-light leading-[1.05] tracking-tight text-foreground/85 md:text-[4rem] lg:text-[4.75rem]">
              Study{" "}
              <span className="italic text-gradient-tentra font-light inline-block pr-[0.15em]">
                smarter
              </span>
              .
              <br />
              Score higher.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-[1.05rem]">
              Tentra builds your personalised SQE revision plan and keeps you
              accountable — every session, every streak, every sitting.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              {isAuthenticated ? (
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-[0_10px_30px_-12px_rgba(180,80,160,0.35)] hover:opacity-95"
                >
                  <Link to="/dashboard">
                    Go to Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-[0_10px_30px_-12px_rgba(180,80,160,0.35)] hover:opacity-95"
                  >
                    <Link to="/auth" search={{ mode: "signup" }}>
                      Get started <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full"
                  >
                    <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
                  </Button>
                </>
              )}
            </div>
          </div>

        </section>

        <section id="how" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-12 text-center">
            <div className="text-sm font-semibold uppercase tracking-wider text-gradient-tentra">
              How it works
            </div>
            <h2 className="mt-2 text-4xl font-normal text-foreground md:text-5xl">
              Three steps to a smarter prep.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <StepCard
              num="01"
              icon={<Calendar className="h-5 w-5" />}
              title="Set your exam date"
              body="Tell us when you're sitting SQE1 or SQE2."
            />
            <StepCard
              num="02"
              icon={<Brain className="h-5 w-5" />}
              title="Rate your confidence"
              body="Score each module from 1 to 5 so we know where to focus."
            />
            <StepCard
              num="03"
              icon={<Target className="h-5 w-5" />}
              title="Follow your plan"
              body="A clear daily list and weekly theme, tuned as you go."
            />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-28">
          <FeatureShowcase />
        </section>

        <footer className="mt-8 border-t border-border/60">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 md:flex-row">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-pink-blue">
                <span className="font-display text-sm font-bold text-primary-foreground">T</span>
              </span>
              <span className="text-sm font-semibold tracking-tight text-foreground">Tentra</span>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                · Built for the next generation of solicitors.
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Tentra
            </div>
          </div>
          <p className="px-6 pb-6 text-center text-xs text-muted-foreground sm:hidden">
            Built for the next generation of solicitors.
          </p>
        </footer>
      </div>
    </div>
  );
}

function StepCard({
  num,
  icon,
  title,
  body,
}: {
  num: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card/60 p-7 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute right-5 top-3 font-display text-5xl leading-none text-gradient-tentra/20">
        {num}
      </div>
      <div className="relative">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-pink-blue text-primary-foreground">
          {icon}
        </div>
        <h3 className="mt-5 text-xl font-semibold text-foreground">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}


type ShowcaseTab = {
  id: string;
  label: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  render: () => React.ReactNode;
};

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    eyebrow: "Your command centre",
    title: "Every day, planned for you.",
    body: "A live snapshot of your countdown, streak, weekly hours and the exact tasks to ship today.",
    render: () => <DashboardPanel />,
  },
  {
    id: "coach",
    label: "AI Coach",
    icon: <MessageSquareText className="h-4 w-4" />,
    eyebrow: "Always-on tutor",
    title: "An SQE coach that actually knows you.",
    body: "Ask anything. Get explanations, generated practice and feedback tuned to your latest results.",
    render: () => <CoachPanel />,
  },
  {
    id: "practice",
    label: "Mocks & Practice",
    icon: <ClipboardCheck className="h-4 w-4" />,
    eyebrow: "Built for FLK1 & FLK2",
    title: "Mocks tuned to your weak spots.",
    body: "Adaptive MCQs and timed mocks that get harder where you're soft and reinforce what's stuck.",
    render: () => <PracticePanel />,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    eyebrow: "See your edge",
    title: "Confidence, mapped to the syllabus.",
    body: "Track accuracy, mastery and time per topic — and watch weak areas turn into strengths.",
    render: () => <AnalyticsPanel />,
  },
];

function FeatureShowcase() {
  const [active, setActive] = useState<string>(SHOWCASE_TABS[0].id);
  const tab = SHOWCASE_TABS.find((t) => t.id === active) ?? SHOWCASE_TABS[0];

  return (
    <div className="space-y-10">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-sm font-semibold uppercase tracking-wider text-gradient-tentra">
          The platform
        </div>
        <h2 className="mt-2 text-4xl font-normal text-foreground md:text-5xl">
          One platform.{" "}
          <span className="italic text-gradient-tentra font-light inline-block pr-[0.15em]">
            Every part
          </span>{" "}
          of your revision.
        </h2>
        <p className="mt-4 text-muted-foreground md:text-lg">
          Coaching, adaptive practice, mocks and analytics — woven into a single,
          beautifully calm workflow.
        </p>
      </div>

      {/* Tab selector */}
      <div className="flex justify-center">
        <div className="inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-card/70 p-1.5 backdrop-blur">
          {SHOWCASE_TABS.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-pink-blue text-primary-foreground shadow-[0_8px_24px_-10px_oklch(0.68_0.23_340/0.5)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`transition-transform ${
                    isActive ? "scale-110" : "group-hover:scale-110"
                  }`}
                >
                  {t.icon}
                </span>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Showcase frame */}
      <div className="relative">
        <div className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 rounded-[3rem] bg-gradient-tentra opacity-15 blur-3xl" />
        <div className="overflow-hidden rounded-[2rem] border border-border bg-card/80 shadow-[0_40px_120px_-30px_oklch(0.5_0.2_320/0.35)] backdrop-blur">
          <div className="grid gap-0 lg:grid-cols-[1fr_1.4fr]">
            {/* Copy column */}
            <div
              key={tab.id + "-copy"}
              className="flex flex-col justify-between gap-8 border-b border-border p-8 lg:border-b-0 lg:border-r lg:p-10 animate-fade-in"
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-gradient-tentra">
                  {tab.eyebrow}
                </div>
                <h3 className="mt-3 text-2xl font-normal text-foreground md:text-3xl">
                  {tab.title}
                </h3>
                <p className="mt-3 text-sm text-muted-foreground md:text-base">
                  {tab.body}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                {SHOWCASE_TABS.filter((t) => t.id !== tab.id).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActive(t.id)}
                    className="group flex items-center justify-between rounded-2xl border border-border bg-background/60 px-4 py-3 text-left transition-all hover:border-primary/30 hover:bg-background"
                  >
                    <span className="flex items-center gap-3 text-sm font-medium text-foreground">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-soft text-foreground/80">
                        {t.icon}
                      </span>
                      {t.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </button>
                ))}
              </div>
            </div>

            {/* Visual column */}
            <div className="relative bg-gradient-to-br from-background/40 via-card/40 to-background/40 p-6 md:p-10">
              <div key={tab.id + "-visual"} className="animate-fade-in">
                {tab.render()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Supporting feature cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: <Flame className="h-5 w-5" />,
            title: "Study streaks",
            body: "Daily momentum that quietly compounds — without burning you out.",
          },
          {
            icon: <Calendar className="h-5 w-5" />,
            title: "Adaptive weekly plans",
            body: "Your plan re-shapes itself around your scores, your sittings and your time.",
          },
          {
            icon: <Target className="h-5 w-5" />,
            title: "Weak-area detection",
            body: "We surface the topics costing you marks before you waste a mock on them.",
          },
          {
            icon: <TrendingUp className="h-5 w-5" />,
            title: "Progress tracking",
            body: "Mastery, accuracy and confidence — visualised across every FLK module.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="group relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_50px_-20px_oklch(0.68_0.23_340/0.3)]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
              {f.icon}
            </div>
            <h4 className="mt-4 text-base font-semibold text-foreground">
              {f.title}
            </h4>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Showcase visual panels ---------- */

function PanelChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_oklch(0.5_0.2_320/0.45)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-background/60 px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.72_0.18_25)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.82_0.15_85)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[oklch(0.75_0.18_145)]" />
      </div>
      <div className="bg-white p-5">{children}</div>
    </div>
  );
}

function FloatingChip({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute hidden md:flex items-center gap-2 rounded-2xl border border-border bg-card/90 px-3 py-2 text-xs font-medium text-foreground shadow-[0_20px_40px_-20px_oklch(0.5_0.2_320/0.4)] backdrop-blur animate-float ${className}`}
    >
      {children}
    </div>
  );
}

function DashboardPanel() {
  return (
    <div className="relative">
      <PanelChrome>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              SQE1 · January
            </div>
            <div className="mt-0.5 text-lg font-semibold text-foreground">
              Hi Amelia 👋
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
            <div className="text-center">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Days
              </div>
              <div className="font-display text-xl text-gradient-tentra">84</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Streak
              </div>
              <div className="text-sm font-semibold text-foreground">🔥 14</div>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-border bg-background/60 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gradient-tentra">
              Today
            </div>
            <div className="text-[9px] text-muted-foreground">3 of 5 done</div>
          </div>
          <ul className="mt-2 space-y-1.5">
            {[
              { t: "Negligence — duty of care", m: "45m", done: true },
              { t: "MCQs · Misrepresentation", m: "30m", done: true },
              { t: "Flashcards · Trust formalities", m: "20m", done: false },
            ].map((x, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg bg-card/70 px-2.5 py-1.5 text-xs"
              >
                <span className="flex items-center gap-2 text-foreground">
                  {x.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-gradient-pink-blue" />
                  )}
                  <span className={x.done ? "line-through text-muted-foreground" : ""}>
                    {x.t}
                  </span>
                </span>
                <span className="text-[10px] text-muted-foreground">{x.m}</span>
              </li>
            ))}
          </ul>
        </div>
      </PanelChrome>
      <FloatingChip className="-right-3 top-6">
        <Zap className="h-3.5 w-3.5 text-primary" /> Plan adapted +2h Tort
      </FloatingChip>
      <FloatingChip className="-left-4 bottom-6">
        <Flame className="h-3.5 w-3.5 text-primary" /> 14-day streak
      </FloatingChip>
    </div>
  );
}

function CoachPanel() {
  return (
    <div className="relative">
      <PanelChrome>
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-pink-blue">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">Tentra Coach</div>
            <div className="text-[10px] text-muted-foreground">
              Tutoring · adapting to your scores
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-2.5">
          <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-pink-blue px-3 py-2 text-xs text-primary-foreground">
            Explain easements simply.
          </div>
          <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-border bg-background/60 px-3 py-2 text-xs text-foreground">
            <span className="font-medium">An easement</span> is a right one
            landowner has over another's land — like a right of way…
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-card px-2 py-0.5 text-[10px] text-muted-foreground border border-border">
                Try a 5-Q quiz
              </span>
              <span className="rounded-full bg-card px-2 py-0.5 text-[10px] text-muted-foreground border border-border">
                Show case law
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Synthesising your last 3 mocks…
          </div>
        </div>
      </PanelChrome>
      <FloatingChip className="-right-4 top-10">
        <Brain className="h-3.5 w-3.5 text-primary" /> Memory: Trusts ↑ 12%
      </FloatingChip>
    </div>
  );
}

function PracticePanel() {
  return (
    <div className="relative">
      <PanelChrome>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gradient-tentra">
              FLK1 · Mini Mock
            </div>
            <div className="mt-0.5 text-sm font-semibold text-foreground">
              Question 7 of 20
            </div>
          </div>
          <div className="rounded-lg border border-border bg-background/70 px-2.5 py-1 text-xs font-medium text-foreground">
            ⏱ 14:32
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-border bg-background/60 p-3 text-xs text-foreground leading-relaxed">
          A buyer signs a contract relying on the seller's statement that the
          roof is "recently repaired." It wasn't. Which doctrine applies?
        </div>
        <div className="mt-2 space-y-1.5">
          {[
            { t: "Frustration", a: false },
            { t: "Misrepresentation", a: true },
            { t: "Mistake", a: false },
            { t: "Duress", a: false },
          ].map((o) => (
            <div
              key={o.t}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                o.a
                  ? "border-primary/40 bg-gradient-soft text-foreground"
                  : "border-border bg-card/70 text-muted-foreground"
              }`}
            >
              <span>{o.t}</span>
              {o.a && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            </div>
          ))}
        </div>
      </PanelChrome>
      <FloatingChip className="-left-4 top-8">
        <Activity className="h-3.5 w-3.5 text-primary" /> Adaptive · harder
      </FloatingChip>
      <FloatingChip className="-right-3 bottom-6">
        <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> 78% accuracy
      </FloatingChip>
    </div>
  );
}

function AnalyticsPanel() {
  const modules = [
    { n: "Contract", v: 0.86 },
    { n: "Tort", v: 0.72 },
    { n: "Land", v: 0.58 },
    { n: "Trusts", v: 0.41 },
    { n: "Crim", v: 0.65 },
    { n: "Business", v: 0.78 },
    { n: "Dispute", v: 0.69 },
    { n: "Ethics", v: 0.92 },
  ];
  return (
    <div className="relative">
      <PanelChrome>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gradient-tentra">
              Topic mastery
            </div>
            <div className="mt-0.5 text-sm font-semibold text-foreground">
              Up 8% this week
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-border bg-background/70 px-2.5 py-1 text-[10px] font-medium text-foreground">
            <TrendingUp className="h-3 w-3 text-primary" /> +8%
          </div>
        </div>
        <div className="mt-4 grid grid-cols-8 items-end gap-1.5 h-28">
          {modules.map((m) => (
            <div key={m.n} className="flex h-full flex-col justify-end gap-1.5">
              <div
                className="rounded-md ring-1 ring-border/60"
                style={{
                  height: `${m.v * 100}%`,
                  background: `linear-gradient(180deg, oklch(0.72 0.24 350 / ${0.4 + m.v * 0.5}), oklch(0.62 0.22 250 / ${0.4 + m.v * 0.5}))`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-8 gap-1.5">
          {modules.map((m) => (
            <div key={m.n} className="truncate text-center text-[9px] text-muted-foreground">
              {m.n}
            </div>
          ))}
        </div>
      </PanelChrome>
      <FloatingChip className="-right-4 top-6">
        <Target className="h-3.5 w-3.5 text-primary" /> Focus: Trusts
      </FloatingChip>
      <FloatingChip className="-left-4 bottom-8">
        <BarChart3 className="h-3.5 w-3.5 text-primary" /> 86% accuracy
      </FloatingChip>
    </div>
  );
}
