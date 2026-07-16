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


const PLANS: {
  id: SubscriptionPlanId;
  title: string;
  price: string;
  cadence: string;
  perMonth: string;
  save?: string;
  highlight?: boolean;
}[] = [
  {
    id: "pro_monthly",
    title: "Monthly",
    price: "£16.99",
    cadence: "per month · billed monthly",
    perMonth: "£16.99 / month",
  },
  {
    id: "pro_six_month",
    title: "6 months",
    price: "£72.99",
    cadence: "billed every 6 months",
    perMonth: "≈ £12.16 / month",
    save: "Save 28%",
    highlight: true,
  },
];

function SubscribePage() {
  const navigate = useNavigate();
  const { next, checkout, autostart } = Route.useSearch();
  const auth = useAuth();
  const sub = useSubscription();
  const [selected, setSelected] = useState<SubscriptionPlanId>("pro_monthly");
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(false);
  const isReturningFromCheckout = checkout === "success";

  // When a signed-in user with no active access lands here (e.g. straight
  // after sign-up), drop them into Stripe checkout immediately — skip the
  // extra "Continue to payment" click. Requires ?autostart=1 so plan
  // browsing is still possible from Settings.
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
    setCheckingAuth(true);
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) {
        navigate({ to: "/auth", search: { mode: "signup", from: undefined, next: "/subscribe" } });
        return;
      }
      setShowCheckout(true);
    } finally {
      setCheckingAuth(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <AppShell title="Choose your plan" subtitle="Full access to Tentra. Cancel anytime.">
        <div className="mx-auto max-w-4xl space-y-8">
          {auth.user && !sub.hasAccess && !isReturningFromCheckout && (
            <div className="rounded-xl border border-pink/30 bg-pink/[0.06] px-4 py-3 text-[13px] text-foreground/90">
              <span className="font-medium">Complete payment to activate your account.</span>{" "}
              Your Tentra account isn't active until your subscription starts. Unpaid
              accounts are automatically removed after 72 hours.
            </div>
          )}

          {!showCheckout && (
            <>
              <section className="rounded-2xl border border-border/70 bg-card p-6 md:p-8">
                <div className="mb-6">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-pink" />
                    Subscribe to continue
                  </div>
                  <h2 className="mt-3 font-display text-[1.6rem] font-medium leading-tight tracking-tight md:text-[2rem]">
                    Everything you need for the exam,
                    <br className="hidden md:block" />
                    in one intelligent study platform.
                  </h2>
                  <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-muted-foreground">
                    Personalised plan, AI coach, adaptive quizzes, full mocks and
                    analytics — updated weekly as you study.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {PLANS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p.id)}
                      className={`relative rounded-xl border p-5 text-left transition-all ${
                        selected === p.id
                          ? "border-pink shadow-[var(--shadow-soft)] ring-1 ring-pink/40"
                          : "border-border/70 hover:border-border"
                      } ${p.highlight ? "bg-gradient-to-br from-card to-card/80" : "bg-card"}`}
                    >
                      {p.save && (
                        <span className="absolute right-4 top-4 rounded-full bg-gradient-pink-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                          {p.save}
                        </span>
                      )}
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {p.title}
                      </div>
                      <div className="mt-2 font-display text-[1.8rem] font-medium tracking-tight text-foreground">
                        {p.price}
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        {p.cadence}
                      </div>
                      <div className="mt-1 text-[12px] font-medium text-foreground/80">
                        {p.perMonth}
                      </div>
                    </button>
                  ))}
                </div>

                <ul className="mt-6 grid gap-2 text-[13px] text-foreground/90 sm:grid-cols-2">
                  {[
                    "Personalised SQE1 or UBE study plan",
                    "AI coach — chat, voice, quizzes",
                    "Full mock exams with per-topic feedback",
                    "Adaptive weekly re-planning",
                    "Weak-spot detection & recall scheduling",
                    "Analytics, forecasts and streaks",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-[3px] grid h-4 w-4 shrink-0 place-items-center rounded-full bg-foreground/[0.06]">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    size="lg"
                    disabled={!selected || checkingAuth}
                    onClick={handleContinueToPayment}
                    className="rounded-lg bg-gradient-pink-blue text-primary-foreground shadow-[var(--shadow-soft)] transition-all hover:brightness-[1.04]"
                  >
                    {checkingAuth ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…</>
                    ) : (
                      "Continue to payment"
                    )}
                  </Button>
                  {auth.user && (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <LogOut className="h-3.5 w-3.5" /> Sign out
                    </button>
                  )}
                </div>
                <p className="mt-3 text-[11.5px] text-muted-foreground">
                  Secure payment by Stripe. Cancel anytime from Settings.
                </p>
              </section>
            </>
          )}

          {showCheckout && selected && (
            <section className="rounded-2xl border border-border/70 bg-card p-4 md:p-6">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  ← Back to plans
                </button>
                <div className="text-[12px] font-medium text-foreground">
                  {PLANS.find((p) => p.id === selected)?.perMonth}
                </div>
              </div>
              <StripeEmbeddedCheckout priceId={selected} returnUrl={returnUrl} />
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
