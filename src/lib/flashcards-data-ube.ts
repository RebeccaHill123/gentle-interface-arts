// UBE (Uniform Bar Exam) flashcard content. Original Tentra-authored study aids
// summarising US black-letter law across MBE, MEE and MPT subjects.
// Structured to match the SQE flashcards module so the UI can swap datasets.

import type { Deck, Difficulty, Flashcard } from "./flashcards-data";

export type UbeArea = "MBE" | "MEE" | "MPT";

export const UBE_DECKS: Deck[] = [
  // MBE subjects
  { id: "ube-civpro", title: "Civil Procedure", description: "SMJ, PJ, Erie, pleadings, preclusion and federal procedure essentials.", flk: "MBE", subject: "Civil Procedure" },
  { id: "ube-conlaw", title: "Constitutional Law", description: "Judicial power, federalism, individual rights and First Amendment.", flk: "MBE", subject: "Constitutional Law" },
  { id: "ube-contracts", title: "Contracts & Sales (UCC Art. 2)", description: "Formation, defenses, performance, breach and remedies under common law and the UCC.", flk: "MBE", subject: "Contracts" },
  { id: "ube-crim", title: "Criminal Law & Procedure", description: "Homicide, inchoate offenses, 4A/5A/6A and trial rights.", flk: "MBE", subject: "Criminal" },
  { id: "ube-evidence", title: "Evidence (FRE)", description: "Relevance, character, hearsay, privileges and impeachment.", flk: "MBE", subject: "Evidence" },
  { id: "ube-property", title: "Real Property", description: "Estates, future interests, easements, conveyancing, recording acts and mortgages.", flk: "MBE", subject: "Real Property" },
  { id: "ube-torts", title: "Torts", description: "Intentional torts, negligence, strict liability, products and defamation.", flk: "MBE", subject: "Torts" },
  // MEE-exclusive
  { id: "ube-ba", title: "Business Associations", description: "Agency, partnerships, corporations and LLCs.", flk: "MEE", subject: "Business Associations" },
  { id: "ube-conflicts", title: "Conflict of Laws", description: "Choice of law, domicile, FF&C and recognition of judgments.", flk: "MEE", subject: "Conflict of Laws" },
  { id: "ube-family", title: "Family Law", description: "Marriage, divorce, property division, support and custody (UCCJEA).", flk: "MEE", subject: "Family Law" },
  { id: "ube-trusts", title: "Trusts & Estates", description: "Wills, intestacy, will contests, express trusts and trustee duties.", flk: "MEE", subject: "Trusts & Estates" },
  { id: "ube-secured", title: "Secured Transactions (UCC Art. 9)", description: "Attachment, perfection, priority and default under Article 9.", flk: "MEE", subject: "Secured Transactions" },
  // MPT
  { id: "ube-mpt", title: "Multistate Performance Test (MPT)", description: "Closed-library lawyering skills: memos, briefs, client letters.", flk: "MPT", subject: "MPT" },
];

