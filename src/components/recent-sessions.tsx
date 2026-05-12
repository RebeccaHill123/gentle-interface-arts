import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Clock,
  Flame,
  MoreHorizontal,
  Pencil,
  Smile,
  Target,
  Trash2,
  Trophy,
  Zap,
} from "lucide-react";
import {
  removeStudySession,
  updateStudySession,
  type StudySession,
} from "@/lib/plan-store";
import { ActivityInsights } from "@/components/activity-insights";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type SessionType = NonNullable<StudySession["sessionType"]>;

const TYPE_META: Record<SessionType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  study: { label: "Study", icon: BookOpen },
  focus: { label: "Focus", icon: Zap },
  quiz: { label: "Quiz", icon: Target },
  mock: { label: "Mock", icon: Trophy },
  review: { label: "Review", icon: Zap },
  flashcards: { label: "Flashcards", icon: Flame },
};

const TYPE_ORDER: SessionType[] = ["study", "focus", "quiz", "mock", "review", "flashcards"];

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

export function RecentSessions({
  sessions,
  moduleNames,
  onChange,
  showInsights = true,
  limit = 10,
}: {
  sessions: StudySession[] | undefined;
  moduleNames?: string[];
  onChange?: () => void;
  showInsights?: boolean;
  limit?: number;
}) {
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [deleting, setDeleting] = useState<StudySession | null>(null);

  const items = useMemo(() => {
    return (sessions ?? [])
      .slice()
      .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime())
      .slice(0, limit);
  }, [sessions, limit]);

  const handleDelete = (s: StudySession) => {
    removeStudySession(s.loggedAt);
    toast.success("Session deleted");
    setDeleting(null);
    onChange?.();
  };

  return (
    <div>
      {showInsights && <ActivityInsights sessions={sessions} />}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/40 p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-soft">
            <Flame className="h-5 w-5 text-pink" />
          </div>
          <p className="mt-3 text-sm font-medium text-foreground">No sessions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Log your first study session to start your feed.
          </p>
        </div>
      ) : (
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
                <span className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-pink-blue opacity-70 transition-opacity group-hover:opacity-100" />
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

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label="Session options"
                              className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setEditing(s)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleting(s)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
      )}

      <EditSessionDialog
        session={editing}
        moduleNames={moduleNames ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          onChange?.();
        }}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry from your activity feed. Streaks and totals
              will update accordingly. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && handleDelete(deleting)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditSessionDialog({
  session,
  moduleNames,
  onClose,
  onSaved,
}: {
  session: StudySession | null;
  moduleNames: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [minutes, setMinutes] = useState<number>(0);
  const [module, setModule] = useState<string>("");
  const [type, setType] = useState<SessionType>("study");
  const [mood, setMood] = useState<number | undefined>(undefined);
  const [note, setNote] = useState<string>("");

  // Reset state whenever a new session opens
  useEffect(() => {
    if (session) {
      setMinutes(session.minutes);
      setModule(session.module ?? "");
      setType(inferType(session));
      setMood(session.mood);
      setNote(session.note ?? "");
    }
  }, [session]);

  if (!session) return null;

  const handleSave = () => {
    const mins = Math.max(1, Math.min(600, Math.round(minutes || 0)));
    updateStudySession(session.loggedAt, {
      minutes: mins,
      module: module || undefined,
      sessionType: type,
      mood: mood as StudySession["mood"],
      note: note.trim() || undefined,
    });
    toast.success("Session updated");
    onSaved();
  };

  return (
    <Dialog open={!!session} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit session</DialogTitle>
          <DialogDescription>
            Tweak details for the session logged{" "}
            {new Date(session.loggedAt).toLocaleString()}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-minutes">Duration (min)</Label>
              <Input
                id="edit-minutes"
                type="number"
                min={1}
                max={600}
                value={minutes}
                onChange={(e) => setMinutes(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as SessionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_META[t].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Module</Label>
            {moduleNames.length > 0 ? (
              <Select
                value={module || "__none"}
                onValueChange={(v) => setModule(v === "__none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">General study</SelectItem>
                  {moduleNames.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={module} onChange={(e) => setModule(e.target.value)} />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Mood</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(mood === m ? undefined : (m as 1 | 2 | 3 | 4 | 5))}
                  className={`grid h-10 w-10 place-items-center rounded-xl border text-lg transition-all ${
                    mood === m
                      ? "border-pink/60 bg-gradient-pink-blue/15 scale-105"
                      : "border-border bg-background/40 hover:border-pink/40"
                  }`}
                  aria-label={`Mood ${m}`}
                >
                  {MOOD_EMOJI[m]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-note">Note</Label>
            <Textarea
              id="edit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What did you focus on?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
