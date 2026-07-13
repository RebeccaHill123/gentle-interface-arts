import { useEffect, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { CreditCard, ExternalLink, LogOut, Sparkles, Trash2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { waitForAuthUser } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/use-auth";
import { clearOnboardingDraft, clearPlan } from "@/lib/plan-store";
import { useSubscription } from "@/hooks/useSubscription";
import { createBillingPortalSession } from "@/lib/pro.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin", from: undefined, next: undefined } });
  },
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Account settings — manage your Tentra profile" },
      {
        name: "description",
        content: "Manage your Tentra account, subscription and study data.",
      },
      { property: "og:title", content: "Account settings | Tentra" },
      { property: "og:description", content: "Manage your Tentra account and subscription." },
      { property: "og:url", content: "https://tentraapp.com/settings" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/settings" }],
  }),
});

function SettingsPage() {
  const navigate = useNavigate();
  const sub = useSubscription();
  const [profile, setProfile] = useState<{ email: string; name: string } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

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
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Could not sign out");
    } finally {
      setSigningOut(false);
    }
  };

  const handleReplan = async () => {
    if (!confirm("This will clear your current study plan. Continue?")) return;
    setResetting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from("user_plans")
          .delete()
          .eq("user_id", user.id);
        if (error) throw error;
      }
      clearPlan();
      clearOnboardingDraft();
      toast.success("Plan cleared — let's rebuild it");
      navigate({ to: "/onboarding", replace: true });
    } catch (e) {
      console.error(e);
      toast.error("Could not reset plan. Please try again.");
      setResetting(false);
    }
  };

  const openBillingPortal = async () => {
    setOpeningPortal(true);
    try {
      const result = await createBillingPortalSession({
        data: {
          returnUrl: `${window.location.origin}/settings`,
          environment: getStripeEnvironment(),
        },
      });
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setOpeningPortal(false);
    }
  };

  const planLabel =
    sub.plan === "pro_monthly"
      ? "Monthly — £16.99 / month"
      : sub.plan === "pro_six_month"
        ? "6 months — £72.99"
        : null;
  const renewalLabel = sub.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <AppShell title="Settings" subtitle="Manage your account and subscription.">
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
          {sub.loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : sub.isGrandfathered ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Sparkles className="h-4 w-4 text-pink" />
                  Founding member
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Lifetime access — on us, forever. Thanks for being here early.
                </div>
              </div>
            </div>
          ) : sub.isSubscriber ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {planLabel ?? "Tentra"}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {sub.cancelAtPeriodEnd && renewalLabel
                    ? `Cancels on ${renewalLabel}`
                    : renewalLabel
                      ? `Renews ${renewalLabel}`
                      : "Active"}
                </div>
              </div>
              <Button
                onClick={openBillingPortal}
                disabled={openingPortal}
                variant="outline"
                className="rounded-full"
              >
                {openingPortal ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="mr-1.5 h-4 w-4" />
                )}
                Manage billing
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">No active subscription</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  Subscribe to unlock your personalised study plan.
                </div>
              </div>
              <Button
                onClick={() => navigate({ to: "/subscribe", search: { next: undefined } })}
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                <CreditCard className="mr-1.5 h-4 w-4" /> Choose a plan
              </Button>
            </div>
          )}
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
