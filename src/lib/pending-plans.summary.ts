// Client-facing projection of a stored pending plan.
//
// SECURITY: the stored pending plan (`plan_data`) contains the entire
// generated roadmap. Only this module decides what leaves the server, and
// it deliberately exposes:
//   - high-level counters (weeks, days to exam, hours per week)
//   - the COMPLETE week one schedule (the free pre-payment value)
//   - a locked *summary* for everything after week one (counts only)
// It never returns the full StoredPlan, weeks 2+ content, the raw
// onboarding record, magic-link fields or any other internal column.
//
// Pure and client-safe: no server-only imports.

import type { OnboardingInput, StoredPlan } from "@/lib/plan-store";
import { buildWeekOneSchedule, type WeekOneSchedule } from "@/lib/week-one";

const TOKEN_ALPHABET =
  "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return out;
}

const EXAM_LABELS: Record<string, string> = {
  SQE1: "SQE1",
  SQE2: "SQE2",
  UBE: "NY Bar (UBE)",
  MPRE: "MPRE",
};

/** Shorter label used in headings, where the parenthetical reads badly. */
const EXAM_HEADINGS: Record<string, string> = {
  SQE1: "SQE1",
  SQE2: "SQE2",
  UBE: "NY Bar",
  MPRE: "MPRE",
};

export type PendingPlanSummary = {
  token: string;
  status: "pending" | "paid" | "claimed" | "expired";
  examLabel: string;
  /** Heading-friendly exam name, e.g. "SQE1" or "NY Bar". */
  examHeading: string;
  examType: string;
  /** Route param used to return the visitor to the right onboarding entry. */
  examParam: string;
  examDate: string;
  daysUntilExam: number;
  hoursPerWeek: number;
  weeks: number;
  focusModules: string[];
  /** Complete week one — the free pre-payment preview. */
  weekOne: WeekOneSchedule;
  /** Counts only. No week 2+ themes, modules, sessions or dates. */
  locked: { fromWeek: number; remainingWeeks: number };
  hasEmail: boolean;
};

const EXAM_PARAMS: Record<string, string> = {
  SQE1: "sqe1",
  SQE2: "sqe2",
  UBE: "ube",
  MPRE: "mpre",
};

export function summariseForClient(row: {
  token: string;
  status: string;
  plan_data: unknown;
  onboarding_data: unknown;
  email: string | null;
}): PendingPlanSummary {
  const stored = row.plan_data as StoredPlan;
  const onboarding = row.onboarding_data as OnboardingInput;
  const focus =
    stored.plan?.weeklyStrategy?.allocations?.slice(0, 3).map((a) => a.module) ?? [];
  const weeks = Math.max(1, Math.ceil(stored.daysUntilExam / 7));

  return {
    token: row.token,
    status: row.status as PendingPlanSummary["status"],
    examLabel: EXAM_LABELS[onboarding.examType] ?? onboarding.examType,
    examHeading: EXAM_HEADINGS[onboarding.examType] ?? onboarding.examType,
    examType: onboarding.examType,
    examParam: EXAM_PARAMS[onboarding.examType] ?? "sqe1",
    examDate: onboarding.examDate,
    daysUntilExam: stored.daysUntilExam,
    hoursPerWeek: onboarding.hoursPerWeek,
    weeks,
    focusModules: focus,
    weekOne: buildWeekOneSchedule(stored),
    locked: { fromWeek: 2, remainingWeeks: Math.max(0, weeks - 1) },
    hasEmail: !!row.email,
  };
}
