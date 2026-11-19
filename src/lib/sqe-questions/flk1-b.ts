import type { SqeBankQuestion } from "./types";
export const FLK1_B: SqeBankQuestion[] = [
  {
    "id": "sqe1-flk1-con-01",
    "paper": "FLK1",
    "subject": "contract",
    "subtopic": "formation",
    "difficulty": "core",
    "prompt": "Amira emails Ben offering to sell a printing press for £8,000, with acceptance required by email before noon on Friday. At 10 am on Thursday Ben emails asking whether Amira would accept £7,500; he adds that he is merely asking and is not rejecting her offer. Amira does not respond or revoke the offer. At 11 am on Friday Ben emails an unconditional acceptance, which Amira immediately reads. What is the contractual position?",
    "options": [
      "Ben rejected the offer by asking about a lower price.",
      "Ben made a counter-offer which Amira accepted by remaining silent.",
      "A contract arose when Ben’s unconditional acceptance reached Amira.",
      "A contract arose when Ben sent his price enquiry.",
      "No contract arose because Amira had to renew her offer after the enquiry."
    ],
    "correctIndex": 2,
    "explanation": "Ben expressly made an enquiry rather than a counter-offer, so the original offer remained available. His unconditional email acceptance was received within the specified period and concluded the contract.",
    "optionExplanations": [
      "A genuine enquiry does not reject the original offer.",
      "Silence did not accept the enquiry, which was not itself an offer.",
      "The original offer remained open and the timely email acceptance was received.",
      "The enquiry did not express unconditional assent.",
      "An enquiry does not require the offeror to renew an otherwise subsisting offer."
    ],
    "authority": "Stevenson, Jacques & Co v McLean (1880) 5 QBD 346; Entores Ltd v Miles Far East Corporation [1955] 2 QB 327"
  },
  {
    "id": "sqe1-flk1-con-02",
    "paper": "FLK1",
    "subject": "contract",
    "subtopic": "terms",
    "difficulty": "standard",
    "prompt": "Leah hires a cargo vessel from Marine Ltd for two years. A term requires a seaworthy vessel but does not classify the term or specify termination rights. Defects attributable to Marine Ltd cause four weeks of repairs at the outset. The vessel then operates reliably, and Leah retains substantially the whole commercial benefit of the remaining hire. She wants to terminate solely because the seaworthiness term was breached. Which advice is most accurate?",
    "options": [
      "Any breach of a seaworthiness term automatically permits termination.",
      "Leah can terminate only if Marine Ltd deliberately caused the defects.",
      "The short interruption means Leah has no contractual remedy at all.",
      "Every term not expressly classified is necessarily a warranty.",
      "The consequences do not justify termination, although damages may be recoverable."
    ],
    "correctIndex": 4,
    "explanation": "The seaworthiness obligation is an innominate term in this setting. Termination depends on the consequences of breach, and a four-week interruption in a two-year hire does not on these facts substantially deprive Leah of the contractual benefit.",
    "optionExplanations": [
      "Seaworthiness in this setting is not automatically a condition.",
      "Deliberateness is not the test for repudiatory breach of an innominate term.",
      "A non-repudiatory breach can still support damages.",
      "An unclassified term may be innominate rather than a warranty.",
      "The interruption does not substantially deprive Leah of the contract’s benefit."
    ],
    "authority": "Hongkong Fir Shipping Co Ltd v Kawasaki Kisen Kaisha Ltd [1962] 2 QB 26"
  },
  {
    "id": "sqe1-flk1-con-03",
    "paper": "FLK1",
    "subject": "contract",
    "subtopic": "exemption-clauses",
    "difficulty": "core",
    "prompt": "Noah buys a new domestic kettle from a high-street retailer for use at home. A manufacturing defect present on delivery makes the kettle dangerous, and it stops working after ten days. The receipt states that all statutory quality rights are excluded and that the buyer’s only remedy is a repair chosen by the retailer. Noah promptly rejects the kettle and requests his money back. What is his strongest contractual position against the retailer?",
    "options": [
      "He may exercise the short-term right to reject despite the exclusion.",
      "He must accept a repair because the receipt limits his remedies.",
      "He must prove that the retailer negligently manufactured the kettle.",
      "He has rights only against the kettle’s manufacturer.",
      "He may reject only if he purchased an additional guarantee."
    ],
    "correctIndex": 0,
    "explanation": "The kettle was not of satisfactory quality at delivery, and Noah rejects within the normal 30-day short-term rejection period. The retailer cannot exclude that obligation or its associated statutory remedies.",
    "optionExplanations": [
      "The defective kettle breaches the quality obligation and rejection is timely.",
      "The retailer cannot contract out of the relevant statutory consumer rights.",
      "The quality obligation does not depend on the retailer’s negligence.",
      "The seller owes the statutory contractual obligation.",
      "A commercial guarantee is not required for statutory rejection rights."
    ],
    "authority": "Consumer Rights Act 2015, ss 9, 20, 22 and 31"
  },
  {
    "id": "sqe1-flk1-con-04",
    "paper": "FLK1",
    "subject": "contract",
    "subtopic": "exemption-clauses",
    "difficulty": "standard",
    "prompt": "Priya’s engineering company contracts with StoreCo to warehouse components used in its business. StoreCo’s standard written terms exclude all liability for damage caused by its employees’ negligence. The clause was properly incorporated. A careless forklift driver employed by StoreCo destroys the components. No personal injury occurs, and no special statutory exclusion from UCTA applies. StoreCo says incorporation alone makes the clause effective. What is the best advice about its enforceability?",
    "options": [
      "It is automatically void because all negligence exclusions are prohibited.",
      "It is automatically effective because both parties are businesses.",
      "It is enforceable unless Priya proves that it was unreasonable.",
      "It is enforceable only if StoreCo proves that it satisfies the reasonableness requirement.",
      "It is governed exclusively by the Consumer Rights Act 2015 fairness test."
    ],
    "correctIndex": 3,
    "explanation": "UCTA permits exclusion of negligence liability for property damage only insofar as the term satisfies reasonableness. StoreCo, as the party relying on the clause, bears the burden of establishing that requirement; incorporation alone is insufficient.",
    "optionExplanations": [
      "UCTA distinguishes property loss from death or personal injury.",
      "Business status does not remove UCTA’s negligence controls.",
      "The party relying on the clause bears the burden of proving reasonableness.",
      "For this property damage, exclusion requires reasonableness, proved by StoreCo.",
      "The customer is a company buying business services, not a consumer."
    ],
    "authority": "Unfair Contract Terms Act 1977, ss 2(2) and 11(5)"
  },
  {
    "id": "sqe1-flk1-con-05",
    "paper": "FLK1",
    "subject": "contract",
    "subtopic": "vitiating",
    "difficulty": "standard",
    "prompt": "Owen buys a café business from Sian after she states that its annual turnover is £180,000. The statement is false and materially induces the purchase. Sian honestly believed it but had no reasonable grounds for doing so. Owen discovers the truth immediately and also establishes financial loss caused by entering the contract. There is no exclusion clause or bar to rescission. Which statement best describes the burden concerning damages under the Misrepresentation Act 1967?",
    "options": [
      "Owen must prove Sian knew the statement was false.",
      "Sian must prove both reasonable grounds for belief and actual belief in its truth to avoid liability under section 2(1).",
      "Owen must prove that Sian owed him a separate tortious duty of care.",
      "Sian avoids liability under section 2(1) merely by proving honesty.",
      "Owen must elect rescission before he can claim damages under section 2(1)."
    ],
    "correctIndex": 1,
    "explanation": "Sian made a false inducing representation as the other contracting party. Section 2(1) places on her the burden of proving reasonable grounds for, and actual belief in, its truth up to contracting; honest but unreasonable belief does not suffice.",
    "optionExplanations": [
      "Knowledge of falsity is not necessary for section 2(1).",
      "The representor bears this statutory burden and Sian lacks reasonable grounds.",
      "Section 2(1) does not require an independently established negligence duty.",
      "Honesty without reasonable grounds does not satisfy the statutory defence.",
      "A section 2(1) damages claim does not depend on first electing rescission."
    ],
    "authority": "Misrepresentation Act 1967, s 2(1)"
  },
  {
    "id": "sqe1-flk1-con-06",
    "paper": "FLK1",
    "subject": "contract",
    "subtopic": "vitiating",
    "difficulty": "challenging",
    "prompt": "Farah’s bakery has a binding contract for delivery of a replacement oven on Monday at a fixed price. On Sunday the supplier threatens not to deliver unless Farah immediately pays an extra £4,000. It knows that she has prepaid wedding orders and cannot obtain another oven in time. Farah protests, pays, and seeks repayment two days after delivery, when the threat has ended. Which analysis best supports recovery of the additional payment?",
    "options": [
      "Every commercial demand for a higher price is automatically duress.",
      "The variation is void because money can never be consideration.",
      "The supplier’s commercial advantage alone proves undue influence.",
      "Farah’s payment prevents a claim because it conclusively demonstrates free consent.",
      "The threatened breach and absence of a practical alternative support avoidance for economic duress."
    ],
    "correctIndex": 4,
    "explanation": "Threatening a contractual breach to extract an additional payment can constitute illegitimate pressure. The imminent orders, lack of an alternative, protest and prompt challenge strongly support economic duress and recovery after avoiding the variation.",
    "optionExplanations": [
      "Commercial pressure alone is insufficient; illegitimacy and causation matter.",
      "Money may be consideration; that is not the best analysis of this pressure.",
      "Commercial leverage does not itself establish an undue-influence relationship.",
      "Submission to illegitimate pressure is not necessarily freely given consent.",
      "The threatened breach leaves no practical alternative, and Farah challenges promptly."
    ],
    "authority": "Universe Tankships Inc of Monrovia v International Transport Workers Federation [1983] 1 AC 366"
  },
  {
    "id": "sqe1-flk1-con-07",
    "paper": "FLK1",
    "subject": "contract",
    "subtopic": "discharge",
    "difficulty": "challenging",
    "prompt": "Caleb hires a named concert hall from HallCo for a single performance. He pays £6,000 in advance and agrees to pay another £4,000 on the performance date. Before that date, an accidental fire destroys the hall without fault by either party. The contract makes no provision for this event. HallCo proves £1,500 of qualifying expenditure incurred before the fire in preparing to perform. No non-money benefit has been conferred on Caleb. What is the best statement of the financial consequences?",
    "options": [
      "HallCo automatically keeps the whole £6,000 advance.",
      "Caleb must pay the remaining £4,000 despite the fire.",
      "The advance is recoverable, subject to the court’s discretion to allow retention for expenses within the statutory limit; the unpaid balance ceases to be payable.",
      "HallCo automatically keeps £1,500 without any judicial discretion.",
      "Each party must complete performance because accidental destruction never frustrates a contract."
    ],
    "correctIndex": 2,
    "explanation": "The accidental destruction frustrates the contract for this specific hall. Prepayments are recoverable and sums outstanding cease to be payable, but the court may allow HallCo to retain an amount for qualifying expenses, here no more than £1,500.",
    "optionExplanations": [
      "Prepaid sums are in principle recoverable after frustration.",
      "The sum not yet paid ceases to be payable.",
      "This reflects the statutory adjustment and the discretionary expenses allowance.",
      "The expenses allowance is discretionary rather than automatic.",
      "Destruction of the essential named venue can frustrate this contract."
    ],
    "authority": "Taylor v Caldwell (1863) 3 B & S 826; Law Reform (Frustrated Contracts) Act 1943, s 1(2)"
  },
  {
    "id": "sqe1-flk1-con-08",
    "paper": "FLK1",
    "subject": "contract",
    "subtopic": "remedies",
    "difficulty": "standard",
    "prompt": "Marta orders a replacement motor for her workshop’s only cutting machine. She tells the supplier at contracting that the workshop will be idle until delivery. The supplier delivers one week late in breach, causing ordinary lost trading profit and a much larger loss on an unusually lucrative export order. Marta had not mentioned that order or any special profit margin. Both losses are proved and reasonably mitigated. Which loss is most likely recoverable under the contractual remoteness rule?",
    "options": [
      "The ordinary trading profit, but not the undisclosed exceptional export profit.",
      "Both losses automatically, because factual causation is established.",
      "Neither loss, because lost profits are always too remote.",
      "Only the exceptional export profit, because it is the larger loss.",
      "Only losses which the supplier expressly promised to reimburse."
    ],
    "correctIndex": 0,
    "explanation": "The supplier knew that delay would stop ordinary trading, making ordinary lost profits recoverable in principle. The exceptional export profit arose from undisclosed special circumstances and falls outside the reasonable contemplation described in the facts.",
    "optionExplanations": [
      "Ordinary shutdown profit was contemplated; the exceptional bargain was not disclosed.",
      "Factual causation alone does not satisfy contractual remoteness.",
      "Ordinary trading profit can be a foreseeable contractual loss.",
      "The size of a loss does not make it legally recoverable.",
      "An express reimbursement promise is unnecessary for ordinary damages."
    ],
    "authority": "Hadley v Baxendale (1854) 9 Exch 341; Victoria Laundry (Windsor) Ltd v Newman Industries Ltd [1949] 2 KB 528"
  },
  {
    "id": "sqe1-flk1-con-09",
    "paper": "FLK1",
    "subject": "contract",
    "subtopic": "third-parties",
    "difficulty": "challenging",
    "prompt": "Elena contracts with a training provider and pays for a course expressly stated to be supplied for her employee Yusuf’s benefit. The written agreement identifies Yusuf by name, says that he may enforce the training obligation, and contains no exclusion of statutory third-party rights. The provider refuses to train him. Yusuf supplied no consideration and is not a party to the agreement. Which advice best describes his ability to enforce that obligation?",
    "options": [
      "He cannot enforce because only a contracting party can ever sue.",
      "He can enforce only if Elena assigns her contractual rights to him.",
      "He can enforce only if he first reimburses Elena for the course fee.",
      "He can enforce the obligation in his own right under the statutory third-party regime.",
      "He can enforce only after obtaining the provider’s fresh consent following breach."
    ],
    "correctIndex": 3,
    "explanation": "The contract expressly gives Yusuf enforcement rights and identifies him by name. He may enforce under the 1999 Act without having supplied consideration or first taking an assignment.",
    "optionExplanations": [
      "The 1999 Act supplies an exception to privity.",
      "An assignment is unnecessary where the statutory conditions are satisfied.",
      "The third party need not provide consideration to use the statutory right.",
      "The agreement expressly confers enforcement and identifies Yusuf by name.",
      "The existing express provision is sufficient; fresh consent is not required."
    ],
    "authority": "Contracts (Rights of Third Parties) Act 1999, s 1(1)(a), (3) and (5)"
  },
  {
    "id": "sqe1-flk1-tort-01",
    "paper": "FLK1",
    "subject": "tort",
    "subtopic": "negligence",
    "difficulty": "core",
    "prompt": "Police officers arrest a suspected thief on a busy pavement. During the physical arrest they carelessly knock over Asha, a pedestrian standing nearby, breaking her wrist. Asha was not involved in the incident. She alleges that the officers’ positive conduct foreseeably caused her injury, rather than that they failed to protect her from the suspect. The police argue that operational policing can never create a negligence duty. Which statement best addresses that argument?",
    "options": [
      "The police are immune from all negligence claims arising during arrests.",
      "Ordinary negligence principles can impose a duty concerning injury caused by the officers’ positive conduct.",
      "Asha must establish a special assumption of responsibility before any duty can arise.",
      "A duty arises only if an officer intended to injure Asha.",
      "Every police duty must be established by applying a novel three-stage test from scratch."
    ],
    "correctIndex": 1,
    "explanation": "The police are generally subject to ordinary negligence principles for positive acts causing physical injury. Asha’s case is not merely a complaint that the police failed to prevent harm by a third party.",
    "optionExplanations": [
      "There is no general police immunity of that kind.",
      "This is a positive act causing foreseeable physical injury within ordinary negligence principles.",
      "Assumption of responsibility is not necessary for this positive-act case.",
      "Negligence liability does not require an intention to injure.",
      "Established negligence principles apply without treating every claim as novel."
    ],
    "authority": "Robinson v Chief Constable of West Yorkshire Police [2018] UKSC 4"
  },
  {
    "id": "sqe1-flk1-tort-02",
    "paper": "FLK1",
    "subject": "tort",
    "subtopic": "negligence",
    "difficulty": "standard",
    "prompt": "Daniel attends hospital with severe symptoms after exposure to a toxic substance at work. A doctor negligently fails to examine him and sends him home. He dies later that night. Unchallenged expert evidence establishes that competent examination and all available treatment would not have prevented or delayed his death. The hospital also alleges that Daniel carelessly ignored workplace safety instructions. His estate sues the hospital for his death. Which issue is decisive for that claim on these facts?",
    "options": [
      "Breach alone establishes liability for the death.",
      "The hospital must disprove every possible causal connection beyond reasonable doubt.",
      "The estate must receive reduced damages solely because the hospital alleges contributory negligence.",
      "The death claim fails because the negligent omission did not cause the death.",
      "The hospital is liable because its doctor was the last professional to see Daniel."
    ],
    "correctIndex": 3,
    "explanation": "The estate must show that the breach caused the death. Because Daniel would have died at the same time even with proper care, the claim fails the ordinary but-for test despite the doctor’s breach. Contributory negligence concerns apportionment of responsibility for actionable damage; it does not cure the estate’s failure to prove causation.",
    "optionExplanations": [
      "Duty and breach do not dispense with causation.",
      "The civil causation inquiry is not governed by the criminal standard.",
      "An allegation of contributory negligence cannot replace proof of causation or itself establish a reduction.",
      "Competent care would not have altered the fatal outcome, so factual causation fails.",
      "Chronological proximity does not establish factual causation."
    ],
    "authority": "Barnett v Chelsea and Kensington Hospital Management Committee [1969] 1 QB 428; Law Reform (Contributory Negligence) Act 1945, s 1(1)"
  },
  {
    "id": "sqe1-flk1-tort-03",
    "paper": "FLK1",
    "subject": "tort",
    "subtopic": "psych-economic",
    "difficulty": "challenging",
    "prompt": "Grace’s husband dies during a sudden medical collapse in hospital. She witnesses it and develops a recognised psychiatric illness. His collapse was the manifestation of a disease which the hospital negligently failed to diagnose months earlier. Grace was never endangered, and there was no separate accident caused by the hospital’s negligence. She claims solely as a secondary victim of the failure to diagnose. Which statement best reflects the applicable duty principles?",
    "options": [
      "Marriage alone establishes the hospital’s duty for her psychiatric injury.",
      "Witnessing any death caused by negligence satisfies the secondary-victim requirements.",
      "Her recognised illness automatically makes her a primary victim.",
      "The passage of months is irrelevant because all clinical negligence is a continuing accident.",
      "The hospital does not owe the alleged secondary-victim duty merely because she witnessed the disease-related collapse."
    ],
    "correctIndex": 4,
    "explanation": "Grace is not a primary victim, and her husband’s collapse from disease is not a qualifying accident merely because earlier negligent treatment caused the outcome. The Supreme Court rejected the alleged secondary-victim duty in this type of failure-to-diagnose case.",
    "optionExplanations": [
      "A close relationship alone does not satisfy all secondary-victim requirements.",
      "A disease-related medical crisis is not automatically a qualifying accident.",
      "A psychiatric diagnosis does not make an unendangered witness a primary victim.",
      "The earlier failure to diagnose is not transformed into a continuing accident.",
      "The facts fall within the medical-crisis distinction established by the Supreme Court."
    ],
    "authority": "Paul v Royal Wolverhampton NHS Trust [2024] UKSC 1"
  },
  {
    "id": "sqe1-flk1-tort-04",
    "paper": "FLK1",
    "subject": "tort",
    "subtopic": "psych-economic",
    "difficulty": "standard",
    "prompt": "Ravi’s accountancy firm prepares a written cash-flow assessment for his client, Cedar Ltd. With Cedar’s permission, Ravi sends it directly to lender Nora for the expressly stated purpose of deciding whether to make a particular short-term loan. He knows Nora will rely on it without commissioning another report. There is no disclaimer. The assessment is negligently prepared, and reasonable reliance causes Nora financial loss. Which is the strongest basis for a negligence duty?",
    "options": [
      "Ravi assumed responsibility to an identified recipient for the known lending purpose.",
      "Every accountant owes all members of the public a duty for any financial statement.",
      "Nora must first prove physical damage before pure economic loss is recoverable.",
      "Only Cedar can ever sue because it paid Ravi’s fee.",
      "Nora can establish a duty only by proving that Ravi acted fraudulently."
    ],
    "correctIndex": 0,
    "explanation": "Ravi supplies advice directly to an identified lender for a specific known transaction, expecting reliance. Those facts support an assumption of responsibility and a duty concerning the resulting pure economic loss.",
    "optionExplanations": [
      "Direct supply for a known transaction supports an assumption of responsibility and reasonable reliance.",
      "There is no unlimited duty to the investing or lending public.",
      "Negligent advice can exceptionally support recovery of pure economic loss without physical damage.",
      "Payment by another client does not preclude responsibility to Nora.",
      "A negligent-misstatement claim does not require fraud."
    ],
    "authority": "Hedley Byrne & Co Ltd v Heller & Partners Ltd [1964] AC 465"
  },
  {
    "id": "sqe1-flk1-tort-05",
    "paper": "FLK1",
    "subject": "tort",
    "subtopic": "occupiers",
    "difficulty": "core",
    "prompt": "Imogen visits a furniture showroom during opening hours to buy a chair. Staff have just washed a smooth tiled aisle but leave it wet without a warning sign or barrier. Imogen walks normally along the designated customer route, slips and is injured. The showroom operator controls the premises and knew customers would use that aisle. There is no exclusion clause. Which statement best identifies the operator’s duty to Imogen?",
    "options": [
      "It must insure her against every injury occurring anywhere on the premises.",
      "It owes no duty because she had not yet bought anything.",
      "It must take reasonable care to see that she is reasonably safe in using the premises for the permitted purpose.",
      "It owes only a duty not to deliberately injure her.",
      "It owes the lower duty applicable exclusively to trespassers."
    ],
    "correctIndex": 2,
    "explanation": "Imogen is a lawful visitor using the showroom for its permitted purpose. The operator owes the statutory common duty of reasonable care, and leaving a newly washed aisle unguarded and unmarked strongly indicates breach.",
    "optionExplanations": [
      "The statutory duty is reasonable care, not absolute insurance.",
      "An invited customer is a lawful visitor before making a purchase.",
      "This is the common duty owed to this lawful visitor.",
      "The duty extends beyond avoiding deliberate injury.",
      "Imogen is using an authorised customer route as a visitor."
    ],
    "authority": "Occupiers’ Liability Act 1957, s 2(2)"
  },
  {
    "id": "sqe1-flk1-tort-06",
    "paper": "FLK1",
    "subject": "tort",
    "subtopic": "occupiers",
    "difficulty": "challenging",
    "prompt": "Tom controls a disused quarry containing a deep, concealed inspection shaft beside a well-worn path. He knows local teenagers regularly trespass along that path at dusk, and reasonably expects them there that evening. A teenager, Milo, falls into the shaft and suffers injury. There is no warning or barrier, although inexpensive fencing could readily protect against the concealed danger. Which statement best explains whether Tom can owe Milo a statutory duty?",
    "options": [
      "Trespasser status necessarily excludes any duty concerning the shaft.",
      "A duty can arise because Tom knows the danger, anticipates trespassers nearby and may reasonably be expected to offer protection.",
      "A duty arises only if Tom expressly invited Milo onto the land.",
      "A duty arises only if Tom personally dug the shaft.",
      "A duty automatically requires Tom to compensate Milo for any damaged clothing."
    ],
    "correctIndex": 1,
    "explanation": "Tom knows about the concealed shaft and has reasonable grounds to anticipate trespassers in its vicinity. Given the serious hidden danger and easy protective measures, the statutory conditions for a duty are met; the Act protects against personal injury, not property loss.",
    "optionExplanations": [
      "The 1984 Act can impose duties to persons other than visitors.",
      "All three statutory threshold conditions are supported by these facts.",
      "An express invitation would concern visitor status, not the basis of this duty.",
      "Creation of the danger is not a necessary statutory threshold.",
      "The statutory duty does not extend to loss of or damage to property."
    ],
    "authority": "Occupiers’ Liability Act 1984, ss 1(3), 1(4) and 1(8)"
  },
  {
    "id": "sqe1-flk1-tort-07",
    "paper": "FLK1",
    "subject": "tort",
    "subtopic": "nuisance-rylands",
    "difficulty": "standard",
    "prompt": "Harriet owns and lives in a house next to a metalworking business. Its new night-time machinery regularly causes substantial noise and vibration that interfere with ordinary sleep in the locality. The operator relies solely on a recent planning permission allowing industrial use and points out that Harriet bought her house after the business began operating. No statute authorises the nuisance. Which advice best addresses those two arguments as defences to her private nuisance claim?",
    "options": [
      "Planning permission always authorises any resulting nuisance.",
      "Buying after the business began automatically bars the claim.",
      "Harriet must prove physical damage to her house before she can sue.",
      "Both arguments necessarily defeat the claim when taken together.",
      "Neither planning permission alone nor coming to the nuisance is a complete defence."
    ],
    "correctIndex": 4,
    "explanation": "As the owner in occupation, Harriet can complain of substantial interference with ordinary residential amenity. Planning permission is not itself statutory authority for a nuisance, and moving to an existing nuisance does not by itself bar the claim.",
    "optionExplanations": [
      "Planning permission does not by itself authorise a private nuisance.",
      "Coming to the nuisance is not itself a defence.",
      "Substantial interference with ordinary amenity can suffice.",
      "Combining these arguments does not create an automatic defence.",
      "Neither asserted fact alone extinguishes Harriet’s private nuisance rights."
    ],
    "authority": "Coventry v Lawrence [2014] UKSC 13"
  },
  {
    "id": "sqe1-flk1-tort-08",
    "paper": "FLK1",
    "subject": "tort",
    "subtopic": "vicarious",
    "difficulty": "standard",
    "prompt": "BrightBank requires job applicants, including Lewis, to attend medical examinations by Dr Shaw. Shaw runs an independent practice, treats many other clients, arranges his own work, can refuse referrals and is paid separately for each examination. He is not employed by BrightBank. Lewis alleges that Shaw committed a tort during the examination and seeks to make the bank vicariously liable solely for that tort. No direct negligence by the bank is alleged. Which conclusion is most likely?",
    "options": [
      "The bank is liable merely because it required the examination.",
      "The bank is liable because every contractor is treated as an employee.",
      "The bank is liable whenever the tort occurred during work that benefited it.",
      "The bank is not vicariously liable because Shaw was carrying on an independent business.",
      "The bank is liable unless Lewis had personally selected Shaw."
    ],
    "correctIndex": 3,
    "explanation": "The first stage asks whether the relationship is employment or sufficiently akin to employment. Shaw is conducting an independent medical business on his own account, so the necessary relationship with BrightBank is absent.",
    "optionExplanations": [
      "Requiring the examination does not alone create the necessary relationship.",
      "A genuine independent contractor is not automatically assimilated to an employee.",
      "Benefit to the defendant is insufficient without the necessary relationship.",
      "Shaw’s independent practice indicates a contractor carrying on business on his own account.",
      "The claimant’s choice of practitioner does not determine the relationship test."
    ],
    "authority": "Barclays Bank plc v Various Claimants [2020] UKSC 13"
  },
  {
    "id": "sqe1-flk1-tort-09",
    "paper": "FLK1",
    "subject": "tort",
    "subtopic": "product-liability",
    "difficulty": "challenging",
    "prompt": "Beth buys a defective electric heater for her home. It catches fire because its safety is below what persons generally are entitled to expect. The fire causes £600 damage to her privately used sofa and £200 damage to a privately used rug; the heater itself, worth £90, is destroyed. She proves causation and sues the producer under the Consumer Protection Act 1987. No statutory defence applies. Which describes the property damage recoverable under that Act?",
    "options": [
      "The full £800 damage to the sofa and rug, but not the heater’s own £90 value.",
      "Only £525, after deducting £275 from the damage to the sofa and rug.",
      "All £890, including the value of the defective heater itself.",
      "Only the £600 sofa damage, because each damaged item must exceed £275.",
      "Nothing, because she cannot prove that the producer was negligent."
    ],
    "correctIndex": 0,
    "explanation": "The sofa and rug are qualifying private property, and their aggregate damage exceeds the £275 threshold. That threshold is not a deductible excess, but the Act does not compensate for damage to the defective heater itself.",
    "optionExplanations": [
      "The qualifying aggregate property damage exceeds £275, and the defective product itself is excluded.",
      "The £275 rule is a threshold, not an excess to deduct.",
      "The Act excludes damage to the defective product itself.",
      "The threshold applies to the aggregate qualifying property damage, not each item separately.",
      "Liability under the Act does not require proof of producer negligence."
    ],
    "authority": "Consumer Protection Act 1987, ss 2(1), 3(1) and 5(2)–(4)"
  },
  {
    "id": "sqe1-flk1-cpl-01",
    "paper": "FLK1",
    "subject": "constitutional",
    "subtopic": "sovereignty",
    "difficulty": "core",
    "prompt": "Nadia challenges a tax assessment imposed by an unambiguous provision of a recent Act of the UK Parliament. All parties accept that Parliament enacted it using the proper procedure. Nadia argues only that the tax is unfair and contrary to a promise made in a government manifesto. No Convention right, devolution issue or question of interpretation arises. She asks the High Court to invalidate the provision for those reasons. Which response best reflects parliamentary sovereignty?",
    "options": [
      "The court must invalidate any Act inconsistent with a manifesto.",
      "The court cannot invalidate this primary legislation merely because it considers it unfair or contrary to a manifesto promise.",
      "The court may repeal the provision if a majority of judges oppose it.",
      "The manifesto has superior legal status to the Act.",
      "The Act requires subsequent judicial approval before it can impose tax."
    ],
    "correctIndex": 1,
    "explanation": "The court must apply the unambiguous Act on these facts. Political unfairness or inconsistency with a manifesto does not create a general judicial power to invalidate primary legislation.",
    "optionExplanations": [
      "A manifesto does not impose this judicially enforceable limit on primary legislation.",
      "The stated objections supply no power to invalidate a duly enacted Act.",
      "Judges do not possess a general power to repeal Acts on policy grounds.",
      "A manifesto does not outrank an Act of Parliament.",
      "Duly enacted legislation does not require this form of judicial approval."
    ],
    "authority": "British Railways Board v Pickin [1974] AC 765"
  },
  {
    "id": "sqe1-flk1-cpl-02",
    "paper": "FLK1",
    "subject": "constitutional",
    "subtopic": "separation",
    "difficulty": "standard",
    "prompt": "A statute creates a comprehensive scheme for requisitioning privately owned warehouses during an emergency and gives affected owners compensation. During an emergency the minister takes control of Isaac’s warehouse but claims to act solely under an older prerogative power, thereby avoiding the statutory compensation provisions. The requisition falls squarely within the subject matter and circumstances covered by the statute. Isaac challenges that approach. Which statement most accurately describes the relationship between the statute and the prerogative?",
    "options": [
      "The prerogative always overrides legislation during an emergency.",
      "The minister may choose whichever source of power costs the government less.",
      "The statutory scheme displaces reliance on the prerogative in the area it covers.",
      "The statute is invalid unless it expressly abolishes every related prerogative power.",
      "Compensation is unavailable because prerogative powers can never be reviewed."
    ],
    "correctIndex": 2,
    "explanation": "Where legislation covers the relevant ground, the executive cannot use an overlapping prerogative to evade statutory conditions. Isaac’s requisition falls within the statutory scheme, including its compensation protection.",
    "optionExplanations": [
      "An emergency does not itself authorise the executive to override this statute.",
      "The executive cannot avoid statutory safeguards by choosing an overlapping prerogative.",
      "The minister must act within the statutory regime rather than evade its compensation requirement.",
      "Displacement does not invariably require express abolition of the prerogative.",
      "The legal existence and scope of prerogative powers are reviewable."
    ],
    "authority": "Attorney General v De Keyser’s Royal Hotel Ltd [1920] AC 508"
  },
  {
    "id": "sqe1-flk1-cpl-03",
    "paper": "FLK1",
    "subject": "constitutional",
    "subtopic": "judicial-review",
    "difficulty": "standard",
    "prompt": "A licensing statute gives a council discretion to waive a particular application fee where circumstances justify it. Its published policy says waivers will never be granted, without exception. When Rosa submits compelling evidence of hardship, the officer refuses even to consider it, explaining that the policy leaves no room to assess individual cases. The statute contains no provision authorising an absolute ban on waivers. Which judicial review ground most directly addresses the council’s approach?",
    "options": [
      "Unlawful fettering of statutory discretion.",
      "A free-standing right to have all public fees abolished.",
      "Automatic bias because an officer applied council policy.",
      "A mandatory requirement to decide every application without any policy.",
      "A contractual breach arising simply from publication of the policy."
    ],
    "correctIndex": 0,
    "explanation": "A public body may adopt a policy to structure its discretion but must remain willing to consider exceptions. The absolute refusal to consider Rosa’s circumstances unlawfully fetters the statutory waiver power.",
    "optionExplanations": [
      "The council has closed its mind to exercising the discretion Parliament conferred.",
      "The facts establish no right to universal abolition of fees.",
      "Application of policy does not itself demonstrate bias.",
      "A lawful policy is permissible if exceptional cases remain genuinely open for consideration.",
      "Publication alone does not establish a contract with Rosa."
    ],
    "authority": "British Oxygen Co Ltd v Board of Trade [1971] AC 610"
  },
  {
    "id": "sqe1-flk1-cpl-04",
    "paper": "FLK1",
    "subject": "constitutional",
    "subtopic": "judicial-review",
    "difficulty": "core",
    "prompt": "Jamal receives a local authority decision refusing him a discretionary grant. It is an ordinary administrative decision, not a planning decision or a public procurement decision, and no special statutory time limit applies. He wants to bring judicial review and asks whether he can safely wait until the end of three months while his solicitor exchanges pre-action letters. No extension has been agreed by the court. Which statement correctly describes the ordinary filing deadline?",
    "options": [
      "He always has six months from receiving the decision.",
      "He may file at any time if pre-action correspondence is continuing.",
      "He has an unconditional right to wait three months before filing.",
      "The parties may extend the judicial review filing period by private agreement.",
      "He must file promptly and in any event no later than three months after the grounds first arose."
    ],
    "correctIndex": 4,
    "explanation": "The claim form must be filed promptly and normally no later than three months after the grounds first arose. Continuing pre-action correspondence does not stop time, and the parties cannot extend the Part 54 time limit by agreement.",
    "optionExplanations": [
      "The ordinary Part 54 outer limit is three months, not six.",
      "Pre-action correspondence does not suspend the filing requirement.",
      "Promptness is a separate requirement within the three-month outer limit.",
      "The parties cannot extend this time limit by agreement.",
      "Both promptness and the ordinary three-month outer limit apply."
    ],
    "authority": "Civil Procedure Rules, r 54.5(1)–(2)"
  },
  {
    "id": "sqe1-flk1-cpl-05",
    "paper": "FLK1",
    "subject": "constitutional",
    "subtopic": "judicial-review",
    "difficulty": "challenging",
    "prompt": "A department unlawfully fails to consult Ellis before refusing his application for a public grant. He has sufficient interest and applies for judicial review in time. At the permission stage, incontrovertible evidence shows that a mandatory statutory eligibility condition excludes him and that consultation could not have altered that fact. It is highly likely that the outcome for Ellis would not have been substantially different. No exceptional public interest justifies proceeding. What must the High Court do on this basis?",
    "options": [
      "Grant permission automatically because a procedural error occurred.",
      "Grant permission because only standing can be considered at that stage.",
      "Award damages automatically instead of considering permission.",
      "Refuse permission under the statutory no-substantial-difference test.",
      "Treat the failure to consult as proof that Ellis satisfied the eligibility condition."
    ],
    "correctIndex": 3,
    "explanation": "The court must refuse permission where it appears highly likely that the applicant’s outcome would not have been substantially different without the complained-of conduct. Although an exceptional-public-interest exception exists, the facts expressly exclude it.",
    "optionExplanations": [
      "The statutory permission filter applies despite the established procedural error.",
      "Section 31 includes this additional mandatory permission consideration.",
      "Public-law unlawfulness does not automatically create a damages entitlement.",
      "The statutory threshold is met and no exceptional public interest exception applies.",
      "A procedural breach cannot establish substantive statutory eligibility."
    ],
    "authority": "Senior Courts Act 1981, s 31(3C)–(3F)"
  },
  {
    "id": "sqe1-flk1-cpl-06",
    "paper": "FLK1",
    "subject": "constitutional",
    "subtopic": "human-rights",
    "difficulty": "standard",
    "prompt": "An Act uses general language when defining who may succeed to a tenancy after a tenant’s death. Priya argues that applying it to exclude her solely because she was the deceased’s same-sex partner would violate her Convention rights. On the assumed facts, an inclusive reading is possible without contradicting any fundamental feature of the statutory scheme. She asks whether the court must wait for Parliament to amend the Act. Which statement best describes the court’s interpretative duty?",
    "options": [
      "It may use a compatible interpretation only if the statutory words are ambiguous.",
      "So far as possible, it must read and give effect to the provision compatibly with Convention rights.",
      "It must always strike down the Act if the ordinary reading is incompatible.",
      "It may disregard all fundamental features of the statutory scheme to secure compatibility.",
      "It can interpret compatibly only if the Act was enacted after 1998."
    ],
    "correctIndex": 1,
    "explanation": "Section 3 requires a Convention-compatible reading so far as possible and is not restricted to ambiguous wording. Because an inclusive reading does not contradict a fundamental feature of the scheme, the court need not wait for an amendment.",
    "optionExplanations": [
      "Section 3 is not confined to cases of linguistic ambiguity.",
      "A compatible reading is required where possible, as the facts assume here.",
      "Section 3 is an interpretative duty, not a power to invalidate primary legislation.",
      "Interpretation cannot contradict a fundamental feature of the legislation.",
      "Section 3 applies to legislation whenever enacted."
    ],
    "authority": "Human Rights Act 1998, s 3; Ghaidan v Godin-Mendoza [2004] UKHL 30"
  },
  {
    "id": "sqe1-flk1-cpl-07",
    "paper": "FLK1",
    "subject": "constitutional",
    "subtopic": "human-rights",
    "difficulty": "challenging",
    "prompt": "A recent Act expressly requires a public authority to refuse Theo a benefit in circumstances that violate his Convention rights. The High Court concludes that no compatible interpretation is possible and makes a declaration of incompatibility. The authority has no discretion: primary legislation requires the refusal and it could not have acted differently. Theo argues that the declaration immediately invalidates the provision and automatically makes the authority’s refusal unlawful under section 6. Which statement is correct?",
    "options": [
      "The declaration invalidates the provision from the date of judgment.",
      "The declaration automatically suspends the authority’s statutory duty.",
      "The provision remains effective, and section 6’s primary-legislation exception applies to the compelled refusal.",
      "Every incompatible act of a public authority is unlawful without statutory exception.",
      "The High Court must itself rewrite the provision after making the declaration."
    ],
    "correctIndex": 2,
    "explanation": "A declaration of incompatibility does not affect the validity, continuing operation or enforcement of the provision. Because primary legislation left the authority unable to act differently, the section 6(2)(a) exception applies to the compelled refusal.",
    "optionExplanations": [
      "A declaration does not invalidate primary legislation.",
      "The declaration does not suspend the statutory requirement.",
      "Section 4 preserves validity and section 6(2)(a) covers an authority unable to act differently.",
      "Section 6 expressly provides exceptions involving primary legislation.",
      "A declaration does not confer a legislative rewriting power."
    ],
    "authority": "Human Rights Act 1998, ss 4(6) and 6(2)(a)"
  },
  {
    "id": "sqe1-flk1-eth-04",
    "paper": "FLK1",
    "subject": "ethics",
    "subtopic": "sra-principles",
    "difficulty": "core",
    "prompt": "Solicitor Amina personally gives another firm a clear professional undertaking to send an original signed document by Friday. She holds the document and can readily send it. On Thursday her client changes his mind and instructs her not to send it because withholding it may improve his negotiating position. The recipient has not released Amina from the undertaking. No court order or legal prohibition prevents performance. What should Amina do?",
    "options": [
      "Perform the undertaking within the agreed time despite the client’s changed instructions.",
      "Treat the client’s new instructions as automatically cancelling the undertaking.",
      "Withhold the document unless the recipient proves financial loss.",
      "Ignore the undertaking because it was not separately supported by consideration.",
      "Replace the undertaking unilaterally with a promise to discuss delivery later."
    ],
    "correctIndex": 0,
    "explanation": "Amina must perform her undertaking within the agreed timescale. Her client’s tactical change of mind neither releases her nor justifies non-performance.",
    "optionExplanations": [
      "The professional duty to perform is not displaced by these changed instructions.",
      "The client cannot unilaterally release Amina from her undertaking.",
      "Performance is required without waiting for proof of loss.",
      "The regulatory obligation does not depend on contractual consideration.",
      "Amina cannot unilaterally substitute a different obligation."
    ],
    "authority": "SRA Code of Conduct for Solicitors, RELs and RFLs, para 1.3"
  },
  {
    "id": "sqe1-flk1-eth-05",
    "paper": "FLK1",
    "subject": "ethics",
    "subtopic": "conflicts",
    "difficulty": "standard",
    "prompt": "Solicitor Ben is asked to represent both a supplier and its customer in a dispute over whether goods met the contractual specification. Each wants Ben to secure the largest possible payment from the other. There is no substantially common interest and they are not competing for the same objective. Both offer written consent, suggest information barriers and say separate representation would be expensive. What should Ben do about acting for both in this dispute?",
    "options": [
      "Act because written consent always cures a client conflict.",
      "Act because information barriers alone permit all adverse retainers.",
      "Act because saving clients money overrides the conflict rule.",
      "Act if he promises to divide his time equally between the clients.",
      "Decline to act for both because a client conflict exists and neither permitted exception applies."
    ],
    "correctIndex": 4,
    "explanation": "Ben would owe incompatible duties to clients on opposite sides of the same dispute. Consent and safeguards cannot justify acting where neither the substantially-common-interest nor competing-for-the-same-objective exception applies.",
    "optionExplanations": [
      "Informed consent alone is insufficient outside a permitted exception.",
      "Information barriers do not alone authorise this directly adverse representation.",
      "Cost savings do not override the prohibition.",
      "Equal time allocation does not remove the substantive conflict.",
      "The parties’ directly opposed interests fall outside both stated exceptions."
    ],
    "authority": "SRA Code of Conduct for Solicitors, RELs and RFLs, para 6.2"
  },
  {
    "id": "sqe1-flk1-eth-06",
    "paper": "FLK1",
    "subject": "ethics",
    "subtopic": "conflicts",
    "difficulty": "standard",
    "prompt": "Clara’s former client, a manufacturer, gave her confidential details of an undisclosed product defect. A consumer now asks Clara to sue that manufacturer over the same defect. The information is material to the new claim. The former client refuses consent to disclosure or use. Clara would handle the claim personally and knows she cannot avoid using the information; no effective measures can eliminate the real risk of disclosure. What is the appropriate course?",
    "options": [
      "Accept because confidentiality ends when the former retainer ends.",
      "Decline because she holds material confidential information of an adverse former client and no exception is available.",
      "Accept and disclose the information because it would help the consumer.",
      "Accept because the consumer’s consent alone releases the former client’s confidentiality.",
      "Accept but promise the consumer that professional duties will not affect her advice."
    ],
    "correctIndex": 1,
    "explanation": "Clara must preserve the former client’s confidential information after the retainer ends. She cannot act against that client where the information is material and neither effective protective measures nor the former client’s informed written consent is available.",
    "optionExplanations": [
      "The confidentiality duty continues after the retainer.",
      "The adverse-interest restriction applies and neither relevant exception is available.",
      "The new client’s interests do not authorise disclosure of the former client’s confidence.",
      "Only the relevant former client could give the necessary informed written consent.",
      "A promise cannot remove the conflicting confidentiality and disclosure duties."
    ],
    "authority": "SRA Code of Conduct for Solicitors, RELs and RFLs, paras 6.3 and 6.5"
  },
  {
    "id": "sqe1-flk1-eth-07",
    "paper": "FLK1",
    "subject": "ethics",
    "subtopic": "sra-principles",
    "difficulty": "standard",
    "prompt": "Dev, a newly qualified solicitor who has handled only routine debt claims, is asked to conduct a complex professional negligence action involving unfamiliar expert evidence. The trial is imminent. He recognises that he lacks the necessary skills, and the firm cannot provide suitable supervision or obtain specialist assistance in time. The client wants him to continue because his hourly rate is low and offers to sign a disclaimer accepting his inexperience. What should Dev do?",
    "options": [
      "Continue because a disclaimer removes the competence obligation.",
      "Continue because low fees justify a lower professional standard.",
      "Continue and learn the subject after the trial has started.",
      "Explain the competence problem and arrange an appropriate transfer without prejudicing the client.",
      "Continue provided he does not guarantee a successful outcome."
    ],
    "correctIndex": 3,
    "explanation": "Dev must ensure that the service he provides is competent and timely. With no realistic route to acquiring the necessary competence or support in time, he should explain the position and facilitate an appropriate transfer while protecting the client’s interests.",
    "optionExplanations": [
      "The client cannot waive the regulatory requirement of competent service in this way.",
      "A discounted fee does not excuse incompetent service.",
      "The imminent trial makes unsupported learning an inadequate response.",
      "He must address the inability to provide competent service and protect the client in any transfer.",
      "Avoiding a guarantee does not resolve the identified lack of competence."
    ],
    "authority": "SRA Code of Conduct for Solicitors, RELs and RFLs, para 3.2"
  },
  {
    "id": "sqe1-flk1-eth-08",
    "paper": "FLK1",
    "subject": "ethics",
    "subtopic": "regulation",
    "difficulty": "core",
    "prompt": "Solicitor Esme gives client Luis an initial estimate for defending a contract claim. Unexpected expert evidence later makes a substantial increase in overall costs likely. Esme identifies the increase well before the next major stage of work, but Luis has not asked for an update and the original letter said the estimate was not a fixed fee. She considers waiting until the final invoice to mention the increase. What is her obligation concerning cost information?",
    "options": [
      "She may wait until the final bill because the estimate was not fixed.",
      "She must update only if Luis specifically requests a revised estimate.",
      "She should give Luis the best possible information about the likely overall cost as the matter progresses, including the material change now.",
      "She must charge the original estimate regardless of the retainer’s terms.",
      "She may replace cost information with a statement that litigation is unpredictable."
    ],
    "correctIndex": 2,
    "explanation": "Esme must provide the best possible information about pricing and likely overall cost at engagement and, when appropriate, as the matter progresses. The substantial foreseeable increase requires an update now rather than a surprise in the final invoice.",
    "optionExplanations": [
      "A non-fixed estimate does not remove the ongoing information duty.",
      "The duty does not depend on a client request.",
      "A material known change calls for a timely costs update during the matter.",
      "The regulatory information duty does not itself convert an estimate into a fixed fee.",
      "General uncertainty is no substitute for the best possible cost information."
    ],
    "authority": "SRA Code of Conduct for Solicitors, RELs and RFLs, para 8.7"
  }
];
