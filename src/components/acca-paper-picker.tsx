import { CheckCircle2 } from "lucide-react";
import {
  ACCA_LEVELS,
  ACCA_PAPERS,
  MAX_ACCA_PAPERS,
  type AccaLevel,
} from "@/lib/acca-syllabus";
import { cn } from "@/lib/utils";

export const ACCA_PAPER_QUESTION = "Which paper(s) are you sitting?";

/**
 * ACCA is sat paper by paper, so the syllabus Tentra plans is whatever the
 * student has entered for. One or two papers per sitting is what we support —
 * the cap is enforced here and again when the plan is generated.
 */
export function AccaPaperPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (code: string) => {
    if (value.includes(code)) {
      onChange(value.filter((c) => c !== code));
      return;
    }
    if (value.length >= MAX_ACCA_PAPERS) {
      // Replace the oldest choice so tapping a third paper never silently fails.
      onChange([...value.slice(1), code]);
      return;
    }
    onChange([...value, code]);
  };

  return (
    <div className="space-y-4">
      {ACCA_LEVELS.map((level: AccaLevel) => (
        <div key={level} className="space-y-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {level}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {ACCA_PAPERS.filter((p) => p.level === level).map((paper) => {
              const active = value.includes(paper.code);
              return (
                <button
                  key={paper.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(paper.code)}
                  className={cn(
                    "flex min-h-11 items-start gap-2.5 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    active
                      ? "border-pink bg-gradient-pink-blue/10 shadow-glow"
                      : "border-border bg-background/40 hover:border-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-7 w-9 shrink-0 place-items-center rounded-lg text-[11.5px] font-semibold",
                      active
                        ? "bg-gradient-pink-blue text-primary-foreground"
                        : "bg-card text-muted-foreground",
                    )}
                  >
                    {paper.code}
                  </span>
                  <span className="flex-1">
                    <span className="block text-[13.5px] font-medium text-foreground">
                      {paper.name}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-muted-foreground">
                      {paper.format}
                    </span>
                  </span>
                  {active && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pink" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Choose up to {MAX_ACCA_PAPERS} papers for this sitting. Tentra only schedules the
        syllabus of the papers you pick.
      </p>
    </div>
  );
}
