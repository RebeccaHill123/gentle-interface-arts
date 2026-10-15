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
  /** Previous names, so ratings and flags saved before a syllabus update still match. */
  formerNames?: string[];
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
      { id: "terms", name: "Express & implied terms; interpretation of terms; classification (conditions, warranties, innominate terms)", highYield: 5, formerNames: ["Express & implied terms; conditions, warranties, innominate"] },
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
      { id: "business-vehicles", name: "Legal personality & limited liability (sole trader, partnership, LLP, private and unlisted public companies)", highYield: 5, formerNames: ["Choosing a business vehicle (sole trader, partnership, LLP, Ltd)"] },
      { id: "company-formation", name: "Company formation & constitution (CA 2006)", highYield: 4 },
      { id: "directors-shareholders", name: "Directors' duties & shareholder rights", highYield: 5 },
      { id: "share-capital", name: "Debt & equity funding: allotments, redemption and buyback of shares, dividends (not other capital reductions or financial assistance)", highYield: 4, formerNames: ["Share capital, allotments, buy-backs, dividends"] },
      { id: "partnerships", name: "Partnerships & LLPs", highYield: 4 },
      { id: "insolvency", name: "Personal & corporate insolvency", highYield: 4 },
      { id: "tax-business", name: "Business tax: Corporation Tax charge (income profits, chargeable gains, deductions, main reliefs), IT, CGT, VAT", highYield: 5, formerNames: ["Business tax (CT, IT, CGT, VAT basics)"] },
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
      { id: "enforcement", name: "Enforcement of money judgments (incl. obtaining information from judgment debtor) & appeals", highYield: 3, formerNames: ["Enforcement & appeals"] },
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
      { id: "separation", name: "Separation of powers, rule of law & royal prerogative", highYield: 3, formerNames: ["Separation of powers & royal prerogative"] },
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
      { id: "courts-precedent", name: "Courts, judicial function, court hierarchy, jurisdiction & precedent", highYield: 3, formerNames: ["Court structure & precedent"], notes: "Appeals are tested in Dispute Resolution and Criminal Practice, not here (SRA, Sept 2026)." },
      { id: "legal-services", name: "Legal services & funding (civil legal aid eligibility)", highYield: 2, formerNames: ["Legal services & funding"], notes: "Criminal legal aid moved to Criminal Practice in FLK2 (SRA, Sept 2026)." },
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
      { id: "leasehold", name: "Leasehold: assignment (incl. drafting the assignment contract) & LTA 1954 Part II (incl. contracting out)", highYield: 4, formerNames: ["Leasehold & commercial leases"] },
      { id: "searches-enquiries", name: "Searches & enquiries: range, purpose, who makes them, issues arising from results", highYield: 4, formerNames: ["Searches, enquiries & due diligence"] },
      { id: "contract-completion", name: "Drafting the sale contract, exchange (Law Society formulae), pre-completion (finance, apportionments) & completion", highYield: 5, formerNames: ["Contract, exchange & completion"] },
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
      { id: "express-trusts", name: "Express trusts: certainties, formalities, constitution (Re Rose, Strong v Bird, Choithram v Pagarani)", highYield: 5, formerNames: ["Express trusts: certainties & formalities"] },
      { id: "resulting-constructive", name: "Automatic & presumed resulting trusts; constructive trusts", highYield: 5, formerNames: ["Resulting & constructive trusts"] },
      { id: "trustees-duties", name: "Trustees' powers & duties", highYield: 4 },
      { id: "breach-remedies", name: "Breach of trust & equitable remedies", highYield: 4 },
      { id: "tracing", name: "Tracing & liability of strangers (knowing receipt, dishonest assistance)", highYield: 4, formerNames: ["Tracing & third-party liability"] },
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
      { id: "police-powers", name: "Police station: PACE powers, lawful interview under Code C, role of the defence solicitor", highYield: 5, formerNames: ["Police powers & PACE"] },
      { id: "pre-charge", name: "Pre-charge advice & detention", highYield: 4 },
      { id: "bail-first-hearings", name: "Applying for and opposing bail; first hearings; criminal legal aid", highYield: 4, formerNames: ["Bail & first hearings"] },
      { id: "plea-allocation", name: "Plea & allocation", highYield: 4 },
      { id: "trial-evidence", name: "Trial procedure & evidence: burden of proof, hearsay (challenging admissibility), confessions (s.76), s.78 exclusion, bad character, good character", highYield: 5, formerNames: ["Trial procedure & evidence (incl. bad character/hearsay)"] },
      { id: "sentencing-appeals", name: "Sentencing (incl. Newton hearings: applicability and procedure) & appeals", highYield: 3, formerNames: ["Sentencing & appeals"] },
      { id: "youths", name: "Youth court procedure, hearings & sentencing guidelines", highYield: 2, formerNames: ["Youths in the criminal justice system"] },
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
      { id: "validity", name: "Validity of wills (incl. knowledge and approval, burden of proof), codicils, alteration & revocation (incl. effect of divorce/dissolution)", highYield: 5, formerNames: ["Validity & execution of wills"] },
      { id: "intestacy", name: "Intestacy rules & 1975 Act claims (grounds and factors the court considers)", highYield: 4, formerNames: ["Intestacy rules & family provision"] },
      { id: "iht", name: "IHT: lifetime transfers (chargeable, PETs, gifts with reservation), death estate, burden, liability & incidence", highYield: 5, formerNames: ["IHT planning & calculation"] },
      { id: "administration", name: "Grants (NCPR priority, application & evidence), PRs' appointment, duties before distribution & protection from liability", highYield: 4, formerNames: ["Estate administration & PRs' duties"] },
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

