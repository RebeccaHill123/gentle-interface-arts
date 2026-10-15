// Current SRA assessment rules for SQE, shared by the Coach, quiz generation
// and mocks so they all describe the same version.
// Sources (checked 15 Oct 2026):
// - https://sqe.sra.org.uk/news-item/2026/09/10/important-changes-to-sqe1-for-january-2027-onwards
// - https://sqe.sra.org.uk/assessments/sqe1-assessments/sqe1-specification/sqe-changes-sept-2026
// - https://sqe.sra.org.uk/assessments/sqe2-assessments/sqe2-specification

export const SQE_RULES_VERSION = "sra-2026-09";

/** First SQE1 sitting that uses 170-question FLKs split into subject-grouped sessions. */
export const SQE1_2027_FORMAT_FROM = "2027-01-01";

export function usesSqe1Format2027(examDate?: string | null): boolean {
  // Every SQE1 sitting still to come is January 2027 or later.
  if (!examDate) return true;
  return examDate >= SQE1_2027_FORMAT_FROM;
}

export const SQE_ASSESSMENT_RULES_PROMPT = `Current SRA rules (FLK and assessment specifications applying after 1 September 2026):
- SQE1 from January 2027: each FLK is 170 single-best-answer questions in two sessions of 85, 2 hours 33 minutes per session (340 in total).
- FLK1 Session 1: Business Law and Practice; Dispute Resolution; Legal Services. FLK1 Session 2: Tort; Contract Law; Legal Systems (Legal System of England and Wales; Constitutional and Administrative Law and EU Law).
- FLK2 Session 1: Wills and the Administration of Estates; Solicitors Accounts (wills context); Trusts Law; Land Law. FLK2 Session 2: Property Law and Practice; Solicitors Accounts (property context); Criminal Liability; Criminal Law and Practice.
- Questions are randomised within each session. Ethics and Professional Conduct is pervasive and can be tested in any session. Blueprint proportions are unchanged.
- Never say SQE1 has 180 questions per FLK or 90 per session for January 2027 or later sittings.
- Relocated topics: appeals are tested in Dispute Resolution and Criminal Law and Practice (not Legal System); criminal legal aid is tested in Criminal Law and Practice in FLK2 (Legal Services covers civil legal aid only); "oral examination" is now "obtaining information from judgment debtor"; trusts stranger liability is "knowing receipt" and "dishonest assistance".
- Tax questions: test the application of tax rules, but always state in the question any monetary rates, thresholds and the value of exemptions or reliefs the candidate needs. Never expect candidates to recall these figures.
- SQE2: money laundering can be examined in Property Practice as well as Business Law and Practice. Ethics and Professional Conduct is being reported as its own Law category in SQE2 feedback; the assessment format and the equal weighting of skills and application of law are unchanged.`;
