import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, Timer, LayoutDashboard, TrendingUp, Scale } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/use-auth";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/new-york-bar")({
  component: NyBarPage,
  head: () => ({
    meta: [
      { title: "New York Bar (UBE) study planner — personalised plans | Tentra" },
      {
        name: "description",
        content:
          "Tentra builds a personalised New York Bar study plan from your exam date and weekly hours, covering MBE, MEE and MPT — plus MPRE support and revision tracking.",
      },
      {
        property: "og:title",
        content: "New York Bar (UBE) study planner — personalised plans",
      },
      {
        property: "og:description",
        content:
          "Personalised study planning and revision tracking for the New York Bar (UBE) and MPRE, adapting as you progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/new-york-bar" }],
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
    title: "Add your bar exam date",
    body: "Tentra works backwards from your UBE sitting.",
  },
  {
    icon: <Timer className="h-4 w-4" />,
    title: "Set your weekly hours",
    body: "Choose the hours you can realistically study each week.",
  },
  {
    icon: <LayoutDashboard className="h-4 w-4" />,
    title: "Get your personalised plan",
    body: "Revision distributed across MBE, MEE and MPT.",
  },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    title: "Study, track and adapt",
    body: "Log sessions and your plan recalibrates automatically.",
  },
];

function NyBarPage() {
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
              <Scale className="h-3 w-3 text-pink" />
              New York Bar · UBE &amp; MPRE
            </div>
            <h1 className="mt-4 max-w-3xl text-[2.2rem] font-light leading-[1.03] tracking-[-0.03em] text-foreground md:text-[3rem]">
              A personalised study plan for the{" "}
              <span className="text-gradient-pink-violet font-light">New York Bar</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-[15.5px] leading-[1.55] text-muted-foreground md:text-[16.5px]">
              Tentra supports personalised study planning and revision tracking for the New York Bar
              (UBE) and the MPRE — built around your exam date, your available hours and your
              progress across MBE, MEE and MPT.
            </p>
            <div className="mt-7">
              <Button
                asChild
                className="h-12 min-h-11 w-full rounded-full px-7 text-[14.5px] font-medium text-primary-foreground transition-all hover:brightness-[1.06] active:scale-[0.985] sm:w-auto"
                style={CTA_STYLE}
              >
                <Link
                  to={to as never}
                  onClick={() =>
                    trackEvent("build_plan_cta_clicked", {
                      surface: "ny_bar_page",
                      placement: "hero",
                    })
                  }
                >
                  {isAuthenticated ? "See my study plan" : "Build my bar exam plan"}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <p className="mt-3 text-[13px] text-muted-foreground/80">
                Choose the New York Bar route during setup.
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

          <p className="mt-12 text-center text-[13px] text-muted-foreground">
            Studying for the SQE?{" "}
            <Link to="/sqe" className="text-foreground underline underline-offset-4">
              See the SQE revision planner
            </Link>
          </p>
        </main>
      </div>
    </div>
  );
}
