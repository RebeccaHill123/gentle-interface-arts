// Static syllabus + user-progress layer.
//
// Layer 1 (`SyllabusSubTopic`, etc.) is exam structure only — no accuracy,
// no confidence, no study time. Safe to render for any user.
//
// Layer 2 (`UserTopicProgress`) is real activity, keyed by sub-topic id.
// A `SubTopic` view is Layer 1 + optional Layer 2 + derived status.
// If a user has no activity, the derived fields stay null so the UI can
// show honest empty states instead of invented metrics.

export type UserExamType = "SQE1" | "SQE2" | "UBE" | "MPRE";
export type ExamId = "SQE1" | "UBE";

/** Map the onboarding `examType` to a Topic Map id. */
export function getUserExamId(examType?: string | null): ExamId {
  if (!examType) return "SQE1";
  if (examType === "UBE" || examType === "MPRE") return "UBE";
  return "SQE1";
}

export type SubTopicPriority = "must" | "should" | "optional";
export type RecommendedAction = "quiz" | "revise" | "add-to-plan" | "start";

/** Honest, evidence-based status labels. */
export type TopicStatus =
  | "not-started"
  | "studied"
  | "not-enough-data"
  | "weak"
  | "improving"
  | "strong"
  | "due-for-recall"
  | "high-yield";

// ---------- Layer 1: syllabus ------------------------------------------------

export interface SyllabusSubTopic {
  id: string;
  name: string;
  microTopics?: string[];
  isHighYield: boolean;
  defaultPriority: SubTopicPriority;
  subject: string;
  chapter: string;
  component: string;
  exam: ExamId;
}

export interface SyllabusChapter {
  id: string;
  name: string;
  subTopics: SyllabusSubTopic[];
}

export interface SyllabusSubject {
  id: string;
  name: string;
  shortName?: string;
  chapters: SyllabusChapter[];
}

export interface SyllabusComponent {
  id: string;
  name: string;
  subjects: SyllabusSubject[];
}

export interface Syllabus {
  exam: ExamId;
  label: string;
  components: SyllabusComponent[];
}

// ---------- Layer 2: user progress -------------------------------------------

export interface UserTopicProgress {
  timeSpentMinutes: number;
  questionsAttempted: number;
  questionsCorrect: number;
  lastStudiedAt: string | null; // ISO
  manualConfidence: "weak" | "improving" | "strong" | null;
  bookmarked?: boolean;
  addedToPlan?: boolean;
  completedSessionsCount?: number;
}

/** Recall threshold in days. */
export const RECALL_THRESHOLD_DAYS = 7;
export const MIN_QUESTIONS_FOR_CONFIDENCE = 10;

// ---------- Views (Layer 1 + Layer 2 + derived) ------------------------------

export interface SubTopic extends SyllabusSubTopic {
  progress: UserTopicProgress | null;
  accuracy: number | null;
  lastRevisedDaysAgo: number | null;
  status: TopicStatus;
  recommendedAction: RecommendedAction;
}

export interface Chapter {
  id: string;
  name: string;
  subTopics: SubTopic[];
}

export interface Subject {
  id: string;
  name: string;
  shortName?: string;
  chapters: Chapter[];
  /** minutes summed from real sessions on this subject; 0 = none */
  timeSpentMinutes: number;
  /** true if any sub-topic has activity or subject-level minutes */
  hasActivity: boolean;
  status: TopicStatus;
}

