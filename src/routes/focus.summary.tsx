import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { ArrowLeft, Flame, Play, ListChecks, LayoutDashboard, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackgroundBlobs } from "@/components/background-blobs";
import { BrandMark } from "@/components/brand-mark";
import { Confetti } from "@/components/confetti";
import { waitForAuthUser } from "@/lib/auth-session";

const LAST_SUMMARY_KEY = "tentra.focus.lastSummary.v1";

interface FocusSummary {
  focusMin: number;
  blocksToday: number;
  module?: string;
  topic?: string;
  endedEarly: boolean;
  finishedAt: number;
}

export const Route = createFileRoute("/focus/summary")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: FocusSummaryPage,
  head: () => ({
    meta: [
      { title: "Session summary · Tentra" },
      { name: "description", content: "Your focus session summary." },
    ],
  }),
});

function FocusSummaryPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<FocusSummary | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_SUMMARY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FocusSummary;
        setSummary(parsed);
        if (!parsed.endedEarly) setConfettiKey(1);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const minutes = summary?.focusMin ?? 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />
      <Confetti fire={confettiKey} />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-6">
        <header className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/focus" })}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Focus
          </Button>
          <BrandMark withWordmark={false} />
        </header>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="relative">
            <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-pink-blue opacity-30 blur-3xl" />
            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-pink-blue shadow-glow">
              <Flame className="h-9 w-9 text-primary-foreground" />
            </div>
          </div>
          <div className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-pink">
            {summary?.endedEarly ? "Session ended" : "Sprint complete"}
          </div>
          <h1 className="mt-2 text-4xl font-light tracking-tight text-foreground md:text-5xl">
            {summary?.endedEarly ? (
              <>Logged your work.</>
            ) : (
              <>
                Nice <span className="italic text-gradient-tentra">work</span>.
              </>
            )}
          </h1>
          {summary && (
            <p className="mt-3 max-w-md text-sm text-muted-foreground">
              {minutes > 0
                ? `${minutes} minute${minutes === 1 ? "" : "s"} of deep work`
                : "Sprint ended early."}
              {summary.module ? ` · ${summary.module}` : ""}
              {summary.topic ? ` · ${summary.topic}` : ""}
            </p>
          )}

          <div className="mt-8 grid w-full max-w-md grid-cols-2 gap-3">
            <StatCard label="Minutes" value={minutes} />
            <StatCard label="Today's blocks" value={summary?.blocksToday ?? 0} />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => navigate({ to: "/focus" })}
              size="lg"
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
            >
              <Play className="mr-1.5 h-4 w-4" /> Start another sprint
            </Button>
            <Button
              onClick={() => navigate({ to: "/focus" })}
              size="lg"
              variant="outline"
              className="rounded-full"
            >
              <ListChecks className="mr-1.5 h-4 w-4" /> View sessions
            </Button>
            <Button
              onClick={() => navigate({ to: "/dashboard" })}
              size="lg"
              variant="ghost"
              className="rounded-full text-muted-foreground"
            >
              <LayoutDashboard className="mr-1.5 h-4 w-4" /> Dashboard
            </Button>
          </div>

          <button
            onClick={() => navigate({ to: "/coach" })}
            className="mt-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <Sparkles className="h-3 w-3 text-pink" /> Ask Tentra Coach what to do next
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-4xl text-gradient-tentra">{value}</div>
    </div>
  );
}
