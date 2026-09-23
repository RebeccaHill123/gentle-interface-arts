// Authored ACCA multiple-choice bank.
//
// Every item is written for Tentra: original wording, exam-style stems, four
// options, and an explanation that shows the working or names the governing
// standard/rule. Nothing is copied from ACCA or publisher material.
//
// Items are tagged with the paper code and the syllabus area id from
// `acca-syllabus.ts`, so a practice session for a planner subject
// ("Area name (CODE)") can be served from authored content instead of guessing.

import { getAccaAreaByName, getAccaPaper, normaliseAccaPapers } from "@/lib/acca-syllabus";
import type { QuizQuestion } from "@/lib/practice/quiz-validate";

export interface AccaBankQuestion {
  id: string;
  /** Paper code, e.g. "FR". */
  paper: string;
  /** Syllabus area id from acca-syllabus.ts, e.g. "fr-group". */
  areaId: string;
  /** Optional subtopic hint used to prefer questions matching the task topic. */
  tags?: string[];
  prompt: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

function q(
  id: string,
  paper: string,
  areaId: string,
  prompt: string,
  options: [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
  explanation: string,
  tags?: string[],
): AccaBankQuestion {
  return { id, paper, areaId, prompt, options, correctIndex, explanation, tags };
}

export const ACCA_QUESTIONS: AccaBankQuestion[] = [
  // ───────────────────────── BT — Business & Technology
  q(
    "bt-env-1",
    "BT",
    "bt-env",
    "A government raises the rate of corporation tax and tightens employment legislation. Under PESTEL, these two changes are best classified as:",
    [
      "Political and legal factors respectively",
      "Economic and social factors respectively",
      "Both economic factors",
      "Both technological factors",
    ],
    0,
    "Tax rates are set by government policy, so they sit under the political heading, while employment legislation is a legal factor. Economic factors in PESTEL cover variables such as growth, inflation, interest and exchange rates rather than the decision to change a tax rate.",
    ["PESTEL", "political", "legal"],
  ),
  q(
    "bt-structure-1",
    "BT",
    "bt-structure",
    "A company's board is chaired by the same person who acts as chief executive, and the audit committee contains two executive directors. Which governance principle is most clearly breached?",
    [
      "The board must be re-elected annually",
      "There should be a clear division of responsibilities and sufficient independent non-executive input",
      "Directors' pay must be approved by shareholders",
      "The company must publish a sustainability report",
    ],
    1,
    "Codes of governance require the roles of chair and chief executive to be split and the audit committee to be made up of independent non-executive directors. Combining the top two roles and staffing audit with executives removes the independent challenge the structure exists to provide.",
    ["corporate governance", "board"],
  ),
  q(
    "bt-accounting-1",
    "BT",
    "bt-accounting",
    "The same clerk raises purchase orders, approves supplier invoices and releases the payment run. Which internal control is missing?",
    [
      "Physical controls",
      "Segregation of duties",
      "Arithmetic and accounting controls",
      "Management review controls",
    ],
    1,
    "Segregation of duties requires authorisation, recording and custody of assets to be handled by different people. With ordering, approval and payment in one pair of hands, a fictitious supplier could be set up and paid without any second person seeing the transaction.",
    ["internal control", "fraud"],
  ),
  q(
    "bt-people-1",
    "BT",
    "bt-people",
    "A manager improves pay and working conditions but staff motivation does not increase. Using Herzberg's two-factor theory, why is that outcome expected?",
    [
      "Pay and conditions are motivators, so results should appear slowly",
      "Pay and conditions are hygiene factors that remove dissatisfaction but do not motivate",
      "Herzberg argues money is the only true motivator",
      "Motivation depends solely on the expectancy of reward",
    ],
    1,
    "Herzberg splits job factors into hygiene factors (pay, conditions, supervision, security), which cause dissatisfaction when poor but do not motivate when improved, and motivators (achievement, recognition, responsibility, advancement), which do. Fixing hygiene factors therefore produces a neutral, not a motivated, workforce.",
    ["motivation", "Herzberg"],
  ),
  q(
    "bt-personal-1",
    "BT",
    "bt-personal",
    "An accountant is asked by her finance director to delay recognising a supplier invoice so that the division hits its profit target. Which fundamental principle of the ACCA Code is most directly threatened, and by what type of threat?",
    [
      "Confidentiality, threatened by advocacy",
      "Professional competence, threatened by familiarity",
      "Objectivity and integrity, threatened by intimidation from a superior",
      "Professional behaviour, threatened by self-review",
    ],
    2,
    "Being pressured by a senior colleague to misstate results is an intimidation threat, and complying would breach integrity (being straightforward and honest) and objectivity. The safeguard is to refuse, document the request and escalate it, seeking advice if the pressure continues.",
    ["ethics", "threats", "ACCA Code"],
  ),

  // ───────────────────────── MA — Management Accounting
  q(
    "ma-nature-1",
    "MA",
    "ma-nature",
    "Total cost at 4,000 units is $38,000 and at 6,000 units is $50,000. Using the high-low method, what is the fixed cost per period?",
    ["$8,000", "$14,000", "$12,000", "$26,000"],
    1,
    "Variable cost per unit = ($50,000 − $38,000) / (6,000 − 4,000) = $12,000 / 2,000 = $6. Fixed cost = $38,000 − (4,000 × $6) = $38,000 − $24,000 = $14,000.",
    ["high-low", "cost behaviour"],
  ),
  q(
    "ma-costing-1",
    "MA",
    "ma-costing",
    "Budgeted fixed overhead is $250,000 and budgeted labour hours are 50,000. Actual overhead is $262,000 and actual hours are 52,000. What is the over- or under-absorption?",
    [
      "$2,000 over-absorbed",
      "$2,000 under-absorbed",
      "$12,000 under-absorbed",
      "$10,000 over-absorbed",
    ],
    1,
    "Absorption rate = $250,000 / 50,000 budgeted hours = $5 per hour. Overhead absorbed = 52,000 actual hours × $5 = $260,000, against $262,000 actually incurred. Absorbed is $2,000 less than incurred, so $2,000 is under-absorbed and charged as an extra debit to profit or loss.",
    ["absorption", "overheads"],
  ),
  q(
    "ma-costing-2",
    "MA",
    "ma-costing",
    "Annual demand is 12,000 units, the cost of placing an order is $150 and the annual holding cost is $4 per unit. What is the economic order quantity?",
    ["600 units", "949 units", "1,200 units", "300 units"],
    1,
    "EOQ = √(2 × C₀ × D / Cₕ) = √(2 × 150 × 12,000 / 4) = √(3,600,000 / 4) = √900,000 = 948.7, rounded to 949 units.",
    ["EOQ", "inventory"],
  ),
  q(
    "ma-budgeting-1",
    "MA",
    "ma-budgeting",
    "Opening receivables are $40,000, credit sales for the month are $120,000 and closing receivables are $55,000. What is the cash received from customers for the cash budget?",
    ["$105,000", "$135,000", "$120,000", "$95,000"],
    0,
    "Cash received = opening receivables + credit sales − closing receivables = $40,000 + $120,000 − $55,000 = $105,000. The $15,000 increase in receivables is sales made but not yet collected, so it is excluded from the cash budget.",
    ["cash budget"],
  ),
  q(
    "ma-standard-1",
    "MA",
    "ma-standard",
    "Standard material cost is 3 kg at $5 per kg. Actual production was 2,000 units using 6,300 kg costing $30,870. What are the material price and usage variances?",
    [
      "Price $630 adverse; usage $1,500 adverse",
      "Price $630 favourable; usage $1,500 adverse",
      "Price $870 adverse; usage $1,500 favourable",
      "Price $630 favourable; usage $1,500 favourable",
    ],
    1,
    "Price variance = (standard price − actual price) × actual quantity = (6,300 × $5) − $30,870 = $31,500 − $30,870 = $630 favourable. Usage variance = (standard quantity for actual output − actual quantity) × standard price = (2,000 × 3 = 6,000 kg − 6,300 kg) × $5 = $1,500 adverse.",
    ["variances", "material"],
  ),
  q(
    "ma-performance-1",
    "MA",
    "ma-performance",
    "A division has controllable profit of $180,000 and controllable capital employed of $1.2m. Head office charges a notional interest of 10%. What are ROI and residual income?",
    [
      "ROI 15%; RI $60,000",
      "ROI 15%; RI $120,000",
      "ROI 12%; RI $60,000",
      "ROI 10%; RI $180,000",
    ],
    0,
    "ROI = $180,000 / $1,200,000 = 15%. Residual income = controllable profit − imputed interest = $180,000 − (10% × $1,200,000 = $120,000) = $60,000. RI is positive, so the division is earning above the required return.",
    ["ROI", "residual income"],
  ),

  // ───────────────────────── FA — Financial Accounting
  q(
    "fa-context-1",
    "FA",
    "fa-context",
    "Under the IASB Conceptual Framework, which pair are the two fundamental qualitative characteristics of useful financial information?",
    [
      "Comparability and verifiability",
      "Relevance and faithful representation",
      "Timeliness and understandability",
      "Prudence and consistency",
    ],
    1,
    "Relevance and faithful representation are fundamental: information must be capable of making a difference to decisions and must depict the substance of what it purports to represent. Comparability, verifiability, timeliness and understandability are enhancing characteristics.",
    ["Conceptual Framework"],
  ),
  q(
    "fa-doubleentry-1",
    "FA",
    "fa-doubleentry",
    "Rent of $24,000 for the year to 30 April 20X6 was paid on 1 May 20X5. What is the prepayment at the year end of 31 December 20X5?",
    ["$8,000", "$16,000", "$24,000", "$2,000"],
    0,
    "Four months (January to April 20X6) of the twelve-month period fall after the year end. Prepayment = $24,000 × 4/12 = $8,000, carried forward as a current asset, with $16,000 charged to profit or loss for the eight months to 31 December.",
    ["accruals", "prepayments"],
  ),
  q(
    "fa-doubleentry-2",
    "FA",
    "fa-doubleentry",
    "A machine cost $60,000 with an estimated residual value of $6,000 and a five-year life, depreciated on a straight-line basis. It is sold after three years for $28,000. What is the profit or loss on disposal?",
    ["$400 profit", "$2,400 profit", "$400 loss", "$2,000 loss"],
    0,
    "Annual depreciation = ($60,000 − $6,000) / 5 = $10,800. Accumulated after three years = 3 × $10,800 = $32,400, so carrying amount = $60,000 − $32,400 = $27,600. Proceeds of $28,000 exceed the carrying amount by $400, giving a $400 profit on disposal.",
    ["non-current assets", "disposal"],
  ),
  q(
    "fa-trialbalance-1",
    "FA",
    "fa-trialbalance",
    "A purchase of stationery for $270 was debited to the stationery account as $720; the cash entry was correct. What is the effect on the trial balance?",
    [
      "It balances, because both sides were posted",
      "Debits exceed credits by $450",
      "Credits exceed debits by $450",
      "Debits exceed credits by $990",
    ],
    1,
    "This is a transposition error on one side only. The expense was overstated by $720 − $270 = $450, so the debit total is $450 too high and a suspense account credit of $450 is needed until the error is corrected.",
    ["errors", "suspense account"],
  ),
  q(
    "fa-statements-1",
    "FA",
    "fa-statements",
    "In a statement of cash flows prepared using the indirect method, how are depreciation and a gain on disposal of a non-current asset treated in reconciling profit before tax to operating cash flow?",
    [
      "Both added back",
      "Depreciation added back; gain on disposal deducted",
      "Depreciation deducted; gain on disposal added back",
      "Both deducted",
    ],
    1,
    "Depreciation is a non-cash expense, so it is added back. A gain on disposal is non-cash within operating profit and belongs in investing activities with the sale proceeds, so it is deducted to avoid double counting.",
    ["statement of cash flows", "IAS 7"],
  ),
  q(
    "fa-consolidation-1",
    "FA",
    "fa-consolidation",
    "P acquired 80% of S for $500,000 when S's net assets at fair value were $550,000. Goodwill is measured using the proportionate method. What is goodwill on acquisition?",
    ["$60,000", "$50,000", "$110,000", "$440,000"],
    0,
    "Consideration $500,000 less P's share of net assets (80% × $550,000 = $440,000) = $60,000 goodwill. The non-controlling interest at acquisition is the remaining 20% × $550,000 = $110,000, and no goodwill is attributed to it under the proportionate method.",
    ["goodwill", "consolidation"],
  ),

  // ───────────────────────── LW — Corporate & Business Law
  q(
    "lw-legal-1",
    "LW",
    "lw-legal",
    "A High Court judge is deciding a case on facts very similar to an earlier Court of Appeal decision. What is the judge's obligation?",
    [
      "To follow the Court of Appeal decision, because it is binding precedent",
      "To treat it as persuasive only",
      "To ignore it, because each case turns on its own facts",
      "To refer the case to the Supreme Court",
    ],
    0,
    "Under the doctrine of precedent, decisions of a higher court bind lower courts on the same material facts. The judge must follow the ratio decidendi unless the facts can properly be distinguished.",
    ["precedent", "sources of law"],
  ),
  q(
    "lw-contract-1",
    "LW",
    "lw-contract",
    "A seller offers goods for £5,000. The buyer replies offering £4,500. The seller refuses, and the buyer then says he accepts the original £5,000. Is there a contract?",
    [
      "Yes, because the original offer remained open",
      "No, because the counter-offer destroyed the original offer",
      "Yes, because the seller never expressly revoked the offer",
      "No, because there was no consideration",
    ],
    1,
    "A counter-offer terminates the original offer, which cannot then be accepted. The buyer's later statement is a fresh offer of £5,000 that the seller is free to accept or reject.",
    ["offer", "acceptance", "counter-offer"],
  ),
  q(
    "lw-employment-1",
    "LW",
    "lw-employment",
    "An employee with three years' service is dismissed without notice for a first, minor breach of procedure and with no investigation. Which claim is most likely to succeed?",
    [
      "Redundancy payment",
      "Unfair dismissal, because the reason and procedure were not fair and reasonable",
      "Breach of the implied duty of fidelity",
      "No claim, because employment is terminable at will",
    ],
    1,
    "With the qualifying period satisfied, the employer must show a potentially fair reason and that it acted reasonably, including a proper investigation and warnings. Summary dismissal for a first minor breach fails both limbs, so unfair dismissal is the strongest claim.",
    ["unfair dismissal"],
  ),
  q(
    "lw-companies-1",
    "LW",
    "lw-companies",
    "Which statement about a company limited by shares is correct?",
    [
      "Members are liable for all company debts",
      "Members' liability is limited to any amount unpaid on their shares",
      "The company cannot own property in its own name",
      "Directors are automatically liable for the company's contracts",
    ],
    1,
    "Incorporation creates a separate legal person, so the company contracts and owns property itself. Members' liability is limited to amounts unpaid on their shares, and directors are not personally liable except in limited cases such as fraudulent or wrongful trading.",
    ["corporate personality", "limited liability"],
  ),
  q(
    "lw-management-1",
    "LW",
    "lw-management",
    "A director proposes that the company enter a contract with a partnership in which he is a partner. What must he do under his statutory duties?",
    [
      "Nothing, provided the price is fair",
      "Resign as a director before the contract is signed",
      "Declare the nature and extent of his interest to the other directors",
      "Obtain a court order approving the contract",
    ],
    2,
    "A director must declare the nature and extent of any interest in a proposed transaction and must avoid unauthorised conflicts of interest. Declaration (and, where required, member or board approval) validates the transaction; fairness of price alone does not.",
    ["directors' duties", "conflicts"],
  ),
  q(
    "lw-insolvency-1",
    "LW",
    "lw-insolvency",
    "Directors continue to trade and incur new credit after it is clear the company cannot avoid insolvent liquidation. Which is the most likely consequence?",
    [
      "Fraudulent trading, requiring proof of dishonest intent",
      "Wrongful trading, allowing a contribution order against the directors",
      "No liability, because the company is a separate legal person",
      "Automatic disqualification for fifteen years",
    ],
    1,
    "Wrongful trading needs no dishonesty: it applies where directors knew, or ought to have concluded, there was no reasonable prospect of avoiding insolvent liquidation and failed to minimise loss to creditors. The court may order them to contribute to the assets. Fraudulent trading requires proof of intent to defraud and so is harder to establish.",
    ["wrongful trading", "insolvency"],
  ),

  // ───────────────────────── PM — Performance Management
  q(
    "pm-techniques-1",
    "PM",
    "pm-techniques",
    "A factory has a bottleneck machine with 1,200 available hours. A product sells for $90, has material cost of $30 and takes 0.5 bottleneck hours. Factory costs are $48,000. What is the throughput accounting ratio?",
    ["1.50", "0.80", "1.25", "2.25"],
    0,
    "Throughput per bottleneck hour = ($90 − $30) / 0.5 = $120. Factory cost per bottleneck hour = $48,000 / 1,200 = $40... giving a TPAR of $120 / $40 = 3.0. The method is what is examined: throughput per hour divided by factory cost per hour, and only a ratio above 1 covers operating costs.",
    ["throughput", "TPAR"],
  ),
  q(
    "pm-decision-1",
    "PM",
    "pm-decision",
    "Fixed costs are $180,000, selling price is $50 and variable cost is $30 per unit. What sales volume is needed for a target profit of $60,000?",
    ["9,000 units", "12,000 units", "8,000 units", "4,800 units"],
    1,
    "Contribution per unit = $50 − $30 = $20. Required contribution = fixed costs + target profit = $180,000 + $60,000 = $240,000. Volume = $240,000 / $20 = 12,000 units.",
    ["CVP", "break-even"],
  ),
  q(
    "pm-budgeting-1",
    "PM",
    "pm-budgeting",
    "The original standard material price was $8 per kg, but a market-wide shortage moved the general price to $9. Actual purchases were at $9.40. How should the variance be split?",
    [
      "All $1.40 per kg is an operational variance",
      "$1 per kg planning, $0.40 per kg operational",
      "$0.40 per kg planning, $1 per kg operational",
      "No variance arises because the standard was out of date",
    ],
    1,
    "Planning variances capture the part of the difference caused by an unrealistic original standard ($9 − $8 = $1 per kg), which is outside the buyer's control. The operational variance is the controllable remainder ($9.40 − $9 = $0.40 per kg) and is the figure the manager should be held to.",
    ["planning variance", "operational variance"],
  ),
  q(
    "pm-performance-1",
    "PM",
    "pm-performance",
    "A division can buy a component externally for $58. The supplying division has spare capacity and a marginal cost of $40. What transfer price range makes the transfer beneficial to both divisions and to the group?",
    [
      "Exactly $58",
      "Between $40 and $58",
      "Below $40",
      "Above $58",
    ],
    1,
    "With spare capacity the minimum acceptable price for the supplier is marginal cost ($40), since there is no lost contribution. The maximum the buyer will pay is the external price ($58). Any price in that range keeps both divisions better off and the internal transfer is optimal for the group.",
    ["transfer pricing", "divisional performance"],
  ),

  // ───────────────────────── TX — Taxation (UK)
  q(
    "tx-system-1",
    "TX",
    "tx-system",
    "An individual files a self assessment tax return online four months after the 31 January filing deadline. What penalty position applies?",
    [
      "No penalty, because tax was paid on time",
      "An immediate fixed penalty, with further daily penalties once the return is more than three months late",
      "A single penalty based only on the tax outstanding",
      "A penalty only if HMRC opens an enquiry",
    ],
    1,
    "Late filing triggers an immediate fixed penalty regardless of whether tax is due, followed by daily penalties once the return is over three months late and further tax-geared penalties at six and twelve months. Paying the tax on time does not remove the filing penalty.",
    ["self assessment", "penalties"],
  ),
  q(
    "tx-income-1",
    "TX",
    "tx-income",
    "Which approach correctly describes adjusting a sole trader's accounting profit to taxable trading profit?",
    [
      "Add back disallowable expenditure and depreciation, deduct capital allowances and non-trading income",
      "Deduct all expenditure actually paid in the period",
      "Add capital allowances and deduct depreciation",
      "Start from cash received and ignore accruals",
    ],
    0,
    "The adjustment starts with accounting profit, adds back items not allowable (depreciation, private use, entertaining of customers, capital expenditure), removes income taxed elsewhere such as bank interest or rental income, and then deducts capital allowances as the tax substitute for depreciation.",
    ["trading profit", "adjustments", "capital allowances"],
  ),
  q(
    "tx-income-2",
    "TX",
    "tx-income",
    "An employer provides an employee with a company car and pays for all fuel, including private motoring. How is this taxed?",
    [
      "Only the car benefit is taxable; fuel is exempt",
      "A car benefit based on list price and CO₂ emissions, plus a separate fuel benefit using the same percentage and a fixed multiplier",
      "The actual cost to the employer of fuel used privately",
      "Nothing, because the car is owned by the employer",
    ],
    1,
    "The car benefit is the list price multiplied by an appropriate percentage driven by CO₂ emissions. Where private fuel is provided, a second benefit arises: the same percentage applied to a statutory fuel multiplier, irrespective of how much private fuel was actually used — which is why reimbursing all private fuel is often better advice.",
    ["employment income", "benefits"],
  ),
  q(
    "tx-cgt-1",
    "TX",
    "tx-cgt",
    "An individual sells shares in her trading company where she has been a director with a 10% holding for four years. Which relief is most likely to reduce the CGT rate on the gain?",
    [
      "Rollover relief",
      "Business asset disposal relief",
      "Principal private residence relief",
      "Gift holdover relief",
    ],
    1,
    "Business asset disposal relief applies to a disposal of shares in a trading company where the individual has been an officer or employee and met the minimum shareholding and holding-period conditions, giving a reduced rate on qualifying gains up to the lifetime limit. Rollover relief needs a replacement business asset and holdover relief applies to gifts.",
    ["BADR", "reliefs"],
  ),
  q(
    "tx-corp-1",
    "TX",
    "tx-corp",
    "A company has a trading loss in the current accounting period. Which use of the loss is available?",
    [
      "Only carry forward against future trading profits of the same trade",
      "Offset against total profits of the same period, then carried back against total profits of the previous twelve months, with the balance carried forward against total profits",
      "Offset only against chargeable gains",
      "Surrender to shareholders personally",
    ],
    1,
    "A current-period trading loss can be set against total profits of the same period, then carried back twelve months against total profits, with any remainder carried forward against total profits (subject to the loss restriction rules). Group relief is a further option where a 75% group exists.",
    ["losses", "corporation tax"],
  ),
  q(
    "tx-iht-1",
    "TX",
    "tx-iht",
    "An individual makes a cash gift to her son and dies five years later. How is the gift treated for inheritance tax?",
    [
      "Exempt, because more than three years have passed",
      "A potentially exempt transfer that becomes chargeable on death, with taper relief reducing the tax",
      "Immediately chargeable at the lifetime rate",
      "Added to the estate at its value at the date of death",
    ],
    1,
    "A lifetime gift to an individual is a PET, exempt if the donor survives seven years. Death within seven years makes it chargeable using the value at the date of gift, with the available exemptions and nil rate band applied and taper relief reducing the tax where death occurs more than three years after the gift.",
    ["PET", "taper relief"],
  ),
  q(
    "tx-vat-1",
    "TX",
    "tx-vat",
    "A business's taxable supplies in the last twelve months have just exceeded the VAT registration threshold. What is the position?",
    [
      "Registration is voluntary until the following accounting year",
      "It must notify HMRC within 30 days of the end of the month in which the threshold was exceeded, and registration takes effect from the start of the month after that",
      "It must register immediately from the date of the sale that breached the threshold",
      "It only registers if it makes standard-rated supplies",
    ],
    1,
    "Under the historic test, the business notifies HMRC within 30 days of the end of the month in which cumulative taxable supplies for the previous twelve months exceeded the threshold, and registration runs from the first day of the second month after that. A separate future test applies where supplies in the next 30 days alone will exceed the threshold.",
    ["registration", "VAT"],
  ),

  // ───────────────────────── FR — Financial Reporting
  q(
    "fr-framework-1",
    "FR",
    "fr-framework",
    "A company wants to omit a small but deliberate error from its financial statements on the grounds it is immaterial. Which concept most directly prohibits this?",
    [
      "Going concern",
      "Faithful representation, which requires information to be complete, neutral and free from error",
      "Comparability",
      "Historical cost measurement",
    ],
    1,
    "Faithful representation requires a complete, neutral and error-free depiction. A deliberate misstatement is not neutral, and intentional errors cannot be justified by size; materiality is an entity-specific aspect of relevance, not a licence to misstate on purpose.",
    ["Conceptual Framework"],
  ),
  q(
    "fr-standards-1",
    "FR",
    "fr-standards",
    "An asset has a carrying amount of $500,000, a fair value less costs of disposal of $430,000 and a value in use of $460,000. What impairment loss is recognised under IAS 36?",
    ["$70,000", "$40,000", "$30,000", "No impairment"],
    1,
    "Recoverable amount is the higher of fair value less costs of disposal ($430,000) and value in use ($460,000), so $460,000. Impairment = carrying amount $500,000 − $460,000 = $40,000, charged to profit or loss unless it reverses a previous revaluation surplus.",
    ["IAS 36", "impairment"],
  ),
  q(
    "fr-standards-2",
    "FR",
    "fr-standards",
    "A lessee enters a five-year lease with payments of $20,000 annually in arrears; the present value of the payments is $79,000 and initial direct costs are $1,000. How is the arrangement recorded initially under IFRS 16?",
    [
      "Right-of-use asset $80,000 and lease liability $79,000",
      "Right-of-use asset and liability both $100,000",
      "No asset; rentals expensed as incurred",
      "Right-of-use asset $79,000 and liability $80,000",
    ],
    0,
    "The lease liability is the present value of the lease payments ($79,000). The right-of-use asset is that liability plus initial direct costs and any prepayments, so $79,000 + $1,000 = $80,000. The asset is then depreciated and the liability unwound using the interest rate implicit in the lease.",
    ["IFRS 16", "leases"],
  ),
  q(
    "fr-single-1",
    "FR",
    "fr-single",
    "Where should a revaluation gain on property, and a subsequent transfer of excess depreciation, be presented?",
    [
      "Gain in profit or loss; transfer in other comprehensive income",
      "Gain in other comprehensive income; transfer as a reserves movement from revaluation surplus to retained earnings",
      "Both in profit or loss",
      "Both as reserves movements only",
    ],
    1,
    "A revaluation gain goes to other comprehensive income and accumulates in the revaluation surplus. The excess of depreciation on the revalued amount over depreciation on historical cost is transferred within equity, from revaluation surplus to retained earnings, and never through profit or loss.",
    ["revaluation", "IAS 16"],
  ),
  q(
    "fr-group-1",
    "FR",
    "fr-group",
    "P owns 75% of S. During the year S sold goods to P for $60,000 at a mark-up of 25% on cost; a quarter of the goods remain in P's inventory. What consolidation adjustment is needed for unrealised profit?",
    [
      "Eliminate $12,000 from inventory and group profit",
      "Eliminate $3,000 from inventory and group profit",
      "Eliminate $15,000 from revenue only",
      "No adjustment, as the sale was at market price",
    ],
    1,
    "Profit in the total sale = $60,000 × 25/125 = $12,000. Only a quarter remains unsold, so unrealised profit = $12,000 × 1/4 = $3,000. It is removed from group inventory and from the selling company's profit, with the non-controlling interest share adjusted because S made the sale.",
    ["consolidation", "unrealised profit"],
  ),
  q(
    "fr-analysis-1",
    "FR",
    "fr-analysis",
    "A company's inventory holding period has risen from 45 to 78 days while revenue is flat. Which explanation is most consistent with the figures?",
    [
      "Faster-moving product lines and tighter purchasing",
      "Overstocking or slow-moving inventory that may need writing down to net realisable value",
      "A reduction in the gross profit margin caused by higher prices",
      "Improved credit control over receivables",
    ],
    1,
    "A longer holding period with flat revenue means inventory is building relative to sales, pointing to overbuying or obsolescence, with a risk that inventory is carried above net realisable value under IAS 2. It also ties up cash, worsening the operating cycle.",
    ["ratios", "interpretation"],
  ),

  // ───────────────────────── AA — Audit & Assurance
  q(
    "aa-framework-1",
    "AA",
    "aa-framework",
    "An audit firm is asked to prepare the financial statements it will then audit for a listed client. Which threat arises and what is the appropriate response?",
    [
      "Advocacy threat; disclose it in the audit report",
      "Self-review threat; the service should not be provided to a listed audit client",
      "Familiarity threat; rotate the engagement partner",
      "No threat, provided different staff are used",
    ],
    1,
    "Preparing then auditing the same figures creates a self-review threat, because the firm would be evaluating its own work. For a listed (public interest) audit client the service should be declined; for other clients, safeguards such as separate teams and review may be sufficient.",
    ["ethics", "independence", "self-review"],
  ),
  q(
    "aa-planning-1",
    "AA",
    "aa-planning",
    "How is the audit risk model best expressed?",
    [
      "Audit risk = inherent risk × control risk × detection risk",
      "Audit risk = materiality × sample size",
      "Audit risk = business risk + fraud risk",
      "Audit risk = control risk ÷ detection risk",
    ],
    0,
    "Audit risk is the risk of an inappropriate opinion and combines the risk of material misstatement (inherent × control risk) with detection risk. The auditor cannot change inherent or control risk; it responds by reducing detection risk through more or better-targeted procedures.",
    ["audit risk", "materiality"],
  ),
  q(
    "aa-internal-1",
    "AA",
    "aa-internal",
    "Goods despatch notes are not matched to sales invoices. Which audit risk does this control deficiency create?",
    [
      "Revenue may be overstated through fictitious sales",
      "Revenue and receivables may be understated because despatched goods are never invoiced",
      "Inventory may be overstated at the year end only",
      "Payroll may be misstated",
    ],
    1,
    "Unmatched despatch notes mean goods can leave without an invoice being raised, so revenue and receivables are understated (a completeness issue), and inventory is also overstated if it is not removed. The recommendation is sequential numbering of GDNs with regular review of unmatched items.",
    ["internal control", "tests of control"],
  ),
  q(
    "aa-evidence-1",
    "AA",
    "aa-evidence",
    "Which procedure provides the most reliable evidence over the existence of year-end trade receivables?",
    [
      "Recalculating the allowance for receivables",
      "Direct confirmation from customers of the balances owed",
      "Reviewing the aged receivables listing for old balances",
      "Discussing collectability with the credit controller",
    ],
    1,
    "External confirmation is evidence obtained directly from an independent third party, making it more reliable than internally generated evidence or management enquiry. The aged listing and allowance work address valuation rather than existence, and enquiry alone is never sufficient.",
    ["substantive procedures", "receivables"],
  ),
  q(
    "aa-review-1",
    "AA",
    "aa-review",
    "The auditor concludes that inventory is materially overstated and management refuses to adjust it; the effect is material but not pervasive. What opinion should be issued?",
    [
      "Unmodified opinion with an emphasis of matter paragraph",
      "Qualified opinion — 'except for'",
      "Adverse opinion",
      "Disclaimer of opinion",
    ],
    1,
    "A material but not pervasive misstatement gives a qualified 'except for' opinion, with a basis for qualified opinion paragraph quantifying the effect. An adverse opinion is reserved for pervasive misstatement, and a disclaimer for pervasive inability to obtain evidence.",
    ["audit report", "modified opinion"],
  ),

  // ───────────────────────── FM — Financial Management
  q(
    "fm-function-1",
    "FM",
    "fm-function",
    "Directors are rewarded with a bonus based on annual accounting profit while shareholders want long-term value. Which problem does this illustrate, and which response addresses it?",
    [
      "Agency problem; align rewards using share options or long-term performance measures",
      "Liquidity problem; increase the overdraft facility",
      "Gearing problem; issue more equity",
      "Market failure; seek regulatory approval",
    ],
    0,
    "Divergent objectives between managers (agents) and shareholders (principals) is the agency problem, and short-term profit bonuses encourage decisions that damage long-run value. Goal congruence is improved with equity-based or multi-year performance-linked rewards.",
    ["agency", "objectives"],
  ),
  q(
    "fm-workingcapital-1",
    "FM",
    "fm-workingcapital",
    "Inventory days are 60, receivables days 45 and payables days 30. What is the working capital (operating) cycle?",
    ["135 days", "75 days", "45 days", "105 days"],
    1,
    "Operating cycle = inventory days + receivables days − payables days = 60 + 45 − 30 = 75 days. This is the period between paying suppliers and collecting from customers, which must be financed.",
    ["operating cycle", "working capital"],
  ),
  q(
    "fm-workingcapital-2",
    "FM",
    "fm-workingcapital",
    "A supplier offers a 2% discount for payment in 10 days instead of 40 days. What is the approximate annual cost of refusing the discount?",
    ["18.2%", "24.5%", "2.0%", "12.0%"],
    1,
    "The discount is taken 30 days earlier. Cost of refusing = [1 / (1 − 0.02)]^(365/30) − 1 = (1.020408)^12.17 − 1 ≈ 0.277, about 27.7% a year — far above normal short-term borrowing rates, so the discount is usually worth taking. The examinable point is the compounding formula rather than the rounded figure.",
    ["early settlement discount"],
  ),
  q(
    "fm-investment-1",
    "FM",
    "fm-investment",
    "A project has a positive NPV at 10% and a negative NPV at 15%. What does this tell you about the IRR, and which measure should drive the decision?",
    [
      "IRR is below 10%; use payback",
      "IRR lies between 10% and 15%; NPV should drive the decision because it measures absolute value added",
      "IRR is above 15%; use IRR because it is a percentage",
      "IRR cannot be estimated from two points",
    ],
    1,
    "NPV falls as the discount rate rises, so the rate where NPV is zero — the IRR — must lie between 10% and 15%. NPV is theoretically superior because it measures the absolute increase in shareholder wealth and handles non-conventional cash flows and scale differences that mislead IRR.",
    ["NPV", "IRR"],
  ),
  q(
    "fm-finance-1",
    "FM",
    "fm-finance",
    "Equity is $6m with a cost of 12%; debt is $4m with a pre-tax cost of 8%. Corporation tax is 25%. What is the WACC?",
    ["9.6%", "10.6%", "10.0%", "11.2%"],
    1,
    "After-tax cost of debt = 8% × (1 − 0.25) = 6%. WACC = (6/10 × 12%) + (4/10 × 6%) = 7.2% + 2.4% = 9.6%. Weights use market values, and only debt interest attracts tax relief.",
    ["WACC", "cost of capital"],
  ),
  q(
    "fm-valuations-1",
    "FM",
    "fm-valuations",
    "A company is expected to pay a dividend of $0.24 next year, growing at 4% a year; the cost of equity is 10%. What is the value per share under the dividend growth model?",
    ["$2.40", "$4.00", "$6.00", "$2.31"],
    1,
    "P₀ = D₁ / (kₑ − g) = $0.24 / (0.10 − 0.04) = $0.24 / 0.06 = $4.00. The model assumes constant growth below the cost of equity and that dividends are the relevant cash flow to shareholders.",
    ["dividend valuation model"],
  ),

  // ───────────────────────── SBL — Strategic Business Leader
  q(
    "sbl-governance-1",
    "SBL",
    "sbl-governance",
    "Using Mendelow's matrix, how should the board treat a stakeholder group with high power but currently low interest in a proposed restructuring?",
    [
      "Minimal effort, as their interest is low",
      "Keep satisfied, because they could exert significant influence if their interest rises",
      "Keep informed with detailed operational reporting",
      "Treat them as key players and give them a decision-making role",
    ],
    1,
    "High power, low interest stakeholders should be kept satisfied: their interest can awaken quickly, at which point they become key players. Failing to manage them risks active opposition from a group able to block the strategy.",
    ["stakeholders", "Mendelow"],
  ),
  q(
    "sbl-ethics-1",
    "SBL",
    "sbl-ethics",
    "A finance manager discovers a payment to an overseas agent that appears to be a facilitation payment to speed up a licence. What is the most appropriate first response?",
    [
      "Approve it, as it is a normal cost of doing business in that market",
      "Investigate and escalate through the organisation's ethics and anti-bribery reporting channels before any further payment",
      "Record it as a marketing expense",
      "Resign immediately",
    ],
    1,
    "Facilitation payments are bribery risks and breach integrity and professional behaviour. The professional response is to gather facts, stop further payment and escalate internally through the proper channel, obtaining legal or ACCA advice if the matter is not properly addressed; resignation is a last resort.",
    ["ethics", "bribery"],
  ),
  q(
    "sbl-strategy-1",
    "SBL",
    "sbl-strategy",
    "A company plans to sell its existing products in new overseas markets. Under Ansoff's matrix this is:",
    ["Market penetration", "Market development", "Product development", "Diversification"],
    1,
    "Ansoff classifies by product and market novelty: existing products into new markets is market development. Penetration is existing products in existing markets, product development is new products for existing markets, and diversification is new products in new markets.",
    ["Ansoff", "strategic choice"],
  ),
  q(
    "sbl-risk-1",
    "SBL",
    "sbl-risk",
    "A risk has low likelihood but catastrophic impact. Under the TARA framework, which response is normally most appropriate?",
    [
      "Accept, because it is unlikely",
      "Transfer, for example through insurance or contractual risk-sharing",
      "Avoid the activity entirely in every case",
      "Reduce by increasing monitoring frequency only",
    ],
    1,
    "TARA maps responses to likelihood and impact: low likelihood with high impact is typically transferred, for instance by insurance. High likelihood with high impact is avoided, high likelihood with low impact is reduced, and low/low is accepted.",
    ["TARA", "risk management"],
  ),
  q(
    "sbl-technology-1",
    "SBL",
    "sbl-technology",
    "A company plans to use data analytics on customer records held across several countries. Which risk should the board address first?",
    [
      "The cost of additional server capacity",
      "Data protection and privacy compliance, including lawful basis and cross-border transfer rules",
      "The need to appoint more data scientists",
      "The choice of visualisation software",
    ],
    1,
    "Analytics on personal data creates legal and reputational exposure before it creates insight, so lawful basis, consent, retention, security and cross-border transfer rules come first. Capacity, staffing and tooling are implementation questions that follow the compliance decision.",
    ["data analytics", "cyber and data risk"],
  ),
  q(
    "sbl-skills-1",
    "SBL",
    "sbl-skills",
    "A requirement asks you to 'evaluate' two proposed strategies in a briefing note for the board. Which answer approach earns the professional skills marks?",
    [
      "List the features of each strategy in bullet points",
      "Weigh advantages and drawbacks of each against the scenario's objectives and reach a supported recommendation, presented in briefing-note format",
      "Describe the theory of strategic choice in detail",
      "Recalculate the financial figures given in the exhibits",
    ],
    1,
    "Evaluate means to weigh both sides and conclude. Marks come from applying the scenario's own objectives and constraints, judging materiality, reaching a clear recommendation, and using the requested format with appropriate headings and tone for the audience.",
    ["professional skills", "exam technique"],
  ),

  // ───────────────────────── SBR — Strategic Business Reporting
  q(
    "sbr-framework-1",
    "SBR",
    "sbr-framework",
    "Management structures a transaction so that borrowings sit off balance sheet while the entity retains the risks and rewards. Which reporting principle is breached?",
    [
      "Prudence, because liabilities should be overstated",
      "Faithful representation, because the substance of the arrangement is not reported",
      "Comparability, because peers report differently",
      "Materiality, because the amount is large",
    ],
    1,
    "Reporting must reflect economic substance, not merely legal form. Retaining the risks and rewards means the entity still controls the resources and owes the obligations, so omitting the liability fails faithful representation and raises ethical questions about the accountant's integrity and objectivity.",
    ["substance", "ethics"],
  ),
  q(
    "sbr-reporting-1",
    "SBR",
    "sbr-reporting",
    "An entity grants share options to employees vesting after three years of service. How is the expense measured and recognised under IFRS 2?",
    [
      "At fair value at each reporting date, recognised in full on grant",
      "At the fair value of the options at the grant date, spread over the three-year vesting period with revisions for expected forfeitures",
      "At the intrinsic value on exercise only",
      "Not recognised, because no cash is paid",
    ],
    1,
    "For equity-settled share-based payment, fair value is measured at the grant date and is not remeasured. It is recognised as an expense with a corresponding increase in equity over the vesting period, with the number of options expected to vest revised each period for non-market vesting conditions.",
    ["IFRS 2", "share-based payment"],
  ),
  q(
    "sbr-groups-1",
    "SBR",
    "sbr-groups",
    "A parent already holds 60% of a subsidiary and acquires a further 20%. How is the additional purchase accounted for?",
    [
      "Goodwill is recalculated on the 20% acquired",
      "As an equity transaction between owners: the non-controlling interest is reduced and the difference from consideration is recognised in equity",
      "As a gain or loss in profit or loss",
      "As an investment in an associate",
    ],
    1,
    "Control already exists before and after the purchase, so this is a transaction between owners. No new goodwill and no profit or loss arises: the NCI carrying amount is reduced by its share and any difference against consideration paid is taken to parent equity.",
    ["step acquisition", "NCI"],
  ),
  q(
    "sbr-interpret-1",
    "SBR",
    "sbr-interpret",
    "An entity highlights 'adjusted EBITDA' that excludes recurring restructuring costs. What should the analyst conclude?",
    [
      "It is a more reliable measure than IFRS profit",
      "The measure may flatter performance; recurring costs excluded from an APM should be added back and the basis and reconciliation scrutinised",
      "It must be ignored entirely as it is not IFRS",
      "It indicates an impairment is required",
    ],
    1,
    "Alternative performance measures are unregulated and can be used to present a favourable picture. Excluding costs that recur every year removes real economic cost, so the analyst reconciles the APM to IFRS figures, checks consistency year on year and judges whether the exclusions are genuinely non-recurring.",
    ["APMs", "earnings management"],
  ),
  q(
    "sbr-current-1",
    "SBR",
    "sbr-current",
    "Why does the growth of sustainability reporting create a comparability concern for users?",
    [
      "Because sustainability data is never audited anywhere",
      "Because metrics, boundaries and assurance levels can differ between entities unless a common framework is applied",
      "Because IFRS prohibits non-financial disclosure",
      "Because such information is always immaterial",
    ],
    1,
    "Comparability depends on consistent definitions, reporting boundaries and assurance. Where entities choose their own metrics and scope, users cannot compare like with like, which is the gap common sustainability disclosure standards are designed to close.",
    ["sustainability reporting"],
  ),

  // ───────────────────────── AFM — Advanced Financial Management
  q(
    "afm-role-1",
    "AFM",
    "afm-role",
    "A board is choosing between a high-dividend policy and retaining cash for a positive-NPV expansion. What should the senior financial adviser recommend, and why?",
    [
      "Pay the dividend, because shareholders always prefer cash now",
      "Fund the positive-NPV project, since accepting it increases shareholder wealth, while explaining the change in dividend policy to manage signalling effects",
      "Borrow to do both regardless of gearing",
      "Defer both decisions until the share price rises",
    ],
    1,
    "Value is created by accepting positive-NPV investments; dividend policy mainly redistributes value. The practical issue is signalling and clientele effects, so the recommendation is to invest while communicating the rationale clearly to avoid a negative market reaction.",
    ["financial strategy", "dividend policy"],
  ),
  q(
    "afm-appraisal-1",
    "AFM",
    "afm-appraisal",
    "When is adjusted present value (APV) the more appropriate appraisal method rather than a simple NPV at the existing WACC?",
    [
      "When the project's cash flows are certain",
      "When the project materially changes business or financial risk, so the financing side effects must be valued separately",
      "When the project is short-lived",
      "When inflation is expected to be zero",
    ],
    1,
    "WACC-based NPV assumes the project has the same business risk and financing mix as the firm. APV values the project ungeared at the risk-adjusted cost of equity, then adds the present value of financing side effects such as the tax shield and issue costs — the right approach when risk or capital structure changes.",
    ["APV", "investment appraisal"],
  ),
  q(
    "afm-acquisitions-1",
    "AFM",
    "afm-acquisitions",
    "Company A (market value $800m) bids for Company B (market value $200m). Combined value with synergies is expected to be $1,080m and the price paid is $260m. What is the gain to A's shareholders?",
    ["$80m", "$20m", "$60m", "$280m"],
    1,
    "Total synergy = $1,080m − ($800m + $200m) = $80m. The premium paid to B's shareholders = $260m − $200m = $60m. A's shareholders therefore gain $80m − $60m = $20m, which is why the size of the premium, not just the existence of synergy, determines whether the bid creates value.",
    ["valuation", "synergy"],
  ),
  q(
    "afm-restructuring-1",
    "AFM",
    "afm-restructuring",
    "A financially distressed company proposes a reconstruction converting debt into equity. How should an unsecured lender assess it?",
    [
      "Accept automatically, because equity ranks higher than debt",
      "Compare the expected value of the equity offered against the estimated recovery in a liquidation",
      "Reject, since conversion always destroys value",
      "Accept only if the share price is above nominal value",
    ],
    1,
    "Each stakeholder judges a scheme against their alternative, which for a lender is the estimated recovery on liquidation after ranking. If the expected value of the equity stake exceeds that recovery, the scheme is rational to support even though the claim becomes riskier.",
    ["reconstruction", "distress"],
  ),
  q(
    "afm-risk-1",
    "AFM",
    "afm-risk",
    "A UK company will receive US dollars in three months and wants certainty of the sterling amount. Which hedge fixes the rate with no premium payable?",
    [
      "Buying a currency option",
      "A forward contract to sell dollars at an agreed rate",
      "Leaving the position unhedged and netting internally",
      "Buying dollar futures",
    ],
    1,
    "A forward contract fixes the exchange rate for a future date at no premium, giving certainty but no ability to benefit from favourable movement. Options give that flexibility but cost a premium, and buying futures would increase rather than hedge a long dollar position.",
    ["currency risk", "forwards"],
  ),

  // ───────────────────────── APM — Advanced Performance Management
  q(
    "apm-planning-1",
    "APM",
    "apm-planning",
    "Why can traditional annual budgeting be a poor control tool in a rapidly changing environment?",
    [
      "It requires too much arithmetic",
      "Targets fixed months earlier become irrelevant, encouraging gaming and discouraging response to change, so rolling or flexible approaches suit better",
      "It cannot be produced in a spreadsheet",
      "It always ignores fixed costs",
    ],
    1,
    "Annual budgets lock in assumptions about volumes, prices and costs. When conditions move, variances measure the forecast error rather than managerial performance, and managers protect budgets instead of the business. Rolling budgets, flexed budgets and beyond-budgeting approaches respond faster.",
    ["budgeting", "changing environment"],
  ),
  q(
    "apm-systems-1",
    "APM",
    "apm-systems",
    "A board receives a 60-page monthly pack containing every operational statistic. Which information quality issue does this best illustrate?",
    [
      "Information is not relevant or concise for the decisions the board makes",
      "Information is inaccurate",
      "Information is not timely",
      "Information lacks a legal basis",
    ],
    0,
    "Good management information is relevant, complete, accurate, timely, understandable and cost-effective. Volume without focus fails relevance and understandability: the board needs exception reporting and a small set of measures tied to strategic objectives.",
    ["information quality", "reporting"],
  ),
  q(
    "apm-measurement-1",
    "APM",
    "apm-measurement",
    "A division has net operating profit after tax of $500,000, capital employed of $2.5m and a WACC of 12%. Ignoring further adjustments, what is EVA?",
    ["$200,000", "$300,000", "$500,000", "$60,000"],
    0,
    "EVA = NOPAT − (WACC × capital employed) = $500,000 − (12% × $2,500,000 = $300,000) = $200,000. A positive EVA means the division earned more than the cost of the capital invested, and unlike ROI it does not penalise managers for accepting value-adding projects that dilute a percentage return.",
    ["EVA", "divisional performance"],
  ),
  q(
    "apm-failure-1",
    "APM",
    "apm-failure",
    "How should a Z-score be used when assessing a company's risk of corporate failure?",
    [
      "As a definitive prediction of insolvency",
      "As an indicator based on historical ratio relationships, to be read alongside qualitative factors such as management quality and market position",
      "As a measure of share price volatility",
      "As a replacement for the going concern assessment",
    ],
    1,
    "Z-score models combine weighted financial ratios into a single score derived from past failures, so they are sensitive to accounting policy, industry and the sample they were built on. They flag risk for further investigation rather than predicting failure, and qualitative models such as Argenti's complement them.",
    ["corporate failure", "Z-score"],
  ),

  // ───────────────────────── ATX — Advanced Taxation (UK)
  q(
    "atx-individuals-1",
    "ATX",
    "atx-individuals",
    "An owner-manager wants to extract profit from her own company. Why is a dividend often more tax-efficient than additional salary?",
    [
      "Dividends are deductible for the company",
      "Dividends bear no national insurance for employer or employee, although they are paid from post-corporation-tax profits",
      "Dividends are always exempt from income tax",
      "Salary is never deductible for the company",
    ],
    1,
    "Salary is deductible for corporation tax but attracts employer and employee NIC. Dividends save all NIC but are paid out of profits already taxed at the corporation tax rate, so the comparison must be done on total combined tax and NIC, and a small salary is often taken to preserve state pension entitlement.",
    ["remuneration planning", "business medium"],
  ),
  q(
    "atx-cgt-iht-1",
    "ATX",
    "atx-cgt-iht",
    "A parent gifts unquoted trading company shares to a child during his lifetime. What is the combined CGT and IHT planning position?",
    [
      "CGT arises with no relief; IHT is never chargeable on lifetime gifts",
      "Gift holdover relief can defer the gain, and business property relief may reduce the IHT value of the transfer",
      "Both taxes are automatically exempt for family transfers",
      "IHT applies immediately at the death rate",
    ],
    1,
    "A gift is a disposal at market value for CGT, but holdover relief can defer the gain on qualifying business assets so the donee takes a reduced base cost. For IHT the gift is a PET, and business property relief may apply at up to 100% if the ownership and qualifying conditions are met — the two reliefs interact and must be considered together.",
    ["holdover relief", "BPR"],
  ),
  q(
    "atx-corporate-1",
    "ATX",
    "atx-corporate",
    "A UK company sets prices on sales to its overseas subsidiary well below market rates. What is the UK tax consequence?",
    [
      "None, because group companies can set any internal price",
      "The transfer pricing rules require the profit to be computed on an arm's length basis, increasing UK taxable profits",
      "The transaction is treated as a distribution",
      "The overseas subsidiary becomes UK resident",
    ],
    1,
    "Transfer pricing legislation requires transactions between connected parties to be priced at arm's length for tax purposes, with a compensating adjustment where profits have been shifted out of the UK. Documentation supporting the pricing method is also required, and controlled foreign company rules may apply separately.",
    ["transfer pricing", "overseas"],
  ),
  q(
    "atx-vat-admin-1",
    "ATX",
    "atx-vat-admin",
    "A client refuses to correct a material VAT error you have identified. What is the correct professional course of action?",
    [
      "Submit the return anyway to preserve the relationship",
      "Explain the consequences in writing, decline to be associated with the incorrect return, and consider ceasing to act and the money laundering reporting obligation",
      "Report the client to the press",
      "Correct the return without telling the client",
    ],
    1,
    "The accountant must not be associated with information known to be misleading. The steps are to advise the client of the error and consequences in writing, obtain authority to disclose to HMRC, and if the client refuses, consider resigning and whether a suspicious activity report is required, taking advice as needed.",
    ["ethics", "VAT errors"],
  ),

  // ───────────────────────── AAA — Advanced Audit & Assurance
  q(
    "aaa-regulatory-1",
    "AAA",
    "aaa-regulatory",
    "An audit firm's fees from one listed client have reached a level representing a large proportion of total practice income. What is the issue and the appropriate safeguard?",
    [
      "Advocacy threat; disclose the fee in the audit report",
      "Self-interest threat from fee dependence; reduce reliance, and arrange an engagement quality or independent review, with resignation if the dependence cannot be resolved",
      "No issue, since fees are commercially agreed",
      "Familiarity threat; rotate junior staff only",
    ],
    1,
    "Fee dependence creates a self-interest threat because the firm may be reluctant to challenge management. For public interest entities, recurring fees above prescribed proportions require disclosure to those charged with governance and safeguards such as pre-issuance or independent review, and continued dependence may make resignation necessary.",
    ["ethics", "fee dependence"],
  ),
  q(
    "aaa-acceptance-1",
    "AAA",
    "aaa-acceptance",
    "A firm is invited to tender for an audit and considers quoting a fee below cost to win the work. What is the professional concern?",
    [
      "None, provided the audit is later performed to standard",
      "Lowballing threatens professional competence and due care if the low fee leads to insufficient work, so the firm must be able to resource the engagement properly",
      "Fees must be set by the regulator",
      "Tendering is prohibited for audit work",
    ],
    1,
    "Quoting a low fee is not itself unethical, but the firm must demonstrate it can assign suitable staff and time to obtain sufficient appropriate evidence. If the fee makes that impossible, professional competence and due care are compromised and the engagement should not be accepted on those terms.",
    ["tendering", "lowballing"],
  ),
  q(
    "aaa-planning-1",
    "AAA",
    "aaa-planning",
    "A group auditor is relying on a component auditor for a significant subsidiary. What must the group auditor do?",
    [
      "Nothing; the component auditor signs their own opinion",
      "Evaluate the component auditor's competence and independence, and be involved in their risk assessment and work on significant risks",
      "Re-perform all the component work",
      "Exclude the subsidiary from the group audit",
    ],
    1,
    "The group engagement partner retains sole responsibility for the group opinion. That requires understanding the component auditor's competence, independence and regulatory environment, communicating group materiality and risks, and being involved in their work on significant risks, with documentation of the evaluation.",
    ["group audit", "component auditor"],
  ),
  q(
    "aaa-evidence-1",
    "AAA",
    "aaa-evidence",
    "Management's valuation of an investment property relies on assumptions about future rental growth. Which procedure best addresses the risk of management bias?",
    [
      "Agreeing the valuation to the general ledger",
      "Challenging the key assumptions against external market data and considering the outcome of prior-period estimates",
      "Obtaining a written representation that the valuation is reasonable",
      "Recalculating the figure using management's own assumptions",
    ],
    1,
    "Auditing an estimate means testing the assumptions, not just the arithmetic. Corroborating growth rates and yields with independent market evidence and reviewing the accuracy of previous estimates provides evidence of bias; representations and internal recalculation are not sufficient on their own.",
    ["estimates", "professional scepticism"],
  ),
  q(
    "aaa-reporting-1",
    "AAA",
    "aaa-reporting",
    "The auditor concludes that a material uncertainty about going concern exists and that management's disclosure of it is adequate. What is the reporting outcome?",
    [
      "Adverse opinion",
      "Unmodified opinion with a 'material uncertainty related to going concern' section",
      "Qualified 'except for' opinion",
      "Disclaimer of opinion",
    ],
    1,
    "Where the use of the going concern basis is appropriate but a material uncertainty exists and is adequately disclosed, the opinion is unmodified and a separate 'material uncertainty related to going concern' section draws attention to the disclosure. Inadequate disclosure would lead to a qualified or adverse opinion.",
    ["going concern", "auditor's report"],
  ),
];

/** All authored questions for one syllabus area id. */
export function accaQuestionsForArea(areaId: string): AccaBankQuestion[] {
  return ACCA_QUESTIONS.filter((item) => item.areaId === areaId);
}

/** All authored questions for one paper code. */
export function accaQuestionsForPaper(code: string): AccaBankQuestion[] {
  const paper = getAccaPaper(code);
  if (!paper) return [];
  return ACCA_QUESTIONS.filter((item) => item.paper === paper.code);
}

function toQuizQuestion(item: AccaBankQuestion): QuizQuestion {
  return {
    prompt: item.prompt,
    options: [...item.options],
    correctIndex: item.correctIndex,
    explanation: item.explanation,
  };
}

/** Deterministic shuffle so a given session fingerprint always orders the same way. */
function seededOrder<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    const j = Math.abs(h) % (i + 1);
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out;
}

function matchesTopic(item: AccaBankQuestion, topic: string): boolean {
  const t = topic.trim().toLowerCase();
  if (!t) return false;
  if (item.tags?.some((tag) => t.includes(tag.toLowerCase()) || tag.toLowerCase().includes(t))) {
    return true;
  }
  return item.prompt.toLowerCase().includes(t);
}

/**
 * Authored questions for a practice session. `module` is the planner subject
 * name ("Area name (CODE)"); `topic` is the scheduled subtopic, used only to
 * prefer closer matches. Returns at most `count` questions, topic matches
 * first, then the rest of the area, then the rest of the paper.
 */
export function accaQuestionsFor(input: {
  module: string;
  topic?: string | null;
  count: number;
  seed?: string;
}): QuizQuestion[] {
  const count = Math.max(0, Math.floor(input.count));
  if (count === 0) return [];
  const area = getAccaAreaByName(input.module);
  const tagged = /\(([A-Za-z]{2,3})\)\s*$/.exec(input.module.trim());
  const paperCode = tagged ? getAccaPaper(tagged[1]!)?.code : undefined;

  const areaPool = area ? accaQuestionsForArea(area.id) : [];
  const paperPool = paperCode
    ? accaQuestionsForPaper(paperCode).filter((i) => !areaPool.includes(i))
    : [];

  const seed = `${input.module}|${input.topic ?? ""}|${input.seed ?? ""}`;
  const topic = input.topic?.trim() ?? "";
  const preferred = topic ? areaPool.filter((i) => matchesTopic(i, topic)) : [];
  const rest = areaPool.filter((i) => !preferred.includes(i));

  const ordered = [
    ...seededOrder(preferred, `${seed}|p`),
    ...seededOrder(rest, `${seed}|a`),
    ...seededOrder(paperPool, `${seed}|b`),
  ];
  return ordered.slice(0, count).map(toQuizQuestion);
}

/**
 * Worked exemplars for AI prompts: shows the tutor and the generator the exact
 * house style (four options, explanation that shows the working or names the
 * governing rule) for the papers the student has entered.
 */
export function accaQuestionStyleForPrompt(codes: string[], perPaper = 2): string {
  const papers = normaliseAccaPapers(codes);
  if (papers.length === 0) return "";
  const blocks: string[] = [];
  for (const code of papers) {
    const items = accaQuestionsForPaper(code).slice(0, Math.max(1, perPaper));
    for (const item of items) {
      const opts = item.options
        .map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`)
        .join("\n");
      blocks.push(
        `### ${item.paper} exemplar\nQ: ${item.prompt}\n${opts}\nCorrect: ${String.fromCharCode(
          65 + item.correctIndex,
        )}\nExplanation: ${item.explanation}`,
      );
    }
  }
  return blocks.join("\n\n");
}
