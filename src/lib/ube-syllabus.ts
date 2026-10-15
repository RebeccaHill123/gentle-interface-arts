// UBE (Uniform Bar Exam) syllabus — the academic backbone of Tentra's adaptive
// planner for US bar candidates (incl. NY Bar). Subjects, weights and high-yield
// scores are calibrated from NCBE Subject Matter Outlines, MBE/MEE/MPT scoring
// weights (MBE 50%, MEE 30%, MPT 20%) and historical question-frequency analysis.
//
// - weight: share of the relevant component (0-1, sums to ~1.0 per component)
// - highYield: 1-5 (5 = appears nearly every administration / heavy mark-share)
// - groups: related-subject clusters for interleaved/mixed practice

export type UBEComponent = "MBE" | "MEE" | "MPT";

export interface UBESubTopic {
  id: string;
  name: string;
  highYield: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}

export interface UBESubject {
  id: string;
  name: string;
  component: UBEComponent; // primary component
  alsoTestedOn?: UBEComponent[]; // e.g. MBE subjects are also fair game on MEE
  weight: number; // share within its primary component
  highYield: 1 | 2 | 3 | 4 | 5;
  groups: string[];
  subtopics: UBESubTopic[];
}

export const UBE_TOPIC_GROUPS: Record<string, { name: string; subjects: string[] }> = {
  "civil-litigation": { name: "Civil Litigation", subjects: ["civil-procedure", "evidence"] },
  "commercial": { name: "Commercial", subjects: ["contracts", "business-associations"] },
  "crim": { name: "Criminal", subjects: ["criminal-law-procedure", "evidence"] },
  "property-estates": { name: "Property & Estates", subjects: ["real-property"] },
  "public-law": { name: "Public Law", subjects: ["constitutional-law"] },
  "skills": { name: "Lawyering Skills", subjects: ["mpt"] },
};

