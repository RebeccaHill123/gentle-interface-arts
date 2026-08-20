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
  Calendar,
  Clock,
  CheckCircle2,
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
import { getSubjectsForExamPath, defaultPathForExam, pathToExamType } from "@/lib/exam-paths";
import {
  buildConfidenceProfile,
  confidenceToRating,
  PREPARATION_STAGES,
  PREPARATION_STAGE_LABELS,
  RATING_LABELS,
  RATING_ORDER,
  RATING_TO_CONFIDENCE,
  type ConfidenceRating,
  type ConfidenceSource,
  type PreparationStage,
} from "@/lib/confidence";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

/**
 * First-run onboarding is deliberately two screens: exam + date, then weekly
 * hours. Everything else the generator understands (intensity, coverage mode,
 * per-module confidence, name) is defaulted here and can be refined later from
 * Settings → Study plan. See DEFAULTS below.
 */

type ExamParam = "sqe1" | "sqe2" | "ube" | "mpre";

const EXAM_PARAMS: ExamParam[] = ["sqe1", "sqe2", "ube", "mpre"];

const EXAM_PARAM_TO_TYPE: Record<ExamParam, ExamType> = {
  sqe1: "SQE1",
  sqe2: "SQE2",
  ube: "UBE",
  mpre: "MPRE",
};

interface OnboardingSearch {
  exam?: ExamParam;
  src?: string;
  placement?: string;
  /** Optional YYYY-MM-DD carried back from the plan reveal ("change my answers"). */
  date?: string;
  /** Optional weekly hours carried back from the plan reveal. */
  hours?: number;
}


function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, 40) : undefined;
}

/** Accept only a plain future-safe YYYY-MM-DD string. */
function toDateOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(new Date(`${value}T00:00:00`).getTime()) ? undefined : value;
}

function toHoursOrUndefined(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  return rounded >= 1 && rounded <= 60 ? rounded : undefined;
}

export const Route = createFileRoute("/onboarding")({
  // No auth gate — onboarding runs for anonymous visitors so they can
  // experience the personalised plan BEFORE being asked to sign up.
  validateSearch: (search: Record<string, unknown>): OnboardingSearch => {
    const raw = typeof search.exam === "string" ? search.exam.toLowerCase() : "";
    const exam = (EXAM_PARAMS as string[]).includes(raw) ? (raw as ExamParam) : "sqe1";
    return {
      exam,
      src: toStringOrUndefined(search.src ?? search.utm_source),
      placement: toStringOrUndefined(search.placement),
      date: toDateOrUndefined(search.date),
      hours: toHoursOrUndefined(search.hours),
    };
  },
  component: OnboardingPage,
  head: () => ({
    meta: [
      { title: "Build your plan · Tentra" },
      {
        name: "description",
        content:
          "Two quick questions and Tentra builds your personalised, adaptive SQE study plan around your exam date.",
      },
    ],
  }),
});

const STEP_COUNT = 2;

/** Safe defaults for everything no longer asked on first run. */
const DEFAULTS = {
  name: "",
  intensity: "intermediate" as IntensityTier,
  coverageMode: "even" as CoverageMode,
  neutralConfidence: 3,
};

interface ExamOption {
  value: ExamType;
  path: ExamPath;
  title: string;
  blurb: string;
  icon: typeof GraduationCap;
  ctaLabel: string;
  dateHeading: string;
}

const EXAM_OPTIONS: ExamOption[] = [
  {
    value: "SQE1",
    path: "SQE1_FULL",
    title: "SQE1",
    blurb: "FLK1 + FLK2 — England & Wales Solicitors Qualifying Exam.",
    icon: Scale,
    ctaLabel: "Build my SQE plan",
    dateHeading: "When are you sitting SQE1?",
  },
  {
    value: "SQE2",
    path: "SQE2",
    title: "SQE2",
    blurb: "Skills assessments — interviewing, advocacy, drafting.",
    icon: GraduationCap,
    ctaLabel: "Build my SQE plan",
    dateHeading: "When are you sitting SQE2?",
  },
  {
    value: "UBE",
    path: "UBE_FULL",
    title: "NY Bar",
    blurb: "Uniform Bar Exam (MBE + MEE + MPT) — qualifies for NY admission.",
    icon: Landmark,
    ctaLabel: "Build my NY Bar plan",
    dateHeading: "When are you sitting the NY Bar?",
  },
  {
    value: "MPRE",
    path: "MPRE_FULL",
    title: "MPRE",
    blurb: "Multistate Professional Responsibility Exam — 60 MCQs on ABA ethics rules.",
    icon: Target,
    ctaLabel: "Build my MPRE plan",
    dateHeading: "When are you sitting the MPRE?",
  },
];

