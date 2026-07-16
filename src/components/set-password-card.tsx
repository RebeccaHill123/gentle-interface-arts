import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound, X, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Shown on the dashboard for users provisioned by the payment webhook
 * (user_metadata.source === "checkout") who haven't yet set a password.
 *
 * Purely additive — users can dismiss it and still sign in via Google or
 * a magic link. Setting a password just makes future sign-ins one-tap.
 */
const DISMISS_KEY = "tentra.setPasswordCard.dismissed";

export function SetPasswordCard() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY)) return;
      const { data } = await supabase.auth.getUser();
      const meta = data.user?.user_metadata ?? {};
      const provisioned = meta.source === "checkout";
      const passwordSet = meta.password_set === true;
      if (active && provisioned && !passwordSet) setVisible(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const { error: updErr } = await supabase.auth.updateUser({
        password,
        data: { password_set: true },
      });
      if (updErr) {
        setError(updErr.message);
        return;
      }
      toast.success("Password saved. You can now sign in with email + password.");
      if (typeof window !== "undefined") localStorage.setItem(DISMISS_KEY, "1");
      setVisible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-pink/25 bg-gradient-to-br from-pink/[0.06] via-transparent to-transparent p-5 backdrop-blur md:p-6">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground/70 transition hover:bg-foreground/[0.05] hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink/15 text-pink">
          <KeyRound className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium text-foreground">
            Set a password for faster sign-in
          </h3>
          <p className="mt-1 text-[13px] leading-[1.55] text-muted-foreground">
            You can always sign in with Google or a one-time email link — adding a
            password just makes future sign-ins quicker.
          </p>

          {!expanded ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => setExpanded(true)}
                className="h-9 rounded-full bg-gradient-pink-blue px-4 text-[13px] font-medium text-primary-foreground shadow-glow hover:brightness-[1.06]"
              >
                Set a password
              </Button>
              <button
                type="button"
                onClick={dismiss}
                className="text-[13px] text-muted-foreground hover:text-foreground hover:underline"
              >
                Not now
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-4 space-y-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-[12px]">
                  New password
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  placeholder="At least 8 characters"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-[12px]">
                  Confirm password
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setError(null);
                  }}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={128}
                  required
                />
              </div>
              {error && (
                <p role="alert" className="text-[12.5px] text-destructive">
                  {error}
                </p>
              )}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-9 rounded-full bg-gradient-pink-blue px-4 text-[13px] font-medium text-primary-foreground shadow-glow hover:brightness-[1.06]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Saving…
                    </>
                  ) : (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Save password
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(false);
                    setPassword("");
                    setConfirm("");
                    setError(null);
                  }}
                  className="text-[13px] text-muted-foreground hover:text-foreground hover:underline"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
