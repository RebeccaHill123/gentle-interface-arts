// Starter SQE1 flashcard content. Original Tentra-authored study aids.
// Structured so it can later be migrated to Supabase (decks + cards tables).

export type FlkArea = "FLK1" | "FLK2";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  examTip?: string;
  topic: string;
  difficulty: Difficulty;
  flk: FlkArea;
}

export interface Deck {
  id: string;
  title: string;
  description: string;
  flk: FlkArea;
  subject: string;
}

export const DECKS: Deck[] = [
  // FLK1
  { id: "blp", title: "Business Law & Practice", description: "Company formation, directors' duties, partnerships and insolvency essentials.", flk: "FLK1", subject: "Business Law" },
  { id: "dr", title: "Dispute Resolution", description: "Civil procedure, pre-action conduct, costs and case management.", flk: "FLK1", subject: "Dispute Resolution" },
  { id: "contract", title: "Contract Law", description: "Formation, terms, vitiating factors, breach and remedies.", flk: "FLK1", subject: "Contract" },
  { id: "tort", title: "Tort Law", description: "Negligence, occupiers' liability, nuisance and defences.", flk: "FLK1", subject: "Tort" },
  { id: "legal-system", title: "Legal System of England & Wales", description: "Sources of law, statutory interpretation, precedent and court structure.", flk: "FLK1", subject: "Legal System" },
  { id: "constitutional", title: "Constitutional & Administrative Law", description: "Parliamentary sovereignty, judicial review, human rights.", flk: "FLK1", subject: "Public Law" },
  { id: "criminal", title: "Criminal Law & Practice", description: "Actus reus, mens rea, offences against the person and property.", flk: "FLK1", subject: "Criminal" },
  { id: "ethics-flk1", title: "Ethics & Professional Conduct (FLK1)", description: "SRA Principles, conflicts and confidentiality in non-contentious work.", flk: "FLK1", subject: "Ethics" },

  // FLK2
  { id: "property", title: "Property Practice", description: "Conveyancing steps, searches, SDLT and post-completion duties.", flk: "FLK2", subject: "Property" },
  { id: "land", title: "Land Law", description: "Freehold/leasehold, easements, covenants and registered land.", flk: "FLK2", subject: "Land" },
  { id: "wills", title: "Wills & Administration of Estates", description: "Validity, intestacy, IHT and grant procedure.", flk: "FLK2", subject: "Wills" },
  { id: "trusts", title: "Trusts", description: "Express trusts, the three certainties, trustee duties and breach.", flk: "FLK2", subject: "Trusts" },
  { id: "accounts", title: "Solicitors Accounts", description: "Client money handling, SRA Accounts Rules and common breaches.", flk: "FLK2", subject: "Accounts" },
  { id: "crim-lit", title: "Criminal Litigation", description: "Police station advice, bail, plea, mode of trial and sentencing.", flk: "FLK2", subject: "Criminal Litigation" },
  { id: "civil-lit", title: "Civil Litigation", description: "Statements of case, disclosure, interim applications and trial.", flk: "FLK2", subject: "Civil Litigation" },
  { id: "ethics-flk2", title: "Ethics & Professional Conduct (FLK2)", description: "Conduct in litigation, client money and undertakings.", flk: "FLK2", subject: "Ethics" },
];

