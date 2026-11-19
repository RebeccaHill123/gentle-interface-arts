// Authored SQE1 single-best-answer bank used by the practice flow.
//
// 120 original items (60 FLK1, 60 FLK2) tagged with SQE_SYLLABUS subject and
// subtopic ids. Practice sessions for SQE1 are served from here first and only
// topped up by the generator when the bank cannot fill the requested count.
// Adding items is append-only: never reuse or renumber an id.

import { SQE_SYLLABUS } from "@/lib/sqe-syllabus";
import type { QuizQuestion } from "@/lib/practice/quiz-validate";
import { FLK1_A } from "./flk1-a";
import { FLK1_B } from "./flk1-b";
import { FLK2_A } from "./flk2-a";
import { FLK2_B } from "./flk2-b";
import type { SqeBankPaper, SqeBankQuestion, SqeBankSubject } from "./types";

export type { SqeBankQuestion, SqeBankPaper, SqeBankSubject } from "./types";

export const SQE_QUESTIONS: SqeBankQuestion[] = [...FLK1_A, ...FLK1_B, ...FLK2_A, ...FLK2_B];

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Planner/launcher module names (and common variants) → bank subject. */
const SUBJECT_ALIASES: [string, SqeBankSubject][] = [
  ["solicitors accounts", "solicitors-accounts"],
  ["accounts rules", "solicitors-accounts"],
  ["business law", "business-law"],
  ["dispute resolution", "dispute-resolution"],
  ["civil litigation", "dispute-resolution"],
  ["constitutional", "constitutional"],
  ["administrative law", "constitutional"],
  ["legal system", "legal-system"],
  ["legal services", "legal-system"],
  ["ethics", "ethics"],
  ["professional conduct", "ethics"],
  ["property practice", "property-practice"],
  ["land law", "land-law"],
  ["wills", "wills-estates"],
  ["administration of estates", "wills-estates"],
  ["trusts", "trusts"],
  ["criminal practice", "criminal-practice"],
  ["criminal litigation", "criminal-practice"],
  ["criminal law", "criminal-law"],
  ["criminal liability", "criminal-law"],
  ["contract", "contract"],
  ["tort", "tort"],
];

export function sqeSubjectForModule(module: string): SqeBankSubject | null {
  const m = ` ${norm(module)} `;
  for (const [alias, id] of SUBJECT_ALIASES) {
    if (m.includes(` ${alias} `) || m.includes(` ${alias}`)) return id;
  }
  return null;
}

export function sqePaperForModule(module: string): SqeBankPaper | null {
  const hit = /\bflk\s?([12])\b/i.exec(module);
  return hit ? (`FLK${hit[1]}` as SqeBankPaper) : null;
}

export function sqeQuestionsForSubject(subject: SqeBankSubject): SqeBankQuestion[] {
  return SQE_QUESTIONS.filter((q) => q.subject === subject);
}

export function sqeQuestionsForPaper(paper: SqeBankPaper): SqeBankQuestion[] {
  return SQE_QUESTIONS.filter((q) => q.paper === paper);
}

function seededOrder<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h ^= h >>> 13;
    const j = Math.abs(h) % (i + 1);
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out;
}

/** Interleave subjects so a mixed set covers as many areas as possible. */
function balanced(pool: SqeBankQuestion[], seed: string): SqeBankQuestion[] {
  const bySubject = new Map<string, SqeBankQuestion[]>();
  for (const q of seededOrder(pool, `${seed}|m`)) {
    const list = bySubject.get(q.subject) ?? [];
    list.push(q);
    bySubject.set(q.subject, list);
  }
  const lanes = seededOrder([...bySubject.values()], `${seed}|lanes`);
  const out: SqeBankQuestion[] = [];
  for (let round = 0; out.length < pool.length; round += 1) {
    for (const lane of lanes) if (lane[round]) out.push(lane[round]!);
  }
  return out;
}

function subtopicMatches(item: SqeBankQuestion, topic: string): boolean {
  const t = norm(topic);
  if (!t) return false;
  const subject = SQE_SYLLABUS.find((s) => s.id === item.subject);
  const sub = subject?.subtopics.find((st) => st.id === item.subtopic);
  if (!sub) return false;
  const names = [sub.name, ...(sub.formerNames ?? [])].map(norm);
  return names.some((n) => n.includes(t) || t.includes(n)) || norm(sub.id.replace(/-/g, " ")) === t;
}

export function toSqeQuizQuestion(item: SqeBankQuestion): QuizQuestion {
  return {
    prompt: item.prompt,
    options: [...item.options],
    correctIndex: item.correctIndex,
    explanation: `${item.explanation} Authority: ${item.authority}.`.replace(/\.\.$/, "."),
    optionExplanations: [...item.optionExplanations],
  };
}

/**
 * Authored questions for an SQE1 practice session.
 * - Subject module ("Contract", "Business Law & Practice"…): that subject,
 *   scheduled-subtopic matches first.
 * - Paper module ("FLK1 mixed paper…", "Mixed (FLK2)"): that paper, balanced.
 * - Any other "Mixed…" module: both papers, balanced across all subjects.
 * Unknown modules return [] so the generator handles them as before.
 */
export function sqeQuestionsFor(input: {
  module: string;
  topic?: string | null;
  count: number;
  seed?: string;
}): QuizQuestion[] {
  const count = Math.max(0, Math.floor(input.count));
  if (count === 0) return [];
  const seed = `${input.module}|${input.topic ?? ""}|${input.seed ?? ""}`;
  const paper = sqePaperForModule(input.module);
  const subject = paper ? null : sqeSubjectForModule(input.module);
  let ordered: SqeBankQuestion[];
  if (subject) {
    const pool = sqeQuestionsForSubject(subject);
    const topic = input.topic?.trim() ?? "";
    const preferred = topic ? pool.filter((i) => subtopicMatches(i, topic)) : [];
    const rest = pool.filter((i) => !preferred.includes(i));
    ordered = [...seededOrder(preferred, `${seed}|p`), ...seededOrder(rest, `${seed}|a`)];
  } else if (paper) {
    ordered = balanced(sqeQuestionsForPaper(paper), seed);
  } else if (/\bmixed\b/i.test(input.module)) {
    ordered = balanced(SQE_QUESTIONS, seed);
  } else {
    return [];
  }
  return ordered.slice(0, count).map(toSqeQuizQuestion);
}
