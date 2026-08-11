import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Timer, LayoutDashboard, TrendingUp, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/sqe")({
  component: SqePage,
  head: () => ({
    meta: [
      { title: "SQE revision planner — personalised FLK1 & FLK2 plans | Tentra" },
      {
        name: "description",
        content:
          "Tentra builds a personalised SQE1 revision plan from your exam date and weekly study hours, covering FLK1 and FLK2 — and adapts it as you progress.",
      },
      { property: "og:title", content: "SQE revision planner — personalised FLK1 & FLK2 plans" },
      {
        property: "og:description",
        content:
          "Enter your SQE exam date and available hours. Tentra distributes your revision across the SQE syllabus and adapts as you study.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/sqe" }],
  }),
});

const CTA_STYLE = {
  background:
    "linear-gradient(120deg, oklch(0.80 0.15 350) 0%, oklch(0.74 0.15 330) 45%, oklch(0.70 0.15 270) 100%)",
  boxShadow:
    "0 1px 0 0 oklch(1 0 0 / 0.25) inset, 0 12px 30px -12px oklch(0.55 0.15 320 / 0.40)",
};

const STEPS = [
  {
    icon: <Calendar className="h-4 w-4" />,
    title: "Add your SQE exam date",
    body: "Tentra works backwards from your exam.",
  },
  {
    icon: <Timer className="h-4 w-4" />,
    title: "Tell us how much time you have",
    body: "Choose the hours you can realistically study each week.",
  },
  {
    icon: <LayoutDashboard className="h-4 w-4" />,
    title: "Get your personalised plan",
    body: "Tentra distributes your revision across the SQE syllabus.",
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    title: "Study, track and adapt",
    body: "Log sessions and Tentra adjusts as your progress changes.",
  },
];

function SqePage() {
  const { isAuthenticated } = useAuth();
  const to = isAuthenticated ? "/dashboard" : "/onboarding";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <BackgroundBlobs />
      <div className="relative">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8 md:py-6">
          <BrandMark />
          <Link
            to="/"
            className="inline-flex min-h-11 items-center text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
        </header>

        <main className="mx-auto max-w-5xl px-4 pb-20 md:px-8">
          <section className="pt-4 md:pt-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.2em] text-foreground/80 backdrop-blur">
              <Sparkles className="h-3 w-3 text-pink" />
              SQE1 · FLK1 &amp; FLK2
            </div>
            <h1 className="mt-4 max-w-3xl text-[2.2rem] font-light leading-[1.03] tracking-[-0.03em] text-foreground md:text-[3rem]">
              The smarter way to plan your{" "}
              <span className="text-gradient-pink-violet font-light">SQE revision</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-[1.55] text-muted-foreground md:text-[16.5px]">
              Tell Tentra your SQE exam date and how many hours you can study each week. We&apos;ll
              build your personalised SQE revision plan — and adapt it as you progress.
            </p>
            <div className="mt-7">
              <Button
                asChild
                className="group h-12 min-h-11 w-full rounded-full px-7 text-[14.5px] font-medium text-primary-foreground transition-all hover:brightness-[1.06] active:scale-[0.985] sm:w-auto"
                style={CTA_STYLE}
              >
                <Link
                  to={to as never}
                  onClick={() =>
                    trackEvent("build_plan_cta_clicked", { surface: "sqe_page", placement: "hero" })
                  }
                >
                  {isAuthenticated ? "See my study plan" : "Build my SQE plan"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-3 text-[13px] text-muted-foreground/80">
                Your first SQE plan takes under 2 minutes.
              </p>
            </div>
          </section>

          <section className="mt-14 md:mt-20">
            <h2 className="text-[1.5rem] font-light tracking-[-0.025em] text-foreground md:text-[2rem]">
              How Tentra works
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 md:grid-cols-4 md:gap-5">
              {STEPS.map((s, i) => (
                <div
                  key={s.title}
                  className="rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-pink/10 text-pink">
                      {s.icon}
                    </span>
                    <span className="font-display text-[11px] tracking-[0.18em] text-muted-foreground/70">
                      0{i + 1} / 04
                    </span>
                  </div>
                  <h3 className="mt-4 text-[15.5px] font-medium tracking-[-0.015em] text-foreground">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-[1.55] text-muted-foreground">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14 rounded-[1.5rem] border border-border/70 bg-card/60 p-6 text-center backdrop-blur md:mt-20 md:p-10">
            <h2 className="mx-auto max-w-2xl text-[1.4rem] font-light leading-[1.15] tracking-[-0.02em] text-foreground md:text-[1.9rem]">
              Your SQE revision plan shouldn&apos;t become useless the moment{" "}
              <span className="text-gradient-pink-violet">life gets in the way</span>.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[14px] leading-[1.6] text-muted-foreground">
              Spreadsheets don&apos;t react when you miss a session, run over on a topic or lose a
              week. Tentra recalibrates automatically.
            </p>
            <div className="mt-7 flex justify-center">
              <Button
                asChild
                className="h-12 min-h-11 w-full rounded-full px-7 text-[14.5px] font-medium text-primary-foreground sm:w-auto"
                style={CTA_STYLE}
              >
                <Link
                  to={to as never}
                  onClick={() =>
                    trackEvent("build_plan_cta_clicked", {
                      surface: "sqe_page",
                      placement: "problem",
                    })
                  }
                >
                  Start planning my SQE
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>

          <p className="mt-10 text-center text-[13px] text-muted-foreground">
            Studying for the New York Bar instead?{" "}
            <Link to="/new-york-bar" className="text-foreground underline underline-offset-4">
              Explore New York Bar
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
