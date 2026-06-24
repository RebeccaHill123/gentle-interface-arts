import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  Target,
  Sparkles,
  Layers3,
  Calendar,
  Clock,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Scale,
  Landmark,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  savePlanAndSync,
  pullPlanFromCloud,
  loadOnboardingDraft,
  saveOnboardingDraft,
  clearOnboardingDraft,
  type ExamType,
  type ExamPath,
  type IntensityTier,
  type CoverageMode,
  type ModuleConfidence,
  type StoredPlan,
  type StudyPlan,
} from "@/lib/plan-store";
import {
  getSubjectsForExamPath,
  getSubtopicsForSubject,
  defaultPathForExam,
  pathToExamType,
  isUbePath,
} from "@/lib/exam-paths";
import { buildStoredPreview, savePreviewToLocal } from "@/lib/preview-plan";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/onboarding")({
  // No auth gate — onboarding runs for anonymous visitors so they can
  // experience the personalised plan BEFORE being asked to sign up.
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Build your plan · Tentra" },
      {
        name: "description",
        content:
          "A personalised, adaptive SQE study plan built from your exam path, intensity and weak subtopics.",
      },
    ],
  }),
});

const STEPS = [
  { id: 1, label: "Exam" },
  { id: 2, label: "You" },
  { id: 3, label: "Coverage" },
  { id: 4, label: "Focus" },
  { id: 5, label: "Review" },
] as const;

interface ExamOption {
  value: ExamType;
  path: ExamPath;
  title: string;
  blurb: string;
  icon: typeof GraduationCap;
}

const EXAM_OPTIONS: ExamOption[] = [
  {
    value: "SQE1",
    path: "SQE1_FULL",
    title: "SQE1",
    blurb: "FLK1 + FLK2 — England & Wales Solicitors Qualifying Exam.",
    icon: Scale,
  },
  {
    value: "SQE2",
    path: "SQE2",
    title: "SQE2",
    blurb: "Skills assessments — interviewing, advocacy, drafting.",
    icon: GraduationCap,
  },
  {
    value: "UBE",
    path: "UBE_FULL",
    title: "NY Bar",
    blurb: "Uniform Bar Exam (MBE + MEE + MPT) — qualifies for NY admission.",
    icon: Landmark,
  },
  {
    value: "MPRE",
    path: "MPRE_FULL",
    title: "MPRE",
    blurb: "Multistate Professional Responsibility Exam — 60 MCQs on ABA ethics rules.",
    icon: Target,
  },
];


const INTENSITY_OPTIONS: {
  value: IntensityTier;
  title: string;
  blurb: string;
  icon: typeof GraduationCap;
}[] = [
  {
    value: "beginner",
    title: "Beginner",
    blurb: "New to the syllabus. Concept-first pacing.",
    icon: Sparkles,
  },
  {
    value: "intermediate",
    title: "Intermediate",
    blurb: "Studied the basics. Ready for active recall + practice questions.",
    icon: Target,
  },
  {
    value: "advanced",
    title: "Advanced",
    blurb: "Confident overall. Mock-heavy, weak-area surgery.",
    icon: GraduationCap,
  },
  {
    value: "resitter",
    title: "Resitter",
    blurb: "Done it before. Ruthless focus on weak topics + mocks.",
    icon: RefreshCw,
  },
];