const c = (
  deckId: string,
  topic: string,
  difficulty: Difficulty,
  flk: UbeArea,
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

export const UBE_CARDS: Flashcard[] = [
  // ===== Civil Procedure =====
  c("ube-civpro", "SMJ", "Medium", "MBE", "What are the requirements for federal diversity jurisdiction?",
    "Complete diversity between all plaintiffs and all defendants (Strawbridge) AND an amount in controversy exceeding $75,000, exclusive of interest and costs.",
    "Citizenship of a corporation = state of incorporation AND principal place of business (nerve center)."),
  c("ube-civpro", "Personal Jurisdiction", "Hard", "MBE", "State the modern test for specific personal jurisdiction.",
    "The defendant must have minimum contacts with the forum such that exercising jurisdiction does not offend traditional notions of fair play and substantial justice (International Shoe). Contacts must be purposeful, the claim must arise out of or relate to those contacts, and exercise must be reasonable."),
  c("ube-civpro", "Erie", "Hard", "MBE", "Under Erie, when does a federal court apply state law?",
    "In diversity cases, federal courts apply state substantive law and federal procedural law. If a Federal Rule is on point and valid under the Rules Enabling Act, it applies; otherwise, courts use the Hanna twin-aims test (forum shopping / inequitable administration)."),
  c("ube-civpro", "Pleadings", "Medium", "MBE", "What is the time to respond to a complaint under FRCP 12?",
    "21 days after service of the summons and complaint (60 days if the defendant waived service). A Rule 12 motion tolls the response deadline."),
  c("ube-civpro", "Preclusion", "Hard", "MBE", "Distinguish claim preclusion from issue preclusion.",
    "Claim preclusion (res judicata) bars relitigation of the same claim between the same parties after a valid final judgment on the merits. Issue preclusion (collateral estoppel) bars relitigation of an issue actually litigated, determined, and essential to a prior valid final judgment.",
    "Mutuality is no longer required for non-mutual issue preclusion in federal court."),
  c("ube-civpro", "Summary Judgment", "Medium", "MBE", "What is the standard for summary judgment under Rule 56?",
    "The movant must show there is no genuine dispute as to any material fact and that the movant is entitled to judgment as a matter of law. Evidence is viewed in the light most favorable to the non-moving party."),

  // ===== Constitutional Law =====
  c("ube-conlaw", "Standing", "Medium", "MBE", "State the three constitutional requirements for Article III standing.",
    "(1) Injury in fact (concrete, particularized, actual or imminent); (2) causation (fairly traceable to the defendant's conduct); (3) redressability (likely to be redressed by a favorable decision)."),
  c("ube-conlaw", "Scrutiny", "Medium", "MBE", "State the three levels of constitutional scrutiny.",
    "Strict scrutiny: law must be necessary to achieve a compelling government interest (race, national origin, fundamental rights). Intermediate: substantially related to an important interest (gender, illegitimacy). Rational basis: rationally related to a legitimate interest (default)."),
  c("ube-conlaw", "Commerce", "Hard", "MBE", "What may Congress regulate under the Commerce Clause?",
    "(1) Channels of interstate commerce; (2) instrumentalities and persons/things in interstate commerce; (3) activities having a substantial effect on interstate commerce (aggregated for economic activity only — Lopez/Morrison)."),
  c("ube-conlaw", "Dormant Commerce", "Hard", "MBE", "When does a state law violate the Dormant Commerce Clause?",
    "If it discriminates against out-of-state commerce on its face, in purpose, or in effect (per se invalid unless necessary to a non-economic compelling interest) — OR if it unduly burdens interstate commerce under the Pike balancing test."),
  c("ube-conlaw", "Free Speech", "Hard", "MBE", "Distinguish content-based and content-neutral speech restrictions.",
    "Content-based restrictions trigger strict scrutiny. Content-neutral restrictions on time, place, and manner in a public forum must be narrowly tailored to a significant interest and leave open ample alternative channels."),
  c("ube-conlaw", "Equal Protection", "Medium", "MBE", "What triggers strict scrutiny under Equal Protection?",
    "Government classifications based on race, national origin, or alienage (state law), OR classifications that burden a fundamental right (vote, travel, privacy)."),

  // ===== Contracts =====
  c("ube-contracts", "Governing Law", "Easy", "MBE", "When does the UCC Article 2 apply rather than common law?",
    "Article 2 governs contracts for the sale of goods (movable, tangible items). Common law governs services and real estate. For mixed contracts, courts apply the predominant purpose test."),
  c("ube-contracts", "Mailbox Rule", "Medium", "MBE", "State the mailbox rule and its exceptions.",
    "Acceptance is effective upon dispatch if a reasonable means is used. Exceptions: option contracts (effective on receipt); if rejection sent first then acceptance, first received controls; if acceptance sent first then rejection, mailbox rule still applies unless offeror detrimentally relies on the rejection."),
  c("ube-contracts", "Statute of Frauds", "Medium", "MBE", "List the contracts within the Statute of Frauds (MY LEGS).",
    "Marriage, contracts not performable within one Year, Land sales, Executor promises to pay decedent debts personally, Goods of $500 or more (UCC), Surety promises. Must be in writing signed by the party to be charged."),
  c("ube-contracts", "Perfect Tender", "Medium", "MBE", "What is the UCC perfect tender rule?",
    "If goods or their delivery fail in any respect to conform to the contract, the buyer may reject all, accept all, or accept any commercial unit(s) and reject the rest. The seller has a right to cure within the contract time (and sometimes after).",
    "Perfect tender does NOT apply to installment contracts — substantial impairment standard applies."),
  c("ube-contracts", "Consideration", "Easy", "MBE", "What is the modern definition of consideration?",
    "A bargained-for exchange involving legal detriment or benefit. Past consideration and pre-existing duties are generally not consideration (UCC modifications need only good faith)."),
  c("ube-contracts", "Damages", "Medium", "MBE", "State the standard measure of expectation damages.",
    "The amount needed to put the non-breaching party in the position they would have been in had the contract been performed — loss in value + other (incidental/consequential) loss − cost avoided − loss avoided. Consequential damages require foreseeability (Hadley v. Baxendale)."),

  // ===== Criminal Law & Procedure =====
  c("ube-crim", "Murder", "Hard", "MBE", "State common-law murder and the four types of malice aforethought.",
    "Unlawful killing of a human being with malice aforethought. Malice = (1) intent to kill; (2) intent to cause serious bodily harm; (3) reckless indifference to human life (depraved heart); (4) intent to commit an inherently dangerous felony (felony murder)."),
  c("ube-crim", "Felony Murder", "Hard", "MBE", "What are the limitations on felony murder?",
    "(1) Underlying felony must be inherently dangerous (BARRK: burglary, arson, robbery, rape, kidnapping); (2) felony must be independent of the killing (merger); (3) death must be foreseeable; (4) death must occur during the felony or immediate flight; (5) victim cannot be a co-felon (agency theory in most jurisdictions)."),
  c("ube-crim", "Miranda", "Medium", "MBE", "When are Miranda warnings required?",
    "Before custodial interrogation by a known government agent. 'Custody' = formal arrest or restraint to that degree. 'Interrogation' = express questioning or its functional equivalent (words/actions likely to elicit an incriminating response)."),
  c("ube-crim", "4th Amendment", "Hard", "MBE", "List the major warrant exceptions for searches.",
    "ESCAPIST: Exigent circumstances (incl. hot pursuit), Search incident to lawful arrest, Consent, Automobile exception, Plain view, Inventory, Stop and frisk (Terry), Special needs. Also: administrative searches and certain border searches."),
  c("ube-crim", "Accomplice", "Medium", "MBE", "What is the modern rule on accomplice liability?",
    "An accomplice is liable for the crime aided/encouraged AND for other foreseeable crimes committed in furtherance. Requires (1) actus reus of assistance and (2) mens rea of intent that the principal commit the crime."),
  c("ube-crim", "Double Jeopardy", "Medium", "MBE", "When does jeopardy attach?",
    "In a jury trial, when the jury is sworn; in a bench trial, when the first witness is sworn; on a guilty plea, when accepted by the court. The Blockburger test governs same-offense analysis: each offense must require proof of an element the other does not."),

  // ===== Evidence =====
  c("ube-evidence", "Relevance", "Easy", "MBE", "State FRE 401 and 403.",
    "401: Evidence is relevant if it has any tendency to make a fact of consequence more or less probable. 403: Relevant evidence may be excluded if its probative value is substantially outweighed by unfair prejudice, confusion, misleading the jury, delay, or cumulative evidence."),
  c("ube-evidence", "Hearsay", "Hard", "MBE", "Define hearsay under FRE 801.",
    "An out-of-court statement offered to prove the truth of the matter asserted. Excluded by FRE 802 unless an exemption (801(d)) or exception (803/804/807) applies."),
  c("ube-evidence", "Hearsay Exceptions (Avail.)", "Hard", "MBE", "Name five FRE 803 exceptions where the declarant's availability is immaterial.",
    "Present sense impression, excited utterance, then-existing mental/emotional/physical condition, statement for medical diagnosis or treatment, recorded recollection, business records, public records, learned treatises, ancient documents."),
  c("ube-evidence", "Character", "Medium", "MBE", "When is character evidence admissible in a criminal case?",
    "The accused may offer evidence of a pertinent good character trait (reputation/opinion); the prosecution may rebut. In sexual assault/child molestation cases, the prosecution may offer evidence of the defendant's similar prior acts (FRE 413/414)."),
  c("ube-evidence", "Privileges", "Medium", "MBE", "What is the attorney-client privilege?",
    "Confidential communications between attorney and client (or their representatives) made for the purpose of seeking or providing legal advice are privileged from disclosure. The privilege is held by the client and survives the client's death. Exceptions: crime/fraud, joint clients, breach of duty."),
  c("ube-evidence", "Impeachment", "Medium", "MBE", "How may a witness be impeached with a prior conviction under FRE 609?",
    "Crimes involving dishonesty/false statement: automatically admissible (subject to 10-year limit). Other felonies: admissible subject to Rule 403 balancing (for the accused, probative value must outweigh prejudicial effect)."),

  // ===== Real Property =====
  c("ube-property", "RAP", "Hard", "MBE", "State the Rule Against Perpetuities.",
    "No interest is good unless it must vest, if at all, no later than 21 years after some life in being at the creation of the interest. Applies to contingent remainders, executory interests, and vested remainders subject to open. Many states have adopted USRAP (90-year wait-and-see)."),
  c("ube-property", "Recording Acts", "Hard", "MBE", "Distinguish race, notice, and race-notice statutes.",
    "Race: first to record wins. Notice: a subsequent bona fide purchaser without notice prevails over a prior unrecorded interest. Race-notice: a subsequent BFP wins only if they take without notice AND record first."),
  c("ube-property", "Mortgages", "Hard", "MBE", "State the general rule on mortgage priority.",
    "First in time, first in right — subject to recording acts. A purchase-money mortgage (used to acquire the property) takes priority over prior judgment liens and other mortgages against the buyer, even if recorded later."),
  c("ube-property", "Easements", "Medium", "MBE", "Name the four ways an easement may be created.",
    "Express (writing satisfying SOF), implication (from prior use or necessity), prescription (open, notorious, continuous, adverse use for the statutory period), and estoppel."),
  c("ube-property", "Concurrent Estates", "Medium", "MBE", "Distinguish joint tenancy from tenancy in common.",
    "Joint tenancy: right of survivorship, requires the four unities (time, title, interest, possession) plus express words of survivorship; severable by conveyance. Tenancy in common: no survivorship; presumed in modern law; each cotenant has an undivided share."),
  c("ube-property", "Marketable Title", "Medium", "MBE", "What is the implied covenant of marketable title?",
    "Every land sale contract impliedly warrants the seller will deliver marketable title at closing — title reasonably free from doubt and threat of litigation. Defects: undisclosed encumbrances, chain-of-title gaps, zoning violations (not mere zoning)."),

  // ===== Torts =====
  c("ube-torts", "Negligence", "Easy", "MBE", "State the four elements of negligence.",
    "Duty owed to the plaintiff, breach of that duty, actual and proximate causation, and damages."),
  c("ube-torts", "Intentional Torts", "Medium", "MBE", "List the seven intentional torts.",
    "Battery, assault, false imprisonment, intentional infliction of emotional distress, trespass to land, trespass to chattels, conversion. Intent = purpose or substantial certainty (transferred intent applies across persons and the first five torts)."),
  c("ube-torts", "Products Liability", "Hard", "MBE", "State the elements of strict products liability.",
    "(1) Defendant is a commercial seller; (2) product was defective (manufacturing, design, or warning); (3) defect existed when it left defendant's control; (4) defect caused plaintiff's harm; (5) plaintiff was a foreseeable user/bystander making foreseeable use."),
  c("ube-torts", "Defamation", "Hard", "MBE", "State the elements of defamation, including constitutional overlays.",
    "(1) Defamatory statement; (2) of or concerning the plaintiff; (3) publication to a third party; (4) damages (presumed in libel/slander per se). Constitutional: public figure must prove actual malice (knowledge of falsity or reckless disregard); private figure on a matter of public concern must prove at least negligence."),
  c("ube-torts", "NIED", "Medium", "MBE", "When may a bystander recover for negligent infliction of emotional distress?",
    "Most jurisdictions (Dillon): (1) plaintiff is closely related to the injured victim; (2) plaintiff was present at the scene and observed the injury; (3) plaintiff suffered severe emotional distress."),
  c("ube-torts", "Vicarious Liability", "Medium", "MBE", "When is an employer vicariously liable for an employee's torts?",
    "For torts committed within the scope of employment under respondeat superior. Generally not liable for intentional torts unless force is foreseeable to the job (e.g. bouncer). Independent contractors: generally no vicarious liability except for non-delegable or inherently dangerous activities."),

  // ===== Business Associations =====
  c("ube-ba", "Agency", "Medium", "MEE", "Distinguish actual, apparent, and inherent authority.",
    "Actual: agent reasonably believes principal authorized the act (express or implied). Apparent: third party reasonably believes agent has authority based on principal's manifestations. Inherent: arises from the agency role itself, even without express authority."),
  c("ube-ba", "Piercing", "Hard", "MEE", "When may a court pierce the corporate veil?",
    "When shareholders abuse the corporate form — typically (1) alter ego/instrumentality (commingling, undercapitalization, failure to observe formalities); (2) fraud; (3) inadequate capitalization at inception. Easier to pierce for tort plaintiffs than contract plaintiffs."),
  c("ube-ba", "BJR", "Medium", "MEE", "State the Business Judgment Rule.",
    "Directors are presumed to act on an informed basis, in good faith, and in the honest belief that the action is in the corporation's best interests. The rule does NOT apply where there is a conflict, fraud, bad faith, or gross negligence/uninformed decision."),
  c("ube-ba", "Duty of Loyalty", "Hard", "MEE", "How may a self-dealing transaction by a director be upheld?",
    "(1) Disclosure + approval by disinterested directors; (2) disclosure + approval by disinterested shareholders; OR (3) the transaction is fair to the corporation at the time entered. Burden generally on the interested director to prove fairness."),
  c("ube-ba", "Partnership", "Medium", "MEE", "What is the default profit/loss allocation in a general partnership?",
    "Under RUPA, profits are shared equally regardless of capital contribution; losses follow profits. Each partner has equal management rights and is jointly and severally liable for partnership obligations."),
  c("ube-ba", "Derivative Suit", "Hard", "MEE", "State the requirements for a shareholder derivative action.",
    "(1) Shareholder must have owned stock at the time of the wrong (contemporaneous ownership) and through the litigation; (2) shareholder must make demand on the board (or plead demand futility); (3) suit is brought to redress harm to the corporation."),

  // ===== Conflict of Laws =====
  c("ube-conflicts", "Domicile", "Easy", "MEE", "How is domicile established and changed?",
    "Domicile of origin at birth (typically the father's). Changed by (1) physical presence in a new place AND (2) intent to remain indefinitely. Each person has exactly one domicile at a time."),
  c("ube-conflicts", "Choice of Law - Tort", "Hard", "MEE", "Compare vested-rights and Second Restatement approaches in tort.",
    "Traditional vested rights: apply the law of the place of the wrong (lex loci delicti). Second Restatement (most significant relationship): consider place of injury, conduct, parties' domiciles, and relationship's center — weighed against general choice-of-law principles."),
  c("ube-conflicts", "FF&C", "Medium", "MEE", "What does Full Faith and Credit require?",
    "States must recognize final, valid, on-the-merits judgments of sister-state courts to the same extent as the rendering state would. Limited defenses: lack of jurisdiction, fraud in procurement, or denial of due process. Public policy is NOT a defense to a sister-state judgment."),
  c("ube-conflicts", "Public Policy", "Medium", "MEE", "When does the public-policy defense bar applying foreign law?",
    "When the foreign law violates a deeply rooted policy of the forum state. The defense bars application of that law but does not necessarily bar the cause of action — the forum may apply its own law instead."),

  // ===== Family Law =====
  c("ube-family", "Property Division", "Hard", "MEE", "Compare equitable distribution and community property.",
    "Equitable distribution (majority): marital property divided equitably (not necessarily equally) based on statutory factors. Community property (9 states): property acquired during marriage by either spouse is owned 50/50; divided equally at divorce."),
  c("ube-family", "Premarital", "Medium", "MEE", "What are the modern requirements for an enforceable premarital agreement?",
    "Under the UPAA: (1) in writing and signed; (2) voluntary; (3) not unconscionable AND there was fair and reasonable disclosure of assets (or waiver, or independent knowledge). Some states also require independent counsel."),
  c("ube-family", "Child Custody", "Hard", "MEE", "State the standard for child custody and the UCCJEA jurisdictional rule.",
    "Standard: best interests of the child (multiple statutory factors). UCCJEA: the child's home state (where child lived with a parent for 6 consecutive months before the action) has exclusive jurisdiction; emergency jurisdiction in cases of abandonment or abuse."),
  c("ube-family", "Support", "Medium", "MEE", "How is child support determined?",
    "Each state has guidelines that produce a presumptive support amount based on parental income, custody arrangement, and number of children. Courts may deviate only with written findings of fact justifying the deviation."),
  c("ube-family", "Divorce", "Easy", "MEE", "What is no-fault divorce?",
    "Dissolution available without proving marital fault — based on irreconcilable differences, irretrievable breakdown, or living separate and apart for a statutory period. Available in every state."),

  // ===== Trusts & Estates =====
  c("ube-trusts", "Will Execution", "Medium", "MEE", "State the formal requirements for executing a will (UPC).",
    "(1) Writing; (2) signed by testator (or by another at the testator's direction and in their presence); (3) signed by at least two witnesses within a reasonable time after they witnessed the signing or testator's acknowledgment. UPC also allows a notarized will."),
  c("ube-trusts", "Intestacy", "Medium", "MEE", "Under the UPC, how is an intestate estate distributed when the decedent is survived by a spouse and descendants?",
    "If all descendants are also descendants of the surviving spouse and the spouse has no other descendants, the spouse takes the entire estate. Otherwise, the spouse takes a statutory amount + a fraction of the remainder; descendants take the rest per capita at each generation."),
  c("ube-trusts", "Anti-Lapse", "Hard", "MEE", "When does an anti-lapse statute apply?",
    "When a beneficiary predeceases the testator, the gift would normally lapse. The anti-lapse statute saves the gift for the predeceased beneficiary's issue if the beneficiary was within a specified degree of relationship (often grandparent or descendant of grandparent) — unless the will provides otherwise."),
  c("ube-trusts", "Will Contests", "Hard", "MEE", "What must a contestant show to prove undue influence?",
    "(1) Susceptible testator; (2) opportunity to influence; (3) active participation in procuring the will; (4) an unnatural result benefiting the influencer. A confidential relationship plus suspicious circumstances may create a presumption shifting the burden."),
  c("ube-trusts", "Express Trusts", "Medium", "MEE", "State the elements required to create a valid express trust.",
    "(1) Settlor with capacity and intent; (2) trust property (res); (3) ascertainable beneficiary (except charitable/honorary trusts); (4) valid trust purpose (not illegal/against public policy); (5) trustee (court will appoint if missing); (6) compliance with formalities (SOF for trusts of land)."),
  c("ube-trusts", "Trustee Duties", "Hard", "MEE", "Name the principal fiduciary duties of a trustee under the UTC.",
    "Duty of loyalty (no self-dealing), duty of prudence (UPIA prudent investor), duty of impartiality between beneficiaries, duty to inform and account, duty to preserve property, and duty not to delegate (except prudent delegation under UPIA)."),

  // ===== Secured Transactions =====
  c("ube-secured", "Attachment", "Medium", "MEE", "What are the three requirements for a security interest to attach?",
    "(1) Value given by the secured party; (2) debtor has rights in the collateral; (3) authenticated security agreement describing the collateral (or secured party has possession/control pursuant to the agreement)."),
  c("ube-secured", "Perfection", "Medium", "MEE", "What are the principal methods of perfecting a security interest?",
    "Filing a financing statement (default), possession (for tangible collateral), control (deposit accounts, investment property, letter-of-credit rights), and automatic perfection (PMSI in consumer goods, certain assignments)."),
  c("ube-secured", "PMSI", "Hard", "MEE", "State the PMSI super-priority rule in inventory.",
    "A PMSI in inventory has priority over a conflicting prior perfected security interest if: (1) the PMSI is perfected when the debtor receives possession; AND (2) the PMSI holder sends an authenticated notification to the prior secured party before the debtor receives possession (and prior party receives it within 5 years)."),
  c("ube-secured", "Priority", "Medium", "MEE", "What is the general priority rule between two perfected security interests in the same collateral?",
    "First to file or perfect, whichever is earlier (UCC 9-322(a)(1)), provided there is no period between when perfection lapses. Unperfected interests yield to perfected ones; the first to attach prevails between two unperfected interests."),
  c("ube-secured", "Default", "Medium", "MEE", "What are the secured party's rights on default?",
    "Take possession (self-help if no breach of the peace), dispose of collateral in a commercially reasonable manner with notice to the debtor, accept collateral in full or partial satisfaction (strict foreclosure, subject to debtor's right to object), and sue on the debt."),

  // ===== MPT =====
  c("ube-mpt", "Library Rule", "Easy", "MPT", "What is the 'closed universe' rule on the MPT?",
    "All legal authorities you may rely on are contained in the provided Library (cases, statutes, regulations). You may NOT use outside law. Facts come only from the File. Treat the File and Library as complete and self-contained."),
  c("ube-mpt", "Memo Format", "Medium", "MPT", "State the standard structure of an MPT objective office memorandum.",
    "Heading (to/from/date/re), question(s) presented, brief answer(s), statement of facts (objective), discussion (CRAC for each issue: conclusion, rule, application, conclusion), and conclusion. Predict — do not advocate."),
  c("ube-mpt", "Persuasive Brief", "Medium", "MPT", "How does a persuasive brief differ from an objective memo?",
    "Persuasive brief: advocates for the client, uses a one-sided statement of facts (favorable but accurate), point headings as conclusions, and analyzes authority in the most favorable light while distinguishing adverse authority. Objective memo: balanced prediction of the likely outcome."),
  c("ube-mpt", "Time Management", "Easy", "MPT", "What is a recommended time allocation for a 90-minute MPT?",
    "Roughly 45 minutes reading and outlining (File + Library), 45 minutes writing. Read the task memo first, then skim the Library to know what authorities exist, then read the File closely with the issues in mind."),
  c("ube-mpt", "Client Letter", "Medium", "MPT", "What is the tone and structure of an MPT client letter?",
    "Plain-English explanation: identify the client's issue, state the answer, explain the relevant law without jargon, apply it to the client's facts, and recommend next steps. Avoid case citations and Latin terms; be professional and reassuring."),
  c("ube-mpt", "Issue Spotting", "Medium", "MPT", "How are issues identified on the MPT?",
    "The task memo defines the scope. Treat each instruction (e.g. 'analyze whether X', 'address Y and Z') as a separate issue. Use the Library's table of contents as a checklist of authorities and ensure every cited rule is applied to the File's facts."),
];

export const getUbeDeck = (id: string) => UBE_DECKS.find((d) => d.id === id);
export const getUbeCardsByDeck = (deckId: string) =>
  UBE_CARDS.filter((c) => c.deckId === deckId);
