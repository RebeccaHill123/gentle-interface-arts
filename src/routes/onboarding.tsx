import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Loader2, AlertCircle, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  SQE1_MODULES,
  SQE2_MODULES,
  savePlan,
  pullPlanFromCloud,
  type ExamType,
  type ModuleConfidence,
  type StoredPlan,
  type StudyPlan,
} from "@/lib/plan-store";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) {
      throw redirect({ to: "/auth", search: { mode: "signin" } });
    }
  },
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Build your plan · Tentra" },
      { name: "description", content: "Tell Tentra about your SQE exam to build your personalised plan." },
    ],
  }),
});

function OnboardingPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [examType, setExamType] = useState<ExamType>("SQE1");
  const [examDate, setExamDate] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(10);
  const [modules, setModules] = useState<ModuleConfidence[]>(
    SQE1_MODULES.map((n, i) => ({ id: String(i), name: n, confidence: 3 })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If the user already has a plan in the cloud, skip onboarding.
  useEffect(() => {
    (async () => {
      const existing = await pullPlanFromCloud();
      if (existing) {
        navigate({ to: "/dashboard" });
        return;
      }
      // Prefill first name from profile
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (uid) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, display_name")
          .eq("user_id", uid)
          .maybeSingle();
        if (profile?.first_name) setName(profile.first_name);
        else if (profile?.display_name) setName(profile.display_name);
      }
      setChecking(false);
    })();
  }, [navigate]);

  // Swap module list when exam type changes
  useEffect(() => {
    const list = examType === "SQE1" ? SQE1_MODULES : SQE2_MODULES;
    setModules(list.map((n, i) => ({ id: String(i), name: n, confidence: 3 })));
  }, [examType]);

  const updateConfidence = (idx: number, value: number) => {
    setModules((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, confidence: value } : m)),
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please tell us your name.");
    if (!examDate) return setError("Please pick your exam date.");
    if (new Date(examDate).getTime() <= Date.now()) {
      return setError("Exam date must be in the future.");
    }
    if (hoursPerWeek < 1 || hoursPerWeek > 80) {
      return setError("Hours per week should be between 1 and 80.");
    }

    setSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-plan", {
        body: {
          name: name.trim(),
          examType,
          examDate,
          hoursPerWeek,
          modules,
        },
      });
      if (fnErr) {
        setError(fnErr.message || "Failed to generate plan");
        return;
      }
      const plan = data?.plan as StudyPlan | undefined;
      const daysUntilExam = data?.daysUntilExam as number | undefined;
      if (!plan || typeof daysUntilExam !== "number") {
        setError("Unexpected response from plan generator.");
        return;
      }
      const stored: StoredPlan = {
        input: { name: name.trim(), examType, examDate, hoursPerWeek, modules },
        plan,
        daysUntilExam,
        generatedAt: new Date().toISOString(),
        completedTaskIds: [],
        sessions: [],
      };
      savePlan(stored); // also pushes to cloud
      navigate({ to: "/dashboard" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-6 pb-16">
        <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur md:p-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-pink">
            Welcome to Tentra
          </div>
          <h1 className="mt-2 text-3xl font-normal text-foreground md:text-4xl">
            Let's build your <span className="italic text-gradient-tentra">plan</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Answer a few questions and we'll generate a personalised, week-by-week
            study plan. You only need to do this once — your progress is saved to
            your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-6" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="name">What should we call you?</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Which exam are you sitting?</Label>
              <div className="grid grid-cols-2 gap-3">
                {(["SQE1", "SQE2"] as ExamType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setExamType(t)}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      examType === t
                        ? "border-pink bg-gradient-pink-blue/10"
                        : "border-border bg-background/40 hover:border-muted-foreground"
                    }`}
                  >
                    <div className="font-semibold text-foreground">{t}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t === "SQE1"
                        ? "FLK1 & FLK2 multiple choice"
                        : "Skills assessments"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="examDate">Exam date</Label>
                <Input
                  id="examDate"
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hours">Hours per week</Label>
                <Input
                  id="hours"
                  type="number"
                  min={1}
                  max={80}
                  value={hoursPerWeek}
                  onChange={(e) => setHoursPerWeek(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>How confident do you feel in each area? (1 = weak, 5 = strong)</Label>
              <div className="space-y-2">
                {modules.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/40 p-3"
                  >
                    <div className="flex-1 text-sm text-foreground">{m.name}</div>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => updateConfidence(idx, v)}
                          className={`h-7 w-7 rounded-full text-xs font-medium transition-colors ${
                            m.confidence === v
                              ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
                              : "bg-card text-muted-foreground hover:text-foreground"
                          }`}
                          aria-label={`${m.name}: ${v}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              size="lg"
              className="w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating your plan…</>
              ) : (
                <>Build my plan <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
