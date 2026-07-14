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
            "Civ Pro",
            [
              [
                "Subject-matter jurisdiction",
                [
                  ["Federal question", ["Well-pleaded complaint rule", "Arising under jurisdiction"]],
                  ["Diversity jurisdiction", ["Complete diversity", "Amount in controversy", "Aggregation"]],
                  "Supplemental jurisdiction",
                  "Removal & remand",
                  "Amount in controversy calculations",
                ],
              ],
              [
                "Personal jurisdiction & venue",
                [
                  ["Personal jurisdiction", ["Traditional bases", "Minimum contacts", "Specific vs general", "Stream of commerce"]],
                  "Long-arm statutes",
                  "Service of process",
                  "Venue & forum non conveniens",
                  "Transfer of venue (§1404 / §1406)",
                ],
              ],
              [
                "Erie doctrine & choice of law",
                [
                  "Erie doctrine",
                  "Substance vs procedure",
                  "Hanna analysis",
                  "Federal common law",
                ],
              ],
              [
                "Pleadings & motions",
                [
                  ["Complaint & Rule 8", ["Notice pleading", "Twombly/Iqbal plausibility"]],
                  "Answer & affirmative defences",
                  "Rule 12 motions",
                  "Amendments & relation back",
                  "Rule 11 sanctions",
                ],
              ],
              [
                "Joinder, intervention & class actions",
                [
                  "Compulsory & permissive joinder",
                  "Impleader (Rule 14)",
                  "Interpleader",
                  "Intervention (Rule 24)",
                  ["Rule 23 class actions", ["Numerosity", "Commonality", "Typicality", "Adequacy", "23(b)(1)/(2)/(3)"]],
                ],
              ],
              [
                "Discovery",
                [
                  "Scope of discovery",
                  "Depositions & interrogatories",
                  "Requests for production & admissions",
                  ["Privileges & work product", ["Attorney-client privilege", "Work product doctrine"]],
                  "Sanctions & spoliation",
                ],
              ],
              [
                "Adjudication before trial",
                [
                  "Summary judgment",
                  "Default & default judgment",
                  "Voluntary & involuntary dismissal",
                  "Pretrial conferences",
                ],
              ],
              [
                "Trial",
                [
                  "Right to jury trial",
                  "Jury selection",
                  ["JMOL & renewed JMOL", ["Rule 50(a)", "Rule 50(b)"]],
                  "New trial motions",
                  "Rule 60 relief from judgment",
                ],
              ],
              [
                "Appeals",
                [
                  "Final judgment rule",
                  "Interlocutory appeals",
                  "Standards of review",
                  "Appellate jurisdiction",
                ],
              ],
              [
                "Preclusion",
                [
                  ["Claim preclusion (res judicata)", ["Same claim", "Same parties", "Final judgment on merits"]],
                  ["Issue preclusion (collateral estoppel)", ["Actually litigated", "Necessary to judgment", "Mutuality"]],
                ],
              ],
            ],
          ],
          [
            "Constitutional Law",
            "Con Law",
            [
              [
                "Judicial power",
                [
                  "Article III standing",
                  "Ripeness & mootness",
                  "Political question doctrine",
                  "Eleventh Amendment & sovereign immunity",
                  "Adequate & independent state grounds",
                ],
              ],
              [
                "Federalism & Commerce Clause",
                [
                  ["Commerce Clause", ["Channels", "Instrumentalities", "Substantial effects"]],
                  "Dormant Commerce Clause",
                  "10th Amendment & anti-commandeering",
                  "Spending Clause conditions",
                  "Preemption",
                ],
              ],
              [
                "Separation of powers",
                [
                  "Executive power & appointments",
                  "Congressional power to investigate",
                  "Non-delegation",
                  "Impeachment & removal",
                  "Foreign affairs & war powers",
                ],
              ],
              [
                "State action & incorporation",
                [
                  "State action doctrine",
                  "Public function & entanglement",
                  "Incorporation of the Bill of Rights",
                ],
              ],
              [
                "Equal Protection",
                [
                  ["Levels of scrutiny", ["Strict", "Intermediate", "Rational basis"]],
                  "Race & national origin classifications",
                  "Sex-based classifications",
                  "Fundamental rights strand",
                  "Alienage & illegitimacy",
                ],
              ],
              [
                "Due Process",
                [
                  "Procedural due process (Mathews)",
                  ["Substantive due process", ["Privacy", "Marriage", "Family", "Bodily autonomy"]],
                  "Economic liberties",
                ],
              ],
              [
                "First Amendment — Speech",
                [
                  ["Content-based vs content-neutral", ["Strict scrutiny", "Intermediate scrutiny"]],
                  "Prior restraint & vagueness/overbreadth",
                  "Unprotected & low-value speech",
                  "Symbolic speech (O'Brien)",
                  ["Public forum doctrine", ["Traditional", "Designated", "Limited", "Nonpublic"]],
                  "Commercial speech",
                ],
              ],
              [
                "First Amendment — Religion",
                [
                  "Establishment Clause",
                  "Free Exercise Clause",
                  "Ministerial exception",
                ],
              ],
              [
                "Takings & other clauses",
                [
                  ["Takings Clause", ["Per se takings", "Regulatory takings", "Public use", "Just compensation"]],
                  "Contracts Clause",
                  "Ex post facto & bills of attainder",
                  "Privileges & Immunities",
                ],
              ],
            ],
          ],
          [
            "Contracts & Sales (UCC Art. 2)",
            "K & Sales",
            [
              [
                "Applicable law",
                [
                  "Common law vs UCC Art. 2",
                  "Predominant purpose test",
                  "Merchants vs non-merchants",
                ],
              ],
              [
                "Formation",
                [
                  ["Offer", ["Definite terms", "Advertisements", "Revocation", "Option contracts"]],
                  ["Acceptance", ["Mailbox rule", "Mirror image rule", "UCC 2-207 battle of the forms"]],
                  ["Consideration", ["Bargained-for exchange", "Promissory estoppel", "Past & moral consideration"]],
                ],
              ],
              [
                "Defences to formation",
                [
                  ["Statute of Frauds", ["Suretyship", "Marriage", "One year", "UCC $500", "Land"]],
                  "Capacity",
                  ["Mistake", ["Mutual", "Unilateral"]],
                  ["Misrepresentation", ["Fraudulent", "Negligent", "Innocent"]],
                  "Duress & undue influence",
                  "Unconscionability & illegality",
                ],
              ],
              [
                "Terms & interpretation",
                [
                  "Parol evidence rule",
                  "Course of dealing / performance / trade usage",
                  ["UCC gap-fillers", ["Price", "Delivery", "Time for performance", "Warranties"]],
                  "Modification (common law vs UCC)",
                ],
              ],
              [
                "Performance & breach",
                [
                  "Conditions (express, implied, constructive)",
                  ["Material vs minor breach", ["Substantial performance"]],
                  "Perfect tender rule & cure",
                  "Anticipatory repudiation",
                  "Risk of loss",
                ],
              ],
              [
                "Warranties",
                [
                  "Express warranties",
                  "Implied warranty of merchantability",
                  "Implied warranty of fitness for particular purpose",
                  "Disclaimers & limitations",
                ],
              ],
              [
                "Remedies",
                [
                  ["Damages", ["Expectation", "Consequential", "Incidental", "Reliance", "Restitution"]],
                  ["Buyer's remedies (UCC)", ["Cover", "Market damages"]],
                  ["Seller's remedies (UCC)", ["Resale", "Lost profits", "Action for price"]],
                  "Specific performance & injunctions",
                  "Liquidated damages",
                ],
              ],
              [
                "Third parties & discharge",
                [
                  "Third-party beneficiaries",
                  "Assignment & delegation",
                  "Impossibility & impracticability",
                  "Frustration of purpose",
                  "Accord & satisfaction; novation",
                ],
              ],
            ],
          ],
          [
            "Criminal Law & Procedure",
            "Crim",
            [
              [
                "Elements of crimes",
                [
                  "Actus reus",
                  ["Mens rea", ["Purposeful", "Knowing", "Reckless", "Negligent", "Strict liability"]],
                  "Concurrence & causation",
                  "Merger doctrine",
                ],
              ],
              [
                "Homicide",
                [
                  "Common-law murder",
                  ["Statutory murder degrees", ["First-degree", "Second-degree"]],
                  ["Manslaughter", ["Voluntary (heat of passion)", "Involuntary"]],
                  "Felony murder rule",
                ],
              ],
              [
                "Other crimes against persons & property",
                [
                  "Assault & battery",
                  "Kidnapping & false imprisonment",
                  "Rape & sexual offences",
                  ["Property offences", ["Larceny", "Embezzlement", "False pretenses", "Robbery", "Burglary", "Arson"]],
                ],
              ],
              [
                "Inchoate crimes & parties",
                [
                  ["Attempt", ["Substantial step", "Impossibility"]],
                  ["Solicitation", ["Merger"]],
                  ["Conspiracy", ["Agreement", "Overt act", "Wharton's rule", "Pinkerton liability"]],
                  "Accomplice liability",
                ],
              ],
              [
                "Defences",
                [
                  ["Self-defence & defence of others", ["Deadly vs non-deadly force"]],
                  "Defence of property",
                  ["Insanity", ["M'Naghten", "Irresistible impulse", "MPC", "Durham"]],
                  "Intoxication",
                  "Duress & necessity",
                  "Entrapment",
                  "Mistake of fact / law",
                ],
              ],
              [
                "Fourth Amendment",
                [
                  ["Search & seizure", ["Reasonable expectation of privacy", "Standing"]],
                  ["Warrant requirement", ["Probable cause", "Particularity"]],
                  ["Warrantless search exceptions", ["Consent", "Plain view", "Automobile", "Search incident to arrest", "Exigent circumstances", "Stop & frisk (Terry)"]],
                  "Exclusionary rule & fruits doctrine",
                  ["Exceptions to exclusion", ["Independent source", "Inevitable discovery", "Attenuation", "Good faith"]],
                ],
              ],
              [
                "Fifth Amendment & confessions",
                [
                  "Privilege against self-incrimination",
                  ["Miranda warnings", ["Custody", "Interrogation", "Waiver", "Invocation"]],
                  "Voluntariness (due process)",
                  "Double jeopardy",
                ],
              ],
              [
                "Sixth Amendment & identifications",
                [
                  ["Right to counsel", ["Attachment", "Offense-specific"]],
                  "Confrontation & compulsory process",
                  "Speedy trial & public trial",
                  ["Identification procedures", ["Lineups", "Show-ups", "Photo arrays"]],
                ],
              ],
              [
                "Trial & post-conviction",
                [
                  "Guilty pleas",
                  "Jury trial rights",
                  "Sentencing basics",
                  "Habeas corpus & appeals",
                ],
              ],
            ],
          ],
          [
            "Evidence (FRE)",
            undefined,
            [
              [
                "Relevance",
                [
                  ["Logical & legal relevance", ["FRE 401", "FRE 402", "FRE 403"]],
                  ["Public policy exclusions", ["Subsequent remedial measures", "Compromise offers", "Payment of medical expenses", "Pleas & plea discussions", "Liability insurance"]],
                ],
              ],
              [
                "Character & habit",
                [
                  ["Character in civil cases", ["Essential element"]],
                  ["Character in criminal cases", ["Mercy rule", "Rebuttal"]],
                  ["MIMIC / 404(b)", ["Motive", "Intent", "Absence of mistake", "Identity", "Common plan"]],
                  "Methods of proving character (405)",
                  "Habit & routine practice",
                ],
              ],
              [
                "Witnesses",
                [
                  "Competency",
                  "Personal knowledge & oath",
                  ["Impeachment", ["Prior inconsistent statements", "Bias", "Sensory defects", "Reputation for untruthfulness"]],
                  ["Prior convictions (609)", ["Crimen falsi", "Balancing"]],
                  "Prior bad acts (608(b))",
                  "Rehabilitation & bolstering",
                ],
              ],
              [
                "Opinion & expert testimony",
                [
                  "Lay opinion (701)",
                  ["Expert opinion (702)", ["Qualifications", "Reliable methods", "Fit"]],
                  "Daubert / Frye",
                  "Bases of expert testimony (703)",
                  "Ultimate issue rule (704)",
                ],
              ],
              [
                "Hearsay basics",
                [
                  ["Definition of hearsay", ["Statement", "Declarant", "Truth of matter asserted"]],
                  ["Non-hearsay uses", ["Effect on listener", "State of mind", "Verbal act", "Impeachment"]],
                  ["Statements not hearsay (801(d))", ["Prior statements of witness", "Opposing party statements", "Adoptive & vicarious admissions"]],
                ],
              ],
              [
                "Hearsay exceptions",
                [
                  ["Declarant unavailability irrelevant (803)", ["Present sense impression", "Excited utterance", "Then-existing state of mind", "Medical diagnosis", "Recorded recollection", "Business records", "Public records", "Learned treatises"]],
                  ["Declarant unavailable (804)", ["Former testimony", "Dying declaration", "Statement against interest", "Forfeiture by wrongdoing"]],
                  "Residual exception (807)",
                ],
              ],
              [
                "Confrontation Clause",
                [
                  "Testimonial vs non-testimonial",
                  "Crawford framework",
                  "Forfeiture by wrongdoing",
                ],
              ],
              [
                "Privileges",
                [
                  "Attorney-client & work product",
                  "Spousal (testimonial & communications)",
                  "Doctor/therapist-patient",
                  "5th Amendment privilege",
                  "Waiver & crime-fraud exception",
                ],
              ],
              [
                "Writings & authentication",
                [
                  "Authentication (901/902)",
                  ["Best evidence rule", ["Duplicates", "Excuses for non-production"]],
                  "Chain of custody",
                  "Judicial notice",
                ],
              ],
            ],
          ],
          [
            "Real Property",
            "Property",
            [
              [
                "Estates in land",
                [
                  ["Present estates", ["Fee simple absolute", "Defeasible fees", "Life estate"]],
                  ["Future interests", ["Reversion", "Remainder (vested/contingent)", "Executory interest", "Possibility of reverter", "Right of entry"]],
                  ["Rule Against Perpetuities", ["Class gifts", "Charity-to-charity exception"]],
                ],
              ],
              [
                "Concurrent estates",
                [
                  "Tenancy in common",
                  "Joint tenancy & four unities",
                  "Tenancy by the entirety",
                  "Rights & duties among co-tenants",
                  "Severance & partition",
                ],
              ],
              [
                "Landlord-tenant",
                [
                  ["Types of tenancy", ["Term of years", "Periodic", "At will", "At sufferance"]],
                  "Tenant duties & landlord duties",
                  "Implied warranty of habitability",
                  "Constructive eviction",
                  "Assignment vs sublease",
                ],
              ],
              [
                "Non-possessory interests",
                [
                  ["Easements", ["Express", "Implied", "By necessity", "By prescription", "Appurtenant vs in gross"]],
                  "Licenses & profits",
                  ["Real covenants", ["Touch & concern", "Privity", "Notice"]],
                  ["Equitable servitudes", ["Common scheme doctrine"]],
                ],
              ],
              [
                "Adverse possession",
                [
                  "Open & notorious",
                  "Continuous & exclusive",
                  "Hostile / claim of right",
                  "Tacking & disabilities",
                ],
              ],
              [
                "Land sale contracts",
                [
                  "Statute of Frauds & part performance",
                  "Marketable title",
                  "Risk of loss & equitable conversion",
                  "Merger doctrine",
                  "Fitness & warranty of quality",
                ],
              ],
              [
                "Deeds & delivery",
                [
                  ["Types of deeds", ["General warranty", "Special warranty", "Quitclaim"]],
                  "Delivery & acceptance",
                  ["Present covenants", ["Seisin", "Right to convey", "Encumbrances"]],
                  ["Future covenants", ["Warranty", "Quiet enjoyment", "Further assurances"]],
                ],
              ],
              [
                "Recording system",
                [
                  ["Recording acts", ["Race", "Notice", "Race-notice"]],
                  ["Notice types", ["Actual", "Constructive", "Inquiry"]],
                  "Bona fide purchaser doctrine",
                  "Shelter rule",
                  "Chain of title & wild deeds",
                ],
              ],
              [
                "Mortgages & security interests",
                [
                  ["Mortgage theories", ["Lien theory", "Title theory"]],
                  "Transfer of mortgaged property",
                  "Priority & subordination",
                  ["Foreclosure", ["Judicial", "Power of sale", "Deficiency & surplus"]],
                  "Equity of redemption & statutory redemption",
                  "Purchase money mortgages",
                ],
              ],
              [
                "Land use & zoning",
                [
                  "Zoning basics & variances",
                  "Nonconforming uses",
                  "Eminent domain",
                  "Nuisance & land use",
                ],
              ],
            ],
          ],
          [
            "Torts",
            undefined,
            [
              [
                "Intentional torts to person",
                [
                  "Battery",
                  "Assault",
                  "False imprisonment",
                  "Intentional infliction of emotional distress",
                ],
              ],
              [
                "Intentional torts to property",
                [
                  "Trespass to land",
                  "Trespass to chattels",
                  "Conversion",
                ],
              ],
              [
                "Defences to intentional torts",
                [
                  "Consent",
                  "Self-defence & defence of others",
                  "Defence of property",
                  "Necessity (public & private)",
                  "Privilege of arrest & recapture",
                ],
              ],
              [
                "Negligence",
                [
                  ["Duty", ["General duty", "Special relationships", "Landowner duties", "Rescuers"]],
                  ["Breach", ["Reasonable person", "Custom", "Negligence per se", "Res ipsa loquitur"]],
                  ["Causation", ["Actual cause (but-for)", "Proximate cause", "Foreseeability", "Intervening causes"]],
                  ["Damages", ["Personal injury", "Property", "Pure economic loss"]],
                  ["NIED", ["Zone of danger", "Bystander"]],
                ],
              ],
              [
                "Defences to negligence",
                [
                  "Contributory negligence",
                  ["Comparative negligence", ["Pure", "Modified"]],
                  "Assumption of risk",
                ],
              ],
              [
                "Strict liability",
                [
                  "Wild animals & domesticated animals",
                  "Abnormally dangerous activities",
                ],
              ],
              [
                "Products liability",
                [
                  ["Theories", ["Negligence", "Strict liability", "Warranty", "Misrepresentation"]],
                  ["Defects", ["Manufacturing", "Design", "Failure to warn"]],
                  "Defences & preemption",
                ],
              ],
              [
                "Nuisance",
                [
                  "Private nuisance",
                  "Public nuisance",
                  "Remedies & defences",
                ],
              ],
              [
                "Defamation & privacy",
                [
                  ["Defamation elements", ["Defamatory statement", "Of/concerning plaintiff", "Publication", "Damages"]],
                  ["Constitutional overlay", ["Public figures & actual malice (Sullivan)", "Private figures on matters of public concern"]],
                  ["Privacy torts", ["Intrusion", "Public disclosure", "False light", "Appropriation"]],
                ],
              ],
              [
                "Economic & misrepresentation torts",
                [
                  "Intentional misrepresentation",
                  "Negligent misrepresentation",
                  "Tortious interference with contract / prospective advantage",
                  "Injurious falsehood",
                ],
              ],
              [
                "Vicarious liability & multiple defendants",
                [
                  "Respondeat superior & scope of employment",
                  "Independent contractors",
                  "Joint & several liability",
                  "Contribution & indemnity",
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
                  ["Authority", ["Actual express", "Actual implied", "Apparent", "Ratification"]],
                  "Principal & agent liability in contract",
                  ["Vicarious liability", ["Scope of employment", "Frolic & detour", "Independent contractors"]],
                  "Fiduciary duties of agents",
                ],
              ],
              [
                "General & limited partnerships",
                [
                  "Formation & partnership by estoppel",
                  ["Partner rights & duties", ["Management", "Profits & losses", "Fiduciary duties"]],
                  "Partnership property & partner interests",
                  "Dissociation & dissolution",
                  ["Limited partnerships", ["LP formation", "General vs limited partners", "LLPs"]],
                ],
              ],
              [
                "Corporations — formation & capital",
                [
                  "Incorporation & de jure/de facto",
                  "Promoters & pre-incorporation contracts",
                  ["Piercing the corporate veil", ["Alter ego", "Undercapitalisation", "Fraud"]],
                  "Ultra vires acts",
                  "Issuance of stock & consideration",
                ],
              ],
              [
                "Corporate governance",
                [
                  ["Directors", ["Election & removal", "Duty of care & BJR", "Duty of loyalty", "Interested-director transactions"]],
                  "Officers & authority",
                  "Corporate opportunity doctrine",
                  "Indemnification & insurance",
                ],
              ],
              [
                "Shareholders",
                [
                  ["Voting", ["Straight vs cumulative", "Proxies", "Voting trusts & agreements"]],
                  ["Derivative suits", ["Standing", "Demand", "Dismissal"]],
                  "Direct suits & inspection rights",
                  "Controlling shareholder duties",
                  ["Federal securities overlay", ["10b-5", "16(b) short-swing profits"]],
                ],
              ],
              [
                "Fundamental changes & dissolution",
                [
                  "Mergers & share exchanges",
                  "Asset sales",
                  "Appraisal rights",
                  "Voluntary & involuntary dissolution",
                ],
              ],
              [
                "Limited Liability Companies",
                [
                  "Formation & operating agreement",
                  "Management structures (member vs manager)",
                  "Fiduciary duties in LLCs",
                  "Dissociation & dissolution",
                ],
              ],
            ],
          ],
          [
            "Conflict of Laws",
            "Conflicts",
            [
              [
                "Domicile & characterisation",
                [
                  "Domicile of origin, choice, operation of law",
                  "Substance vs procedure",
                  "Characterisation of issues",
                ],
              ],
              [
                "Choice of law approaches",
                [
                  ["Traditional (vested rights)", ["Lex loci delicti", "Lex loci contractus", "Lex situs"]],
                  ["Modern approaches", ["Most significant relationship (Second Restatement)", "Governmental interest analysis", "Better law"]],
                  "Depecage",
                ],
              ],
              [
                "Specific subject areas",
                [
                  "Torts",
                  "Contracts & choice-of-law clauses",
                  "Property (movable & immovable)",
                  "Family law & marriage validity",
                  "Corporations (internal affairs)",
                ],
              ],
              [
                "Recognition of judgments",
                [
                  "Full Faith & Credit Clause",
                  "Foreign country judgments",
                  "Defences to recognition",
                ],
              ],
              [
                "Defences & escape devices",
                [
                  "Public policy exception",
                  "Renvoi",
                  "Penal & tax laws",
                ],
              ],
            ],
          ],
          [
            "Family Law",
            undefined,
            [
              [
                "Getting married",
                [
                  "Requirements for valid marriage",
                  "Common-law marriage",
                  "Premarital & postnuptial agreements",
                  "Void & voidable marriages",
                ],
              ],
              [
                "Ending marriage",
                [
                  "No-fault & fault grounds",
                  "Legal separation & annulment",
                  "Jurisdiction over divorce",
                ],
              ],
              [
                "Financial consequences",
                [
                  ["Property division", ["Community property", "Equitable distribution", "Separate vs marital property"]],
                  ["Spousal support", ["Rehabilitative", "Permanent", "Reimbursement"]],
                  ["Child support", ["Guidelines", "Modification", "Enforcement (UIFSA)"]],
                ],
              ],
              [
                "Children",
                [
                  ["Custody", ["Best-interests standard", "Legal vs physical", "Joint custody"]],
                  "Visitation & third-party rights",
                  "UCCJEA jurisdiction",
                  "Relocation disputes",
                ],
              ],
              [
                "Parentage & adoption",
                [
                  "Presumption of paternity",
                  "Voluntary acknowledgment & disestablishment",
                  "Adoption procedures & consent",
                  "Termination of parental rights",
                ],
              ],
            ],
          ],
          [
            "Trusts & Estates",
            "Trusts",
            [
              [
                "Will execution & validity",
                [
                  "Testamentary capacity",
                  ["Formalities", ["Attestation", "Holographic wills", "Harmless-error rule"]],
                  ["Revocation", ["By act", "By writing", "By operation of law"]],
                  "Revival & dependent relative revocation",
                ],
              ],
              [
                "Will components & interpretation",
                [
                  "Integration & incorporation by reference",
                  "Acts of independent significance",
                  "Pour-over wills",
                  "Ademption, exoneration & abatement",
                  "Lapse & anti-lapse statutes",
                ],
              ],
              [
                "Intestacy",
                [
                  "Surviving spouse's share",
                  ["Descendants' shares", ["Per stirpes", "Per capita with representation"]],
                  "Ancestors & collateral heirs",
                  "Advancements & disclaimers",
                ],
              ],
              [
                "Protection of family",
                [
                  "Elective/forced share",
                  "Pretermitted spouse & children",
                  "Homestead & family allowance",
                ],
              ],
              [
                "Will contests",
                [
                  "Lack of capacity",
                  "Undue influence",
                  "Fraud & duress",
                  "Mistake",
                  "No-contest clauses",
                ],
              ],
              [
                "Express trusts",
                [
                  ["Elements", ["Settlor intent", "Trust res", "Ascertainable beneficiaries", "Valid purpose"]],
                  ["Types", ["Inter vivos", "Testamentary", "Revocable vs irrevocable"]],
                  "Spendthrift, support & discretionary trusts",
                  "Charitable trusts & cy pres",
                ],
              ],
              [
                "Trustee powers & duties",
                [
                  ["Fiduciary duties", ["Loyalty", "Prudence (UPIA)", "Impartiality", "Reporting"]],
                  "Powers & delegation",
                  ["Breach & remedies", ["Damages", "Tracing", "Removal"]],
                ],
              ],
              [
                "Modification & termination",
                [
                  "Settlor & beneficiary consent",
                  "Claflin doctrine",
                  "Changed circumstances & equitable deviation",
                  "Termination by trustee",
                ],
              ],
              [
                "Resulting & constructive trusts",
                [
                  "Resulting trusts",
                  "Constructive trusts as remedy",
                ],
              ],
              [
                "Powers of appointment",
                [
                  "General vs special powers",
                  "Exercise & release",
                  "Failure to exercise & takers in default",
                ],
              ],
            ],
          ],
          [
            "Secured Transactions (UCC Art. 9)",
            "Secured",
            [
              [
                "Scope & classification",
                [
                  "Transactions covered by Art. 9",
                  ["Types of collateral", ["Goods (consumer, inventory, equipment, farm products)", "Semi-intangibles (chattel paper, instruments, documents)", "Intangibles (accounts, general intangibles)"]],
                ],
              ],
              [
                "Attachment",
                [
                  "Value given by secured party",
                  "Debtor rights in collateral",
                  "Authenticated security agreement or possession",
                  "After-acquired property & future advances",
                  "Proceeds",
                ],
              ],
              [
                "Perfection",
                [
                  ["Filing", ["Financing statement", "Place of filing", "Errors"]],
                  "Possession & control",
                  "Automatic perfection (PMSI in consumer goods)",
                  "Temporary perfection",
                ],
              ],
              [
                "Priority",
                [
                  "General first-to-file-or-perfect rule",
                  ["PMSI super-priority", ["Inventory PMSI", "Non-inventory PMSI"]],
                  ["Buyers of collateral", ["Buyer in ordinary course", "Consumer-to-consumer"]],
                  "Lien creditors & bankruptcy trustee",
                  "Fixtures & accessions",
                ],
              ],
              [
                "Default & enforcement",
                [
                  "Repossession & self-help",
                  ["Disposition of collateral", ["Commercially reasonable sale", "Notice"]],
                  "Strict foreclosure",
                  "Redemption",
                  "Deficiency & surplus",
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
                "Objective writing",
                [
                  "Objective office memo",
                  "Opinion letter to client",
                  "Advisory memo",
                ],
              ],
              [
                "Persuasive writing",
                [
                  "Persuasive brief / motion",
                  "Trial brief",
                  "Appellate brief",
                  "Closing / opening argument",
                ],
              ],
              [
                "Drafting",
                [
                  "Contract drafting",
                  "Statute or ordinance drafting",
                  "Discovery plan / interrogatories",
                  "Will provisions & clauses",
                ],
              ],
              [
                "Correspondence",
                [
                  "Client letter",
                  "Demand letter",
                  "Settlement proposal",
                ],
              ],
            ],
          ],
          [
            "Analytical skills",
            "Skills",
            [
              [
                "Working with the File",
                [
                  "Fact analysis from the File",
                  "Weighing conflicting evidence",
                  "Identifying favourable & unfavourable facts",
                ],
              ],
              [
                "Working with the Library",
                [
                  "Case synthesis from provided authorities",
                  "Statute & regulation interpretation",
                  "Rule extraction & rule statements",
                  "Distinguishing authorities",
                ],
              ],
              [
                "Application & organisation",
                [
                  "IRAC / CREAC structure",
                  "Fact-to-rule application",
                  "Counter-arguments & rebuttal",
                  "Handling ambiguity",
                ],
              ],
              [
                "Practical execution",
                [
                  "Time management under 90-minute limit",
                  "Following task memo instructions",
                  "Tone & audience adaptation",
                  "Formatting & citation basics",
                ],
              ],
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
