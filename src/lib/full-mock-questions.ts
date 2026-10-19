// Original placeholder questions for Full Exam Simulations.
// None of this is sourced from copyrighted bar prep material.
// Items are deliberately generic and labelled as practice content.

import type { Pathway, SectionBlueprint } from "./full-mock-blueprints";

export type MCQQuestion = {
  id: string;
  topic: string;
  stem: string;
  options: string[];     // 4 (UBE) or 5 (SQE)
  correctIndex: number;
  explanation: string;
};

export type EssayQuestion = {
  id: string;
  topic: string;
  prompt: string;
  guidance: string;
};

export type MPTQuestion = {
  id: string;
  topic: string;
  prompt: string;
  file: string;        // task memo
  library: string;     // source material
};

// ----- MBE bank (4 options) ---------------------------------------------------
// 14 originals across the 7 MBE subjects. We expand to 100 by labelled rotation.
const MBE_BANK: Omit<MCQQuestion, "id">[] = [
  {
    topic: "Civil Procedure",
    stem: "A plaintiff sues a defendant in federal district court based solely on diversity jurisdiction. The defendant timely moves to dismiss for lack of personal jurisdiction. The court denies the motion. Three months later, the defendant moves to dismiss for improper venue. How should the court rule on the venue motion?",
    options: [
      "Grant it, because venue may be challenged at any time before trial.",
      "Deny it, because the defense was waived by not being raised in the first motion.",
      "Grant it, because diversity actions require venue where any defendant resides.",
      "Deny it, because venue defects are cured by the defendant's appearance.",
    ],
    correctIndex: 1,
    explanation: "Improper venue is a disfavored defense that must be raised in the first Rule 12 motion or it is waived under Rule 12(h)(1).",
  },
  {
    topic: "Constitutional Law",
    stem: "A state enacts a statute requiring all out-of-state trucks entering the state to install a unique mudflap design that costs $1,200 per truck. Trucks registered in the state use a federally approved $50 mudflap. An out-of-state trucking company challenges the statute. The strongest constitutional argument against the statute is that it:",
    options: [
      "Violates the Privileges and Immunities Clause of Article IV.",
      "Imposes an undue burden on interstate commerce.",
      "Denies equal protection to out-of-state corporations.",
      "Constitutes an uncompensated taking of property.",
    ],
    correctIndex: 1,
    explanation: "Even non-discriminatory state laws fall under the Dormant Commerce Clause when their burden on interstate commerce is clearly excessive relative to local benefits.",
  },
  {
    topic: "Contracts",
    stem: "A merchant emails an offer to sell 500 widgets at $4 each, stating: 'This offer will remain open for 30 days.' Ten days later, before any acceptance, the merchant sells the entire stock to a third party and emails the original offeree to revoke. The offeree accepts the next day. Is there a contract?",
    options: [
      "No, because the offer was revoked before acceptance.",
      "Yes, because the merchant's promise to keep the offer open was binding.",
      "No, because the offer required consideration to be irrevocable.",
      "Yes, because the offeree relied on the firm offer.",
    ],
    correctIndex: 1,
    explanation: "Under UCC §2-205, a signed written offer by a merchant to keep an offer open is a firm offer and is irrevocable for the stated period (up to three months), without consideration.",
  },
  {
    topic: "Criminal Law",
    stem: "A suspect enters a store after hours intending to take cash from the register. He pries open the door, takes $80, and leaves. He is charged with burglary at common law. The strongest defense is that:",
    options: [
      "The taking was less than $100.",
      "The store was not a dwelling.",
      "He did not use a deadly weapon.",
      "The store was unoccupied.",
    ],
    correctIndex: 1,
    explanation: "Common-law burglary requires the breaking and entering of the dwelling of another at night with intent to commit a felony therein. A store is not a dwelling.",
  },
  {
    topic: "Evidence",
    stem: "In a civil negligence action arising from a car accident, the plaintiff seeks to introduce evidence that, after the accident, the defendant had the brakes on his car repaired. The evidence is offered to prove that the brakes were defective at the time of the accident. The court should rule the evidence:",
    options: [
      "Admissible, as relevant to the brakes' condition.",
      "Inadmissible, as a subsequent remedial measure offered to prove negligence.",
      "Admissible, as an admission by conduct.",
      "Inadmissible, as hearsay not within any exception.",
    ],
    correctIndex: 1,
    explanation: "FRE 407 bars evidence of subsequent remedial measures to prove negligence, culpable conduct, or product defect.",
  },
  {
    topic: "Real Property",
    stem: "An owner conveys her land 'to A for life, then to B and her heirs, but if B predeceases A, then to C and his heirs.' What is C's interest?",
    options: [
      "A vested remainder subject to divestment.",
      "A contingent remainder.",
      "A shifting executory interest.",
      "A springing executory interest.",
    ],
    correctIndex: 2,
    explanation: "C's interest cuts short B's vested remainder if a condition occurs — a shifting executory interest divesting a transferee's prior estate.",
  },
  {
    topic: "Torts",
    stem: "A homeowner places a spring-gun in an unoccupied vacation cabin to deter burglars. A thief breaks in and is seriously injured by the device. In a suit by the thief against the homeowner, the homeowner will most likely:",
    options: [
      "Win, because a property owner may use force to protect property.",
      "Win, because the thief was a trespasser engaged in a felony.",
      "Lose, because deadly force may not be used solely to protect property.",
      "Lose, only if the cabin was a dwelling.",
    ],
    correctIndex: 2,
    explanation: "Deadly mechanical devices to protect unoccupied property are impermissible; an owner cannot do indirectly what would be unlawful if done in person.",
  },
  {
    topic: "Civil Procedure",
    stem: "A federal court grants summary judgment against a plaintiff. The plaintiff files a notice of appeal 35 days later. The defendant moves to dismiss the appeal. The court should:",
    options: [
      "Deny the motion; the appeal period is 60 days.",
      "Grant the motion; the appeal period in civil cases is 30 days.",
      "Deny the motion; appeals are timely if filed within a reasonable time.",
      "Grant the motion only if the defendant was prejudiced.",
    ],
    correctIndex: 1,
    explanation: "In federal civil cases not involving the United States, a notice of appeal must be filed within 30 days of entry of judgment (FRAP 4(a)(1)(A)).",
  },
  {
    topic: "Constitutional Law",
    stem: "Congress enacts a statute prohibiting any person from possessing a firearm within 500 feet of a polling place on election day. The statute is most likely:",
    options: [
      "Unconstitutional, as exceeding Congress's enumerated powers.",
      "Constitutional under the Elections Clause.",
      "Constitutional under the Second Amendment's reasonable restrictions doctrine.",
      "Unconstitutional, as a violation of state sovereignty.",
    ],
    correctIndex: 1,
    explanation: "The Elections Clause (Art. I §4) authorizes Congress to regulate the time, place, and manner of federal elections, including reasonable measures protecting the integrity of polling.",
  },
  {
    topic: "Contracts",
    stem: "A homeowner and a contractor sign a written contract for a kitchen remodel for $25,000. After demolition, the contractor refuses to continue unless the price is raised to $30,000, citing unexpectedly high material costs. The homeowner agrees in writing to pay $30,000 to avoid delay. The remodel is completed. The homeowner now refuses to pay more than $25,000. Most likely, the contractor can recover:",
    options: [
      "$30,000, under the modification.",
      "$25,000, because the modification lacked consideration.",
      "$30,000, because the modification was in writing.",
      "$25,000, because economic duress voids the modification.",
    ],
    correctIndex: 1,
    explanation: "A common-law modification requires new consideration. The contractor's preexisting duty to complete the work for $25,000 does not supply it.",
  },
  {
    topic: "Evidence",
    stem: "A witness testifies for the prosecution. On cross-examination, defense counsel asks about a misdemeanor shoplifting conviction from four years ago. The prosecution objects. The court should:",
    options: [
      "Sustain the objection; misdemeanors are never admissible to impeach.",
      "Overrule the objection; any conviction is admissible to impeach.",
      "Sustain the objection unless shoplifting is a crime involving dishonesty.",
      "Overrule the objection; convictions less than ten years old are automatically admissible.",
    ],
    correctIndex: 2,
    explanation: "Under FRE 609(a)(2), a conviction must be admitted to impeach if the elements required proof of a dishonest act or false statement. Shoplifting commonly qualifies.",
  },
  {
    topic: "Real Property",
    stem: "A landlord and tenant sign a two-year residential lease. After six months, the tenant assigns her interest in the lease to a friend. The lease is silent on assignment. The landlord refuses to accept rent from the friend and sues to evict. The court should:",
    options: [
      "Allow the eviction; residential leases are non-assignable absent consent.",
      "Disallow the eviction; assignment is permitted unless the lease prohibits it.",
      "Allow the eviction; the assignment relieves the original tenant.",
      "Disallow the eviction only if the friend's credit equals the tenant's.",
    ],
    correctIndex: 1,
    explanation: "At common law, leasehold interests are freely assignable unless the lease provides otherwise.",
  },
  {
    topic: "Torts",
    stem: "A driver negligently strikes a pedestrian. The pedestrian, who has a thin skull, dies from injuries that would have caused only a minor concussion in an ordinary person. The driver argues that the death was unforeseeable. The driver's argument should:",
    options: [
      "Succeed, because foreseeability is the touchstone of proximate cause.",
      "Fail, because tortfeasors take their victims as they find them.",
      "Succeed, only if the pedestrian failed to warn the driver of her condition.",
      "Fail, only if the driver was driving recklessly.",
    ],
    correctIndex: 1,
    explanation: "The 'eggshell plaintiff' rule: a defendant is liable for the full extent of harm even if the victim's pre-existing condition makes the harm unusually severe.",
  },
  {
    topic: "Criminal Law",
    stem: "A defendant and an accomplice agree to rob a bank. The accomplice purchases ski masks but, before the robbery, calls the police and reports the plan. The defendant is arrested at the bank's entrance. The defendant is charged with conspiracy. The accomplice's withdrawal:",
    options: [
      "Is a complete defense for both the accomplice and the defendant.",
      "Is a complete defense only for the accomplice.",
      "Has no effect on conspiracy liability because the agreement was complete.",
      "Reduces the charge to attempted conspiracy.",
    ],
    correctIndex: 2,
    explanation: "Conspiracy is complete upon agreement (plus, at common law, an overt act in many jurisdictions). Withdrawal does not erase the completed conspiracy, though it may bar liability for later substantive crimes.",
  },
];

