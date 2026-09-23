// ACCA syllabus — the academic backbone of Tentra's planner for ACCA students.
//
// ACCA is sat paper-by-paper (usually one or two papers per sitting), so the
// student's "syllabus" is the union of the syllabus areas of the papers they
// have entered for. Each area becomes a planner subject named
// `Area (CODE)` so two papers can share an area name without colliding.
//
// - weight: share of that paper's marks (sums to ~1.0 per paper)
// - highYield: 1-5 (5 = appears in nearly every sitting / heavy mark share)

export type AccaLevel = "Applied Knowledge" | "Applied Skills" | "Strategic Professional";

export interface AccaSubtopic {
  id: string;
  name: string;
}

export interface AccaArea {
  id: string;
  name: string;
  weight: number;
  highYield: 1 | 2 | 3 | 4 | 5;
  subtopics: AccaSubtopic[];
}

export interface AccaPaper {
  code: string;
  name: string;
  level: AccaLevel;
  /** Exam format, in the student's language. */
  format: string;
  areas: AccaArea[];
  /** Strategic Professional options papers — pick one or two of four. */
  optional?: boolean;
}

function area(
  id: string,
  name: string,
  weight: number,
  highYield: 1 | 2 | 3 | 4 | 5,
  subtopics: string[],
): AccaArea {
  return {
    id,
    name,
    weight,
    highYield,
    subtopics: subtopics.map((s, i) => ({ id: `${id}-${i + 1}`, name: s })),
  };
}

