import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, Calendar, Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  SQE1_MODULES,
  SQE2_MODULES,
  savePlan,
  type ExamType,
  type ModuleConfidence,
} from "@/lib/plan-store";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Build your plan · Tentra" },
      {
        name: "description",
        content: "Three quick steps and Tentra builds your personalised SQE plan.",
      },
    ],
  }),
});

function defaultDate(monthsAhead = 3) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return d.toISOString().slice(0, 10);
}

function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [examType, setExamType] = useState<ExamType>("SQE1");
  const [examDate, setExamDate] = useState(defaultDate(3));
  const [hoursPerWeek, setHoursPerWeek] = useState(12);
  const [confidences, setConfidences] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);

  const totalSteps = 4;
  const moduleList = examType === "SQE1" ? SQE1_MODULES : SQE2_MODULES;

  const setConf = (m: string, v: number) =>
    setConfidences((p) => ({ ...p, [m]: v }));

  const canContinue =
    (step === 0 && name.trim().length > 0) ||
    (step === 1 && !!examDate && new Date(examDate) > new Date()) ||
    (step === 2 && hoursPerWeek > 0) ||
    step === 3;

  const generate = async () => {
    setGenerating(true);
    try {
      const modules: ModuleConfidence[] = moduleList.map((m, i) => ({
        id: `m${i}`,
        name: m,
        confidence: confidences[m] ?? 3,
      }));

      const { data, error } = await supabase.functions.invoke("generate-plan", {
        body: { name, examType, examDate, hoursPerWeek, modules },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      savePlan({
        input: { name, examType, examDate, hoursPerWeek, modules },
        plan: data.plan,
        daysUntilExam: data.daysUntilExam,
        generatedAt: new Date().toISOString(),
        completedTaskIds: [],
      });

      toast.success("Your plan is ready!");
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? "Could not generate plan";
      if (msg.toLowerCase().includes("rate")) {
        toast.error("Rate limit reached. Please try again in a moment.");
      } else if (msg.toLowerCase().includes("credit")) {
        toast.error("AI credits exhausted. Add credits in Lovable workspace.");
      } else {
        toast.error(msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else generate();
  };
  const back = () => setStep(Math.max(0, step - 1));

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
                i <= step ? "bg-gradient-pink-blue" : "bg-border"
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
              eyebrow="Welcome"
              title="What should we call you?"
              subtitle="We'll use this on your dashboard. First name is fine."
            >
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Amelia"
                className="h-14 rounded-2xl border-2 border-border bg-card text-lg focus-visible:ring-pink"
                autoFocus
              />
            </StepCard>
          )}

          {step === 1 && (
            <StepCard
              eyebrow={`Hi ${name}`}
              title="When's your exam?"
              subtitle="Tentra works from your sitting date backwards."
            >
              <div className="space-y-5">
                <div>
                  <Label className="mb-2 block text-sm">Which exam?</Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(["SQE1", "SQE2"] as ExamType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setExamType(t)}
                        className={`flex items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left transition-all ${
                          examType === t
                            ? "border-pink shadow-glow"
                            : "border-border hover:border-border"
                        }`}
                      >
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-pink-blue">
                          <Scale className="h-4 w-4 text-primary-foreground" />
                        </span>
                        <div>
                          <div className="font-semibold text-foreground">{t}</div>
                          <div className="text-xs text-muted-foreground">
                            {t === "SQE1"
                              ? "FLK1 + FLK2 multiple choice"
                              : "Skills assessments"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="exam-date" className="mb-2 block text-sm">
                    Exam date
                  </Label>
                  <div className="relative">
                    <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="exam-date"
                      type="date"
                      value={examDate}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="h-14 rounded-2xl border-2 border-border bg-card pl-11 text-lg focus-visible:ring-pink"
                    />
                  </div>
                </div>
              </div>
            </StepCard>
          )}

          {step === 2 && (
            <StepCard
              eyebrow="Time budget"
              title="Hours per week?"
              subtitle="Be honest. We'll build a plan that actually fits your life."
            >
              <div className="rounded-3xl border-2 border-border bg-card p-6">
                <div className="text-center">
                  <div className="font-display text-7xl text-gradient-tentra">
                    {hoursPerWeek}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    hours per week
                  </div>
                </div>
                <input
                  type="range"
                  min={2}
                  max={40}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  className="mt-6 w-full accent-pink"
                />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>2h</span>
                  <span>40h</span>
                </div>
              </div>
            </StepCard>
          )}

          {step === 3 && (
            <StepCard
              eyebrow="Confidence check"
              title="How do you feel about each module?"
              subtitle="1 = totally lost. 5 = could teach it. We'll prioritise your weak spots."
            >
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-2">
                {moduleList.map((m) => {
                  const v = confidences[m] ?? 3;
                  return (
                    <div
                      key={m}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-foreground">
                          {m}
                        </div>
                        <div className="text-xs font-semibold text-pink">
                          {v}/5
                        </div>
                      </div>
                      <div className="mt-3 flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setConf(m, n)}
                            className={`h-2.5 flex-1 rounded-full transition-all ${
                              n <= v
                                ? "bg-gradient-pink-blue"
                                : "bg-muted hover:bg-muted-foreground/20"
                            }`}
                            aria-label={`${m} confidence ${n}`}
                          />
                        ))}
                      </div>
                    </div>
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
            disabled={step === 0 || generating}
            className="rounded-full"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <Button
            onClick={next}
            disabled={!canContinue || generating}
            size="lg"
            className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
              </>
            ) : step === totalSteps - 1 ? (
              <>Build my plan <ArrowRight className="ml-1 h-4 w-4" /></>
            ) : (
              <>Continue <ArrowRight className="ml-1 h-4 w-4" /></>
            )}
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
      <div className="text-sm font-semibold uppercase tracking-wider text-pink">
        {eyebrow}
      </div>
      <h1 className="mt-2 text-4xl font-normal text-foreground md:text-5xl">
        {title}
      </h1>
      <p className="mt-3 max-w-lg text-muted-foreground">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}
