import { useMemo } from "react";
import { Clock, Flame, Sparkles, Sun, TrendingUp, Zap } from "lucide-react";
import { computeFocusInsights } from "@/lib/focus-store";
import type { StudySession } from "@/lib/plan-store";

export function FocusInsights({ sessions }: { sessions: StudySession[] | undefined }) {
  const ins = useMemo(() => computeFocusInsights(sessions), [sessions]);

  const trendMax = Math.max(1, ...ins.trend);
  const dayLabels = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString(undefined, { weekday: "narrow" });
    });
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          icon={Clock}
          label="Deep work this week"
          value={`${ins.totalFocusMinThisWeek}m`}
          sub={`${ins.completedBlocksThisWeek} block${ins.completedBlocksThisWeek === 1 ? "" : "s"}`}
        />
        <Metric
          icon={Flame}
          label="Longest streak"
          value={ins.longestStreakBlocks > 0 ? `${ins.longestStreakBlocks}` : "—"}
          sub="back-to-back sprints"
        />
        <Metric
          icon={Sun}
          label="Best time of day"
          value={ins.bestTimeOfDay?.label ?? "—"}
          sub={ins.bestTimeOfDay ? `${ins.bestTimeOfDay.minutes}m logged` : "Log a sprint"}
        />
        <Metric
          icon={Zap}
          label="Preferred length"
          value={ins.preferredLengthMin ? `${ins.preferredLengthMin}m` : "—"}
          sub="your go-to sprint"
        />
      </div>

      <div className="rounded-2xl border border-border bg-background/40 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-pink">
              <TrendingUp className="h-3 w-3" /> Concentration trend
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Deep work minutes, last 7 days
            </p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-cyan" />
            All-time {Math.round(ins.totalAllTimeMin / 60)}h
          </div>
        </div>

        <div className="mt-4 flex h-32 items-end gap-2">
          {ins.trend.map((mins, i) => {
            const h = (mins / trendMax) * 100;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-gradient-pink-blue transition-all duration-500"
                    style={{ height: `${Math.max(h, mins > 0 ? 6 : 2)}%`, minHeight: 4 }}
                    title={`${mins} min`}
                  />
                </div>
                <div className="text-[10px] font-medium text-muted-foreground">
                  {dayLabels[i]}
                </div>
                <div className="text-[10px] text-foreground/70">{mins || ""}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-background/40 p-4 transition-all hover:-translate-y-0.5 hover:border-pink/40 hover:shadow-glow">
      <span className="pointer-events-none absolute inset-0 bg-gradient-soft opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3 text-pink" />
          {label}
        </div>
        <div className="mt-1 font-display text-2xl text-foreground">{value}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}
