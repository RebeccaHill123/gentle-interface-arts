import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  SQE_ASSESSMENT_QUESTION,
  SqeAssessmentPicker,
} from "@/components/sqe-assessment-picker";
import { assessmentLabel, type SqeAssessment } from "@/lib/exam-scope";
import { saveExamPreference } from "@/lib/exam-preference";
import { applyExamScope } from "@/lib/plan/store";

/**
 * Asks (or re-asks) which SQE1 assessment the student is sitting, saves it to
 * their profile and rebuilds only their upcoming sessions.
 *
 * `required` renders it as a blocking prompt for a student whose preference is
 * unknown — we never silently assume "both".
 */
export function SqeAssessmentDialog({
  open,
  onOpenChange,
  current,
  required,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  current: SqeAssessment | null;
  required?: boolean;
  onApplied?: (assessment: SqeAssessment) => void;
}) {
  const [choice, setChoice] = useState<SqeAssessment | null>(current);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (open) {
      setChoice(current);
      setConfirming(false);
    }
  }, [open, current]);

  const changing = !!current && !!choice && choice !== current;

  const apply = async () => {
    if (!choice || lock.current) return;
    lock.current = true;
    setSaving(true);
    try {
      const saved = await saveExamPreference(choice);
      if (!saved) {
        toast.error("Couldn't save your exam preference. Please try again.");
        return;
      }
      const result = await applyExamScope(choice, null);
      if (!result) {
        toast.success(`Saved — you're preparing for ${assessmentLabel(choice)}.`);
      } else {
        toast.success(
          `Updated to ${assessmentLabel(choice)} — your upcoming sessions were rebuilt.`,
        );
      }
      onApplied?.(choice);
      onOpenChange(false);
    } catch (e) {
      console.error("applyExamScope failed", e);
      toast.error("Couldn't update your plan. Please try again.");
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (required && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-w-md"
        onInteractOutside={(e) => {
          if (required) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (required) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-left">
            {confirming ? "Update your study plan?" : SQE_ASSESSMENT_QUESTION}
          </DialogTitle>
          <DialogDescription className="text-left">
            {confirming
              ? `Tentra will rebuild your upcoming sessions around ${assessmentLabel(
                  choice ?? "BOTH",
                )} and remove sessions for the papers you're no longer sitting. Your completed session history is kept.`
              : required
                ? "Tentra needs this before it can rebuild your plan — it decides which subjects appear everywhere in the app."
                : "This decides which subjects appear in your plan, dashboard, analytics and coaching."}
          </DialogDescription>
        </DialogHeader>

        {!confirming && (
          <SqeAssessmentPicker value={choice} onChange={setChoice} disabled={saving} />
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {confirming ? (
            <>
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="rounded-full"
              >
                Back
              </Button>
              <Button
                onClick={apply}
                disabled={saving}
                className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
              >
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {saving ? "Updating plan…" : "Yes, update my plan"}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => (changing ? setConfirming(true) : apply())}
              disabled={!choice || saving}
              className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow"
            >
              {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {changing ? "Continue" : saving ? "Saving…" : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
