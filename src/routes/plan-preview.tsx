import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import {
  ArrowRight,
  ArrowLeft,
  Lock,
  Calendar,
  Clock,
  Target,
  Sparkles,
  CheckCircle2,
  Brain,
  TrendingUp,
  PlayCircle,
  ListChecks,
} from "lucide-react";
import {
  loadOnboardingDraft,
  type StoredPlan,
} from "@/lib/plan-store";
import { loadPreviewFromLocal } from "@/lib/preview-plan";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/plan-preview")({
  component: PlanPreviewPage,
  head: () => ({
    meta: [
      { title: "Your Tentra Study Plan — Preview" },
      {
        name: "description",
        content:
          "Preview your personalised SQE, NY Bar or MPRE study plan before creating an account.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const EXAM_LABEL: Record<string, string> = {
  SQE1: "SQE1",
  SQE2: "SQE2",
  UBE: "NY Bar (UBE)",
  MPRE: "MPRE",
};

function PlanPreviewPage() {
  const navigate = useNavigate();
  const [stored, setStored] = useState<StoredPlan | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = loadPreviewFromLocal();
    if (!local) {
      const draft = loadOnboardingDraft();
      if (!draft) {
        navigate({ to: "/onboarding", replace: true });
        return;
      }
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    setStored(local);
    setReady(true);
    trackEvent("preview_viewed", {
      examType: local.input.examType,
      examPath: local.input.examPath,
      hoursPerWeek: local.input.hoursPerWeek,
    });
  }, [navigate]);

  const data = useMemo(() => {
    if (!stored) return null;
    const examLabel =
      EXAM_LABEL[stored.input.examType] ?? stored.input.examType;
    const today = stored.plan.todayTasks?.[0];
    const weak = stored.input.modules
      .filter((m) => m.confidence <= 2 || (m.weakSubtopics?.length ?? 0) > 0)
      .slice(0, 6);
    const weeks = stored.plan.weeklyFocus ?? [];
    const allocations = stored.plan.weeklyStrategy?.allocations ?? [];
    return { examLabel, today, weak, weeks, allocations };
  }, [stored]);

  if (!ready || !stored || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading your plan…</div>
      </div>
    );
  }

  const { examLabel, today, weak, weeks, allocations } = data;
  const input = stored.input;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-32 md:pb-16">
      <BackgroundBlobs />

      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <BrandMark />
        <div className="text-xs text-muted-foreground">Plan preview</div>
      </header>

      <main className="relative mx-auto w-full max-w-5xl px-6">
        <div className="text-center">
          <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Your Tentra Study Plan
          </div>
          <h1 className="mt-3 text-[2rem] font-light leading-[1.08] tracking-[-0.02em] text-foreground md:text-[2.5rem]">
            Built for {examLabel} — {stored.daysUntilExam} days to go.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[14.5px] leading-[1.6] text-muted-foreground">
            This is a preview generated from your answers. Create an account to
            save it, track progress and let Tentra adapt it as you study.
          </p>
        </div>

        {/* Top stats */}
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <StatCard icon={<Calendar className="h-4 w-4" />} label="Exam in" value={`${stored.daysUntilExam} days`} />
          <StatCard icon={<Clock className="h-4 w-4" />} label="Weekly hours" value={`${input.hoursPerWeek}h`} />
          <StatCard
            icon={<Target className="h-4 w-4" />}
            label="Weak areas flagged"
            value={`${weak.length}`}
          />
        </div>

        {/* Today's session */}
        <section className="mt-8 overflow-hidden rounded-2xl border border-pink/40 bg-gradient-pink-blue/[0.06] p-6 backdrop-blur md:p-8">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-pink">
            <Sparkles className="h-3.5 w-3.5" /> Recommended today
          </div>
          {today ? (
            <>
              <h2 className="mt-3 text-xl font-medium text-foreground md:text-2xl">
                {today.title}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {today.minutes}-minute focused block · {today.module}
                {today.why ? ` · ${today.why}` : ""}
              </p>
            </>
          ) : (
            <h2 className="mt-3 text-xl font-medium text-foreground">
              Start with a 30-minute diagnostic across your top modules.
            </h2>
          )}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <LockedAction icon={<PlayCircle className="h-4 w-4" />} label="Start focus block" />
            <LockedAction icon={<ListChecks className="h-4 w-4" />} label="Log a study session" />
          </div>
        </section>

        {/* This week's focus */}
        <section className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                This week's focus
              </div>
              <h2 className="mt-1 text-lg font-medium text-foreground md:text-xl">
                Where your hours go this week
              </h2>
            </div>
            <div className="text-xs text-muted-foreground">{input.hoursPerWeek}h total</div>
          </div>
          <div className="mt-5 space-y-3">
            {allocations.slice(0, 5).map((a) => (
              <div
                key={a.module}
                className="rounded-xl border border-border/50 bg-background/40 p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-medium text-foreground">{a.module}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.hours}h ·{" "}
                    {a.rationale === "weak-area" ? "Weak area" : "High-yield"}
                  </div>
                </div>
                <p className="mt-1.5 text-xs leading-[1.55] text-muted-foreground">
                  {a.note}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Weak areas */}
        {weak.length > 0 && (
          <section className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur md:p-8">
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Weak-area priority
            </div>
            <h2 className="mt-1 text-lg font-medium text-foreground md:text-xl">
              We'll concentrate reps here
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {weak.map((m) => (
                <span
                  key={m.id}
                  className="rounded-full border border-pink/40 bg-pink/[0.06] px-3 py-1 text-xs text-foreground"
                >
                  {m.name}
                  {(m.weakSubtopics?.length ?? 0) > 0 && (
                    <span className="ml-1 text-pink">· {m.weakSubtopics!.length}</span>
                  )}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Timeline */}
        <section className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur md:p-8">
          <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Your roadmap
          </div>
          <h2 className="mt-1 text-lg font-medium text-foreground md:text-xl">
            Week-by-week progression
          </h2>
          <ol className="mt-5 space-y-3">
            {weeks.map((w, idx) => (
              <li key={w.week} className="flex gap-3">
                <div
                  className={cn(
                    "mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-medium",
                    idx === 0
                      ? "bg-gradient-pink-blue text-primary-foreground"
                      : "bg-card text-muted-foreground",
                  )}
                >
                  {w.week}
                </div>
                <div className="flex-1 rounded-xl border border-border/50 bg-background/40 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="text-sm font-medium text-foreground">
                      {w.theme}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {w.hours}h
                    </div>
                  </div>
                  <div className="mt-1 text-[11.5px] text-muted-foreground">
                    {w.modules.slice(0, 3).join(" · ")}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Locked features */}
        <section className="mt-8 rounded-2xl border border-border/60 bg-background/40 p-6 backdrop-blur">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            <Lock className="h-3 w-3" /> Unlocks with a free account
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-2 text-sm text-foreground sm:grid-cols-2">
            {[
              "Save & sync your plan",
              "Track study time & streaks",
              "Live focus sessions",
              "AI tutor for any topic",
              "Performance analytics",
              "Adaptive plan adjustments",
              "Mock exam history",
              "Weak-area mini-tests",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-pink" />
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* CTAs */}
        <section className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="max-w-md text-sm text-muted-foreground">
            Create an account to save this plan and let Tentra adapt it as you study.
          </p>
          <Button
            asChild
            size="lg"
            className="h-12 w-full max-w-sm rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
          >
            <Link to="/auth" search={{ mode: "signup", from: "onboarding" }}>
              Create account to save my plan
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Edit my answers
          </Link>
        </section>
      </main>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-4 py-3 backdrop-blur md:hidden">
        <Button
          asChild
          size="lg"
          className="h-12 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
        >
          <Link to="/auth" search={{ mode: "signup", from: "onboarding" }}>
            Save my plan <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur">
      <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-pink">{icon}</span>
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-light text-foreground">{value}</div>
    </div>
  );
}

function LockedAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Button
      asChild
      variant="outline"
      className="h-11 flex-1 rounded-full border-border/70 bg-background/60 text-sm font-medium text-foreground hover:bg-foreground/[0.04]"
    >
      <Link to="/auth" search={{ mode: "signup", from: "onboarding" }}>
        {icon}
        <span className="ml-2">{label}</span>
        <Lock className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
      </Link>
    </Button>
  );
}
