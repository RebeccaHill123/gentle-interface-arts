import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FocusLauncher } from "@/components/focus-launcher";
import { FocusInsights } from "@/components/focus-insights";
import { waitForAuthUser } from "@/lib/auth-session";
import { loadPlan, pullPlanFromCloud, type StoredPlan } from "@/lib/plan-store";

export const Route = createFileRoute("/focus")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: FocusLauncherPage,
  head: () => ({
    meta: [
      { title: "Focus Mode · Tentra" },
      { name: "description", content: "Distraction-free deep work, the Tentra way." },
    ],
  }),
});

function FocusLauncherPage() {
  const [stored, setStored] = useState<StoredPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const cloud = await pullPlanFromCloud();
      if (!active) return;
      setStored(cloud ?? loadPlan());
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const moduleNames = stored?.input.modules.map((m) => m.name) ?? [];

  return (
    <AppShell
      title="Focus Mode"
      subtitle="Distraction-free deep work, the Tentra way."
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          <FocusLauncher moduleNames={moduleNames} />
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-xl font-semibold text-foreground">Focus insights</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Your deep work rhythm — when you focus best and how it's trending.
            </p>
            <div className="mt-4">
              <FocusInsights sessions={stored?.sessions ?? []} />
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}
