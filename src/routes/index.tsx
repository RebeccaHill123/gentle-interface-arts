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
  CheckCircle2,
  Activity,
  Timer,
  Trophy,
  BookOpen,
  FileText,
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
          "An adaptive study planner for SQE1, SQE2, NY Bar and MPRE candidates that tells you exactly what to study each day.",
      },
      { property: "og:title", content: "Tentra — Adaptive study planner for SQE, NY Bar & MPRE" },
      {
        property: "og:description",
        content:
          "Personalised plan, focus sessions, weak-area drills and AI coaching — built for SQE1, SQE2, NY Bar and MPRE candidates.",
      },
      { property: "og:url", content: "https://tentraapp.com/" },
      { property: "og:type", content: "website" },
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
            "Adaptive study planner with focus sessions, weak-area drills and AI coaching for SQE1, SQE2, NY Bar and MPRE candidates.",
          offers: { "@type": "Offer", price: "0", priceCurrency: "GBP" },
        }),
      },
    ],
  }),
});

/* ---------- Premium primitives ---------- */

/** Refined gradient CTA — smoother gradient, inset highlight, soft glow. */
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
      className={`group relative ${h} rounded-full px-7 text-[14.5px] font-medium tracking-[-0.005em] text-primary-foreground transition-all duration-300 hover:brightness-[1.06] ${className}`}
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
  const ctaLabel = isAuthenticated ? "View Dashboard" : "Build my study plan";


  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />

      <div className="relative pb-28 md:pb-0">
        {/* HEADER */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8 md:py-7">
          <BrandMark />
          <nav className="hidden items-center gap-9 text-[13px] font-normal text-muted-foreground md:flex">
            <a href="#features" className="relative transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how" className="relative transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="relative transition-colors hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-3 md:gap-4">
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
                  className="hidden text-[13px] font-normal text-muted-foreground transition-colors hover:text-foreground sm:inline-block"
                >
                  Sign in
                </Link>
                <PremiumCta to="/onboarding" className="px-5">
                  Get started
                </PremiumCta>
              </>
            )}
          </div>
        </header>

        <main>
          {/* HERO */}
          <section className="mx-auto max-w-6xl px-5 pt-4 pb-12 md:px-8 md:pt-16 md:pb-24">
            <div className="grid items-center gap-12 md:grid-cols-[1.05fr_1fr] md:gap-16">
              <div className="text-center md:text-left">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground backdrop-blur">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-1.5 w-1.5 animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
                  </span>
                  Early access
                </span>

                <h1 className="mt-7 text-[2rem] font-light leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[2.4rem] md:text-[2.85rem] lg:text-[3.1rem]">
                  The performance platform for{" "}
                  <span className="text-gradient-pink-violet font-light">future lawyers</span>
                  <span className="text-foreground">.</span>
                </h1>

                <p className="mx-auto mt-6 max-w-[30rem] text-[15px] leading-[1.65] text-muted-foreground md:mx-0 md:text-[16.5px]">
                  An adaptive study planner for SQE, NY Bar and MPRE students that tells you exactly what to study each day.
                </p>


                <div className="mt-9 flex flex-col items-center gap-3 md:flex-row md:items-center md:justify-start">
                  <PremiumCta to={ctaTo} size="lg" className="w-full md:w-auto">
                    {ctaLabel}
                    <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </PremiumCta>
                  {!isAuthenticated && (
                    <Link
                      to="/auth"
                      search={{ mode: "signin" }}
                      className="text-[13.5px] font-normal text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Sign in
                    </Link>
                  )}
                </div>

              </div>

              {/* Hero phone mockup */}
              <div className="relative mx-auto w-full max-w-[300px] md:max-w-[340px]">
                <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-pink-violet opacity-[0.18] blur-3xl" />
                <PhoneFrame>
                  <DashboardPanel />
                </PhoneFrame>
                <FloatingChip className="-right-4 top-10 hidden sm:flex" style={{ animationDelay: "-1s" }}>
                  <TrendingUp className="h-3.5 w-3.5 text-pink" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Plan adherence
                    </span>
                    <span className="text-[12.5px] font-medium text-foreground">92%</span>
                  </span>
                </FloatingChip>
                <FloatingChip className="-left-5 top-1/3 hidden sm:flex" style={{ animationDelay: "-2.5s" }}>
                  <Flame className="h-3.5 w-3.5 text-pink" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Streak
                    </span>
                    <span className="text-[12.5px] font-medium text-foreground">14 days</span>
                  </span>
                </FloatingChip>
                <FloatingChip className="-right-6 bottom-32 hidden sm:flex" style={{ animationDelay: "-4s" }}>
                  <Target className="h-3.5 w-3.5 text-pink" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Predicted readiness
                    </span>
                    <span className="text-[12.5px] font-medium text-foreground">78%</span>
                  </span>
                </FloatingChip>
                <FloatingChip className="-left-3 bottom-16 hidden sm:flex" style={{ animationDelay: "-5.5s" }}>
                  <Sparkles className="h-3.5 w-3.5 text-pink" />
                  <span className="flex flex-col leading-tight">
                    <span className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      Schedule
                    </span>
                    <span className="text-[12.5px] font-medium text-foreground">+2.1h ahead</span>
                  </span>
                </FloatingChip>
              </div>
            </div>
          </section>

          {/* TRUST STRIP — elegant hairline row */}
          <section className="mx-auto max-w-5xl px-5 pb-16 md:px-8 md:pb-28">
            <div className="grid grid-cols-2 gap-y-4 border-y border-border/60 py-5 md:grid-cols-4 md:divide-x md:divide-border/60 md:py-6">
              <TrustItem icon={<Target className="h-3.5 w-3.5" />} label="Built for SQE, NY Bar & MPRE" />
              <TrustItem icon={<Brain className="h-3.5 w-3.5" />} label="Adaptive study planning" />
              <TrustItem icon={<BarChart3 className="h-3.5 w-3.5" />} label="Performance analytics" />
              <TrustItem icon={<Sparkles className="h-3.5 w-3.5" />} label="For future lawyers" />
            </div>
          </section>

          {/* FEATURES */}
          <section id="features" className="mx-auto max-w-6xl px-5 pb-20 md:px-8 md:pb-32">
            <div className="mx-auto mb-12 max-w-2xl text-center md:mb-20">
              <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                The platform
              </div>
              <h2 className="mt-5 text-[2rem] font-light leading-[1.08] tracking-[-0.03em] text-foreground md:text-[2.75rem]">
                Engineered to{" "}
                <span className="text-gradient-pink-violet font-light">perform</span>.
              </h2>
              <p className="mt-5 text-[15px] leading-[1.65] text-muted-foreground md:text-[16px]">
                One disciplined workflow. Five tools designed to compound.
              </p>
            </div>

            <FeatureShowcase />
          </section>

          {/* HOW IT WORKS */}
          <section id="how" className="mx-auto max-w-6xl px-5 pb-20 md:px-8 md:pb-32">
            <div className="mb-12 text-center md:mb-16">
              <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                How it works
              </div>
              <h2 className="mt-5 text-[2rem] font-light leading-[1.08] tracking-[-0.03em] text-foreground md:text-[2.75rem]">
                Ready in under a minute.
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3 md:gap-6">
              <StepCard num="01" icon={<Calendar className="h-4 w-4" />} title="Set your exam date" body="Anchor the plan to your SQE, NY Bar or MPRE sitting." />
              <StepCard num="02" icon={<Brain className="h-4 w-4" />} title="Map your confidence" body="A quick diagnostic across every module." />
              <StepCard num="03" icon={<Target className="h-4 w-4" />} title="Execute daily" body="A precise schedule that adapts as you progress." />
            </div>
          </section>

          {/* TESTIMONIAL */}
          <section className="mx-auto max-w-3xl px-5 pb-20 md:px-8 md:pb-28">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/60 p-8 text-center backdrop-blur md:p-14">
              <div className="absolute inset-x-10 -top-16 -z-10 h-32 bg-gradient-pink-violet opacity-[0.10] blur-3xl" />
              <Sparkles className="mx-auto h-4 w-4 text-pink" />
              <p className="mx-auto mt-6 max-w-xl text-[17px] font-light leading-[1.45] tracking-[-0.01em] text-foreground md:text-[22px]">
                "Tentra turned my preparation into something measurable. I knew, every day, that I
                was getting closer."
              </p>
              <p className="mt-6 text-[10.5px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
                Built for the next generation of lawyers
              </p>
            </div>
          </section>

          {/* PRICING */}
          <section id="pricing" className="mx-auto max-w-3xl px-5 pb-24 md:px-8 md:pb-32">
            <div className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/60 p-8 text-center backdrop-blur md:p-14">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                <Trophy className="h-3 w-3 text-pink" /> Early access
              </div>
              <h2 className="mt-6 text-[2rem] font-light leading-[1.08] tracking-[-0.03em] text-foreground md:text-[2.75rem]">
                Free, while we{" "}
                <span className="text-gradient-pink-violet font-light">build</span>.
              </h2>
              <p className="mx-auto mt-5 max-w-md text-[15px] leading-[1.65] text-muted-foreground md:text-[16px]">
                Every feature unlocked for early candidates. No card required.
              </p>
              <div className="mt-9 flex justify-center">
                <PremiumCta
                  to={ctaTo}
                  search={isAuthenticated ? undefined : { mode: "signup" }}
                  size="lg"
                  className="w-full max-w-xs"
                >
                  {ctaLabel}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </PremiumCta>
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
              <span className="hidden sm:inline">· For the next generation of lawyers.</span>
            </div>
            <nav className="flex items-center gap-5">
              <Link to="/terms" className="transition-colors hover:text-foreground">
                Terms
              </Link>
              <Link to="/privacy" className="transition-colors hover:text-foreground">
                Privacy
              </Link>
              <span>© {new Date().getFullYear()} Tentra</span>
            </nav>
          </div>
        </footer>
      </div>

      {/* MOBILE STICKY CTA */}
      {!isAuthenticated && !loading && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur-xl md:hidden">
          <PremiumCta to="/onboarding" size="lg" className="w-full">
            Build my study plan <ArrowRight className="ml-1.5 h-4 w-4" />
          </PremiumCta>
        </div>
      )}
    </div>
  );
}

function TrustItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 px-4 text-center md:justify-start md:text-left">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-pink">
        {icon}
      </span>
      <span className="text-[12px] font-normal leading-snug tracking-[0.01em] text-muted-foreground md:text-[12.5px]">
        {label}
      </span>
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
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur md:p-8">
      <div className="flex items-center justify-between">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-pink/10 text-pink">
          {icon}
        </div>
        <div className="font-display text-[11px] font-medium tracking-[0.18em] text-muted-foreground/70">
          {num} / 03
        </div>
      </div>
      <h3 className="mt-7 text-[17px] font-medium tracking-[-0.015em] text-foreground md:text-[18px]">
        {title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-[1.6] text-muted-foreground">{body}</p>
    </div>
  );
}

/* ---------- Phone frame ---------- */

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
    title: "A plan that thinks ahead.",
    body: "Your countdown, streak and the precise work to ship today — at a glance.",
    render: () => <DashboardPanel />,
  },
  {
    id: "focus",
    label: "Focus",
    icon: <Timer className="h-3.5 w-3.5" />,
    eyebrow: "Deep work",
    title: "Sessions that compound.",
    body: "Time your work, log the discipline, watch the consistency build.",
    render: () => <FocusPanel />,
  },
  {
    id: "coach",
    label: "Coach",
    icon: <MessageSquareText className="h-3.5 w-3.5" />,
    eyebrow: "AI coach",
    title: "A tutor that knows your gaps.",
    body: "Tailored explanations and quizzes shaped by your latest results.",
    render: () => <CoachPanel />,
  },
  {
    id: "practice",
    label: "Mocks",
    icon: <ClipboardCheck className="h-3.5 w-3.5" />,
    eyebrow: "FLK1 & FLK2",
    title: "Practice, sharpened to your weak spots.",
    body: "Adaptive MCQs that pressure-test what you don't know yet.",
    render: () => <PracticePanel />,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: <BarChart3 className="h-3.5 w-3.5" />,
    eyebrow: "Performance",
    title: "Mastery, mapped to the syllabus.",
    body: "Accuracy, depth and pace across every module — turned into signal.",
    render: () => <AnalyticsPanel />,
  },
];

