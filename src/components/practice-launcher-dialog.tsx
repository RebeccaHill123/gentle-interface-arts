import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  Timer,
  Brain,
  Layers,
  Lightbulb,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Bookmark,
  Loader2,
  Gauge,
  Activity,
  Flame,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { loadPlan } from "@/lib/plan-store";
import { deriveAnalytics, type SubjectStat } from "@/lib/analytics-derive";

type PracticeType =
  | "weak-area"
  | "timed-mini"
  | "scenario"
  | "flashcards"
  | "technique";

const PRACTICE_TYPES: {
  id: PracticeType;
  title: string;
  desc: string;
  icon: typeof Target;
  defaultMinutes: 10 | 20 | 45 | 90;
  defaultQuestions: number;
}[] = [
  {
    id: "weak-area",
    title: "Weak Area Drill",
    desc: "Targeted SBAs on your lowest-confidence and most-missed topics.",
    icon: Target,
    defaultMinutes: 20,
    defaultQuestions: 12,
  },
  {
    id: "timed-mini",
    title: "Timed Mini Mock",
    desc: "Mixed SBA set under exam pacing (~1.7 min/question).",
    icon: Timer,
    defaultMinutes: 45,
    defaultQuestions: 26,
  },
  {
    id: "scenario",
    title: "Scenario Practice",
    desc: "Long-form client scenarios with branching SBAs.",
    icon: Brain,
    defaultMinutes: 45,
    defaultQuestions: 8,
  },
  {
    id: "flashcards",
    title: "Flashcard Sprint",
    desc: "Spaced-repetition burst on key rules and definitions.",
    icon: Layers,
    defaultMinutes: 10,
    defaultQuestions: 30,
  },
  {
    id: "technique",
    title: "Exam Technique Drill",
    desc: "Drills on pacing, elimination strategy and answer hygiene.",
    icon: Lightbulb,
    defaultMinutes: 20,
    defaultQuestions: 10,
  },
];

const DURATIONS: { v: 10 | 20 | 45 | 90; label: string }[] = [
  { v: 10, label: "10 min" },
  { v: 20, label: "20 min" },
  { v: 45, label: "45 min" },
  { v: 90, label: "90 min" },
];

