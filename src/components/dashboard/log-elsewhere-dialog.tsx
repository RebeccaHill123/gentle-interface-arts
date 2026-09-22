// "I studied this elsewhere" — record off-Tentra work without duplicating it.
//
// One canonical write per submission (idempotency key + synchronous lock), and
// when the entry is linked to a planned task the student says whether that task
// is finished or only part-done, so the plan reflects reality either way.
import { useEffect, useRef, useState } from "react";
import { Loader2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitManualSession } from "@/lib/manual-session";
import {
  makeIdempotencyKey,
  recordStudyActivity,
  localDateFor,
  type ActivityType,
} from "@/lib/study-log";
import { completeScheduledTask, creditScheduledTaskProgress } from "@/lib/plan/store";
import type { ScheduledTask } from "@/lib/plan/types";

const STUDY_TYPES: { value: ActivityType; label: string }[] = [
  { value: "study", label: "Learning / reading" },
  { value: "review", label: "Revision" },
  { value: "quiz", label: "Practice questions" },
  { value: "flashcards", label: "Flashcards" },
  { value: "mock", label: "Mock exam" },
];

export function LogElsewhereDialog({
  open,
  task,
  moduleNames,
  examPath,
  onOpenChange,
  onLogged,
}: {
  open: boolean;
  /** Set when the entry is linked to a planned task. */
  task?: ScheduledTask | null;
  moduleNames: string[];
  examPath?: string | null;
  onOpenChange: (open: boolean) => void;
  onLogged: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [date, setDate] = useState(localDateFor());
  const [studyType, setStudyType] = useState<ActivityType>("study");
  const [finished, setFinished] = useState(true);
  const [saving, setSaving] = useState(false);
  const lockRef = useRef(false);

  // Prefill each time the dialog opens, from the task when there is one.
  useEffect(() => {
    if (!open) return;
    setSubject(task?.module ?? moduleNames[0] ?? "");
    setTopic(task?.subtopic ?? task?.title ?? "");
    setMinutes(String(task?.minutes ?? 30));
    setDate(localDateFor());
    setStudyType(task?.taskType === "timed-sba" ? "quiz" : "study");
    setFinished(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const occurredAt = new Date(`${date}T12:00:00`);
    const outcome = await submitManualSession(
      { minutes, moduleName: subject, note: topic },
      {
        lock: lockRef,
        record: ({ minutes: m, moduleName: s, note }) =>
          recordStudyActivity({
            idempotencyKey: makeIdempotencyKey(
              "manual_log",
              occurredAt.getTime(),
              m,
              `${s}|${note}|${studyType}`,
            ),
            activityType: studyType,
            source: "manual_log",
            actualMinutes: m,
            occurredAt,
            subject: s || null,
            subtopic: task?.subtopic ?? null,
            plannedTaskId: task?.id ?? null,
            plannedMinutes: task?.minutes ?? null,
            examPath: examPath ?? null,
            note: note || null,
            metadata: { loggedElsewhere: true, studyType },
          }),
      },
    );
    setSaving(false);

    if (outcome.status === "busy") return;
    if (outcome.status === "invalid" || outcome.status === "error") {
      toast.error(outcome.message);
      return;
    }

    if (task && task.status === "scheduled") {
      const worked = parseInt(minutes, 10) || 0;
      try {
        if (finished) {
          await completeScheduledTask(task.id, { actualMinutes: worked });
        } else {
          await creditScheduledTaskProgress(task.id, worked);
        }
      } catch (err) {
        console.warn("planned task update after manual log failed", err);
        toast.error("Time saved, but we couldn't update the planned session.");
      }
    }

    toast.success(outcome.message);
    onOpenChange(false);
    onLogged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <NotebookPen className="h-4 w-4 text-pink" /> Log study done elsewhere
          </DialogTitle>
          <DialogDescription>
            Check the details and Tentra will count it towards today and this week — once only.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="log-subject">Subject</Label>
            {moduleNames.length > 0 ? (
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger id="log-subject" className="rounded-xl">
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([subject, ...moduleNames].filter(Boolean))].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="log-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="rounded-xl"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="log-topic">Topic</Label>
            <Input
              id="log-topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="What did you work on?"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="log-minutes">Minutes</Label>
              <Input
                id="log-minutes"
                type="number"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="log-date">Date</Label>
              <Input
                id="log-date"
                type="date"
                value={date}
                max={localDateFor()}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="log-type">Study type</Label>
            <Select value={studyType} onValueChange={(v) => setStudyType(v as ActivityType)}>
              <SelectTrigger id="log-type" className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STUDY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {task && task.status === "scheduled" && (
            <div className="space-y-1.5">
              <Label>Is the planned session finished?</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: true, label: "Yes, complete" },
                  { v: false, label: "Part-done" },
                ].map((o) => (
                  <button
                    key={String(o.v)}
                    type="button"
                    onClick={() => setFinished(o.v)}
                    className={`min-h-11 rounded-xl border px-3 text-[13px] font-medium transition-colors ${
                      finished === o.v
                        ? "border-pink/60 bg-pink/10 text-foreground"
                        : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Part-done keeps “{task.title}” open with the time already credited.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={saving}
              className="min-h-11 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save this session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