// ----- SQE bank (5 options) ---------------------------------------------------
// 20 originals split across FLK1 and FLK2 subjects.
const SQE_BANK: Omit<MCQQuestion, "id">[] = [
  // FLK1
  {
    topic: "Contract",
    stem: "A buyer agrees in writing to purchase a vintage motorbike from a seller for £8,000. The contract is silent on delivery. Before the buyer collects the bike, the seller sells it to a third party for £9,000. The buyer sues for damages. The market value of the bike on the date of breach was £10,000. The buyer's measure of damages is most likely:",
    options: [
      "£1,000, the seller's additional profit.",
      "£2,000, the difference between contract price and market value.",
      "£8,000, restitution of the purchase price.",
      "£10,000, the full market value.",
      "Nominal damages only, because the buyer suffered no out-of-pocket loss.",
    ],
    correctIndex: 1,
    explanation: "The expectation measure puts the buyer in the position as if the contract had been performed: market value (£10,000) minus contract price (£8,000) = £2,000.",
  },
  {
    topic: "Tort",
    stem: "A pedestrian is injured when a sign falls from a shop's frontage during high winds. The sign had been inspected six months earlier by a qualified contractor who certified it as secure. There is no evidence the shop owner knew of any defect. In a negligence claim against the shop owner, the claim will most likely:",
    options: [
      "Succeed, because the shop owner is strictly liable for premises hazards.",
      "Succeed, because res ipsa loquitur applies.",
      "Fail, because the shop owner discharged the duty of care by engaging a competent contractor.",
      "Fail, because the high winds were an act of God.",
      "Succeed, because the shop owner is vicariously liable for the contractor.",
    ],
    correctIndex: 2,
    explanation: "Engaging a competent independent contractor to inspect typically discharges the occupier's duty of reasonable care for premises hazards in the absence of knowledge of defect.",
  },
  {
    topic: "Business Law",
    stem: "A private company limited by shares has two directors and four shareholders. The articles adopt the Model Articles unamended. A director wishes to enter into a contract with the company to sell it office equipment. Under the Companies Act 2006, the director must:",
    options: [
      "Obtain unanimous shareholder consent before the transaction.",
      "Declare the nature and extent of the interest to the other directors before the company enters the transaction.",
      "Resign from the board before the transaction.",
      "Sell the equipment at independently valued price only.",
      "Procure a special resolution under section 190.",
    ],
    correctIndex: 1,
    explanation: "Section 177 CA 2006 requires a director proposing to enter into a transaction with the company to declare the nature and extent of the interest to the other directors before the transaction is entered into.",
  },
  {
    topic: "Dispute Resolution",
    stem: "A claimant issues a Part 7 claim form in the County Court but, four months after issue, has still not served it. The defendant applies for an order striking out the claim. The court should:",
    options: [
      "Strike out the claim because it was not served within four months.",
      "Extend time automatically because the defendant has not been prejudiced.",
      "Order service by an alternative method.",
      "Transfer the claim to the High Court.",
      "Stay the claim pending mediation.",
    ],
    correctIndex: 0,
    explanation: "Under CPR 7.5, a claim form must be served within four months of issue (six months if served outside the jurisdiction). Failure to do so renders it liable to be struck out.",
  },
  {
    topic: "Constitutional & Administrative",
    stem: "A government minister exercises a statutory power to refuse a licence. The licence applicant seeks judicial review on the ground that the minister failed to give reasons. There is no statutory duty to give reasons. The claim is most likely to:",
    options: [
      "Succeed, because every public decision must be reasoned.",
      "Succeed, because the failure breaches Article 6 ECHR.",
      "Fail, because there is no general common law duty to give reasons, although fairness may require them in particular cases.",
      "Fail, because judicial review is unavailable for licensing decisions.",
      "Succeed, because the decision is automatically irrational without reasons.",
    ],
    correctIndex: 2,
    explanation: "There is no general common law duty to give reasons (R v Higher Education Funding Council, ex parte Institute of Dental Surgery), although fairness may require reasons in particular circumstances.",
  },
  {
    topic: "Legal System",
    stem: "A Supreme Court decision from 2018 conflicts with a Court of Appeal decision from 2022 on the same point of law. A High Court judge is hearing a case raising that point in 2026. The judge is bound to follow:",
    options: [
      "The Court of Appeal, as the more recent authority.",
      "The Supreme Court, because its decisions bind all lower courts on points of law.",
      "Either, in the judge's discretion.",
      "Neither, because the conflict permits a fresh decision.",
      "The Court of Appeal, but only if it expressly distinguished the Supreme Court decision.",
    ],
    correctIndex: 1,
    explanation: "The Supreme Court binds all lower courts on points of law. The Court of Appeal cannot depart from a Supreme Court decision; the High Court must follow the Supreme Court.",
  },
  {
    topic: "Ethics",
    stem: "A solicitor is instructed to act for both a buyer and a seller in a residential conveyancing transaction. The parties are not related and there is no established business relationship. Under the SRA Code of Conduct, the solicitor:",
    options: [
      "May act if both clients consent in writing.",
      "Must not act because there is a significant risk of a conflict of interest.",
      "May act if a different fee-earner handles each side.",
      "Must obtain SRA permission to act.",
      "May act only if the transaction is at arm's length.",
    ],
    correctIndex: 1,
    explanation: "The interests of a buyer and seller are inherently adverse on price and risk allocation. The conflict-of-interest rules generally prohibit a solicitor from acting for both, with very limited exceptions not satisfied here.",
  },
  {
    topic: "Contract",
    stem: "A consumer purchases a kettle from a retailer. The kettle is defective and causes a small fire that damages the consumer's kitchen counter. The consumer wishes to recover the cost of replacing the counter. The most appropriate basis for the claim is:",
    options: [
      "Breach of express warranty under the contract.",
      "Breach of the Consumer Rights Act 2015 implied term as to satisfactory quality.",
      "The tort of conversion.",
      "Misrepresentation under section 2(1) Misrepresentation Act 1967.",
      "Restitution for unjust enrichment.",
    ],
    correctIndex: 1,
    explanation: "Section 9 of the Consumer Rights Act 2015 implies a term that goods sold to consumers be of satisfactory quality; damages include reasonably foreseeable consequential loss such as property damage.",
  },
  {
    topic: "Tort",
    stem: "A motorist drives carelessly and causes a multi-vehicle collision. A bystander, who is the parent of one of the injured drivers, witnesses the collision from across the road and develops a recognised psychiatric illness. To recover as a secondary victim, the bystander must establish all of the following EXCEPT:",
    options: [
      "A close tie of love and affection with the primary victim.",
      "Proximity in time and space to the event or its immediate aftermath.",
      "The psychiatric injury was caused by direct perception of the event.",
      "The psychiatric injury was reasonably foreseeable.",
      "The motorist owed a contractual duty to the bystander.",
    ],
    correctIndex: 4,
    explanation: "The Alcock control mechanisms require close ties, proximity, direct perception and foreseeability. A contractual duty is not a requirement.",
  },
  {
    topic: "Business Law",
    stem: "A general partnership has three partners. Without the knowledge of the others, one partner enters into a contract in the ordinary course of the partnership's business with a third party who deals in good faith. The contract is:",
    options: [
      "Void because the other partners did not consent.",
      "Binding only on the partner who signed.",
      "Binding on the partnership because of the partner's apparent authority.",
      "Voidable at the option of the partnership.",
      "Binding only if subsequently ratified.",
    ],
    correctIndex: 2,
    explanation: "Section 5 Partnership Act 1890: each partner has apparent authority to bind the firm in transactions of a kind usually carried on by the firm.",
  },
  // FLK2
  {
    topic: "Property Practice",
    stem: "A solicitor acting for a buyer of registered freehold land reviews official copies and discovers a restrictive covenant against business use. The buyer intends to use the property as a residence only. The solicitor should:",
    options: [
      "Refuse to proceed unless the covenant is removed.",
      "Inform the buyer of the covenant and confirm it does not affect the intended use.",
      "Apply to the Land Registry to cancel the covenant.",
      "Take out indemnity insurance without informing the buyer.",
      "Advise the buyer to obtain a deed of release from the original covenantor.",
    ],
    correctIndex: 1,
    explanation: "The solicitor must report material matters disclosed by the title; the covenant does not affect residential use, so reporting it is sufficient.",
  },
  {
    topic: "Wills & Estates",
    stem: "A testator validly executes a will in 2018 leaving her estate to her husband. In 2022 she marries again, and in 2024 she dies without making a new will. The estate will pass:",
    options: [
      "Under the 2018 will, because it was validly executed.",
      "Under the intestacy rules, because the 2018 will was revoked by the later marriage.",
      "In equal shares to her current spouse and the 2018 beneficiary.",
      "Under the doctrine of dependent relative revocation.",
      "Entirely to her current spouse under the survivorship presumption.",
    ],
    correctIndex: 1,
    explanation: "Section 18 Wills Act 1837: marriage revokes a prior will unless the will was expressly made in contemplation of that marriage.",
  },
  {
    topic: "Trusts",
    stem: "A settlor transfers shares to two trustees on trust 'for my children in equal shares as they each attain 25'. One child is 27, another is 20, and another is 12, all at the settlor's death. The trust is:",
    options: [
      "Void for uncertainty of objects.",
      "A bare trust for the eldest child only.",
      "A contingent interest trust with vested interests on attaining 25.",
      "Void for offending the rule against perpetuities.",
      "A discretionary trust requiring trustee selection.",
    ],
    correctIndex: 2,
    explanation: "Each child takes a contingent interest that vests on reaching 25; the class closes at the settlor's death and all members are ascertainable.",
  },
  {
    topic: "Land Law",
    stem: "A landowner grants a neighbour an easement of way over a defined track 'for so long as the neighbour owns the adjoining land'. The easement is:",
    options: [
      "Void because easements cannot be limited in time.",
      "Capable of existing as a legal easement if granted by deed and for a term equivalent to an estate in fee simple absolute in possession or a term of years absolute.",
      "An equitable easement only.",
      "A licence binding only the original parties.",
      "Void because the duration is uncertain.",
    ],
    correctIndex: 2,
    explanation: "Section 1(2)(a) LPA 1925 lists the legal estates and interests; only easements held for a term equivalent to a fee simple absolute or a term of years absolute can be legal — a 'for so long as' easement does not satisfy this, so it can exist only in equity.",
  },
  {
    topic: "Criminal Law",
    stem: "The defendant strikes the victim once with a fist, intending to cause some harm. The victim falls, hits her head and dies. The defendant is most likely guilty of:",
    options: [
      "Murder, because death resulted from an intentional assault.",
      "Voluntary manslaughter by loss of control.",
      "Unlawful act manslaughter.",
      "Gross negligence manslaughter.",
      "Common assault only, because death was not intended.",
    ],
    correctIndex: 2,
    explanation: "Unlawful act manslaughter requires an unlawful act (the assault) that is objectively dangerous and causes death. The defendant's lack of intent to kill or cause grievous bodily harm rules out murder.",
  },
  {
    topic: "Criminal Practice",
    stem: "A defendant is charged with an either-way offence in the magistrates' court. The magistrates accept jurisdiction. The defendant:",
    options: [
      "Must be tried in the magistrates' court.",
      "Has the right to elect trial on indictment in the Crown Court.",
      "May elect trial only if the offence carries more than five years' imprisonment.",
      "Has no choice once jurisdiction is accepted.",
      "May elect Crown Court trial only with the prosecution's consent.",
    ],
    correctIndex: 1,
    explanation: "For either-way offences, after the magistrates accept jurisdiction the defendant retains the right to elect trial on indictment in the Crown Court.",
  },
  {
    topic: "Solicitors' Accounts",
    stem: "A solicitor receives £5,000 from a client described as 'on account of costs and disbursements'. There is no current bill. Under the SRA Accounts Rules, the money must be:",
    options: [
      "Paid into the firm's business account immediately.",
      "Paid into a client account and held until properly transferred.",
      "Split equally between client and business accounts.",
      "Held in cash in the office safe.",
      "Refunded to the client until a bill is issued.",
    ],
    correctIndex: 1,
    explanation: "Money on account of costs and disbursements not yet incurred is client money and must be paid into a client account until properly billed and transferred.",
  },
  {
    topic: "Ethics",
    stem: "A solicitor learns during a retainer that a client has dishonestly understated income in a tax return. The client refuses to disclose the matter to HMRC. The solicitor's obligation is most likely to:",
    options: [
      "Continue to act and assist with the inaccurate return.",
      "Cease to act and consider whether reporting obligations arise.",
      "Report the client immediately to the police.",
      "Submit a corrected return on the client's behalf.",
      "Charge a higher fee to reflect the increased risk.",
    ],
    correctIndex: 1,
    explanation: "A solicitor cannot continue to act where this would involve the firm in dishonest conduct, and must consider obligations under the MLR/POCA reporting regime.",
  },
  {
    topic: "Wills & Estates",
    stem: "A testator's validly executed will leaves £20,000 to 'my niece Sarah'. The testator has two nieces named Sarah. The court is asked to construe the gift. Extrinsic evidence is:",
    options: [
      "Inadmissible because the will is unambiguous on its face.",
      "Admissible to resolve the latent ambiguity as to the identity of the beneficiary.",
      "Admissible only if the testator's intention can be inferred from the will text alone.",
      "Admissible only if both nieces consent.",
      "Inadmissible under the parol evidence rule.",
    ],
    correctIndex: 1,
    explanation: "Latent ambiguities (where extrinsic facts create the ambiguity) permit extrinsic evidence — including evidence of the testator's intention — to be considered.",
  },
  {
    topic: "Property Practice",
    stem: "A buyer of registered freehold land must register the transfer within:",
    options: [
      "Two months of completion.",
      "Six months of completion.",
      "One year of completion.",
      "Three months of completion.",
      "No fixed period, but as soon as reasonably practicable.",
    ],
    correctIndex: 0,
    explanation: "Section 6 LRA 2002: a registrable disposition must be completed by registration within two months of completion, failing which the disposition becomes void as a legal estate.",
  },
];