const c = (
  deckId: string,
  topic: string,
  difficulty: Difficulty,
  flk: FlkArea,
  front: string,
  back: string,
  examTip?: string,
): Flashcard => ({
  id: `${deckId}-${front.slice(0, 24).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  deckId,
  front,
  back,
  examTip,
  topic,
  difficulty,
  flk,
});

export const CARDS: Flashcard[] = [
  // ===== Contract Law =====
  c("contract", "Formation", "Easy", "FLK1", "What are the four elements required to form a valid contract?",
    "Offer, acceptance, consideration and an intention to create legal relations. Capacity and certainty of terms are also required."),
  c("contract", "Consideration", "Medium", "FLK1", "What are the requirements for valid consideration?",
    "Consideration must be sufficient but need not be adequate. It must move from the promisee and must not generally be past, unless an exception applies (e.g. Pao On).",
    "Watch for promises based on past acts or performance of an existing duty."),
  c("contract", "Offer & Acceptance", "Medium", "FLK1", "When is acceptance by post effective?",
    "Acceptance is effective on posting (the postal rule), provided post is a reasonable means of acceptance and the letter is properly stamped and addressed.",
    "Postal rule is displaced by clear wording requiring receipt."),
  c("contract", "Terms", "Medium", "FLK1", "Distinguish a condition, warranty and innominate term.",
    "Breach of a condition allows termination and damages; breach of a warranty allows damages only; an innominate term's remedy depends on the seriousness of the breach (Hong Kong Fir)."),
  c("contract", "Misrepresentation", "Hard", "FLK1", "What remedies are available for negligent misrepresentation under s.2(1) Misrepresentation Act 1967?",
    "Damages on the tort of deceit measure and rescission, subject to bars. The representor must prove they had reasonable grounds to believe the statement was true.",
    "Section 2(1) reverses the burden of proof — favour the claimant."),
  c("contract", "Remedies", "Medium", "FLK1", "What is the rule in Hadley v Baxendale?",
    "Damages for breach are recoverable if losses arise naturally from the breach or were in the reasonable contemplation of both parties at contract formation."),
  c("contract", "Discharge", "Medium", "FLK1", "When will frustration discharge a contract?",
    "When a supervening event, without fault, makes performance impossible, illegal or radically different from what was agreed. Self-induced frustration does not apply."),

  // ===== Tort =====
  c("tort", "Negligence", "Easy", "FLK1", "State the three elements of negligence.",
    "Duty of care owed to the claimant, breach of that duty, and causation of damage that is not too remote."),
  c("tort", "Duty of Care", "Medium", "FLK1", "What is the Caparo three-stage test?",
    "Foreseeability of harm, proximity between the parties, and that it is fair, just and reasonable to impose a duty.",
    "Only apply Caparo for novel duty situations; established categories don't need it."),
  c("tort", "Breach", "Medium", "FLK1", "What is the standard of care for a professional?",
    "The standard of an ordinarily competent member of the profession (Bolam), subject to Bolitho — the practice must withstand logical analysis."),
  c("tort", "Causation", "Hard", "FLK1", "What is the 'but for' test and a key exception?",
    "Damage would not have occurred but for the defendant's breach. Exception: Fairchild — material contribution to risk in indivisible injury cases (e.g. mesothelioma)."),
  c("tort", "Occupiers' Liability", "Medium", "FLK1", "Compare duties under OLA 1957 and OLA 1984.",
    "1957: duty to take reasonable care to keep lawful visitors reasonably safe. 1984: limited duty to trespassers where danger is known and risk one against which protection may reasonably be offered."),
  c("tort", "Defences", "Easy", "FLK1", "What are the main defences to negligence?",
    "Contributory negligence (reduces damages), volenti non fit injuria (complete defence), and illegality (ex turpi causa)."),

  // ===== Business Law & Practice =====
  c("blp", "Directors' Duties", "Medium", "FLK1", "What is the general duty under s.172 Companies Act 2006?",
    "To act in the way the director considers, in good faith, would be most likely to promote the success of the company for the benefit of its members as a whole."),
  c("blp", "Shareholders", "Medium", "FLK1", "What majority is required for an ordinary vs special resolution?",
    "Ordinary: more than 50%. Special: at least 75%. Written resolutions of private companies use the same thresholds of those eligible to vote."),
  c("blp", "Partnership", "Easy", "FLK1", "Define a partnership under the Partnership Act 1890.",
    "The relation which subsists between persons carrying on a business in common with a view of profit. Default rule: every partner has authority to bind the firm."),
  c("blp", "Insolvency", "Hard", "FLK1", "List the statutory order of priority on a corporate winding up.",
    "Fixed charge holders → liquidator's expenses → preferential creditors → prescribed part for unsecured → floating charge holders → unsecured creditors → interest → shareholders."),
  c("blp", "Tax", "Medium", "FLK1", "How is a sole trader taxed on profits?",
    "Income tax on trading profits on a tax-year basis, plus Class 2 and Class 4 NICs. Losses can be carried back, forward or set against other income."),
  c("blp", "Company Formation", "Easy", "FLK1", "What documents are filed with Companies House on incorporation?",
    "Form IN01, the memorandum of association, articles (if bespoke) and the fee. A certificate of incorporation is then issued."),

  // ===== Dispute Resolution =====
  c("dr", "Pre-Action", "Easy", "FLK1", "What is the purpose of pre-action protocols?",
    "To encourage early exchange of information, narrow issues, support ADR and avoid litigation. Non-compliance can lead to costs sanctions."),
  c("dr", "Tracks", "Easy", "FLK1", "What are the three civil case tracks and key thresholds?",
    "Small claims (up to £10,000), fast track (£10,000–£25,000, trial ≤1 day) and multi-track (over £25,000 or complex). Intermediate track also exists for some £25k–£100k claims."),
  c("dr", "Limitation", "Medium", "FLK1", "State the limitation periods for contract, tort and personal injury claims.",
    "Contract: 6 years from breach. Tort: 6 years from damage. Personal injury: 3 years from injury or knowledge."),
  c("dr", "Costs", "Medium", "FLK1", "What is the general rule on costs at trial?",
    "Costs follow the event — the loser pays the winner's reasonable costs, subject to conduct, Part 36 and proportionality."),
  c("dr", "Part 36", "Hard", "FLK1", "What are the consequences if a claimant beats their own Part 36 offer at trial?",
    "Enhanced interest up to 10% above base, indemnity costs from expiry of the relevant period, and an additional amount up to £75,000."),
  c("dr", "Disclosure", "Medium", "FLK1", "What is standard disclosure under CPR 31.6?",
    "Documents the party relies on, those that adversely affect their own or another's case, or support another party's case — and documents required by a practice direction."),

  // ===== Legal System =====
  c("legal-system", "Statutory Interpretation", "Medium", "FLK1", "Name the four traditional rules of statutory interpretation.",
    "Literal rule, golden rule, mischief rule and purposive approach. Courts also use intrinsic and extrinsic aids and Pepper v Hart (Hansard)."),
  c("legal-system", "Precedent", "Easy", "FLK1", "What is the difference between ratio decidendi and obiter dicta?",
    "Ratio is the binding legal reason for the decision; obiter are remarks 'by the way' that are persuasive but not binding."),
  c("legal-system", "Courts", "Easy", "FLK1", "Which court is bound by the Supreme Court?",
    "All lower courts. The Supreme Court can depart from its own decisions under the 1966 Practice Statement when right to do so."),
  c("legal-system", "Sources", "Easy", "FLK1", "What are the main sources of law in England and Wales?",
    "Legislation (primary and secondary), case law, retained EU law (now assimilated), and the ECHR via the Human Rights Act 1998."),
  c("legal-system", "Hierarchy", "Medium", "FLK1", "Is the Court of Appeal bound by its own decisions?",
    "Generally yes (Young v Bristol Aeroplane), subject to three exceptions: conflicting decisions, decisions inconsistent with the Supreme Court, and decisions made per incuriam."),

  // ===== Constitutional & Administrative =====
  c("constitutional", "Sovereignty", "Medium", "FLK1", "State Dicey's three propositions of parliamentary sovereignty.",
    "Parliament can make or unmake any law; no Parliament can bind its successors; no body may question the validity of an Act of Parliament."),
  c("constitutional", "Judicial Review", "Hard", "FLK1", "What are the three traditional grounds of judicial review (GCHQ)?",
    "Illegality, irrationality (Wednesbury unreasonableness) and procedural impropriety. Proportionality now applies in rights-based cases."),
  c("constitutional", "HRA", "Medium", "FLK1", "What is the effect of a declaration of incompatibility under s.4 HRA?",
    "It does not invalidate the legislation or bind the parties. It signals incompatibility with the ECHR; Parliament chooses whether to amend."),
  c("constitutional", "Standing", "Medium", "FLK1", "What is the test for standing in judicial review?",
    "The claimant must have 'sufficient interest' in the matter to which the application relates (s.31(3) Senior Courts Act 1981)."),
  c("constitutional", "Remedies", "Easy", "FLK1", "Name the main public law remedies available on judicial review.",
    "Quashing order, prohibiting order, mandatory order, declaration, injunction and damages (only where also available privately)."),

  // ===== Criminal Law =====
  c("criminal", "Mens Rea", "Medium", "FLK1", "Distinguish direct and oblique intention.",
    "Direct: the defendant's aim or purpose. Oblique: the result was a virtually certain consequence and the defendant appreciated this (Woollin)."),
  c("criminal", "Murder", "Hard", "FLK1", "State the actus reus and mens rea of murder.",
    "AR: unlawful killing of a human being under the King's peace. MR: intention to kill or cause grievous bodily harm."),
  c("criminal", "Loss of Control", "Hard", "FLK1", "What are the three components of the loss of control partial defence?",
    "Loss of self-control; from a qualifying trigger (fear of serious violence and/or things said or done of an extremely grave character); a person of the defendant's age and sex with normal tolerance might react similarly."),
  c("criminal", "Theft", "Easy", "FLK1", "State the actus reus and mens rea of theft under s.1 Theft Act 1968.",
    "AR: appropriation of property belonging to another. MR: dishonesty (Ivey) and intention to permanently deprive."),
  c("criminal", "OAPA", "Medium", "FLK1", "Compare s.20 and s.18 OAPA 1861.",
    "Both require wounding or GBH. Section 20 requires intention or recklessness as to some harm; s.18 requires intention to cause GBH (a specific intent offence)."),
  c("criminal", "Self-Defence", "Medium", "FLK1", "When is force in self-defence reasonable?",
    "Force must be reasonable in the circumstances as the defendant honestly believed them to be. Householders may use disproportionate (not grossly disproportionate) force."),

  // ===== Ethics FLK1 =====
  c("ethics-flk1", "Principles", "Easy", "FLK1", "List the seven SRA Principles.",
    "Uphold (1) rule of law and administration of justice; (2) public trust; (3) independence; (4) honesty; (5) integrity; (6) equality, diversity and inclusion; (7) act in the best interests of each client."),
  c("ethics-flk1", "Conflicts", "Medium", "FLK1", "When can you act despite an own-interest conflict?",
    "Never. An own-interest conflict (or significant risk of one) is an absolute bar to acting (para 6.1 Code of Conduct).",
    "Distinguish from client conflicts where limited exceptions apply."),
  c("ethics-flk1", "Confidentiality", "Hard", "FLK1", "When does the duty of confidentiality yield to disclosure?",
    "Where disclosure is required or permitted by law (e.g. POCA), with client consent, or to prevent the commission of a serious criminal offence resulting in serious harm."),
  c("ethics-flk1", "Client Care", "Easy", "FLK1", "What information must be given to a client at the outset?",
    "Costs information, complaints procedure, regulatory status, scope of retainer and the right to complain to the Legal Ombudsman."),
  c("ethics-flk1", "Money Laundering", "Medium", "FLK1", "Who must a solicitor report a suspicion of money laundering to?",
    "The firm's Money Laundering Reporting Officer (MLRO), who decides whether to make a SAR to the NCA. Tipping off the client is an offence."),

  // ===== Property Practice =====
  c("property", "Searches", "Medium", "FLK2", "Name three standard pre-contract searches on a freehold purchase.",
    "Local authority search (LLC1 and CON29), drainage and water search, and environmental search. Add chancel, mining or flood as appropriate."),
  c("property", "SDLT", "Hard", "FLK2", "When must an SDLT return be filed?",
    "Within 14 days of the effective date of the transaction (usually completion). Late filing triggers penalties and interest."),
  c("property", "Exchange", "Medium", "FLK2", "What are the three Law Society Formulae for exchange of contracts?",
    "Formula A (one solicitor holds both parts), Formula B (each holds their own client's signed part) and Formula C (chain transactions)."),
  c("property", "Post-Completion", "Easy", "FLK2", "What must be done at HM Land Registry after completion?",
    "Apply to register the transfer within the priority period of the OS1 search (usually 30 working days) using form AP1 or FR1."),
  c("property", "Mortgages", "Medium", "FLK2", "When does a conflict of interest arise acting for buyer and lender?",
    "Where the lender's standard terms have been varied, or where any material information must be disclosed to the lender that the buyer will not allow. Otherwise typically permissible under para 6.2."),
  c("property", "Leasehold", "Medium", "FLK2", "What is the difference between an assignment and an underlease?",
    "Assignment transfers the entire residue of the lease term to the assignee. An underlease grants a new lease for a shorter period out of the headlease."),

  // ===== Land Law =====
  c("land", "Estates", "Easy", "FLK2", "What are the two legal estates in land under LPA 1925 s.1(1)?",
    "Fee simple absolute in possession (freehold) and term of years absolute (leasehold)."),
  c("land", "Easements", "Hard", "FLK2", "State the four characteristics of an easement (Re Ellenborough Park).",
    "Dominant and servient tenements; accommodation of the dominant tenement; diversity of ownership; right capable of forming the subject matter of a grant."),
  c("land", "Covenants", "Medium", "FLK2", "When does the burden of a restrictive covenant run in equity?",
    "Under Tulk v Moxhay: covenant must be restrictive, accommodate dominant land, intended to run, and the buyer must have notice (registration as a Class D(ii) land charge or notice on the register)."),
  c("land", "Co-ownership", "Medium", "FLK2", "How can a joint tenancy in equity be severed?",
    "By written notice (s.36(2) LPA 1925), an act operating on one's own share, mutual agreement, or mutual conduct. Severance creates a tenancy in common."),
  c("land", "Registered Land", "Medium", "FLK2", "What are overriding interests under Schedule 3 LRA 2002?",
    "Interests that bind a purchaser despite not appearing on the register — including short legal leases (≤7 years), interests of persons in actual occupation, and legal easements known or obvious."),
  c("land", "Leases", "Hard", "FLK2", "State the requirements for a lease (Street v Mountford).",
    "Exclusive possession, for a fixed or ascertainable term, at a rent (rent is usual but not essential post-Ashburn Anstalt)."),

  // ===== Wills =====
  c("wills", "Validity", "Easy", "FLK2", "State the formal requirements for a valid will under s.9 Wills Act 1837.",
    "In writing, signed by the testator (or by another in their presence and at their direction), intended to give effect to the will, signed or acknowledged in the presence of two witnesses who each then sign."),
  c("wills", "Intestacy", "Medium", "FLK2", "How is the estate distributed where the deceased leaves a spouse and children?",
    "Spouse takes personal chattels, a statutory legacy of £322,000 and half of the residue absolutely. Children share the other half on statutory trusts."),
  c("wills", "IHT", "Hard", "FLK2", "What is the standard nil rate band and the residence nil rate band?",
    "NRB: £325,000. RNRB: up to £175,000 where a qualifying residential interest passes to direct descendants. The RNRB tapers above a £2m estate."),
  c("wills", "Grants", "Medium", "FLK2", "When is a grant of letters of administration with will annexed used?",
    "Where there is a valid will but no executor able or willing to act. Entitlement follows NCPR rule 20."),
  c("wills", "Revocation", "Medium", "FLK2", "How may a will be revoked?",
    "By a later will or codicil, by destruction with intention to revoke (s.20 WA 1837), or automatically by marriage or civil partnership (subject to contemplation exception)."),
  c("wills", "Gifts", "Medium", "FLK2", "What is the doctrine of ademption?",
    "A specific gift fails if the property is no longer owned by the testator at death. The beneficiary takes nothing in its place unless the will provides otherwise."),

  // ===== Trusts =====
  c("trusts", "Certainties", "Easy", "FLK2", "State the three certainties for an express trust (Knight v Knight).",
    "Certainty of intention, certainty of subject matter and certainty of objects."),
  c("trusts", "Formalities", "Medium", "FLK2", "What formalities apply to declarations of trust over land?",
    "Must be evidenced in writing and signed by the person declaring the trust (s.53(1)(b) LPA 1925). Failure makes the trust unenforceable, not void."),
  c("trusts", "Constitution", "Hard", "FLK2", "What is the rule in Milroy v Lord?",
    "Equity will not perfect an imperfect gift. A trust is constituted by transfer of legal title to the trustees or by self-declaration; failed transfers are not treated as declarations."),
  c("trusts", "Trustees", "Medium", "FLK2", "What is the duty of care of a trustee under s.1 Trustee Act 2000?",
    "To exercise such care and skill as is reasonable in the circumstances, having regard to any special knowledge or experience the trustee has or holds themselves out as having."),
  c("trusts", "Breach", "Medium", "FLK2", "What is the test for tracing into a mixed bank account?",
    "Re Hallett's Estate: trustee is presumed to spend their own money first. Re Oatway: beneficiaries may claim any surviving asset purchased from the account."),
  c("trusts", "Resulting Trusts", "Hard", "FLK2", "When does a presumed resulting trust arise?",
    "On a voluntary transfer of property (other than land) or where one party contributes to the purchase price of property held in another's name, absent evidence of a gift or loan."),

  // ===== Solicitors Accounts =====
  c("accounts", "Client Money", "Easy", "FLK2", "Define client money under the SRA Accounts Rules.",
    "Money held or received for a client or third party, including money held as trustee, agent, or in any other fiduciary capacity."),
  c("accounts", "Segregation", "Medium", "FLK2", "What is rule 2.3 of the SRA Accounts Rules?",
    "Client money must be kept separate from money belonging to the firm. It must be available on demand unless otherwise instructed."),
  c("accounts", "Breaches", "Medium", "FLK2", "What must happen if you discover a breach of the Accounts Rules?",
    "Correct the breach promptly upon discovery, replace any shortfall from the firm's own money, and record it. Serious breaches may require reporting to the SRA."),
  c("accounts", "Interest", "Medium", "FLK2", "When must a firm pay interest on client money?",
    "When it is fair and reasonable to do so. Firms must have a written policy on the payment of interest."),
  c("accounts", "Transfers", "Hard", "FLK2", "When can money be transferred from client to office account for fees?",
    "Once a bill of costs or other written notification of fees has been delivered, the money becomes office money and must be transferred out within 14 days."),

  // ===== Criminal Litigation =====
  c("crim-lit", "PACE", "Medium", "FLK2", "What is the maximum period of detention without charge under PACE?",
    "24 hours, extendable by 12 hours by a superintendent (total 36), and up to 96 hours with magistrates' authorisation. Terrorism cases have longer limits."),
  c("crim-lit", "Bail", "Medium", "FLK2", "State the grounds for refusing bail under the Bail Act 1976.",
    "Substantial grounds to believe the defendant would fail to surrender, commit further offences, or interfere with witnesses or the course of justice."),
  c("crim-lit", "Mode of Trial", "Easy", "FLK2", "Which offences are triable either way?",
    "Offences such as theft, burglary, ABH, and s.20 OAPA. The defendant may elect Crown Court trial if magistrates accept jurisdiction."),
  c("crim-lit", "Disclosure", "Hard", "FLK2", "What is the prosecution's initial disclosure duty under CPIA 1996?",
    "To disclose any material that might reasonably be considered capable of undermining the prosecution case or assisting the defence."),
  c("crim-lit", "Sentencing", "Medium", "FLK2", "What is the purpose of a Newton hearing?",
    "To resolve a factual dispute relevant to sentence between prosecution and defence where the defendant has pleaded guilty."),
  c("crim-lit", "Adverse Inferences", "Medium", "FLK2", "When may a court draw inferences under s.34 CJPOA 1994?",
    "Where the accused failed to mention, when questioned or charged, a fact later relied on in their defence which they could reasonably have been expected to mention."),

  // ===== Civil Litigation =====
  c("civil-lit", "Statements of Case", "Easy", "FLK2", "What must a particulars of claim contain (CPR 16.4)?",
    "Concise statement of facts relied on, any claim for interest, and any other matters required by a practice direction. It must be verified by a statement of truth."),
  c("civil-lit", "Service", "Medium", "FLK2", "Within what period must a claim form be served?",
    "4 months from issue (6 months if served out of the jurisdiction). Extensions are possible but discretionary under CPR 7.6."),
  c("civil-lit", "Default Judgment", "Medium", "FLK2", "When can a claimant obtain default judgment?",
    "Where the defendant has failed to file an acknowledgment of service or defence within the relevant time, and the claim is not one of the excluded types under CPR 12.2."),
  c("civil-lit", "Summary Judgment", "Hard", "FLK2", "State the test for summary judgment under CPR 24.",
    "The respondent has no real prospect of succeeding on the claim/defence, and there is no other compelling reason for trial."),
  c("civil-lit", "Interim Applications", "Medium", "FLK2", "What is the American Cyanamid test for an interim injunction?",
    "(1) Serious issue to be tried; (2) damages inadequate for claimant; (3) balance of convenience favours grant; with cross-undertaking in damages."),
  c("civil-lit", "Enforcement", "Medium", "FLK2", "Name three methods of enforcing a money judgment.",
    "Writ/warrant of control, third party debt order, charging order. Also attachment of earnings and bankruptcy/winding up petitions."),

  // ===== Ethics FLK2 =====
  c("ethics-flk2", "Undertakings", "Hard", "FLK2", "Define a solicitor's undertaking.",
    "A statement, given orally or in writing, that the solicitor or firm will do or not do something, which the recipient reasonably places reliance on. Breach is professional misconduct and enforceable by the court."),
  c("ethics-flk2", "Court Duties", "Medium", "FLK2", "What is the solicitor's duty to the court regarding misleading evidence?",
    "Never knowingly or recklessly mislead the court. If the client insists on giving false evidence, the solicitor must cease to act."),
  c("ethics-flk2", "Client Money", "Medium", "FLK2", "Can a firm hold client money without operating a client account?",
    "Yes — under rule 2.2, where conditions are met (e.g. money is for fees and unpaid disbursements not yet incurred, or the firm only handles legal aid money)."),
  c("ethics-flk2", "Conflicts in Litigation", "Hard", "FLK2", "Can a solicitor act for both claimant and defendant in litigation?",
    "No — there is an inherent client conflict and the exceptions in para 6.2 (substantially common interest, competing for the same objective) do not apply to adversarial litigation."),
  c("ethics-flk2", "Confidentiality vs Disclosure", "Hard", "FLK2", "How is the duty of confidentiality balanced with the duty of disclosure to another client?",
    "Confidentiality always prevails (para 6.3). A firm must not act where this conflict cannot be managed with informed consent and effective information barriers."),
];

export const getDeck = (id: string) => DECKS.find((d) => d.id === id);
export const getCardsByDeck = (deckId: string) =>
  CARDS.filter((c) => c.deckId === deckId);
