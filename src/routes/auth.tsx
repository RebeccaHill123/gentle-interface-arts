import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getRememberMe, setRememberMe } from "@/lib/remember-me";
import { getAuthRedirectURL } from "@/lib/auth-redirect";
import { loadPlan, pullPlanFromCloud, pushPlanToCloud } from "@/lib/plan-store";

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
    agreeTerms: z.literal(true, {
      errorMap: () => ({ message: "You must agree to the Terms of Use to continue" }),
    }),
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
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // OTP step state
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpAutoSubmitted = useRef(false);

  const [remember, setRemember] = useState<boolean>(getRememberMe());

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const reset = () => setError(null);

  const goAfterAuth = async () => {
    const local = loadPlan();
    if (local) {
      await pushPlanToCloud(local);
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    const cloud = await pullPlanFromCloud();
    if (cloud) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    navigate({ to: "/onboarding", replace: true });
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not sign in with Google");
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return; // browser will navigate away
      await goAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in with Google");
      setGoogleLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    if (!otpEmail || code.length !== 6 || verifyingOtp) return;
    setOtpError(null);
    setVerifyingOtp(true);
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: code,
        type: "signup",
      });
      if (vErr) {
        const lower = vErr.message.toLowerCase();
        setOtpError(
          lower.includes("expired")
            ? "That code has expired. Tap resend below to get a new one."
            : "That code didn't work. If you've resent a new code, older codes no longer work — use the most recent one in your inbox.",
        );
        setOtpCode("");
        otpAutoSubmitted.current = false;
        return;
      }
      await goAfterAuth();
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Verification failed");
      otpAutoSubmitted.current = false;
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!otpEmail || resending || resendCooldown > 0) return;
    setResendMsg(null);
    setOtpError(null);
    setResending(true);
    try {
      const { error: rErr } = await supabase.auth.resend({
        type: "signup",
        email: otpEmail,
        options: { emailRedirectTo: getAuthRedirectURL() },
      });
      if (rErr) {
        setOtpError(rErr.message);
      } else {
        setResendMsg("New code sent — older codes no longer work. Use the latest one in your inbox.");
        setResendCooldown(30);
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to resend");
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
        const parsed = signUpSchema.safeParse({ firstName, lastName, email, password, confirmPassword, agreeTerms });
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
        if (!data.session) {
          // Move to inline OTP step instead of asking them to leave the tab.
          setOtpEmail(parsed.data.email);
          setOtpCode("");
          setOtpError(null);
          setResendMsg(null);
          setResendCooldown(30);
          otpAutoSubmitted.current = false;
          return;
        }
        await goAfterAuth();
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
            // Drop them straight into OTP verification instead of bouncing them to email.
            setOtpEmail(parsed.data.email);
            setOtpCode("");
            setOtpError(null);
            setResendMsg("We sent a fresh 6-digit code to verify your email.");
            setResendCooldown(30);
            otpAutoSubmitted.current = false;
            await supabase.auth.resend({
              type: "signup",
              email: parsed.data.email,
              options: { emailRedirectTo: getAuthRedirectURL() },
            });
            return;
          } else if (msg.includes("invalid")) {
            setError("Wrong email or password.");
          } else {
            setError(signInErr.message);
          }
          return;
        }
        const local = fromOnboarding ? loadPlan() : null;
        if (local) {
          await pushPlanToCloud(local);
        }
        navigate({
          to: fromOnboarding && !local ? "/onboarding" : "/dashboard",
          replace: true,
        });
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
        {otpEmail ? (
          <div className="rounded-2xl border border-border/60 bg-card/60 p-8 backdrop-blur md:p-10">
            <div className="text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Verify your email
            </div>
            <h1 className="mt-4 text-[1.9rem] font-light leading-[1.1] tracking-[-0.025em] text-foreground">
              Enter the <span className="text-gradient-pink-violet font-light">6-digit code</span>
            </h1>
            <p className="mt-4 text-[14.5px] leading-[1.6] text-muted-foreground">
              We sent a code to <span className="font-medium text-foreground">{otpEmail}</span>.
              Type it in below to finish setting up your account.
            </p>

            <div className="mt-7 flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(v) => {
                  const digits = v.replace(/\D/g, "").slice(0, 6);
                  setOtpCode(digits);
                  setOtpError(null);
                  if (digits.length === 6 && !otpAutoSubmitted.current) {
                    otpAutoSubmitted.current = true;
                    void handleVerifyOtp(digits);
                  }
                }}
                disabled={verifyingOtp}
                inputMode="numeric"
                autoFocus
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={1} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={2} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={3} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={4} className="h-12 w-12 text-lg" />
                  <InputOTPSlot index={5} className="h-12 w-12 text-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {verifyingOtp && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
              </div>
            )}

            {otpError && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div>{otpError}</div>
              </div>
            )}

            {resendMsg && !otpError && (
              <div className="mt-5 rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground">
                {resendMsg}
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-3 text-center text-sm">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending || resendCooldown > 0}
                className="font-medium text-foreground hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
              >
                {resending
                  ? "Resending…"
                  : resendCooldown > 0
                  ? `Resend code in ${resendCooldown}s`
                  : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpEmail(null);
                  setOtpCode("");
                  setOtpError(null);
                  setResendMsg(null);
                  otpAutoSubmitted.current = false;
                }}
                className="text-muted-foreground hover:text-foreground hover:underline"
              >
                Use a different email
              </button>
            </div>
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

          <Button
            type="button"
            onClick={handleGoogle}
            disabled={googleLoading || submitting}
            variant="outline"
            className="mt-7 h-11 w-full rounded-full border-border/70 bg-background/60 text-[14px] font-medium text-foreground hover:bg-foreground/[0.04]"
          >
            {googleLoading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening Google…</>
            ) : (
              <>
                <GoogleLogo className="mr-2 h-4 w-4" />
                Continue with Google
              </>
            )}
          </Button>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
            <div className="h-px flex-1 bg-border/60" />
            or
            <div className="h-px flex-1 bg-border/60" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignup && (
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
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

            {isSignup && (
              <label className="flex cursor-pointer select-none items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => { setAgreeTerms(e.target.checked); reset(); }}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-pink"
                  required
                />
                <span>
                  I agree to the{" "}
                  <Link
                    to="/terms"
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    Terms of Use
                  </Link>
                </span>
              </label>
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
              disabled={submitting || googleLoading}
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

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.6 14.6 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12S6.9 21.3 12 21.3c6.9 0 11.5-4.8 11.5-11.6 0-.78-.08-1.37-.18-1.95H12z" />
      <path fill="#34A853" d="M3.88 7.55l3.2 2.35C7.95 7.95 9.8 6.6 12 6.6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.6 14.6 2.7 12 2.7 8.18 2.7 4.92 5 3.88 7.55z" opacity="0" />
      <path fill="#4285F4" d="M23.5 12c0-.78-.08-1.37-.18-1.95H12V14.1h6.5c-.28 1.45-1.1 2.68-2.34 3.5l3.6 2.8c2.1-1.95 3.74-4.82 3.74-8.4z" />
      <path fill="#FBBC05" d="M5.3 14.3a6 6 0 0 1 0-4.6L2.1 7.35A10 10 0 0 0 2 12c0 1.65.4 3.2 1.1 4.55l3.2-2.25z" />
      <path fill="#34A853" d="M12 21.3c2.7 0 5-.9 6.66-2.45l-3.6-2.8c-.95.65-2.2 1.1-3.66 1.1-2.8 0-5.18-1.88-6.03-4.4l-3.2 2.45C3.93 18.7 7.66 21.3 12 21.3z" />
    </svg>
  );
}