// ----- MEE bank ---------------------------------------------------------------
const MEE_BANK: Omit<EssayQuestion, "id">[] = [
  {
    topic: "Business Associations",
    prompt:
      "A three-person LLC was formed to operate a coffee roastery. The operating agreement is silent on member competition. One member secretly opens a competing roastery using a customer list developed at the LLC. Discuss the fiduciary duties owed, the available remedies, and any defenses the competing member might raise.",
    guidance:
      "Address the duty of loyalty (usurpation of opportunity, duty not to compete absent agreement), duty of care, contractual modification under most LLC statutes, and remedies including disgorgement, injunction and damages.",
  },
  {
    topic: "Civil Procedure",
    prompt:
      "A Texas buyer sues an Ohio manufacturer in federal court in Texas for $90,000 after a defective industrial oven caused a fire. The manufacturer sold the oven through its website and ships to Texas customers weekly. It moves to dismiss for lack of personal jurisdiction and, alternatively, to transfer venue to Ohio. Discuss.",
    guidance:
      "Cover diversity jurisdiction (citizenship, amount in controversy), specific personal jurisdiction (purposeful availment, relatedness, fair play — Ford Motor), venue under 28 U.S.C. § 1391 and transfer under § 1404(a).",
  },
  {
    topic: "Constitutional Law",
    prompt:
      "A city ordinance bans all signs on residential lawns except real-estate 'for sale' signs. A homeowner is fined for displaying a sign opposing a local tax measure. She sues, claiming the ordinance violates the First Amendment. Discuss.",
    guidance:
      "Address state action, content-based versus content-neutral regulation (Reed v. Town of Gilbert), strict scrutiny, residential signs as a uniquely important medium (City of Ladue v. Gilleo), and possible overbreadth.",
  },
  {
    topic: "Contracts",
    prompt:
      "A furniture retailer emailed a supplier ordering 200 oak chairs at $80 each. The supplier replied 'Accepted — all disputes subject to binding arbitration.' The supplier shipped 180 chairs, 30 of which were cracked. The retailer refuses to pay anything and wants to sue in court. Discuss the parties' rights.",
    guidance:
      "Apply UCC Article 2: merchants, UCC § 2-207 battle of the forms and material alteration (arbitration), perfect tender, rejection and acceptance of commercial units, cure, and buyer's damages.",
  },
  {
    topic: "Evidence",
    prompt:
      "At a robbery trial, the prosecution offers (1) a 911 call in which the victim said 'He just took my bag, he's running toward the station,' (2) the defendant's robbery conviction from six years ago, and (3) a police officer's written report of the victim's later station-house statement, the victim now being unavailable. Discuss admissibility.",
    guidance:
      "Analyse hearsay and the present sense impression / excited utterance exceptions, FRE 404(b) and 609 for the prior conviction, the public-records exception's limits in criminal cases, and the Confrontation Clause (Crawford, Davis — testimonial vs. ongoing emergency).",
  },
  {
    topic: "Real Property",
    prompt:
      "O conveyed Blackacre to A, who did not record. O then conveyed Blackacre to B for value; B knew nothing of A's deed and recorded. A later recorded and granted a mortgage to Bank. The jurisdiction has a race-notice statute. Discuss who holds title and the status of Bank's mortgage.",
    guidance:
      "Explain the race-notice statute, bona fide purchaser for value without notice, actual/constructive/inquiry notice, chain-of-title problems for A's later recording, and the mortgage's priority.",
  },
];

