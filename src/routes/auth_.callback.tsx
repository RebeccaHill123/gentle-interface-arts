import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";

export const Route = createFileRoute("/auth_/callback")({
  component: AuthCallbackPage,
  head: () => ({
    meta: [
      { title: "Verifying… · Tentra" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const hashParams = new URLSearchParams(hash);

        const errorDescription =
          url.searchParams.get("error_description") ||
          hashParams.get("error_description");
        if (errorDescription) {
          throw new Error(errorDescription);
        }

        // 1) PKCE / code exchange flow: ?code=...
        const code = url.searchParams.get("code");
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        }

        // 2) token_hash flow: ?token_hash=...&type=signup|recovery|magiclink|...
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        if (!code && tokenHash && type) {
          const { error: vErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (vErr) throw vErr;
        }

        // 3) Implicit flow: #access_token=...&refresh_token=...
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        if (!code && !tokenHash && accessToken && refreshToken) {
          const { error: sErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sErr) throw sErr;
        }

        // Confirm we have a session now.
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) {
          throw new Error("Verification link is invalid or has expired.");
        }

        if (cancelled) return;

        // Clean the URL (remove tokens from hash/search) before navigating.
        window.history.replaceState({}, document.title, "/auth/callback");

        // /onboarding handles redirect to /dashboard if a plan already exists.
        navigate({ to: "/onboarding", replace: true });
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Verification failed");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
      </div>
      <div className="relative mx-auto flex w-full max-w-[420px] flex-col px-6 py-10">
        <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur md:p-10">
          {error ? (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider text-destructive">
                Verification failed
              </div>
              <h1 className="mt-2 text-2xl font-normal text-foreground">
                We couldn't verify your email
              </h1>
              <div
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{error}</div>
              </div>
              <Button
                type="button"
                onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
                className="mt-6 w-full rounded-full"
                variant="outline"
              >
                Back to sign in
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-foreground" />
              <div>
                <h1 className="text-xl font-normal text-foreground">
                  Verifying your email…
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Just a moment while we sign you in.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
