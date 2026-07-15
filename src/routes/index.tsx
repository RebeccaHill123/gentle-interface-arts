import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Sparkles,
  Calendar,
  Target,
  LayoutDashboard,
  MessageSquareText,
  BarChart3,
  Flame,
  ClipboardCheck,
  TrendingUp,
  CheckCircle2,
  Timer,
  Play,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Tentra — Adaptive study planner for SQE, NY Bar & MPRE" },
      {
        name: "description",
        content:
          "Tentra builds your daily study plan around your exam date, available time and progress. Built for SQE, NY Bar and MPRE students.",
      },
      { property: "og:title", content: "Tentra — Adaptive study planner for SQE, NY Bar & MPRE" },
      {
        property: "og:description",
        content:
          "Stop planning. Start studying. An adaptive daily study plan for SQE, NY Bar and MPRE candidates.",
      },
      { property: "og:url", content: "https://tentraapp.com/" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Tentra",
          applicationCategory: "EducationApplication",
          operatingSystem: "Web",
          url: "https://tentraapp.com/",
          description:
            "Adaptive study planner with focus sessions, weak-area drills and AI coaching for SQE, NY Bar and MPRE candidates.",
          offers: { "@type": "Offer", price: "16.99", priceCurrency: "GBP" },
        }),
      },
    ],
  }),
});

/* ---------- Premium primitives ---------- */