// ----- MPT bank ---------------------------------------------------------------
const MPT_BANK: Omit<MPTQuestion, "id">[] = [
  {
    topic: "Objective Memorandum",
    prompt:
      "Draft an objective memorandum to the supervising attorney analyzing whether our client, a small bakery, can pursue a claim for tortious interference with contractual relations against a competitor that hired away the bakery's head pastry chef in breach of a one-year non-compete.",
    file:
      "FILE\n\nTo: Examinee\nFrom: Supervising Attorney\nRe: ABC Bakery v. Competitor — claim assessment\n\nABC Bakery (our client) employed Chef D under a written contract that included a one-year non-compete within 25 miles. Six months into the term, Chef D resigned and started work at XYZ Patisserie (15 miles away). XYZ recruited Chef D after seeing a LinkedIn post. Please prepare an objective memorandum analyzing (1) whether the non-compete is enforceable, and (2) whether XYZ's conduct supports a tortious interference claim. Include a recommendation.",
    library:
      "LIBRARY\n\nState X Restatement (Second) of Torts § 766 (adopted): One who intentionally and improperly interferes with the performance of a contract is subject to liability for the pecuniary loss resulting to the other.\n\nFranklin v. Henson (State X 2019): Non-competes are enforceable if (i) supported by consideration, (ii) reasonable in time and geographic scope, and (iii) protect a legitimate business interest. One year and 25 miles are presumptively reasonable for skilled positions.\n\nMidtown Foods v. Riverwalk Café (State X 2021): Knowledge of a competitor's contract plus active inducement of breach is 'improper' under § 766. Mere hiring of an at-will employee, without more, is not.",
  },
  {
    topic: "Persuasive Brief",
    prompt:
      "Draft the Argument section of a persuasive brief in support of our client's motion to suppress evidence obtained from a warrantless search of a backpack left at a friend's apartment.",
    file:
      "FILE\n\nTo: Examinee\nFrom: Supervising Attorney\nRe: State v. R. Hill — motion to suppress\n\nClient R. Hill left a backpack at his friend M. Park's apartment overnight. While Hill was absent, police arrived with M. Park's consent to search the apartment for unrelated matters. They opened Hill's closed backpack and found contraband. Park did not own the backpack and had not been authorized to access it. Hill moved to suppress. Please draft the Argument section addressing standing, reasonable expectation of privacy in closed containers, and limits of third-party consent.",
    library:
      "LIBRARY\n\nUnited States v. Matlock (1974): Third party with common authority may consent to search of shared space.\n\nGeorgia v. Randolph (2006): Co-tenant may not validly consent over physically present co-tenant's objection.\n\nState v. Yu (State Y 2018): Consent to search premises does not extend to closed personal containers belonging to a non-consenting third party where the consenter lacks common authority over the container.\n\nMinnesota v. Olson (1990): Overnight guest has reasonable expectation of privacy in host's home.",
  },
];

