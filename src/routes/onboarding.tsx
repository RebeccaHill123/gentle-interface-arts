import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, Sparkles, Leaf, Heart, Sun, Moon, Coffee } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Welcome to Bloomly" },
      { name: "description", content: "Set up your gentle workspace in three soft steps." },
    ],
  }),
});

const goals = [
  { id: "focus", label: "Find focus", icon: Sparkles, tone: "bg-peach" },
  { id: "habits", label: "Build habits", icon: Leaf, tone: "bg-mint" },
  { id: "rest", label: "Rest better", icon: Moon, tone: "bg-lavender" },
  { id: "joy", label: "Make space for joy", icon: Heart, tone: "bg-blush" },
];

const rhythms = [
  { id: "early", label: "Early bird", desc: "I bloom before sunrise.", icon: Sun },
  { id: "midday", label: "Midday mover", desc: "I peak around lunchtime.", icon: Coffee },
  { id: "night", label: "Night owl", desc: "I do my best work after dark.", icon: Moon },
];

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [pickedGoals, setPickedGoals] = useState<string[]>([]);
  const [rhythm, setRhythm] = useState<string | null>(null);

  const totalSteps = 3;

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else navigate({ to: "/dashboard" });
  };
  const back = () => setStep(Math.max(0, step - 1));

  const canContinue =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && pickedGoals.length > 0) ||
    (step === 2 && rhythm !== null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <BrandMark />
          <Button asChild variant="ghost" className="rounded-full text-muted-foreground">
            <Link to="/">Skip</Link>
          </Button>
        </header>

        <div className="mt-10 flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i <= step ? "bg-primary" : "bg-border"
              }`}
            />
          ))}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          Step {step + 1} of {totalSteps}
        </div>

        <main className="mt-12 flex flex-1 flex-col">
          {step === 0 && (
            <StepCard
              eyebrow="Hi there"
              title="What should we call you?"
              subtitle="We'll greet you with this every morning. Nicknames very welcome."
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunny"
                className="h-14 rounded-2xl border-2 bg-card text-lg shadow-card focus-visible:ring-primary"
                autoFocus
              />
            </StepCard>
          )}

          {step === 1 && (
            <StepCard
              eyebrow={`Lovely to meet you${name ? `, ${name}` : ""}`}
              title="What are you hoping to grow?"
              subtitle="Pick as many as feel right. We'll tailor your space around them."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {goals.map((g) => {
                  const active = pickedGoals.includes(g.id);
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() =>
                        setPickedGoals((prev) =>
                          prev.includes(g.id)
                            ? prev.filter((x) => x !== g.id)
                            : [...prev, g.id]
                        )
                      }
                      className={`flex items-center gap-4 rounded-3xl border-2 bg-card p-5 text-left transition-all ${
                        active
                          ? "border-primary shadow-pop -translate-y-0.5"
                          : "border-transparent shadow-card hover:-translate-y-0.5"
                      }`}
                    >
                      <span
                        className={`grid h-12 w-12 place-items-center rounded-2xl ${g.tone}`}
                      >
                        <Icon className="h-5 w-5 text-foreground" />
                      </span>
                      <span className="font-semibold text-foreground">{g.label}</span>
                    </button>
                  );
                })}
              </div>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard
              eyebrow="Almost there"
              title="When do you bloom?"
              subtitle="We'll line up your daily plan with your natural rhythm."
            >
              <div className="space-y-3">
                {rhythms.map((r) => {
                  const Icon = r.icon;
                  const active = rhythm === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRhythm(r.id)}
                      className={`flex w-full items-center gap-4 rounded-3xl border-2 bg-card p-5 text-left transition-all ${
                        active
                          ? "border-primary shadow-pop"
                          : "border-transparent shadow-card hover:-translate-y-0.5"
                      }`}
                    >
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-sunshine">
                        <Icon className="h-5 w-5 text-butter-foreground" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold text-foreground">
                          {r.label}
                        </span>
                        <span className="block text-sm text-muted-foreground">
                          {r.desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </StepCard>
          )}
        </main>

        <footer className="mt-10 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={back}
            disabled={step === 0}
            className="rounded-full"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={next}
            disabled={!canContinue}
            size="lg"
            className="rounded-full shadow-pop"
          >
            {step === totalSteps - 1 ? "Enter Bloomly" : "Continue"}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </footer>
      </div>
    </div>
  );
}

function StepCard({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-semibold uppercase tracking-wider text-primary">
        {eyebrow}
      </div>
      <h1 className="mt-2 text-4xl font-bold text-foreground md:text-5xl">{title}</h1>
      <p className="mt-3 max-w-lg text-muted-foreground">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