export const UBE_SYLLABUS: UBESubject[] = [
  // ===== MBE subjects (each ~1/7 of the MBE; all also fair game on MEE) =====
  {
    id: "civil-procedure",
    name: "Civil Procedure",
    component: "MBE",
    alsoTestedOn: ["MEE"],
    weight: 1 / 7,
    highYield: 5,
    groups: ["civil-litigation"],
    subtopics: [
      { id: "sm-jurisdiction", name: "Subject-matter jurisdiction (federal question, diversity, supplemental, removal)", highYield: 5 },
      { id: "personal-jurisdiction", name: "Personal jurisdiction & venue (incl. transfer)", highYield: 5 },
      { id: "erie", name: "Erie doctrine & choice of law in federal court", highYield: 4 },
      { id: "pleadings", name: "Pleadings, amendments & Rule 12 motions", highYield: 4 },
      { id: "joinder-class", name: "Joinder, intervention & class actions", highYield: 3 },
      { id: "discovery", name: "Discovery scope, privileges & sanctions", highYield: 4 },
      { id: "summary-judgment", name: "Summary judgment & pretrial adjudication", highYield: 4 },
      { id: "trial-jnov", name: "Jury trial, JMOL/JNOV & new trial", highYield: 3 },
      { id: "preclusion", name: "Claim & issue preclusion", highYield: 5 },
      { id: "appeals", name: "Appellate jurisdiction & final-judgment rule", highYield: 3 },
    ],
  },
  {
    id: "constitutional-law",
    name: "Constitutional Law",
    component: "MBE",
    alsoTestedOn: ["MEE"],
    weight: 1 / 7,
    highYield: 5,
    groups: ["public-law"],
    subtopics: [
      { id: "judicial-power", name: "Judicial power: standing, ripeness, mootness, political question", highYield: 5 },
      { id: "federalism", name: "Federalism, Commerce Clause & dormant Commerce Clause", highYield: 5 },
      { id: "separation", name: "Separation of powers", highYield: 3 },
      { id: "state-action", name: "State action & individual rights doctrine", highYield: 4 },
      { id: "equal-protection", name: "Equal Protection & levels of scrutiny", highYield: 5 },
      { id: "due-process", name: "Procedural & substantive Due Process", highYield: 5 },
      { id: "1a-speech", name: "First Amendment — speech, assembly & forum analysis", highYield: 5 },
      { id: "1a-religion", name: "First Amendment — Establishment & Free Exercise", highYield: 4 },
      { id: "takings", name: "Takings & Contracts Clauses", highYield: 3 },
    ],
  },
  {
    id: "contracts",
    name: "Contracts & Sales (UCC Art. 2)",
    component: "MBE",
    alsoTestedOn: ["MEE"],
    weight: 1 / 7,
    highYield: 5,
    groups: ["commercial"],
    subtopics: [
      { id: "formation-k", name: "Formation: offer, acceptance, consideration; UCC vs common law", highYield: 5 },
      { id: "defenses-formation", name: "Defenses to formation: SOF, capacity, mistake, misrep, duress, unconscionability", highYield: 5 },
      { id: "terms-pe", name: "Terms, parol evidence & UCC gap-fillers", highYield: 4 },
      { id: "performance-breach", name: "Performance, breach & perfect tender", highYield: 5 },
      { id: "warranties", name: "UCC warranties (express, merchantability, fitness) & disclaimers", highYield: 4 },
      { id: "remedies-k", name: "Remedies: expectation, reliance, restitution, UCC seller/buyer remedies", highYield: 5 },
      { id: "third-party", name: "Third-party beneficiaries, assignment & delegation", highYield: 3 },
      { id: "discharge", name: "Discharge: impossibility, impracticability, frustration", highYield: 3 },
    ],
  },
  {
    id: "criminal-law-procedure",
    name: "Criminal Law & Procedure",
    component: "MBE",
    alsoTestedOn: ["MEE"],
    weight: 1 / 7,
    highYield: 5,
    groups: ["crim"],
    subtopics: [
      { id: "homicide", name: "Homicide: common-law murder, felony murder, manslaughter", highYield: 5 },
      { id: "inchoate", name: "Inchoate offenses & accomplice liability", highYield: 4 },
      { id: "defenses-crim", name: "Defenses: self-defense, insanity, intoxication, duress", highYield: 4 },
      { id: "4a-search", name: "4th Amendment: search, seizure & exclusionary rule", highYield: 5 },
      { id: "5a-confessions", name: "5th Amendment & Miranda; confessions", highYield: 5 },
      { id: "6a-counsel", name: "6th Amendment: right to counsel & confrontation", highYield: 4 },
      { id: "lineups", name: "Identification procedures & lineups", highYield: 3 },
      { id: "trial-rights", name: "Trial rights, double jeopardy & guilty pleas", highYield: 3 },
    ],
  },
  {
    id: "evidence",
    name: "Evidence (FRE)",
    component: "MBE",
    alsoTestedOn: ["MEE"],
    weight: 1 / 7,
    highYield: 5,
    groups: ["civil-litigation", "crim"],
    subtopics: [
      { id: "relevance", name: "Relevance & FRE 403 balancing", highYield: 5 },
      { id: "character", name: "Character, habit & prior acts (FRE 404/405/406/608/609)", highYield: 5 },
      { id: "hearsay", name: "Hearsay definition & non-hearsay categories", highYield: 5 },
      { id: "hearsay-exceptions", name: "Hearsay exceptions: 803, 804 & residual", highYield: 5 },
      { id: "confrontation", name: "Confrontation Clause & testimonial statements", highYield: 4 },
      { id: "privileges", name: "Privileges (atty-client, spousal, work product)", highYield: 4 },
      { id: "impeachment", name: "Impeachment & rehabilitation of witnesses", highYield: 4 },
      { id: "authentication", name: "Authentication, best-evidence rule & writings", highYield: 3 },
      { id: "expert", name: "Lay & expert opinion (Daubert)", highYield: 3 },
    ],
  },
  {
    id: "real-property",
    name: "Real Property",
    component: "MBE",
    alsoTestedOn: ["MEE"],
    weight: 1 / 7,
    highYield: 5,
    groups: ["property-estates"],
    subtopics: [
      { id: "estates-future", name: "Estates in land & future interests (incl. RAP)", highYield: 5 },
      { id: "concurrent", name: "Concurrent estates: tenancy in common, joint tenancy, tenancy by entirety", highYield: 4 },
      { id: "landlord-tenant", name: "Landlord-tenant: tenancies, duties, assignment/sublease", highYield: 4 },
      { id: "easements", name: "Easements, covenants & equitable servitudes", highYield: 5 },
      { id: "adverse-possession", name: "Adverse possession & boundary disputes", highYield: 3 },
      { id: "conveyancing", name: "Conveyancing: contracts, deeds, marketable title, merger", highYield: 5 },
      { id: "recording", name: "Recording acts (race, notice, race-notice) & BFP doctrine", highYield: 5 },
      { id: "mortgages", name: "Mortgages: priority, transfer, foreclosure, equitable conversion", highYield: 5 },
      { id: "zoning", name: "Zoning, eminent domain & land-use basics", highYield: 2 },
    ],
  },
  {
    id: "torts",
    name: "Torts",
    component: "MBE",
    alsoTestedOn: ["MEE"],
    weight: 1 / 7,
    highYield: 5,
    groups: ["civil-litigation"],
    subtopics: [
      { id: "intentional-torts", name: "Intentional torts & defenses", highYield: 5 },
      { id: "negligence", name: "Negligence: duty, breach, causation, damages", highYield: 5 },
      { id: "special-duties", name: "Special duties: NIED, premises liability, rescuers", highYield: 4 },
      { id: "strict-liability", name: "Strict liability: animals & abnormally dangerous activities", highYield: 3 },
      { id: "products", name: "Products liability (negligence, strict, warranty)", highYield: 5 },
      { id: "defamation", name: "Defamation & First Amendment limits", highYield: 4 },
      { id: "privacy", name: "Privacy, misrepresentation & economic torts", highYield: 3 },
      { id: "nuisance-vicarious", name: "Nuisance & vicarious liability", highYield: 3 },
      { id: "damages-defenses", name: "Damages, comparative fault & joint liability", highYield: 4 },
    ],
  },

  // ===== MEE-exclusive subjects =====
  {
    id: "business-associations",
    name: "Business Associations (Agency, Partnership, Corporations, LLCs)",
    component: "MEE",
    weight: 0.17,
    highYield: 5,
    groups: ["commercial"],
    subtopics: [
      { id: "agency", name: "Agency: actual & apparent authority, ratification, liability", highYield: 5 },
      { id: "partnership", name: "General & limited partnerships; fiduciary duties", highYield: 4 },
      { id: "corp-formation", name: "Corporate formation, promoters & piercing the veil", highYield: 4 },
      { id: "directors-officers", name: "Directors & officers: BJR, duty of care, duty of loyalty", highYield: 5 },
      { id: "shareholders", name: "Shareholder rights, derivative suits & voting", highYield: 4 },
      { id: "fundamental-changes", name: "Mergers, dissolution & fundamental changes", highYield: 3 },
      { id: "llc", name: "LLCs: formation, management & member duties", highYield: 4 },
    ],
  },

  // ===== MPT (skills) =====
  {
    id: "mpt",
    name: "Multistate Performance Test (MPT)",
    component: "MPT",
    weight: 1.0,
    highYield: 5,
    groups: ["skills"],
    subtopics: [
      { id: "issue-spotting", name: "Issue spotting from a closed library & file", highYield: 5 },
      { id: "fact-analysis", name: "Fact analysis & evidence weighing", highYield: 5 },
      { id: "objective-memo", name: "Objective office memo format", highYield: 5 },
      { id: "persuasive-brief", name: "Persuasive brief / motion format", highYield: 5 },
      { id: "client-letter", name: "Client letter & advisory writing", highYield: 4 },
      { id: "statute-interp", name: "Statute & regulation interpretation under time pressure", highYield: 4 },
      { id: "case-synthesis", name: "Case synthesis from provided authorities only", highYield: 5 },
      { id: "closing-argument", name: "Closing argument & opening statement drafting", highYield: 3 },
    ],
  },
];