export const ACCA_PAPERS: AccaPaper[] = [
  // ===== Applied Knowledge =====
  {
    code: "BT",
    name: "Business & Technology",
    level: "Applied Knowledge",
    format: "2 hours on demand — objective test questions",
    areas: [
      area("bt-env", "Business organisation & environment", 0.22, 4, [
        "Types of business organisation and stakeholders",
        "Political, legal, economic and social factors (PESTEL)",
        "Competitive forces and the macroeconomic environment",
      ]),
      area("bt-structure", "Business structure, culture & governance", 0.2, 4, [
        "Organisational structure and departments",
        "Organisational culture and committees",
        "Corporate governance and social responsibility",
      ]),
      area("bt-accounting", "Accounting & reporting systems", 0.18, 4, [
        "The role of accounting and finance functions",
        "Internal control, audit and fraud prevention",
        "Financial technology and automation of the finance function",
      ]),
      area("bt-people", "Leading & managing people", 0.22, 5, [
        "Recruitment, selection and diversity",
        "Leadership, management and motivation theories",
        "Learning, training and performance appraisal",
      ]),
      area("bt-personal", "Personal effectiveness & professional ethics", 0.18, 4, [
        "Time management and communication",
        "Professional ethics and the ACCA Code",
        "Ethical conflict and safeguards",
      ]),
    ],
  },
  {
    code: "MA",
    name: "Management Accounting",
    level: "Applied Knowledge",
    format: "2 hours on demand — objective test questions",
    areas: [
      area("ma-nature", "Nature & purpose of cost accounting", 0.12, 3, [
        "Cost classification and behaviour",
        "Sources of data and sampling",
        "Presenting information and index numbers",
      ]),
      area("ma-costing", "Cost accounting techniques", 0.3, 5, [
        "Material, labour and overhead costing",
        "Absorption and marginal costing",
        "Job, batch, process and service costing",
      ]),
      area("ma-budgeting", "Budgeting", 0.24, 5, [
        "Forecasting, regression and time series",
        "Budget preparation and flexible budgets",
        "Cash budgets and capital budgeting basics",
      ]),
      area("ma-standard", "Standard costing & variances", 0.2, 5, [
        "Sales, material, labour and overhead variances",
        "Variance interpretation and operating statements",
      ]),
      area("ma-performance", "Performance measurement", 0.14, 4, [
        "Financial and non-financial performance indicators",
        "Divisional performance and cost/profit/investment centres",
      ]),
    ],
  },
  {
    code: "FA",
    name: "Financial Accounting",
    level: "Applied Knowledge",
    format: "2 hours on demand — objective test questions",
    areas: [
      area("fa-context", "Context & purpose of financial reporting", 0.1, 3, [
        "Users, qualitative characteristics and the regulatory framework",
        "Duties of those charged with governance",
      ]),
      area("fa-doubleentry", "Double entry & recording transactions", 0.3, 5, [
        "Ledger accounts, journals and books of prime entry",
        "Sales tax, inventory and non-current asset accounting",
        "Accruals, prepayments, irrecoverable debts and provisions",
      ]),
      area("fa-trialbalance", "Trial balance, control accounts & corrections", 0.22, 5, [
        "Bank reconciliations and control account reconciliations",
        "Suspense accounts and correction of errors",
      ]),
      area("fa-statements", "Preparing financial statements", 0.26, 5, [
        "Statement of profit or loss and financial position",
        "Statement of cash flows",
        "Incomplete records",
      ]),
      area("fa-consolidation", "Consolidated accounts & interpretation", 0.12, 4, [
        "Simple consolidated statements and goodwill",
        "Ratio analysis and interpretation",
      ]),
    ],
  },

  // ===== Applied Skills =====
  {
    code: "LW",
    name: "Corporate & Business Law",
    level: "Applied Skills",
    format: "2 hours on demand — objective test questions",
    areas: [
      area("lw-legal", "Essential elements of the legal system", 0.12, 3, [
        "Court structure and sources of law",
        "Statutory interpretation and case law",
      ]),
      area("lw-contract", "The law of obligations", 0.24, 5, [
        "Formation of contract: offer, acceptance, consideration",
        "Contract terms, breach and remedies",
        "Negligence and professional negligence",
      ]),
      area("lw-employment", "Employment law", 0.14, 4, [
        "Employee vs self-employed status",
        "Dismissal, wrongful and unfair dismissal, redundancy",
      ]),
      area("lw-companies", "Formation & constitution of business organisations", 0.2, 5, [
        "Agency, partnerships and LLPs",
        "Company formation, constitution and types of company",
      ]),
      area("lw-management", "Capital, financing & management of companies", 0.2, 5, [
        "Share and loan capital, capital maintenance",
        "Directors' duties, company secretary and meetings",
      ]),
      area("lw-insolvency", "Insolvency & corporate fraudulent behaviour", 0.1, 4, [
        "Administration, liquidation and receivership",
        "Fraudulent and wrongful trading, insider dealing, money laundering",
      ]),
    ],
  },
  {
    code: "PM",
    name: "Performance Management",
    level: "Applied Skills",
    format: "3 hours 15 minutes — objective test, case and constructed response",
    areas: [
      area("pm-techniques", "Specialist cost & management accounting techniques", 0.22, 5, [
        "Activity-based costing, target and life-cycle costing",
        "Throughput accounting and environmental accounting",
      ]),
      area("pm-decision", "Decision-making techniques", 0.26, 5, [
        "Relevant costing and limiting factor analysis",
        "CVP analysis and multi-product break-even",
        "Pricing decisions and risk/uncertainty (expected values, decision trees)",
      ]),
      area("pm-budgeting", "Budgeting & control", 0.24, 5, [
        "Budgetary systems, ZBB, activity-based and rolling budgets",
        "Advanced variances: mix, yield, planning and operational",
        "Learning curves and behavioural aspects",
      ]),
      area("pm-performance", "Performance measurement & control", 0.28, 5, [
        "Divisional performance: ROI, RI and transfer pricing",
        "Balanced scorecard and building block models",
        "Not-for-profit and public sector performance (VFM)",
      ]),
    ],
  },
  {
    code: "TX",
    name: "Taxation (UK)",
    level: "Applied Skills",
    format: "3 hours 15 minutes — objective test, case and constructed response",
    areas: [
      area("tx-system", "UK tax system & administration", 0.1, 4, [
        "Sources of tax law, self assessment and filing deadlines",
        "Penalties, interest and record keeping",
      ]),
      area("tx-income", "Income tax & NIC", 0.28, 5, [
        "Employment income and benefits",
        "Trading profits, capital allowances and basis periods",
        "Property and savings income, reliefs and the income tax computation",
        "National insurance contributions",
      ]),
      area("tx-cgt", "Chargeable gains for individuals", 0.16, 5, [
        "Computing gains and losses, chattels and shares",
        "Business asset disposal relief, rollover and gift relief",
      ]),
      area("tx-corp", "Corporation tax", 0.22, 5, [
        "Taxable total profits and adjustments to trading profit",
        "Capital allowances, losses and group relief",
      ]),
      area("tx-iht", "Inheritance tax", 0.12, 4, [
        "Lifetime transfers and the death estate",
        "Exemptions, reliefs and the nil rate band",
      ]),
      area("tx-vat", "Value added tax", 0.12, 5, [
        "Registration, deregistration and VAT returns",
        "Special schemes and penalties",
      ]),
    ],
  },
  {
    code: "FR",
    name: "Financial Reporting",
    level: "Applied Skills",
    format: "3 hours 15 minutes — objective test, case and constructed response",
    areas: [
      area("fr-framework", "The conceptual & regulatory framework", 0.1, 4, [
        "The IASB Conceptual Framework and qualitative characteristics",
        "Regulatory framework and ethical considerations",
      ]),
      area("fr-standards", "Accounting for transactions (IFRS)", 0.34, 5, [
        "Tangible and intangible non-current assets, IAS 16, IAS 38, IAS 36",
        "Leases (IFRS 16), revenue (IFRS 15) and financial instruments (IFRS 9)",
        "Provisions, events after the reporting period and income taxes",
        "Inventories, agriculture and government grants",
      ]),
      area("fr-single", "Preparing single-entity financial statements", 0.2, 5, [
        "Statement of profit or loss and other comprehensive income",
        "Statement of financial position and changes in equity",
        "Statement of cash flows (IAS 7)",
      ]),
      area("fr-group", "Preparing consolidated financial statements", 0.22, 5, [
        "Consolidated statement of financial position and goodwill",
        "Consolidated statement of profit or loss and NCI",
        "Associates and equity accounting",
      ]),
      area("fr-analysis", "Interpretation of financial statements", 0.14, 5, [
        "Ratio calculation and written interpretation",
        "Limitations of ratio analysis and comparability",
      ]),
    ],
  },
  {
    code: "AA",
    name: "Audit & Assurance",
    level: "Applied Skills",
    format: "3 hours 15 minutes — objective test, case and constructed response",
    areas: [
      area("aa-framework", "Audit framework & regulation", 0.16, 5, [
        "Objective and scope of assurance engagements",
        "Professional ethics, independence and the ACCA Code",
        "Corporate governance and internal audit",
      ]),
      area("aa-planning", "Planning & risk assessment", 0.22, 5, [
        "Understanding the entity, materiality and audit risk",
        "Fraud, laws and regulations, analytical procedures",
        "Audit documentation and planning the engagement",
      ]),
      area("aa-internal", "Internal control", 0.18, 5, [
        "Components of internal control and tests of control",
        "Deficiencies, implications and recommendations",
      ]),
      area("aa-evidence", "Audit evidence", 0.28, 5, [
        "Financial statement assertions and procedures by balance",
        "Sampling, written representations and using the work of others",
        "Substantive procedures for receivables, inventory, payables, NCA",
      ]),
      area("aa-review", "Review & reporting", 0.16, 5, [
        "Subsequent events, going concern and written representations",
        "Audit report opinions and modifications",
      ]),
    ],
  },
  {
    code: "FM",
    name: "Financial Management",
    level: "Applied Skills",
    format: "3 hours 15 minutes — objective test, case and constructed response",
    areas: [
      area("fm-function", "Financial management function & environment", 0.14, 4, [
        "Financial objectives, stakeholders and agency",
        "Financial markets, money markets and economic policy",
      ]),
      area("fm-workingcapital", "Working capital management", 0.22, 5, [
        "Inventory, receivables, payables and cash management",
        "Working capital cycles, EOQ, factoring and cash models",
      ]),
      area("fm-investment", "Investment appraisal", 0.24, 5, [
        "NPV, IRR, payback and ARR",
        "Relevant cash flows, tax, inflation and capital allowances",
        "Asset replacement, capital rationing and risk/sensitivity",
      ]),
      area("fm-finance", "Business finance & cost of capital", 0.24, 5, [
        "Sources of equity and debt finance, Islamic finance",
        "Cost of equity, CAPM, WACC and dividend policy",
        "Capital structure theories and gearing",
      ]),
      area("fm-valuations", "Business valuations & risk management", 0.16, 4, [
        "Asset, income and market-based valuation models",
        "Foreign currency and interest rate risk management",
      ]),
    ],
  },

  // ===== Strategic Professional — Essentials =====
  {
    code: "SBL",
    name: "Strategic Business Leader",
    level: "Strategic Professional",
    format: "4 hours — case study with professional skills marks",
    areas: [
      area("sbl-governance", "Leadership & governance", 0.2, 5, [
        "Governance structures, board responsibilities and stakeholders",
        "Leadership styles and organisational culture",
      ]),
      area("sbl-ethics", "Ethics & professionalism", 0.14, 5, [
        "Professional ethics, ACCA Code and ethical decision frameworks",
        "Corporate social responsibility and integrated reporting",
      ]),
      area("sbl-strategy", "Strategy & business analysis", 0.24, 5, [
        "Strategic position: PESTEL, Porter, resources and capabilities",
        "Strategic choice, competitive advantage and strategic action",
      ]),
      area("sbl-risk", "Risk & internal control", 0.16, 5, [
        "Risk identification, assessment and appetite",
        "Internal control, internal audit and compliance",
      ]),
      area("sbl-technology", "Technology, data analytics & innovation", 0.14, 4, [
        "Digital strategy, cyber risk and IT controls",
        "Data analytics, automation and process redesign",
      ]),
      area("sbl-skills", "Professional skills & communication", 0.12, 5, [
        "Communication, commercial acumen, analysis, scepticism, evaluation",
        "Report, briefing note and presentation formats",
      ]),
    ],
  },
  {
    code: "SBR",
    name: "Strategic Business Reporting",
    level: "Strategic Professional",
    format: "3 hours 15 minutes — constructed response",
    areas: [
      area("sbr-framework", "The professional & ethical duty of the accountant", 0.12, 5, [
        "Ethical reporting judgements and professional behaviour",
        "The Conceptual Framework applied to reporting problems",
      ]),
      area("sbr-reporting", "Reporting the financial performance of entities", 0.3, 5, [
        "Revenue, leases, financial instruments and deferred tax judgements",
        "Employee benefits, share-based payment and provisions",
        "Non-current assets, impairment and fair value measurement",
      ]),
      area("sbr-groups", "Financial statements of group entities", 0.28, 5, [
        "Complex groups, step acquisitions and disposals",
        "Foreign subsidiaries and consolidated cash flows",
        "Associates, joint arrangements and business combinations",
      ]),
      area("sbr-interpret", "Interpreting financial statements for stakeholders", 0.2, 5, [
        "Analysis for different stakeholder needs",
        "Earnings management, alternative performance measures",
      ]),
      area("sbr-current", "Current developments in reporting", 0.1, 4, [
        "Sustainability and integrated reporting developments",
        "Recent and proposed IFRS changes",
      ]),
    ],
  },

  // ===== Strategic Professional — Options =====
  {
    code: "AFM",
    name: "Advanced Financial Management",
    level: "Strategic Professional",
    format: "3 hours 15 minutes — constructed response",
    optional: true,
    areas: [
      area("afm-role", "Role of the senior financial adviser", 0.12, 4, [
        "Financial strategy, objectives and stakeholder conflict",
        "Ethical and governance issues in financial management",
      ]),
      area("afm-appraisal", "Advanced investment appraisal", 0.28, 5, [
        "Free cash flow valuation, APV and adjusted discount rates",
        "Real options, sensitivity and risk-adjusted appraisal",
        "International investment and foreign cash flows",
      ]),
      area("afm-acquisitions", "Acquisitions & mergers", 0.24, 5, [
        "Business valuations and synergy assessment",
        "Financing acquisitions, defences and regulation",
      ]),
      area("afm-restructuring", "Corporate reconstruction & reorganisation", 0.14, 4, [
        "Financial distress, reconstruction schemes and MBOs",
        "Divestment, demerger and unbundling",
      ]),
      area("afm-risk", "Treasury & advanced risk management", 0.22, 5, [
        "Currency risk hedging: forwards, futures, options, swaps",
        "Interest rate risk hedging and value at risk",
      ]),
    ],
  },
  {
    code: "APM",
    name: "Advanced Performance Management",
    level: "Strategic Professional",
    format: "3 hours 15 minutes — constructed response",
    optional: true,
    areas: [
      area("apm-planning", "Strategic planning & control", 0.24, 5, [
        "Mission, objectives and performance hierarchy",
        "Budgeting approaches and changing business environment",
        "Risk, uncertainty and external influences",
      ]),
      area("apm-systems", "Performance measurement systems & design", 0.2, 5, [
        "Management accounting and information systems",
        "Sources of information, big data and reporting quality",
      ]),
      area("apm-measurement", "Strategic performance measurement", 0.32, 5, [
        "Financial performance and divisional measures (ROI, RI, EVA)",
        "Non-financial and integrated frameworks (balanced scorecard, performance pyramid)",
        "Not-for-profit, public sector and transfer pricing",
      ]),
      area("apm-failure", "Performance evaluation & corporate failure", 0.24, 5, [
        "Alternative views of performance and behavioural aspects",
        "Corporate failure prediction models and quality management",
      ]),
    ],
  },
  {
    code: "ATX",
    name: "Advanced Taxation (UK)",
    level: "Strategic Professional",
    format: "3 hours 15 minutes — constructed response",
    optional: true,
    areas: [
      area("atx-individuals", "Taxation of individuals", 0.3, 5, [
        "Income tax planning, employment and self-employment choices",
        "Residence, domicile and overseas aspects",
        "Pensions and personal tax planning",
      ]),
      area("atx-cgt-iht", "Capital gains & inheritance tax planning", 0.26, 5, [
        "Interaction of CGT and IHT, reliefs and lifetime planning",
        "Trusts, business property relief and succession",
      ]),
      area("atx-corporate", "Corporate taxation & groups", 0.26, 5, [
        "Group relief, capital gains groups and reorganisations",
        "Overseas aspects, transfer pricing and controlled foreign companies",
      ]),
      area("atx-vat-admin", "VAT, administration & ethics", 0.18, 4, [
        "Advanced VAT: partial exemption, groups, land and buildings",
        "Tax administration, penalties and professional ethics in tax",
      ]),
    ],
  },
  {
    code: "AAA",
    name: "Advanced Audit & Assurance",
    level: "Strategic Professional",
    format: "3 hours 15 minutes — constructed response",
    optional: true,
    areas: [
      area("aaa-regulatory", "Regulatory environment & professional ethics", 0.2, 5, [
        "Laws, regulations, money laundering and quality management (ISQM 1)",
        "Ethics, independence threats, conflicts and professional liability",
      ]),
      area("aaa-acceptance", "Practice management & engagement acceptance", 0.14, 4, [
        "Tendering, fees and engagement acceptance decisions",
        "Quality control at engagement level",
      ]),
      area("aaa-planning", "Planning & risk assessment", 0.26, 5, [
        "Risk of material misstatement in complex scenarios",
        "Group audits, components and using other auditors",
        "Analytical procedures and materiality judgements",
      ]),
      area("aaa-evidence", "Evidence & audit of complex balances", 0.22, 5, [
        "Auditing fair values, provisions, going concern and estimates",
        "Completion procedures and evaluation of misstatements",
      ]),
      area("aaa-reporting", "Reporting & other assignments", 0.18, 5, [
        "Auditor's report: opinions, KAM and modifications",
        "Reviews, prospective information and other assurance engagements",
      ]),
    ],
  },
];