function OnboardingPage() {
  const navigate = useNavigate();
  const [draft] = useState(() => loadOnboardingDraft());
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(() => Math.min(STEPS.length, Math.max(1, draft?.step ?? 1)));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — which exam
  const [examType, setExamType] = useState<ExamType>(draft?.examType ?? "SQE1");

  // Step 2 — which path within that exam
  const [examPath, setExamPath] = useState<ExamPath>(
    draft?.examPath ?? defaultPathForExam(draft?.examType ?? "SQE1"),
  );

  // Step 3
  const [name, setName] = useState(draft?.name ?? "");
  const [examDate, setExamDate] = useState(draft?.examDate ?? "");
  const [hoursPerWeek, setHoursPerWeek] = useState(draft?.hoursPerWeek ?? 10);
  const [intensity, setIntensity] = useState<IntensityTier>(draft?.intensity ?? "intermediate");

  // Step 4
  const [coverageMode, setCoverageMode] = useState<CoverageMode>(draft?.coverageMode ?? "even");

  // Step 5
  const [modules, setModules] = useState<ModuleConfidence[]>(draft?.modules ?? []);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Prefill name from profile if signed-in. If a plan already exists in the
  // cloud (signed-in returning user), jump straight to dashboard.
  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (uid) {
          const existing = await pullPlanFromCloud();
          if (existing) {
            navigate({ to: "/dashboard" });
            return;
          }
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, display_name")
            .eq("user_id", uid)
            .maybeSingle();
          if (!draft?.name) {
            if (profile?.first_name) setName(profile.first_name);
            else if (profile?.display_name) setName(profile.display_name);
          }
        }
      } catch {
        // Anonymous visitor — that's fine, continue onboarding.
      }
      setChecking(false);
    })();
  }, [draft?.name, navigate]);

  // Fire onboarding_start exactly once when an anonymous/new visitor lands
  // on step 1 with no saved progress. Resumes don't re-fire.
  useEffect(() => {
    if (checking) return;
    const hasProgress = (draft?.step ?? 1) > 1 || (draft?.modules?.length ?? 0) > 0;
    if (!hasProgress) {
      trackEvent("onboarding_start", { examType });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking]);

  // Each exam now maps to exactly one path. Keep them in sync.
  useEffect(() => {
    const opt = EXAM_OPTIONS.find((o) => o.value === examType);
    if (opt && opt.path !== examPath) setExamPath(opt.path);
  }, [examType, examPath]);


  // Reset module list when path changes
  useEffect(() => {
    const list = getSubjectsForExamPath(examPath);
    if (draft?.examPath === examPath && draft.modules.length > 0) return;
    setModules(
      list.map((s, i) => ({
        id: String(i),
        name: s.name,
        confidence: 3,
        weakSubtopics: [],
      })),
    );
    setExpanded(null);
  }, [draft, examPath]);

  useEffect(() => {
    if (checking) return;
    saveOnboardingDraft({
      step,
      examType,
      examPath,
      name,
      examDate,
      hoursPerWeek,
      intensity,
      coverageMode,
      modules,
    });
  }, [checking, step, examType, examPath, name, examDate, hoursPerWeek, intensity, coverageMode, modules]);

  const updateConfidence = (idx: number, value: number) => {
    setModules((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, confidence: value } : m)),
    );
  };

  const toggleWeakSubtopic = (moduleName: string, subtopic: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.name !== moduleName) return m;
        const set = new Set(m.weakSubtopics ?? []);
        if (set.has(subtopic)) set.delete(subtopic);
        else set.add(subtopic);
        return { ...m, weakSubtopics: Array.from(set) };
      }),
    );
  };

  const sessionShape = useMemo(() => {
    if (hoursPerWeek <= 5) return "Light — 3–4 short sessions/wk";
    if (hoursPerWeek <= 12) return "Steady — 4–5 mixed sessions/wk";
    if (hoursPerWeek <= 20) return "Strong — 5–6 deep sessions/wk";
    return "Intensive — daily focus + mocks";
  }, [hoursPerWeek]);

  const weakModules = useMemo(
    () => modules.filter((m) => m.confidence <= 2 || (m.weakSubtopics?.length ?? 0) > 0),
    [modules],
  );

  const canContinue = (): string | null => {
    if (step === 2) {
      if (!name.trim()) return "Please tell us your name.";
      if (!examDate) return "Please pick your exam date.";
      if (new Date(examDate).getTime() <= Date.now())
        return "Exam date must be in the future.";
      if (hoursPerWeek < 1 || hoursPerWeek > 40)
        return "Hours per week should be between 1 and 40.";
    }
    if (step === 4 && modules.length === 0) return "Choose at least one subject to continue.";
    return null;
  };

  const next = () => {
    const err = canContinue();
    if (err) return setError(err);
    setError(null);
    trackEvent("onboarding_step_complete", {
      step,
      stepLabel: STEPS[step - 1]?.label ?? null,
      examType,
      examPath,
    });
    setStep((s) => Math.min(STEPS.length, s + 1));
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleGenerate = async () => {
    setError(null);
    setSubmitting(true);
    try {
      if (!name.trim() || !examDate || new Date(examDate).getTime() <= Date.now()) {
        setError("Please check your name and choose a future exam date before continuing.");
        return;
      }
      const resolvedExamType = pathToExamType(examPath);
      const baseInput = {
        name: name.trim(),
        examType: resolvedExamType,
        examPath,
        intensity,
        coverageMode,
        examDate,
        hoursPerWeek,
        modules,
      };

      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) {
        // Anonymous visitor — build a LOCAL preview plan and let them see it
        // before being asked to sign up.
        saveOnboardingDraft({
          step,
          examType,
          examPath,
          name,
          examDate,
          hoursPerWeek,
          intensity,
          coverageMode,
          modules,
        });
        const preview = buildStoredPreview(baseInput);
        savePreviewToLocal(preview);
        trackEvent("onboarding_completed", {
          examType: resolvedExamType,
          examPath,
          hoursPerWeek,
          intensity,
          coverageMode,
          authed: false,
        });
        navigate({ to: "/plan-preview" });
        return;
      }
      const timeout = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error("Plan generation took too long. Please try again.")), 45_000);
      });
      const { data, error: fnErr } = await Promise.race([
        supabase.functions.invoke("generate-plan", {
          body: baseInput,
        }),
        timeout,
      ]);

      if (fnErr) {
        console.error("generate-plan invoke error", fnErr);
        setError(fnErr.message || "Couldn't reach the plan generator. Please try again.");
        return;
      }
      const plan = data?.plan as StudyPlan | undefined;
      const daysUntilExam = data?.daysUntilExam as number | undefined;
      if (!plan || typeof daysUntilExam !== "number") {
        console.error("generate-plan unexpected response", data);
        setError("Unexpected response from plan generator. Please try again.");
        return;
      }
      const stored: StoredPlan = {
        input: {
          name: name.trim(),
          examType: resolvedExamType,
          examPath,
          intensity,
          coverageMode,
          examDate,
          hoursPerWeek,
          modules,
        },
        plan,
        daysUntilExam,
        generatedAt: new Date().toISOString(),
        completedTaskIds: [],
        sessions: [],
      };
      await savePlanAndSync(stored);
      clearOnboardingDraft();
      trackEvent("onboarding_completed", {
        examType: resolvedExamType,
        examPath,
        hoursPerWeek,
        intensity,
        coverageMode,
        authed: true,
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      console.error("handleGenerate error", err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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

  const progress = (step / STEPS.length) * 100;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-32 md:pb-16">
      <BackgroundBlobs />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <div className="text-xs text-muted-foreground">
          Step {step} of {STEPS.length}
        </div>
      </div>

      {/* Stepper */}
      <div className="relative mx-auto w-full max-w-2xl px-6">
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-card">
          <motion.div
            className="h-full bg-gradient-pink-blue"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          {STEPS.map((s) => (
            <span
              key={s.id}
              className={cn(
                "transition-colors",
                step >= s.id && "text-foreground",
              )}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-6 pt-6">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              {step === 1 && (
                <StepExam value={examType} onChange={setExamType} />
              )}
              {step === 2 && (
                <StepIntensity
                  name={name}
                  setName={setName}
                  examDate={examDate}
                  setExamDate={setExamDate}
                  hoursPerWeek={hoursPerWeek}
                  setHoursPerWeek={setHoursPerWeek}
                  intensity={intensity}
                  setIntensity={setIntensity}
                  sessionShape={sessionShape}
                />
              )}
              {step === 3 && (
                <StepCoverage value={coverageMode} onChange={setCoverageMode} />
              )}
              {step === 4 && (
                <StepFocus
                  modules={modules}
                  coverageMode={coverageMode}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  updateConfidence={updateConfidence}
                  toggleWeakSubtopic={toggleWeakSubtopic}
                />
              )}
              {step === 5 && (
                <StepReview
                  name={name}
                  examType={examType}
                  examPath={examPath}
                  intensity={intensity}
                  coverageMode={coverageMode}
                  examDate={examDate}
                  hoursPerWeek={hoursPerWeek}
                  weakModules={weakModules}
                  totalModules={modules.length}
                />
              )}
            </motion.div>
          </AnimatePresence>


          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          {/* Desktop actions */}
          <div className="mt-8 hidden items-center justify-between md:flex">
            <Button
              type="button"
              variant="ghost"
              onClick={back}
              disabled={step === 1 || submitting}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < STEPS.length ? (
              <Button
                type="button"
                onClick={next}
                size="lg"
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleGenerate}
                size="lg"
                disabled={submitting}
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building your adaptive plan…
                  </>
                ) : (
                  <>
                    Build my adaptive plan{" "}
                    <Sparkles className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={back}
            disabled={step === 1 || submitting}
            className="flex-1"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          {step < STEPS.length ? (
            <Button
              type="button"
              onClick={next}
              className="flex-[2] rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
            >
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={submitting}
              className="flex-[2] rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Build plan <Sparkles className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Step components ---------- */

function StepHeader({ kicker, title, sub }: { kicker: string; title: React.ReactNode; sub: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
        {kicker}
      </div>
      <h1 className="mt-2 text-2xl font-normal text-foreground md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
    </div>
  );
}

function StepExam({
  value,
  onChange,
}: {
  value: ExamType;
  onChange: (v: ExamType) => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        kicker="Step 1"
        title={<>Which exam are you preparing for?</>}
        sub="Pick your jurisdiction — we'll tailor the syllabus, scoring weights and mock cadence."
      />
      <div className="grid gap-3">
        {EXAM_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "group flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-pink bg-gradient-pink-blue/10 shadow-glow"
                  : "border-border bg-background/40 hover:border-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  active
                    ? "bg-gradient-pink-blue text-primary-foreground"
                    : "bg-card text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-foreground">{opt.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {opt.blurb}
                </div>
              </div>
              {active && <CheckCircle2 className="h-5 w-5 text-pink" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// (StepPath removed — each supported exam maps to exactly one path.)


function StepIntensity({
  name,
  setName,
  examDate,
  setExamDate,
  hoursPerWeek,
  setHoursPerWeek,
  intensity,
  setIntensity,
  sessionShape,
}: {
  name: string;
  setName: (v: string) => void;
  examDate: string;
  setExamDate: (v: string) => void;
  hoursPerWeek: number;
  setHoursPerWeek: (v: number) => void;
  intensity: IntensityTier;
  setIntensity: (v: IntensityTier) => void;
  sessionShape: string;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        kicker="Step 2"
        title={<>Tell us about <span className="text-gradient-pink-violet">you</span></>}
        sub="We'll calibrate the plan's intensity, pacing and task mix to match."
      />

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="examDate" className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Exam date
          </Label>
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
          <Label htmlFor="hours" className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Hours per week:{" "}
            <span className="font-semibold text-foreground">{hoursPerWeek}</span>
          </Label>
          <Slider
            id="hours"
            min={1}
            max={40}
            step={1}
            value={[hoursPerWeek]}
            onValueChange={(v) => setHoursPerWeek(v[0])}
            className="pt-3"
          />
          <p className="text-xs text-muted-foreground">{sessionShape}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Confidence level</Label>
        <div className="grid grid-cols-2 gap-2">
          {INTENSITY_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = intensity === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIntensity(opt.value)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition-all",
                  active
                    ? "border-pink bg-gradient-pink-blue/10 shadow-glow"
                    : "border-border bg-background/40 hover:border-muted-foreground",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-pink" : "text-muted-foreground",
                    )}
                  />
                  <span className="font-semibold text-foreground">
                    {opt.title}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {opt.blurb}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StepCoverage({
  value,
  onChange,
}: {
  value: CoverageMode;
  onChange: (v: CoverageMode) => void;
}) {
  const options: {
    value: CoverageMode;
    title: string;
    blurb: string;
    bullets: string[];
    icon: typeof Layers3;
  }[] = [
    {
      value: "even",
      title: "Cover Everything",
      blurb: "Balanced revision across every selected module.",
      bullets: [
        "Even weighting tuned by SQE high-yield",
        "Best for your first complete pass",
        "Smart defaults — no extra setup",
      ],
      icon: Layers3,
    },
    {
      value: "advanced",
      title: "Advanced Personalisation",
      blurb: "Pick weak subtopics — get a sharper, surgical plan.",
      bullets: [
        "Drill into weak subtopics per module",
        "More sessions + spaced repetition on weak areas",
        "Built for resitters and final push",
      ],
      icon: Sparkles,
    },
  ];

  return (
    <div className="space-y-6">
      <StepHeader
        kicker="Step 3"
        title={<>How should we shape your coverage?</>}
        sub="Both modes use Tentra's adaptive engine — Advanced just listens harder to your weak spots."
      />
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-2xl border p-5 text-left transition-all",
                active
                  ? "border-pink bg-gradient-pink-blue/10 shadow-glow"
                  : "border-border bg-background/40 hover:border-muted-foreground",
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    active
                      ? "bg-gradient-pink-blue text-primary-foreground"
                      : "bg-card text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="font-semibold text-foreground">{opt.title}</div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{opt.blurb}</p>
              <ul className="mt-3 space-y-1.5">
                {opt.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-xs text-foreground/80"
                  >
                    <CheckCircle2
                      className={cn(
                        "mt-0.5 h-3.5 w-3.5 shrink-0",
                        active ? "text-pink" : "text-muted-foreground",
                      )}
                    />
                    {b}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepFocus({
  modules,
  coverageMode,
  expanded,
  setExpanded,
  updateConfidence,
  toggleWeakSubtopic,
}: {
  modules: ModuleConfidence[];
  coverageMode: CoverageMode;
  expanded: string | null;
  setExpanded: (v: string | null) => void;
  updateConfidence: (idx: number, value: number) => void;
  toggleWeakSubtopic: (moduleName: string, subtopic: string) => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        kicker="Step 4"
        title={<>How confident are you in each area?</>}
        sub={
          coverageMode === "advanced"
            ? "Tap a module to flag specific weak subtopics — we'll give them more reps."
            : "Rate each subject 1 (weak) to 5 (strong). The engine handles the rest."
        }
      />

      <div className="space-y-2">
        {modules.map((m, idx) => {
          const subtopics = getSubtopicsForSubject(m.name);
          const isOpen = expanded === m.name;
          const weakCount = m.weakSubtopics?.length ?? 0;
          return (
            <div
              key={m.id}
              className="rounded-2xl border border-border bg-background/40 transition-colors"
            >
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    {m.name}
                  </div>
                  {coverageMode === "advanced" && weakCount > 0 && (
                    <div className="mt-0.5 text-[11px] text-pink">
                      {weakCount} weak subtopic{weakCount === 1 ? "" : "s"} flagged
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updateConfidence(idx, v)}
                      className={cn(
                        "h-7 w-7 rounded-full text-xs font-medium transition-colors",
                        m.confidence === v
                          ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
                          : "bg-card text-muted-foreground hover:text-foreground",
                      )}
                      aria-label={`${m.name}: ${v}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {coverageMode === "advanced" && subtopics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : m.name)}
                    className="ml-1 rounded-full p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle subtopics"
                  >
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                )}
              </div>

              <AnimatePresence initial={false}>
                {coverageMode === "advanced" && isOpen && subtopics.length > 0 && (
                  <motion.div
                    key="subs"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-border px-3 pb-3 pt-3">
                      <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        Tap subtopics you find hardest
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {subtopics.map((t) => {
                          const selected = (m.weakSubtopics ?? []).includes(t.name);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleWeakSubtopic(m.name, t.name)}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs transition-colors",
                                selected
                                  ? "border-pink bg-gradient-pink-blue/15 text-foreground"
                                  : "border-border bg-card text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepReview({
  name,
  examType,
  examPath,
  intensity,
  coverageMode,
  examDate,
  hoursPerWeek,
  weakModules,
  totalModules,
}: {
  name: string;
  examType: ExamType;
  examPath: ExamPath;
  intensity: IntensityTier;
  coverageMode: CoverageMode;
  examDate: string;
  hoursPerWeek: number;
  weakModules: ModuleConfidence[];
  totalModules: number;
}) {
  const examLabel = EXAM_OPTIONS.find((e) => e.value === examType)?.title ?? examType;
  const intensityLabel =
    INTENSITY_OPTIONS.find((i) => i.value === intensity)?.title ?? intensity;
  const days = Math.max(
    1,
    Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000),
  );
  void examPath;

  const rows: { k: string; v: React.ReactNode }[] = [
    { k: "Name", v: name || "—" },
    { k: "Exam", v: examLabel },
    { k: "Exam date", v: `${examDate} · ${days} days` },
    { k: "Hours / week", v: `${hoursPerWeek}h` },
    { k: "Intensity", v: intensityLabel },
    {
      k: "Coverage",
      v: coverageMode === "even" ? "Cover Everything" : "Advanced Personalisation",
    },
    { k: "Subjects", v: `${totalModules} selected` },
  ];


  return (
    <div className="space-y-6">
      <StepHeader
        kicker="Step 5"
        title={
          <>
            Ready to build your <span className="text-gradient-pink-violet">plan</span>
          </>
        }
        sub="The engine weights high-yield + your weak areas, schedules spaced repetition, and adapts as you study."
      />

      <div className="rounded-2xl border border-border bg-background/40 p-4">
        <dl className="grid grid-cols-1 gap-y-2 text-sm sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.k} className="flex justify-between sm:block">
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                {r.k}
              </dt>
              <dd className="font-medium text-foreground sm:mt-0.5">{r.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {weakModules.length > 0 && (
        <div className="rounded-2xl border border-pink/40 bg-gradient-pink-blue/10 p-4">
          <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Weak focus
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            We'll concentrate extra sessions, spaced repetition and quizzes on:
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {weakModules.slice(0, 12).map((m) => (
              <span
                key={m.id}
                className="rounded-full border border-pink/40 bg-card px-2.5 py-1 text-xs text-foreground"
              >
                {m.name}
                {(m.weakSubtopics?.length ?? 0) > 0 && (
                  <span className="ml-1 text-pink">
                    · {m.weakSubtopics!.length}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