function PremiumCta({
  to,
  search,
  children,
  className = "",
  size = "md",
}: {
  to: string;
  search?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  const h = size === "lg" ? "h-12 md:h-[52px]" : "h-11 md:h-12";
  return (
    <Button
      asChild
      className={`group relative ${h} min-h-11 rounded-full px-7 text-[14.5px] font-medium tracking-[-0.005em] text-primary-foreground transition-all duration-200 hover:brightness-[1.06] active:scale-[0.985] active:brightness-95 ${className}`}
      style={{
        background:
          "linear-gradient(120deg, oklch(0.80 0.15 350) 0%, oklch(0.74 0.15 330) 45%, oklch(0.70 0.15 270) 100%)",
        boxShadow:
          "0 1px 0 0 oklch(1 0 0 / 0.25) inset, 0 12px 30px -12px oklch(0.55 0.15 320 / 0.40)",
      }}
    >
      <Link to={to as never} search={search as never}>
        {children}
      </Link>
    </Button>
  );
}

function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const ctaTo = isAuthenticated ? "/dashboard" : "/onboarding";

  // Sticky CTA visibility — only show once the hero CTA leaves the viewport.
  const heroCtaRef = useRef<HTMLDivElement | null>(null);
  const [showStickyCta, setShowStickyCta] = useState(false);
  useEffect(() => {
    const el = heroCtaRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setShowStickyCta(!entry.isIntersecting),
      { rootMargin: "0px 0px -20px 0px", threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <BackgroundBlobs />

      <div className="relative pb-24 md:pb-0">
        {/* HEADER — compact on mobile */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8 md:py-6">
          <BrandMark />
          <nav className="hidden items-center gap-9 text-[13px] font-normal text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2 md:gap-4">
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-full bg-card/60" />
            ) : isAuthenticated ? (
              <PremiumCta to="/dashboard" className="px-5">
                <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
              </PremiumCta>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ mode: "signin" }}
                  className="inline-flex min-h-11 items-center px-2 text-[13px] font-normal text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign in
                </Link>
                <PremiumCta to="/onboarding" className="px-4 md:px-5">
                  Get started
                </PremiumCta>
              </>
            )}
          </div>
        </header>

        <main>
          {/* HERO — mobile first */}
          <section className="mx-auto max-w-6xl px-4 pt-2 pb-10 md:px-8 md:pt-12 md:pb-20">
            <div className="grid items-center gap-8 md:grid-cols-[1.05fr_1fr] md:gap-16">
              <div className="text-left">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  SQE · NY Bar · MPRE
                </div>

                <h1 className="mt-4 text-[2.35rem] font-light leading-[1.02] tracking-[-0.03em] text-foreground sm:text-[2.6rem] md:text-[2.85rem] lg:text-[3.15rem]">
                  Stop planning.
                  <br />
                  <span className="text-gradient-pink-violet font-light">Start studying.</span>
                </h1>

                <p className="mt-5 max-w-[32rem] text-[15.5px] leading-[1.55] text-muted-foreground md:text-[16.5px]">
                  Tentra builds your daily study plan around your exam date, available time and progress.
                </p>

                <div ref={heroCtaRef} className="mt-7 flex flex-col items-stretch gap-3 md:flex-row md:items-center">
                  {isAuthenticated ? (
                    <PremiumCta to={ctaTo} size="lg" className="w-full md:w-auto">
                      View dashboard
                      <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </PremiumCta>
                  ) : (
                    <PremiumCta to="/onboarding" size="lg" className="w-full md:w-auto">
                      Build my plan
                      <ArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </PremiumCta>
                  )}
                  <a
                    href="#features"
                    className="inline-flex min-h-11 items-center justify-center text-[13.5px] font-medium text-muted-foreground transition-colors hover:text-foreground md:ml-2"
                  >
                    See Tentra in action ↓
                  </a>
                </div>

                <p className="mt-3 text-[13px] leading-snug text-muted-foreground/80">
                  Your first plan takes under 2 minutes.
                </p>
              </div>

              {/* Hero product preview — edge-to-edge card on mobile */}
              <div className="relative -mx-1 mt-2 sm:mx-0 md:mt-0">
                <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-pink-violet opacity-[0.16] blur-3xl motion-reduce:hidden" />
                <HeroPreviewCard />
              </div>
            </div>
          </section>

          {/* FEATURES — moved directly under hero preview */}
          <section id="features" className="mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-28">
            <div className="mx-auto mb-8 max-w-2xl text-center md:mb-14">
              <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                The platform
              </div>
              <h2 className="mt-4 text-[1.85rem] font-light leading-[1.08] tracking-[-0.03em] text-foreground md:text-[2.6rem]">
                Everything you need to{" "}
                <span className="text-gradient-pink-violet font-light">make progress</span>.
              </h2>
              <p className="mt-4 text-[14.5px] leading-[1.55] text-muted-foreground md:text-[16px]">
                Plan your work, focus properly, practise your weak areas and see what is improving.
              </p>
            </div>

            <FeatureShowcase />
          </section>

          {/* HOW IT WORKS */}
          <section id="how" className="mx-auto max-w-6xl px-4 pb-16 md:px-8 md:pb-28">
            <div className="mb-8 text-center md:mb-14">
              <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                How it works
              </div>
              <h2 className="mt-4 text-[1.85rem] font-light leading-[1.08] tracking-[-0.03em] text-foreground md:text-[2.6rem]">
                Three steps. That's it.
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3 md:gap-6">
              <StepCard num="01" icon={<Calendar className="h-4 w-4" />} title="Tell us your exam" body="Choose your route, exam date and weekly availability." />
              <StepCard num="02" icon={<LayoutDashboard className="h-4 w-4" />} title="Get your daily plan" body="Tentra turns the syllabus into manageable daily tasks." />
              <StepCard num="03" icon={<Target className="h-4 w-4" />} title="Keep progressing" body="Your plan adapts when you complete, miss or reschedule work." />
            </div>
          </section>

          {/* STATEMENT (replaces testimonial) */}
          <section className="mx-auto max-w-3xl px-4 pb-16 md:px-8 md:pb-24">
            <div className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/60 p-7 text-center backdrop-blur md:rounded-[1.75rem] md:p-14">
              <div className="absolute inset-x-10 -top-16 -z-10 h-32 bg-gradient-pink-violet opacity-[0.10] blur-3xl motion-reduce:hidden" />
              <p className="mx-auto max-w-xl text-[1.35rem] font-light leading-[1.2] tracking-[-0.015em] text-foreground md:text-[1.85rem]">
                Less time planning.
                <br />
                <span className="text-gradient-pink-violet">More time making progress.</span>
              </p>
              <p className="mx-auto mt-5 max-w-md text-[14px] leading-[1.55] text-muted-foreground md:text-[15px]">
                Tentra handles the structure so you can focus on the work.
              </p>
            </div>
          </section>

          {/* PRICING */}
          <section id="pricing" className="mx-auto max-w-5xl px-4 pb-20 md:px-8 md:pb-28">
            <div className="mx-auto mb-8 max-w-2xl text-center md:mb-14">
              <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Pricing
              </div>
              <h2 className="mt-4 text-[1.85rem] font-light leading-[1.08] tracking-[-0.03em] text-foreground md:text-[2.6rem]">
                Simple, transparent{" "}
                <span className="text-gradient-pink-violet font-light">pricing</span>.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-[1.55] text-muted-foreground md:text-[15.5px]">
                Full access. Cancel anytime.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 md:gap-6">
              {/* Monthly */}
              <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur md:p-8">
                <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Monthly
                </div>
                <h3 className="text-[1.25rem] font-medium tracking-[-0.02em] text-foreground md:text-[1.5rem]">
                  Monthly
                </h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-[2.25rem] font-light tracking-[-0.03em] text-foreground md:text-[3rem]">
                    £16.99
                  </span>
                  <span className="text-[13px] font-normal text-muted-foreground">/ month</span>
                </div>
                <p className="mt-3 text-[13.5px] leading-[1.5] text-muted-foreground">
                  Flexible month-to-month access.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <PremiumCta to="/onboarding" size="lg" className="w-full">
                    Build my plan
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </PremiumCta>
                  <span className="text-center text-[12px] text-muted-foreground">
                    Cancel anytime.
                  </span>
                </div>
              </div>

              {/* 6-month — highlighted with clear saving */}
              <div className="relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-glow backdrop-blur md:p-8">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-pink-blue opacity-60" />
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-gradient-pink-blue px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-primary-foreground">
                    Best value
                  </span>
                  <span className="inline-flex items-center rounded-full border border-pink/40 bg-pink/10 px-2.5 py-1 text-[10.5px] font-semibold text-foreground">
                    Save £29
                  </span>
                </div>
                <h3 className="text-[1.25rem] font-medium tracking-[-0.02em] text-foreground md:text-[1.5rem]">
                  6-month access
                </h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-[2.25rem] font-light tracking-[-0.03em] text-foreground md:text-[3rem]">
                    £72.99
                  </span>
                  <span className="text-[13px] text-muted-foreground line-through">£101.94</span>
                </div>
                <p className="mt-3 text-[13.5px] leading-[1.5] text-muted-foreground">
                  Around <span className="font-medium text-foreground">£12.17/month</span> — best for a full revision block.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <PremiumCta to="/onboarding" size="lg" className="w-full">
                    Build my plan
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </PremiumCta>
                  <span className="text-center text-[12px] text-muted-foreground">
                    Billed every 6 months. Cancel anytime.
                  </span>
                </div>
              </div>
            </div>

            {/* Included — grouped into 6 concise benefits */}
            <div className="mt-8 rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur md:p-8">
              <h3 className="text-[15px] font-medium tracking-[-0.01em] text-foreground md:text-[17px]">
                What's included
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 md:mt-6 md:gap-4">
                <IncludedItem
                  icon={<Calendar className="h-4 w-4" />}
                  title="Adaptive daily plan"
                  body="Personal study plan built around your exam date and availability."
                />
                <IncludedItem
                  icon={<Timer className="h-4 w-4" />}
                  title="Focus sessions"
                  body="Timed sessions with topic logging and streak tracking."
                />
                <IncludedItem
                  icon={<MessageSquareText className="h-4 w-4" />}
                  title="AI Coach & Tutor"
                  body="Explanations and quizzes shaped by your latest activity."
                />
                <IncludedItem
                  icon={<ClipboardCheck className="h-4 w-4" />}
                  title="Practice questions"
                  body="Topic-based questions and mini tests. Full mocks coming soon."
                />
                <IncludedItem
                  icon={<BarChart3 className="h-4 w-4" />}
                  title="Analytics"
                  body="See time studied by subject and where your gaps are."
                />
                <IncludedItem
                  icon={<Flame className="h-4 w-4" />}
                  title="Progress tracking"
                  body="Streaks, weekly hours and adherence to keep momentum."
                />
              </div>
            </div>
          </section>
        </main>

        {/* FOOTER */}
        <footer className="border-t border-border/50">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-[12.5px] text-muted-foreground md:flex-row md:px-8">
            <div className="flex items-center gap-2.5">
              <span
                className="grid h-6 w-6 place-items-center rounded-md"
                style={{
                  background:
                    "linear-gradient(120deg, oklch(0.72 0.22 350), oklch(0.60 0.20 270))",
                }}
              >
                <span className="font-display text-[11px] font-semibold text-primary-foreground">T</span>
              </span>
              <span className="font-medium tracking-tight text-foreground">Tentra</span>
            </div>
            <nav className="flex items-center gap-5">
              <Link to="/terms" className="transition-colors hover:text-foreground">Terms</Link>
              <Link to="/privacy" className="transition-colors hover:text-foreground">Privacy</Link>
              <span>© {new Date().getFullYear()} Tentra</span>
            </nav>
          </div>
        </footer>
      </div>

      {/* MOBILE STICKY CTA — hidden while hero CTA is visible */}
      {!isAuthenticated && !loading && (
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl transition-transform duration-200 md:hidden ${
            showStickyCta ? "translate-y-0" : "translate-y-full"
          }`}
          aria-hidden={!showStickyCta}
        >
          <PremiumCta to="/onboarding" size="lg" className="w-full">
            Build my plan <ArrowRight className="ml-1.5 h-4 w-4" />
          </PremiumCta>
        </div>
      )}
    </div>
  );
}

/* ---------- Hero preview card (wide, edge-to-edge) ---------- */

function HeroPreviewCard() {
  return (
    <div className="relative w-full">
      <div className="relative overflow-hidden rounded-[1.5rem] border border-border/70 bg-card/80 p-4 shadow-[0_20px_60px_-25px_oklch(0.25_0.05_280/0.35)] backdrop-blur sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Today's plan
            </div>
            <div className="mt-1 text-[15px] font-medium tracking-[-0.01em] text-foreground">
              1 of 3 complete
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10.5px] font-medium text-foreground">
            <Calendar className="h-3 w-3 text-pink" />
            84 days to exam
          </div>
        </div>

        {/* Plan blocks — mirrors dashboard TodayPlanCard */}
        <ul className="mt-4 space-y-2">
          {[
            {
              priority: "Must do",
              priorityCls: "bg-pink/10 text-pink/90",
              subject: "Contract Law",
              minutes: "25m",
              format: "Quiz",
              title: "Consideration & promissory estoppel",
              reason: "Weakest topic — 54% accuracy last 20 Qs",
              done: false,
            },
            {
              priority: "Weak spot",
              priorityCls: "bg-amber-500/10 text-amber-500/90",
              subject: "Tort",
              minutes: "20m",
              format: "Flashcards",
              title: "Negligence: duty of care",
              reason: "Due for spaced review today",
              done: true,
            },
            {
              priority: "High yield",
              priorityCls: "bg-violet-500/10 text-violet-400/90",
              subject: "Criminal",
              minutes: "15m",
              format: "Revision",
              title: "Actus reus vs mens rea",
              reason: "High-yield for SQE1 — not started",
              done: false,
            },
          ].map((x) => (
            <li
              key={x.title}
              className={`group flex items-stretch gap-3 rounded-2xl border border-border/60 bg-background/40 p-3 shadow-card transition-colors ${
                x.done ? "opacity-70" : ""
              }`}
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-medium ${x.priorityCls}`}>
                    {x.priority}
                  </span>
                  <span className="rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[9.5px] text-muted-foreground">
                    {x.subject}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[9.5px] text-muted-foreground">
                    <Timer className="h-2.5 w-2.5" /> {x.minutes}
                  </span>
                  <span className="rounded-full bg-foreground/[0.05] px-1.5 py-0.5 text-[9.5px] text-muted-foreground">
                    {x.format}
                  </span>
                </div>
                <p className={`text-[12.5px] font-medium leading-snug ${x.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {x.title}
                </p>
                <p className="text-[10.5px] italic text-muted-foreground/85">
                  {x.reason}
                </p>
              </div>
              <div
                className={`grid h-8 w-8 shrink-0 place-items-center self-center rounded-full border ${
                  x.done
                    ? "border-transparent bg-pink/15 text-pink"
                    : "border-border/60 bg-background text-foreground"
                }`}
              >
                {x.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Play className="h-3 w-3" />}
              </div>
            </li>
          ))}
        </ul>

        {/* Recommendation */}
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-pink/25 bg-gradient-to-br from-pink/[0.08] to-violet/[0.05] p-3">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink" />
          <div className="text-[12.5px] leading-snug text-foreground">
            Tentra has prioritised <span className="font-medium">Contract Law</span> based on your recent activity.
          </div>
        </div>
      </div>

      {/* Single subtle floating badge */}
      <div className="absolute -bottom-3 right-3 hidden items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-[11px] font-medium text-foreground shadow-[0_10px_25px_-10px_oklch(0.25_0.05_280/0.35)] sm:flex">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-pink/70 motion-reduce:hidden" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink" />
        </span>
        Plan updated automatically
      </div>
    </div>
  );
}

/* ---------- Included item ---------- */

function IncludedItem({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-pink/10 text-pink">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-[12.5px] leading-[1.5] text-muted-foreground">{body}</div>
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
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur md:p-8">
      <div className="flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink/10 text-pink">
          {icon}
        </div>
        <div className="font-display text-[11px] font-medium tracking-[0.18em] text-muted-foreground/70">
          {num} / 03
        </div>
      </div>
      <h3 className="mt-5 text-[16px] font-medium tracking-[-0.015em] text-foreground md:text-[18px]">
        {title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-[1.55] text-muted-foreground">{body}</p>
    </div>
  );
}

/* ---------- Phone frame (used inside feature showcase) ---------- */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto rounded-[2.75rem] border border-foreground/10 bg-foreground/95 p-1.5 shadow-[0_30px_80px_-30px_oklch(0.25_0.05_280/0.35),0_10px_30px_-15px_oklch(0.25_0.05_280/0.2)]">
      <div
        className="absolute left-1/2 top-2 z-10 h-[18px] w-20 -translate-x-1/2 rounded-full"
        style={{
          background: "oklch(0.12 0.02 280)",
          boxShadow: "inset 0 1px 2px oklch(0 0 0 / 0.5)",
        }}
      />
      <div className="overflow-hidden rounded-[2.25rem] bg-background">
        <div className="px-3 pb-4 pt-8">{children}</div>
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
    icon: <LayoutDashboard className="h-3.5 w-3.5" />,
    eyebrow: "Daily plan",
    title: "Know exactly what to study today.",
    body: "Your countdown, streak and the precise work to ship today — at a glance.",
    render: () => <DashboardPanel />,
  },
  {
    id: "focus",
    label: "Focus",
    icon: <Timer className="h-3.5 w-3.5" />,
    eyebrow: "Deep work",
    title: "Turn revision into focused sessions you can track.",
    body: "Time your work, log the discipline, watch the consistency build.",
    render: () => <FocusPanel />,
  },
  {
    id: "coach",
    label: "Coach",
    icon: <MessageSquareText className="h-3.5 w-3.5" />,
    eyebrow: "AI coach",
    title: "Get explanations and practice shaped around your gaps.",
    body: "Tailored explanations and quizzes shaped by your latest results.",
    render: () => <CoachPanel />,
  },
  {
    id: "practice",
    label: "Mocks",
    icon: <ClipboardCheck className="h-3.5 w-3.5" />,
    eyebrow: "Practice (mocks coming soon)",
    title: "Test your knowledge under exam-style conditions.",
    body: "Topic-based practice questions today. Full timed mocks are on the way.",
    render: () => <PracticePanel />,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    eyebrow: "Performance",
    title: "See where your time is going and what needs attention.",
    body: "Accuracy, depth and pace across every module — turned into signal.",
    render: () => <AnalyticsPanel />,
  },
];

function FeatureShowcase() {
  const [active, setActive] = useState<string>(SHOWCASE_TABS[0].id);
  const tab = SHOWCASE_TABS.find((t) => t.id === active) ?? SHOWCASE_TABS[0];
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const selectTab = (id: string) => {
    setActive(id);
    const btn = tabRefs.current[id];
    btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Pill-style tab selector, scroll-snap on mobile */}
      <div className="relative -mx-4 md:mx-0">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-2 md:justify-center md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {SHOWCASE_TABS.map((t) => {
            const isActive = t.id === active;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[t.id] = el;
                }}
                onClick={() => selectTab(t.id)}
                className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 rounded-full border px-4 py-2.5 text-[13px] font-medium tracking-[-0.005em] transition-all active:scale-[0.97] ${
                  isActive
                    ? "border-transparent text-primary-foreground shadow-[0_8px_20px_-10px_oklch(0.55_0.15_320/0.55)]"
                    : "border-border/60 bg-card/60 text-muted-foreground hover:text-foreground"
                }`}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(120deg, oklch(0.80 0.15 350) 0%, oklch(0.72 0.15 320) 50%, oklch(0.66 0.15 275) 100%)",
                      }
                    : undefined
                }
                aria-pressed={isActive}
              >
                <span className={isActive ? "text-primary-foreground" : "text-pink"}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent md:hidden" />
      </div>

      {/* Headline + explanation above preview on mobile */}
      <div className="relative">
        <div className="absolute -inset-x-6 -top-8 -bottom-8 -z-10 rounded-[3rem] bg-gradient-pink-violet opacity-[0.06] blur-3xl motion-reduce:hidden" />
        <div className="grid items-center gap-6 md:grid-cols-[1fr_1fr] md:gap-16">
          <div
            key={tab.id + "-copy"}
            className="animate-fade-in text-center md:order-2 md:text-left motion-reduce:animate-none"
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              {tab.eyebrow}
            </div>
            <h3 className="mt-3 text-[1.35rem] font-light leading-[1.15] tracking-[-0.02em] text-foreground md:mt-5 md:text-[2rem]">
              {tab.title}
            </h3>
            <p className="mt-3 text-[14px] leading-[1.55] text-muted-foreground md:mt-4 md:text-[16px]">
              {tab.body}
            </p>
          </div>

          <div className="md:order-1">
            <div className="relative mx-auto w-full max-w-[280px] md:max-w-[320px]">
              <div key={tab.id + "-visual"} className="animate-fade-in motion-reduce:animate-none">
                <PhoneFrame>{tab.render()}</PhoneFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Visual panels ---------- */

