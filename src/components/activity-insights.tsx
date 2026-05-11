import { useMemo } from "react";
import { Flame, TrendingUp, Trophy, Sparkles, Target, Clock } from "lucide-react";
import { computeStreak, type StudySession } from "@/lib/plan-store";

interface Insight {
  id: string;
  emoji: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  detail: string;
  tone: "pink" | "cyan" | "violet";
}

function parseAccuracy(note?: string): number | null {
  if (!note) return null;
  const m = note.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

function startOfWeek(d: Date): Date {
  const day = d.getDay(); // 0 = Sun
  const diff = (day + 6) % 7; // make Monday start
  const out = new Date(d);
  out.setDate(d.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

const TONE_STYLES: Record<Insight["tone"], string> = {
  pink: "from-pink/20 to-pink/5 border-pink/40 text-pink",
  cyan: "from-cyan/20 to-cyan/5 border-cyan/40 text-cyan",
  violet: "from-violet/20 to-violet/5 border-violet/40 text-foreground",
};

export function ActivityInsights({
  sessions,
}: {
  sessions: StudySession[] | undefined;
}) {
  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    const all = sessions ?? [];
    if (all.length === 0) return list;

    const streak = computeStreak(all);
    const now = new Date();
    const weekStart = startOfWeek(now);

    // Streak insight
    if (streak.current >= 1) {
      list.push({
        id: "streak",
        emoji: "🔥",
        icon: Flame,
        title: `${streak.current}-day streak ${streak.studiedToday ? "maintained" : "alive"}`,
        detail: streak.studiedToday
          ? "Logged today — momentum locked in."
          : "Log a session today to keep it going.",
        tone: "pink",
      });
    }

    // Most productive day this week
    const weekly = all.filter((s) => new Date(s.loggedAt) >= weekStart);
    if (weekly.length > 0) {
      const minutesByDay = new Map<string, number>();
      weekly.forEach((s) => {
        minutesByDay.set(s.date, (minutesByDay.get(s.date) ?? 0) + s.minutes);
      });
      let topDay = "";
      let topMins = 0;
      minutesByDay.forEach((mins, day) => {
        if (mins > topMins) {
          topMins = mins;
          topDay = day;
        }
      });
      if (topDay) {
        const dayLabel = new Date(topDay).toLocaleDateString(undefined, {
          weekday: "long",
        });
        const isToday = topDay === now.toISOString().slice(0, 10);
        list.push({
          id: "top-day",
          emoji: "🏆",
          icon: Trophy,
          title: isToday
            ? "Most productive day this week"
            : `${dayLabel} was your best day this week`,
          detail: `${topMins} minutes logged${isToday ? " — and it's still today." : "."}`,
          tone: "violet",
        });
      }

      const weekTotal = weekly.reduce((acc, s) => acc + s.minutes, 0);
      list.push({
        id: "week-total",
        emoji: "⏱️",
        icon: Clock,
        title: `${weekTotal} minutes this week`,
        detail: `${weekly.length} session${weekly.length === 1 ? "" : "s"} logged so far.`,
        tone: "cyan",
      });
    }

    // Confidence improving in weaker topics — compare quiz accuracy trend per module
    const quizByModule = new Map<string, { ts: number; acc: number }[]>();
    all.forEach((s) => {
      const acc = parseAccuracy(s.note);
      if (acc === null || !s.module) return;
      const arr = quizByModule.get(s.module) ?? [];
      arr.push({ ts: new Date(s.loggedAt).getTime(), acc });
      quizByModule.set(s.module, arr);
    });
    let bestImprover: { module: string; delta: number; latest: number } | null = null;
    quizByModule.forEach((arr, mod) => {
      if (arr.length < 2) return;
      arr.sort((a, b) => a.ts - b.ts);
      const half = Math.floor(arr.length / 2);
      const earlyAvg =
        arr.slice(0, half || 1).reduce((a, b) => a + b.acc, 0) / (half || 1);
      const lateArr = arr.slice(-Math.max(1, half));
      const lateAvg = lateArr.reduce((a, b) => a + b.acc, 0) / lateArr.length;
      const delta = lateAvg - earlyAvg;
      if (delta > 5 && (!bestImprover || delta > bestImprover.delta)) {
        bestImprover = { module: mod, delta, latest: lateAvg };
      }
    });
    if (bestImprover) {
      const imp = bestImprover as { module: string; delta: number; latest: number };
      list.push({
        id: "confidence",
        emoji: "📈",
        icon: TrendingUp,
        title: `Confidence climbing in ${imp.module}`,
        detail: `Up ${Math.round(imp.delta)} pts — now averaging ${Math.round(imp.latest)}% on quizzes.`,
        tone: "cyan",
      });
    }

    // Longest streak personal best
    if (streak.longest >= 3 && streak.current === streak.longest) {
      list.push({
        id: "pb",
        emoji: "✨",
        icon: Sparkles,
        title: "New personal best streak",
        detail: `You've never strung this many days together. Keep going.`,
        tone: "pink",
      });
    }

    // Total focus across all time as a milestone nudge
    const totalMinutes = all.reduce((a, s) => a + s.minutes, 0);
    const milestones = [60, 180, 600, 1200, 3000];
    const reached = milestones.filter((m) => totalMinutes >= m).pop();
    if (reached && totalMinutes - reached < 60) {
      list.push({
        id: "milestone",
        emoji: "🎯",
        icon: Target,
        title: `${reached}+ minutes of focused study`,
        detail: "Small sessions, big compounding. Stay on it.",
        tone: "violet",
      });
    }

    return list.slice(0, 4);
  }, [sessions]);

  if (insights.length === 0) return null;

  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      {insights.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.id}
            className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow ${TONE_STYLES[it.tone]}`}
          >
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card text-lg shadow-sm">
                <span aria-hidden>{it.emoji}</span>
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  <Icon className="h-3 w-3" />
                  Momentum
                </div>
                <div className="mt-0.5 text-sm font-semibold text-foreground">
                  {it.title}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{it.detail}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
