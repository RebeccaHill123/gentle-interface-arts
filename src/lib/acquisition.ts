export type AcquisitionExamParam = "sqe1" | "sqe2" | "ube" | "mpre";

const EXAM_PARAMS: AcquisitionExamParam[] = ["sqe1", "sqe2", "ube", "mpre"];

export interface AcquisitionSearch {
  exam?: AcquisitionExamParam;
  src?: string;
  placement?: string;
  date?: string;
  hours?: number;
}

/**
 * A generic visit must never infer an exam from fallback form state. Old
 * drafts predate the explicit marker, so they are deliberately treated as
 * unanswered; an explicit acquisition link remains authoritative.
 */
export function hasExplicitExamSelection(
  draftExamSelected: boolean | undefined,
  searchExam: AcquisitionExamParam | undefined,
): boolean {
  return Boolean(searchExam || draftExamSelected === true);
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value.slice(0, 40) : undefined;
}

function toDateOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(new Date(`${value}T00:00:00`).getTime()) ? undefined : value;
}

function toHoursOrUndefined(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  const rounded = Math.round(n);
  return rounded >= 1 && rounded <= 60 ? rounded : undefined;
}

export function parseAcquisitionSearch(search: Record<string, unknown>): AcquisitionSearch {
  const raw = typeof search.exam === "string" ? search.exam.toLowerCase() : "";
  const exam = (EXAM_PARAMS as string[]).includes(raw)
    ? (raw as AcquisitionExamParam)
    : undefined;

  return {
    exam,
    src: toStringOrUndefined(search.src ?? search.utm_source),
    placement: toStringOrUndefined(search.placement),
    date: toDateOrUndefined(search.date),
    hours: toHoursOrUndefined(search.hours),
  };
}