// Completion flow for a study session.
//
// A completion is only worth something if it produces evidence, so this sheet
// captures: real minutes worked, whether the planned output actually exists,
// and (optionally) a self-rated focus score. Correctness never comes from here
// — graded evidence only ever comes from questions, so we route the student to
// a quick check instead of asking them to grade themselves.
import { useState } from "react";
import { Check, Clock3, ListChecks, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface SessionCompletionResult {
  actualMinutes: number;
  producedOutput: boolean;
  selfFocus: number | null;
  wantsQuickCheck: boolean;
}

const FOCUS_OPTIONS = [
  { value: 0.3, label: "Scattered" },
  { value: 0.6, label: "OK" },
  { value: 0.9, label: "Locked in" },
];

export function SessionCompleteSheet({
  open,
  title,
  subtitle,
  suggestedMinutes,
  expectedOutput,
  canQuickCheck,
  saving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  suggestedMinutes: number;
  expectedOutput?: string;
  canQuickCheck?: boolean;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (result: SessionCompletionResult) => void;
}) {
  const [minutes, setMinutes] = useState(suggestedMinutes);
  const [producedOutput, setProducedOutput] = useState(true);
  const [selfFocus, setSelfFocus] = useState<number | null>(null);

  const options = Array.from(
    new Set([
      Math.max(5, Math.round(suggestedMinutes / 2)),
      suggestedMinutes,
      suggestedMinutes + 15,
    ]),
  ).sort((a, b) => a - b);

  const submit = (wantsQuickCheck: boolean) =>
    onConfirm({ actualMinutes: minutes, producedOutput, selfFocus, wantsQuickCheck });

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onCancel()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle className="text-lg">Log this session</SheetTitle>
        </SheetHeader>

        <div className="mt-1 space-y-5 pb-6">
          <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" /> How long did you actually work?
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {options.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMinutes(m)}
                  className={`min-h-11 rounded-full border px-4 text-[13px] font-medium transition-colors ${
                    minutes === m
                      ? "border-pink/60 bg-pink/10 text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" /> Did you finish the output?
            </div>
            {expectedOutput && (
              <p className="mt-1 text-[12px] text-muted-foreground/90">{expectedOutput}</p>
            )}
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { v: true, label: "Yes, done" },
                { v: false, label: "Partly" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  onClick={() => setProducedOutput(o.v)}
                  className={`min-h-11 rounded-xl border px-3 text-[13px] font-medium transition-colors ${
                    producedOutput === o.v
                      ? "border-pink/60 bg-pink/10 text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground">
              Focus quality (optional — never counted as a score)
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {FOCUS_OPTIONS.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setSelfFocus(selfFocus === o.value ? null : o.value)}
                  className={`min-h-11 rounded-full border px-4 text-[13px] transition-colors ${
                    selfFocus === o.value
                      ? "border-violet/60 bg-violet/10 text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => submit(false)}
              disabled={saving}
              size="lg"
              className="min-h-12 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:brightness-[1.06]"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Save and mark complete
            </Button>
            {canQuickCheck && (
              <Button
                onClick={() => submit(true)}
                disabled={saving}
                variant="outline"
                size="lg"
                className="min-h-12 w-full rounded-full"
              >
                Save, then 5-question check
              </Button>
            )}
            <p className="text-center text-[11px] text-muted-foreground">
              Accuracy only ever comes from answered questions, never from this form.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
