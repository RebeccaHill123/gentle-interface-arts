import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  Loader2,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Create your account · Tentra" },
      {
        name: "description",
        content:
          "Sign up for Tentra to build your personalised SQE study plan.",
      },
    ],
  }),
});

const isValidEmail = (e: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

function getStrength(pw: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  if (pw.length === 0) score = 0;
  const labels = ["", "Weak", "Fair", "Good", "Strong"] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score] };
}

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // step 1
  const [email, setEmail] = useState("");

  // step 2
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const initials = useMemo(() => {
    const f = firstName.trim().charAt(0);
    const l = lastName.trim().charAt(0);
    return (f + l).toUpperCase() || "·";
  }, [firstName, lastName]);

  const strength = useMemo(() => getStrength(password), [password]);

  const canCreate =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    strength.score >= 2 &&
    acceptTerms &&
    !submitting;

  const handleGoogle = async () => {
    setOauthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Could not start Google sign-in");
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/onboarding" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setOauthLoading(false);
    }
  };

  const handleEmailContinue = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      toast.error("Enter a valid email address.");
      return;
    }
    setStep(2);
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;
    setSubmitting(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            display_name: displayName,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });
      if (error) {
        if (error.message.toLowerCase().includes("already")) {
          toast.error("That email is already registered. Try signing in.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign up");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        {step !== 3 && (
          <Link
            to="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Sign in
          </Link>
        )}
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-col px-6 pb-10">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  n <= step ? "bg-gradient-pink-blue" : "bg-border"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {step} of 3</span>
            <span>
              {step === 1
                ? "Create account"
                : step === 2
                  ? "Your details"
                  : "All set"}
            </span>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur md:p-10">
          {step === 1 && (
            <>
              <div className="text-xs font-semibold uppercase tracking-wider text-pink">
                Get started
              </div>
              <h1 className="mt-2 text-3xl font-normal text-foreground md:text-4xl">
                Create your{" "}
                <span className="italic text-gradient-tentra">account</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Then we'll build your personalised SQE plan.
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={handleGoogle}
                disabled={oauthLoading}
                className="mt-8 h-12 w-full rounded-full border-2 bg-card text-base font-medium hover:bg-secondary"
              >
                {oauthLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-5 w-5" />
                )}
                Continue with Google
              </Button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  or
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="h-12 rounded-2xl"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!isValidEmail(email)}
                  className="h-12 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
                >
                  Continue with email
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-foreground hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>
                <span className="text-xs text-muted-foreground">{email}</span>
              </div>

              <div className="mt-6 flex flex-col items-center">
                <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-pink-blue text-2xl font-bold text-primary-foreground shadow-glow">
                  {initials}
                </div>
                <h1 className="mt-4 text-2xl font-normal text-foreground md:text-3xl">
                  Tell us about you
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  This is how we'll greet you in Tentra.
                </p>
              </div>

              <form
                onSubmit={handleCreateAccount}
                className="mt-6 space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Alex"
                      autoComplete="given-name"
                      required
                      className="h-12 rounded-2xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Morgan"
                      autoComplete="family-name"
                      required
                      className="h-12 rounded-2xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
                      autoComplete="new-password"
                      required
                      className="h-12 rounded-2xl pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Strength bar */}
                  <div className="pt-2">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((i) => {
                        const active = strength.score >= i;
                        const color =
                          strength.score === 1
                            ? "bg-destructive"
                            : strength.score === 2
                              ? "bg-amber-500"
                              : strength.score === 3
                                ? "bg-blue"
                                : "bg-emerald-500";
                        return (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              active ? color : "bg-muted"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs">
                      <span className="text-muted-foreground">
                        Password strength
                      </span>
                      <span
                        className={
                          strength.score >= 3
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {strength.label || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
                  <Checkbox
                    checked={acceptTerms}
                    onCheckedChange={(c) => setAcceptTerms(c === true)}
                    className="mt-0.5"
                  />
                  <span className="text-muted-foreground">
                    I agree to Tentra's{" "}
                    <a href="#" className="font-medium text-foreground hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="font-medium text-foreground hover:underline">
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>

                <Button
                  type="submit"
                  disabled={!canCreate}
                  className="h-12 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    "Create my account"
                  )}
                </Button>
              </form>
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/20">
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </div>
              <h1 className="mt-6 text-3xl font-normal text-foreground md:text-4xl">
                You're in,{" "}
                <span className="italic text-gradient-tentra">
                  {firstName.trim() || "friend"}
                </span>
                !
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your account is ready. Here's what's now unlocked for you.
              </p>

              <ul className="mt-6 w-full space-y-2 text-left">
                {[
                  { icon: Target, label: "Session tracking" },
                  { icon: Flame, label: "Daily streaks" },
                  { icon: Users, label: "Friends & social" },
                  { icon: Sparkles, label: "AI study coach" },
                ].map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      {label}
                    </span>
                    <Check className="h-4 w-4 text-emerald-500" />
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate({ to: "/onboarding" })}
                className="mt-8 h-12 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
              >
                Go to my dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.9 29.1 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 43c5 0 9.5-1.9 12.9-5l-6-5c-2 1.4-4.4 2.5-6.9 2.5-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 38.6 16.2 43 24 43z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4-4 5.3l6 5C40.9 35 43.5 30 43.5 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
