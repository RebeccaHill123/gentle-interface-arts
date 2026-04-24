import { useState, useMemo, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Loader2, Mail, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const requirements = useMemo(
    () => [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "One uppercase letter", met: /[A-Z]/.test(password) },
      { label: "One number", met: /\d/.test(password) },
    ],
    [password],
  );

  const passwordsMatch =
    password.length > 0 && password === confirmPassword;
  const allRequirementsMet = requirements.every((r) => r.met);
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    allRequirementsMet &&
    passwordsMatch &&
    !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!allRequirementsMet) {
      toast.error("Please meet all password requirements.");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: { display_name: name },
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
      setSubmittedEmail(email);
      // Smooth transition: show confirmation, then continue to onboarding
      setTimeout(() => {
        navigate({ to: "/onboarding" });
      }, 3200);
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
        <Link
          to="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </div>

      <div className="relative mx-auto flex max-w-md flex-col px-6 py-10">
        <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur md:p-10">
          {submittedEmail ? (
            <div
              className="animate-in fade-in slide-in-from-bottom-4 duration-500"
              aria-live="polite"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow">
                <Mail className="h-6 w-6" />
              </div>
              <h1 className="mt-5 text-center text-3xl font-normal text-foreground md:text-4xl">
                Check your{" "}
                <span className="italic text-gradient-tentra">inbox</span>
              </h1>
              <p className="mt-3 text-center text-sm text-muted-foreground">
                We've sent a confirmation link to{" "}
                <span className="font-medium text-foreground">
                  {submittedEmail}
                </span>
                .
              </p>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Can't see it? It may be in your{" "}
                <span className="font-medium text-foreground">junk</span> or
                spam folder.
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Taking you to your plan…
              </div>
            </div>
          ) : (
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

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Amelia"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    required
                  />
                  <ul className="mt-2 space-y-1 text-xs">
                    {requirements.map((r) => (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1.5 transition-colors ${
                          r.met ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {r.met ? (
                          <Check className="h-3.5 w-3.5 text-pink" />
                        ) : (
                          <X className="h-3.5 w-3.5 opacity-50" />
                        )}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword">Re-confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    required
                  />
                  {confirmPassword.length > 0 && (
                    <p
                      className={`flex items-center gap-1.5 text-xs ${
                        passwordsMatch ? "text-foreground" : "text-destructive"
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-pink" />
                          Passwords match
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" />
                          Passwords don't match
                        </>
                      )}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      Creating account…
                    </>
                  ) : (
                    "Create account & build my plan"
                  )}
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
        </div>
      </div>
    </div>
  );
}
