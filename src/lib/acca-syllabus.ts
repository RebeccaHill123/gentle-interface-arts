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
        "Purpose and types of business organisation",
        "Stakeholders and stakeholder mapping",
        "Political and legal factors affecting business",
        "Macroeconomic factors: growth, inflation, unemployment",
        "Microeconomic factors: demand, supply and elasticity",
        "Social, demographic and environmental factors",
        "Competitive forces and Porter's five forces",
      ]),
      area("bt-structure", "Business structure, culture & governance", 0.2, 4, [
        "Formal and informal organisational structures",
        "Mintzberg's building blocks and centralisation",
        "Business departments and the finance function's place",
        "Organisational culture: Handy, Hofstede and Schein",
        "Committees in the business organisation",
        "Corporate governance principles and board structures",
        "Corporate social responsibility and sustainability",
      ]),
      area("bt-accounting", "Accounting & reporting systems", 0.18, 4, [
        "Role of accounting and finance within the business",
        "Financial vs management accounting information",
        "Financial systems, procedures and data security",
        "Internal controls, authorisation and segregation of duties",
        "Internal and external audit roles",
        "Fraud, fraud prevention and money laundering awareness",
        "Financial technology, automation and cloud accounting",
      ]),
      area("bt-people", "Leading & managing people", 0.22, 5, [
        "Recruitment, selection and equal opportunities",
        "Diversity, inclusion and legal obligations",
        "Leadership and management theories (Fayol, Mintzberg, Blake & Mouton)",
        "Motivation theories: Maslow, Herzberg, Vroom",
        "Individual, group and team behaviour (Tuckman, Belbin)",
        "Learning, training and development methods",
        "Performance appraisal and feedback",
      ]),
      area("bt-personal", "Personal effectiveness & professional ethics", 0.18, 4, [
        "Personal effectiveness, time management and coping with stress",
        "Communication in business: channels and barriers",
        "Fundamental principles of the ACCA Code of Ethics",
        "Threats to the fundamental principles and safeguards",
        "Ethical conflict resolution and whistleblowing",
        "Corporate codes of ethics and professional behaviour",
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
        "Management information: purpose and qualities",
        "Cost classification by function, nature and behaviour",
        "Fixed, variable, semi-variable costs and the high-low method",
        "Cost units, cost centres and responsibility centres",
        "Sources of data and sampling methods",
        "Presenting information: tables, charts and index numbers",
      ]),
      area("ma-costing", "Cost accounting techniques", 0.3, 5, [
        "Material costs: inventory valuation, FIFO, AVCO, EOQ and EBQ",
        "Labour costs: remuneration methods, idle time and efficiency",
        "Overhead allocation, apportionment and reapportionment",
        "Overhead absorption rates, under- and over-absorption",
        "Absorption vs marginal costing and profit reconciliation",
        "Job, batch and service costing",
        "Process costing: losses, gains, WIP and equivalent units",
        "Joint and by-products",
      ]),
      area("ma-budgeting", "Budgeting", 0.24, 5, [
        "Forecasting with linear regression and correlation",
        "Time series analysis, trends and seasonal variations",
        "Budget preparation: sales, production and resource budgets",
        "Functional budgets and the master budget",
        "Fixed, flexible and flexed budgets",
        "Cash budgets and cash flow forecasting",
        "Capital budgeting basics: payback, ARR, NPV and IRR",
        "Spreadsheet use in budgeting",
      ]),
      area("ma-standard", "Standard costing & variances", 0.2, 5, [
        "Setting standard costs and standard cost cards",
        "Sales price and sales volume variances",
        "Material price and usage variances",
        "Labour rate, efficiency and idle time variances",
        "Variable and fixed overhead variances",
        "Operating statements under absorption and marginal costing",
        "Interpreting variances and causes of differences",
      ]),
      area("ma-performance", "Performance measurement", 0.14, 4, [
        "Performance measurement overview and objectives",
        "Financial performance indicators: profitability, liquidity, gearing",
        "Non-financial indicators: quality, resource use, productivity",
        "Cost, profit and investment centre measures (ROI, RI)",
        "Performance measurement in service and non-profit organisations",
        "Cost reduction and value enhancement",
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
        "Purpose of financial statements and their users",
        "Types of business entity and the reporting framework",
        "Qualitative characteristics of useful information",
        "The IASB Conceptual Framework and accounting concepts",
        "Duties and responsibilities of those charged with governance",
      ]),
      area("fa-doubleentry", "Double entry & recording transactions", 0.3, 5, [
        "The accounting equation and double entry principles",
        "Books of prime entry, journals and ledger accounts",
        "Sales tax on purchases and sales",
        "Inventory: valuation, IAS 2 and closing inventory adjustments",
        "Tangible non-current assets, depreciation and disposals",
        "Intangible assets and research and development",
        "Accruals and prepayments",
        "Irrecoverable debts and allowances for receivables",
        "Provisions, contingent liabilities and contingent assets",
        "Capital structure, share issues and finance costs",
      ]),
      area("fa-trialbalance", "Trial balance, control accounts & corrections", 0.22, 5, [
        "Preparing and using the trial balance",
        "Bank reconciliations",
        "Receivables and payables control account reconciliations",
        "Types of error and their effect on the trial balance",
        "Suspense accounts and journals to correct errors",
        "Effect of corrections on profit and net assets",
      ]),
      area("fa-statements", "Preparing financial statements", 0.26, 5, [
        "Statement of profit or loss and other comprehensive income",
        "Statement of financial position",
        "Statement of changes in equity",
        "Statement of cash flows (IAS 7) preparation",
        "Events after the reporting period",
        "Incomplete records and using margins and mark-ups",
        "Accounting for sole traders, partnerships and companies",
      ]),
      area("fa-consolidation", "Consolidated accounts & interpretation", 0.12, 4, [
        "Subsidiaries, control and the group boundary",
        "Consolidated statement of financial position and goodwill",
        "Non-controlling interests and intra-group balances",
        "Consolidated statement of profit or loss",
        "Associates and significant influence",
        "Ratio calculation and interpretation of performance",
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
        "Court structure and civil vs criminal liability",
        "Sources of law: legislation and case law",
        "Precedent and the hierarchy of the courts",
        "Statutory interpretation rules",
        "Alternative dispute resolution",
      ]),
      area("lw-contract", "The law of obligations", 0.24, 5, [
        "Offer, acceptance and intention to create legal relations",
        "Consideration and privity of contract",
        "Contract terms: conditions, warranties and innominate terms",
        "Exclusion clauses and their validity",
        "Breach of contract and discharge",
        "Remedies for breach: damages, specific performance, injunction",
        "Negligence: duty of care, breach and causation",
        "Professional negligence and the accountant's liability",
      ]),
      area("lw-employment", "Employment law", 0.14, 4, [
        "Employee vs self-employed status and its consequences",
        "Employment contracts and implied duties",
        "Wrongful dismissal",
        "Unfair dismissal: fair reasons and procedure",
        "Redundancy and remedies for dismissal",
      ]),
      area("lw-companies", "Formation & constitution of business organisations", 0.2, 5, [
        "Agency: creation, authority and liability",
        "Partnerships: formation, liability and dissolution",
        "Limited liability partnerships",
        "Corporate personality, the veil of incorporation and lifting it",
        "Types of company: private, public, limited by guarantee",
        "Company formation, promoters and pre-incorporation contracts",
        "Articles of association and the constitution",
      ]),
      area("lw-management", "Capital, financing & management of companies", 0.2, 5, [
        "Share capital, classes of shares and share issues",
        "Loan capital, debentures and charges over assets",
        "Capital maintenance and distributable profits",
        "Directors: appointment, removal and powers",
        "Directors' duties and liabilities",
        "Company secretary and auditors",
        "Company meetings and types of resolution",
      ]),
      area("lw-insolvency", "Insolvency & corporate fraudulent behaviour", 0.1, 4, [
        "Corporate insolvency: administration and receivership",
        "Compulsory and voluntary liquidation",
        "Priority of claims on winding up",
        "Fraudulent and wrongful trading",
        "Insider dealing and market abuse",
        "Money laundering offences and reporting obligations",
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
        "Activity-based costing: cost drivers and calculations",
        "Target costing and cost gaps",
        "Life-cycle costing",
        "Throughput accounting and the theory of constraints",
        "Environmental management accounting",
        "Comparing techniques and advising on their use",
      ]),
      area("pm-decision", "Decision-making techniques", 0.26, 5, [
        "Relevant costing and opportunity cost",
        "Limiting factor analysis and linear programming",
        "Make-or-buy, shutdown and further processing decisions",
        "CVP analysis, break-even and margin of safety",
        "Multi-product break-even charts and sales mix",
        "Pricing strategies and price elasticity",
        "Risk and uncertainty: expected values, maximin, maximax, regret",
        "Decision trees and value of perfect information",
      ]),
      area("pm-budgeting", "Budgeting & control", 0.24, 5, [
        "Budgetary systems: incremental, ZBB, activity-based, rolling",
        "Quantitative analysis in budgeting and learning curves",
        "Standard costing in a modern environment",
        "Advanced variances: mix and yield",
        "Planning and operational variances",
        "Sales mix and quantity variances",
        "Behavioural aspects of budgeting and control",
      ]),
      area("pm-performance", "Performance measurement & control", 0.28, 5, [
        "Performance analysis in private sector organisations",
        "Divisional performance: ROI, residual income and EVA basics",
        "Transfer pricing principles and calculations",
        "Balanced scorecard and building block model",
        "Performance in not-for-profit and public sector (value for money)",
        "Non-financial performance indicators and external influences",
        "Behavioural aspects and short-termism",
        "Performance reporting, information systems and big data",
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
        "Overall function and purpose of taxation",
        "Sources of tax law and HMRC guidance",
        "Self assessment and filing deadlines for individuals",
        "Corporation tax administration and payment dates",
        "Penalties, interest and enquiries",
        "Record keeping obligations",
      ]),
      area("tx-income", "Income tax & NIC", 0.28, 5, [
        "The income tax computation and personal allowance",
        "Employment income, benefits and allowable deductions",
        "Trading profits and adjustments to accounting profit",
        "Capital allowances for unincorporated businesses",
        "Basis periods and commencement/cessation rules",
        "Trading losses for individuals",
        "Property income, including furnished holiday lets",
        "Savings, dividend income and tax reducers",
        "Pension contributions and reliefs",
        "National insurance contributions for employed and self-employed",
      ]),
      area("tx-cgt", "Chargeable gains for individuals", 0.16, 5, [
        "Chargeable persons, disposals and basic computation",
        "Part disposals, chattels and wasting assets",
        "Shares and securities, including matching rules and bonus issues",
        "Principal private residence relief",
        "Business asset disposal relief and investors' relief",
        "Rollover and gift holdover relief",
        "Capital losses and the annual exempt amount",
      ]),
      area("tx-corp", "Corporation tax", 0.22, 5, [
        "Scope of corporation tax and accounting periods",
        "Taxable total profits and adjustments to trading profit",
        "Capital allowances for companies",
        "Chargeable gains for companies and indexation",
        "Relief for trading losses",
        "Group relief and capital gains groups",
        "Long periods of account and associated companies",
      ]),
      area("tx-iht", "Inheritance tax", 0.12, 4, [
        "Chargeable persons, transfers of value and exemptions",
        "Lifetime transfers: PETs and chargeable lifetime transfers",
        "The death estate computation",
        "Nil rate band, transferable and residence nil rate bands",
        "Business and agricultural property relief",
        "Payment of IHT and due dates",
      ]),
      area("tx-vat", "Value added tax", 0.12, 5, [
        "Scope of VAT, taxable supplies and rates",
        "Registration and deregistration rules",
        "Input tax recovery and blocked input tax",
        "VAT invoices, records and returns",
        "Special schemes: cash, annual and flat rate",
        "Default surcharge, penalties and errors",
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
        "The IASB Conceptual Framework and its purpose",
        "Qualitative characteristics of useful information",
        "Recognition, measurement and the elements of financial statements",
        "The regulatory framework and standard-setting process",
        "Ethical considerations in financial reporting",
      ]),
      area("fr-standards", "Accounting for transactions (IFRS)", 0.34, 5, [
        "Tangible non-current assets and IAS 16, including revaluation",
        "Borrowing costs, investment property and government grants",
        "Intangible assets and IAS 38",
        "Impairment of assets under IAS 36",
        "Leases under IFRS 16 (lessee and lessor basics)",
        "Revenue from contracts with customers under IFRS 15",
        "Financial instruments under IFRS 9: classification and measurement",
        "Provisions, contingencies and events after the reporting period",
        "Income taxes under IAS 12, including deferred tax",
        "Inventories, biological assets and non-current assets held for sale",
      ]),
      area("fr-single", "Preparing single-entity financial statements", 0.2, 5, [
        "Statement of profit or loss and other comprehensive income",
        "Statement of financial position",
        "Statement of changes in equity",
        "Statement of cash flows under IAS 7",
        "Earnings per share basics",
        "Disclosure notes and accounting policies",
      ]),
      area("fr-group", "Preparing consolidated financial statements", 0.22, 5, [
        "Control, subsidiaries and the group boundary",
        "Consolidated statement of financial position and goodwill",
        "Fair value adjustments and non-controlling interests",
        "Intra-group trading, balances and unrealised profit",
        "Consolidated statement of profit or loss and comprehensive income",
        "Mid-year acquisitions",
        "Associates and equity accounting",
      ]),
      area("fr-analysis", "Interpretation of financial statements", 0.14, 5, [
        "Profitability, liquidity, efficiency and gearing ratios",
        "Investor ratios and segment information",
        "Written interpretation for different user needs",
        "Interpreting the statement of cash flows",
        "Limitations of ratio analysis and comparability issues",
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
        "Objective, scope and levels of assurance",
        "Statutory audit, regulation and the rights and duties of auditors",
        "Fundamental principles and the ACCA Code of Ethics",
        "Independence: threats and safeguards",
        "Confidentiality, conflicts of interest and money laundering",
        "Corporate governance and audit committees",
        "Internal audit and its relationship with external audit",
      ]),
      area("aa-planning", "Planning & risk assessment", 0.22, 5, [
        "Engagement acceptance and terms of engagement",
        "Understanding the entity and its environment",
        "Audit risk: inherent, control and detection risk",
        "Materiality and performance materiality",
        "Fraud, error and the auditor's responsibilities",
        "Laws and regulations (ISA 250)",
        "Analytical procedures at planning stage",
        "Audit documentation, strategy and plan",
        "Interim and final audit work",
      ]),
      area("aa-internal", "Internal control", 0.18, 5, [
        "Components of internal control systems",
        "Ascertaining and documenting systems",
        "Tests of control for sales, purchases, payroll and cash",
        "Control deficiencies, implications and recommendations",
        "Communication with management in a report to management",
        "Controls in a computerised environment",
      ]),
      area("aa-evidence", "Audit evidence", 0.28, 5, [
        "Financial statement assertions and sufficient appropriate evidence",
        "Audit procedures and the use of CAATs and data analytics",
        "Audit sampling methods",
        "Substantive procedures: receivables and revenue",
        "Substantive procedures: inventory and the attendance at count",
        "Substantive procedures: payables, accruals and purchases",
        "Substantive procedures: non-current assets and bank/cash",
        "Substantive procedures: share capital, reserves and directors' emoluments",
        "Written representations and using the work of others",
        "Not-for-profit and smaller entity considerations",
      ]),
      area("aa-review", "Review & reporting", 0.16, 5, [
        "Subsequent events procedures",
        "Going concern assessment and procedures",
        "Evaluation of misstatements and overall review",
        "The unmodified auditor's report and its elements",
        "Modified opinions: qualified, adverse and disclaimer",
        "Material uncertainty, emphasis and other matter paragraphs",
        "Reports to management and those charged with governance",
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
        "Nature and purpose of financial management",
        "Financial objectives, shareholder wealth and agency theory",
        "Stakeholders and not-for-profit objectives",
        "Financial intermediaries and capital markets",
        "Money markets and short-term instruments",
        "Economic policy, interest rates and their effect on business",
        "Regulation of financial markets",
      ]),
      area("fm-workingcapital", "Working capital management", 0.22, 5, [
        "Nature of working capital and the operating cycle",
        "Inventory management and the EOQ model",
        "Receivables management, credit policy and factoring",
        "Payables management and early settlement discounts",
        "Cash management models: Baumol and Miller-Orr",
        "Cash flow forecasting and short-term funding",
        "Working capital investment and financing policies",
      ]),
      area("fm-investment", "Investment appraisal", 0.24, 5, [
        "Payback and accounting rate of return",
        "Net present value and discounting techniques",
        "Internal rate of return and modified IRR",
        "Relevant cash flows and working capital flows",
        "Taxation and capital allowances in appraisal",
        "Inflation: money and real terms appraisal",
        "Asset replacement and equivalent annual cost",
        "Capital rationing: divisible and indivisible projects",
        "Risk, uncertainty and sensitivity analysis",
        "Lease versus buy decisions",
      ]),
      area("fm-finance", "Business finance & cost of capital", 0.24, 5, [
        "Short, medium and long-term sources of finance",
        "Equity finance, rights issues and market ratios",
        "Debt finance, convertibles and Islamic finance",
        "Small and medium enterprise finance gaps",
        "Cost of equity: dividend growth model and CAPM",
        "Cost of debt: bank debt, bonds and preference shares",
        "Weighted average cost of capital calculation and use",
        "Capital structure theories, gearing and risk",
        "Dividend policy and its practical influences",
      ]),
      area("fm-valuations", "Business valuations & risk management", 0.16, 4, [
        "Reasons for valuation and market efficiency",
        "Asset-based valuation models",
        "Income-based models: P/E and earnings yield",
        "Cash flow based models, including dividend valuation",
        "Valuation of debt and other financial assets",
        "Foreign currency risk: types and hedging techniques",
        "Interest rate risk: types and hedging techniques",
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
        "Agency theory and stakeholder theory in governance",
        "Governance structures, board composition and committees",
        "Directors' responsibilities, remuneration and reporting",
        "Public sector and not-for-profit governance",
        "Stakeholder analysis and Mendelow's matrix",
        "Leadership styles, influence and organisational culture",
        "Managing change and organisational development",
      ]),
      area("sbl-ethics", "Ethics & professionalism", 0.14, 5, [
        "Fundamental principles of the ACCA Code in a scenario",
        "Ethical threats, safeguards and conflicts of interest",
        "Ethical decision-making frameworks (Tucker, AAA)",
        "Kohlberg and ethical stances of organisations",
        "Corporate social responsibility and sustainability strategy",
        "Integrated reporting and the capitals",
      ]),
      area("sbl-strategy", "Strategy & business analysis", 0.24, 5, [
        "Strategic planning approaches and emergent strategy",
        "External analysis: PESTEL, scenarios and five forces",
        "Internal analysis: resources, capabilities and value chain",
        "SWOT synthesis and gap analysis",
        "Strategic choice: generic strategies and Ansoff",
        "Methods of development: organic, acquisition, alliances",
        "Strategy implementation, performance measures and project management",
        "Organisational structures for strategy delivery",
      ]),
      area("sbl-risk", "Risk & internal control", 0.16, 5, [
        "Risk identification, assessment and mapping",
        "Risk appetite, attitudes and the risk committee",
        "Risk management responses: TARA",
        "Internal control frameworks (COSO) and control environment",
        "Internal audit, assurance mapping and compliance",
        "Reporting on risk and internal control",
      ]),
      area("sbl-technology", "Technology, data analytics & innovation", 0.14, 4, [
        "Digital strategy, disruption and e-business models",
        "Information systems, IT strategy and controls",
        "Cyber security risks and responses",
        "Big data, data analytics and the 4Vs",
        "Automation, AI and robotic process automation in finance",
        "Business process change and process redesign",
        "Project management of change initiatives",
      ]),
      area("sbl-skills", "Professional skills & communication", 0.12, 5, [
        "Communication skills and persuasive argument",
        "Commercial acumen and demonstrating insight",
        "Analysis and evaluation of case information",
        "Scepticism and challenge of assumptions",
        "Report, briefing note and memo formats",
        "Slide notes, email and presentation formats",
        "Exam technique: time allocation across requirements",
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
        "Professional behaviour and compliance in reporting",
        "Ethical reporting judgements and earnings manipulation",
        "The Conceptual Framework applied to reporting problems",
        "Recognition, measurement and the reporting of substance",
        "Revision of the framework and its practical use in answers",
      ]),
      area("sbr-reporting", "Reporting the financial performance of entities", 0.3, 5, [
        "Revenue recognition judgements under IFRS 15",
        "Leases under IFRS 16: complex issues and sale and leaseback",
        "Financial instruments: classification, impairment and hedging",
        "Deferred tax and complex tax reconciliations",
        "Employee benefits under IAS 19",
        "Share-based payment under IFRS 2",
        "Provisions, contingencies and decommissioning",
        "Non-current assets, investment property and impairment",
        "Fair value measurement under IFRS 13",
        "Foreign currency transactions and hyperinflation",
      ]),
      area("sbr-groups", "Financial statements of group entities", 0.28, 5, [
        "Business combinations and goodwill measurement choices",
        "Complex groups and indirect holdings",
        "Step acquisitions and changes in ownership",
        "Disposals and loss of control",
        "Associates, joint ventures and joint operations",
        "Foreign subsidiaries and translation",
        "Consolidated statement of cash flows",
      ]),
      area("sbr-interpret", "Interpreting financial statements for stakeholders", 0.2, 5, [
        "Analysis for investors, lenders and other stakeholders",
        "Ratio analysis and the effect of accounting choices",
        "Earnings management and creative accounting signals",
        "Alternative performance measures and non-GAAP reporting",
        "Segment reporting and related party disclosures",
        "Reporting the impact of transactions on financial statements",
      ]),
      area("sbr-current", "Current developments in reporting", 0.1, 4, [
        "Sustainability reporting and IFRS S1/S2 developments",
        "Integrated reporting and management commentary",
        "Recent and proposed IFRS changes and exposure drafts",
        "Discussion of reporting deficiencies and improvements",
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
        "Investment, financing and dividend decisions interaction",
        "Ethical and governance issues in financial management",
        "Impact of regulation and environmental issues on strategy",
        "Management of international operations and objectives",
      ]),
      area("afm-appraisal", "Advanced investment appraisal", 0.28, 5, [
        "Free cash flow and free cash flow to equity",
        "Adjusted present value and financing side effects",
        "Risk-adjusted discount rates and asset betas",
        "Real options: value of delay, expansion and abandonment",
        "Black-Scholes applied to real options",
        "International investment appraisal and foreign cash flows",
        "Sensitivity, simulation and duration/Macaulay analysis",
        "Capital rationing and investment decisions under constraint",
      ]),
      area("afm-acquisitions", "Acquisitions & mergers", 0.24, 5, [
        "Reasons for acquisitions and synergy assessment",
        "Target valuation: cash flow, asset and market-based models",
        "Valuation of high-growth and intangible-heavy firms",
        "Forms of consideration and financing the bid",
        "Regulation of takeovers and defensive tactics",
        "Post-acquisition integration and gains to shareholders",
      ]),
      area("afm-restructuring", "Corporate reconstruction & reorganisation", 0.14, 4, [
        "Predicting and dealing with financial distress",
        "Financial reconstruction schemes and refinancing",
        "Management buy-outs and buy-ins",
        "Divestment, demergers, spin-offs and unbundling",
        "Evaluating reconstruction proposals for each stakeholder",
      ]),
      area("afm-risk", "Treasury & advanced risk management", 0.22, 5, [
        "Role of the treasury function and centralisation",
        "Currency risk: forwards, money market hedges and netting",
        "Currency futures and options hedging calculations",
        "Currency and interest rate swaps",
        "Interest rate risk: FRAs, futures and options",
        "Value at risk and hedge effectiveness",
        "Dividend policy, cash management and financing decisions",
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
        "Mission, objectives and the performance hierarchy",
        "Strategic, tactical and operational performance links",
        "Budgeting approaches and their behavioural effects",
        "Changing business environment and its impact on control",
        "Risk, uncertainty and scenario planning",
        "External influences: stakeholders, regulation, economy",
      ]),
      area("apm-systems", "Performance measurement systems & design", 0.2, 5, [
        "Management accounting and information systems",
        "Sources, quality and cost of information",
        "Big data, data analytics and performance reporting",
        "Management reports: content, format and audience",
        "Performance management systems and their design faults",
        "Lean information and dashboards",
      ]),
      area("apm-measurement", "Strategic performance measurement", 0.32, 5, [
        "Financial performance measures and ratio-based analysis",
        "Divisional performance: ROI, residual income and EVA",
        "Economic value added calculation and interpretation",
        "Transfer pricing in divisionalised and international groups",
        "Non-financial measures and integrated frameworks",
        "Balanced scorecard, performance pyramid and building blocks",
        "Value for money and not-for-profit/public sector performance",
        "Benchmarking and league tables",
      ]),
      area("apm-failure", "Performance evaluation & corporate failure", 0.24, 5, [
        "Alternative views of performance measurement",
        "Behavioural aspects, gaming and short-termism",
        "Reward schemes and management performance evaluation",
        "Quality management, TQM and cost of quality",
        "Corporate failure prediction: Z-scores and Argenti",
        "Performance measurement in the context of failure risk",
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
        "Income tax planning and the choice of business medium",
        "Employment versus self-employment and remuneration packages",
        "Share schemes and employment-related securities",
        "Residence, domicile and the remittance basis",
        "Overseas income, double tax relief and expatriates",
        "Pensions, investment products and tax-efficient savings",
        "Personal tax planning and the interaction of taxes",
      ]),
      area("atx-cgt-iht", "Capital gains & inheritance tax planning", 0.26, 5, [
        "CGT reliefs in planning: BADR, rollover, gift relief",
        "Interaction of CGT and IHT on lifetime gifts",
        "Trusts: creation, taxation and use in planning",
        "Business property relief and agricultural property relief",
        "Death estate planning, wills and deeds of variation",
        "Overseas aspects of CGT and IHT",
      ]),
      area("atx-corporate", "Corporate taxation & groups", 0.26, 5, [
        "Corporation tax planning and loss utilisation",
        "Group relief and consortium relief planning",
        "Capital gains groups, reorganisations and reconstructions",
        "Purchase of own shares and company distributions",
        "Overseas aspects: permanent establishments and branches",
        "Transfer pricing and controlled foreign companies",
        "Liquidation, cessation and winding up considerations",
      ]),
      area("atx-vat-admin", "VAT, administration & ethics", 0.18, 4, [
        "Advanced VAT: partial exemption and capital goods scheme",
        "VAT groups, transfers of a going concern",
        "VAT on land and buildings and the option to tax",
        "Overseas VAT: place of supply and imports/exports",
        "Tax administration, enquiries, penalties and disclosure",
        "Professional ethics and tax avoidance versus evasion",
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
        "Legal and regulatory environment of audit",
        "Money laundering, laws and regulations",
        "Quality management at firm level (ISQM 1)",
        "Fundamental principles and independence threats in scenarios",
        "Conflicts of interest and confidentiality",
        "Professional liability, negligence and limiting liability",
        "Outsourcing and the audit of outsourced functions",
      ]),
      area("aaa-acceptance", "Practice management & engagement acceptance", 0.14, 4, [
        "Advertising, tendering and obtaining professional work",
        "Fee setting, lowballing and contingent fees",
        "Engagement acceptance and continuance decisions",
        "Terms of engagement and pre-conditions",
        "Quality management at engagement level (ISQM 2, ISA 220)",
      ]),
      area("aaa-planning", "Planning & risk assessment", 0.26, 5, [
        "Understanding a complex entity and business risk",
        "Risk of material misstatement and significant risks",
        "Materiality judgements in scenarios",
        "Group audits, components and significance",
        "Using the work of component auditors and experts",
        "Analytical procedures and data analytics in planning",
        "Audit strategy, planning and interim considerations",
      ]),
      area("aaa-evidence", "Evidence & audit of complex balances", 0.22, 5, [
        "Auditing accounting estimates and fair values",
        "Auditing provisions, contingencies and impairment",
        "Auditing revenue, inventory and construction contracts",
        "Going concern: procedures and evaluation",
        "Subsequent events and written representations",
        "Evaluation of misstatements and completion procedures",
        "Audit of financial instruments and share-based payment",
      ]),
      area("aaa-reporting", "Reporting & other assignments", 0.18, 5, [
        "The auditor's report and key audit matters",
        "Modified opinions and their justification",
        "Material uncertainty related to going concern reporting",
        "Reports to those charged with governance and management",
        "Review engagements and interim reviews",
        "Prospective financial information engagements",
        "Due diligence, forensic and other assurance assignments",
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
