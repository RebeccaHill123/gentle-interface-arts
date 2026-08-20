// Shared evidence-led subject prioritisation for UI dialogs.
// Ranking order: low graded accuracy first, then no-coverage, then
// self-rated-low. Never ranks by minutes studied or mood/focus.
import type { AnalyticsBundle, SubjectStat } from "@/lib/analytics-derive";

export function pickEvidenceLedSubject(analytics: AnalyticsBundle): SubjectStat | undefined {
  const top = analytics.needsAttention[0];
  if (top) {
    const match = analytics.subjects.find((s) => s.module === top.module);
    if (match) return match;
  }
  // Fallback: worst graded accuracy directly.
  const worst = analytics.graded.perSubject[0];
  if (worst) {
    const match = analytics.subjects.find((s) => s.module === worst.subject);
    if (match) return match;
  }
  return undefined;
}

export function evidenceReason(analytics: AnalyticsBundle, module: string): string | null {
  const item = analytics.needsAttention.find((n) => n.module === module);
  if (item) return item.detail;
  const graded = analytics.graded.perSubject.find((s) => s.subject === module);
  if (graded) return `${graded.accuracy}% correct across ${graded.attempted} graded questions.`;
  return null;
}
