import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Leaf, Sun, Heart } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: "Bloomly — gentle productivity for busy minds" },
      {
        name: "description",
        content:
          "Bloomly is a soft, playful productivity space for planning your week, tracking habits, and celebrating small wins.",
      },
      { property: "og:title", content: "Bloomly — gentle productivity" },
      {
        property: "og:description",
        content: "Plan, focus, and bloom — without the burnout.",
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
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#loved" className="hover:text-foreground transition-colors">
              Loved by
            </a>
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              Demo
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex rounded-full">
              <Link to="/dashboard">Sign in</Link>
            </Button>
            <Button asChild className="rounded-full shadow-soft">
              <Link to="/onboarding">Get started</Link>
            </Button>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-6 pt-10 pb-24 md:pt-20">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-mint px-4 py-1.5 text-xs font-semibold text-mint-foreground shadow-card">
                <Leaf className="h-3.5 w-3.5" /> New · Habit garden v2
              </span>
              <h1 className="mt-6 text-5xl font-bold leading-[1.05] text-foreground md:text-6xl lg:text-7xl">
                Productivity that feels like a{" "}
                <span className="italic text-primary">warm hug</span>.
              </h1>
              <p className="mt-6 max-w-md text-lg text-muted-foreground">
                Bloomly is a soft, playful workspace for planning your days, growing tiny
                habits, and celebrating the wins — big and small.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="rounded-full shadow-pop">
                  <Link to="/onboarding">
                    Start blooming <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-2"
                >
                  <Link to="/dashboard">Peek the dashboard</Link>
                </Button>
              </div>
              <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> No card needed
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Cancel anytime
                </div>
              </div>
            </div>

            <HeroPreview />
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              tone="bg-peach"
              icon={<Sun className="h-6 w-6" />}
              title="Soft daily plans"
              body="Wake up to a gentle to-do list that adapts to your energy, not the other way around."
            />
            <FeatureCard
              tone="bg-mint"
              icon={<Leaf className="h-6 w-6" />}
              title="Habit garden"
              body="Grow tiny rituals into a flourishing routine. Watch your garden bloom as you do."
            />
            <FeatureCard
              tone="bg-lavender"
              icon={<Heart className="h-6 w-6" />}
              title="Kind reminders"
              body="No nags. No streaks lost. Just warm nudges that meet you where you are."
            />
          </div>
        </section>

        <section id="loved" className="mx-auto max-w-6xl px-6 pb-28">
          <div className="rounded-4xl bg-card p-10 shadow-card md:p-16">
            <p className="font-display text-3xl leading-snug text-foreground md:text-4xl">
              "Bloomly is the first productivity app that didn't make me feel guilty.
              It feels like journaling with a friend who happens to be{" "}
              <span className="italic text-primary">very organized</span>."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-sunshine font-bold text-butter-foreground">
                M
              </div>
              <div>
                <div className="font-semibold text-foreground">Maya R.</div>
                <div className="text-sm text-muted-foreground">writer & part-time chaos</div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mx-auto max-w-6xl px-6 pb-10 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Bloomly · made with care
        </footer>
      </div>
    </div>
  );
}

function FeatureCard({
  tone,
  icon,
  title,
  body,
}: {
  tone: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group rounded-3xl bg-card p-7 shadow-card transition-transform hover:-translate-y-1">
      <div
        className={`mb-5 grid h-12 w-12 place-items-center rounded-2xl ${tone} text-foreground transition-transform group-hover:rotate-6`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-muted-foreground">{body}</p>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -top-6 -left-6 hidden h-24 w-24 rounded-full bg-butter shadow-soft md:block animate-float" />
      <div
        className="absolute -bottom-8 -right-4 hidden h-20 w-20 rounded-3xl bg-blush shadow-soft md:block animate-float"
        style={{ animationDelay: "-2s" }}
      />

      <div className="relative rounded-4xl bg-card p-6 shadow-pop">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tuesday
            </div>
            <div className="font-display text-2xl font-bold">Today's bloom</div>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-warm text-primary-foreground font-bold">
            72%
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            { tone: "bg-mint", label: "Morning pages", done: true },
            { tone: "bg-peach", label: "Walk to the bakery", done: true },
            { tone: "bg-lavender", label: "Draft launch email", done: false },
            { tone: "bg-butter", label: "Water the monstera", done: false },
          ].map((t) => (
            <div
              key={t.label}
              className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3"
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-xl ${t.tone}`}
              >
                {t.done && <CheckCircle2 className="h-4 w-4 text-foreground" />}
              </span>
              <span
                className={`flex-1 text-sm font-medium ${
                  t.done ? "text-muted-foreground line-through" : "text-foreground"
                }`}
              >
                {t.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-gradient-cool p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-mint-foreground/80">
            Habit garden
          </div>
          <div className="mt-2 flex gap-1.5">
            {[...Array(14)].map((_, i) => (
              <div
                key={i}
                className="h-8 flex-1 rounded-md"
                style={{
                  background: `oklch(${0.7 + (i % 3) * 0.08} 0.12 ${140 + i * 6})`,
                  opacity: i < 11 ? 1 : 0.35,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