// -----------------------------------------------------------------------------
// Public API: deterministic, padded to the blueprint count using labelled
// rotation so the runner gets the full structure.

function rotateMCQ(bank: Omit<MCQQuestion, "id">[], count: number, prefix: string, optionsCount: 4 | 5): MCQQuestion[] {
  const out: MCQQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const src = bank[i % bank.length];
    // Trim/pad options to match required count.
    let options = src.options.slice(0, optionsCount);
    while (options.length < optionsCount) {
      options.push(`None of the above (placeholder option ${options.length + 1})`);
    }
    const setNum = Math.floor(i / bank.length) + 1;
    out.push({
      id: `${prefix}-${i + 1}`,
      topic: src.topic,
      stem:
        setNum === 1
          ? src.stem
          : `${src.stem}\n\n[Practice set ${setNum} — original placeholder content.]`,
      options,
      correctIndex: Math.min(src.correctIndex, optionsCount - 1),
      explanation: src.explanation,
    });
  }
  return out;
}

function rotateEssay(count: number, prefix: string): EssayQuestion[] {
  const out: EssayQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const src = MEE_BANK[i % MEE_BANK.length];
    // "-v2" ids: the MEE bank changed when NCBE retired subjects (July 2026),
    // so answers saved against the old prompts never show under new ones.
    out.push({ id: `${prefix}-v2-${i + 1}`, ...src });
  }
  return out;
}

