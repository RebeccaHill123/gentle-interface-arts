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

        <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 md:pt-24">
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

          <div className="mt-20">
            <HeroPreview />
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

function HeroPreview() {
  const days = 84;
  const modules = [
    { name: "Contract", c: 4 },
    { name: "Tort", c: 3 },
    { name: "Criminal", c: 2 },
    { name: "Land Law", c: 2 },
    { name: "Trusts", c: 1 },
    { name: "Business", c: 3 },
    { name: "Dispute", c: 4 },
    { name: "Ethics", c: 5 },
  ];
  return (
    <div className="relative mx-auto max-w-5xl">
      <div className="absolute -inset-x-10 -top-10 -bottom-20 -z-10 rounded-[3rem] bg-gradient-tentra opacity-20 blur-3xl" />
      {/* Browser frame */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-[0_40px_120px_-30px_oklch(0.5_0.2_320/0.45)] backdrop-blur">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border bg-background/60 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[oklch(0.72_0.18_25)]" />
          <span className="h-3 w-3 rounded-full bg-[oklch(0.82_0.15_85)]" />
          <span className="h-3 w-3 rounded-full bg-[oklch(0.75_0.18_145)]" />
          <div className="mx-auto flex items-center gap-2 rounded-md bg-card/70 px-3 py-1 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            app.tentra.co/dashboard
          </div>
          <span className="w-12" />
        </div>

        {/* Dashboard content */}
        <div className="bg-white p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                SQE1 · January sitting
              </div>
              <div className="mt-1 text-2xl font-semibold text-foreground">
                Hi Amelia 👋
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-background/70 px-4 py-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Days to exam
                </div>
                <div className="font-display text-3xl text-gradient-tentra">
                  {days}
                </div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Streak
                </div>
                <div className="flex items-center gap-1 text-lg font-semibold text-foreground">
                  🔥 14 days
                </div>
              </div>
              <div className="h-12 w-px bg-border" />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  This week
                </div>
                <div className="text-lg font-semibold text-foreground">12 hrs</div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-gradient-tentra">
                  Today's plan
                </div>
                <div className="text-[10px] font-medium text-muted-foreground">
                  3 of 5 done
                </div>
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  { t: "Read: Negligence — duty of care", m: "45m" },
                  { t: "Practice MCQs: Misrepresentation", m: "30m" },
                  { t: "Flashcards: Trust formalities", m: "20m" },
                ].map((x, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl bg-card/70 p-3 text-sm"
                  >
                    <span className="flex items-center gap-3 text-foreground">
                      <span className="h-2 w-2 rounded-full bg-gradient-pink-blue" />
                      {x.t}
                    </span>
                    <span className="text-xs text-muted-foreground">{x.m}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-border bg-background/60 p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-cyan">
                Topic mastery
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {modules.map((m) => (
                  <div key={m.name} className="space-y-1.5">
                    <div
                      className="h-14 rounded-lg ring-1 ring-border/60"
                      style={{
                        background: `linear-gradient(180deg, oklch(0.72 0.24 350 / ${0.25 + (m.c / 5) * 0.5}), oklch(0.62 0.22 250 / ${0.25 + (m.c / 5) * 0.5}))`,
                      }}
                    />
                    <div className="truncate text-[10px] font-medium text-muted-foreground">
                      {m.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