function FeatureShowcase() {
  const [active, setActive] = useState<string>(SHOWCASE_TABS[0].id);
  const tab = SHOWCASE_TABS.find((t) => t.id === active) ?? SHOWCASE_TABS[0];

  return (
    <div className="space-y-12">
      {/* Tab selector — refined ghost buttons with underline indicator */}
      <div className="relative -mx-5 md:mx-0">
        <div className="flex justify-start gap-1 overflow-x-auto px-5 pb-1 md:justify-center md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="inline-flex items-center gap-1 border-b border-border/60">
            {SHOWCASE_TABS.map((t) => {
              const isActive = t.id === active;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`relative flex shrink-0 items-center gap-1.5 px-4 py-3 text-[12.5px] font-medium tracking-[-0.005em] transition-colors md:px-5 md:text-[13px] ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground/70 hover:text-foreground"
                  }`}
                >
                  <span className={isActive ? "text-pink" : ""}>{t.icon}</span>
                  {t.label}
                  {isActive && (
                    <span
                      className="absolute -bottom-px left-2 right-2 h-px"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, oklch(0.66 0.20 320) 50%, transparent)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent md:hidden" />
      </div>

      <div className="relative">
        <div className="absolute -inset-x-6 -top-10 -bottom-10 -z-10 rounded-[3rem] bg-gradient-pink-violet opacity-[0.06] blur-3xl" />
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1fr] md:gap-16">
          <div className="order-2 md:order-1">
            <div className="relative mx-auto w-full max-w-[290px] md:max-w-[320px]">
              <div key={tab.id + "-visual"} className="animate-fade-in">
                <PhoneFrame>{tab.render()}</PhoneFrame>
              </div>
            </div>
          </div>

          <div
            key={tab.id + "-copy"}
            className="order-1 animate-fade-in text-center md:order-2 md:text-left"
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
              {tab.eyebrow}
            </div>
            <h3 className="mt-5 text-[1.6rem] font-light leading-[1.1] tracking-[-0.025em] text-foreground md:text-[2.1rem]">
              {tab.title}
            </h3>
            <p className="mt-5 text-[15px] leading-[1.65] text-muted-foreground md:text-[16px]">
              {tab.body}
            </p>
          </div>
        </div>
      </div>

      {/* Refined feature row — minimal, hairline */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border/60 pt-8 md:grid-cols-4">
        {[
          { icon: <Flame className="h-3.5 w-3.5" />, title: "Consistency streaks" },
          { icon: <Activity className="h-3.5 w-3.5" />, title: "Effort heatmaps" },
          { icon: <Target className="h-3.5 w-3.5" />, title: "Weak-area focus" },
          { icon: <TrendingUp className="h-3.5 w-3.5" />, title: "Mastery tracking" },
        ].map((f) => (
          <div key={f.title} className="flex items-center gap-2.5">
            <span className="text-pink">{f.icon}</span>
            <span className="text-[12.5px] font-normal text-muted-foreground md:text-[13px]">
              {f.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Visual panels ---------- */

function FloatingChip({
  className = "",
  style,
  children,
}: {
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      style={style}
      className={`absolute items-center gap-2 rounded-xl border border-border/70 bg-card/95 px-2.5 py-2 text-xs font-normal text-foreground shadow-[0_12px_30px_-12px_oklch(0.25_0.05_280/0.25)] backdrop-blur animate-float ${className}`}
    >
      {children}
    </div>
  );
}

function DashboardPanel() {
  const ringSize = 44;
  const r = 18;
  const c = 2 * Math.PI * r;
  const pct = 0.68;
  return (
    <div className="space-y-2.5">
      {/* Header */}
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

      {/* Countdown row */}
      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-pink" />
          <span className="text-[10px] font-medium text-foreground">84 days</span>
          <span className="text-[9px] text-muted-foreground">remaining</span>
        </div>
        <span className="text-[9px] text-muted-foreground">On track</span>
      </div>

      {/* Today's plan */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-2.5">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Today's plan
          </div>
          <div className="text-[9px] text-muted-foreground">2 of 4</div>
        </div>
        <ul className="mt-1.5 space-y-0.5">
          {[
            { t: "Contract Law MCQs", m: "30m", done: true },
            { t: "Consideration flashcards", m: "20m", done: true },
            { t: "Tort mini assessment", m: "25m", done: false, next: true },
            { t: "Negligence practice questions", m: "40m", done: false },
          ].map((x, i) => (
            <li key={i} className="flex items-center justify-between rounded-md px-1 py-1 text-[10.5px]">
              <span className="flex items-center gap-1.5 text-foreground">
                {x.done ? (
                  <span className="grid h-3 w-3 place-items-center rounded-[3px] bg-pink/15">
                    <CheckCircle2 className="h-2.5 w-2.5 text-pink" />
                  </span>
                ) : (
                  <span className={`h-3 w-3 rounded-[3px] border ${x.next ? "border-pink" : "border-border"}`} />
                )}
                <span className={x.done ? "text-muted-foreground line-through" : ""}>{x.t}</span>
              </span>
              <span className="text-[9px] text-muted-foreground">{x.m}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Recommendation */}
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

      {/* Weak areas + Weekly progress */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-2.5">
          <div className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Weak areas
          </div>
          <ul className="mt-1 space-y-0.5 text-[10px] text-foreground">
            <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-pink" />Tort</li>
            <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-pink/70" />Evidence</li>
            <li className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-pink/50" />Criminal Law</li>
          </ul>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-2.5">
          <div className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            This week
          </div>
          <div className="mt-1 space-y-0.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-medium text-foreground">7.4h</span>
              <span className="text-[8.5px] text-muted-foreground">logged</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-foreground">92%</span>
              <span className="text-[8.5px] text-muted-foreground">adherence</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-foreground">14d</span>
              <span className="text-[8.5px] text-muted-foreground">streak</span>
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
          <div className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            FLK1 · Mini Mock
          </div>
          <div className="mt-1 text-[12px] font-medium text-foreground">Question 7 of 20</div>
        </div>
        <div className="rounded-md border border-border/60 bg-card/70 px-2 py-0.5 text-[10px] font-medium text-foreground">
          14:32
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