/**
 * Subjects NCBE stopped testing on the MEE from the July 2026 bar exam
 * (ncbex.org/exams/mee/preparing-mee). Kept only so saved plans can be cleaned.
 */
export const UBE_RETIRED_SUBJECT_PATTERNS = [
  /conflict of laws/i,
  /family law/i,
  /trusts\s*(&|and)\s*estates/i,
  /secured transactions/i,
];

export function isRetiredUbeSubject(name: string | undefined | null): boolean {
  if (!name) return false;
  return UBE_RETIRED_SUBJECT_PATTERNS.some((re) => re.test(name));
}

export type UBEExamPath = "UBE_FULL" | "UBE_MBE" | "UBE_ESSAYS" | "UBE_MPT";

export function getUbeSubject(id: string): UBESubject | undefined {
  return UBE_SYLLABUS.find((s) => s.id === id);
}

export function getUbeSubjectByName(name: string): UBESubject | undefined {
  const norm = name.toLowerCase().trim();
  return UBE_SYLLABUS.find(
    (s) => s.name.toLowerCase() === norm || s.id === norm,
  );
}

export function getUbeSubjectsForComponent(component: UBEComponent): UBESubject[] {
  return UBE_SYLLABUS.filter(
    (s) => s.component === component || s.alsoTestedOn?.includes(component),
  );
}

/**
 * Returns the canonical subject name list for a given UBE path.
 * UBE_FULL = MBE + MEE-exclusive + MPT.
 */
export function getSubjectsForUbePath(path: UBEExamPath): { name: string; component?: UBEComponent }[] {
  switch (path) {
    case "UBE_MBE":
      return UBE_SYLLABUS.filter((s) => s.component === "MBE").map((s) => ({ name: s.name, component: "MBE" as const }));
    case "UBE_ESSAYS":
      // MEE (July 2026+): 7 MBE subjects + Business Associations
      return UBE_SYLLABUS.filter((s) => s.component !== "MPT").map((s) => ({ name: s.name, component: s.component }));
    case "UBE_MPT":
      return UBE_SYLLABUS.filter((s) => s.component === "MPT").map((s) => ({ name: s.name, component: "MPT" as const }));
    case "UBE_FULL":
    default:
      return UBE_SYLLABUS.map((s) => ({ name: s.name, component: s.component }));
  }
}