export const ACCA_LEVELS: AccaLevel[] = [
  "Applied Knowledge",
  "Applied Skills",
  "Strategic Professional",
];

/** Maximum papers Tentra will plan for in one sitting. */
export const MAX_ACCA_PAPERS = 2;

export function getAccaPaper(code: string): AccaPaper | undefined {
  const want = code.trim().toUpperCase();
  return ACCA_PAPERS.find((p) => p.code === want);
}

export function isAccaPaperCode(value: unknown): value is string {
  return typeof value === "string" && Boolean(getAccaPaper(value));
}

/**
 * Normalise a list of requested paper codes: unknown codes are dropped,
 * duplicates removed, and no more than MAX_ACCA_PAPERS are kept — never
 * silently substituted for something the student didn't choose.
 */
export function normaliseAccaPapers(codes: unknown): string[] {
  if (!Array.isArray(codes)) return [];
  const out: string[] = [];
  for (const raw of codes) {
    if (typeof raw !== "string") continue;
    const paper = getAccaPaper(raw);
    if (!paper || out.includes(paper.code)) continue;
    out.push(paper.code);
    if (out.length >= MAX_ACCA_PAPERS) break;
  }
  return out;
}

/** Planner subject name for an ACCA syllabus area. */
export function accaSubjectName(code: string, areaName: string): string {
  return `${areaName} (${code.toUpperCase()})`;
}

