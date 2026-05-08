import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { pullPlanFromCloud } from "@/lib/plan-store";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in · Tentra" },
      {
        name: "description",
        content: "Sign in to your Tentra account to continue your SQE plan.",
      },
    ],
  }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        if (error.message.toLowerCase().includes("invalid")) {
          toast.error("Wrong email or password.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Welcome back.");
      // If the user has no plan yet, send them through onboarding
      const existing = loadPlan();
      navigate({ to: existing ? "/dashboard" : "/onboarding" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
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
          to="/signup"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Create account
        </Link>
      </div>

      <div className="relative mx-auto flex max-w-md flex-col px-6 py-10">
        <div className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur md:p-10">
          <div className="text-xs font-semibold uppercase tracking-wider text-pink">
            Welcome back
          </div>
          <h1 className="mt-2 text-3xl font-normal text-foreground md:text-4xl">
            Sign in to{" "}
            <span className="italic text-gradient-tentra">Tentra</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick up exactly where you left off.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
                required
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Tentra?{" "}
            <Link
              to="/signup"
              className="font-medium text-foreground hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
