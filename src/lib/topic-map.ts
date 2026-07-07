// Full SQE1 + UBE topic-map data. The syllabus structure is declared as a
// compact raw definition then expanded into typed `ExamMap` objects with
// deterministic mock values for confidence / accuracy / recency etc.
// Deterministic = same topic always gets the same mock values, so the UI
// looks stable across renders without needing persistence yet.

export type SubTopicStatus = "untouched" | "weak" | "medium" | "strong";
export type SubjectStatus =
  | "weak-spot"
  | "improving"
  | "needs-practice"
  | "on-track";
export type SubTopicPriority = "must" | "should" | "optional";
export type RecommendedAction = "quiz" | "revise" | "add-to-plan";

export interface SubTopic {
  id: string;
  name: string;
  microTopics?: string[];
  confidence: SubTopicStatus;
  accuracy: number | null; // 0..100
  timeSpentMin: number;
  lastRevisedDaysAgo: number | null; // null = untouched
  priority: SubTopicPriority;
  highYield?: boolean;
  recommendedAction: RecommendedAction;
  // Denormalised for filter/search:
  subject: string;
  chapter: string;
  component: string;
  exam: ExamId;
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
  progress: number; // 0..100
  status: SubjectStatus;
  chapters: Chapter[];
}

export interface ExamComponent {
  id: string;
  name: string;
  subjects: Subject[];
}

export type ExamId = "SQE1" | "UBE";

export interface ExamMap {
  exam: ExamId;
  label: string;
  components: ExamComponent[];
}

// ---------- Raw syllabus definitions ----------------------------------------