/** Subjects (with the paper code as the component tag) for the chosen papers. */
export function getAccaSubjectsForPapers(
  codes: string[],
): { name: string; component?: string }[] {
  const out: { name: string; component?: string }[] = [];
  for (const code of normaliseAccaPapers(codes)) {
    const paper = getAccaPaper(code);
    if (!paper) continue;
    for (const a of paper.areas) {
      out.push({ name: accaSubjectName(paper.code, a.name), component: paper.code });
    }
  }
  return out;
}

/** Resolve a planner subject name (with or without its `(CODE)` tag) to an area. */
export function getAccaAreaByName(name: string): AccaArea | undefined {
  const trimmed = name.trim();
  const tagged = /^(.*)\s+\(([A-Z]{2,3})\)$/.exec(trimmed);
  if (tagged) {
    const paper = getAccaPaper(tagged[2]!);
    const found = paper?.areas.find((a) => a.name === tagged[1]!.trim());
    if (found) return found;
  }
  for (const paper of ACCA_PAPERS) {
    const found = paper.areas.find((a) => a.name === trimmed);
    if (found) return found;
  }
  return undefined;
}

export function accaPaperLabel(codes: string[]): string {
  const papers = normaliseAccaPapers(codes)
    .map((c) => getAccaPaper(c))
    .filter((p): p is AccaPaper => Boolean(p));
  if (papers.length === 0) return "ACCA";
  return papers.map((p) => `${p.code} ${p.name}`).join(" + ");
}

/** Canonical syllabus text for AI prompts — exact area and subtopic names. */
export function accaSyllabusForPrompt(codes: string[]): string {
  const papers = normaliseAccaPapers(codes)
    .map((c) => getAccaPaper(c))
    .filter((p): p is AccaPaper => Boolean(p));
  if (papers.length === 0) return "";
  return papers
    .map((p) => {
      const areas = p.areas
        .map(
          (a) =>
            `- ${accaSubjectName(p.code, a.name)} — HY${a.highYield} — ${a.subtopics
              .map((s) => s.name)
              .join("; ")}`,
        )
        .join("\n");
      return `## ${p.code} ${p.name} (${p.level}; ${p.format})\n${areas}`;
    })
    .join("\n\n");
}