export interface ExamComponent {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface ExamMap {
  exam: ExamId;
  label: string;
  components: ExamComponent[];
}

// ---------- Raw syllabus definitions ----------------------------------------

type RawSubTopic = string | [string, string[]]; // name or [name, microTopics]
type RawChapter = [string, RawSubTopic[]];
type RawSubject = [string, string | undefined, RawChapter[]];
type RawComponent = [string, RawSubject[]];
type RawExam = { label: string; components: RawComponent[] };

const RAW: Record<ExamId, RawExam> = {
  SQE1: {
    label: "SQE1",
    components: [
      [
        "FLK1",
        [
          [
            "Business Law & Practice",
            "BLP",
            [
              [
                "Business organisations",
                [
                  "Sole trader",
                  "Partnerships",
                  "LLPs",
                  "Private limited companies",
                  "Public companies",
                  "Separate legal personality",
                  "Limited liability",
                ],
              ],
              [
                "Company formation",
                [
                  "Incorporation",
                  "Articles of association",
                  "Model articles",
                  "Share capital",
                  "Companies House filings",
                  "Company registers",
                ],
              ],
              [
                "Corporate governance",
                [
                  ["Directors' duties", ["s.171-177 CA 2006", "Conflicts", "Ratification"]],
                  "Directors' powers",
                  "Appointment and removal of directors",
                  "Board meetings",
                  "Shareholder decision-making",
                  "Written resolutions",
                  "Ordinary and special resolutions",
                  "Conflicts of interest",
                  "Substantial property transactions",
                  "Minority shareholder protection",
                ],
              ],
              [
                "Company finance",
                [
                  "Debt finance",
                  "Equity finance",
                  "Security",
                  "Fixed and floating charges",
                  "Dividends and distributions",
                  "Financial assistance",
                ],
              ],
              [
                "Insolvency",
                [
                  "Administration",
                  "Liquidation",
                  "CVAs",
                  "Receivership",
                  "Wrongful trading",
                  "Fraudulent trading",
                  "Preferences",
                  "Transactions at an undervalue",
                  "Priority of creditors",
                ],
              ],
              [
                "Business taxation",
                [
                  "Income tax",
                  "Corporation tax",
                  "Capital gains tax",
                  "VAT",
                  "Inheritance tax and business property relief",
                ],
              ],
            ],
          ],
          [
            "Dispute Resolution",
            "DR",
            [
              ["Pre-action", ["Limitation", "ADR", "Pre-action protocols"]],
              [
                "Commencing proceedings",
                [
                  "Issuing claims",
                  "Service",
                  "Acknowledgement of service",
                  "Defence and reply",
                  "Statements of case",
                ],
              ],
              ["Case management", ["Interim applications", "Case management", "Disclosure"]],
              [
                "Evidence & trial",
                [
                  "Evidence",
                  "Witness statements",
                  "Expert evidence",
                  "Part 36 offers",
                  "Trial",
                ],
              ],
              ["Post-trial", ["Costs", "Appeals", "Enforcement"]],
            ],
          ],
          [
            "Contract",
            undefined,
            [
              [
                "Formation",
                [
                  "Offer",
                  "Acceptance",
                  "Consideration",
                  "Intention to create legal relations",
                  "Certainty",
                ],
              ],
              [
                "Terms",
                [
                  "Express terms",
                  "Implied terms",
                  "Conditions, warranties and innominate terms",
                  "Exclusion clauses",
                  "Incorporation",
                  "Interpretation",
                  "UCTA",
                  "Consumer Rights Act",
                ],
              ],
              [
                "Vitiating factors",
                ["Misrepresentation", "Mistake", "Duress", "Undue influence", "Illegality"],
              ],
              ["Discharge", ["Performance", "Breach", "Frustration", "Agreement"]],
              [
                "Remedies",
                [
                  "Damages",
                  "Remoteness",
                  "Mitigation",
                  "Specific performance",
                  "Injunctions",
                  "Liquidated damages and penalties",
                ],
              ],
            ],
          ],
          [
            "Tort",
            undefined,
            [
              [
                "Negligence",
                ["Duty of care", "Breach", "Causation", "Remoteness", "Defences"],
              ],
              ["Occupiers' liability", ["Occupiers' liability"]],
              ["Vicarious liability", ["Vicarious liability"]],
              ["Product liability", ["Product liability"]],
              ["Nuisance", ["Nuisance"]],
              ["Rylands v Fletcher", ["Rylands v Fletcher"]],
              ["Economic loss", ["Economic loss"]],
              ["Psychiatric harm", ["Psychiatric harm"]],
              ["Employers' liability", ["Employers' liability"]],
            ],
          ],
          [
            "Legal System",
            undefined,
            [
              [
                "Sources & courts",
                ["Sources of law", "Court hierarchy", "Precedent", "Statutory interpretation"],
              ],
              ["Personnel", ["Judiciary", "Legal profession", "Legal aid"]],
            ],
          ],
          [
            "Constitutional & Administrative Law",
            "Con & Admin",
            [
              [
                "Constitutional principles",
                [
                  "Rule of law",
                  "Parliamentary sovereignty",
                  "Separation of powers",
                  "Royal prerogative",
                ],
              ],
              [
                "Judicial review",
                ["Standing", "Illegality", "Irrationality", "Procedural impropriety", "Remedies"],
              ],
              ["Human rights", ["HRA 1998", "Convention rights", "Proportionality"]],
            ],
          ],
          [
            "Legal Services",
            undefined,
            [
              [
                "Regulation",
                [
                  "SRA regulatory framework",
                  "Reserved legal activities",
                  "Money laundering",
                  "Financial services",
                ],
              ],
            ],
          ],
          [
            "Ethics & Professional Conduct",
            "Ethics",
            [
              [
                "SRA Principles & Codes",
                [
                  "SRA Principles",
                  "Code of Conduct for Solicitors",
                  "Client care",
                  "Confidentiality and disclosure",
                  "Conflicts of interest",
                  "Undertakings",
                ],
              ],
            ],
          ],
        ],
      ],
      [
        "FLK2",
        [
          [
            "Property Practice",
            "Property",
            [
              [
                "Transactions",
                ["Freehold transactions", "Leasehold transactions", "Commercial leases"],
              ],
              [
                "Title & searches",
                ["Registered title", "Unregistered title", "Searches and enquiries", "Land Registry"],
              ],
              ["Completion", ["Exchange", "Completion", "Post-completion"]],
              ["Tax & finance", ["SDLT", "Mortgages", "Property taxation", "Planning"]],
            ],
          ],
          [
            "Wills & Administration of Estates",
            "Wills",
            [
              [
                "Wills",
                ["Valid wills", "Testamentary capacity", "Formalities", "Codicils", "Revocation"],
              ],
              [
                "Intestacy & PRs",
                ["Intestacy", "Personal representatives", "Grants of representation"],
              ],
              ["Administration", ["IHT", "Estate administration", "Claims against estates"]],
            ],
          ],
          [
            "Solicitors Accounts",
            "Accounts",
            [
              [
                "Client money",
                ["Client money", "Client account", "Business account", "Office money", "Mixed payments"],
              ],
              ["Movements", ["Withdrawals", "Bills", "Transfers", "Interest"]],
              ["Controls", ["Breaches", "Reconciliations", "Ledgers"]],
            ],
          ],
          [
            "Land Law",
            undefined,
            [
              ["Estates & interests", ["Estates and interests", "Registered land", "Unregistered land"]],
              ["Ownership", ["Co-ownership", "Trusts of land", "Adverse possession"]],
              ["Third-party rights", ["Easements", "Freehold covenants", "Mortgages", "Leases"]],
            ],
          ],
          [
            "Trusts",
            undefined,
            [
              ["Creation", ["Express trusts", "Three certainties", "Formalities", "Constitution"]],
              [
                "Types of trust",
                ["Resulting trusts", "Constructive trusts", "Proprietary estoppel", "Charitable trusts"],
              ],
              ["Administration", ["Trustees' duties", "Trustees' powers", "Breach of trust", "Tracing"]],
            ],
          ],
          [
            "Criminal Liability",
            "Crim Law",
            [
              ["General principles", ["Actus reus", "Mens rea", "Causation", "Strict liability"]],
              ["Homicide & assaults", ["Murder", "Manslaughter", "Assault", "Battery", "ABH", "GBH"]],
              ["Property offences", ["Theft", "Robbery", "Burglary", "Fraud", "Criminal damage"]],
              ["Extensions & defences", ["Defences", "Attempts", "Parties"]],
            ],
          ],
          [
            "Criminal Practice",
            "Crim Prac",
            [
              [
                "Police station",
                [
                  "Police station advice",
                  "Arrest",
                  "Detention",
                  "Right to silence",
                  "Identification evidence",
                ],
              ],
              [
                "Bail & first hearings",
                ["Bail", "First hearings", "Mode of trial", "Allocation", "Plea before venue"],
              ],
              ["Trial preparation", ["Disclosure", "Bad character", "Hearsay"]],
              ["Trial & after", ["Trial procedure", "Sentencing", "Appeals", "Youth court"]],
            ],
          ],
          [
            "Ethics & Professional Conduct",
            "Ethics",
            [
              [
                "Applied in FLK2 contexts",
                [
                  "Ethics in property",
                  "Ethics in litigation",
                  "Ethics in wills",
                  "Ethics in criminal practice",
                ],
              ],
            ],
          ],
        ],
      ],
    ],
  },
  UBE: {
    label: "UBE",
    components: [
      [
        "MBE",
        [
          [
            "Civil Procedure",
            undefined,
            [
              [
                "Jurisdiction & venue",
                ["Personal jurisdiction", "Subject matter jurisdiction", "Venue", "Erie doctrine"],
              ],
              ["Pleadings & parties", ["Pleadings", "Joinder", "Discovery"]],
              [
                "Adjudication",
                ["Summary judgment", "Jury trial", "Motions", "Verdicts and judgments"],
              ],
              ["Review & preclusion", ["Appeals", "Claim preclusion", "Issue preclusion"]],
            ],
          ],
          [
            "Constitutional Law",
            "Con Law",
            [
              [
                "Structure of government",
                ["Judicial review", "Federalism", "Separation of powers", "Commerce Clause"],
              ],
              [
                "Individual rights",
                ["State action", "Due process", "Equal protection", "First Amendment", "Takings"],
              ],
            ],
          ],
          [
            "Contracts & Sales",
            "K & Sales",
            [
              ["Formation & defences", ["Formation", "Consideration", "Defences", "Statute of Frauds"]],
              ["Terms & performance", ["Parol evidence", "Interpretation", "Conditions", "Breach"]],
              ["UCC Article 2", ["UCC Article 2", "Warranties", "Risk of loss", "Remedies"]],
            ],
          ],
          [
            "Criminal Law & Procedure",
            "Crim",
            [
              [
                "Substantive crimes",
                ["Homicide", "Theft crimes", "Inchoate offences", "Parties", "Defences"],
              ],
              [
                "Constitutional criminal procedure",
                ["Fourth Amendment", "Fifth Amendment", "Sixth Amendment", "Miranda", "Exclusionary rule"],
              ],
            ],
          ],
          [
            "Evidence",
            undefined,
            [
              ["Relevance & character", ["Relevance", "Character evidence", "Impeachment"]],
              ["Witnesses & hearsay", ["Witnesses", "Hearsay", "Hearsay exceptions", "Privileges"]],
              ["Documents & experts", ["Expert evidence", "Authentication", "Best evidence"]],
            ],
          ],
          [
            "Real Property",
            "Property",
            [
              ["Ownership & estates", ["Ownership", "Present estates", "Future interests", "Co-ownership"]],
              ["Land use", ["Landlord and tenant", "Easements", "Covenants", "Zoning"]],
              ["Transfers & title", ["Mortgages", "Recording acts", "Adverse possession"]],
            ],
          ],
          [
            "Torts",
            undefined,
            [
              ["Intentional torts", ["Intentional torts", "Defences"]],
              ["Negligence", ["Negligence", "Causation"]],
              ["Strict & products", ["Strict liability", "Products liability"]],
              ["Other torts", ["Nuisance", "Defamation", "Privacy torts", "Economic torts"]],
            ],
          ],
        ],
      ],
      [
        "MEE",
        [
          [
            "Business Associations",
            "Bus Assoc",
            [
              [
                "Agency",
                [
                  "Agency",
                  "Actual authority",
                  "Apparent authority",
                  "Ratification",
                  "Vicarious liability",
                ],
              ],
              ["Entities", ["Partnerships", "Corporations", "LLCs"]],
              [
                "Governance",
                ["Fiduciary duties", "Directors and officers", "Shareholders", "Derivative suits"],
              ],
              ["Corporate events", ["Piercing the corporate veil", "Mergers and dissolution"]],
            ],
          ],
          [
            "Civil Procedure",
            undefined,
            [
              [
                "Jurisdiction & Erie",
                ["Personal jurisdiction", "Subject matter jurisdiction", "Venue", "Erie doctrine"],
              ],
              ["Litigation lifecycle", ["Pleadings", "Joinder", "Discovery", "Summary judgment"]],
              ["Post-trial", ["Appeals", "Claim preclusion", "Issue preclusion"]],
            ],
          ],
          [
            "Constitutional Law",
            "Con Law",
            [
              ["Structure", ["Judicial review", "Federalism", "Separation of powers", "Commerce Clause"]],
              [
                "Rights",
                ["State action", "Due process", "Equal protection", "First Amendment", "Takings"],
              ],
            ],
          ],
          [
            "Contracts & Sales",
            "K & Sales",
            [
              ["Formation", ["Formation", "Consideration", "Defences", "Statute of Frauds"]],
              [
                "Interpretation & breach",
                ["Parol evidence", "Interpretation", "Conditions", "Breach", "Remedies"],
              ],
              ["UCC Article 2", ["UCC Article 2", "Warranties", "Risk of loss"]],
            ],
          ],
          [
            "Criminal Law & Procedure",
            "Crim",
            [
              [
                "Substantive crimes",
                ["Homicide", "Theft crimes", "Inchoate offences", "Parties", "Defences"],
              ],
              [
                "Constitutional criminal procedure",
                ["Fourth Amendment", "Fifth Amendment", "Sixth Amendment", "Miranda", "Exclusionary rule"],
              ],
            ],
          ],
          [
            "Evidence",
            undefined,
            [
              ["Relevance & witnesses", ["Relevance", "Character evidence", "Impeachment", "Witnesses"]],
              ["Hearsay & privileges", ["Hearsay", "Hearsay exceptions", "Privileges"]],
              ["Documents", ["Expert evidence", "Authentication", "Best evidence"]],
            ],
          ],
          [
            "Real Property",
            "Property",
            [
              ["Estates", ["Ownership", "Present estates", "Future interests", "Co-ownership"]],
              ["Land use", ["Landlord and tenant", "Easements", "Covenants"]],
              ["Transfers", ["Mortgages", "Recording acts", "Adverse possession"]],
            ],
          ],
          [
            "Torts",
            undefined,
            [
              ["Intentional & negligence", ["Intentional torts", "Negligence", "Causation", "Defences"]],
              ["Strict & products", ["Strict liability", "Products liability"]],
              ["Other", ["Nuisance", "Defamation", "Privacy torts", "Economic torts"]],
            ],
          ],
        ],
      ],
      [
        "MPT",
        [
          [
            "Written work products",
            "Documents",
            [
              ["Memos & briefs", ["Objective memo", "Persuasive brief", "Brief writing"]],
              ["Letters", ["Client letter", "Demand letter"]],
              ["Drafting", ["Contract drafting"]],
            ],
          ],
          [
            "Analytical skills",
            "Skills",
            [
              ["File & library", ["File analysis", "Library analysis", "Rule extraction"]],
              ["Application", ["Factual application", "Time management"]],
            ],
          ],
        ],
      ],
    ],
  },
};

// ---------- Building the static syllabus ------------------------------------

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const HIGH_YIELD_KEYWORDS = [
  "director",
  "formation",
  "negligence",
  "insolvency",
  "hearsay",
  "commerce",
  "personal jurisdiction",
  "mortgage",
  "intestacy",
  "actus",
  "mens",
  "consideration",
  "murder",
  "theft",
  "occupier",
  "constitution",
  "iht",
  "damages",
  "easement",
  "agency",
  "future interests",
  "equal protection",
];

function isHighYield(name: string): boolean {
  const n = name.toLowerCase();
  return HIGH_YIELD_KEYWORDS.some((k) => n.includes(k));
}

function buildSyllabus(examId: ExamId): Syllabus {
  const raw = RAW[examId];
  const components: SyllabusComponent[] = raw.components.map(
    ([componentName, subjects]) => ({
      id: `${examId}-${slug(componentName)}`,
      name: componentName,
      subjects: subjects.map(([subjectName, shortName, chapters]) => ({
        id: `${examId}-${slug(subjectName)}`,
        name: subjectName,
        shortName,
        chapters: chapters.map(([chapterName, subTopics]) => ({
          id: `${examId}-${slug(subjectName)}-${slug(chapterName)}`,
          name: chapterName,
          subTopics: subTopics.map((st) => {
            const [name, micros] = Array.isArray(st) ? st : [st, undefined];
            const highYield = isHighYield(name);
            return {
              id: `${examId}-${slug(subjectName)}-${slug(chapterName)}-${slug(name)}`,
              name,
              microTopics: micros,
              isHighYield: highYield,
              defaultPriority: highYield ? "must" : "should",
              subject: subjectName,
              chapter: chapterName,
              component: componentName,
              exam: examId,
            };
          }),
        })),
      })),
    }),
  );
  return { exam: examId, label: raw.label, components };
}

export const SYLLABUSES: Record<ExamId, Syllabus> = {
  SQE1: buildSyllabus("SQE1"),
  UBE: buildSyllabus("UBE"),
};

// ---------- Deriving status from real progress ------------------------------

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return null;
  return Math.max(0, Math.floor((Date.now() - d) / 86_400_000));
}

