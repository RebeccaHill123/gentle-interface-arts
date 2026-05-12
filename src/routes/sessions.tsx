import { useEffect, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { RecentSessions } from "@/components/recent-sessions";
import { waitForAuthUser } from "@/lib/auth-session";
import { loadPlan, pullPlanFromCloud, type StoredPlan } from "@/lib/plan-store";

export const Route = createFileRoute("/sessions")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: SessionsPage,
  head: () => ({
    meta: [
      { title: "Study sessions · Tentra" },
      { name: "description", content: "Your full study session history." },
    ],
  }),
});

function SessionsPage() {
  const [stored, setStored] = useState<StoredPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

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

  useEffect(() => {
    if (tick === 0) return;
    setStored(loadPlan());
  }, [tick]);

  return (
    <AppShell title="Sessions" subtitle="Every minute you've put in.">
      <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : stored ? (
          <RecentSessions
            sessions={stored.sessions}
            moduleNames={stored.input.modules.map((m) => m.name)}
            onChange={() => setTick((t) => t + 1)}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-background/40 p-10 text-center text-sm text-muted-foreground">
            No sessions logged yet. Start one from the dashboard.
          </div>
        )}
      </section>
    </AppShell>
  );
}
