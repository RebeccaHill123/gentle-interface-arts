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
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Brain,
  Layers,
  Zap,
  Target,
  Activity,
  Timer,
  Gauge,
  ArrowRight,
  RefreshCw,
  Star,
  Bookmark,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { loadPlan } from "@/lib/plan-store";
import { deriveAnalytics } from "@/lib/analytics-derive";

type QuizFormat = "sba" | "recall" | "mixed" | "scenario" | "rapid";

const FORMATS: {
  id: QuizFormat;
  title: string;
  desc: string;
  icon: typeof Sparkles;
}[] = [
  { id: "sba", title: "SBA set", desc: "Single best answer, exam-style.", icon: Target },
  { id: "recall", title: "Active recall", desc: "Open prompts to retrieve concepts.", icon: Brain },
  { id: "mixed", title: "Mixed-topic drill", desc: "Interleaved across modules.", icon: Layers },
  { id: "scenario", title: "Scenario-based", desc: "Client facts with branching SBAs.", icon: Sparkles },
  { id: "rapid", title: "Rapid-fire", desc: "Short, snappy revision rounds.", icon: Zap },
];

const DIFFICULTIES = ["Foundational", "Standard", "Stretch", "Adaptive"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

type Phase = "config" | "generating" | "result";

const THINKING_LINES = [
  "Analysing your confidence map…",
  "Scanning recent mock accuracy…",
  "Weighting high-yield subtopics…",
  "Prioritising weak areas…",
  "Building mixed SBA set…",
  "Calibrating difficulty curve…",
  "Finalising answer explanations…",
];

export function AIQuizBuilderDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("config");
  const [format, setFormat] = useState<QuizFormat>("sba");
  const [subject, setSubject] = useState<string>("auto");
  const [difficulty, setDifficulty] = useState<Difficulty>("Adaptive");
  const [duration, setDuration] = useState<number>(20);
  const [questions, setQuestions] = useState<number>(12);
  const [timed, setTimed] = useState(true);
  const [includeMissed, setIncludeMissed] = useState(true);
  const [highYieldOnly, setHighYieldOnly] = useState(false);
  const [mixWeakStrong, setMixWeakStrong] = useState(false);
  const [examPacing, setExamPacing] = useState(true);
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [favourited, setFavourited] = useState(false);

  const analytics = useMemo(() => deriveAnalytics(loadPlan()), [open]);
  const subjects = analytics.subjects;
  const recommended = subjects.slice().sort((a, b) => b.riskScore - a.riskScore)[0];
  const targetSubject = subject === "auto" ? recommended?.module ?? "Mixed" : subject;
  const targetStat = subjects.find((s) => s.module === targetSubject);

  // Reset on open
  useEffect(() => {
    if (open) {
      setPhase("config");
      setFormat("sba");
      setSubject("auto");
      setDifficulty("Adaptive");
      setDuration(20);
      setQuestions(12);
      setTimed(true);
      setIncludeMissed(true);
      setHighYieldOnly(false);
      setMixWeakStrong(false);
      setExamPacing(true);
      setFavourited(false);
    }
  }, [open]);

  // Thinking animation
  useEffect(() => {
    if (phase !== "generating") return;
    setThinkingIdx(0);
    const id = setInterval(() => {
      setThinkingIdx((i) => Math.min(THINKING_LINES.length - 1, i + 1));
    }, 650);
    const done = setTimeout(() => setPhase("result"), 2800);
    return () => {
      clearInterval(id);
      clearTimeout(done);
    };
  }, [phase]);

  const meta = FORMATS.find((f) => f.id === format)!;
  const skillFocus =
    format === "scenario"
      ? ["Application", "Issue spotting", "Reasoning"]
      : format === "recall"
        ? ["Retrieval", "Definitions", "Memory"]
        : format === "rapid"
          ? ["Speed", "Pattern recognition"]
          : format === "mixed"
            ? ["Interleaving", "Transfer", "Discrimination"]
            : ["Accuracy", "Pacing", "Application"];

  const confidenceImpact =
    targetStat && targetStat.confidence <= 2
      ? "+0.6 confidence (est.)"
      : targetStat && targetStat.confidence === 3
        ? "+0.4 confidence (est.)"
        : "+0.2 confidence (est.)";

  function generate() {
    setPhase("generating");
  }

  function regenerate() {
    setPhase("generating");
  }

  function start() {
    const subjectLine =
      subject === "auto" ? `your highest-risk module (${targetSubject})` : targetSubject;
    const advTags = [
      includeMissed && "include previously-missed concepts",
      highYieldOnly && "prioritise high-yield topics",
      mixWeakStrong && "mix weak and strong topics",
      examPacing && timed && "exam-style pacing",
    ]
      .filter(Boolean)
      .join("; ");

    const prompt =
      `Generate a ${meta.title} (${format}) on ${subjectLine}. ` +
      `${questions} questions over ${duration} minutes, difficulty: ${difficulty}, ${
        timed ? "timed" : "untimed"
      }. ` +
      (advTags ? `Constraints: ${advTags}. ` : "") +
      `Format: brief opening rationale, then numbered items each with the question, ` +
      `four options A–D where applicable, the correct answer, and a 2–3 sentence explanation. ` +
      `Finish with a 3-bullet debrief on what to revise next.`;

    try {
      sessionStorage.setItem("coach:autosend", prompt);
    } catch {}
    onOpenChange(false);
    navigate({ to: "/coach" });
  }

  function saveToPlan() {
    toast.success("Quiz saved to your study plan", {
      description: `${meta.title} · ${questions} Q · ${targetSubject}`,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl border-border bg-card/95 p-0 backdrop-blur-xl">
        <div className="relative overflow-hidden rounded-t-3xl">
          <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gradient-pink-blue opacity-20 blur-3xl" />
          <DialogHeader className="space-y-1.5 px-6 pb-2 pt-6 text-left">
            <Badge className="w-fit rounded-full bg-pink/15 text-pink hover:bg-pink/15">
              <Sparkles className="mr-1 h-3 w-3" /> AI Quiz Builder
            </Badge>
            <DialogTitle className="text-xl tracking-tight">
              {phase === "config" && "Build a personalised quiz"}
              {phase === "generating" && "Generating your quiz…"}
              {phase === "result" && "Your quiz is ready"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {phase === "config" && "Calibrated to your confidence map and recent performance."}
              {phase === "generating" && "Reading your data to design the right session."}
              {phase === "result" && "Start now, save to your plan, or regenerate."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-6 pb-2">
          {/* CONFIG */}
          {phase === "config" && (
            <div className="space-y-5">
              <Field label="Format">
                <div className="grid gap-2 sm:grid-cols-2">
                  {FORMATS.map((f) => {
                    const Icon = f.icon;
                    const active = format === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className={`flex items-start gap-2.5 rounded-2xl border p-3 text-left transition ${
                          active
                            ? "border-pink/60 bg-pink/5 shadow-glow"
                            : "border-border bg-background/40 hover:border-pink/30"
                        }`}
                      >
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                            active
                              ? "bg-gradient-pink-blue text-primary-foreground"
                              : "border border-border bg-background/60"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{f.title}</div>
                          <div className="text-[11px] text-muted-foreground">{f.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Subject">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-pink/60 focus:outline-none"
                  >
                    <option value="auto">Auto · highest risk</option>
                    {subjects.map((s) => (
                      <option key={s.module} value={s.module}>
                        {s.module}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Difficulty">
                  <div className="flex flex-wrap gap-1.5">
                    {DIFFICULTIES.map((d) => (
                      <Chip
                        key={d}
                        active={difficulty === d}
                        onClick={() => setDifficulty(d)}
                      >
                        {d}
                      </Chip>
                    ))}
                  </div>
                </Field>
              </div>

              <Field label={`Duration · ${duration} min`}>
                <Slider
                  value={[duration]}
                  min={5}
                  max={90}
                  step={5}
                  onValueChange={(v) => setDuration(v[0])}
                />
              </Field>

              <Field label={`Questions · ${questions}`}>
                <Slider
                  value={[questions]}
                  min={4}
                  max={40}
                  step={1}
                  onValueChange={(v) => setQuestions(v[0])}
                />
              </Field>

              <ToggleRow
                label="Timed"
                hint="Show a per-question countdown."
                checked={timed}
                onChange={setTimed}
              />

              <div className="rounded-2xl border border-border bg-background/30 p-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Advanced
                </div>
                <div className="space-y-2">
                  <ToggleRow
                    compact
                    label="Include previously missed concepts"
                    checked={includeMissed}
                    onChange={setIncludeMissed}
                  />
                  <ToggleRow
                    compact
                    label="Prioritise high-yield topics"
                    checked={highYieldOnly}
                    onChange={setHighYieldOnly}
                  />
                  <ToggleRow
                    compact
                    label="Mix weak and strong topics"
                    checked={mixWeakStrong}
                    onChange={setMixWeakStrong}
                  />
                  <ToggleRow
                    compact
                    label="Exam-style pacing"
                    checked={examPacing}
                    onChange={setExamPacing}
                  />
                </div>
              </div>
            </div>
          )}

          {/* GENERATING */}
          {phase === "generating" && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="relative">
                <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-pink-blue opacity-40 blur-2xl" />
                <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-pink-blue shadow-glow">
                  <Sparkles className="h-7 w-7 animate-pulse text-primary-foreground" />
                </div>
              </div>
              <div className="mt-5 h-5 text-sm text-muted-foreground transition-all">
                {THINKING_LINES[thinkingIdx]}
              </div>
              <div className="mt-4 flex flex-col gap-1.5">
                {THINKING_LINES.slice(0, thinkingIdx + 1).map((l, i) => (
                  <div
                    key={l}
                    className="flex items-center gap-2 text-[11px] text-muted-foreground"
                    style={{ opacity: i === thinkingIdx ? 1 : 0.5 }}
                  >
                    <CheckCircle2 className="h-3 w-3 text-pink" /> {l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULT */}
          {phase === "result" && (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-pink/30 bg-gradient-to-br from-pink/10 to-blue/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Generated quiz
                    </div>
                    <div className="mt-1 truncate text-lg font-semibold tracking-tight">
                      {meta.title} · {targetSubject}
                    </div>
                  </div>
                  <button
                    onClick={() => setFavourited((v) => !v)}
                    className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background/60 transition hover:border-pink/40"
                    aria-label="Favourite"
                  >
                    <Star
                      className={`h-4 w-4 transition ${
                        favourited ? "fill-pink text-pink" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat icon={Timer} label="Duration" value={`${duration} min`} />
                  <Stat icon={Activity} label="Questions" value={`${questions}`} />
                  <Stat icon={Gauge} label="Difficulty" value={difficulty} />
                  <Stat icon={Sparkles} label="Confidence" value={confidenceImpact} />
                </div>

                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Skill focus
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {skillFocus.map((s) => (
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

              <div className="rounded-2xl border border-border bg-background/40 p-4 text-sm leading-relaxed">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Why this quiz
                </div>
                <p className="mt-1 text-foreground">
                  {targetStat
                    ? `${targetStat.module} sits at ${
                        targetStat.accuracy != null
                          ? `${targetStat.accuracy}% accuracy`
                          : `confidence ${targetStat.confidence}/5`
                      }${
                        targetStat.recencyDays != null
                          ? `, last revised ${targetStat.recencyDays} days ago`
                          : ""
                      }. We're targeting ${
                        difficulty === "Adaptive" ? "adaptive" : difficulty.toLowerCase()
                      } difficulty across ${questions} items to push it back into your strong band.`
                    : `Generated from a balanced view of your syllabus — log a few sessions to unlock fully personalised reasoning.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-6 py-4">
          {phase === "config" && (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={generate}
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
              >
                <Sparkles className="mr-1 h-4 w-4" /> Generate quiz
              </Button>
            </>
          )}
          {phase === "generating" && (
            <div className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Building set…
            </div>
          )}
          {phase === "result" && (
            <>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={regenerate}>
                  <RefreshCw className="mr-1 h-4 w-4" /> Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={saveToPlan}>
                  <Bookmark className="mr-1 h-4 w-4" /> Save to plan
                </Button>
              </div>
              <Button
                onClick={start}
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
              >
                Start quiz <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
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
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
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
      {children}
    </button>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
  compact,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-xl ${
        compact ? "" : "border border-border bg-background/40 p-3"
      }`}
    >
      <div className="pr-2">
        <div className={compact ? "text-sm" : "text-sm font-medium"}>{label}</div>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
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
