import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { firstBillingDateLabel } from "@/lib/founding";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ListChecks,
  Lock,
  RefreshCw,
  Sparkles,
  Target,
  Timer,
  ShieldCheck,
} from "lucide-react";
import { PendingCheckout } from "@/components/pending-checkout";
import {
  getPendingPlanSummary,
  getSubscribePriceDisplay,
  type PendingPlanSummary,
  type PriceDisplay,
} from "@/lib/pending-plans.functions";
import { groupWeekOneByDay } from "@/lib/week-one";
import { getStripeEnvironment, hasPaymentsConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/plan-reveal")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { token?: string; src?: string } => ({
    ...(typeof search.token === "string" ? { token: search.token } : {}),
    ...(typeof search.src === "string"
      ? { src: search.src.slice(0, 40) }
      : {}),
  }),
  component: PlanRevealPage,
  head: () => ({
    meta: [
      { title: "Your personalised study plan · Tentra" },
      {
        name: "description",
        content:
          "Your Tentra study plan is ready — a personalised, adaptive schedule built from your answers.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const UNLOCKS = [
  {
    icon: CalendarClock,
    title: "Your complete plan to exam day",
    body: "Every week from Week 2 onwards, sequenced around your exam date.",
  },
  {
    icon: RefreshCw,
    title: "Automatic recalibration",
    body: "Complete or miss a session and the rest of your plan reshuffles itself.",
  },
  {
    icon: ListChecks,
    title: "Full syllabus tracking",
    body: "See your coverage across every subject and subtopic on your route.",
  },
  {
    icon: BarChart3,
    title: "Progress and weak-topic analytics",
    body: "Accuracy by topic from your quizzes and mocks, not guesswork.",
  },
  {
    icon: Bot,
    title: "AI Coach and Tutor",
    body: "Ask questions on any topic and get answers in exam language.",
  },
  {
    icon: Target,
    title: "Practice questions and mini tests",
    body: "Targeted question sets and mocks that feed straight back into your plan.",
  },
  {
    icon: Timer,
    title: "Focus sessions",
    body: "Time your study, log it once, and let your plan do the rest.",
  },
];

function PlanRevealPage() {
  const navigate = useNavigate();
  const { token, src } = useSearch({ from: "/plan-reveal" });
  const [summary, setSummary] = useState<PendingPlanSummary | null>(null);
  const [price, setPrice] = useState<PriceDisplay | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [stickyReady, setStickyReady] = useState(false);

  const weekOneRef = useRef<HTMLElement | null>(null);
  const boundaryRef = useRef<HTMLElement | null>(null);
  const reasoningRef = useRef<HTMLElement | null>(null);
  const weekOneSeen = useRef(false);
  const boundarySeen = useRef(false);
  const reasoningSeen = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate({ to: "/onboarding", replace: true });
      return;
    }
    (async () => {
      const s = await getPendingPlanSummary({ data: { token } });
      if (!s) {
        setError(
          "We couldn't find that plan. It may have expired — please rebuild it.",
        );
        return;
      }
      setSummary(s);
      trackEvent("plan_reveal_viewed", {
        examType: s.examType,
        hoursPerWeek: s.hoursPerWeek,
        source: src ?? null,
      });
    })();
  }, [token, navigate, src]);

  useEffect(() => {
    if (!hasPaymentsConfigured()) return;
    (async () => {
      const p = await getSubscribePriceDisplay({
        data: { environment: getStripeEnvironment() },
      });
      if ("error" in p) setPriceError(p.error);
      else setPrice(p);
    })();
  }, []);

  // Analytics props shared by every event on this page. NOTE: the plan token
  // is deliberately never included, and no session titles or dates are sent.
  const eventBase = useMemo(
    () => ({
      examType: summary?.examType ?? null,
      hoursPerWeek: summary?.hoursPerWeek ?? null,
      source: src ?? null,
      viewport:
        typeof window !== "undefined" && window.innerWidth < 768
          ? "mobile"
          : "desktop",
    }),
    [summary?.examType, summary?.hoursPerWeek, src],
  );

  // Week 1 / paid-boundary view tracking, plus sticky-CTA gating: the sticky
  // bar only appears once the visitor has actually reached the Week 1 plan.
  useEffect(() => {
    if (!summary) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target === weekOneRef.current && !weekOneSeen.current) {
            weekOneSeen.current = true;
            setStickyReady(true);
            trackEvent("complete_week_one_viewed", {
              ...eventBase,
              sessionCount: summary.weekOne.sessions.length,
              studyDays: summary.weekOne.studyDays,
            });
          }
          if (entry.target === boundaryRef.current && !boundarySeen.current) {
            boundarySeen.current = true;
            trackEvent("paid_value_boundary_viewed", {
              ...eventBase,
              remainingWeeks: summary.locked.remainingWeeks,
            });
          }
          if (entry.target === reasoningRef.current && !reasoningSeen.current) {
            reasoningSeen.current = true;
            trackEvent("plan_reasoning_viewed", {
              ...eventBase,
              confidenceSource: summary.reasoning.confidenceSource,
              ratedCount: summary.reasoning.ratedCount,
            });
          }
        }
      },
      { threshold: 0.25 },
    );
    if (weekOneRef.current) observer.observe(weekOneRef.current);
    if (boundaryRef.current) observer.observe(boundaryRef.current);
    if (reasoningRef.current) observer.observe(reasoningRef.current);
    return () => observer.disconnect();
  }, [summary, eventBase]);

  const returnUrl = useMemo(
    () =>
      typeof window === "undefined" || !token
        ? ""
        : `${window.location.origin}/checkout/return?token=${encodeURIComponent(token)}`,
    [token],
  );

  const handleStart = useCallback(
    (placement: "primary" | "sticky") => {
      if (!hasPaymentsConfigured()) {
        setError(
          "Payments aren't configured for this build. Please try again shortly.",
        );
        return;
      }
      trackEvent("unlock_full_plan_clicked", { ...eventBase, placement });
      trackEvent("founding_cta_clicked", { surface: "plan_reveal", placement });
      trackEvent("checkout_started", {
        examType: summary?.examType,
        hoursPerWeek: summary?.hoursPerWeek,
        placement,
      });
      setShowCheckout(true);
      setTimeout(() => {
        document
          .getElementById("checkout-section")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    },
    [eventBase, summary?.examType, summary?.hoursPerWeek],
  );

  // "Change my answers" — returns to onboarding on the right exam route with
  // the previous date and hours carried over. The existing plan token stays
  // valid until a replacement plan is generated.
  const handleChangeAnswers = useCallback(() => {
    if (!summary) return;
    trackEvent("change_answers_clicked", eventBase);
    navigate({
      to: "/onboarding",
      search: {
        exam: summary.examParam,
        src: "plan_reveal",
        date: summary.examDate,
        hours: summary.hoursPerWeek,
      } as never,
    });
  }, [summary, eventBase, navigate]);

  // This page IS the pricing surface for the onboarding flow.
  useEffect(() => {
    if (!summary) return;
    trackEvent("pricing_section_viewed", { surface: "plan_reveal" });
  }, [summary]);

  useEffect(() => {
    if (!showCheckout) return;
    const onLeave = () => {
      trackEvent("checkout_abandoned", { surface: "plan_reveal" });
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [showCheckout]);

  if (error) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <BackgroundBlobs />
        <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-base text-foreground">{error}</p>
          <Button
            onClick={() => navigate({ to: "/onboarding" })}
            className="h-12 rounded-full bg-gradient-pink-blue px-6 text-primary-foreground shadow-glow"
          >
            Rebuild my plan
          </Button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Preparing your plan…</div>
      </div>
    );
  }

  const billingDate = firstBillingDateLabel();
  const priceLine = price
    ? `£0 today · then ${price.formatted} from ${billingDate}`
    : priceError
      ? "Secure Stripe checkout"
      : "Loading price…";
  const days = groupWeekOneByDay(summary.weekOne.sessions);
  const weekOneHours =
    summary.weekOne.totalMinutes > 0
      ? Math.round((summary.weekOne.totalMinutes / 60) * 10) / 10
      : null;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background pb-40 md:pb-16">
      <BackgroundBlobs />

      <header className="relative mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <BrandMark />
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Plan ready
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-3xl px-5">
        {/* 1. Confirmation hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-pink/40 bg-pink/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-pink">
            <Sparkles className="h-3 w-3" />
            Your plan is ready
          </div>
          <h1 className="mt-4 text-[1.9rem] font-light leading-[1.08] tracking-[-0.02em] text-foreground md:text-[2.6rem]">
            Your personalised {summary.examHeading} revision plan is ready
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[14.5px] leading-[1.6] text-muted-foreground">
            Built around your exam date and {summary.hoursPerWeek} study hours
            each week.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Weeks"
            value={`${summary.weeks}`}
          />
          <StatCard
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Per week"
            value={`${summary.hoursPerWeek}h`}
          />
          <StatCard
            icon={<Target className="h-3.5 w-3.5" />}
            label="To exam"
            value={`${summary.daysUntilExam}`}
          />
        </div>

        {/* Priority areas — only ever called "yours" when genuinely rated. */}
        {summary.focusModules.length > 0 && (
          <section className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              {summary.reasoning.confidenceSource === "rated"
                ? "Your priority areas"
                : "Your starting priorities"}
            </h2>
            <p className="mt-2 text-[13px] leading-[1.55] text-muted-foreground">
              {summary.reasoning.confidenceSource === "rated"
                ? "You rated these areas lower, so Tentra has given them more attention."
                : "Tentra is beginning with balanced foundation coverage across the syllabus."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {summary.focusModules.map((m) => (
                <span
                  key={m}
                  className="rounded-full border border-pink/40 bg-pink/[0.06] px-3 py-1 text-[13px] text-foreground"
                >
                  {m}
                </span>
              ))}
            </div>
            {summary.reasoning.strongModules.length > 0 && (
              <p className="mt-3 text-[12.5px] leading-[1.5] text-muted-foreground">
                {summary.reasoning.strongModules.join(", ")} stay on spaced review so your
                whole syllabus is still covered.
              </p>
            )}
          </section>
        )}

        {/* Why this plan looks like this */}
        <section
          ref={reasoningRef}
          className="mt-6 rounded-2xl border border-border/60 bg-card/50 p-5 backdrop-blur"
          aria-labelledby="reasoning-heading"
        >
          <h2
            id="reasoning-heading"
            className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground"
          >
            Why this plan looks like this
          </h2>
          <ul className="mt-3 space-y-2.5 text-[13.5px] leading-[1.55] text-foreground">
            <li className="flex gap-2.5">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              <span>
                <span className="font-medium">{summary.daysUntilExam} days</span> until your{" "}
                {summary.examHeading} — {summary.weeks} usable{" "}
                {summary.weeks === 1 ? "week" : "weeks"} of planning.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              <span>
                <span className="font-medium">{summary.hoursPerWeek}h a week</span> sets how
                many sessions Tentra schedules and how long each one runs.
              </span>
            </li>
            <li className="flex gap-2.5">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              <span>
                <span className="font-medium">{summary.reasoning.preparationStage}</span> —{" "}
                {summary.reasoning.preparationEffect}
              </span>
            </li>
            <li className="flex gap-2.5">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              <span>
                {summary.reasoning.confidenceSource === "rated" ? (
                  <>
                    You rated{" "}
                    <span className="font-medium">
                      {summary.reasoning.ratedCount} of{" "}
                      {summary.reasoning.subjectCount} subjects
                    </span>
                    , so hours are weighted towards the lower-rated ones — with a floor so no
                    subject is dropped and a cap so none takes over the week.
                  </>
                ) : summary.reasoning.confidenceSource === "not-started" ? (
                  <>
                    You haven&apos;t started the syllabus yet, so every subject starts with
                    foundation-first coverage rather than assumed weakness.
                  </>
                ) : (
                  <>
                    You didn&apos;t rate subjects, so hours are spread evenly across the full
                    syllabus by exam yield — nothing is labelled a personal weakness.
                  </>
                )}
              </span>
            </li>
            <li className="flex gap-2.5">
              <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
              <span>
                From here Tentra recalibrates from what you actually do — completed sessions
                and real practice results take priority over self-ratings.
              </span>
            </li>
          </ul>
        </section>


        {/* 2. Complete week one */}
        <section ref={weekOneRef} className="mt-8" aria-labelledby="week-one-heading">
          <h2
            id="week-one-heading"
            className="text-[1.35rem] font-light tracking-[-0.01em] text-foreground md:text-[1.6rem]"
          >
            Your first week
          </h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">
            Here is your complete starting week. Tentra will continue adapting
            the rest of your plan as you study.
          </p>

          {(summary.weekOne.theme || weekOneHours !== null) && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {summary.weekOne.theme && (
                <span className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12.5px] text-foreground">
                  {summary.weekOne.theme}
                </span>
              )}
              {weekOneHours !== null && (
                <span className="rounded-full border border-border/60 bg-card/70 px-3 py-1.5 text-[12.5px] text-muted-foreground">
                  {weekOneHours}h across {summary.weekOne.studyDays}{" "}
                  {summary.weekOne.studyDays === 1 ? "day" : "days"}
                </span>
              )}
            </div>
          )}

          {days.length > 0 ? (
            <ol className="mt-4 space-y-3">
              {days.map((day) => (
                <li
                  key={day.day}
                  className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-[13.5px] font-semibold text-foreground">
                      Day {day.day}
                      <span className="ml-2 font-normal text-muted-foreground">
                        {formatDay(day.date)}
                      </span>
                    </h3>
                    <span className="text-[12px] text-muted-foreground">
                      {totalMinutes(day.sessions)} min ·{" "}
                      {day.sessions.length}{" "}
                      {day.sessions.length === 1 ? "session" : "sessions"}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-2.5">
                    {day.sessions.map((session, i) => (
                      <li
                        key={`${day.day}-${i}`}
                        className="rounded-xl border border-border/50 bg-background/50 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full border border-pink/40 bg-pink/[0.06] px-2 py-0.5 text-[11px] font-medium text-pink">
                            {session.module}
                          </span>
                          {session.activity && (
                            <span className="rounded-full border border-border/60 bg-card/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                              {session.activity}
                            </span>
                          )}
                          <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {session.minutes} min
                          </span>
                        </div>
                        <p className="mt-2 break-words text-[14px] font-medium leading-[1.45] text-foreground">
                          {session.title}
                        </p>
                        {session.subtopic &&
                          !session.title.includes(session.subtopic) && (
                            <p className="mt-1 break-words text-[12.5px] text-muted-foreground">
                              {session.subtopic}
                            </p>
                          )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-5 text-[13.5px] text-muted-foreground">
              Your first week is being finalised. Activate to open your full
              schedule.
            </div>
          )}

          <p className="mt-4 rounded-2xl border border-border/50 bg-card/40 p-4 text-[13px] leading-[1.6] text-muted-foreground">
            Starting with balanced syllabus coverage. Your plan becomes more
            personalised as Tentra learns from your sessions and practice
            results.
          </p>
        </section>

        {/* 3. Paid value boundary */}
        <section
          ref={boundaryRef}
          className="mt-10 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur md:p-6"
          aria-labelledby="boundary-heading"
        >
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Locked until you activate
          </div>
          <h2
            id="boundary-heading"
            className="mt-3 text-[1.35rem] font-light tracking-[-0.01em] text-foreground md:text-[1.6rem]"
          >
            Keep the plan working for you
          </h2>
          <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">
            Activate Tentra to unlock the rest of your schedule and keep it
            recalibrating as your progress changes.
          </p>

          {summary.locked.remainingWeeks > 0 && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-pink/30 bg-pink/[0.05] p-3.5">
              <CalendarClock className="h-4 w-4 shrink-0 text-pink" />
              <div className="text-[13.5px] leading-[1.5] text-foreground">
                <span className="font-semibold">
                  Weeks {summary.locked.fromWeek}–{summary.weeks}
                </span>{" "}
                <span className="text-muted-foreground">
                  — {summary.locked.remainingWeeks} more{" "}
                  {summary.locked.remainingWeeks === 1 ? "week" : "weeks"} of
                  planned study, through to exam day.
                </span>
              </div>
            </div>
          )}

          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {UNLOCKS.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex gap-2.5 rounded-xl border border-border/50 bg-background/40 p-3.5"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-pink" />
                <div>
                  <div className="text-[13.5px] font-medium leading-[1.4] text-foreground">
                    {title}
                  </div>
                  <div className="mt-0.5 text-[12.5px] leading-[1.5] text-muted-foreground">
                    {body}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* 4. CTA */}
        <section
          id="checkout-section"
          className="mt-8 rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur md:p-7"
        >
          {!showCheckout ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <button
                type="button"
                onClick={handleChangeAnswers}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-[13.5px] text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change my answers
              </button>
              <Button
                onClick={() => handleStart("primary")}
                size="lg"
                disabled={!hasPaymentsConfigured()}
                className="h-14 w-full max-w-sm rounded-full bg-gradient-pink-blue text-[15px] font-medium text-primary-foreground shadow-glow"
              >
                Unlock my full plan
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <div className="text-[14px] font-medium text-foreground">
                {priceLine}
              </div>
              <ul className="mx-auto max-w-sm space-y-1.5 text-left text-[13px] leading-[1.5] text-muted-foreground">
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink" />
                  Billing starts today. Cancel any time in Settings.
                </li>
                <li className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pink" />
                  Your account is created after payment — we email a sign-in
                  link to the address you use at checkout.
                </li>
              </ul>
              <div className="mt-1 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Payments are processed securely by Stripe
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                className="inline-flex min-h-[44px] items-center gap-1.5 text-[13.5px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to my plan
              </button>
              <PendingCheckout token={token!} returnUrl={returnUrl} />
            </div>
          )}
        </section>
      </main>

      {/* 5. Sticky mobile CTA — only after the visitor has reached Week 1. */}
      {!showCheckout && stickyReady && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <Button
            onClick={() => handleStart("sticky")}
            size="lg"
            disabled={!hasPaymentsConfigured()}
            className="h-12 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
          >
            Unlock my full plan
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <div className="mt-1.5 text-center text-[13px] text-muted-foreground">
            {price ? `${price.formatted} · cancel anytime` : "Cancel anytime"}
          </div>
        </div>
      )}
    </div>
  );
}

function totalMinutes(sessions: Array<{ minutes: number }>): number {
  return sessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
}

function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-3 text-center backdrop-blur sm:text-left">
      <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:justify-start">
        <span className="text-pink">{icon}</span>
        <span className={cn("truncate")}>{label}</span>
      </div>
      <div className="mt-1 text-xl font-light text-foreground sm:text-2xl">
        {value}
      </div>
    </div>
  );
}
