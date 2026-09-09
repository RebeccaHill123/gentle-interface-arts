import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SQE_ASSESSMENT_OPTIONS, type SqeAssessment } from "@/lib/exam-scope";

export const SQE_ASSESSMENT_QUESTION = "Which part of SQE1 are you preparing for?";

/** Shared radio-card picker for the FLK1 / FLK2 / both question. */
export function SqeAssessmentPicker({
  value,
  onChange,
  disabled,
}: {
  value: SqeAssessment | null;
  onChange: (value: SqeAssessment) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label={SQE_ASSESSMENT_QUESTION}>
      {SQE_ASSESSMENT_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex min-h-11 items-start gap-3 rounded-2xl border p-3.5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60",
              active
                ? "border-pink bg-gradient-pink-blue/10 shadow-glow"
                : "border-border bg-background/40 hover:border-muted-foreground",
            )}
          >
            <span className="flex-1">
              <span className="block text-[14.5px] font-semibold text-foreground">
                {opt.label}
              </span>
              <span className="mt-0.5 block text-xs leading-[1.45] text-muted-foreground">
                {opt.blurb}
              </span>
            </span>
            {active && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-pink" />}
          </button>
        );
      })}
    </div>
  );
}
