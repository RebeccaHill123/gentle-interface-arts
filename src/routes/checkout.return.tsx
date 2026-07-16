import { useEffect, useRef, useState } from "react";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pollPendingClaim } from "@/lib/pending-plans.functions";
import { pullPlanFromCloud } from "@/lib/plan-store";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { token?: string; session_id?: string } => ({
    ...(typeof search.token === "string" ? { token: search.token } : {}),
    ...(typeof search.session_id === "string"
      ? { session_id: search.session_id }
      : {}),
  }),
  component: CheckoutReturnPage,
  head: () => ({
    meta: [
      { title: "Setting up your account · Tentra" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type UiState =
  | { kind: "polling"; message: string }
  | { kind: "email-fallback"; email: string }
  | { kind: "error"; message: string }
  | { kind: "signed-in" };

function CheckoutReturnPage() {
  const navigate = useNavigate();
  const { token } = useSearch({ from: "/checkout/return" });
  const [state, setState] = useState<UiState>({
    kind: "polling",
    message: "Confirming your payment…",
  });
  const startedAt = useRef(Date.now());

  useEffect(() => {
    if (!token) {
      setState({
        kind: "error",
        message: "Missing checkout token. Please contact support.",
      });
      return;
    }

    trackEvent("checkout_completed", {});
    let cancelled = false;
    const MAX_MS = 60_000;

    async function tick() {
      if (cancelled) return;
      const elapsed = Date.now() - startedAt.current;

      // If the user is already authenticated (returning-user path where
      // the webhook attached to their existing account), skip magic-link
      // sign-in and go to dashboard.
      const { data: session } = await supabase.auth.getSession();
      if (session.session?.user) {
        setState({ kind: "signed-in" });
        trackEvent("account_access_completed", { path: "already-signed-in" });
        await pullPlanFromCloud().catch(() => null);
        trackEvent("dashboard_reached", {});
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      let result;
      try {
        result = await pollPendingClaim({ data: { token: token! } });
      } catch (err) {
        console.error("[checkout-return] poll failed", err);
        if (elapsed > MAX_MS) {
          setState({
            kind: "error",
            message:
              "We couldn't confirm your account yet. Please check your email for a sign-in link.",
          });
          return;
        }
        setTimeout(tick, 2500);
        return;
      }

      if (result.status === "not_found") {
        setState({
          kind: "error",
          message:
            "We couldn't find your checkout. Please contact support with your Stripe receipt.",
        });
        return;
      }

      if (result.status === "claimed") {
        // Try to sign the user in immediately via the hashed magic-link
        // token captured server-side. If that fails or is missing, tell
        // them to check their email.
        if (result.magicLinkHash) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            type: "magiclink",
            token_hash: result.magicLinkHash,
          });
          if (!otpError) {
            setState({ kind: "signed-in" });
            trackEvent("account_access_completed", { path: "magic-link" });
            await pullPlanFromCloud().catch(() => null);
            trackEvent("dashboard_reached", {});
            navigate({ to: "/dashboard", replace: true });
            return;
          }
          console.error("[checkout-return] verifyOtp failed", otpError);
        }
        setState({
          kind: "email-fallback",
          email: result.email || "",
        });
        return;
      }

      if (elapsed > MAX_MS) {
        setState({
          kind: "error",
          message:
            "Payment received but your account is still being set up. Please refresh in a moment.",
        });
        return;
      }
      setState({
        kind: "polling",
        message:
          result.status === "paid"
            ? "Payment confirmed — setting up your account…"
            : "Confirming your payment…",
      });
      setTimeout(tick, 2000);
    }

    tick();
    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  const resendMagicLink = async () => {
    if (state.kind !== "email-fallback" || !state.email) return;
    await supabase.auth.signInWithOtp({
      email: state.email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/dashboard`
            : undefined,
      },
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />
      <header className="relative mx-auto max-w-3xl px-5 py-5">
        <BrandMark />
      </header>
      <main className="relative mx-auto max-w-md px-5 pt-8 text-center">
        {state.kind === "polling" && (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-pink" />
            <h1 className="mt-6 text-2xl font-light text-foreground">
              {state.message}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              This usually takes a few seconds. Please don't close this page.
            </p>
          </>
        )}
        {state.kind === "signed-in" && (
          <>
            <CheckCircle2 className="mx-auto h-8 w-8 text-pink" />
            <h1 className="mt-6 text-2xl font-light text-foreground">
              You're in. Loading your dashboard…
            </h1>
          </>
        )}
        {state.kind === "email-fallback" && (
          <>
            <Mail className="mx-auto h-8 w-8 text-pink" />
            <h1 className="mt-6 text-2xl font-light text-foreground">
              Check your inbox
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              We've emailed a secure sign-in link
              {state.email ? ` to ${state.email}` : ""}. Open it on this device
              to enter your dashboard.
            </p>
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                variant="outline"
                onClick={resendMagicLink}
                className="rounded-full"
              >
                Resend sign-in link
              </Button>
              <button
                type="button"
                onClick={() => navigate({ to: "/auth", search: { mode: "signin", from: undefined, next: "/dashboard" } })}
                className="text-[13px] text-muted-foreground hover:text-foreground"
              >
                Or sign in another way
              </button>
            </div>
          </>
        )}
        {state.kind === "error" && (
          <>
            <h1 className="mt-6 text-2xl font-light text-foreground">
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {state.message}
            </p>
            <Button
              className="mt-6 rounded-full"
              onClick={() => navigate({ to: "/auth", search: { mode: "signin", from: undefined, next: "/dashboard" } })}
            >
              Go to sign in
            </Button>
          </>
        )}
      </main>
    </div>
  );
}