type RawSubTopic = string | [string, string[]]; // name or [name, microTopics]
type RawChapter = [string, RawSubTopic[]];
type RawSubject = [string, string | undefined, RawChapter[]]; // name, short, chapters
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
              [
                "Pre-action",
                ["Limitation", "ADR", "Pre-action protocols"],
              ],
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
              [
                "Case management",
                ["Interim applications", "Case management", "Disclosure"],
              ],
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
                [
                  "Misrepresentation",
                  "Mistake",
                  "Duress",
                  "Undue influence",
                  "Illegality",
                ],
              ],
              [
                "Discharge",
                ["Performance", "Breach", "Frustration", "Agreement"],
              ],
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
                [
                  "Duty of care",
                  "Breach",
                  "Causation",
                  "Remoteness",
                  "Defences",
                ],
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
                [
                  "Sources of law",
                  "Court hierarchy",
                  "Precedent",
                  "Statutory interpretation",
                ],
              ],
              [
                "Personnel",
                ["Judiciary", "Legal profession", "Legal aid"],
              ],
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
                [
                  "Standing",
                  "Illegality",
                  "Irrationality",
                  "Procedural impropriety",
                  "Remedies",
                ],
              ],
              [
                "Human rights",
                ["HRA 1998", "Convention rights", "Proportionality"],
              ],
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
                [
                  "Freehold transactions",
                  "Leasehold transactions",
                  "Commercial leases",
                ],
              ],
              [
                "Title & searches",
                [
                  "Registered title",
                  "Unregistered title",
                  "Searches and enquiries",
                  "Land Registry",
                ],
              ],
              [
                "Completion",
                ["Exchange", "Completion", "Post-completion"],
              ],
              [
                "Tax & finance",
                ["SDLT", "Mortgages", "Property taxation", "Planning"],
              ],
            ],
          ],
          [
            "Wills & Administration of Estates",
            "Wills",
            [
              [
                "Wills",
                [
                  "Valid wills",
                  "Testamentary capacity",
                  "Formalities",
                  "Codicils",
                  "Revocation",
                ],
              ],
              [
                "Intestacy & PRs",
                [
                  "Intestacy",
                  "Personal representatives",
                  "Grants of representation",
                ],
              ],
              [
                "Administration",
                ["IHT", "Estate administration", "Claims against estates"],
              ],
            ],
          ],
          [
            "Solicitors Accounts",
            "Accounts",
            [
              [
                "Client money",
                [
                  "Client money",
                  "Client account",
                  "Business account",
                  "Office money",
                  "Mixed payments",
                ],
              ],
              [
                "Movements",
                ["Withdrawals", "Bills", "Transfers", "Interest"],
              ],
              [
                "Controls",
                ["Breaches", "Reconciliations", "Ledgers"],
              ],
            ],
          ],
          [
            "Land Law",
            undefined,
            [
              [
                "Estates & interests",
                [
                  "Estates and interests",
                  "Registered land",
                  "Unregistered land",
                ],
              ],
              [
                "Ownership",
                ["Co-ownership", "Trusts of land", "Adverse possession"],
              ],
              [
                "Third-party rights",
                [
                  "Easements",
                  "Freehold covenants",
                  "Mortgages",
                  "Leases",
                ],
              ],
            ],
          ],
          [
            "Trusts",
            undefined,
            [
              [
                "Creation",
                [
                  "Express trusts",
                  "Three certainties",
                  "Formalities",
                  "Constitution",
                ],
              ],
              [
                "Types of trust",
                [
                  "Resulting trusts",
                  "Constructive trusts",
                  "Proprietary estoppel",
                  "Charitable trusts",
                ],
              ],
              [
                "Administration",
                [
                  "Trustees' duties",
                  "Trustees' powers",
                  "Breach of trust",
                  "Tracing",
                ],
              ],
            ],
          ],
          [
            "Criminal Liability",
            "Crim Law",
            [
              [
                "General principles",
                [
                  "Actus reus",
                  "Mens rea",
                  "Causation",
                  "Strict liability",
                ],
              ],
              [
                "Homicide & assaults",
                [
                  "Murder",
                  "Manslaughter",
                  "Assault",
                  "Battery",
                  "ABH",
                  "GBH",
                ],
              ],
              [
                "Property offences",
                [
                  "Theft",
                  "Robbery",
                  "Burglary",
                  "Fraud",
                  "Criminal damage",
                ],
              ],
              [
                "Extensions & defences",
                ["Defences", "Attempts", "Parties"],
              ],
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
                [
                  "Bail",
                  "First hearings",
                  "Mode of trial",
                  "Allocation",
                  "Plea before venue",
                ],
              ],
              [
                "Trial preparation",
                ["Disclosure", "Bad character", "Hearsay"],
              ],
              [
                "Trial & after",
                [
                  "Trial procedure",
                  "Sentencing",
                  "Appeals",
                  "Youth court",
                ],
              ],
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
                [
                  "Personal jurisdiction",
                  "Subject matter jurisdiction",
                  "Venue",
                  "Erie doctrine",
                ],
              ],
              [
                "Pleadings & parties",
                ["Pleadings", "Joinder", "Discovery"],
              ],
              [
                "Adjudication",
                [
                  "Summary judgment",
                  "Jury trial",
                  "Motions",
                  "Verdicts and judgments",
                ],
              ],
              [
                "Review & preclusion",
                ["Appeals", "Claim preclusion", "Issue preclusion"],
              ],
            ],
          ],
          [
            "Constitutional Law",
            "Con Law",
            [
              [
                "Structure of government",
                [
                  "Judicial review",
                  "Federalism",
                  "Separation of powers",
                  "Commerce Clause",
                ],
              ],
              [
                "Individual rights",
                [
                  "State action",
                  "Due process",
                  "Equal protection",
                  "First Amendment",
                  "Takings",
                ],
              ],
            ],
          ],
          [
            "Contracts & Sales",
            "K & Sales",
            [
              [
                "Formation & defences",
                [
                  "Formation",
                  "Consideration",
                  "Defences",
                  "Statute of Frauds",
                ],
              ],
              [
                "Terms & performance",
                [
                  "Parol evidence",
                  "Interpretation",
                  "Conditions",
                  "Breach",
                ],
              ],
              [
                "UCC Article 2",
                [
                  "UCC Article 2",
                  "Warranties",
                  "Risk of loss",
                  "Remedies",
                ],
              ],
            ],
          ],
          [
            "Criminal Law & Procedure",
            "Crim",
            [
              [
                "Substantive crimes",
                [
                  "Homicide",
                  "Theft crimes",
                  "Inchoate offences",
                  "Parties",
                  "Defences",
                ],
              ],
              [
                "Constitutional criminal procedure",
                [
                  "Fourth Amendment",
                  "Fifth Amendment",
                  "Sixth Amendment",
                  "Miranda",
                  "Exclusionary rule",
                ],
              ],
            ],
          ],
          [
            "Evidence",
            undefined,
            [
              [
                "Relevance & character",
                [
                  "Relevance",
                  "Character evidence",
                  "Impeachment",
                ],
              ],
              [
                "Witnesses & hearsay",
                [
                  "Witnesses",
                  "Hearsay",
                  "Hearsay exceptions",
                  "Privileges",
                ],
              ],
              [
                "Documents & experts",
                [
                  "Expert evidence",
                  "Authentication",
                  "Best evidence",
                ],
              ],
            ],
          ],
          [
            "Real Property",
            "Property",
            [
              [
                "Ownership & estates",
                [
                  "Ownership",
                  "Present estates",
                  "Future interests",
                  "Co-ownership",
                ],
              ],
              [
                "Land use",
                [
                  "Landlord and tenant",
                  "Easements",
                  "Covenants",
                  "Zoning",
                ],
              ],
              [
                "Transfers & title",
                ["Mortgages", "Recording acts", "Adverse possession"],
              ],
            ],
          ],
          [
            "Torts",
            undefined,
            [
              [
                "Intentional torts",
                ["Intentional torts", "Defences"],
              ],
              [
                "Negligence",
                ["Negligence", "Causation"],
              ],
              [
                "Strict & products",
                ["Strict liability", "Products liability"],
              ],
              [
                "Other torts",
                [
                  "Nuisance",
                  "Defamation",
                  "Privacy torts",
                  "Economic torts",
                ],
              ],
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
              [
                "Entities",
                ["Partnerships", "Corporations", "LLCs"],
              ],
              [
                "Governance",
                [
                  "Fiduciary duties",
                  "Directors and officers",
                  "Shareholders",
                  "Derivative suits",
                ],
              ],
              [
                "Corporate events",
                ["Piercing the corporate veil", "Mergers and dissolution"],
              ],
            ],
          ],
          [
            "Civil Procedure",
            undefined,
            [
              [
                "Jurisdiction & Erie",
                [
                  "Personal jurisdiction",
                  "Subject matter jurisdiction",
                  "Venue",
                  "Erie doctrine",
                ],
              ],
              [
                "Litigation lifecycle",
                [
                  "Pleadings",
                  "Joinder",
                  "Discovery",
                  "Summary judgment",
                ],
              ],
              [
                "Post-trial",
                ["Appeals", "Claim preclusion", "Issue preclusion"],
              ],
            ],
          ],
          [
            "Constitutional Law",
            "Con Law",
            [
              [
                "Structure",
                [
                  "Judicial review",
                  "Federalism",
                  "Separation of powers",
                  "Commerce Clause",
                ],
              ],
              [
                "Rights",
                [
                  "State action",
                  "Due process",
                  "Equal protection",
                  "First Amendment",
                  "Takings",
                ],
              ],
            ],
          ],
          [
            "Contracts & Sales",
            "K & Sales",
            [
              [
                "Formation",
                [
                  "Formation",
                  "Consideration",
                  "Defences",
                  "Statute of Frauds",
                ],
              ],
              [
                "Interpretation & breach",
                [
                  "Parol evidence",
                  "Interpretation",
                  "Conditions",
                  "Breach",
                  "Remedies",
                ],
              ],
              [
                "UCC Article 2",
                ["UCC Article 2", "Warranties", "Risk of loss"],
              ],
            ],
          ],
          [
            "Criminal Law & Procedure",
            "Crim",
            [
              [
                "Substantive crimes",
                [
                  "Homicide",
                  "Theft crimes",
                  "Inchoate offences",
                  "Parties",
                  "Defences",
                ],
              ],
              [
                "Constitutional criminal procedure",
                [
                  "Fourth Amendment",
                  "Fifth Amendment",
                  "Sixth Amendment",
                  "Miranda",
                  "Exclusionary rule",
                ],
              ],
            ],
          ],
          [
            "Evidence",
            undefined,
            [
              [
                "Relevance & witnesses",
                [
                  "Relevance",
                  "Character evidence",
                  "Impeachment",
                  "Witnesses",
                ],
              ],
              [
                "Hearsay & privileges",
                ["Hearsay", "Hearsay exceptions", "Privileges"],
              ],
              [
                "Documents",
                [
                  "Expert evidence",
                  "Authentication",
                  "Best evidence",
                ],
              ],
            ],
          ],
          [
            "Real Property",
            "Property",
            [
              [
                "Estates",
                [
                  "Ownership",
                  "Present estates",
                  "Future interests",
                  "Co-ownership",
                ],
              ],
              [
                "Land use",
                ["Landlord and tenant", "Easements", "Covenants"],
              ],
              [
                "Transfers",
                ["Mortgages", "Recording acts", "Adverse possession"],
              ],
            ],
          ],
          [
            "Torts",
            undefined,
            [
              [
                "Intentional & negligence",
                [
                  "Intentional torts",
                  "Negligence",
                  "Causation",
                  "Defences",
                ],
              ],
              [
                "Strict & products",
                ["Strict liability", "Products liability"],
              ],
              [
                "Other",
                [
                  "Nuisance",
                  "Defamation",
                  "Privacy torts",
                  "Economic torts",
                ],
              ],
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
              [
                "Memos & briefs",
                [
                  "Objective memo",
                  "Persuasive brief",
                  "Brief writing",
                ],
              ],
              [
                "Letters",
                ["Client letter", "Demand letter"],
              ],
              [
                "Drafting",
                ["Contract drafting"],
              ],
            ],
          ],
          [
            "Analytical skills",
            "Skills",
            [
              [
                "File & library",
                ["File analysis", "Library analysis", "Rule extraction"],
              ],
              [
                "Application",
                ["Factual application", "Time management"],
              ],
            ],
          ],
        ],
      ],
    ],
  },
};