const HOUR_PRESETS = [5, 10, 15, 20] as const;

/**
 * Relative date shortcuts. Deliberately computed from today rather than
 * hardcoded sitting windows, so nothing goes stale.
 */
const DATE_PRESETS = [
  { label: "In 3 months", months: 3 },
  { label: "In 6 months", months: 6 },
  { label: "In 12 months", months: 12 },
] as const;

function isoInMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function seedModules(path: ExamPath): ModuleConfidence[] {
  return getSubjectsForExamPath(path).map((s, i) => ({
    id: String(i),
    name: s.name,
    confidence: DEFAULTS.neutralConfidence,
    weakSubtopics: [],
  }));
}

function OnboardingPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [draft] = useState(() => loadOnboardingDraft());
  const [checking, setChecking] = useState(true);
  // Returning from the plan reveal to change answers always restarts at
  // step 1 so the exam and date are editable again.
  const editingFromReveal = search.src === "plan_reveal";
  const [step, setStep] = useState(() =>
    editingFromReveal ? 1 : Math.min(STEP_COUNT, Math.max(1, draft?.step ?? 1)),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [examPickerOpen, setExamPickerOpen] = useState(false);

  const acquisitionType = EXAM_PARAM_TO_TYPE[search.exam ?? "sqe1"];

  // Exam + path. Draft wins on resume; otherwise the acquisition route decides.
  const [examType, setExamType] = useState<ExamType>(draft?.examType ?? acquisitionType);
  const [examPath, setExamPath] = useState<ExamPath>(
    draft?.examPath ?? defaultPathForExam(draft?.examType ?? acquisitionType),
  );
  // Search params repopulate the previous answers when the sessionStorage
  // draft is gone (new tab, shared link), so "change my answers" never
  // drops what the visitor already told us.
  const [examDate, setExamDate] = useState(draft?.examDate ?? search.date ?? "");
  const [hoursPerWeek, setHoursPerWeek] = useState(
    draft?.hoursPerWeek ?? search.hours ?? 10,
  );


  // Deferred fields — defaulted, still persisted so the generator contract
  // and later refinement keep working.
  const [modules, setModules] = useState<ModuleConfidence[]>(
    draft?.modules?.length ? draft.modules : seedModules(draft?.examPath ?? defaultPathForExam(acquisitionType)),
  );
  const intensity = draft?.intensity ?? DEFAULTS.intensity;
  const coverageMode = draft?.coverageMode ?? DEFAULTS.coverageMode;
  const name = draft?.name ?? DEFAULTS.name;

  const activeOption = useMemo(
    () => EXAM_OPTIONS.find((o) => o.value === examType) ?? EXAM_OPTIONS[0],
    [examType],
  );

  const eventBase = useMemo(
    () => ({
      examType,
      examPath,
      source: search.src ?? null,
      placement: search.placement ?? null,
      viewport:
        typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
    }),
    [examType, examPath, search.src, search.placement],
  );

  // Signed-in returning user with a plan → straight to the dashboard.
  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData.user?.id) {
          const existing = await pullPlanFromCloud();
          if (existing) {
            navigate({ to: "/dashboard" });
            return;
          }
        }
      } catch {
        // Anonymous visitor — continue onboarding.
      }
      setChecking(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (checking) return;
    const hasProgress = (draft?.step ?? 1) > 1 || !!draft?.examDate;
    if (!hasProgress) {
      trackEvent("onboarding_started", eventBase);
      trackEvent("onboarding_start", { examType });
    } else {
      trackEvent("onboarding_resumed", { ...eventBase, step });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking]);

  // Step view events.
  useEffect(() => {
    if (checking) return;
    trackEvent(step === 1 ? "exam_date_viewed" : "weekly_hours_viewed", eventBase);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, step]);

  // Each supported exam maps to exactly one path; keep them in sync and
  // re-seed the module list whenever the path changes.
  useEffect(() => {
    const opt = EXAM_OPTIONS.find((o) => o.value === examType);
    if (!opt) return;
    if (opt.path !== examPath) setExamPath(opt.path);
  }, [examType, examPath]);

  useEffect(() => {
    setModules((prev) => {
      const seeded = seedModules(examPath);
      if (prev.length === seeded.length && prev.every((m, i) => m.name === seeded[i]?.name)) {
        return prev;
      }
      return seeded;
    });
  }, [examPath]);

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
  }, [
    checking,
    step,
    examType,
    examPath,
    name,
    examDate,
    hoursPerWeek,
    intensity,
    coverageMode,
    modules,
  ]);

  const sessionShape = useMemo(() => {
    if (hoursPerWeek <= 5) return "Light — 3–4 short sessions each week";
    if (hoursPerWeek <= 12) return "Steady — 4–5 mixed sessions each week";
    if (hoursPerWeek <= 20) return "Strong — 5–6 deep sessions each week";
    return "Intensive — daily focus blocks plus mocks";
  }, [hoursPerWeek]);

  const validateStep1 = (): string | null => {
    if (!examDate) return "Please choose your exam date.";
    if (new Date(examDate).getTime() <= Date.now()) return "Exam date must be in the future.";
    return null;
  };

  const next = () => {
    const err = validateStep1();
    if (err) return setError(err);
    setError(null);
    trackEvent("exam_date_completed", { ...eventBase, examDate });
    trackEvent("onboarding_step_complete", { step: 1, stepLabel: "Exam", examType, examPath });
    setStep(2);
  };

  const back = () => {
    setError(null);
    setStep(1);
  };

  const handleGenerate = async () => {
    setError(null);
    trackEvent("weekly_hours_completed", { ...eventBase, hoursPerWeek });
    trackEvent("plan_build_clicked", { ...eventBase, hoursPerWeek, examDate });
    setSubmitting(true);
    try {
      const err = validateStep1();
      if (err) {
        setError(err);
        setStep(1);
        return;
      }

      const resolvedExamType = pathToExamType(examPath);
      const onboarding = {
        name,
        examType: resolvedExamType,
        examPath,
        intensity,
        coverageMode,
        examDate,
        hoursPerWeek,
        modules,
      };

      // Signed-in WITH access: generate the full plan and land on the dashboard.
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_pro, grandfathered_pro, subscription_status, current_period_end")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        const status = profile?.subscription_status;
        const graceActive =
          status === "canceled" &&
          !!profile?.current_period_end &&
          new Date(profile.current_period_end).getTime() > Date.now();
        const hasAccess =
          !!profile?.grandfathered_pro ||
          !!profile?.is_pro ||
          status === "active" ||
          status === "trialing" ||
          graceActive;
        if (hasAccess) {
          const timeout = new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error("Plan generation took too long. Please try again.")),
              45_000,
            );
          });
          const { data, error: fnErr } = await Promise.race([
            supabase.functions.invoke("generate-plan", { body: onboarding }),
            timeout,
          ]);
          if (fnErr) {
            setError(fnErr.message || "Couldn't reach the plan generator. Please try again.");
            return;
          }
          const plan = data?.plan as StudyPlan | undefined;
          const daysUntilExam = data?.daysUntilExam as number | undefined;
          if (!plan || typeof daysUntilExam !== "number") {
            setError("Unexpected response from plan generator. Please try again.");
            return;
          }
          const stored: StoredPlan = {
            input: onboarding,
            plan,
            daysUntilExam,
            generatedAt: new Date().toISOString(),
            completedTaskIds: [],
            sessions: [],
          };
          await savePlanAndSync(stored);
          clearOnboardingDraft();
          trackEvent("plan_preview_created", { ...eventBase, authed: true });
          trackEvent("onboarding_completed", {
            examType: resolvedExamType,
            hoursPerWeek,
            authed: true,
          });
          navigate({ to: "/dashboard" });
          return;
        }
      }

      // Anonymous OR signed-in-without-access: create a server-side pending
      // plan and route to the reveal → checkout flow.
      const { createPendingPlan } = await import("@/lib/pending-plans.functions");
      const { token } = await createPendingPlan({ data: { onboarding } });
      clearOnboardingDraft();
      trackEvent("plan_preview_created", { ...eventBase, authed: false });
      trackEvent("onboarding_completed", {
        examType: resolvedExamType,
        hoursPerWeek,
        authed: false,
      });
      navigate({ to: "/plan-reveal", search: { token } });
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-32 md:pb-16">
      <BackgroundBlobs />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-6 md:py-6">
        <BrandMark />
        <div className="text-xs text-muted-foreground">
          Step {step} of {STEP_COUNT}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-4 md:px-6">
        <div className="mb-2 h-1 w-full overflow-hidden rounded-full bg-card">
          <motion.div
            className="h-full bg-gradient-pink-blue"
            initial={false}
            animate={{ width: `${(step / STEP_COUNT) * 100}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span className="text-foreground">Your exam</span>
          <span className={cn(step >= 2 && "text-foreground")}>Your time</span>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl px-4 pt-6 md:px-6">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur md:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              {step === 1 ? (
                <StepExamDate
                  option={activeOption}
                  examType={examType}
                  onExamChange={(value) => {
                    setExamType(value);
                    setExamPickerOpen(false);
                    trackEvent("onboarding_exam_switched", {
                      ...eventBase,
                      from: examType,
                      to: value,
                    });
                  }}
                  pickerOpen={examPickerOpen}
                  setPickerOpen={setExamPickerOpen}
                  examDate={examDate}
                  setExamDate={setExamDate}
                />
              ) : (
                <StepHours
                  hoursPerWeek={hoursPerWeek}
                  setHoursPerWeek={setHoursPerWeek}
                  sessionShape={sessionShape}
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
              className="min-h-11"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step === 1 ? (
              <Button
                type="button"
                onClick={next}
                size="lg"
                className="min-h-11 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                Continue <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleGenerate}
                size="lg"
                disabled={submitting}
                className="min-h-11 rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Building your plan…
                  </>
                ) : (
                  <>
                    {activeOption.ctaLabel} <Sparkles className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="mt-4 px-1 text-center text-[12.5px] leading-[1.5] text-muted-foreground">
          You&apos;ll get a balanced starting plan across the whole syllabus. It becomes more
          personalised as you study with Tentra.
        </p>
      </div>

      {/* Sticky mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {step > 1 && (
            <Button
              type="button"
              variant="ghost"
              onClick={back}
              disabled={submitting}
              className="min-h-11 flex-1"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          {step === 1 ? (
            <Button
              type="button"
              onClick={next}
              className="min-h-12 flex-[2] rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
            >
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={submitting}
              className="min-h-12 flex-[2] rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {activeOption.ctaLabel} <Sparkles className="ml-1 h-4 w-4" />
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

function StepHeader({
  kicker,
  title,
  sub,
}: {
  kicker: string;
  title: React.ReactNode;
  sub: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
        {kicker}
      </div>
      <h1 className="mt-2 text-[1.6rem] font-normal leading-[1.15] tracking-[-0.02em] text-foreground md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 text-sm leading-[1.55] text-muted-foreground">{sub}</p>
    </div>
  );
}

function StepExamDate({
  option,
  examType,
  onExamChange,
  pickerOpen,
  setPickerOpen,
  examDate,
  setExamDate,
}: {
  option: ExamOption;
  examType: ExamType;
  onExamChange: (v: ExamType) => void;
  pickerOpen: boolean;
  setPickerOpen: (v: boolean) => void;
  examDate: string;
  setExamDate: (v: string) => void;
}) {
  const minDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <StepHeader
        kicker="Step 1 of 2"
        title={option.dateHeading}
        sub="Tentra will work backwards from your exam date."
      />

      <div className="space-y-2">
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Quick options
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DATE_PRESETS.map((preset) => {
            const iso = isoInMonths(preset.months);
            const active = examDate === iso;
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() => setExamDate(iso)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2.5 text-left text-[13.5px] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  active
                    ? "border-pink bg-gradient-pink-blue/10 text-foreground shadow-glow"
                    : "border-border bg-background/40 text-muted-foreground hover:border-muted-foreground hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-2">
                  {active ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-pink" />
                  ) : (
                    <Calendar className="h-4 w-4 shrink-0" />
                  )}
                  {preset.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="examDate" className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5" /> Or pick your exact exam date
        </Label>
        <Input
          id="examDate"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          min={minDate}
          required
          className="min-h-12 text-base"
        />
        <p className="text-xs text-muted-foreground">
          Not fixed yet? Use your best guess — you can change it any time.
        </p>
      </div>

      <div className="border-t border-border/60 pt-4">
        {!pickerOpen ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-expanded={false}
            className="inline-flex min-h-11 items-center text-[13px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Studying for a different exam? Change exam
          </button>
        ) : (
          <div className="space-y-3">
            <div
              id="exam-picker-label"
              className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground"
            >
              Choose your exam
            </div>
            <div className="grid gap-2" role="radiogroup" aria-labelledby="exam-picker-label">
              {EXAM_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = examType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onExamChange(opt.value)}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-2xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                      active
                        ? "border-pink bg-gradient-pink-blue/10 shadow-glow"
                        : "border-border bg-background/40 hover:border-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        active
                          ? "bg-gradient-pink-blue text-primary-foreground"
                          : "bg-card text-muted-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-[14.5px] font-semibold text-foreground">
                        {opt.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-[1.45] text-muted-foreground">
                        {opt.blurb}
                      </span>
                    </span>
                    {active && <CheckCircle2 className="h-5 w-5 shrink-0 text-pink" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepHours({
  hoursPerWeek,
  setHoursPerWeek,
  sessionShape,
}: {
  hoursPerWeek: number;
  setHoursPerWeek: (v: number) => void;
  sessionShape: string;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        kicker="Step 1 of 3"
        title="How many hours can you realistically study each week?"
        sub="Don't worry — your plan can change whenever life does."
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {HOUR_PRESETS.map((preset) => {
          const isLast = preset === HOUR_PRESETS[HOUR_PRESETS.length - 1];
          const active = isLast ? hoursPerWeek >= preset : hoursPerWeek === preset;
          return (
            <button
              key={preset}
              type="button"
              aria-pressed={active}
              onClick={() => setHoursPerWeek(preset)}
              className={cn(
                "min-h-12 rounded-xl border px-3 py-2.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                active
                  ? "border-pink bg-gradient-pink-blue/10 shadow-glow"
                  : "border-border bg-background/40 hover:border-muted-foreground",
              )}
            >
              <span className="block text-[15px] font-semibold text-foreground">
                {isLast ? `${preset}+` : preset}
              </span>
              <span className="block text-[11px] text-muted-foreground">hrs/wk</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="hours" className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Fine-tune:{" "}
          <span className="font-semibold text-foreground">{hoursPerWeek} hours</span>
        </Label>
        <Slider
          id="hours"
          min={1}
          max={40}
          step={1}
          value={[hoursPerWeek]}
          onValueChange={(v) => setHoursPerWeek(v[0])}
          aria-label="Hours available per week"
          className="pt-3"
        />
        <p className="text-xs text-muted-foreground">{sessionShape}</p>
      </div>
    </div>
  );
}

/* ---------- Stage 2: preparation stage ---------- */

function StepPreparation({
  stage,
  onSelect,
}: {
  stage: PreparationStage | null;
  onSelect: (v: PreparationStage) => void;
}) {
  return (
    <div className="space-y-6">
      <StepHeader
        kicker="Step 2 of 3"
        title="Where are you in your preparation?"
        sub="This changes how Tentra balances learning, recall and exam practice."
      />
      <div className="grid gap-2" role="radiogroup" aria-label="Preparation stage">
        {PREPARATION_STAGES.map((opt) => {
          const active = stage === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(opt.value)}
              className={cn(
                "flex min-h-12 items-start gap-3 rounded-2xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-pink bg-gradient-pink-blue/10 shadow-glow"
                  : "border-border bg-background/40 hover:border-muted-foreground",
              )}
            >
              <span className="flex-1">
                <span className="block text-[14.5px] font-semibold text-foreground">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-muted-foreground">
                  {opt.blurb}
                </span>
              </span>
              {active && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pink" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Stage 3: syllabus confidence ---------- */

function StepConfidence({
  modules,
  onRate,
  notStarted,
  onNotStartedChange,
  balancedAccepted,
  onBalancedAccepted,
  examTitle,
  examDate,
  hoursPerWeek,
  stage,
}: {
  modules: ModuleConfidence[];
  onRate: (id: string, rating: ConfidenceRating) => void;
  notStarted: boolean;
  onNotStartedChange: (v: boolean) => void;
  balancedAccepted: boolean;
  onBalancedAccepted: (v: boolean) => void;
  examTitle: string;
  examDate: string;
  hoursPerWeek: number;
  stage: PreparationStage | null;
}) {
  const ratedCount = modules.filter((m) => m.rated).length;
  const profile = buildConfidenceProfile(
    modules,
    notStarted ? "not-started" : undefined,
  );

  return (
    <div className="space-y-5">
      <StepHeader
        kicker="Step 3 of 3"
        title="How confident are you in each subject?"
        sub="One tap each. This decides how your weekly hours are shared out."
      />

      <button
        type="button"
        aria-pressed={notStarted}
        onClick={() => onNotStartedChange(!notStarted)}
        className={cn(
          "flex min-h-12 w-full items-center gap-2.5 rounded-2xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          notStarted
            ? "border-pink bg-gradient-pink-blue/10 shadow-glow"
            : "border-border bg-background/40 hover:border-muted-foreground",
        )}
      >
        {notStarted ? (
          <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-pink" />
        ) : (
          <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="text-[13.5px] leading-[1.45] text-foreground">
          I haven&apos;t started the syllabus yet
          <span className="mt-0.5 block text-[12px] text-muted-foreground">
            Tentra builds a foundation-first, balanced plan across every subject.
          </span>
        </span>
      </button>

      {!notStarted && (
        <>
          <div
            className="flex items-center justify-between text-[12px] text-muted-foreground"
            aria-live="polite"
          >
            <span>
              {ratedCount} of {modules.length} rated
            </span>
            <span className="h-1 w-24 overflow-hidden rounded-full bg-card">
              <span
                className="block h-full bg-gradient-pink-blue transition-all"
                style={{ width: `${(ratedCount / Math.max(1, modules.length)) * 100}%` }}
              />
            </span>
          </div>

          <ul className="space-y-2">
            {modules.map((m) => {
              const current = confidenceToRating(m);
              return (
                <li
                  key={m.id}
                  className="rounded-2xl border border-border/60 bg-background/40 p-3"
                >
                  <div className="text-[13.5px] font-medium leading-[1.35] text-foreground">
                    {m.name}
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {RATING_ORDER.map((rating) => {
                      const active = current === rating;
                      return (
                        <button
                          key={rating}
                          type="button"
                          aria-pressed={active}
                          aria-label={`${m.name}: ${RATING_LABELS[rating]}`}
                          onClick={() => onRate(m.id, rating)}
                          className={cn(
                            "min-h-11 rounded-xl border px-1 text-[11.5px] leading-tight transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "border-pink bg-gradient-pink-blue/10 font-semibold text-foreground shadow-glow"
                              : "border-border bg-card/40 text-muted-foreground hover:border-muted-foreground",
                          )}
                        >
                          {RATING_LABELS[rating]}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>

          {ratedCount < modules.length && (
            <button
              type="button"
              aria-pressed={balancedAccepted}
              onClick={() => onBalancedAccepted(!balancedAccepted)}
              className={cn(
                "flex min-h-11 w-full items-start gap-2 rounded-xl border p-3 text-left text-[12.5px] leading-[1.45] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                balancedAccepted
                  ? "border-pink bg-gradient-pink-blue/10 text-foreground"
                  : "border-border bg-background/40 text-muted-foreground hover:border-muted-foreground",
              )}
            >
              {balancedAccepted ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              ) : (
                <Target className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              Use balanced coverage for the subjects I haven&apos;t rated.
            </button>
          )}
        </>
      )}

      {/* Compact pre-submission summary */}
      <div className="rounded-2xl border border-border/60 bg-card/50 p-4">
        <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Your setup
        </div>
        <dl className="mt-2 space-y-1 text-[13px] text-foreground">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Exam</dt>
            <dd className="text-right">
              {examTitle}
              {examDate ? ` · ${examDate}` : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Weekly hours</dt>
            <dd>{hoursPerWeek}h</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Preparation</dt>
            <dd className="text-right">
              {stage ? PREPARATION_STAGE_LABELS[stage] : "—"}
            </dd>
          </div>
          {profile.weakest.length > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Lowest rated</dt>
              <dd className="text-right">{profile.weakest.join(", ")}</dd>
            </div>
          )}
          {profile.strongest.length > 0 && (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Strongest rated</dt>
              <dd className="text-right">{profile.strongest.join(", ")}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
