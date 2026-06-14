import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getRememberMe, setRememberMe } from "@/lib/remember-me";
import { getAuthRedirectURL } from "@/lib/auth-redirect";
import { loadPlan, pushPlanToCloud } from "@/lib/plan-store";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "signin" ? ("signin" as const) : ("signup" as const),
    from: search.from === "onboarding" ? ("onboarding" as const) : undefined,
  }),
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in to Tentra — your SQE revision dashboard" },
      {
        name: "description",
        content:
          "Sign in or create your free Tentra account to access your personalised SQE study plan, MCQ practice and mock exams.",
      },
      { property: "og:title", content: "Sign in to Tentra — your SQE revision dashboard" },
      {
        property: "og:description",
        content: "Access your personalised SQE study plan, practice and mock exams.",
      },
      { property: "og:url", content: "https://tentraapp.com/auth" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/auth" }],
  }),
});

const signUpSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(60),
    lastName: z.string().trim().min(1, "Last name is required").max(60),
    email: z.string().trim().email("Enter a valid email").max(255),
    password: z.string().min(8, "Password must be at least 8 characters").max(128),
    confirmPassword: z.string().min(1, "Please confirm your password").max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(1, "Password is required").max(128),
});

function AuthPage() {
  const navigate = useNavigate();
  const { mode: initialMode, from } = Route.useSearch();
  const [mode, setMode] = useState<"signup" | "signin">(initialMode);
  const fromOnboarding = from === "onboarding";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifySent, setVerifySent] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [remember, setRemember] = useState<boolean>(getRememberMe());

  const reset = () => setError(null);

  const handleResend = async (target: string) => {
    setResendMsg(null);
    setResendErr(null);
    setResending(true);
    try {
      const { error: rErr } = await supabase.auth.resend({
        type: "signup",
        email: target,
        options: { emailRedirectTo: getAuthRedirectURL() },
      });
      if (rErr) {
        setResendErr(rErr.message);
      } else {
        setResendMsg("Verification email sent — check your inbox.");
      }
    } catch (err) {
      setResendErr(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ firstName, lastName, email, password, confirmPassword });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Invalid input");
          return;
        }
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: getAuthRedirectURL(),
            data: {
              first_name: parsed.data.firstName,
              last_name: parsed.data.lastName,
              display_name: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
            },
          },
        });
        if (signUpErr) {
          const m = signUpErr.message;
          if (m.toLowerCase().includes("weak")) {
            setError("That password is too easy to guess. Try a longer phrase or mix of words, numbers and symbols.");
          } else {
            setError(m);
          }
          return;
        }
        const userId = data.user?.id;
        if (userId) {
          // Profile row will be created automatically by handle_new_user trigger;
          // upsert anyway so first/last names are stored.
          await supabase.from("profiles").upsert(
            {
              user_id: userId,
              first_name: parsed.data.firstName,
              last_name: parsed.data.lastName,
              email: parsed.data.email,
              display_name: `${parsed.data.firstName} ${parsed.data.lastName}`.trim(),
            },
            { onConflict: "user_id" },
          );
        }
        // Email verification is required — session will be null until they click the link.
        if (!data.session) {
          setVerifySent(parsed.data.email);
          return;
        }
        // If they built a plan before signing up, push it to cloud now.
        const local = loadPlan();
        if (local) {
          await pushPlanToCloud(local);
          navigate({ to: "/dashboard", replace: true });
        } else {
          navigate({ to: "/onboarding", replace: true });
        }
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) {
          setError(parsed.error.issues[0]?.message ?? "Invalid input");
          return;
        }
        setRememberMe(remember);
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (signInErr) {
          const msg = signInErr.message.toLowerCase();
          if (msg.includes("not confirmed") || msg.includes("email not confirmed")) {
            setError("Please verify your email first — check your inbox.");
          } else if (msg.includes("invalid")) {
            setError("Wrong email or password.");
          } else {
            setError(signInErr.message);
          }
          return;
        }
        // Sync any locally-built plan to the user's account.
        const local = fromOnboarding ? loadPlan() : null;
        if (local) {
          await pushPlanToCloud(local);
        }
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const isSignup = mode === "signup";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
      </div>

      <div className="relative mx-auto flex w-full max-w-[440px] flex-col px-6 py-10">
        {verifySent ? (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur md:p-10">
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              One more step
            </div>
            <h1 className="mt-4 text-[1.9rem] font-light leading-[1.1] tracking-[-0.025em] text-foreground">
              Check your <span className="text-gradient-pink-violet font-light">inbox</span>
            </h1>
            <p className="mt-5 text-[14.5px] leading-[1.6] text-muted-foreground">
              We've sent a verification email to <span className="font-medium text-foreground">{verifySent}</span>.
              Click the link inside to confirm your account — you'll then be taken to build your study plan.
            </p>
            <p className="mt-3 text-[12px] text-muted-foreground/80">
              Didn't get it? Check spam, or resend below.
            </p>
            {resendMsg && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground">
                {resendMsg}
              </div>
            )}
            {resendErr && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{resendErr}</div>
              </div>
            )}
            <Button
              type="button"
              onClick={() => handleResend(verifySent)}
              disabled={resending}
              className="mt-7 h-11 w-full rounded-full bg-gradient-pink-blue text-[14px] font-medium text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
            >
              {resending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resending…</>
              ) : (
                "Resend verification email"
              )}
            </Button>
            <Button
              type="button"
              onClick={() => { setVerifySent(null); setMode("signin"); }}
              className="mt-3 h-11 w-full rounded-full border border-border/60 bg-transparent text-[13.5px] font-normal text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground"
              variant="ghost"
            >
              Back to sign in
            </Button>
          </div>
        ) : (
        <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur md:p-10">
          <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
            {isSignup ? "Get started" : "Welcome back"}
          </div>
          <h1 className="mt-4 text-[1.9rem] font-light leading-[1.1] tracking-[-0.025em] text-foreground">
            {isSignup ? (
              <>Create your <span className="text-gradient-pink-violet font-light">Tentra</span> account</>
            ) : (
              <>Sign in to <span className="text-gradient-pink-violet font-light">Tentra</span></>
            )}
          </h1>

          {fromOnboarding && isSignup && (
            <div className="mt-5 rounded-xl border border-pink/25 bg-pink/[0.05] p-4 text-[13.5px]">
              <div className="font-medium text-foreground">
                Your personalised plan is ready
              </div>
              <p className="mt-1 leading-[1.55] text-muted-foreground">
                Create a free account to save it, track your streak, and unlock your dashboard. Free during early access.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            {isSignup && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); reset(); }}
                    autoComplete="given-name"
                    maxLength={60}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); reset(); }}
                    autoComplete="family-name"
                    maxLength={60}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); reset(); }}
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); reset(); }}
                autoComplete={isSignup ? "new-password" : "current-password"}
                maxLength={128}
                required
              />
              {isSignup && (
                <p className="text-[11px] text-muted-foreground">At least 8 characters.</p>
              )}
            </div>

            {isSignup && (
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); reset(); }}
                  autoComplete="new-password"
                  maxLength={128}
                  required
                />
              </div>
            )}

            {!isSignup && (
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-pink"
                />
                <span>Remember me on this device</span>
              </label>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="flex-1">
                  <div>{error}</div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="mt-1 text-xs font-medium underline underline-offset-2 hover:no-underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-full bg-gradient-pink-blue text-[14px] font-medium text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
            >
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {isSignup ? "Creating account…" : "Signing in…"}</>
              ) : (
                isSignup ? "Create account" : "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "New to Tentra?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(isSignup ? "signin" : "signup");
                setError(null);
              }}
              className="font-medium text-foreground hover:underline"
            >
              {isSignup ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
        )}
      </div>
    </div>
  );
}