// ---------- Deterministic mock generator -------------------------------------

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pick<T>(str: string, arr: T[], offset = 0): T {
  return arr[(hash(str) + offset) % arr.length];
}
function pickInt(str: string, min: number, max: number, offset = 0): number {
  const range = max - min + 1;
  return min + ((hash(str) + offset) % range);
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
];

function isHighYield(name: string): boolean {
  const n = name.toLowerCase();
  return HIGH_YIELD_KEYWORDS.some((k) => n.includes(k));
}

function makeSubTopic(
  raw: RawSubTopic,
  parents: { exam: ExamId; component: string; subject: string; chapter: string },
): SubTopic {
  const [name, micros] = Array.isArray(raw) ? raw : [raw, undefined];
  const key = `${parents.exam}|${parents.subject}|${parents.chapter}|${name}`;
  const confidence = pick<SubTopicStatus>(key, [
    "untouched",
    "weak",
    "weak",
    "medium",
    "medium",
    "strong",
  ]);
  const highYield = isHighYield(name);
  const priority: SubTopicPriority = highYield
    ? "must"
    : pick<SubTopicPriority>(key, ["should", "should", "must", "optional"], 3);
  const accuracy =
    confidence === "untouched"
      ? null
      : confidence === "weak"
        ? pickInt(key, 32, 55, 1)
        : confidence === "medium"
          ? pickInt(key, 56, 74, 1)
          : pickInt(key, 75, 94, 1);
  const timeSpentMin =
    confidence === "untouched" ? 0 : pickInt(key, 15, 180, 2);
  const lastRevisedDaysAgo =
    confidence === "untouched"
      ? null
      : confidence === "weak"
        ? pickInt(key, 8, 22, 4)
        : confidence === "medium"
          ? pickInt(key, 3, 12, 4)
          : pickInt(key, 1, 7, 4);
  const recommendedAction: RecommendedAction =
    confidence === "untouched"
      ? "add-to-plan"
      : confidence === "weak"
        ? "quiz"
        : "revise";
  return {
    id: `${parents.exam}-${slug(parents.subject)}-${slug(parents.chapter)}-${slug(name)}`,
    name,
    microTopics: micros,
    confidence,
    accuracy,
    timeSpentMin,
    lastRevisedDaysAgo,
    priority,
    highYield,
    recommendedAction,
    subject: parents.subject,
    chapter: parents.chapter,
    component: parents.component,
    exam: parents.exam,
  };
}

