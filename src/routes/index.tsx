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
  Scale,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

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
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              Demo
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex rounded-full">
              <Link to="/dashboard">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95">
              <Link to="/onboarding">Get started</Link>
            </Button>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-6 pt-12 pb-20 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-pink" />
              Built for SQE1 & SQE2 candidates
            </span>
            <h1 className="mt-6 text-[3.65rem] font-light leading-[1.18] tracking-tight text-foreground/80 md:text-[5.5rem] lg:text-[6.4rem]">
              Your{" "}
              <span className="italic text-gradient-tentra inline-flex items-center px-3 py-2 font-light leading-none text-[0.9em] border-2 border-transparent outline outline-1 outline-border rounded-sm">
                personal
              </span>
              <br />
              SQE coach.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Tell Tentra your exam date and how confident you feel. We'll build a
              week-by-week plan tuned to <em>you</em> — and refine it as you go.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
              >
                <Link to="/onboarding">
                  Build my plan <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-border bg-card/40 backdrop-blur"
              >
                <Link to="/dashboard">See the dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="mt-20">
            <HeroPreview />
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mb-12 text-center">
            <div className="text-sm font-semibold uppercase tracking-wider text-pink">
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
              title="Set your date"
              body="Pick your SQE1 or SQE2 sitting and tell us how many hours a week you can give."
            />
            <StepCard
              num="02"
              icon={<Brain className="h-5 w-5" />}
              title="Rate your confidence"
              body="Score each module 1–5. We'll prioritise your weak spots without burning you out."
            />
            <StepCard
              num="03"
              icon={<Target className="h-5 w-5" />}
              title="Follow the plan"
              body="A clear today-list, a weekly theme, and a mastery heatmap that updates as you go."
            />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-28">
          <div className="rounded-[2rem] border border-border bg-card/60 p-10 backdrop-blur md:p-16">
            <div className="grid items-center gap-10 md:grid-cols-2">
              <div>
                <Scale className="h-8 w-8 text-pink" />
                <h2 className="mt-4 text-3xl font-normal text-foreground md:text-5xl">
                  Built around the
                  <span className="italic text-gradient-tentra inline-flex items-center px-3 py-2 font-light leading-none text-[0.9em] border-2 border-transparent outline outline-1 outline-border rounded-sm">SQE syllabus</span>.
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Tentra knows the FLK1 & FLK2 papers, the SQE2 skills assessments,
                  and weighting of each topic. Your plan reflects what actually
                  matters on exam day.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  "Contract",
                  "Tort",
                  "Land Law",
                  "Trusts",
                  "Criminal Practice",
                  "Dispute Resolution",
                  "Business Law",
                  "Ethics",
                ].map((m) => (
                  <div
                    key={m}
                    className="rounded-2xl border border-border bg-background/40 p-4 text-sm font-medium text-foreground"
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <footer className="mx-auto max-w-6xl px-6 pb-10 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Tentra · for the next generation of solicitors
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
    <div className="group relative overflow-hidden rounded-3xl border border-border bg-card/60 p-7 backdrop-blur transition-all hover:-translate-y-1 hover:shadow-glow">
      <div className="absolute left-4 top-3 font-display text-5xl leading-none text-pink/20">
        {num}
      </div>
      <div className="relative">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
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
    <div className="relative mx-auto max-w-4xl">
      <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-tentra opacity-30 blur-3xl" />
      <div className="rounded-[2rem] border border-border bg-card/80 p-6 shadow-glow backdrop-blur md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SQE1 · January sitting
            </div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              Hi Amelia 👋
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-background/60 px-4 py-3">
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
                This week
              </div>
              <div className="text-lg font-semibold text-foreground">12 hrs</div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-background/40 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-pink">
              Today
            </div>
            <ul className="mt-3 space-y-2">
              {[
                { t: "Read: Negligence — duty of care", m: "45m" },
                { t: "Practice MCQs: Misrepresentation", m: "30m" },
                { t: "Flashcards: Trust formalities", m: "20m" },
              ].map((x, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-xl bg-card/60 p-3 text-sm"
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
          <div className="rounded-2xl border border-border bg-background/40 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan">
              Topic mastery
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {modules.map((m) => (
                <div key={m.name} className="space-y-1.5">
                  <div
                    className="h-14 rounded-lg"
                    style={{
                      background: `linear-gradient(180deg, oklch(0.72 0.24 350 / ${m.c / 5}), oklch(0.62 0.22 250 / ${m.c / 5}))`,
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
  );
}
