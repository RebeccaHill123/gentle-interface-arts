import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Set new password · Tentra" },
      {
        name: "description",
        content: "Set a new password for your Tentra account.",
      },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/reset-password" }],
  }),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Please confirm your password").max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash.startsWith("#")
          ? window.location.hash.slice(1)
          : "";
        const hashParams = new URLSearchParams(hash);

        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        // Already have a session from a recovery flow — nothing to do.
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          setVerifying(false);
          return;
        }

        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) throw exErr;
        } else if (tokenHash && type) {
          const { error: vErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (vErr) throw vErr;
        } else if (accessToken && refreshToken) {
          const { error: sErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sErr) throw sErr;
        } else {
          throw new Error("Reset link is invalid or has expired.");
        }

        // Clean the URL before showing the form
        window.history.replaceState({}, document.title, "/reset-password");
      } catch (err) {
        if (!cancelled) {
          setVerifyError(err instanceof Error ? err.message : "Invalid or expired link.");
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = passwordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (updateErr) {
        const m = updateErr.message.toLowerCase();
        if (m.includes("weak")) {
          setError("That password is too easy to guess. Try a longer phrase or mix of words, numbers and symbols.");
        } else {
          setError(updateErr.message);
        }
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (verifying) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <BackgroundBlobs />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <BrandMark />
        </div>
        <div className="relative mx-auto flex w-full max-w-[440px] flex-col px-6 py-10">
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
          </div>
        </div>
      </div>
    );
  }

  if (verifyError) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <BackgroundBlobs />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <BrandMark />
        </div>
        <div className="relative mx-auto flex w-full max-w-[440px] flex-col px-6 py-10">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur md:p-10">
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-destructive">
              Link invalid
            </div>
            <h1 className="mt-4 text-[1.9rem] font-light leading-[1.1] tracking-[-0.025em] text-foreground">
              Could not verify link
            </h1>
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{verifyError}</div>
            </div>
            <Link
              to="/forgot-password"
              className="mt-6 inline-block text-sm font-medium text-foreground hover:underline"
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
      </div>

      <div className="relative mx-auto flex w-full max-w-[440px] flex-col px-6 py-10">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur md:p-10">
          <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            Account recovery
          </div>
          <h1 className="mt-4 text-[1.9rem] font-light leading-[1.1] tracking-[-0.025em] text-foreground">
            {success ? (
              <>Password <span className="text-gradient-pink-violet font-light">updated</span></>
            ) : (
              <>Set new <span className="text-gradient-pink-violet font-light">password</span></>
            )}
          </h1>

          {success ? (
            <div className="mt-6 space-y-4">
              <p className="text-[14.5px] leading-[1.6] text-muted-foreground">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
              <Button
                onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
                className="h-11 w-full rounded-full bg-gradient-pink-blue text-[14px] font-medium text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                Sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  autoComplete="new-password"
                  maxLength={128}
                  required
                />
                <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  autoComplete="new-password"
                  maxLength={128}
                  required
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>{error}</div>
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-full bg-gradient-pink-blue text-[14px] font-medium text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