function deriveSubTopic(
  s: SyllabusSubTopic,
  p: UserTopicProgress | null,
): SubTopic {
  if (!p) {
    return {
      ...s,
      progress: null,
      accuracy: null,
      lastRevisedDaysAgo: null,
      status: s.isHighYield ? "high-yield" : "not-started",
      recommendedAction: p === null && s.isHighYield ? "add-to-plan" : "start",
    };
  }
  const accuracy =
    p.questionsAttempted > 0
      ? Math.round((p.questionsCorrect / p.questionsAttempted) * 100)
      : null;
  const last = daysAgo(p.lastStudiedAt);
  const dueForRecall =
    last !== null && last >= RECALL_THRESHOLD_DAYS && (p.timeSpentMinutes > 0 || p.questionsAttempted > 0);
  let status: TopicStatus;
  if (p.manualConfidence) {
    status = p.manualConfidence;
  } else if (p.questionsAttempted >= MIN_QUESTIONS_FOR_CONFIDENCE && accuracy !== null) {
    if (accuracy >= 75) status = "strong";
    else if (accuracy >= 60) status = "improving";
    else status = "weak";
  } else if (p.questionsAttempted > 0) {
    status = "not-enough-data";
  } else if (p.timeSpentMinutes > 0) {
    status = "studied";
  } else {
    status = s.isHighYield ? "high-yield" : "not-started";
  }
  // "Due for recall" overrides only when there's existing study/quiz activity.
  if (dueForRecall && status !== "weak" && status !== "not-started") {
    status = "due-for-recall";
  }
  let recommendedAction: RecommendedAction;
  if (status === "weak" || status === "not-enough-data") recommendedAction = "quiz";
  else if (status === "due-for-recall" || status === "improving" || status === "strong")
    recommendedAction = "revise";
  else if (status === "studied") recommendedAction = "quiz";
  else recommendedAction = "start";
  return {
    ...s,
    progress: p,
    accuracy,
    lastRevisedDaysAgo: last,
    status,
    recommendedAction,
  };
}

