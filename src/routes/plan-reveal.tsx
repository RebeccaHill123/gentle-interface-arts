import { useEffect, useMemo, useState } from "react";
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
  Calendar,
  Clock,
  Lock,
  PlayCircle,
  Sparkles,
  Target,
  ShieldCheck,
} from "lucide-react";
import { PendingCheckout } from "@/components/pending-checkout";
import {
  getPendingPlanSummary,
  getSubscribePriceDisplay,
  type PendingPlanSummary,
  type PriceDisplay,
} from "@/lib/pending-plans.functions";
import { getStripeEnvironment, hasPaymentsConfigured } from "@/lib/stripe";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/plan-reveal")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { token?: string } => ({
    ...(typeof search.token === "string" ? { token: search.token } : {}),
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

function PlanRevealPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/plan-reveal" });
  const [summary, setSummary] = useState<PendingPlanSummary | null>(null);
  const [price, setPrice] = useState<PriceDisplay | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

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
      });
    })();
  }, [token, navigate]);

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

  const returnUrl = useMemo(
    () =>
      typeof window === "undefined" || !token
        ? ""
        : `${window.location.origin}/checkout/return?token=${encodeURIComponent(token)}`,
    [token],
  );

  const handleStart = () => {
    if (!hasPaymentsConfigured()) {
      setError(
        "Payments aren't configured for this build. Please try again shortly.",
      );
      return;
    }
    trackEvent("founding_cta_clicked", { surface: "plan_reveal" });
    trackEvent("checkout_started", {
      examType: summary?.examType,
      hoursPerWeek: summary?.hoursPerWeek,
    });
    setShowCheckout(true);
    // Scroll checkout into view on mobile.
    setTimeout(() => {
      document
        .getElementById("checkout-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  // Track pricing_section_viewed the first time the reveal page mounts with
  // a summary (this page IS the pricing surface for the new onboarding flow).
  useEffect(() => {
    if (!summary) return;
    trackEvent("pricing_section_viewed", { surface: "plan_reveal" });
  }, [summary]);

  // Fire checkout_abandoned if the user opens checkout then leaves without
  // completing (webhook not yet fired).
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
            className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
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

  const priceLine = price
    ? `${price.formatted} · cancel anytime`
    : priceError
      ? "Secure Stripe checkout"
      : "Loading price…";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-36 md:pb-16">
      <BackgroundBlobs />

      <header className="relative mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <BrandMark />
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Plan ready
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-3xl px-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-pink/40 bg-pink/[0.06] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-pink">
            <Sparkles className="h-3 w-3" />
            Ready
          </div>
          <h1 className="mt-4 text-[1.9rem] font-light leading-[1.08] tracking-[-0.02em] text-foreground md:text-[2.6rem]">
            Your personalised study plan is ready
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[14.5px] leading-[1.6] text-muted-foreground">
            Built for your {summary.examLabel} exam on{" "}
            {new Date(summary.examDate).toLocaleDateString(undefined, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            . Here's a preview — the full plan unlocks after activation.
          </p>
        </div>

        {/* Key stats */}
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-3">
          <StatCard
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Weeks left"
            value={`${summary.weeks}`}
          />
          <StatCard
            icon={<Clock className="h-3.5 w-3.5" />}
            label="Per week"
            value={`${summary.hoursPerWeek}h`}
          />
          <StatCard
            icon={<Target className="h-3.5 w-3.5" />}
            label="Days to go"
            value={`${summary.daysUntilExam}`}
          />
        </div>

        {/* Focus areas */}
        {summary.focusModules.length > 0 && (
          <section className="mt-6 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Main areas of focus
            </div>
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
          </section>
        )}

        {/* Week 1 preview */}
        {summary.firstWeek && (
          <section className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Week 1
            </div>
            <div className="mt-2 text-[15px] font-medium text-foreground">
              {summary.firstWeek.theme}
            </div>
            <div className="mt-1 text-[12.5px] text-muted-foreground">
              {summary.firstWeek.hours}h across{" "}
              {summary.firstWeek.modules.slice(0, 3).join(" · ")}
            </div>
          </section>
        )}

        {/* First session */}
        {summary.firstSession && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-pink/40 bg-gradient-pink-blue/[0.06] p-5 backdrop-blur">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.24em] text-pink">
              <PlayCircle className="h-3.5 w-3.5" /> Your first session
            </div>
            <div className="mt-2 text-[15.5px] font-medium text-foreground">
              {summary.firstSession.title}
            </div>
            <div className="mt-1 text-[12.5px] text-muted-foreground">
              {summary.firstSession.minutes}-minute block ·{" "}
              {summary.firstSession.module}
            </div>
          </section>
        )}

        {/* Locked remainder */}
        <section className="relative mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur">
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-transparent via-background/40 to-background" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-center pb-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-[11px] font-medium text-foreground backdrop-blur">
              <Lock className="h-3 w-3" />
              Unlocks after activation
            </div>
          </div>
          <div className="blur-[3px] pointer-events-none select-none">
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Full 12-week roadmap
            </div>
            <ul className="mt-3 space-y-2">
              {summary.plan.weeklyFocus.slice(1, 6).map((w) => (
                <li
                  key={w.week}
                  className="rounded-xl border border-border/40 bg-background/40 p-3"
                >
                  <div className="text-sm font-medium text-foreground">
                    Week {w.week} · {w.theme}
                  </div>
                  <div className="mt-1 text-[11.5px] text-muted-foreground">
                    {w.modules.slice(0, 3).join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section
          id="checkout-section"
          className="mt-8 rounded-2xl border border-border/60 bg-card/70 p-5 backdrop-blur md:p-7"
        >
          {!showCheckout ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <Button
                onClick={handleStart}
                size="lg"
                disabled={!hasPaymentsConfigured()}
                className="h-14 w-full max-w-sm rounded-full bg-gradient-pink-blue text-[15px] font-medium text-primary-foreground shadow-glow"
              >
                Start my personalised plan
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
              <div className="text-[13px] font-medium text-foreground">
                {priceLine}
              </div>
              <div className="mx-auto max-w-sm text-[11.5px] leading-[1.55] text-muted-foreground">
                Payment details required. Billing starts today.
                Your account is created after successful payment — an email
                sign-in link will be sent to the address you use at checkout.
                Cancel any time from Settings.
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                Secure Stripe checkout
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowCheckout(false)}
                className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to my plan
              </button>
              <PendingCheckout token={token!} returnUrl={returnUrl} />
            </div>
          )}
        </section>
      </main>

      {!showCheckout && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <Button
            onClick={handleStart}
            size="lg"
            disabled={!hasPaymentsConfigured()}
            className="h-12 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
          >
            Start my personalised plan
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <div className="mt-1.5 text-center text-[11px] text-muted-foreground">
            {price ? `${price.formatted} · cancel anytime` : "Cancel anytime"}
          </div>
        </div>
      )}
    </div>
  );
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