function subjectStatus(chapters: Chapter[]): {
  status: SubjectStatus;
  progress: number;
} {
  const subs = chapters.flatMap((c) => c.subTopics);
  const total = subs.length || 1;
  const strong = subs.filter((s) => s.confidence === "strong").length;
  const medium = subs.filter((s) => s.confidence === "medium").length;
  const weak = subs.filter((s) => s.confidence === "weak").length;
  const untouched = subs.filter((s) => s.confidence === "untouched").length;
  const progress = Math.round(
    ((strong * 100 + medium * 65 + weak * 30) / (total * 100)) * 100,
  );
  let status: SubjectStatus;
  if (weak + untouched > total * 0.5) status = "weak-spot";
  else if (weak > total * 0.3) status = "needs-practice";
  else if (medium > strong) status = "improving";
  else status = "on-track";
  return { status, progress };
}

function buildExamMap(examId: ExamId): ExamMap {
  const raw = RAW[examId];
  const components: ExamComponent[] = raw.components.map(
    ([componentName, subjects]) => ({
      id: `${examId}-${slug(componentName)}`,
      name: componentName,
      subjects: subjects.map(([subjectName, shortName, chapters]) => {
        const chapterObjs: Chapter[] = chapters.map(([chapterName, subTopics]) => ({
          id: `${examId}-${slug(subjectName)}-${slug(chapterName)}`,
          name: chapterName,
          subTopics: subTopics.map((st) =>
            makeSubTopic(st, {
              exam: examId,
              component: componentName,
              subject: subjectName,
              chapter: chapterName,
            }),
          ),
        }));
        const { status, progress } = subjectStatus(chapterObjs);
        return {
          id: `${examId}-${slug(subjectName)}`,
          name: subjectName,
          shortName,
          progress,
          status,
          chapters: chapterObjs,
        };
      }),
    }),
  );
  return { exam: examId, label: raw.label, components };
}

