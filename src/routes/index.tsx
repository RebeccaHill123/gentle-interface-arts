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
  Timer,
  Trophy,
  Lock,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Tentra — the revision app built for SQE students" },
      {
        name: "description",
        content:
          "Track revision like athletes track training. Streaks, analytics, AI coach and a personalised SQE plan — built for ambitious UK law students.",
      },
      { property: "og:title", content: "Tentra — track revision like athletes track training" },
      {
        property: "og:description",
        content:
          "The revision app built for SQE students. Streaks, analytics, AI coach. Free during early access.",
      },
    ],
  }),
});

function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  // Anonymous visitors go straight into the plan builder — they experience
  // the personalised "aha moment" before being asked to create an account.
  const ctaTo = isAuthenticated ? "/dashboard" : "/onboarding";
  const ctaLabel = isAuthenticated ? "Go to Dashboard" : "Start Revising Free";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />

      <div className="relative pb-28 md:pb-0">
        {/* HEADER */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-6 md:py-6">
          <BrandMark />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-1.5 md:gap-2">
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-full bg-card/60" />
            ) : isAuthenticated ? (
              <Button
                asChild
                size="sm"
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="rounded-full">
                  <Link to="/auth" search={{ mode: "signin" }}>Sign in</Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
                >
                  <Link to="/auth" search={{ mode: "signup" }}>Get started</Link>
                </Button>
              </>
            )}
          </div>
        </header>

        {/* HERO — mobile-first, above-the-fold value prop */}
        <section className="mx-auto max-w-6xl px-5 pt-4 pb-10 md:px-6 md:pt-12 md:pb-16">
          <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-12">
            <div className="text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground/80 backdrop-blur">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Early access · Launching summer 2026
              </span>

              <h1 className="mt-4 text-[2.4rem] font-light leading-[1.02] tracking-tight text-foreground md:text-[3.6rem] lg:text-[4.25rem]">
                The revision app built for{" "}
                <span className="italic text-gradient-tentra font-light inline-block pr-[0.15em]">
                  SQE students
                </span>
                .
              </h1>

              <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-muted-foreground md:mx-0 md:max-w-lg md:text-lg">
                Track revision like athletes track training. Streaks, analytics
                and an AI coach — all wrapped in a plan that adapts to you.
              </p>

              <div className="mt-7 flex flex-col items-center gap-2.5 md:flex-row md:items-start md:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="h-14 w-full rounded-full bg-gradient-pink-blue px-8 text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95 md:w-auto"
                >
                  <Link to={ctaTo} search={isAuthenticated ? undefined : { mode: "signup" }}>
                    {ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                {!isAuthenticated && (
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-14 rounded-full text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Link to="/auth" search={{ mode: "signin" }}>I already have an account</Link>
                  </Button>
                )}
              </div>

              <div className="mt-5 flex items-center justify-center gap-4 text-[11px] text-muted-foreground md:justify-start">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Free in early access
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-primary" /> 30-second sign-up
                </span>
              </div>
            </div>

            {/* Hero phone mockup */}
            <div className="relative mx-auto w-full max-w-[320px] md:max-w-[360px]">
              <div className="absolute -inset-10 -z-10 rounded-[3rem] bg-gradient-tentra opacity-25 blur-3xl" />
              <PhoneFrame>
                <DashboardPanel />
              </PhoneFrame>
              <FloatingChip className="-right-2 top-12 hidden sm:flex">
                <Flame className="h-3.5 w-3.5 text-primary" /> 14-day streak
              </FloatingChip>
              <FloatingChip className="-left-3 bottom-16 hidden sm:flex">
                <Zap className="h-3.5 w-3.5 text-primary" /> +2h Tort added
              </FloatingChip>
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF STRIP */}
        <section className="mx-auto max-w-6xl px-5 pb-12 md:px-6">
          <div className="grid grid-cols-3 gap-2 rounded-3xl border border-border bg-card/60 p-4 backdrop-blur md:gap-6 md:p-6">
            <ProofStat top="Built for" big="SQE1 + 2" sub="UK law students" />
            <ProofStat top="Designed by" big="Top-tier" sub="future solicitors" />
            <ProofStat top="Status" big="Early access" sub="join the beta" />
          </div>
        </section>

        {/* FEATURES — phone carousel */}
        <section id="features" className="mx-auto max-w-6xl px-5 pb-20 md:px-6 md:pb-28">
          <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gradient-tentra">
              The platform
            </div>
            <h2 className="mt-3 text-[2rem] font-normal leading-tight text-foreground md:text-5xl">
              Everything you need to{" "}
              <span className="italic text-gradient-tentra font-light inline-block pr-[0.15em]">
                lock in
              </span>
              .
            </h2>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Coaching, adaptive practice, mocks, focus sprints and analytics —
              one beautifully calm workflow.
            </p>
          </div>

          <FeatureShowcase />
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="mx-auto max-w-6xl px-5 pb-20 md:px-6 md:pb-28">
          <div className="mb-10 text-center md:mb-14">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gradient-tentra">
              How it works
            </div>
            <h2 className="mt-3 text-[2rem] font-normal leading-tight text-foreground md:text-5xl">
              Set up in under a minute.
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3 md:gap-6">
            <StepCard num="01" icon={<Calendar className="h-5 w-5" />} title="Set your exam date" body="Tell us when you're sitting SQE1 or SQE2." />
            <StepCard num="02" icon={<Brain className="h-5 w-5" />} title="Rate your confidence" body="Score each module so we know where to focus." />
            <StepCard num="03" icon={<Target className="h-5 w-5" />} title="Start your streak" body="A clear daily plan, tuned as you go." />
          </div>
        </section>

        {/* TESTIMONIAL / VIBE */}
        <section className="mx-auto max-w-3xl px-5 pb-20 md:px-6 md:pb-24">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/70 p-8 text-center backdrop-blur md:p-12">
            <div className="absolute -inset-x-10 -top-10 -z-10 h-40 bg-gradient-tentra opacity-20 blur-3xl" />
            <Sparkles className="mx-auto h-5 w-5 text-pink" />
            <p className="mt-4 text-xl font-light leading-snug text-foreground md:text-2xl">
              "Like Strava, but for SQE prep. The streaks make me actually want
              to open my notes."
            </p>
            <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">
              Designed for ambitious UK law students
            </p>
          </div>
        </section>

        {/* PRICING / EARLY ACCESS */}
        <section id="pricing" className="mx-auto max-w-3xl px-5 pb-24 md:px-6 md:pb-28">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card/70 p-8 text-center backdrop-blur md:p-12">
            <div className="absolute inset-0 -z-10 bg-gradient-tentra opacity-10" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-foreground">
              <Trophy className="h-3 w-3 text-pink" /> Early access
            </div>
            <h2 className="mt-4 text-[2rem] font-normal leading-tight text-foreground md:text-5xl">
              Free during{" "}
              <span className="italic text-gradient-tentra font-light inline-block pr-[0.15em]">
                Tentra
              </span>{" "}
              early access ✨
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground md:text-base">
              Every Pro feature unlocked for everyone right now. No card. No
              checkout. Just sign up and start your streak.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-7 h-14 w-full max-w-xs rounded-full bg-gradient-pink-blue px-8 text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95"
            >
              <Link to={ctaTo} search={isAuthenticated ? undefined : { mode: "signup" }}>
                {ctaLabel} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-border/60">
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
            <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} Tentra</div>
          </div>
        </footer>
      </div>

      {/* MOBILE STICKY CTA */}
      {!isAuthenticated && !loading && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 px-4 py-3 backdrop-blur-xl md:hidden">
          <Button
            asChild
            className="h-12 w-full rounded-full bg-gradient-pink-blue text-base font-semibold text-primary-foreground shadow-glow hover:opacity-95"
          >
            <Link to="/auth" search={{ mode: "signup" }}>
              Start Revising Free <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function ProofStat({ top, big, sub }: { top: string; big: string; sub: string }) {
  return (
    <div className="text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground md:text-[10px]">
        {top}
      </div>
      <div className="mt-1 text-sm font-semibold text-gradient-tentra md:text-lg">{big}</div>
      <div className="text-[10px] text-muted-foreground md:text-xs">{sub}</div>
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
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-lg md:p-7">
      <div className="absolute right-5 top-3 font-display text-5xl leading-none text-gradient-tentra opacity-20">
        {num}
      </div>
      <div className="relative">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
          {icon}
        </div>
        <h3 className="mt-5 text-lg font-semibold text-foreground md:text-xl">{title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

/* ---------- Phone frame ---------- */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto rounded-[2.5rem] border border-border bg-foreground/90 p-2 shadow-[0_40px_120px_-30px_oklch(0.5_0.2_320/0.45)]">
      <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground/95" />
      <div className="overflow-hidden rounded-[2rem] bg-background">
        <div className="px-3 pb-4 pt-9">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Showcase ---------- */

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
    label: "Plan",
    icon: <LayoutDashboard className="h-4 w-4" />,
    eyebrow: "Your daily plan",
    title: "Every day, planned for you.",
    body: "A live snapshot of your countdown, streak, weekly hours and the exact tasks to ship today.",
    render: () => <DashboardPanel />,
  },
  {
    id: "focus",
    label: "Focus",
    icon: <Timer className="h-4 w-4" />,
    eyebrow: "Lock-in mode",
    title: "Focus sprints that build the streak.",
    body: "Strava-style sessions. Set a timer, log the work, watch the streak climb.",
    render: () => <FocusPanel />,
  },
  {
    id: "coach",
    label: "Coach",
    icon: <MessageSquareText className="h-4 w-4" />,
    eyebrow: "Always-on tutor",
    title: "An SQE coach that actually knows you.",
    body: "Ask anything. Get explanations and quizzes tuned to your latest results.",
    render: () => <CoachPanel />,
  },
  {
    id: "practice",
    label: "Mocks",
    icon: <ClipboardCheck className="h-4 w-4" />,
    eyebrow: "Built for FLK1 & FLK2",
    title: "Mocks tuned to your weak spots.",
    body: "Adaptive MCQs that get harder where you're soft and reinforce what's stuck.",
    render: () => <PracticePanel />,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-4 w-4" />,
    eyebrow: "See your edge",
    title: "Confidence, mapped to the syllabus.",
    body: "Track accuracy, mastery and time per topic. Watch weak areas turn into strengths.",
    render: () => <AnalyticsPanel />,
  },
];

function FeatureShowcase() {
  const [active, setActive] = useState<string>(SHOWCASE_TABS[0].id);
  const tab = SHOWCASE_TABS.find((t) => t.id === active) ?? SHOWCASE_TABS[0];

  return (
    <div className="space-y-8">
      {/* Tab selector — horizontal scroll on mobile */}
      <div className="-mx-5 px-5 md:mx-0 md:px-0">
        <div className="flex justify-start gap-1.5 overflow-x-auto pb-1 md:justify-center [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/70 p-1 backdrop-blur">
            {SHOWCASE_TABS.map((t) => {
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`group flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all md:px-4 md:text-sm ${
                    isActive
                      ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Showcase */}
      <div className="relative">
        <div className="absolute -inset-x-6 -top-10 -bottom-10 -z-10 rounded-[3rem] bg-gradient-tentra opacity-10 blur-3xl" />
        <div className="grid items-center gap-8 md:grid-cols-[1fr_1fr] md:gap-12">
          {/* Phone */}
          <div className="order-2 md:order-1">
            <div className="relative mx-auto w-full max-w-[300px] md:max-w-[340px]">
              <div key={tab.id + "-visual"} className="animate-fade-in">
                <PhoneFrame>{tab.render()}</PhoneFrame>
              </div>
            </div>
          </div>

          {/* Copy */}
          <div key={tab.id + "-copy"} className="order-1 animate-fade-in text-center md:order-2 md:text-left">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gradient-tentra">
              {tab.eyebrow}
            </div>
            <h3 className="mt-3 text-2xl font-normal text-foreground md:text-4xl">{tab.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">{tab.body}</p>
          </div>
        </div>
      </div>

      {/* Quick feature pills */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: <Flame className="h-4 w-4" />, title: "Study streaks" },
          { icon: <Activity className="h-4 w-4" />, title: "Heatmaps" },
          { icon: <Target className="h-4 w-4" />, title: "Weak-area focus" },
          { icon: <TrendingUp className="h-4 w-4" />, title: "Mastery tracking" },
        ].map((f) => (
          <div
            key={f.title}
            className="flex items-center gap-2.5 rounded-2xl border border-border bg-card/60 px-4 py-3 backdrop-blur"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-pink-blue text-primary-foreground">
              {f.icon}
            </span>
            <span className="text-xs font-semibold text-foreground md:text-sm">{f.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Visual panels (rendered inside PhoneFrame) ---------- */

function FloatingChip({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute items-center gap-2 rounded-2xl border border-border bg-card/95 px-3 py-2 text-xs font-medium text-foreground shadow-[0_20px_40px_-20px_oklch(0.5_0.2_320/0.4)] backdrop-blur animate-float ${className}`}
    >
      {children}
    </div>
  );
}

function DashboardPanel() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            SQE1 · January
          </div>
          <div className="mt-0.5 text-base font-semibold text-foreground">Hi Amelia 👋</div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card/70 px-2.5 py-1.5">
          <div className="text-center">
            <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Days</div>
            <div className="font-display text-lg leading-none text-gradient-tentra">84</div>
          </div>
          <div className="h-7 w-px bg-border" />
          <div className="text-center">
            <div className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground">Streak</div>
            <div className="text-xs font-semibold text-foreground">🔥 14</div>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-border bg-card/60 p-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-gradient-tentra">Today</div>
          <div className="text-[8px] text-muted-foreground">3 of 5 done</div>
        </div>
        <ul className="mt-2 space-y-1.5">
          {[
            { t: "Negligence — duty of care", m: "45m", done: true },
            { t: "MCQs · Misrepresentation", m: "30m", done: true },
            { t: "Flashcards · Trust formalities", m: "20m", done: false },
            { t: "Read — Land registration", m: "25m", done: false },
          ].map((x, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg bg-card px-2 py-1.5 text-[11px]"
            >
              <span className="flex items-center gap-2 text-foreground">
                {x.done ? (
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-gradient-pink-blue" />
                )}
                <span className={x.done ? "line-through text-muted-foreground" : ""}>{x.t}</span>
              </span>
              <span className="text-[9px] text-muted-foreground">{x.m}</span>
            </li>
          ))}
        </ul>
      </div>
      {/* mini heatmap */}
      <div className="mt-3 rounded-xl border border-border bg-card/60 p-2.5">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-gradient-tentra">Last 8 weeks</div>
        <div className="mt-2 grid grid-cols-14 gap-[3px]" style={{ gridTemplateColumns: "repeat(14, minmax(0, 1fr))" }}>
          {Array.from({ length: 56 }).map((_, i) => {
            const intensity = (Math.sin(i * 0.7) + 1) / 2;
            return (
              <div
                key={i}
                className="aspect-square rounded-[2px]"
                style={{
                  background: `oklch(0.72 0.24 350 / ${0.08 + intensity * 0.7})`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FocusPanel() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-gradient-tentra">Focus sprint</div>
          <div className="mt-0.5 text-base font-semibold text-foreground">Tort · Negligence</div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card/70 px-2 py-0.5 text-[9px] font-medium">
          <Flame className="h-3 w-3 text-primary" /> Day 14
        </div>
      </div>
      <div className="relative mt-4 grid place-items-center">
        <svg viewBox="0 0 120 120" className="h-40 w-40">
          <defs>
            <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.24 350)" />
              <stop offset="100%" stopColor="oklch(0.62 0.22 250)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="50" stroke="oklch(0.3 0.05 285 / 10%)" strokeWidth="8" fill="none" />
          <circle
            cx="60" cy="60" r="50"
            stroke="url(#ring)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * 0.32}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute text-center">
          <div className="font-display text-2xl text-gradient-tentra">17:42</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Deep work</div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded-xl border border-border bg-card/60 p-2">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Today</div>
          <div className="text-xs font-semibold text-foreground">2h 15m</div>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-2">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Week</div>
          <div className="text-xs font-semibold text-foreground">11h</div>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-2">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Sessions</div>
          <div className="text-xs font-semibold text-foreground">4 / 5</div>
        </div>
      </div>
    </div>
  );
}

function CoachPanel() {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border pb-2.5">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-gradient-pink-blue">
          <Sparkles className="h-3 w-3 text-primary-foreground" />
        </span>
        <div>
          <div className="text-xs font-semibold text-foreground">Tentra Coach</div>
          <div className="text-[9px] text-muted-foreground">Adapting to your scores</div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-gradient-pink-blue px-3 py-2 text-[11px] text-primary-foreground">
          Explain easements simply.
        </div>
        <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-border bg-card/60 px-3 py-2 text-[11px] text-foreground">
          <span className="font-medium">An easement</span> is a right one
          landowner has over another's land — like a right of way…
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-card px-2 py-0.5 text-[9px] text-muted-foreground border border-border">
              Try a 5-Q quiz
            </span>
            <span className="rounded-full bg-card px-2 py-0.5 text-[9px] text-muted-foreground border border-border">
              Show case law
            </span>
          </div>
        </div>
        <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-md bg-gradient-pink-blue px-3 py-2 text-[11px] text-primary-foreground">
          Quiz me.
        </div>
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Synthesising your last 3 mocks…
        </div>
      </div>
    </div>
  );
}

function PracticePanel() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-gradient-tentra">FLK1 · Mini Mock</div>
          <div className="mt-0.5 text-xs font-semibold text-foreground">Question 7 of 20</div>
        </div>
        <div className="rounded-lg border border-border bg-card/70 px-2 py-0.5 text-[10px] font-medium text-foreground">
          ⏱ 14:32
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-border bg-card/60 p-2.5 text-[11px] leading-relaxed text-foreground">
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
            className={`flex items-center justify-between rounded-lg border px-3 py-2 text-[11px] ${
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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-wider text-gradient-tentra">Topic mastery</div>
          <div className="mt-0.5 text-xs font-semibold text-foreground">Up 8% this week</div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card/70 px-2 py-0.5 text-[9px] font-medium text-foreground">
          <TrendingUp className="h-3 w-3 text-primary" /> +8%
        </div>
      </div>
      <div className="mt-3 grid h-28 grid-cols-8 items-end gap-1.5">
        {modules.map((m) => (
          <div key={m.n} className="flex h-full flex-col justify-end">
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
          <div key={m.n} className="truncate text-center text-[8px] text-muted-foreground">
            {m.n}
          </div>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        <div className="rounded-xl border border-border bg-card/60 p-2 text-center">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Accuracy</div>
          <div className="text-sm font-semibold text-foreground">78%</div>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-2 text-center">
          <div className="text-[8px] uppercase tracking-wider text-muted-foreground">Hours</div>
          <div className="text-sm font-semibold text-foreground">42h</div>
        </div>
      </div>
    </div>
  );
}