function deriveSubjectStatus(subs: SubTopic[], subjectMinutes: number): TopicStatus {
  const started = subs.filter((s) => s.progress !== null);
  if (started.length === 0 && subjectMinutes === 0) return "not-started";
  const weak = started.filter((s) => s.status === "weak").length;
  const strong = started.filter((s) => s.status === "strong").length;
  const improving = started.filter((s) => s.status === "improving").length;
  const due = started.filter((s) => s.status === "due-for-recall").length;
  if (weak >= Math.max(2, started.length * 0.3)) return "weak";
  if (due > 0) return "due-for-recall";
  if (improving > strong) return "improving";
  if (strong > 0) return "strong";
  return "studied";
}

/** Build a full ExamMap view from the static syllabus + a progress map. */
export function buildExamMap(
  examId: ExamId,
  progress: Map<string, UserTopicProgress> = new Map(),
  subjectMinutes: Map<string, number> = new Map(),
): ExamMap {
  const s = SYLLABUSES[examId];
  const components: ExamComponent[] = s.components.map((c) => ({
    id: c.id,
    name: c.name,
    subjects: c.subjects.map((subj) => {
      const chapters: Chapter[] = subj.chapters.map((ch) => ({
        id: ch.id,
        name: ch.name,
        subTopics: ch.subTopics.map((st) => deriveSubTopic(st, progress.get(st.id) ?? null)),
      }));
      const allSubs = chapters.flatMap((c) => c.subTopics);
      const mins = subjectMinutes.get(subj.name) ?? 0;
      const hasActivity = mins > 0 || allSubs.some((s) => s.progress !== null);
      return {
        id: subj.id,
        name: subj.name,
        shortName: subj.shortName,
        chapters,
        timeSpentMinutes: mins,
        hasActivity,
        status: deriveSubjectStatus(allSubs, mins),
      };
    }),
  }));
  return { exam: examId, label: s.label, components };
}

