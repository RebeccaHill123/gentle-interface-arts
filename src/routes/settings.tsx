import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut, Sparkles, Trash2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { waitForAuthUser } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/use-auth";
import { clearPlan } from "@/lib/plan-store";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings · Tentra" },
      { name: "description", content: "Manage your Tentra account." },
    ],
  }),
});

function SettingsPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ email: string; name: string } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name, email")
        .eq("user_id", user.id)
        .maybeSingle();
      const name =
        data?.display_name ||
        [data?.first_name, data?.last_name].filter(Boolean).join(" ") ||
        user.email?.split("@")[0] ||
        "";
      setProfile({ email: data?.email || user.email || "", name });
    })();
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out");
      navigate({ to: "/" });
    } catch {
      toast.error("Could not sign out");
    } finally {
      setSigningOut(false);
    }
  };

  const handleReplan = () => {
    if (!confirm("This will clear your current study plan. Continue?")) return;
    setResetting(true);
    clearPlan();
    setTimeout(() => {
      navigate({ to: "/onboarding" });
    }, 200);
  };

  return (
    <AppShell title="Settings" subtitle="Manage your account and study plan.">
      <div className="space-y-6">
        <Card title="Account">
          {profile ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {profile.name || "Tentra user"}
                </div>
                <div className="text-xs text-muted-foreground">{profile.email}</div>
              </div>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-gradient-pink-blue text-lg font-semibold text-primary-foreground">
                {(profile.name[0] || profile.email[0] || "?").toUpperCase()}
              </div>
            </div>
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </Card>

        <Card title="Subscription">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Tentra Pro</div>
              <div className="text-xs text-muted-foreground">
                Mock exams, AI insights & smart re-planning.
              </div>
            </div>
            <Button
              onClick={() => navigate({ to: "/pro" })}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
            >
              <Sparkles className="mr-1.5 h-4 w-4" /> Manage Pro
            </Button>
          </div>
        </Card>

        <Card title="Study plan">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">Reset & re-plan</div>
              <div className="text-xs text-muted-foreground">
                Generate a new study plan from your current modules.
              </div>
            </div>
            <Button
              onClick={handleReplan}
              variant="outline"
              disabled={resetting}
              className="rounded-full"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {resetting ? "Resetting…" : "Re-plan"}
            </Button>
          </div>
        </Card>

        <Card title="Sign out">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-foreground">End your session</div>
              <div className="text-xs text-muted-foreground">
                You'll need to sign in again to access your dashboard.
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="outline"
              disabled={signingOut}
              className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="mr-1.5 h-4 w-4" />
              {signingOut ? "Signing out…" : "Log out"}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