export const TOPIC_MAPS: Record<ExamId, ExamMap> = {
  SQE1: buildExamMap("SQE1"),
  UBE: buildExamMap("UBE"),
};

// Back-compat alias — earlier code imports MOCK_TOPIC_MAP.
export const MOCK_TOPIC_MAP: ExamMap = TOPIC_MAPS.SQE1;

// ---------- Derivations ------------------------------------------------------

export function flatSubjects(map: ExamMap): Subject[] {
  return map.components.flatMap((c) => c.subjects);
}

export function flatSubTopics(map: ExamMap): SubTopic[] {
  return flatSubjects(map).flatMap((s) =>
    s.chapters.flatMap((c) => c.subTopics),
  );
}

export function coverage(map: ExamMap): {
  mappedPct: number;
  untouchedCount: number;
  totalCount: number;
} {
  const all = flatSubTopics(map);
  const untouched = all.filter((s) => s.confidence === "untouched").length;
  const mappedPct = all.length
    ? Math.round(((all.length - untouched) / all.length) * 100)
    : 0;
  return { mappedPct, untouchedCount: untouched, totalCount: all.length };
}

export function weakestSubject(map: ExamMap): Subject | null {
  const subjects = flatSubjects(map);
  const ranked = [...subjects].sort((a, b) => a.progress - b.progress);
  return ranked[0] ?? null;
}

export function weakSubTopicNames(subject: Subject, limit = 2): string[] {
  return subject.chapters
    .flatMap((c) => c.subTopics)
    .filter((s) => s.confidence === "weak" || s.confidence === "untouched")
    .slice(0, limit)
    .map((s) => s.name);
}

export function todaysPriority(
  map: ExamMap,
): { subject: Subject; sub: SubTopic } | null {
  const subjects = flatSubjects(map);
  for (const s of subjects) {
    for (const c of s.chapters) {
      for (const sub of c.subTopics) {
        if (sub.priority === "must" && sub.highYield && sub.confidence !== "strong") {
          return { subject: s, sub };
        }
      }
    }
  }
  const first = subjects[0]?.chapters[0]?.subTopics[0];
  return first ? { subject: subjects[0], sub: first } : null;
}

/** Weakest sub-topics across the whole map, sorted by (weak > untouched > medium) and low accuracy. */
export function weakestSubTopics(map: ExamMap, limit = 3): SubTopic[] {
  const weight = (s: SubTopic) =>
    s.confidence === "weak" ? 0 : s.confidence === "untouched" ? 1 : 2;
  return [...flatSubTopics(map)]
    .sort((a, b) => {
      const w = weight(a) - weight(b);
      if (w !== 0) return w;
      return (a.accuracy ?? 100) - (b.accuracy ?? 100);
    })
    .slice(0, limit);
}

/** Topics that have been studied but not revisited recently (>=7 days). */
export function dueForRecall(map: ExamMap, limit = 3): SubTopic[] {
  return [...flatSubTopics(map)]
    .filter((s) => (s.lastRevisedDaysAgo ?? 0) >= 7 && s.confidence !== "untouched")
    .sort((a, b) => (b.lastRevisedDaysAgo ?? 0) - (a.lastRevisedDaysAgo ?? 0))
    .slice(0, limit);
}

/** Untouched high-priority topics. */
export function untouchedTopics(map: ExamMap, limit = 3): SubTopic[] {
  return [...flatSubTopics(map)]
    .filter((s) => s.confidence === "untouched")
    .sort((a, b) => {
      // must-do first, then high-yield
      const p = (x: SubTopic) => (x.priority === "must" ? 0 : x.priority === "should" ? 1 : 2);
      const pd = p(a) - p(b);
      if (pd !== 0) return pd;
      return Number(b.highYield ?? false) - Number(a.highYield ?? false);
    })
    .slice(0, limit);
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
      return s.confidence === "weak";
    case "untouched":
      return s.confidence === "untouched";
    case "due-for-recall":
      return (s.lastRevisedDaysAgo ?? 0) >= 7 && s.confidence !== "untouched";
    case "high-yield":
      return Boolean(s.highYield);
    case "improving":
      return s.confidence === "medium";
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
    coveragePct: cov.mappedPct,
    weakSpots: all.filter((s) => s.confidence === "weak").length,
    untouched: cov.untouchedCount,
    dueThisWeek: all.filter(
      (s) => (s.lastRevisedDaysAgo ?? 0) >= 7 && s.confidence !== "untouched",
    ).length,
  };
}