// ---------- Derivations for UI ----------------------------------------------

export function flatSubjects(map: ExamMap): Subject[] {
  return map.components.flatMap((c) => c.subjects);
}
export function flatSubTopics(map: ExamMap): SubTopic[] {
  return flatSubjects(map).flatMap((s) => s.chapters.flatMap((c) => c.subTopics));
}

export function coverage(map: ExamMap): {
  startedPct: number;
  startedCount: number;
  untouchedCount: number;
  totalCount: number;
} {
  const all = flatSubTopics(map);
  const started = all.filter((s) => s.progress !== null).length;
  return {
    startedPct: all.length ? Math.round((started / all.length) * 100) : 0,
    startedCount: started,
    untouchedCount: all.length - started,
    totalCount: all.length,
  };
}

/** Real weak spots: only sub-topics with actual weak-status derived from real data. */
export function realWeakSpots(map: ExamMap, limit = 3): SubTopic[] {
  return flatSubTopics(map)
    .filter((s) => s.status === "weak")
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100))
    .slice(0, limit);
}

/** Real due-for-recall: prior study/quiz activity + last revised >= threshold. */
export function realDueForRecall(map: ExamMap, limit = 3): SubTopic[] {
  return flatSubTopics(map)
    .filter((s) => s.status === "due-for-recall")
    .sort((a, b) => (b.lastRevisedDaysAgo ?? 0) - (a.lastRevisedDaysAgo ?? 0))
    .slice(0, limit);
}

