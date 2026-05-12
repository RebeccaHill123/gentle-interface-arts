// SQE syllabus hierarchy — the academic backbone of Tentra's adaptive planner.
// Weights and high-yield scores are calibrated from SRA assessment specifications,
// historical question-frequency analysis, and SQE1 examiner reports.
//
// - weight: share of an FLK paper (0–1, sums to ~1.0 per paper)
// - highYield: 1–5 (5 = appears nearly every sitting / heavy mark-share)
// - groups: related-subject clusters used for interleaved/mixed practice

export type FLKPaper = "FLK1" | "FLK2";

export interface SubTopic {
  id: string;
  name: string;
  highYield: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface SQESubject {
  id: string;
  name: string;
  paper: FLKPaper;
  weight: number; // share of the paper, 0-1
  highYield: 1 | 2 | 3 | 4 | 5;
  groups: string[]; // related cluster ids for interleaving
  subtopics: SubTopic[];
}

// Related-subject clusters for mixed SBA / interleaved practice.
export const TOPIC_GROUPS: Record<string, { name: string; subjects: string[] }> = {
  "private-client": { name: "Private Client", subjects: ["wills-estates", "trusts", "land-law"] },
  "property-cluster": { name: "Property Cluster", subjects: ["land-law", "property-practice", "trusts"] },
  "obligations": { name: "Obligations", subjects: ["contract", "tort"] },
  "business-cluster": { name: "Business & Commercial", subjects: ["business-law", "contract", "solicitors-accounts"] },
  "litigation": { name: "Litigation", subjects: ["dispute-resolution", "criminal-practice", "criminal-law"] },
  "public-law": { name: "Public Law", subjects: ["constitutional", "legal-system", "eu-law"] },
  "ethics-cornerstone": { name: "Ethics (cross-paper)", subjects: ["ethics", "solicitors-accounts"] },
};

export const SQE_SYLLABUS: SQESubject[] = [
  // ===== FLK1 =====
  {
    id: "contract",
    name: "Contract",
    paper: "FLK1",
    weight: 0.18,
    highYield: 5,
    groups: ["obligations", "business-cluster"],
    subtopics: [
      { id: "formation", name: "Formation (offer, acceptance, consideration, ITC)", highYield: 5 },
      { id: "terms", name: "Express & implied terms; conditions, warranties, innominate", highYield: 5 },
      { id: "exemption-clauses", name: "Exemption clauses & UCTA / CRA 2015", highYield: 4 },
      { id: "vitiating", name: "Misrepresentation, mistake, duress, undue influence", highYield: 5 },
      { id: "discharge", name: "Discharge: performance, breach, frustration, agreement", highYield: 4 },
      { id: "remedies", name: "Remedies: damages, specific performance, injunctions", highYield: 5 },
      { id: "third-parties", name: "Privity & third-party rights", highYield: 2 },
    ],
  },
  {
    id: "tort",
    name: "Tort",
    paper: "FLK1",
    weight: 0.15,
    highYield: 5,
    groups: ["obligations"],
    subtopics: [
      { id: "negligence", name: "Negligence: duty, breach, causation, remoteness", highYield: 5 },
      { id: "psych-economic", name: "Psychiatric & pure economic loss", highYield: 4 },
      { id: "occupiers", name: "Occupiers' liability (1957 & 1984 Acts)", highYield: 4 },
      { id: "nuisance-rylands", name: "Nuisance & Rylands v Fletcher", highYield: 3 },
      { id: "vicarious", name: "Vicarious liability & employers' liability", highYield: 4 },
      { id: "product-liability", name: "Product liability (CPA 1987)", highYield: 2 },
      { id: "defences-remedies", name: "Defences & remedies in tort", highYield: 4 },
    ],
  },
  {
    id: "business-law",
    name: "Business Law & Practice",
    paper: "FLK1",
    weight: 0.18,
    highYield: 5,
    groups: ["business-cluster"],
    subtopics: [
      { id: "business-vehicles", name: "Choosing a business vehicle (sole trader, partnership, LLP, Ltd)", highYield: 5 },
      { id: "company-formation", name: "Company formation & constitution (CA 2006)", highYield: 4 },
      { id: "directors-shareholders", name: "Directors' duties & shareholder rights", highYield: 5 },
      { id: "share-capital", name: "Share capital, allotments, buy-backs, dividends", highYield: 4 },
      { id: "partnerships", name: "Partnerships & LLPs", highYield: 4 },
      { id: "insolvency", name: "Personal & corporate insolvency", highYield: 4 },
      { id: "tax-business", name: "Business tax (CT, IT, CGT, VAT basics)", highYield: 5 },
    ],
  },
  {
    id: "dispute-resolution",
    name: "Dispute Resolution",
    paper: "FLK1",
    weight: 0.13,
    highYield: 5,
    groups: ["litigation"],
    subtopics: [
      { id: "pre-action", name: "Pre-action conduct & ADR", highYield: 4 },
      { id: "starting-claim", name: "Starting a claim, jurisdiction & limitation", highYield: 5 },
      { id: "statements-of-case", name: "Statements of case & amendments", highYield: 4 },
      { id: "interim-applications", name: "Interim applications & case management", highYield: 5 },
      { id: "disclosure-evidence", name: "Disclosure, witness evidence, experts", highYield: 5 },
      { id: "trial-judgment", name: "Trial, judgment & costs", highYield: 4 },
      { id: "enforcement", name: "Enforcement & appeals", highYield: 3 },
    ],
  },
  {
    id: "constitutional",
    name: "Constitutional & Administrative Law",
    paper: "FLK1",
    weight: 0.10,
    highYield: 4,
    groups: ["public-law"],
    subtopics: [
      { id: "sovereignty", name: "Parliamentary sovereignty & rule of law", highYield: 4 },
      { id: "separation", name: "Separation of powers & royal prerogative", highYield: 3 },
      { id: "judicial-review", name: "Judicial review (grounds, remedies, procedure)", highYield: 5 },
      { id: "human-rights", name: "Human Rights Act 1998 & Convention rights", highYield: 5 },
    ],
  },
  {
    id: "legal-system",
    name: "Legal System of England & Wales",
    paper: "FLK1",
    weight: 0.08,
    highYield: 3,
    groups: ["public-law"],
    subtopics: [
      { id: "sources", name: "Sources of law & statutory interpretation", highYield: 4 },
      { id: "courts-precedent", name: "Court structure & precedent", highYield: 3 },
      { id: "legal-services", name: "Legal services & funding", highYield: 2 },
    ],
  },
  {
    id: "eu-law",
    name: "EU & Retained Law",
    paper: "FLK1",
    weight: 0.03,
    highYield: 2,
    groups: ["public-law"],
    subtopics: [
      { id: "retained-law", name: "Retained EU law & Brexit framework", highYield: 2 },
      { id: "supremacy", name: "Direct effect & supremacy (legacy)", highYield: 2 },
    ],
  },
  {
    id: "ethics",
    name: "Ethics & Professional Conduct",
    paper: "FLK1", // assessed in BOTH papers — set primary as FLK1, flagged ethics-cornerstone
    weight: 0.15, // notional weight — pervasive across the paper
    highYield: 5,
    groups: ["ethics-cornerstone"],
    subtopics: [
      { id: "sra-principles", name: "SRA Principles & Code of Conduct (solicitors)", highYield: 5 },
      { id: "conflicts", name: "Conflicts of interest & confidentiality", highYield: 5 },
      { id: "client-money", name: "Client money & SRA Accounts Rules", highYield: 5 },
      { id: "money-laundering", name: "AML, POCA & financial crime", highYield: 5 },
      { id: "duties-court", name: "Duties to the court & third parties", highYield: 4 },
      { id: "regulation", name: "Regulation, supervision & complaints", highYield: 3 },
    ],
  },

  // ===== FLK2 =====
  {
    id: "land-law",
    name: "Land Law",
    paper: "FLK2",
    weight: 0.13,
    highYield: 5,
    groups: ["property-cluster", "private-client"],
    subtopics: [
      { id: "estates-interests", name: "Estates & interests in land", highYield: 5 },
      { id: "registered-unregistered", name: "Registered & unregistered title", highYield: 4 },
      { id: "co-ownership", name: "Co-ownership: joint tenancy & TIC", highYield: 5 },
      { id: "easements", name: "Easements (creation, enforceability, extinguishment)", highYield: 5 },
      { id: "covenants", name: "Freehold covenants (positive & restrictive)", highYield: 5 },
      { id: "leases", name: "Leases & licences; LTA 1954", highYield: 4 },
      { id: "mortgages", name: "Mortgages: creation, priority, enforcement", highYield: 5 },
    ],
  },
  {
    id: "property-practice",
    name: "Property Practice",
    paper: "FLK2",
    weight: 0.13,
    highYield: 5,
    groups: ["property-cluster"],
    subtopics: [
      { id: "freehold-sale", name: "Freehold sale & purchase procedure", highYield: 5 },
      { id: "leasehold", name: "Leasehold & commercial leases", highYield: 4 },
      { id: "searches-enquiries", name: "Searches, enquiries & due diligence", highYield: 4 },
      { id: "contract-completion", name: "Contract, exchange & completion", highYield: 5 },
      { id: "sdlt-vat", name: "SDLT, VAT & taxation on property", highYield: 4 },
      { id: "post-completion", name: "Post-completion & registration", highYield: 3 },
    ],
  },
  {
    id: "trusts",
    name: "Trusts",
    paper: "FLK2",
    weight: 0.10,
    highYield: 5,
    groups: ["private-client", "property-cluster"],
    subtopics: [
      { id: "express-trusts", name: "Express trusts: certainties & formalities", highYield: 5 },
      { id: "resulting-constructive", name: "Resulting & constructive trusts", highYield: 5 },
      { id: "trustees-duties", name: "Trustees' powers & duties", highYield: 4 },
      { id: "breach-remedies", name: "Breach of trust & equitable remedies", highYield: 4 },
      { id: "tracing", name: "Tracing & third-party liability", highYield: 4 },
      { id: "charitable", name: "Charitable trusts", highYield: 2 },
    ],
  },
  {
    id: "criminal-law",
    name: "Criminal Law",
    paper: "FLK2",
    weight: 0.10,
    highYield: 4,
    groups: ["litigation"],
    subtopics: [
      { id: "actus-mens", name: "Actus reus, mens rea & causation", highYield: 5 },
      { id: "homicide", name: "Homicide (murder, manslaughter, partial defences)", highYield: 5 },
      { id: "non-fatal", name: "Non-fatal offences against the person", highYield: 4 },
      { id: "property-offences", name: "Theft, fraud & other property offences", highYield: 4 },
      { id: "general-defences", name: "General defences (self-defence, intoxication, duress)", highYield: 4 },
      { id: "inchoate-secondary", name: "Inchoate offences & secondary liability", highYield: 3 },
    ],
  },
  {
    id: "criminal-practice",
    name: "Criminal Practice",
    paper: "FLK2",
    weight: 0.10,
    highYield: 4,
    groups: ["litigation"],
    subtopics: [
      { id: "police-powers", name: "Police powers & PACE", highYield: 5 },
      { id: "pre-charge", name: "Pre-charge advice & detention", highYield: 4 },
      { id: "bail-first-hearings", name: "Bail & first hearings", highYield: 4 },
      { id: "plea-allocation", name: "Plea & allocation", highYield: 4 },
      { id: "trial-evidence", name: "Trial procedure & evidence (incl. bad character/hearsay)", highYield: 5 },
      { id: "sentencing-appeals", name: "Sentencing & appeals", highYield: 3 },
      { id: "youths", name: "Youths in the criminal justice system", highYield: 2 },
    ],
  },
  {
    id: "wills-estates",
    name: "Wills & Estates",
    paper: "FLK2",
    weight: 0.10,
    highYield: 4,
    groups: ["private-client"],
    subtopics: [
      { id: "validity", name: "Validity & execution of wills", highYield: 5 },
      { id: "intestacy", name: "Intestacy rules & family provision", highYield: 4 },
      { id: "iht", name: "IHT planning & calculation", highYield: 5 },
      { id: "administration", name: "Estate administration & PRs' duties", highYield: 4 },
      { id: "trusts-in-wills", name: "Trusts arising in wills", highYield: 3 },
    ],
  },
  {
    id: "solicitors-accounts",
    name: "Solicitors Accounts",
    paper: "FLK2",
    weight: 0.07,
    highYield: 5,
    groups: ["ethics-cornerstone", "business-cluster"],
    subtopics: [
      { id: "client-account", name: "Client vs business account & SRA Accounts Rules", highYield: 5 },
      { id: "double-entry", name: "Double-entry bookkeeping for solicitors", highYield: 5 },
      { id: "interest-disbursements", name: "Interest, disbursements & VAT", highYield: 4 },
      { id: "breaches-reporting", name: "Breaches, reconciliations & reporting", highYield: 4 },
    ],
  },
];

export function getSubject(id: string): SQESubject | undefined {
  return SQE_SYLLABUS.find((s) => s.id === id);
}

export function getSubjectByName(name: string): SQESubject | undefined {
  const norm = name.toLowerCase().trim();
  return SQE_SYLLABUS.find(
    (s) => s.name.toLowerCase() === norm || s.id === norm,
  );
}

export function getSubjectsForPaper(paper: FLKPaper): SQESubject[] {
  return SQE_SYLLABUS.filter((s) => s.paper === paper);
}

export function getRelatedSubjects(id: string): SQESubject[] {
  const subj = getSubject(id);
  if (!subj) return [];
  const related = new Set<string>();
  subj.groups.forEach((g) => {
    TOPIC_GROUPS[g]?.subjects.forEach((sid) => sid !== id && related.add(sid));
  });
  return Array.from(related)
    .map((sid) => getSubject(sid))
    .filter((s): s is SQESubject => Boolean(s));
}

/**
 * Yield-priority score: combines a subject's exam weight with high-yield rating
 * and the user's confidence gap. Higher score = more planner attention.
 */
export function computePriorityScore(
  subject: SQESubject,
  userConfidence: number, // 1-5
  recencyDays?: number,
): number {
  const confidenceGap = Math.max(0, 5 - userConfidence) / 5; // 0-1
  const recencyBoost = recencyDays === undefined
    ? 0.2
    : Math.min(1, recencyDays / 14) * 0.3;
  return (
    subject.weight * 0.4 +
    (subject.highYield / 5) * 0.3 +
    confidenceGap * 0.2 +
    recencyBoost * 0.1
  );
}

/**
 * Compact, prompt-friendly serialization of the syllabus for LLM context.
 */
export function syllabusForPrompt(paper?: FLKPaper): string {
  const subjects = paper ? getSubjectsForPaper(paper) : SQE_SYLLABUS;
  return subjects
    .map((s) => {
      const subs = s.subtopics
        .map((t) => `    - ${t.name} [HY${t.highYield}]`)
        .join("\n");
      return `${s.paper} · ${s.name} (weight ${(s.weight * 100).toFixed(0)}%, HY${s.highYield}, groups: ${s.groups.join(", ")})\n${subs}`;
    })
    .join("\n\n");
}