function rotateMPT(count: number, prefix: string): MPTQuestion[] {
  const out: MPTQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const src = MPT_BANK[i % MPT_BANK.length];
    out.push({ id: `${prefix}-${i + 1}`, ...src });
  }
  return out;
}

/**
 * Bank topics each January-2027-format session may draw from. Ethics is
 * pervasive, so it is allowed in every session; Solicitors Accounts appears
 * in both FLK2 sessions (wills context and property context).
 */
const SQE_2027_SESSION_TOPICS: Record<string, string[]> = {
  "flk1-s1": ["Business Law", "Dispute Resolution", "Legal Services", "Ethics"],
  "flk1-s2": ["Contract", "Tort", "Constitutional & Administrative", "Legal System", "Ethics"],
  "flk2-s1": ["Wills & Estates", "Solicitors' Accounts", "Trusts", "Land Law", "Ethics"],
  "flk2-s2": ["Property Practice", "Solicitors' Accounts", "Criminal Law", "Criminal Practice", "Ethics"],
};

/** Deterministic seeded shuffle so results can be re-derived from the section id. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Topics a session is allowed to test, or null when it is not session-scoped. */
export function sessionTopics(sectionId: string): string[] | null {
  return SQE_2027_SESSION_TOPICS[sectionId] ?? null;
}

export function generateQuestionsForSection(
  pathway: Pathway,
  section: SectionBlueprint,
): {
  mcq?: MCQQuestion[];
  essay?: EssayQuestion[];
  mpt?: MPTQuestion[];
} {
  if (section.kind === "mcq") {
    const allowed = pathway === "SQE" ? sessionTopics(section.id) : null;
    if (allowed) {
      // January 2027 format: only this session's subjects, mixed in random order.
      const scoped = SQE_BANK.filter((q) => allowed.includes(q.topic));
      const rotated = rotateMCQ(scoped, section.questions, section.id, section.optionsCount);
      return { mcq: seededShuffle(rotated, section.id) };
    }
    const bank = pathway === "UBE" ? MBE_BANK : SQE_BANK;
    return { mcq: rotateMCQ(bank, section.questions, section.id, section.optionsCount) };
  }
  if (section.kind === "essay") {
    return { essay: rotateEssay(section.questions, section.id) };
  }
  return { mpt: rotateMPT(section.questions, section.id) };
}