/** Untouched — syllabus coverage is real, always safe to show. */
export function untouchedTopics(map: ExamMap, limit = 3): SubTopic[] {
  return flatSubTopics(map)
    .filter((s) => s.progress === null)
    .sort((a, b) => {
      // must + high-yield first
      const p = (x: SubTopic) => (x.defaultPriority === "must" ? 0 : x.defaultPriority === "should" ? 1 : 2);
      const pd = p(a) - p(b);
      if (pd !== 0) return pd;
      return Number(b.isHighYield) - Number(a.isHighYield);
    })
    .slice(0, limit);
}

/** Suggested "priority" for a new user with no activity — a high-yield untouched topic. */
export function suggestedPriority(map: ExamMap): SubTopic | null {
  const started = flatSubTopics(map).find((s) => s.status === "weak" || s.status === "due-for-recall");
  if (started) return started;
  return untouchedTopics(map, 1)[0] ?? null;
}

/** Filter helpers used by the Topic Map page. */
export type TopicFilter =
  | "all"
  | "weak-spots"
  | "untouched"
  | "due-for-recall"
  | "high-yield"
  | "improving";

export function matchesFilter(s: SubTopic, filter: TopicFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "weak-spots":
      return s.status === "weak";
    case "untouched":
      return s.progress === null;
    case "due-for-recall":
      return s.status === "due-for-recall";
    case "high-yield":
      return s.isHighYield;
    case "improving":
      return s.status === "improving";
  }
}