export function PracticeLauncherDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<PracticeType>("weak-area");
  const [subject, setSubject] = useState<string>("auto");
  const [duration, setDuration] = useState<10 | 20 | 45 | 90>(20);
  const [adaptive, setAdaptive] = useState(true);
  const [launching, setLaunching] = useState(false);

  const analytics = useMemo(() => deriveAnalytics(loadPlan()), [open]);
  const subjects: SubjectStat[] = analytics.subjects;
  const examDate = loadPlan()?.input.examDate;
  const daysToExam = examDate
    ? Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86_400_000))
    : null;

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setType("weak-area");
      setSubject("auto");
      setDuration(20);
      setAdaptive(true);
      setLaunching(false);
    }
  }, [open]);

  const meta = PRACTICE_TYPES.find((p) => p.id === type)!;

  // Recommended subject = highest risk, or chosen one
  const recommended = subjects.slice().sort((a, b) => b.riskScore - a.riskScore)[0];
  const targetSubject =
    subject === "auto" ? recommended?.module ?? "Mixed" : subject;
  const targetStat = subjects.find((s) => s.module === targetSubject);

  // Question count scales with duration ratio
  const questionCount = Math.max(
    4,
    Math.round((meta.defaultQuestions * duration) / meta.defaultMinutes),
  );

  const difficulty: "Foundational" | "Standard" | "Stretch" =
    targetStat?.accuracy != null
      ? targetStat.accuracy < 55
        ? "Foundational"
        : targetStat.accuracy < 75
          ? "Standard"
          : "Stretch"
      : (targetStat?.confidence ?? 3) <= 2
        ? "Foundational"
        : (targetStat?.confidence ?? 3) >= 4
          ? "Stretch"
          : "Standard";

  const reasonBits: string[] = [];
  if (subject === "auto" && recommended) {
    reasonBits.push(
      `${recommended.module} is your highest-risk module right now (risk ${recommended.riskScore}/100)`,
    );
    if (recommended.accuracy != null && recommended.accuracy < 70) {
      reasonBits.push(`accuracy at ${recommended.accuracy}%`);
    }
    if (recommended.recencyDays != null && recommended.recencyDays >= 7) {
      reasonBits.push(`last revised ${recommended.recencyDays} days ago`);
    }
  } else if (targetStat) {
    if (targetStat.accuracy != null) reasonBits.push(`accuracy ${targetStat.accuracy}%`);
    reasonBits.push(`confidence ${targetStat.confidence}/5`);
    if (targetStat.recencyDays != null)
      reasonBits.push(`last touched ${targetStat.recencyDays}d ago`);
  }
  if (daysToExam !== null && daysToExam < 60)
    reasonBits.push(`${daysToExam} days to exam`);

  function launch() {
    setLaunching(true);
    const rationale = reasonBits.length
      ? `Generated because ${reasonBits.join(", ")}.`
      : `Generated from a balanced view of your syllabus.`;

    const skillFocus =
      type === "scenario"
        ? ["Application", "Issue spotting", "Reasoning"]
        : type === "flashcards"
          ? ["Recall", "Definitions", "Procedural rules"]
          : type === "technique"
            ? ["Pacing", "Elimination", "Answer hygiene"]
            : ["Accuracy", "Pattern recognition", "Speed"];

    const config = {
      source: "practice-launcher" as const,
      format: type,
      formatLabel: meta.title,
      module: targetSubject,
      topic: meta.title,
      questions: questionCount,
      duration,
      difficulty,
      timed: true,
      adaptive,
      rationale,
      reasonBits,
      skillFocus,
    };

    try {
      sessionStorage.setItem("practice:config", JSON.stringify(config));
    } catch {}
    setTimeout(() => {
      onOpenChange(false);
      navigate({ to: "/practice" });
    }, 350);
  }

  function saveForLater() {
    toast.success("Saved to your study plan", {
      description: `${meta.title} · ${duration} min · ${targetSubject}`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl border-border bg-card/95 p-0 backdrop-blur-xl">
        <div className="relative overflow-hidden rounded-t-3xl">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-pink-blue opacity-20 blur-3xl" />
          <DialogHeader className="space-y-1.5 px-6 pb-2 pt-6 text-left">
            <div className="flex items-center justify-between">
              <Badge className="rounded-full bg-pink/15 text-pink hover:bg-pink/15">
                <Sparkles className="mr-1 h-3 w-3" /> Adaptive practice
              </Badge>
              <StepDots step={step} />
            </div>
            <DialogTitle className="text-xl tracking-tight">
              {step === 1 && "Choose a practice format"}
              {step === 2 && "Personalise your session"}
              {step === 3 && "Ready to begin"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {step === 1 && "Pick the format that matches the time and intensity you have."}
              {step === 2 && "We'll calibrate difficulty and focus from your data."}
              {step === 3 && "Here's what we generated and why."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 pb-2">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="grid gap-2 sm:grid-cols-2">
              {PRACTICE_TYPES.map((p) => {
                const Icon = p.icon;
                const active = type === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setType(p.id);
                      setDuration(p.defaultMinutes);
                    }}
                    className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-pink/60 bg-pink/5 shadow-glow"
                        : "border-border bg-background/50 hover:border-pink/30 hover:bg-background/80"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                          active
                            ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
                            : "border border-border bg-background/60 text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground">{p.title}</div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{p.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <Field label="Subject focus">
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={subject === "auto"}
                    onClick={() => setSubject("auto")}
                    icon={Sparkles}
                  >
                    Auto · highest risk
                  </Chip>
                  {subjects.slice(0, 8).map((s) => (
                    <Chip
                      key={s.module}
                      active={subject === s.module}
                      onClick={() => setSubject(s.module)}
                    >
                      {s.module}
                    </Chip>
                  ))}
                </div>
                {subject === "auto" && recommended && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Suggesting{" "}
                    <span className="font-medium text-foreground">{recommended.module}</span> —
                    risk {recommended.riskScore}/100.
                  </p>
                )}
              </Field>

              <Field label="Available time">
                <div className="flex flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <Chip
                      key={d.v}
                      active={duration === d.v}
                      onClick={() => setDuration(d.v)}
                    >
                      {d.label}
                    </Chip>
                  ))}
                </div>
              </Field>

              <div className="flex items-start justify-between rounded-2xl border border-border bg-background/40 p-4">
                <div className="pr-4">
                  <div className="text-sm font-medium">Adaptive mode</div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Prioritise weak and confidence-risk subtopics over balanced coverage.
                  </p>
                </div>
                <Switch checked={adaptive} onCheckedChange={setAdaptive} />
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-pink/30 bg-gradient-to-br from-pink/10 to-blue/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Generated for you
                    </div>
                    <div className="mt-1 text-lg font-semibold tracking-tight">
                      {meta.title} · {targetSubject}
                    </div>
                  </div>
                  <Badge className="rounded-full bg-background/60 text-foreground hover:bg-background/60">
                    {difficulty}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat icon={Timer} label="Duration" value={`${duration} min`} />
                  <Stat icon={Activity} label="Questions" value={`${questionCount}`} />
                  <Stat icon={Gauge} label="Difficulty" value={difficulty} />
                  <Stat
                    icon={Flame}
                    label="Mode"
                    value={adaptive ? "Adaptive" : "Balanced"}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Why this was recommended
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                  {reasonBits.length
                    ? `Generated because ${reasonBits.join(", ")}.`
                    : "Generated from a balanced view of your syllabus — log a few sessions to unlock fully personalised reasoning."}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-background/40 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Targeted skills
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(type === "scenario"
                    ? ["Application", "Issue spotting", "Reasoning"]
                    : type === "flashcards"
                      ? ["Recall", "Definitions", "Procedural rules"]
                      : type === "technique"
                        ? ["Pacing", "Elimination", "Answer hygiene"]
                        : ["Accuracy", "Pattern recognition", "Speed"]
                  ).map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (step === 1 ? onOpenChange(false) : setStep((s) => (s - 1) as 1 | 2 | 3))}
            disabled={launching}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < 3 ? (
            <Button
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
            >
              Continue <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={saveForLater} disabled={launching}>
                <Bookmark className="mr-1 h-4 w-4" /> Save for later
              </Button>
              <Button
                onClick={launch}
                disabled={launching}
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
              >
                {launching ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Launching…
                  </>
                ) : (
                  <>
                    Begin practice <ArrowRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepDots({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-1.5 rounded-full transition-all ${
            n === step ? "w-6 bg-gradient-pink-blue" : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

function Chip({
  children,
  active,
  onClick,
  icon: Icon,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: typeof Sparkles;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-pink/60 bg-pink/15 text-foreground shadow-sm"
          : "border-border bg-background/40 text-muted-foreground hover:border-pink/30 hover:text-foreground"
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />} {children}
    </button>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Timer;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}