/** SRA Functioning Legal Knowledge version these topic names follow. */
export const SQE_FLK_VERSION = {
  id: "flk-2026-09",
  appliesFrom: "2026-09-01",
  source: "https://sqe.sra.org.uk/assessments/sqe1-assessments/sqe1-specification/sqe-changes-sept-2026",
} as const;

/** Map a saved subtopic name (current or pre-September-2026) to today's name. */
export function resolveSqeSubtopicName(name: string): string {
  for (const subject of SQE_SYLLABUS) {
    for (const st of subject.subtopics) {
      if (st.name === name || st.formerNames?.includes(name)) return st.name;
    }
  }
  return name;
}

export function getSubject(id: string): SQESubject | undefined {
  return SQE_SYLLABUS.find((s) => s.id === id);
}

export function getSubjectByName(name: string): SQESubject | undefined {
  const norm = name.toLowerCase().trim();
  return SQE_SYLLABUS.find(
    (s) => s.name.toLowerCase() === norm || s.id === norm,
  );
}

/**
 * Subjects for one FLK paper. Ethics & Professional Conduct is assessed in
 * BOTH papers (its primary tag is FLK1), so it is always included.
 */
export function getSubjectsForPaper(paper: FLKPaper): SQESubject[] {
  return SQE_SYLLABUS.filter((s) => s.paper === paper || s.id === "ethics");
}

export type ExamPath =
  | "SQE1_FULL"
  | "FLK1"
  | "FLK2"
  | "SQE2"
  | "CUSTOM";

export const SQE2_SKILL_MODULES = [
  "Client Interviewing & Attendance Note",
  "Advocacy",
  "Case & Matter Analysis",
  "Legal Research",
  "Legal Writing",
  "Legal Drafting",
];

/**
 * Returns the canonical subject name list for a given exam path.
 * For CUSTOM, returns all SQE1 subjects as a default starter set —
 * the UI lets the user prune from there.
 */
export function getSubjectsForPath(path: ExamPath): { name: string; paper?: FLKPaper }[] {
  switch (path) {
    case "FLK1":
      return getSubjectsForPaper("FLK1").map((s) => ({ name: s.name, paper: "FLK1" }));
    case "FLK2":
      return getSubjectsForPaper("FLK2").map((s) => ({ name: s.name, paper: "FLK2" }));
    case "SQE1_FULL":
      return SQE_SYLLABUS.map((s) => ({ name: s.name, paper: s.paper }));
    case "SQE2":
      return SQE2_SKILL_MODULES.map((name) => ({ name }));
    case "CUSTOM":
    default:
      return SQE_SYLLABUS.map((s) => ({ name: s.name, paper: s.paper }));
  }
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
