import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Must match the Supabase Auth `mailer_otp_length` setting.
const OTP_LENGTH = 6;
const OTP_SLOTS = Array.from({ length: OTP_LENGTH }, (_, i) => i);

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
  head: () => ({
    meta: [
      { title: "Reset your password · Tentra" },
      {
        name: "description",
        content: "Request a password reset code for your Tentra account.",
      },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/forgot-password" }],
  }),
});

const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"email" | "otp">("email");

  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = window.setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendCooldown]);

  const sendCode = async (target: string) => {
    const redirectTo = `${window.location.origin}/reset-password`;
    return supabase.auth.resetPasswordForEmail(target, { redirectTo });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }
    setSubmitting(true);
    try {
      const { error: resetErr } = await sendCode(parsed.data.email);
      if (resetErr) {
        setError(resetErr.message);
        return;
      }
      setStep("otp");
      setResendCooldown(30);
      autoSubmitted.current = false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (token: string) => {
    if (verifying) return;
    if (token.length !== OTP_LENGTH) {
      setOtpError(`Please enter the ${OTP_LENGTH}-digit code from your latest email.`);
      autoSubmitted.current = false;
      return;
    }
    setOtpError(null);
    setVerifying(true);
    try {
      const { error: vErr } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "recovery",
      });
      if (vErr) {
        const lower = vErr.message.toLowerCase();
        const isExpired = lower.includes("expired") || lower.includes("otp_expired");
        setOtpError(
          isExpired
            ? "That code has expired. Tap resend below."
            : "That code doesn't match. If you've resent a new code, older codes no longer work — use the most recent one in your inbox.",
        );
        setCode("");
        autoSubmitted.current = false;
        return;
      }
      navigate({ to: "/reset-password", replace: true });
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Verification failed");
      autoSubmitted.current = false;
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;
    setResendMsg(null);
    setOtpError(null);
    setResending(true);
    try {
      const { error: rErr } = await sendCode(email);
      if (rErr) {
        setOtpError(rErr.message);
      } else {
        setResendMsg("New code sent — check your inbox.");
        setResendCooldown(30);
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setResending(false);
    }
  };

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
            {step === "email" ? (
              <>Reset your <span className="text-gradient-pink-violet font-light">password</span></>
            ) : (
              <>Enter the <span className="text-gradient-pink-violet font-light">{OTP_LENGTH}-digit code</span></>
            )}
          </h1>

          {step === "email" ? (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <p className="text-[14px] leading-[1.6] text-muted-foreground">
                Enter your email and we'll send you a {OTP_LENGTH}-digit code to reset your password.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  autoComplete="email"
                  placeholder="you@example.com"
                  maxLength={255}
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
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</>
                ) : (
                  "Send code"
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  to="/auth"
                  search={{ mode: "signin" }}
                  className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </p>
            </form>
          ) : (
            <div className="mt-6">
              <p className="text-[14px] leading-[1.6] text-muted-foreground">
                We sent a code to <span className="font-medium text-foreground">{email}</span>. Enter
                it below to choose a new password.
              </p>

              <div className="mt-6 flex justify-center">
                <InputOTP
                  maxLength={OTP_LENGTH}
                  value={code}
                  onChange={(v) => {
                    const digits = v.replace(/\D/g, "").slice(0, OTP_LENGTH);
                    setCode(digits);
                    setOtpError(null);
                    if (digits.length === OTP_LENGTH && !autoSubmitted.current) {
                      autoSubmitted.current = true;
                      void handleVerify(digits);
                    }
                  }}
                  disabled={verifying}
                  inputMode="numeric"
                  autoFocus
                  aria-label={`${OTP_LENGTH}-digit verification code`}
                >
                  <InputOTPGroup>
                    {OTP_SLOTS.map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {verifying && (
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
                  onClick={handleResend}
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
                    setStep("email");
                    setCode("");
                    setOtpError(null);
                    setResendMsg(null);
                    autoSubmitted.current = false;
                  }}
                  className="text-muted-foreground hover:text-foreground hover:underline"
                >
                  Use a different email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
