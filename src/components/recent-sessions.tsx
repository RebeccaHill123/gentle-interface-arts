import { useMemo } from "react";
import { BookOpen, Clock, Flame, Smile, Target, Trophy, Zap } from "lucide-react";
import type { StudySession } from "@/lib/plan-store";

type SessionType = NonNullable<StudySession["sessionType"]>;

const TYPE_META: Record<SessionType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  study: { label: "Study", icon: BookOpen },
  quiz: { label: "Quiz", icon: Target },
  mock: { label: "Mock", icon: Trophy },
  review: { label: "Review", icon: Zap },
  flashcards: { label: "Flashcards", icon: Flame },
};

function inferType(s: StudySession): SessionType {
  if (s.sessionType) return s.sessionType;
  const note = (s.note ?? "").toLowerCase();
  if (note.includes("mini-assessment") || note.includes("quiz")) return "quiz";
  if (note.includes("mock")) return "mock";
  if (note.includes("flashcard")) return "flashcards";
  if (note.includes("review")) return "review";
  return "study";
}

function parseAccuracy(note?: string): number | null {
  if (!note) return null;
  const m = note.match(/(\d{1,3})\s*%/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const MOOD_EMOJI: Record<number, string> = { 1: "😞", 2: "😕", 3: "😐", 4: "🙂", 5: "🤩" };

export function RecentSessions({ sessions }: { sessions: StudySession[] | undefined }) {
  const items = useMemo(() => {
    const list = (sessions ?? [])
      .slice()
      .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
      .slice(0, 8);
    return list;
  }, [sessions]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-background/40 p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-soft">
          <Flame className="h-5 w-5 text-pink" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">No sessions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Log your first study session to start your feed.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((s, i) => {
        const type = inferType(s);
        const meta = TYPE_META[type];
        const Icon = meta.icon;
        const accuracy = parseAccuracy(s.note);
        const focusPct =
          typeof s.focus === "number"
            ? Math.round(Math.max(0, Math.min(1, s.focus)) * 100)
            : accuracy;
        const mood = s.mood;

        return (
          <li
            key={`${s.loggedAt}-${i}`}
            className="group relative overflow-hidden rounded-2xl border border-border bg-background/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-pink/40 hover:bg-card hover:shadow-glow"
          >
            {/* gradient accent bar */}
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-pink-blue opacity-70 transition-opacity group-hover:opacity-100" />
            {/* subtle hover wash */}
            <span className="pointer-events-none absolute inset-0 bg-gradient-soft opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            <div className="relative flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground shadow-glow transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-3deg]">
                <Icon className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {s.module ?? "General study"}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded-full bg-card px-2 py-0.5 font-semibold uppercase tracking-wider text-pink">
                        {meta.label}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {s.minutes}m
                      </span>
                      <span aria-hidden>·</span>
                      <span>{relativeTime(s.loggedAt)}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {typeof mood === "number" && (
                      <span
                        title={`Mood ${mood}/5`}
                        className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs"
                      >
                        <Smile className="h-3 w-3 text-cyan" />
                        <span>{MOOD_EMOJI[mood] ?? "🙂"}</span>
                      </span>
                    )}
                    {focusPct !== null && (
                      <span
                        title="Focus / accuracy"
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-pink-blue/15 px-2 py-0.5 text-[11px] font-semibold text-pink"
                      >
                        <Target className="h-3 w-3" />
                        {focusPct}%
                      </span>
                    )}
                  </div>
                </div>

                {s.note && (
                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                    {s.note}
                  </p>
                )}

                {focusPct !== null && (
                  <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-pink-blue transition-all duration-500 group-hover:brightness-110"
                      style={{ width: `${focusPct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