function DashboardPanel() {
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = 0.68;
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[8.5px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Study plan
          </div>
          <div className="mt-0.5 text-[13px] font-medium tracking-[-0.01em] text-foreground">
            Your exam · January 2027
          </div>
        </div>
        <div className="relative grid place-items-center">
          <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
            <circle cx="22" cy="22" r={r} stroke="oklch(0.3 0.05 285 / 10%)" strokeWidth="3.5" fill="none" />
            <circle
              cx="22"
              cy="22"
              r={r}
              stroke="url(#ringGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              fill="none"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - pct)}
            />
            <defs>
              <linearGradient id="ringGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.72 0.20 350)" />
                <stop offset="100%" stopColor="oklch(0.60 0.18 295)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute text-center">
            <div className="text-[9px] font-semibold leading-none text-foreground">68%</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-pink" />
          <span className="text-[10px] font-medium text-foreground">84 days</span>
          <span className="text-[9px] text-muted-foreground">remaining</span>
        </div>
        <span className="text-[9px] text-muted-foreground">On track</span>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Today's plan
          </div>
          <div className="text-[9px] text-muted-foreground">1 of 3</div>
        </div>
        <ul className="mt-1.5 space-y-1">
          {[
            {
              priority: "Must do",
              priorityCls: "bg-pink/10 text-pink/90",
              subject: "Contract",
              minutes: "25m",
              title: "Consideration & estoppel",
              done: false,
            },
            {
              priority: "Weak spot",
              priorityCls: "bg-amber-500/10 text-amber-500/90",
              subject: "Tort",
              minutes: "20m",
              title: "Negligence: duty of care",
              done: true,
            },
            {
              priority: "High yield",
              priorityCls: "bg-violet-500/10 text-violet-400/90",
              subject: "Criminal",
              minutes: "15m",
              title: "Actus reus vs mens rea",
              done: false,
            },
          ].map((x, i) => (
            <li
              key={i}
              className={`flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 px-1.5 py-1 ${x.done ? "opacity-70" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className={`rounded-full px-1 py-[1px] text-[7.5px] font-medium ${x.priorityCls}`}>
                    {x.priority}
                  </span>
                  <span className="text-[7.5px] text-muted-foreground">{x.subject}</span>
                  <span className="text-[7.5px] text-muted-foreground">· {x.minutes}</span>
                </div>
                <div className={`truncate text-[10px] ${x.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {x.title}
                </div>
              </div>
              {x.done ? (
                <CheckCircle2 className="h-3 w-3 shrink-0 text-pink" />
              ) : (
                <Play className="h-2.5 w-2.5 shrink-0 text-foreground/70" />
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-pink/25 bg-gradient-to-br from-pink/[0.08] to-violet/[0.06] p-2.5">
        <div className="flex items-start gap-1.5">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-pink" />
          <div>
            <div className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              AI recommendation
            </div>
            <div className="mt-0.5 text-[10.5px] leading-snug text-foreground">
              Tort accuracy fell 8%. Prioritise Negligence this week.
            </div>
          </div>
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
          <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Focus sprint
          </div>
          <div className="mt-1 text-[14px] font-medium text-foreground">Tort · Negligence</div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
          <Flame className="h-3 w-3 text-pink" /> Day 14
        </div>
      </div>
      <div className="relative mt-5 grid place-items-center">
        <svg viewBox="0 0 120 120" className="h-40 w-40">
          <defs>
            <linearGradient id="ring" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.72 0.20 350)" />
              <stop offset="100%" stopColor="oklch(0.60 0.18 295)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="50" stroke="oklch(0.3 0.05 285 / 8%)" strokeWidth="6" fill="none" />
          <circle
            cx="60"
            cy="60"
            r="50"
            stroke="url(#ring)"
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${2 * Math.PI * 50 * 0.32}`}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute text-center">
          <div className="font-display text-[26px] font-light tracking-[-0.02em] text-foreground">
            17:42
          </div>
          <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">Deep work</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-1.5 text-center">
        {[
          { l: "Today", v: "2h 15m" },
          { l: "Week", v: "11h" },
          { l: "Sessions", v: "4 / 5" },
        ].map((x) => (
          <div key={x.l} className="rounded-lg border border-border/60 bg-card/40 p-2">
            <div className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">{x.l}</div>
            <div className="text-[11.5px] font-medium text-foreground">{x.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoachPanel() {
  return (
    <div>
      <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
        <span
          className="grid h-6 w-6 place-items-center rounded-md"
          style={{
            background: "linear-gradient(120deg, oklch(0.72 0.22 350), oklch(0.60 0.20 270))",
          }}
        >
          <Sparkles className="h-3 w-3 text-primary-foreground" />
        </span>
        <div>
          <div className="text-[11.5px] font-medium text-foreground">Tentra Coach</div>
          <div className="text-[9px] text-muted-foreground">Adapting to your scores</div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div
          className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md px-3 py-2 text-[11px] text-primary-foreground"
          style={{
            background: "linear-gradient(120deg, oklch(0.72 0.22 350), oklch(0.60 0.20 270))",
          }}
        >
          Explain easements simply.
        </div>
        <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-border/60 bg-card/60 px-3 py-2 text-[11px] text-foreground">
          <span className="font-medium">An easement</span> is a right one landowner has over
          another's land — like a right of way…
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-border/70 bg-card px-2 py-0.5 text-[9px] text-muted-foreground">
              Try a 5-Q quiz
            </span>
            <span className="rounded-full border border-border/70 bg-card px-2 py-0.5 text-[9px] text-muted-foreground">
              Show case law
            </span>
          </div>
        </div>
        <div
          className="ml-auto max-w-[70%] rounded-2xl rounded-tr-md px-3 py-2 text-[11px] text-primary-foreground"
          style={{
            background: "linear-gradient(120deg, oklch(0.72 0.22 350), oklch(0.60 0.20 270))",
          }}
        >
          Quiz me.
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
          <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Practice · Tort
          </div>
          <div className="mt-1 text-[12px] font-medium text-foreground">Question 7 of 20</div>
        </div>
        <div className="rounded-md border border-border/60 bg-card/70 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
          Full mocks soon
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-border/60 bg-card/40 p-3 text-[11px] leading-relaxed text-foreground">
        A buyer signs a contract relying on the seller's statement that the roof is "recently
        repaired." It wasn't. Which doctrine applies?
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
                ? "border-pink/40 bg-pink/[0.06] text-foreground"
                : "border-border/60 bg-card/40 text-muted-foreground"
            }`}
          >
            <span>{o.t}</span>
            {o.a && <CheckCircle2 className="h-3.5 w-3.5 text-pink" />}
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
    { n: "Property", v: 0.58 },
    { n: "Evidence", v: 0.41 },
    { n: "Crim", v: 0.65 },
    { n: "Con Law", v: 0.78 },
    { n: "Civ Pro", v: 0.69 },
    { n: "Ethics", v: 0.92 },
  ];
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Topic mastery
          </div>
          <div className="mt-1 text-[12px] font-medium text-foreground">Up 8% this week</div>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-2 py-0.5 text-[9px] font-medium text-foreground">
          <TrendingUp className="h-3 w-3 text-pink" /> +8%
        </div>
      </div>
      <div className="mt-3 grid h-28 grid-cols-8 items-end gap-1.5">
        {modules.map((m) => (
          <div key={m.n} className="flex h-full flex-col justify-end">
            <div
              className="rounded-sm"
              style={{
                height: `${m.v * 100}%`,
                background: `linear-gradient(180deg, oklch(0.70 0.18 340 / ${0.55 + m.v * 0.3}), oklch(0.62 0.16 295 / ${0.45 + m.v * 0.3}))`,
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
        <div className="rounded-lg border border-border/60 bg-card/40 p-2 text-center">
          <div className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">Accuracy</div>
          <div className="text-[12.5px] font-medium text-foreground">78%</div>
        </div>
        <div className="rounded-lg border border-border/60 bg-card/40 p-2 text-center">
          <div className="text-[8px] uppercase tracking-[0.18em] text-muted-foreground">Hours</div>
          <div className="text-[12.5px] font-medium text-foreground">42h</div>
        </div>
      </div>
    </div>
  );
}
