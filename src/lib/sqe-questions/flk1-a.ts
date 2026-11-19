import type { SqeBankQuestion } from "./types";

export const FLK1_A: SqeBankQuestion[] = [
  {
    id: "sqe1-flk1-bl-01",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "business-vehicles",
    difficulty: "core",
    prompt: "Maya owns all the fully paid ordinary shares in Cedar Design Ltd and is its sole director. The company ordered printing equipment in its own name, but its business has failed and it cannot pay the supplier. Maya gave no guarantee, made no personal representation to the supplier and has committed no wrongdoing. The supplier argues that Maya must pay because she controlled every business decision and received all the company’s previous dividends. Which statement best describes Maya’s position?",
    options: [
      "She is liable for the debt because she is the sole director.",
      "She is liable for the debt up to the total dividends she previously received.",
      "She is not personally liable merely because she owns and controls the company.",
      "She is liable for half the debt because the shares are fully paid.",
      "She is liable unless the company had at least two shareholders when it contracted."
    ],
    correctIndex: 2,
    explanation: "Cedar Design Ltd has a legal personality separate from Maya. Sole ownership and control do not themselves make her liable for its contractual debts, and the facts identify no independent basis of personal liability.",
    optionExplanations: [
      "Wrong: holding office as sole director does not itself impose liability for company debts.",
      "Wrong: receipt of previous dividends does not automatically transfer the company’s debts to Maya.",
      "Right: separate legal personality applies even where one individual owns and controls the company.",
      "Wrong: fully paid shares do not create liability for half the company’s debts.",
      "Wrong: a company may have one shareholder without losing its separate personality."
    ],
    authority: "Salomon v A Salomon & Co Ltd [1897] AC 22; Companies Act 2006, s 3(2)."
  },
  {
    id: "sqe1-flk1-bl-02",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "company-formation",
    difficulty: "standard",
    prompt: "Daniel signs a six-month office lease stating that he signs for and on behalf of Northbank Analytics Ltd. The company has not yet been incorporated. The landlord knows this, but the lease contains no provision excluding Daniel’s liability. Once incorporation occurs, the directors pass a resolution purporting to ratify the lease, but the landlord does not agree to release Daniel or enter into a replacement agreement. Rent then falls into arrears. Against whom may the landlord enforce the original lease on these facts?",
    options: [
      "Daniel, because he purported to contract for a company before it existed.",
      "Only the company, because its directors subsequently ratified the lease.",
      "Neither Daniel nor the company, because the lease was automatically void.",
      "Every subscriber to the company’s memorandum, in equal shares.",
      "Only the company, because the landlord knew incorporation was pending."
    ],
    correctIndex: 0,
    explanation: "A contract purportedly made for an unformed company generally takes effect as a contract with the person purporting to act for it, who is personally liable unless otherwise agreed. The later board resolution cannot retrospectively make the nonexistent company the original contracting party or release Daniel.",
    optionExplanations: [
      "Right: Daniel falls within the statutory rule and there is no agreement excluding his liability.",
      "Wrong: purported ratification after incorporation does not displace Daniel’s original liability.",
      "Wrong: the statute generally gives the contract effect against the promoter rather than making it void.",
      "Wrong: subscribing to the memorandum does not make someone a party to Daniel’s contract.",
      "Wrong: the landlord’s knowledge alone is not an agreement to exclude Daniel’s liability."
    ],
    authority: "Companies Act 2006, s 51(1)."
  },
  {
    id: "sqe1-flk1-bl-03",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "directors-shareholders",
    difficulty: "standard",
    prompt: "Aisha is a director of Merrow Kitchens Ltd. The board is considering buying delivery vehicles from a company in which Aisha owns a substantial shareholding. No other Merrow director knows about her investment, and the proposed purchase has not yet been approved or entered into. Aisha believes the price is excellent and intends to abstain from voting. She asks what she must do about her interest before Merrow enters into the purchase contract. Which advice is most accurate?",
    options: [
      "She need only disclose her interest if Merrow would otherwise suffer a financial loss.",
      "She need only disclose her interest to the selling company.",
      "She can avoid any disclosure obligation simply by abstaining from the vote.",
      "She must obtain approval from every shareholder instead of telling the board.",
      "She must declare the nature and extent of her interest to the other directors."
    ],
    correctIndex: 4,
    explanation: "A director who is directly or indirectly interested in a proposed company transaction must normally declare the nature and extent of that interest to the other directors before the transaction is entered into. Aisha’s substantial investment is material, and neither a favourable price nor abstention removes the disclosure obligation on these facts.",
    optionExplanations: [
      "Wrong: the declaration duty does not depend on proving financial loss.",
      "Wrong: disclosure to the counterparty does not satisfy the duty to Merrow’s other directors.",
      "Wrong: abstaining from a vote is not a substitute for declaring the interest.",
      "Wrong: unanimous shareholder approval is not the required disclosure mechanism here.",
      "Right: declaration to the other directors before contracting addresses the statutory duty."
    ],
    authority: "Companies Act 2006, s 177(1), (2) and (6)."
  },
  {
    id: "sqe1-flk1-bl-04",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "share-capital",
    difficulty: "challenging",
    prompt: "Harbour Instruments Ltd proposes to allot new ordinary equity shares wholly for cash to an outside investor. Existing ordinary shareholders have equal voting and dividend rights. The directors have sufficient authority to allot, but the articles do not exclude statutory pre-emption rights and no resolution disapplying them has been passed. Leila, an existing shareholder, objects to being bypassed. There is no employee share scheme or other relevant exception. What must the company ordinarily do before making the proposed allotment to the investor?",
    options: [
      "Obtain only an ordinary resolution approving the investor’s identity.",
      "Offer the shares to existing ordinary shareholders proportionately on terms no less favourable.",
      "Obtain consent only from shareholders holding more than half the existing shares.",
      "Offer the shares to existing directors before offering them to shareholders.",
      "Allot to the investor immediately because authority to allot also removes pre-emption rights."
    ],
    correctIndex: 1,
    explanation: "Authority to allot and compliance with statutory pre-emption rights are separate requirements. Where the statutory rights apply, equity securities offered for cash must first be offered proportionately to the relevant existing ordinary shareholders on terms no less favourable.",
    optionExplanations: [
      "Wrong: an ordinary resolution approving the investor does not itself satisfy or disapply these rights.",
      "Right: the statutory first offer protects existing shareholders against dilution on the stated facts.",
      "Wrong: simple majority consent is not a substitute for compliance with the statutory procedure.",
      "Wrong: the relevant entitlement belongs to existing ordinary shareholders, not directors as such.",
      "Wrong: allotment authority does not automatically disapply statutory pre-emption rights."
    ],
    authority: "Companies Act 2006, ss 561(1) and 569–571."
  },
  {
    id: "sqe1-flk1-bl-05",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "partnerships",
    difficulty: "core",
    prompt: "Ravi and Elena run an ordinary partnership supplying restaurant furniture. Their partnership agreement states that neither may buy stock costing more than £8,000 without the other’s agreement. Ravi orders £12,000 of chairs in the firm’s name from a regular supplier. Buying chairs is part of the firm’s usual business, and the supplier neither knows about the internal restriction nor doubts Ravi’s status as a partner. Elena refuses to pay because she did not approve the purchase. Is the firm bound?",
    options: [
      "No, because any purchase exceeding an internal limit is automatically void.",
      "No, because all partnership contracts require every partner’s signature.",
      "Yes, but only up to the internal limit of £8,000.",
      "Yes, because Ravi acted in the usual way of the firm’s business and the supplier lacked notice of the restriction.",
      "Yes, but only if Elena subsequently accepts delivery of the chairs."
    ],
    correctIndex: 3,
    explanation: "Each partner is an agent of the firm for the purpose of its business. An act done in the usual way of that business binds the firm unless the partner lacks authority and the third party knows this or does not know or believe the person to be a partner.",
    optionExplanations: [
      "Wrong: an undisclosed internal restriction does not automatically defeat a supplier’s claim.",
      "Wrong: unanimous signatures are not required for ordinary business contracts.",
      "Wrong: the internal limit does not divide the supplier’s contract into binding and non-binding portions.",
      "Right: the purchase falls within Ravi’s apparent authority on these facts.",
      "Wrong: subsequent acceptance is unnecessary because the firm is already bound."
    ],
    authority: "Partnership Act 1890, ss 5 and 8."
  },
  {
    id: "sqe1-flk1-bl-06",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "insolvency",
    difficulty: "challenging",
    prompt: "Nadia is liquidator of Vale Components Ltd. Four months before the onset of insolvency, the company paid an unsecured bank loan in full while leaving trade creditors unpaid. The bank held Nadia’s predecessor director’s personal guarantee. Contemporaneous emails establish that the company chose to pay the bank because the director wanted to avoid liability under that guarantee. The company was unable to pay its debts at the time. Which transaction is the payment most clearly capable of constituting?",
    options: [
      "A transaction at an undervalue, solely because other creditors were left unpaid.",
      "An automatically void payment, solely because it preceded liquidation.",
      "A preference benefiting the guarantor, subject to the statutory requirements.",
      "A lawful distribution to a member, irrespective of distributable profits.",
      "A floating charge that is invalid for want of new consideration."
    ],
    correctIndex: 2,
    explanation: "A preference can benefit a person who is a surety or guarantor for the company’s debts by improving that person’s position in an insolvent liquidation. The emails establish the relevant desire to improve the guarantor’s position, and the payment falls within even the ordinary six-month relevant period.",
    optionExplanations: [
      "Wrong: paying an existing debt is not an undervalue merely because other creditors remain unpaid.",
      "Wrong: payments are not automatically void simply because liquidation later follows.",
      "Right: discharging the guaranteed debt improves the guarantor’s position and the stated motivation supports a preference.",
      "Wrong: repayment of a bank loan is not a distribution to a member.",
      "Wrong: the transaction described is a payment, not the creation of a floating charge."
    ],
    authority: "Insolvency Act 1986, ss 239(4)–(5) and 240."
  },
  {
    id: "sqe1-flk1-bl-07",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "tax-business",
    difficulty: "standard",
    prompt: "Oakfield Catering Ltd prepares its corporation tax computation. It incurred £7,000 buying ingredients used exclusively in meals sold to customers, £4,000 entertaining prospective customers at sporting events, and £2,000 paying a dividend to its shareholder. All three sums were paid during the accounting period. The finance director asks which item is deductible in calculating the company’s trading profits, assuming the ingredients expenditure is revenue expenditure and no special statutory exception applies. Which answer is correct?",
    options: [
      "All three payments are deductible because cash left the business.",
      "Only the customer entertainment and dividend are deductible.",
      "Only the dividend is deductible because it rewards investment in the business.",
      "Only the customer entertainment is deductible because it seeks new business.",
      "Only the ingredients expenditure is deductible."
    ],
    correctIndex: 4,
    explanation: "The ingredients are revenue expenditure incurred wholly and exclusively for the trade. Business entertainment is specifically disallowed, while a dividend is a distribution of profits rather than a deductible cost of earning them.",
    optionExplanations: [
      "Wrong: a cash payment is not necessarily deductible for corporation tax.",
      "Wrong: both identified payments are non-deductible on these facts.",
      "Wrong: a dividend distributes profits and is not a deductible trading expense.",
      "Wrong: the business purpose does not override the statutory entertainment disallowance.",
      "Right: only the ingredients satisfy the stated basis for a trading deduction without a relevant disallowance."
    ],
    authority: "Corporation Tax Act 2009, ss 54, 1298 and 1305."
  },
  {
    id: "sqe1-flk1-bl-08",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "share-capital",
    difficulty: "core",
    prompt: "Sofia is the sole shareholder of a private company that has £90,000 in its bank account. Its properly prepared relevant accounts show accumulated realised profits of £25,000 and accumulated realised losses of £40,000, with no other distributable reserves. Sofia proposes an immediate £20,000 dividend because the company can comfortably meet its current invoices. No capital reduction or other restructuring is proposed. What is the best advice about the proposed dividend?",
    options: [
      "It cannot lawfully be paid because the company has no profits available for distribution.",
      "It can lawfully be paid because the company has enough cash.",
      "It can lawfully be paid if Sofia approves it as sole shareholder.",
      "It can lawfully be paid up to £25,000 without taking account of the losses.",
      "It can lawfully be paid if it is described as an interim dividend."
    ],
    correctIndex: 0,
    explanation: "Distributions may be made only out of profits available for that purpose, calculated by reference to accumulated realised profits less accumulated realised losses. The company’s losses exceed its profits, and neither cash availability nor unanimous ownership supplies distributable profits.",
    optionExplanations: [
      "Right: the accumulated realised losses exhaust the accumulated realised profits.",
      "Wrong: liquidity and distributable profits are different requirements.",
      "Wrong: shareholder approval cannot override the statutory capital-maintenance restriction.",
      "Wrong: accumulated realised losses must be deducted.",
      "Wrong: calling the payment an interim dividend does not remove the restriction."
    ],
    authority: "Companies Act 2006, ss 830(1)–(2) and 836."
  },
  {
    id: "sqe1-flk1-bl-09",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "directors-shareholders",
    difficulty: "standard",
    prompt: "Ben holds 60% of the voting shares in Larch Software Ltd and wants to remove a director before the director’s fixed term expires. The company is a private company with ordinary articles, and Ben proposes circulating a written ordinary resolution for signature without holding a meeting. There is no issue concerning weighted voting rights. The director insists that the proposed procedure is unavailable. Which advice correctly identifies the statutory procedure?",
    options: [
      "The director can be removed only by a special resolution passed at a meeting.",
      "The director can be removed by written ordinary resolution without special notice.",
      "The director cannot be removed until the fixed term has expired.",
      "Removal requires an ordinary resolution at a meeting, with special notice.",
      "Removal requires a unanimous written resolution signed by every shareholder."
    ],
    correctIndex: 3,
    explanation: "A company may remove a director by ordinary resolution before the end of the director’s term, but special notice is required. The statutory written-resolution procedure cannot be used for this resolution, and removal does not itself extinguish any contractual compensation claim.",
    optionExplanations: [
      "Wrong: the statutory voting requirement is an ordinary, not special, resolution.",
      "Wrong: this resolution is excluded from the written-resolution procedure and requires special notice.",
      "Wrong: a fixed term does not prevent statutory removal.",
      "Right: the members must use the meeting procedure with the required special notice.",
      "Wrong: unanimity does not make the statutory written-resolution procedure available."
    ],
    authority: "Companies Act 2006, ss 168(1)–(2), 168(5) and 288(2)(a)."
  },
  {
    id: "sqe1-flk1-bl-10",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "insolvency",
    difficulty: "challenging",
    prompt: "Imogen advises a supplier owed money by Alder Leisure Ltd. An administrator has been appointed, and the supplier wishes to issue an ordinary debt claim and immediately enforce against company equipment. It holds no proprietary claim and has obtained neither the administrator’s consent nor permission from the court. There is no relevant statutory exception. The supplier argues that its debt arose before the appointment and is undisputed. What is the best advice about commencing proceedings during the administration?",
    options: [
      "Proceedings may begin freely because the debt arose before the appointment.",
      "Proceedings require the administrator’s consent or the court’s permission.",
      "Proceedings may begin freely, but only if the supplier claims interest as well.",
      "Proceedings are permanently barred once an administrator is appointed.",
      "Proceedings require approval from a majority of unsecured creditors instead of court permission."
    ],
    correctIndex: 1,
    explanation: "The administration moratorium restricts the institution or continuation of legal process, including legal proceedings and execution, without the administrator’s consent or the court’s permission. An undisputed pre-administration debt does not by itself escape the moratorium.",
    optionExplanations: [
      "Wrong: pre-appointment debts are not generally exempt from the moratorium.",
      "Right: one of the prescribed forms of consent or permission is needed.",
      "Wrong: adding an interest claim does not avoid the moratorium.",
      "Wrong: the restriction is not an absolute permanent bar to proceedings.",
      "Wrong: creditor majority approval is not a statutory substitute for consent or permission."
    ],
    authority: "Insolvency Act 1986, Schedule B1, paragraph 43(6)."
  },
  {
    id: "sqe1-flk1-bl-11",
    paper: "FLK1",
    subject: "business-law",
    subtopic: "tax-business",
    difficulty: "standard",
    prompt: "Priya is a self-employed architect who uses the accruals basis. She buys a durable large-format printer for continuing use in her practice and correctly records it as a capital asset. She also pays the annual premium for professional indemnity insurance covering only her architectural work. There is no private use or special restriction affecting either item. She asks how these expenses should be treated when calculating trading profits for income tax. Which answer best states the relevant distinction?",
    options: [
      "Both payments must be deducted as ordinary revenue expenses.",
      "Neither payment can receive any tax relief because both protect future earnings.",
      "The insurance is normally a revenue deduction; the printer is capital expenditure for which capital allowances may be available.",
      "The printer is a revenue deduction; the insurance can be relieved only through capital allowances.",
      "Both payments are relieved only when Priya disposes of her business."
    ],
    correctIndex: 2,
    explanation: "The exclusively business insurance premium is normally deductible revenue expenditure. The durable printer is capital expenditure rather than an ordinary trading deduction, although expenditure on qualifying plant or machinery may attract capital allowances.",
    optionExplanations: [
      "Wrong: the capital nature of the printer prevents an ordinary revenue deduction under the stated basis.",
      "Wrong: the insurance is ordinarily deductible and the printer may attract capital allowances.",
      "Right: the answer distinguishes revenue expenditure from potentially qualifying capital expenditure.",
      "Wrong: it reverses the treatment of the two items.",
      "Wrong: relief is not generally postponed until disposal of the business."
    ],
    authority: "Income Tax (Trading and Other Income) Act 2005, ss 33 and 34; Capital Allowances Act 2001, s 11."
  },
  {
    id: "sqe1-flk1-dr-01",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "pre-action",
    difficulty: "core",
    prompt: "Amira acts for a retailer bringing a commercial contract claim. Before issue, the defendant proposes a reasonably priced mediation and offers several convenient dates. The dispute is suitable for mediation, there is no urgent limitation problem, and the retailer gives no response because its managing director regards any discussion of compromise as weakness. The retailer later wins at trial. Which statement best describes the possible costs consequence of its silence?",
    options: [
      "Winning at trial prevents any adverse costs consequence for refusing mediation.",
      "Silence is reasonable whenever the claimant believes its case is strong.",
      "Only a defendant can be penalised in costs for refusing mediation.",
      "A costs consequence is possible only if mediation would certainly have settled the claim.",
      "The court may reflect an unreasonable failure to engage with mediation in its costs order."
    ],
    correctIndex: 4,
    explanation: "Success at trial does not immunise a party from costs consequences arising from unreasonable conduct concerning ADR. Silence in response to a suitable mediation proposal can itself be unreasonable, without proof that mediation would certainly have succeeded.",
    optionExplanations: [
      "Wrong: the court’s costs discretion includes conduct and ADR engagement despite success.",
      "Wrong: confidence in the merits does not automatically justify silence.",
      "Wrong: either claimant or defendant may face a costs consequence.",
      "Wrong: certainty of settlement is not required.",
      "Right: unreasonable non-engagement can affect the otherwise successful party’s costs."
    ],
    authority: "CPR 44.2(4)–(5); PGF II SA v OMFS Company 1 Ltd [2013] EWCA Civ 1288."
  },
  {
    id: "sqe1-flk1-dr-02",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "starting-claim",
    difficulty: "standard",
    prompt: "On 15 January 2020, Malik paid a contractor to install a commercial refrigeration system under a simple contract. The contractor completed defective work that day, immediately breaching the contract. Malik discovered the defect only in June 2025 and now seeks advice on 11 September 2026. There has been no fraud, deliberate concealment, relevant acknowledgment or agreement extending time, and Malik relies solely on breach of contract. Which statement best describes the ordinary limitation position?",
    options: [
      "The six-year period began only when Malik discovered the defect in June 2025.",
      "The six-year period ordinarily ran from the breach and has expired.",
      "A twelve-year period applies because the work involved commercial equipment.",
      "The limitation period cannot begin until Malik obtains an expert report.",
      "A three-year period from discovery applies to every defective-work contract claim."
    ],
    correctIndex: 1,
    explanation: "An action founded on a simple contract is generally subject to six years from accrual of the cause of action. The breach occurred in January 2020, and later discovery alone does not postpone time for this ordinary contractual claim.",
    optionExplanations: [
      "Wrong: discovery is not the ordinary accrual point for a simple contract claim.",
      "Right: the stated breach occurred more than six years before the advice date.",
      "Wrong: commercial subject matter does not turn a simple contract into a specialty.",
      "Wrong: obtaining expert evidence is not a prerequisite to limitation running.",
      "Wrong: a general three-year discovery rule does not govern all contractual defective-work claims."
    ],
    authority: "Limitation Act 1980, s 5."
  },
  {
    id: "sqe1-flk1-dr-03",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "starting-claim",
    difficulty: "core",
    prompt: "Lena issues a claim form for service on an individual defendant within England and Wales. Her solicitor retains responsibility for service and intends to serve the claim form by a permitted domestic method. There is no order extending time, no alternative-service order and no special statutory regime. The solicitor asks how long after issue the relevant step for service must ordinarily be completed. Which answer correctly states the period applying to this domestic claim form?",
    options: [
      "Four calendar months after the date of issue.",
      "Four calendar months after the defendant first learns of the claim.",
      "Six calendar months after the date of issue.",
      "Fourteen days after the date of issue.",
      "Twenty-eight days after the particulars of claim are drafted."
    ],
    correctIndex: 0,
    explanation: "For service within the jurisdiction, the claimant must complete the relevant step specified by CPR 7.5 before midnight on the calendar day four months after issue. This is not a period running from the defendant’s knowledge or from preparation of the particulars.",
    optionExplanations: [
      "Right: four calendar months from issue is the ordinary domestic claim-form period.",
      "Wrong: the defendant’s knowledge does not determine the start of the period.",
      "Wrong: six months is the ordinary period for service outside the jurisdiction, not this domestic case.",
      "Wrong: fourteen days is not the general validity period for domestic claim-form service.",
      "Wrong: drafting the particulars does not start a separate claim-form service period."
    ],
    authority: "CPR 7.5(1)."
  },
  {
    id: "sqe1-flk1-dr-04",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "statements-of-case",
    difficulty: "standard",
    prompt: "Theo acts for a defendant accused of failing to deliver machinery by an agreed date. The defendant accepts that the contract existed but disputes the alleged delivery date and says the claimant agreed a later date by email. Theo is preparing the defence and proposes simply stating that every allegation is denied, without explaining why or mentioning the emails. The relevant facts are within the defendant’s knowledge. What should the defence do in relation to the disputed delivery date?",
    options: [
      "Remain silent because any allegation not admitted is automatically denied.",
      "Deny the allegation without reasons and reserve the alternative date for trial.",
      "Require proof without explanation even though the defendant knows the relevant facts.",
      "Give reasons for the denial and state the defendant’s different version of events.",
      "Admit the allegation because the contract itself is admitted."
    ],
    correctIndex: 3,
    explanation: "A defence must explain the reasons for denying an allegation. Where the defendant intends to put forward a different version of events, it must state that version, so the agreed extension should be pleaded rather than saved for trial.",
    optionExplanations: [
      "Wrong: failure to deal with an allegation may result in deemed admission, subject to the rules.",
      "Wrong: a bare denial does not meet the requirement to give reasons.",
      "Wrong: requiring proof is not the appropriate substitute for pleading the defendant’s known positive case.",
      "Right: the defence must identify both the reason for denial and the alternative account.",
      "Wrong: admission of the contract does not require admission of every alleged term or date."
    ],
    authority: "CPR 16.5(1)–(3)."
  },
  {
    id: "sqe1-flk1-dr-05",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "interim-applications",
    difficulty: "challenging",
    prompt: "Faye applies for summary judgment on a disputed commercial debt. The defendant produces contemporaneous correspondence supporting a properly arguable contractual defence. Resolving that defence would require evaluating conflicting evidence from two witnesses, and neither account is demonstrably false. Faye says her documents are more persuasive and that a trial would be expensive. There is no other basis for disposing of the defence without trial. Which approach should the court take when determining the application?",
    options: [
      "Grant judgment whenever the claimant’s account appears marginally more likely.",
      "Grant judgment unless the defendant proves its defence on the balance of probabilities.",
      "Conduct a complete trial of both witnesses within the summary judgment hearing.",
      "Grant judgment whenever the likely trial costs exceed the disputed debt.",
      "Refuse judgment if the defendant has a real prospect of successfully defending the claim."
    ],
    correctIndex: 4,
    explanation: "Summary judgment is not a mechanism for deciding a genuinely triable defence merely because the claimant appears more persuasive. The supporting correspondence and material factual dispute indicate a realistic, rather than fanciful, prospect of defending the claim.",
    optionExplanations: [
      "Wrong: marginal comparative likelihood is not the summary judgment test.",
      "Wrong: the defendant need not finally prove its defence at this stage.",
      "Wrong: the court should not turn the application into a full trial of the disputed evidence.",
      "Wrong: proportionality concerns do not replace the statutory procedural test.",
      "Right: a real prospect of successfully defending prevents summary judgment on these facts."
    ],
    authority: "CPR 24.3; Swain v Hillman [2001] 1 All ER 91."
  },
  {
    id: "sqe1-flk1-dr-06",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "interim-applications",
    difficulty: "standard",
    prompt: "Noor brings an ordinary commercial money claim. The defendant makes a valid Part 36 offer with a 21-day relevant period. Noor accepts it in writing on day 18, before trial. Liability for costs has not been separately agreed, and this is not a claim governed by fixed recoverable costs or another special costs regime. The defendant argues that acceptance means Noor must bear her own legal costs. What is the usual costs entitlement on these facts?",
    options: [
      "The defendant receives its costs from the date proceedings began.",
      "Neither party receives costs because acceptance is not a judgment after trial.",
      "Noor receives her costs of the proceedings up to service of the notice of acceptance.",
      "Noor receives costs only up to the date the offer was made.",
      "Noor receives indemnity costs automatically from the date of issue."
    ],
    correctIndex: 2,
    explanation: "Where a defendant’s Part 36 offer is accepted within the relevant period, the claimant is ordinarily entitled to costs up to the date notice of acceptance is served. In this non-fixed-costs case, those costs are assessed on the standard basis if not agreed.",
    optionExplanations: [
      "Wrong: timely acceptance does not ordinarily shift the claimant’s costs to the defendant’s benefit.",
      "Wrong: Part 36 provides a costs entitlement without requiring a trial.",
      "Right: timely acceptance ordinarily carries the claimant’s costs through service of acceptance.",
      "Wrong: the entitlement is not ordinarily cut off at the offer date.",
      "Wrong: timely acceptance does not automatically produce indemnity costs from issue."
    ],
    authority: "CPR 36.13(1) and (3)."
  },
  {
    id: "sqe1-flk1-dr-07",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "disclosure-evidence",
    difficulty: "challenging",
    prompt: "Owen acts for a manufacturer in proceedings subject to standard disclosure, outside the Business and Property Courts disclosure pilot regime. His client locates an internal inspection report made before the dispute arose. It directly undermines the pleaded assertion that every product passed inspection. The report is relevant, within the client’s control and not privileged. The managing director wants it omitted because the claimant has not specifically requested it. How should Owen advise the client?",
    options: [
      "It need not be disclosed unless the claimant identifies it by date and author.",
      "It must be disclosed because standard disclosure includes documents adversely affecting the client’s own case.",
      "It need not be disclosed because the client does not intend to rely on it.",
      "It must be disclosed only if the court first finds the client’s pleaded case untrue.",
      "It may be destroyed before exchange of disclosure lists if no specific request has arrived."
    ],
    correctIndex: 1,
    explanation: "Standard disclosure extends beyond documents on which a party relies to documents adversely affecting its own case or supporting another party’s case. The report is non-privileged and within the client’s control, so the absence of a specific request does not justify omission.",
    optionExplanations: [
      "Wrong: standard disclosure is not confined to specifically requested documents.",
      "Right: the report falls directly within the adverse-document category.",
      "Wrong: an intention not to rely on a document does not remove the disclosure obligation.",
      "Wrong: a prior finding that the pleaded case is false is unnecessary.",
      "Wrong: deliberate destruction would not be a legitimate means of avoiding disclosure duties."
    ],
    authority: "CPR 31.6(b), 31.8 and 31.11."
  },
  {
    id: "sqe1-flk1-dr-08",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "disclosure-evidence",
    difficulty: "standard",
    prompt: "Grace instructs a structural engineer as an expert in an ordinary construction claim. The engineer’s draft report contains a reasoned opinion that one defect was caused by Grace’s own alterations rather than the defendant’s workmanship. Grace offers to pay an additional fee if the engineer removes that conclusion and presents the defendant as responsible for every defect. The engineer asks which duty governs the preparation of the final report. Which statement is correct?",
    options: [
      "The expert’s overriding duty is to help the court on matters within the expert’s expertise.",
      "The expert’s overriding duty is to secure the best possible result for the paying client.",
      "The expert must adopt any factual assumption requested by the client without qualification.",
      "The expert owes a duty to the court only after giving oral evidence.",
      "The expert may suppress an adverse professional opinion if the client pays for the report."
    ],
    correctIndex: 0,
    explanation: "An expert’s duty to help the court overrides any obligation to the person instructing or paying the expert. The engineer must therefore maintain an independent professional assessment rather than alter the opinion to secure a favourable outcome for Grace.",
    optionExplanations: [
      "Right: the duty to assist the court within the expert’s expertise is overriding.",
      "Wrong: the expert is not an advocate retained to maximise the client’s result.",
      "Wrong: instructions do not require uncritical acceptance of unsupported assumptions.",
      "Wrong: the duty applies to the expert’s report, not merely oral testimony.",
      "Wrong: payment does not justify suppressing a material independent opinion."
    ],
    authority: "CPR 35.3(1)–(2)."
  },
  {
    id: "sqe1-flk1-dr-09",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "trial-judgment",
    difficulty: "standard",
    prompt: "Ellis succeeds in an ordinary defended commercial claim issued in 2026 and allocated to the intermediate track. The claim falls within the extended fixed recoverable costs regime, and no rule permitting departure or exceptional circumstances applies. Ellis’s solicitor has charged substantially more than the applicable fixed amount and argues that success guarantees reimbursement of every reasonable invoice. The parties cannot agree recoverable costs. What is the best advice about the amount recoverable from the losing party?",
    options: [
      "It must equal every reasonable fee Ellis owes under the retainer.",
      "It is automatically assessed on the indemnity basis because Ellis won.",
      "It is restricted to court fees because intermediate-track legal costs are never recoverable.",
      "It is ordinarily governed by the applicable fixed recoverable costs provisions.",
      "It must be assessed as an unrestricted proportion of the damages awarded."
    ],
    correctIndex: 3,
    explanation: "The applicable intermediate-track fixed recoverable costs rules ordinarily determine inter partes legal costs in a claim within their scope. The client’s contractual liability to the solicitor is distinct from the amount recoverable from the opponent.",
    optionExplanations: [
      "Wrong: the retainer does not determine the opponent’s costs liability.",
      "Wrong: success alone does not produce indemnity assessment or displace fixed costs.",
      "Wrong: the regime permits specified fixed legal costs, not merely court fees.",
      "Right: the applicable fixed costs framework controls absent a relevant departure.",
      "Wrong: there is no unrestricted damages-percentage assessment replacing the applicable rules."
    ],
    authority: "CPR Part 45, Section VII; Practice Direction 45, Table 14."
  },
  {
    id: "sqe1-flk1-dr-10",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "enforcement",
    difficulty: "challenging",
    prompt: "Zara has an unpaid money judgment against an individual consultant, Lewis. Reliable information shows that a bank holds sufficient money in a current account in Lewis’s sole name. Zara wants to intercept the bank’s debt to Lewis rather than obtain security over land, deduct money from wages or seize physical goods. There is no insolvency process or competing proprietary claim. Which enforcement application most directly matches Zara’s objective?",
    options: [
      "An attachment of earnings order directed to the bank.",
      "A charging order over the current account as if it were land.",
      "A warrant of possession against the bank’s branch.",
      "An order for oral examination that itself transfers the account balance.",
      "A third party debt order."
    ],
    correctIndex: 4,
    explanation: "A third party debt order can attach a debt owed by a third party to the judgment debtor, including an eligible credit balance owed by a bank to its customer. It is the enforcement method directed at the identified bank debt rather than earnings, land or tangible goods.",
    optionExplanations: [
      "Wrong: attachment of earnings operates through an employer and qualifying earnings, not an ordinary bank balance.",
      "Wrong: a charging order over land does not directly intercept this bank debt.",
      "Wrong: possession proceedings do not appropriate a customer’s account balance.",
      "Wrong: obtaining information does not itself transfer funds to the judgment creditor.",
      "Right: the bank’s debt to Lewis is the type of asset this procedure targets."
    ],
    authority: "CPR 72.2(1)."
  },
  {
    id: "sqe1-flk1-dr-11",
    paper: "FLK1",
    subject: "dispute-resolution",
    subtopic: "enforcement",
    difficulty: "standard",
    prompt: "Hugo loses a civil trial and wishes to appeal because he disagrees with the judge’s evaluation of the evidence. The proposed appeal requires permission, and no exceptional appeal rule applies. Hugo assumes that permission must be granted whenever the amount in dispute is substantial. His solicitor considers that the judgment contains no identifiable error and that an appeal has no real prospect of success. What is the ordinary test for permission to appeal?",
    options: [
      "Permission must be granted whenever the losing party disputes a factual finding.",
      "The appeal must have a real prospect of success or there must be some other compelling reason for it to be heard.",
      "Permission must be granted whenever the claim exceeds the small claims limit.",
      "The applicant must establish that success on appeal is certain.",
      "Permission is available only where both parties consent to the appeal."
    ],
    correctIndex: 1,
    explanation: "The ordinary permission test is a real prospect of success or some other compelling reason for the appeal to be heard. Mere disagreement or the amount at stake does not automatically satisfy that test, although certainty of success is not required.",
    optionExplanations: [
      "Wrong: disagreement with a factual finding does not create an automatic right to permission.",
      "Right: this states the ordinary alternative grounds for permission.",
      "Wrong: exceeding a financial threshold does not itself satisfy the permission test.",
      "Wrong: certainty of success is a substantially higher requirement than the rule imposes.",
      "Wrong: the respondent’s consent is not a prerequisite to permission."
    ],
    authority: "CPR 52.6(1)."
  },
  {
    id: "sqe1-flk1-ls-01",
    paper: "FLK1",
    subject: "legal-system",
    subtopic: "sources",
    difficulty: "core",
    prompt: "Marta advises a client about a statutory requirement to give notice within a period described in an Act as beginning on a specified date. The Act contains no definition of the word month and does not disclose any contrary intention. The client assumes that each statutory month must mean exactly 28 days because February sometimes has that length. Marta checks the general interpretation legislation applicable to Acts of Parliament. What is the default meaning of month in this context?",
    options: [
      "A calendar month.",
      "Exactly 28 days.",
      "Exactly 30 days.",
      "Exactly four working weeks.",
      "A period selected by the person giving notice."
    ],
    correctIndex: 0,
    explanation: "The Interpretation Act supplies a default meaning of month as calendar month unless the relevant legislation indicates a contrary intention. The varying lengths of calendar months do not turn the expression into a fixed 28-day or 30-day period.",
    optionExplanations: [
      "Right: calendar month is the statutory default.",
      "Wrong: a calendar month is not invariably 28 days.",
      "Wrong: the default is not a fixed 30-day period.",
      "Wrong: working weeks are not the statutory default meaning.",
      "Wrong: the person giving notice cannot choose the statutory unit of time."
    ],
    authority: "Interpretation Act 1978, s 5 and Schedule 1."
  },
  {
    id: "sqe1-flk1-ls-02",
    paper: "FLK1",
    subject: "legal-system",
    subtopic: "courts-precedent",
    difficulty: "standard",
    prompt: "Isaac represents a business in the High Court. A previous Court of Appeal decision determines the same legal issue, and its ratio cannot be distinguished on the facts. There is no inconsistent Supreme Court authority, relevant statutory change or other recognised reason why the earlier decision has ceased to bind. Isaac argues that the High Court judge should reject it because a recent academic article demonstrates that its reasoning is weak. How should the High Court approach that argument?",
    options: [
      "Treat the academic article as automatically overriding the Court of Appeal.",
      "Depart from the decision whenever the judge considers it plainly wrong.",
      "Follow the decision only if both parties agree that it should apply.",
      "Follow the binding ratio despite disagreement with its reasoning.",
      "Treat the decision as binding only in criminal cases."
    ],
    correctIndex: 3,
    explanation: "The High Court is bound by an applicable ratio of the Court of Appeal unless a recognised basis removes its binding effect. Academic criticism may inform argument but does not give a lower court a general power to disregard superior authority.",
    optionExplanations: [
      "Wrong: commentary is not a source with authority to overrule a binding appellate decision.",
      "Wrong: perceived error alone does not let the High Court disregard the Court of Appeal.",
      "Wrong: the parties cannot make binding precedent optional by agreement.",
      "Right: the hierarchy requires the High Court to apply the indistinguishable ratio.",
      "Wrong: the binding hierarchy applies in civil litigation as well."
    ],
    authority: "Broome v Cassell & Co Ltd [1972] AC 1027."
  },
  {
    id: "sqe1-flk1-ls-03",
    paper: "FLK1",
    subject: "legal-system",
    subtopic: "legal-services",
    difficulty: "core",
    prompt: "Hannah runs an unregulated consultancy and has never been authorised as a solicitor, barrister or other authorised person. A commercial client asks her to take over formal conduct of its court litigation, including issuing proceedings and managing procedural steps as its representative. Hannah has no applicable exemption, and the court has made no order permitting her to conduct the litigation. She asks whether charging a lower fee makes the proposed service lawful. Which answer is correct?",
    options: [
      "Any person may conduct litigation if the client signs a written consent.",
      "Conduct of litigation is unreserved whenever the dispute is commercial.",
      "Conduct of litigation is a reserved legal activity requiring entitlement to carry it on.",
      "Only paid oral advocacy is reserved, so formal conduct of litigation is unrestricted.",
      "Charging less than a regulated solicitor removes any authorisation requirement."
    ],
    correctIndex: 2,
    explanation: "Conduct of litigation is a reserved legal activity, distinct from general legal advice. On the stipulated facts Hannah is neither authorised nor exempt, and client consent or a lower fee does not supply entitlement.",
    optionExplanations: [
      "Wrong: a client’s consent does not itself confer statutory entitlement.",
      "Wrong: commercial litigation is not generally excluded from reservation.",
      "Right: the proposed formal conduct of proceedings engages a reserved activity.",
      "Wrong: the legislation reserves conduct of litigation separately from rights of audience.",
      "Wrong: the amount charged does not remove the statutory requirement."
    ],
    authority: "Legal Services Act 2007, ss 12–14 and Schedule 2, paragraph 4."
  },
  {
    id: "sqe1-flk1-ls-04",
    paper: "FLK1",
    subject: "legal-system",
    subtopic: "sources",
    difficulty: "challenging",
    prompt: "Elliot advises a trade association about an ambiguous provision in a recent Act. Two readings are genuinely available, and the association wishes to rely on parliamentary debates. During the Bill’s passage, the minister promoting it gave a clear statement directly addressing the ambiguity and supporting one reading. No wider constitutional issue arises. Elliot is asked whether the court may consult that statement to resolve the ambiguity. Which answer best describes the applicable approach?",
    options: [
      "Parliamentary material is always inadmissible when interpreting an Act.",
      "Every parliamentary speech is binding on the court regardless of its author.",
      "The statement may be used only if both parties consent.",
      "The statement automatically overrides even an unambiguous contrary statutory text.",
      "The court may consult the clear ministerial statement where the recognised conditions for using parliamentary material are met."
    ],
    correctIndex: 4,
    explanation: "Pepper v Hart permits reference to parliamentary material where legislation is ambiguous or obscure, or produces absurdity, and the material consists of clear statements by a minister or other promoter of the Bill. The stated ambiguity and directly relevant clear ministerial statement engage that limited exception.",
    optionExplanations: [
      "Wrong: the rule admits parliamentary material in defined circumstances.",
      "Wrong: neither every speech nor every speaker falls within the recognised exception.",
      "Wrong: admissibility does not depend on agreement between the litigants.",
      "Wrong: the exception does not make ministerial statements superior to clear statutory text.",
      "Right: the facts satisfy the stated conditions for consulting this material."
    ],
    authority: "Pepper v Hart [1993] AC 593."
  },
  {
    id: "sqe1-flk1-ls-05",
    paper: "FLK1",
    subject: "legal-system",
    subtopic: "legal-services",
    difficulty: "standard",
    prompt: "Rosa seeks civil legal aid for representation in an ordinary claim about defective accounting services supplied to her small business. She has a low income and no significant capital. No category in Schedule 1 to the Legal Aid, Sentencing and Punishment of Offenders Act 2012 covers the proposed services, and assume that exceptional case funding is unavailable. Rosa believes satisfying the financial test alone guarantees funding. Which explanation best states why that belief is incorrect?",
    options: [
      "Financial eligibility does not bring otherwise out-of-scope civil legal services within ordinary legal aid.",
      "Civil legal aid is available only to people who have never operated a business.",
      "Every civil claim is within scope, but solicitors may refuse to process applications.",
      "Civil legal aid is determined solely by whether the claim exceeds a fixed damages figure.",
      "Financial eligibility matters only after the funded litigation has ended."
    ],
    correctIndex: 0,
    explanation: "Ordinary civil legal aid requires the services to fall within statutory scope as well as satisfaction of the applicable eligibility requirements. Rosa’s financial circumstances cannot themselves bring this out-of-scope commercial claim into Schedule 1, and exceptional funding is expressly excluded.",
    optionExplanations: [
      "Right: scope and financial eligibility are separate requirements.",
      "Wrong: there is no blanket lifetime exclusion for anyone who has operated a business.",
      "Wrong: the statutory scheme does not place every civil claim within ordinary scope.",
      "Wrong: a damages figure alone does not determine entitlement.",
      "Wrong: financial eligibility is relevant to obtaining funding, not merely an end-of-case consideration."
    ],
    authority: "Legal Aid, Sentencing and Punishment of Offenders Act 2012, ss 9–11 and Schedule 1."
  },
  {
    id: "sqe1-flk1-eth-01",
    paper: "FLK1",
    subject: "ethics",
    subtopic: "sra-principles",
    difficulty: "core",
    prompt: "Clara, a solicitor advising a company on a proposed acquisition, discovers that her own earlier advice omitted a material regulatory restriction. The omission may expose the company to a substantial loss and could support a claim against her firm. Clara proposes correcting the advice quietly without explaining the earlier error because disclosure might damage the firm’s reputation. No legal restriction prevents disclosure to the client. What should Clara do about the error?",
    options: [
      "Keep the error secret if the corrected advice is sent before completion.",
      "Disclose the error only if the client first threatens a negligence claim.",
      "Wait until the acquisition completes before deciding whether disclosure is necessary.",
      "Be open and honest, explain promptly what happened and its likely impact, and put matters right if possible.",
      "Treat the firm’s reputation as overriding the client’s need to know."
    ],
    correctIndex: 3,
    explanation: "Solicitors must be open and honest when things go wrong and promptly explain what happened and its likely impact, putting matters right if possible. Protecting the firm’s reputation does not justify concealing a material error from the client.",
    optionExplanations: [
      "Wrong: quietly correcting advice does not satisfy the duty to explain the error and its likely impact.",
      "Wrong: the duty does not depend on a threatened negligence claim.",
      "Wrong: waiting for completion would withhold material information at the relevant decision-making stage.",
      "Right: this states the required response to a material mistake.",
      "Wrong: reputational self-interest does not override the professional duties engaged."
    ],
    authority: "SRA Principles 2019, Principles 4 and 7; SRA Code of Conduct for Solicitors, RELs and RFLs, paragraph 7.11."
  },
  {
    id: "sqe1-flk1-eth-02",
    paper: "FLK1",
    subject: "ethics",
    subtopic: "conflicts",
    difficulty: "challenging",
    prompt: "Dev is asked to advise a buyer acquiring a manufacturing business. His firm previously advised the seller and holds confidential information about an undisclosed contamination problem. The information is material to the buyer’s proposed acquisition. The seller refuses consent to disclosure. The firm has no effective information barrier or other measures capable of eliminating any real risk of disclosure, and the buyer has not given informed written consent to the firm acting despite holding material information it cannot disclose. What should Dev do?",
    options: [
      "Act and reveal the contamination information because the buyer is now the current client.",
      "Decline to act because neither exception permitting the firm to act in these circumstances is available.",
      "Act and withhold the information because former-client confidentiality automatically removes every duty to the buyer.",
      "Act if the buyer agrees to pay a higher fee for the additional risk.",
      "Act because confidentiality ends when the former retainer ends."
    ],
    correctIndex: 1,
    explanation: "Confidentiality continues after the former retainer ends. The firm must not act against a former client where it holds material confidential information unless an applicable exception is satisfied; the facts expressly exclude both effective protective measures and the required informed written consent.",
    optionExplanations: [
      "Wrong: taking a new retainer does not authorise disclosure of the former client’s confidential information.",
      "Right: the material adverse information engages the prohibition and neither stated exception is available.",
      "Wrong: confidentiality does not provide blanket permission to accept a compromised new retainer.",
      "Wrong: an increased fee cannot replace the safeguards or consent required by the Code.",
      "Wrong: the duty of confidentiality extends to former clients."
    ],
    authority: "SRA Code of Conduct for Solicitors, RELs and RFLs, paragraphs 6.3 and 6.5."
  },
  {
    id: "sqe1-flk1-eth-03",
    paper: "FLK1",
    subject: "ethics",
    subtopic: "duties-court",
    difficulty: "standard",
    prompt: "Nina acts for a claimant at a commercial trial. While preparing her closing submissions, she finds a binding appellate decision directly adverse to the claimant’s central legal argument. The defendant is unrepresented and has not cited it. Nina’s client instructs her to say nothing because the judge may not know the decision. The case cannot honestly be distinguished, and no later authority undermines it. What should Nina do about the adverse authority?",
    options: [
      "Omit it because only the opponent is responsible for identifying adverse authorities.",
      "Mention it only if the judge specifically asks whether adverse authority exists.",
      "Draw the court’s attention to the relevant binding decision despite the client’s instruction.",
      "Describe it as non-binding to preserve the client’s position.",
      "Withhold it unless the client gives written consent to disclosure."
    ],
    correctIndex: 2,
    explanation: "A solicitor must draw the court’s attention to relevant cases or statutory provisions of which the solicitor is aware and which are likely materially to affect the outcome. Nina cannot comply with an instruction to conceal the binding decision; duties supporting the administration of justice take precedence over the client’s tactical preference.",
    optionExplanations: [
      "Wrong: the duty is not displaced by an opponent’s failure to identify the authority.",
      "Wrong: the obligation does not arise only in response to a judicial question.",
      "Right: the decision is relevant, binding and materially adverse, so Nina must identify it.",
      "Wrong: knowingly misdescribing the authority would mislead the court.",
      "Wrong: compliance with the duty to the court is not conditional on client consent."
    ],
    authority: "SRA Principles 2019, Principle 1; SRA Code of Conduct for Solicitors, RELs and RFLs, paragraphs 1.4 and 2.7."
  }
];
