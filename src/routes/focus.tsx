import { useEffect, useState } from "react";
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { CalendarRange, Flame, Loader2, Sparkles, Tag, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { FocusLauncher } from "@/components/focus-launcher";
import { FocusInsights } from "@/components/focus-insights";
import { ActivityInsights } from "@/components/activity-insights";
import { RecentSessions } from "@/components/recent-sessions";
import { waitForAuthUser } from "@/lib/auth-session";
import { loadPlan, pullPlanFromCloud, type StoredPlan } from "@/lib/plan-store";

export const Route = createFileRoute("/focus")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: FocusRouteComponent,
  head: () => ({
    meta: [
      { title: "Focus · Tentra" },
      {
        name: "description",
        content: "The place where studying happens — sprints, momentum and your session history.",
      },
    ],
  }),
});

function FocusRouteComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/focus") return <Outlet />;
  return <FocusLauncherPage />;
}

function FocusLauncherPage() {
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

  const moduleNames = stored?.input.modules.map((m) => m.name) ?? [];
  const sessions = stored?.sessions ?? [];

  return (
    <AppShell title="Focus" subtitle="The place where studying happens.">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* 1 — Sprint launcher */}
          <section>
            <SectionHeader
              eyebrow="Start a session"
              title="Focus sprint"
              description="Pick a preset, set a subject, and go deep."
            />
            <div className="mt-4">
              <FocusLauncher moduleNames={moduleNames} />
            </div>
          </section>

          {/* 2 — Momentum & consistency */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <SectionHeader
              eyebrow="Momentum"
              title="Consistency & rhythm"
              description="Streaks, weekly minutes and how your focus is trending."
              icon={TrendingUp}
            />
            <div className="mt-5 space-y-6">
              <ActivityInsights sessions={sessions} />
              <div className="border-t border-border pt-6">
                <FocusInsights sessions={sessions} />
              </div>
            </div>
          </section>

          {/* 3 — Recent sessions */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
            <SectionHeader
              eyebrow="History"
              title="Recent sessions"
              description="Every minute you've put in — edit, review or remove entries."
              icon={Flame}
            />
            <div className="mt-5">
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-background/40 p-10 text-center text-sm text-muted-foreground">
                  No sessions logged yet. Start a sprint above to begin your feed.
                </div>
              ) : (
                <RecentSessions
                  sessions={sessions}
                  moduleNames={moduleNames}
                  onChange={() => setTick((t) => t + 1)}
                  showInsights={false}
                  limit={10}
                />
              )}
            </div>
          </section>

          {/* 4 — Future expansion */}
          <section className="rounded-3xl border border-dashed border-border bg-background/40 p-6">
            <SectionHeader
              eyebrow="Coming soon"
              title="More ways to understand your focus"
              description="We're expanding this space with richer views of how you study."
              icon={Sparkles}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FuturePill icon={CalendarRange} label="Study heatmap" />
              <FuturePill icon={TrendingUp} label="Productivity trends" />
              <FuturePill icon={CalendarRange} label="Calendar view" />
              <FuturePill icon={Tag} label="Session tagging" />
              <FuturePill icon={Sparkles} label="Focus quality scoring" />
              <FuturePill icon={Flame} label="Personal records" />
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-2xl bg-gradient-pink-blue/15 text-pink">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-pink">
          {eyebrow}
        </div>
        <h2 className="mt-0.5 text-xl font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

function FuturePill({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-background/40 px-4 py-3 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-pink" />
      <span className="font-medium text-foreground/80">{label}</span>
      <span className="ml-auto rounded-full bg-card px-2 py-0.5 text-[10px] uppercase tracking-wider">
        Soon
      </span>
    </div>
  );
}
