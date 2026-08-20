// Skip and reschedule as real product actions.
//
// Skipping asks why, because the reason changes what the engine does next.
// Rescheduling offers only days that genuinely have capacity, so the plan can
// never become a fantasy timetable.
import { CalendarClock, SkipForward } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SKIP_REASONS } from "@/lib/plan/task-presentation";
import type { SkipReason } from "@/lib/plan/types";

export function SkipReasonSheet({
  open,
  taskTitle,
  onCancel,
  onSkip,
}: {
  open: boolean;
  taskTitle?: string;
  onCancel: () => void;
  onSkip: (reason: SkipReason) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onCancel()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <SkipForward className="h-4 w-4 text-pink" /> Skip this session
          </SheetTitle>
        </SheetHeader>
        {taskTitle && <p className="mt-1 text-xs text-muted-foreground">{taskTitle}</p>}
        <div className="mt-4 space-y-2 pb-6">
          {SKIP_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSkip(r.id)}
              className="w-full min-h-12 rounded-2xl border border-border/60 bg-background px-4 py-3 text-left transition-colors hover:border-pink/40"
            >
              <div className="text-[13.5px] font-medium text-foreground">{r.label}</div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">{r.effect}</div>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export interface CapacityDay {
  date: string;
  usedMinutes: number;
  freeMinutes: number;
}

export function RescheduleSheet({
  open,
  taskTitle,
  taskMinutes,
  days,
  today,
  onCancel,
  onPick,
}: {
  open: boolean;
  taskTitle?: string;
  taskMinutes: number;
  days: CapacityDay[];
  today: string;
  onCancel: () => void;
  onPick: (date: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onCancel()}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <CalendarClock className="h-4 w-4 text-pink" /> Move this session
          </SheetTitle>
        </SheetHeader>
        {taskTitle && <p className="mt-1 text-xs text-muted-foreground">{taskTitle}</p>}
        <div className="mt-4 space-y-2 pb-6">
          {days
            .filter((d) => d.date !== today)
            .map((d) => {
              const fits = d.freeMinutes >= taskMinutes;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={!fits}
                  onClick={() => onPick(d.date)}
                  className={`grid w-full min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    fits
                      ? "border-border/60 bg-background hover:border-pink/40"
                      : "border-border/40 bg-muted/20 opacity-60"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium text-foreground">
                      {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {d.usedMinutes === 0
                        ? "Nothing scheduled"
                        : `${d.usedMinutes} min already planned`}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] text-muted-foreground">
                    {fits ? `${d.freeMinutes} min free` : "Full"}
                  </span>
                </button>
              );
            })}
          <p className="pt-1 text-[11px] text-muted-foreground">
            Days marked full already hold as much study as is realistic.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
