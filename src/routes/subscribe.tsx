import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/use-auth";
import { useAuth } from "@/lib/use-auth";
import { useSubscription } from "@/hooks/useSubscription";
import { loadPlan } from "@/lib/plan-store";
import { FOUNDING_MEMBER_PRICE_ID } from "@/lib/founding";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/subscribe")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { next?: string; checkout?: "success"; autostart?: 1 } => ({
    ...(typeof search.next === "string" && search.next.startsWith("/")
      ? { next: search.next as string }
      : {}),
    ...(search.checkout === "success" ? { checkout: "success" as const } : {}),
    ...(search.autostart === 1 || search.autostart === "1"
      ? { autostart: 1 as const }
      : {}),
  }),
  component: SubscribePage,
  head: () => ({
    meta: [
      { title: "Choose your plan — Tentra" },
      {
        name: "description",
        content:
          "Start your Tentra subscription. Full access to your personalised SQE/UBE study plan, AI coach, mocks and analytics.",
      },
    ],
  }),
});


function SubscribePage() {
  const navigate = useNavigate();
  const { next, checkout, autostart } = Route.useSearch();
  const auth = useAuth();
  const sub = useSubscription();
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const isReturningFromCheckout = checkout === "success";

  // Track pricing section view once.
  useEffect(() => {
    trackEvent("pricing_section_viewed", { surface: "subscribe" });
  }, []);

  // When a signed-in user with no active access lands here (e.g. straight
  // after sign-up), drop them into Stripe checkout immediately.
  useEffect(() => {
    if (auth.loading || sub.loading) return;
    if (!auth.user || sub.hasAccess) return;
    if (autostart && !showCheckout) setShowCheckout(true);
  }, [auth.loading, auth.user, sub.loading, sub.hasAccess, autostart, showCheckout]);

  // If access is granted (webhook fired after return), forward to the app.
  useEffect(() => {
    if (auth.loading || !auth.user || sub.loading) return;
    if (sub.hasAccess) {
      navigate({ to: next ?? (loadPlan() ? "/dashboard" : "/onboarding"), replace: true });
    }
  }, [auth.loading, auth.user, sub.loading, sub.hasAccess, navigate, next]);

  // After returning from Stripe, poll until the webhook flips access on.
  useEffect(() => {
    if (!isReturningFromCheckout || !auth.user) return;
    let cancelled = false;
    let attempts = 0;
    (async () => {
      while (!cancelled && attempts < 20) {
        attempts++;
        await sub.refresh();
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!cancelled) {
        toast.error("Payment is taking longer than expected. Please refresh in a moment.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturningFromCheckout, auth.user?.id]);

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/subscribe?checkout=success${next ? `&next=${encodeURIComponent(next)}` : ""}`
      : "";

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out");
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Could not sign out");
    }
  };

  const handleContinueToPayment = async () => {
    trackEvent("founding_cta_clicked", { surface: "subscribe" });
    setCheckingAuth(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        navigate({ to: "/auth", search: { mode: "signup", from: undefined, next: "/subscribe" } });
        return;
      }
      trackEvent("checkout_started", { surface: "subscribe" });
      setShowCheckout(true);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Fire an "abandoned" event if a user opened checkout but navigated away
  // without completing payment.
  useEffect(() => {
    if (!showCheckout) return;
    const onLeave = () => {
      if (!sub.hasAccess) trackEvent("checkout_abandoned", { surface: "subscribe" });
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [showCheckout, sub.hasAccess]);

  if (auth.loading || (auth.user && sub.loading) || isReturningFromCheckout) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        {isReturningFromCheckout && (
          <p className="max-w-xs text-[13px] text-muted-foreground">
            Confirming your payment… this usually takes a few seconds.
          </p>
        )}
      </div>
    );
  }

  const includedFeatures = [
    "Adaptive daily study plan",
    "AI Coach and Tutor",
    "Focus sessions and streak tracking",
    "Practice questions and mini tests",
    "Progress and weak-topic analytics",
    "Automatic plan adjustments",
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <AppShell
        title="Start with a plan built around your life"
        subtitle="Tentra turns your exam date, availability and progress into a study plan that adapts as you work through it."
      >
        <div className="mx-auto max-w-3xl space-y-10">
          {auth.user && !sub.hasAccess && !isReturningFromCheckout && (
            <div className="rounded-xl border border-pink/30 bg-pink/[0.06] px-4 py-3 text-[13px] text-foreground/90">
              <span className="font-medium">Complete payment to activate your account.</span>{" "}
              Your Tentra account isn't active until your subscription starts.
            </div>
          )}

          {!showCheckout && (
            <>
              {/* Single Founding Member card, centred, editorial */}
              <section className="mx-auto w-full max-w-[560px]">
                <div
                  className="relative overflow-hidden rounded-[1.75rem] border border-border/50 bg-card p-8 md:p-10"
                  style={{
                    boxShadow:
                      "0 1px 0 0 oklch(1 0 0 / 0.5) inset, 0 30px 60px -30px oklch(0.65 0.12 320 / 0.20)",
                  }}
                >
                  {/* Subtle pastel glow */}
                  <div
                    className="pointer-events-none absolute -inset-px -z-0 rounded-[1.75rem] opacity-70"
                    style={{
                      background:
                        "radial-gradient(120% 60% at 50% 0%, oklch(0.94 0.05 350 / 0.5), transparent 60%), radial-gradient(120% 60% at 100% 100%, oklch(0.92 0.06 270 / 0.35), transparent 55%)",
                    }}
                  />
                  <div className="relative">
                    <div className="text-center">
                      <div className="inline-flex items-center rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.28em] text-foreground/80">
                        Founding Member
                      </div>
                      <h2 className="mt-6 font-display text-[2.15rem] font-light leading-none tracking-[-0.02em] text-foreground md:text-[2.4rem]">
                        Founding Member Access
                      </h2>
                      <div className="mt-6 flex items-baseline justify-center gap-2">
                        <span className="text-[3rem] font-light leading-none tracking-[-0.03em] text-foreground md:text-[3.5rem]">
                          £9.99
                        </span>
                        <span className="text-[14px] font-normal text-muted-foreground">
                          / month
                        </span>
                      </div>
                      <p className="mx-auto mt-5 max-w-sm text-[14px] leading-[1.6] text-foreground/85">
                        Full access to your personalised study system. Cancel anytime.
                      </p>
                      <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-[1.55] text-muted-foreground">
                        An introductory rate for Tentra's earliest members.
                      </p>
                    </div>

                    <div className="mt-8 flex flex-col items-center gap-3">
                      <Button
                        size="lg"
                        disabled={checkingAuth}
                        onClick={handleContinueToPayment}
                        className="h-13 w-full rounded-full bg-gradient-pink-blue text-[15px] font-medium text-primary-foreground shadow-[0_12px_30px_-12px_oklch(0.55_0.15_320/0.4)] transition-all hover:brightness-[1.06]"
                      >
                        {checkingAuth ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</>
                        ) : (
                          "Start my personalised plan"
                        )}
                      </Button>
                      <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                        <ShieldCheck className="h-3 w-3" />
                        Secure checkout via Stripe · Cancel anytime
                      </div>
                      {auth.user && (
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <LogOut className="h-3.5 w-3.5" /> Sign out
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Detailed feature list below the card */}
              <section className="rounded-2xl border border-border/60 bg-card/50 p-6 backdrop-blur md:p-8">
                <h3 className="text-[13px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  What's included
                </h3>
                <ul className="mt-5 grid gap-3 text-[14px] text-foreground/90 sm:grid-cols-2">
                  {includedFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-foreground/[0.06]">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}

          {showCheckout && (
            <section className="rounded-2xl border border-border/70 bg-card p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  ← Back
                </button>
                <div className="text-[12px] font-medium text-foreground">
                  Founding Member · £9.99 / month
                </div>
              </div>
              <StripeEmbeddedCheckout priceId={FOUNDING_MEMBER_PRICE_ID} returnUrl={returnUrl} />
              <p className="mt-3 text-center text-[11.5px] text-muted-foreground">
                After payment, you'll be taken to build your personalised plan.
              </p>
            </section>
          )}
        </div>
      </AppShell>
    </div>
  );
}
