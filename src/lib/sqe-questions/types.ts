// Authored SQE1 single-best-answer bank — shared item shape.
//
// Every item is original Tentra wording (never copied from SRA samples or
// publisher banks). Law stated for England and Wales as at 11 September 2026,
// for SQE1 sittings from January 2027 under the current SRA specification.

export type SqeBankPaper = "FLK1" | "FLK2";

/** Subject ids match `SQE_SYLLABUS` in src/lib/sqe-syllabus.ts. */
export type SqeBankSubject =
  | "business-law"
  | "dispute-resolution"
  | "contract"
  | "tort"
  | "constitutional"
  | "legal-system"
  | "ethics"
  | "property-practice"
  | "land-law"
  | "wills-estates"
  | "trusts"
  | "criminal-law"
  | "criminal-practice"
  | "solicitors-accounts";

export interface SqeBankQuestion {
  /** Stable, never reused. Saved answers key off this. */
  id: string;
  paper: SqeBankPaper;
  subject: SqeBankSubject;
  /** Subtopic id from SQE_SYLLABUS for this subject. */
  subtopic: string;
  difficulty: "core" | "standard" | "challenging";
  prompt: string;
  options: [string, string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3 | 4;
  /** Why the key is right, applied to these facts. */
  explanation: string;
  /** One reason per option, same order as `options`. */
  optionExplanations: [string, string, string, string, string];
  /** Pinpoint primary authority, e.g. "Companies Act 2006, s 177". */
  authority: string;
}