export function matchesSearch(s: SubTopic, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    s.name.toLowerCase().includes(needle) ||
    s.subject.toLowerCase().includes(needle) ||
    s.chapter.toLowerCase().includes(needle) ||
    (s.microTopics ?? []).some((m) => m.toLowerCase().includes(needle))
  );
}

/** Summary numbers for the top-of-page cards. */
export function examSummary(map: ExamMap): {
  coveragePct: number;
  weakSpots: number;
  untouched: number;
  dueThisWeek: number;
} {
  const all = flatSubTopics(map);
  const cov = coverage(map);
  return {
    coveragePct: cov.startedPct,
    weakSpots: all.filter((s) => s.status === "weak").length,
    untouched: cov.untouchedCount,
    dueThisWeek: all.filter((s) => s.status === "due-for-recall").length,
  };
}

// ---------- Progress helpers from existing plan-store sessions ---------------

/**
 * Aggregate subject-level minutes from raw sessions. Sub-topic level metrics
 * are not derived because we don't yet track topics on sessions.
 */
export function aggregateSubjectMinutes(
  sessions: { minutes: number; module?: string | null }[] | undefined,
): Map<string, number> {
  const m = new Map<string, number>();
  if (!sessions) return m;
  for (const s of sessions) {
    if (!s.module) continue;
    m.set(s.module, (m.get(s.module) ?? 0) + s.minutes);
  }
  return m;
}
