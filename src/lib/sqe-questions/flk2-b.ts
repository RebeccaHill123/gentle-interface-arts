import type { SqeBankQuestion } from "./types";
export const FLK2_B: SqeBankQuestion[] = [
  {
    "id": "sqe1-flk2-tru-01",
    "paper": "FLK2",
    "subject": "trusts",
    "subtopic": "express-trusts",
    "difficulty": "core",
    "prompt": "Nadia signs a document declaring that she holds her entire identified holding of 2,000 ordinary shares in Trent Ltd on trust for her niece, Leila, absolutely. The shares remain registered in Nadia’s name. The document specifies the company, class and number of shares, and Leila is alive and identified by full name. Nadia later argues that the arrangement fails because she never transferred the shares to Leila. Which statement best describes the position?",
    "options": [
      "No trust exists because Leila has not provided consideration.",
      "No trust exists until the shares are registered in Leila’s name.",
      "A valid trust exists because the three certainties are present and Nadia has declared herself trustee.",
      "The trust fails because shares cannot be trust property.",
      "The document creates only a moral obligation because Nadia retains legal title."
    ],
    "correctIndex": 2,
    "explanation": "The declaration establishes certainty of intention, subject matter and objects. Nadia constitutes the trust by declaring herself trustee, so she need not transfer legal title to Leila.",
    "optionExplanations": [
      "A fully constituted voluntary trust does not require consideration.",
      "A self-declaration leaves legal title in the trustee’s name.",
      "The imperative declaration identifies both the property and the beneficiary; no transfer to another trustee is necessary.",
      "Identified shares are capable of being trust property.",
      "Retention of legal title is consistent with an effective self-declaration of trust."
    ],
    "authority": "Knight v Knight (1840) 3 Beav 148; Milroy v Lord (1862) 4 De GF & J 264."
  },
  {
    "id": "sqe1-flk2-tru-02",
    "paper": "FLK2",
    "subject": "trusts",
    "subtopic": "express-trusts",
    "difficulty": "standard",
    "prompt": "Owen orally declares that he holds his registered cottage on trust for Priya absolutely. Six months later he signs a letter to Priya which clearly identifies the cottage, records the earlier declaration and confirms its terms. Owen has remained the registered proprietor throughout and no third-party rights have intervened. Priya asks whether the absence of writing when Owen first spoke prevents her enforcing the trust. Which advice is most accurate?",
    "options": [
      "The signed letter can evidence the earlier declaration and make the land trust enforceable.",
      "The trust is void because every declaration of a land trust must itself be made by deed.",
      "The letter is ineffective because only Priya can sign evidence of the trust.",
      "The trust becomes enforceable only when Priya is registered as proprietor.",
      "The letter must be signed by two independent witnesses to be effective."
    ],
    "correctIndex": 0,
    "explanation": "A trust of land must be manifested and proved by signed writing by a person able to declare it. Owen’s later signed letter supplies evidence of the earlier oral declaration; writing need not coincide with that declaration.",
    "optionExplanations": [
      "Section 53(1)(b) requires signed evidence, not necessarily a contemporaneous written declaration.",
      "A deed is not the requirement for a self-declaration under section 53(1)(b).",
      "Owen is the person able to declare this trust and can sign the evidence.",
      "An equitable trust can exist while the trustee remains registered proprietor.",
      "Section 53(1)(b) does not impose that witnessing requirement."
    ],
    "authority": "Law of Property Act 1925, s 53(1)(b)."
  },
  {
    "id": "sqe1-flk2-tru-03",
    "paper": "FLK2",
    "subject": "trusts",
    "subtopic": "express-trusts",
    "difficulty": "standard",
    "prompt": "Clara is absolutely entitled to a beneficial interest under an existing trust of shares. At a meeting she orally directs the trustees to hold that interest for her brother, Ben, instead. The trustees agree, but legal title remains with them and neither Clara nor an authorised agent signs anything. This is not a contract for value, and no constructive trust or other exception arises. Ben asks whether the oral direction has disposed of Clara’s equitable interest. What is the best answer?",
    "options": [
      "It has: oral directions suffice whenever the underlying property is personalty.",
      "It has: the trustees’ oral acceptance supplies the necessary formality.",
      "It has not: all dispositions of equitable interests must be executed as deeds.",
      "It has: writing is required only where the equitable interest concerns land.",
      "It has not: a disposition of Clara’s subsisting equitable interest requires signed writing."
    ],
    "correctIndex": 4,
    "explanation": "Clara is disposing of a subsisting equitable interest, rather than declaring a new trust of her own legal property. Her oral direction is ineffective without the signed writing required by section 53(1)(c).",
    "optionExplanations": [
      "Although shares are personalty, dispositions of subsisting equitable interests require writing.",
      "Trustee acceptance does not replace signed writing by the disponor or authorised agent.",
      "Signed writing is required here, not necessarily a deed.",
      "Section 53(1)(c) also applies to equitable interests in personal property.",
      "An oral direction changing the beneficiary while trustees retain legal title falls within section 53(1)(c)."
    ],
    "authority": "Law of Property Act 1925, s 53(1)(c); Grey v IRC [1960] AC 1."
  },
  {
    "id": "sqe1-flk2-tru-04",
    "paper": "FLK2",
    "subject": "trusts",
    "subtopic": "express-trusts",
    "difficulty": "challenging",
    "prompt": "Martin signs a valid transfer of certificated shares to his daughter, Ella, as a gift. He delivers the executed transfer and the share certificate to her, having completed every step required of him. No consent or other act by Martin is outstanding; only registration by the company remains. Martin dies before the directors register Ella. His executor argues that equity never perfects an imperfect gift and that Ella has no equitable interest. Which analysis is strongest?",
    "options": [
      "Ella acquired no interest because registration had not occurred before Martin’s death.",
      "Ella acquired the equitable interest once Martin had done everything required of him to transfer the shares.",
      "Ella acquired the legal title immediately when she received the certificate.",
      "Ella acquired an interest only if she was later appointed Martin’s executor.",
      "Ella acquired no interest unless Martin expressly declared himself trustee."
    ],
    "correctIndex": 1,
    "explanation": "Milroy v Lord does not permit the court simply to recast an incomplete transfer as a declaration of trust. However, under Re Rose the equitable interest passes when the donor has completed everything required of him, even though registration remains outstanding.",
    "optionExplanations": [
      "Outstanding registration does not prevent the Re Rose principle operating in equity.",
      "Re Rose applies where the donor has completed the steps within the donor’s power.",
      "Legal title still requires registration; the issue is the equitable interest.",
      "Strong v Bird concerns a different route; executor appointment is unnecessary here.",
      "Re Rose can operate without recasting the gift as a self-declaration."
    ],
    "authority": "Milroy v Lord (1862) 4 De GF & J 264; Re Rose [1952] Ch 499."
  },
  {
    "id": "sqe1-flk2-tru-05",
    "paper": "FLK2",
    "subject": "trusts",
    "subtopic": "resulting-constructive",
    "difficulty": "challenging",
    "prompt": "Amira and Daniel bought their family home in joint names with no express declaration of beneficial shares. They initially shared expenses, but after their separation Daniel ceased all contributions and bought another home. For fourteen years Amira alone paid the mortgage and raised their children there. The court finds that their common intention changed so that Daniel’s interest would crystallise at separation, but cannot infer their intended precise proportions. How should the court approach quantification?",
    "options": [
      "It must preserve equal beneficial shares because joint legal title is conclusive.",
      "It must use only their original cash deposits under a presumed resulting trust.",
      "It must award Amira the entire interest merely because Daniel moved out.",
      "It may impute fair shares from their whole course of dealings, having established the changed common intention.",
      "It may redistribute ownership solely by what seems fair without finding a changed intention."
    ],
    "correctIndex": 3,
    "explanation": "Joint legal ownership presumptively means joint beneficial ownership, but the presumption can be displaced by evidence of a different or changed common intention. Where that change is established but precise shares cannot be inferred, the court may impute shares that are fair in light of the whole course of dealings.",
    "optionExplanations": [
      "Joint names create a starting presumption, not an irrebuttable rule.",
      "Domestic joint-name ownership is not normally resolved by deposit arithmetic alone.",
      "Departure alone does not extinguish a beneficial interest.",
      "Once a different common intention is established, imputation can resolve otherwise unascertainable proportions.",
      "Fairness does not independently authorise displacement of their existing beneficial ownership."
    ],
    "authority": "Stack v Dowden [2007] UKHL 17; Jones v Kernott [2011] UKSC 53."
  },
  {
    "id": "sqe1-flk2-tru-06",
    "paper": "FLK2",
    "subject": "trusts",
    "subtopic": "trustees-duties",
    "difficulty": "standard",
    "prompt": "Harriet, a qualified investment manager, is a trustee of a family settlement whose deed contains no relevant restriction on investment. Without investigating risk or reading the available information, she invests most of its cash in an unfamiliar speculative company. She says the statutory general power of investment permits any investment an absolute owner could make, so she cannot have breached any duty merely through her decision-making. Which statement best answers her argument?",
    "options": [
      "The investment power permits the investment and excludes any duty of care.",
      "The investment power is broad, but she must exercise statutory care and skill reflecting her actual and expected professional expertise.",
      "She is judged only by the care expected of a wholly inexperienced volunteer.",
      "She can invest only in government securities regardless of the trust deed.",
      "She automatically guarantees that every authorised investment will make a profit."
    ],
    "correctIndex": 1,
    "explanation": "The general power of investment does not dispense with the statutory duty of care. Harriet’s investment expertise and professional role raise the care and skill reasonably expected of her; an uninformed concentration in a speculative investment is not justified merely by the breadth of the power.",
    "optionExplanations": [
      "A power to invest does not immunise its careless exercise.",
      "The section 3 power remains subject to section 1’s applicable standard of care.",
      "Her actual expertise and professional status affect the statutory standard.",
      "The statutory general investment power is not confined to government securities.",
      "The duty concerns care and skill, not a guarantee against investment losses."
    ],
    "authority": "Trustee Act 2000, ss 1, 3 and Sch 1, para 1."
  },
  {
    "id": "sqe1-flk2-tru-07",
    "paper": "FLK2",
    "subject": "trusts",
    "subtopic": "tracing",
    "difficulty": "challenging",
    "prompt": "Trustee Felix pays £60,000 misappropriated from a single trust into his personal account, which already contains £40,000 of his own money. He then withdraws £30,000 for a holiday, leaving £70,000, and makes no further transactions. No competing innocent beneficiary has money in this account. The beneficiaries want a proprietary claim against the remaining bank balance rather than personal compensation. Applying the ordinary presumption in Re Hallett, how much of the remaining balance is attributable to the trust?",
    "options": [
      "£42,000, because every withdrawal must be allocated proportionately.",
      "£30,000, because the earliest money paid in is always spent first.",
      "£70,000, because the beneficiaries take all money in a mixed account.",
      "Nothing, because mixing destroys all proprietary tracing rights.",
      "£60,000, because Felix is presumed to have spent his own money first."
    ],
    "correctIndex": 4,
    "explanation": "Re Hallett presumes a wrongdoing trustee spends personal money before trust money. The holiday exhausts only £30,000 of Felix’s £40,000, leaving the entire £60,000 trust contribution traceable in the account.",
    "optionExplanations": [
      "Proportionate depletion is not the ordinary Re Hallett presumption on these facts.",
      "Clayton’s first-in-first-out approach does not displace the trustee’s own-money-first presumption here.",
      "Mixing does not enlarge the beneficiaries’ contribution beyond £60,000.",
      "Equity allows tracing through a mixture of trust money and the trustee’s money.",
      "The £30,000 withdrawal is attributed to the £40,000 personal balance."
    ],
    "authority": "Re Hallett’s Estate (1880) 13 Ch D 696; Devaynes v Noble (Clayton’s Case) (1816) 1 Mer 572."
  },
  {
    "id": "sqe1-flk2-tru-08",
    "paper": "FLK2",
    "subject": "trusts",
    "subtopic": "tracing",
    "difficulty": "challenging",
    "prompt": "Rafi receives £80,000 of misapplied trust money for his own benefit. He knows the payment contradicts the trust deed and deliberately ignores the beneficiaries’ demand for its return. Separately, his accountant, Beth, knowingly prepares false records to help the trustee conceal the diversion, but receives no trust property. Assume the trust’s proprietary interest subsisted when Rafi received the money. Which pairing best identifies the potential personal equitable liabilities on these facts?",
    "options": [
      "Rafi: knowing receipt; Beth: dishonest assistance.",
      "Rafi: dishonest assistance only; Beth: knowing receipt only.",
      "Rafi: no liability without dishonesty; Beth: no liability without receipt.",
      "Rafi: knowing receipt only if negligent; Beth: liability only if a trustee.",
      "Rafi and Beth: strict liability merely because a breach occurred."
    ],
    "correctIndex": 0,
    "explanation": "Rafi’s beneficial receipt and knowledge make retention unconscionable, supporting knowing receipt. Beth’s knowing fabrication dishonestly assists the breach, and dishonest assistance does not require her to receive trust assets.",
    "optionExplanations": [
      "Rafi beneficially receives with unconscionable knowledge; Beth dishonestly assists without needing receipt.",
      "This reverses receipt and assistance; Beth received no trust property.",
      "Knowing receipt turns on unconscionable retention, while assistance does not require receipt.",
      "Negligence is not the controlling receipt standard, and a non-trustee may dishonestly assist.",
      "Neither personal accessory claim is strict liability simply upon proof of breach."
    ],
    "authority": "Bank of Credit and Commerce International (Overseas) Ltd v Akindele [2001] Ch 437; Royal Brunei Airlines Sdn Bhd v Tan [1995] 2 AC 378."
  },
  {
    "id": "sqe1-flk2-crim-01",
    "paper": "FLK2",
    "subject": "criminal-law",
    "subtopic": "actus-mens",
    "difficulty": "standard",
    "prompt": "Gareth stabs Imran, causing a life-threatening wound. Imran refuses a blood transfusion for religious reasons after doctors explain that he will probably die without it. Competent medical evidence shows that the stab wound remains an operating and substantial cause of his death. Gareth argues that a reasonable patient would have accepted treatment and that Imran alone caused the death by refusing it. Assuming the necessary mens rea is proved, what is the best assessment of causation?",
    "options": [
      "The refusal necessarily breaks the chain because it is a conscious decision.",
      "Causation fails unless Gareth knew of Imran’s religious beliefs beforehand.",
      "Causation fails because the wound must be the sole cause of death.",
      "The refusal does not break the chain; Gareth must take Imran as he finds him, including his beliefs.",
      "The refusal converts every resulting homicide into an attempted offence."
    ],
    "correctIndex": 3,
    "explanation": "Gareth must take his victim as he finds him, including religious beliefs affecting treatment. The stab wound remains an operating and substantial cause, and Imran’s refusal does not break the chain.",
    "optionExplanations": [
      "A conscious refusal of treatment is not necessarily a novus actus.",
      "The thin-skull principle does not depend on advance knowledge.",
      "The defendant’s conduct need not be the sole cause.",
      "The victim’s refusal of treatment does not remove the operating fatal wound as a cause.",
      "The completed death remains causally attributable on these facts."
    ],
    "authority": "R v Blaue [1975] 1 WLR 1411."
  },
  {
    "id": "sqe1-flk2-crim-02",
    "paper": "FLK2",
    "subject": "criminal-law",
    "subtopic": "actus-mens",
    "difficulty": "challenging",
    "prompt": "Lena sets fire to a small occupied flat to destroy evidence of a theft. She does not desire anyone’s death, but the jury is sure that death or really serious injury to its sleeping occupant was a virtual certainty, barring unforeseen intervention, and that Lena appreciated this when she lit the fire. The occupant dies. The judge must explain the relevance of these findings to the intention required for murder. Which direction is most accurate?",
    "options": [
      "The jury must acquit because Lena’s purpose was destruction of evidence.",
      "The jury must find intention whenever a reasonable person would foresee some injury.",
      "The jury may find the necessary intention from those findings, but is not compelled to do so.",
      "The jury must automatically equate virtual certainty with intention as a rule of law.",
      "The jury may find intention merely because death was a foreseeable possibility."
    ],
    "correctIndex": 2,
    "explanation": "The jury may find intention where death or serious bodily harm was virtually certain and the defendant appreciated that fact. Lena’s evidence-destruction purpose does not exclude such a finding, but foresight is not automatically equated with intention.",
    "optionExplanations": [
      "A different purpose does not exclude oblique intention.",
      "Objective foresight of some injury is insufficient for murder intent.",
      "Woollin permits a finding of intention on subjective appreciation of virtual certainty.",
      "The finding is permitted, not imposed as an irrebuttable legal equation.",
      "A foreseeable possibility falls short of the Woollin threshold."
    ],
    "authority": "R v Woollin [1999] 1 AC 82."
  },
  {
    "id": "sqe1-flk2-crim-03",
    "paper": "FLK2",
    "subject": "criminal-law",
    "subtopic": "homicide",
    "difficulty": "standard",
    "prompt": "After an argument with a neighbour, Paul spends a week planning to kill him. Paul buys a knife, checks the neighbour’s routine and sends a friend a message saying he will take revenge when the time is right. He then deliberately kills the neighbour. At trial there is no evidence of a recognised medical condition, and Paul says he acted calmly to punish the neighbour. He asks whether loss of control can reduce murder to manslaughter. Which advice is best?",
    "options": [
      "The defence is unavailable because the killing was done in a considered desire for revenge.",
      "The defence necessarily succeeds because the neighbour caused Paul anger.",
      "The defence necessarily succeeds because a week passed before the killing.",
      "The defence fails solely because every loss of control must be sudden.",
      "The defence applies whenever diminished responsibility cannot be proved."
    ],
    "correctIndex": 0,
    "explanation": "Loss of control is expressly unavailable where the defendant acted in a considered desire for revenge. Paul’s planning and admitted calm punitive purpose bring the case within that exclusion, irrespective of the fact that loss of control need not be sudden.",
    "optionExplanations": [
      "Section 54(4) expressly excludes such killings from loss of control.",
      "Anger alone does not establish the statutory defence.",
      "Delay alone establishes neither loss of control nor a qualifying trigger.",
      "Section 54(2) says loss of control need not be sudden.",
      "The partial defences have separate requirements; one is not a fallback without proof."
    ],
    "authority": "Coroners and Justice Act 2009, ss 54(2), 54(4), 55."
  },
  {
    "id": "sqe1-flk2-crim-04",
    "paper": "FLK2",
    "subject": "criminal-law",
    "subtopic": "homicide",
    "difficulty": "standard",
    "prompt": "Sonia intentionally kills her partner. A psychiatrist diagnoses a recognised medical condition which caused an abnormality of mental functioning at the time. The defence evidence is that this substantially impaired Sonia’s ability to exercise self-control and significantly contributed to the killing. The prosecution disputes the degree of impairment. Sonia asks what she must establish for diminished responsibility and to what standard. Which answer best states the legal position?",
    "options": [
      "She need only raise a possibility, after which the prosecution must disprove it beyond reasonable doubt.",
      "She must prove a total inability to understand her conduct beyond reasonable doubt.",
      "A diagnosis alone automatically reduces murder to manslaughter.",
      "She must prove substantial impairment of all three statutory abilities.",
      "She must establish the statutory partial defence on the balance of probabilities."
    ],
    "correctIndex": 4,
    "explanation": "Sonia must prove diminished responsibility on the balance of probabilities. A recognised condition must cause an abnormality substantially impairing a listed ability and explaining the killing; a significant contributory causal role can satisfy the explanatory requirement.",
    "optionExplanations": [
      "The statutory burden for diminished responsibility rests on the defence.",
      "Neither total incapacity nor that standard of proof is required.",
      "Diagnosis alone does not establish substantial impairment or the explanatory connection.",
      "Substantial impairment of any one of the listed abilities may suffice.",
      "The defence bears the legal burden, and substantial impairment of one listed ability can suffice."
    ],
    "authority": "Homicide Act 1957, s 2(1)–(2), as amended by Coroners and Justice Act 2009, s 52."
  },
  {
    "id": "sqe1-flk2-crim-05",
    "paper": "FLK2",
    "subject": "criminal-law",
    "subtopic": "non-fatal",
    "difficulty": "standard",
    "prompt": "Tariq deliberately punches Alex during an argument. He intends only minor bruising but actually foresees that some physical harm might result. Alex falls and suffers a very serious skull fracture amounting to grievous bodily harm. The prosecution cannot prove intent to cause grievous bodily harm or intent to resist lawful arrest. Tariq was sober and has no defence. Of the following offences, which is the most serious offence against the person whose elements are established by these facts?",
    "options": [
      "Causing grievous bodily harm with intent under section 18.",
      "Assault occasioning actual bodily harm under section 47 only.",
      "Maliciously inflicting grievous bodily harm under section 20.",
      "Common assault only.",
      "Attempted murder."
    ],
    "correctIndex": 2,
    "explanation": "Section 20 requires grievous bodily harm and intention or subjective recklessness as to some physical harm, not necessarily serious harm. Tariq satisfies those elements, while the required section 18 intent is expressly absent.",
    "optionExplanations": [
      "The stipulated evidence does not establish the required specific intent.",
      "Section 20 is established and is the more serious applicable offence.",
      "Actual GBH plus foresight of some physical harm satisfies section 20 without intent to cause GBH.",
      "The serious injury and foresight establish a more serious offence.",
      "There is no intent to kill, which attempted murder requires."
    ],
    "authority": "Offences against the Person Act 1861, ss 18, 20, 47; R v Mowatt [1968] 1 QB 421."
  },
  {
    "id": "sqe1-flk2-crim-06",
    "paper": "FLK2",
    "subject": "criminal-law",
    "subtopic": "property-offences",
    "difficulty": "core",
    "prompt": "Chloe finds her colleague Maya’s tablet in their shared office. Knowing it belongs to Maya and that Maya has not consented, Chloe takes it home intending to sell it and keep the proceeds. She says she regarded herself as deserving extra pay but never believed she had a legal right to take the tablet. The tribunal accepts that these were her actual beliefs. Which approach should it use to decide dishonesty for theft?",
    "options": [
      "Ask only whether Chloe herself regarded the taking as dishonest.",
      "Determine Chloe’s actual knowledge or belief about the facts, then apply the standards of ordinary decent people.",
      "Ask only whether a reasonable person would have believed Maya consented.",
      "Treat dishonesty as irrelevant because Chloe intended permanent deprivation.",
      "Require the prosecution to prove that Chloe knew the legal definition of theft."
    ],
    "correctIndex": 1,
    "explanation": "The tribunal first identifies Chloe’s actual knowledge or beliefs about the facts, then judges her conduct by ordinary decent people’s standards. She need not appreciate that those people would regard her conduct as dishonest, and her belief that she deserved more pay is not a belief in a legal right to this tablet.",
    "optionExplanations": [
      "Awareness that ordinary people would call the conduct dishonest is unnecessary.",
      "The Ivey approach, applied in Barton, uses actual factual beliefs but an objective standard of dishonesty.",
      "The factual belief stage is subjective, not a freestanding reasonable-person belief test.",
      "Dishonesty remains a separate element of theft.",
      "Knowledge of the law or its definition is not required."
    ],
    "authority": "Theft Act 1968, ss 1–6; Ivey v Genting Casinos (UK) Ltd [2017] UKSC 67, [74]; R v Barton and Booth [2020] EWCA Crim 575."
  },
  {
    "id": "sqe1-flk2-crim-07",
    "paper": "FLK2",
    "subject": "criminal-law",
    "subtopic": "property-offences",
    "difficulty": "core",
    "prompt": "Felix emails a prospective customer, Ruth, claiming that he is an authorised dealer for a watch manufacturer and can supply a genuine new watch. He knows both statements are false and intends Ruth to transfer a deposit to him, which he will keep. Ruth recognises the scam immediately, pays nothing and reports the email. Felix argues that there can be no completed fraud because Ruth was not deceived and he obtained no money. Which statement is correct?",
    "options": [
      "Only attempted fraud is possible because Ruth did not believe the representation.",
      "Only attempted fraud is possible because no deposit was received.",
      "No offence is possible because an email cannot make a representation.",
      "Fraud by false representation may be complete despite Ruth’s refusal to pay.",
      "The offence is complete only if Felix intended permanently to deprive Ruth of particular banknotes."
    ],
    "correctIndex": 3,
    "explanation": "Felix dishonestly makes representations he knows are false with intent to gain a deposit. Section 2 does not require Ruth to believe him, act on the email or suffer an actual loss.",
    "optionExplanations": [
      "Reliance or successful deception is not an element of section 2.",
      "Actual gain or loss is not required.",
      "A representation may be made electronically.",
      "Dishonest false representation with the requisite gain or loss intent needs no successful deception or actual gain.",
      "Fraud uses gain or loss intent, not theft’s permanent-deprivation formulation."
    ],
    "authority": "Fraud Act 2006, ss 2, 5."
  },
  {
    "id": "sqe1-flk2-crim-08",
    "paper": "FLK2",
    "subject": "criminal-law",
    "subtopic": "inchoate-secondary",
    "difficulty": "challenging",
    "prompt": "Noah agrees to act as lookout while his friend enters a closed warehouse as a trespasser to steal laptops. Noah knows the plan and intends to help the burglary. He also foresees that his friend might deliberately kill a security guard, but the prosecution accepts that Noah neither intends to assist or encourage any killing nor intends assistance conditional on violence becoming necessary. His friend unexpectedly kills the guard intentionally. What is the best analysis of Noah’s potential secondary liability?",
    "options": [
      "He is necessarily guilty of murder because he foresaw the possibility of a killing.",
      "He cannot be guilty of burglary because he never entered the warehouse himself.",
      "He is necessarily guilty of attempted murder because he contemplated a possible killing.",
      "He has no secondary liability for any offence unless he personally handled a laptop.",
      "He may be liable for burglary, but foresight alone does not establish his secondary liability for murder."
    ],
    "correctIndex": 4,
    "explanation": "Noah intentionally assists the planned burglary and may be liable as an accessory to it. Foresight that the principal might kill is evidence relevant to intention, but is not itself the intention to assist or encourage murder required after Jogee.",
    "optionExplanations": [
      "Foresight is evidence from which intention may be inferred, not a substitute for intention.",
      "A lookout can intentionally assist another’s burglary without entering.",
      "Contemplation alone does not supply intent to kill or intended assistance.",
      "Intentional assistance to the burglary does not require handling stolen property.",
      "Intended assistance supports burglary; Jogee rejects foresight alone as the murder mens rea."
    ],
    "authority": "R v Jogee [2016] UKSC 8; Accessories and Abettors Act 1861, s 8; Theft Act 1968, s 9(1)(a)."
  },
  {
    "id": "sqe1-flk2-cp-01",
    "paper": "FLK2",
    "subject": "criminal-practice",
    "subtopic": "pre-charge",
    "difficulty": "core",
    "prompt": "Police authorise adult suspect Emily’s detention at 09:00 on Monday for an indictable offence. She remains uncharged, is awake and available, and no statutory ground for postponement applies. Officers plan the first review at 16:00 because that is convenient for the reviewing inspector. Emily’s solicitor challenges the proposed timetable. Ignoring the separate overall limit on detention, what is the latest time by which the first review must ordinarily take place?",
    "options": [
      "11:00 on Monday.",
      "15:00 on Monday.",
      "18:00 on Monday.",
      "21:00 on Monday.",
      "09:00 on Tuesday."
    ],
    "correctIndex": 1,
    "explanation": "The first detention review must ordinarily occur no later than six hours after detention was first authorised. That makes 15:00 the deadline; subsequent reviews ordinarily have a maximum nine-hour interval.",
    "optionExplanations": [
      "There is no general two-hour first-review interval.",
      "The first review is required within six hours of detention first being authorised.",
      "Nine hours is the maximum interval for subsequent reviews, not the first.",
      "Twelve hours exceeds the ordinary first-review limit.",
      "The overall detention clock does not replace the six-hour first review."
    ],
    "authority": "Police and Criminal Evidence Act 1984, s 40(3)."
  },
  {
    "id": "sqe1-flk2-cp-02",
    "paper": "FLK2",
    "subject": "criminal-practice",
    "subtopic": "police-powers",
    "difficulty": "standard",
    "prompt": "Adult suspect Jacob asks to consult a solicitor privately before interview. The custody officer refuses solely because the duty solicitor is busy and the investigator wants to finish before the end of the shift. There is no authorised statutory delay, urgent-interview exception or waiver. Jacob maintains his request and says nothing when questioned. At trial he relies on a fact he could reasonably have mentioned had he been properly interviewed after advice. Which statement best describes the section 34 position?",
    "options": [
      "A section 34 inference must be drawn because the eventual fact could reasonably have been mentioned.",
      "A section 34 inference is available because police convenience justifies refusing legal advice.",
      "A section 34 inference is barred only if Jacob can prove he was factually innocent.",
      "A section 34 inference cannot be drawn because he was not allowed an opportunity to consult a solicitor before questioning.",
      "A section 34 inference itself conclusively proves guilt."
    ],
    "correctIndex": 3,
    "explanation": "Jacob has a right to private legal consultation, and operational convenience does not justify refusal. A detained suspect who has not been allowed an opportunity to consult a solicitor before questioning is protected from section 34 inferences arising from that questioning.",
    "optionExplanations": [
      "The statutory solicitor-access protection prevents that conclusion here.",
      "Convenience does not supply lawful grounds to deny consultation.",
      "The protection does not depend on proving innocence.",
      "Section 34(2A) protects a detained suspect denied that opportunity.",
      "Even a permissible inference is not conclusive proof, and none is permitted here."
    ],
    "authority": "Police and Criminal Evidence Act 1984, s 58(1); Criminal Justice and Public Order Act 1994, s 34(2A)."
  },
  {
    "id": "sqe1-flk2-cp-03",
    "paper": "FLK2",
    "subject": "criminal-practice",
    "subtopic": "police-powers",
    "difficulty": "standard",
    "prompt": "A witness saw an unfamiliar robber’s face clearly for several minutes and has described him to police. Police later arrest Lewis, who disputes being the robber. The witness has not identified him since the arrest and says she could recognise the offender again. Lewis is available, willing to cooperate and suitable for a video identification procedure. No practicability problem or reason why a procedure would serve no useful purpose exists. What should ordinarily happen next under Code D?",
    "options": [
      "Police should offer Lewis a video identification procedure.",
      "Police should show the witness a single photograph of Lewis as the normal identification procedure.",
      "Police should omit a procedure because the witness has already supplied a description.",
      "Police should leave identification entirely to a first-time dock identification at trial.",
      "Police must use a confrontation because video identification is prohibited for a sole witness."
    ],
    "correctIndex": 0,
    "explanation": "The witness expresses an ability to identify the offender, Lewis disputes identity and a useful procedure is practicable. Code D ordinarily requires an identification procedure, with video identification offered first in these circumstances.",
    "optionExplanations": [
      "A formal procedure is required in these circumstances, with video identification ordinarily offered first.",
      "A single suspect photograph is not a substitute for the required fair formal procedure.",
      "A prior description does not remove the need where identification is disputed.",
      "An available formal procedure should not be bypassed in favour of dock identification.",
      "There is no such prohibition; confrontation is not the ordinary first choice."
    ],
    "authority": "PACE Code D, paras 3.12–3.14."
  },
  {
    "id": "sqe1-flk2-cp-04",
    "paper": "FLK2",
    "subject": "criminal-practice",
    "subtopic": "bail-first-hearings",
    "difficulty": "standard",
    "prompt": "Olivia appears charged with an imprisonable either-way offence. There are substantial grounds for believing she will contact and intimidate a key witness if released without restrictions. She proposes living well away from the witness and complying with a strict no-contact condition. The magistrates find those enforceable conditions sufficient to remove the identified risk, and no other exception to bail applies. The prosecution nevertheless says any initial witness risk requires custody. What should the magistrates do?",
    "options": [
      "Remand in custody because witness-interference concerns can never be addressed by conditions.",
      "Grant unconditional bail because conditions cannot concern witnesses.",
      "Grant bail with the conditions needed to address the identified risk.",
      "Refuse bail automatically because the offence is punishable with imprisonment.",
      "Require Olivia to prove her innocence before considering conditional bail."
    ],
    "correctIndex": 2,
    "explanation": "The court must assess the actual risks and whether conditions can adequately manage them. On the express finding that proportionate residence and no-contact conditions suffice, and with no other exception applying, Olivia should receive conditional bail.",
    "optionExplanations": [
      "The Bail Act permits conditions aimed at preventing interference.",
      "Preventing interference is a recognised basis for conditions.",
      "Where adequate conditions manage the risk, the initial risk does not itself require remand in custody.",
      "Imprisonability engages relevant exceptions but does not make custody automatic.",
      "Bail is not determined by requiring the defendant to establish innocence."
    ],
    "authority": "Bail Act 1976, s 3(6), s 4 and Sch 1, Part I, para 2."
  },
  {
    "id": "sqe1-flk2-cp-05",
    "paper": "FLK2",
    "subject": "criminal-practice",
    "subtopic": "plea-allocation",
    "difficulty": "core",
    "prompt": "Adult defendant Marcus appears before magistrates charged with an either-way theft offence. After receiving advice he indicates a not-guilty plea. The magistrates consider allocation and decide the case is suitable for summary trial, explaining the relevant sentencing position. Marcus has not previously consented to summary trial and wishes a jury to decide the charge. There is no special statutory restriction on election in this case. What is his position at this stage?",
    "options": [
      "He must accept summary trial because the magistrates consider their powers adequate.",
      "He must plead guilty before he can request Crown Court trial.",
      "He may elect only if the prosecution also consents.",
      "He has an automatic appeal against conviction before any trial begins.",
      "He may decline summary trial and elect trial in the Crown Court."
    ],
    "correctIndex": 4,
    "explanation": "After a not-guilty indication and an allocation decision favouring summary trial, the defendant is asked whether he consents. Marcus may withhold consent and elect trial on indictment.",
    "optionExplanations": [
      "Acceptance of jurisdiction does not remove the defendant’s election.",
      "Election follows the not-guilty allocation process, not a guilty plea.",
      "The ordinary statutory election is not subject to prosecution consent.",
      "There is no conviction yet; election is the relevant procedural right.",
      "An adult retains the election after the magistrates accept jurisdiction in this ordinary either-way case."
    ],
    "authority": "Magistrates’ Courts Act 1980, ss 17A, 19, 20; Criminal Procedure Rules, Part 9."
  },
  {
    "id": "sqe1-flk2-cp-06",
    "paper": "FLK2",
    "subject": "criminal-practice",
    "subtopic": "trial-evidence",
    "difficulty": "challenging",
    "prompt": "Police obtain a confession from Andre after threatening to harm his child if he does not admit the offence. At trial the defence adduces credible evidence of those threats and challenges admissibility. The prosecution seeks to rely on the confession and says the judge should simply leave its reliability to the jury because it appears accurate. Which approach should the judge take to the statutory confession challenge?",
    "options": [
      "Admit it whenever the prosecution proves on balance that its contents are true.",
      "Admit it unless Andre proves oppression beyond reasonable doubt.",
      "Exclude it unless the prosecution proves beyond reasonable doubt that it was not obtained by oppression.",
      "Admit it automatically and leave admissibility entirely to the jury.",
      "Exclude it only if Andre also proves that the threat caused an actual false statement."
    ],
    "correctIndex": 2,
    "explanation": "Credible evidence that the confession was obtained by oppression engages section 76(2)(a). The prosecution must disprove that basis beyond reasonable doubt; apparent truth does not cure an oppressed confession, and section 78 provides a separate fairness jurisdiction.",
    "optionExplanations": [
      "Truth is not the section 76(2)(a) test and the burden is beyond reasonable doubt.",
      "This reverses the statutory burden.",
      "Once oppression is properly raised, section 76 places that burden on the prosecution.",
      "Admissibility is for the judge, not the jury.",
      "Oppression does not require the defendant to prove falsity."
    ],
    "authority": "Police and Criminal Evidence Act 1984, ss 76(2)(a), 76(8), 78(1)."
  },
  {
    "id": "sqe1-flk2-cp-07",
    "paper": "FLK2",
    "subject": "criminal-practice",
    "subtopic": "sentencing-appeals",
    "difficulty": "core",
    "prompt": "Aisha pleads not guilty in the magistrates’ court, is convicted after a contested trial and receives a community order. She says the principal witness was mistaken and wants both the conviction and sentence reconsidered on the evidence. Her solicitor identifies no discrete question of law and no jurisdictional error. She is still within the applicable time limit. Which route ordinarily provides a rehearing on the merits without needing permission to appeal?",
    "options": [
      "An appeal to the Crown Court against conviction and sentence.",
      "A direct appeal to the Court of Appeal Criminal Division.",
      "An application to the High Court by case stated solely to retry the facts.",
      "An appeal to the Supreme Court without an intermediate appeal.",
      "An appeal to a different magistrates’ court as of right."
    ],
    "correctIndex": 0,
    "explanation": "Following a not-guilty plea and conviction, Aisha may appeal to the Crown Court against conviction and sentence without permission. That appeal is a rehearing; case stated is not a substitute general fact appeal.",
    "optionExplanations": [
      "A defendant convicted after a not-guilty plea may appeal both to the Crown Court by way of rehearing.",
      "That is not the ordinary route from a magistrates’ court conviction.",
      "Case stated addresses legal or jurisdictional error, not a general merits rehearing.",
      "No such direct ordinary merits appeal exists.",
      "The ordinary statutory appeal lies to the Crown Court, not another magistrates’ bench."
    ],
    "authority": "Magistrates’ Courts Act 1980, s 108; Senior Courts Act 1981, s 79(3)."
  },
  {
    "id": "sqe1-flk2-cp-08",
    "paper": "FLK2",
    "subject": "criminal-practice",
    "subtopic": "bail-first-hearings",
    "difficulty": "standard",
    "prompt": "Ben applies for criminal legal aid for a magistrates’ court prosecution. Assume that he satisfies the applicable means requirements. He faces a real prospect of losing his livelihood if convicted, the case raises a substantial question of law, and he cannot adequately present the technical defence without representation. The court asks whether the separate interests of justice requirement is satisfied. Which answer best identifies the proper approach?",
    "options": [
      "Refuse because financial eligibility is the only test relevant in a magistrates’ court.",
      "Assess the statutory interests of justice factors; these circumstances strongly support granting representation.",
      "Refuse unless imprisonment is inevitable on conviction.",
      "Grant automatically whenever any defendant asks for a solicitor.",
      "Decide solely whether Ben is likely to be acquitted."
    ],
    "correctIndex": 1,
    "explanation": "Financial eligibility and the interests of justice are distinct requirements here. The likely effect on Ben’s livelihood, substantial legal issue and difficulty presenting his own case are expressly relevant and strongly support representation.",
    "optionExplanations": [
      "Means eligibility does not replace the separate interests of justice assessment.",
      "Livelihood, substantial legal questions and inability adequately to present the case are relevant statutory factors.",
      "Loss of liberty is not the sole relevant factor, and inevitability is not required.",
      "Court representation is not automatically funded merely on request.",
      "The statutory factors do not reduce to predicted acquittal."
    ],
    "authority": "Legal Aid, Sentencing and Punishment of Offenders Act 2012, s 17(2)."
  },
  {
    "id": "sqe1-flk2-sa-01",
    "paper": "FLK2",
    "subject": "solicitors-accounts",
    "subtopic": "client-account",
    "difficulty": "core",
    "prompt": "Solicitor Freya’s firm maintains a client account and receives £12,000 from client Idris. Of that sum, £2,000 pays a bill for fees already delivered and £10,000 is to be held towards a property purchase deposit. No exception or alternative written arrangement applies. The cashier suggests retaining the whole payment indefinitely in the business account because part of it pays fees. What is the correct treatment of this mixed payment?",
    "options": [
      "Keep the full £12,000 in business account until completion.",
      "Keep the full £12,000 in client account permanently because any client payment is wholly client money.",
      "Return the full payment because mixed payments may never be accepted.",
      "Allocate it promptly, placing £10,000 in client account and £2,000 in business account.",
      "Place £2,000 in client account and £10,000 in business account."
    ],
    "correctIndex": 3,
    "explanation": "The purchase deposit is client money, while payment of the delivered fees bill is business money. The firm must allocate the mixed payment promptly, keep client money separate and pay the client component promptly into client account.",
    "optionExplanations": [
      "This would fail to segregate and promptly bank the deposit as client money.",
      "The £2,000 payment of billed fees is business money and must be allocated appropriately.",
      "Mixed payments can be received but must be promptly allocated.",
      "The deposit is client money; the billed fees belong in business account, with prompt allocation.",
      "This reverses the character of the billed fees and purchase deposit."
    ],
    "authority": "SRA Accounts Rules 2019, rr 2.1(a), 2.3, 4.1, 4.2."
  },
  {
    "id": "sqe1-flk2-sa-02",
    "paper": "FLK2",
    "subject": "solicitors-accounts",
    "subtopic": "client-account",
    "difficulty": "standard",
    "prompt": "Vera’s solicitor holds £4,000 in client account on account of fees for ongoing work. The solicitor has now incurred £1,500 in fees and wants to transfer that sum to business account. The retainer generally permits payment of fees from funds held, but no bill or written notification of the costs incurred has yet been given to Vera or any paying party. Sufficient money is held for Vera. What must the solicitor do before transferring the £1,500?",
    "options": [
      "Give Vera or the paying party a bill or other written notification identifying the £1,500 of incurred costs.",
      "Make the transfer first and notify Vera in the next monthly statement.",
      "Rely solely on the retainer’s general authority without identifying the incurred costs in writing.",
      "Transfer the full £4,000 because any incurred fee converts the entire balance to business money.",
      "Obtain a court order because client money can never be transferred to pay fees."
    ],
    "correctIndex": 0,
    "explanation": "Money received for unbilled fees is client money. Before a transfer for costs, the firm must give a bill or other written notification of incurred costs identifying the specific amount to be transferred; the existing general retainer clause does not substitute for that step.",
    "optionExplanations": [
      "Rule 4.3 requires prior written costs notification and a transfer of the specified covered sum.",
      "Notification must precede the costs transfer.",
      "General retainer authority does not dispense with rule 4.3.",
      "Only the specific notified sum covered by the client’s funds may be transferred for these costs.",
      "The rules allow payment of costs following the required safeguards."
    ],
    "authority": "SRA Accounts Rules 2019, rr 2.1(d), 4.3(a)–(c), 5.1."
  },
  {
    "id": "sqe1-flk2-sa-03",
    "paper": "FLK2",
    "subject": "solicitors-accounts",
    "subtopic": "client-account",
    "difficulty": "standard",
    "prompt": "Harvey’s litigation has ended and all costs and third-party liabilities have been settled. His solicitor holds a cleared £850 client balance, knows Harvey’s current bank details and has no proper reason to retain the money. Harvey has not instructed the firm to hold it for anything else. A partner proposes leaving it untouched for twelve months in case Harvey later opens an unrelated matter. Which course complies with the Accounts Rules?",
    "options": [
      "Retain it for twelve months because all former clients may need future services.",
      "Transfer it to the firm’s business account as miscellaneous income.",
      "Return the £850 promptly because there is no longer a proper reason to hold it.",
      "Use it to meet another client’s urgent completion payment and replace it later.",
      "Keep it indefinitely unless Harvey makes a formal written demand."
    ],
    "correctIndex": 2,
    "explanation": "Rule 2.5 requires prompt return when there is no longer a proper reason to hold client funds. Potential future work is not enough, and an unrelated use would not be a withdrawal for the purpose for which these funds are held.",
    "optionExplanations": [
      "Speculative future instructions do not supply a present proper reason.",
      "The balance remains Harvey’s money, not the firm’s income.",
      "Rule 2.5 requires prompt return once the reason for holding the funds ends.",
      "It is not held for that purpose and cannot fund another client’s transaction.",
      "The duty to return promptly does not depend on a demand."
    ],
    "authority": "SRA Accounts Rules 2019, rr 2.5, 5.1."
  },
  {
    "id": "sqe1-flk2-sa-04",
    "paper": "FLK2",
    "subject": "solicitors-accounts",
    "subtopic": "interest-disbursements",
    "difficulty": "standard",
    "prompt": "A firm holds £300,000 for client Mei for several months while a transaction awaits regulatory approval. Its published interest policy would produce a substantial payment to her. There is no written agreement varying the normal interest position. The finance partner proposes paying nothing because the money was kept in a general client account rather than a separately designated account. Which statement best describes the firm’s obligation?",
    "options": [
      "It owes no interest because only designated client accounts attract the rule.",
      "It must pay a fixed statutory rate of eight per cent on every client balance.",
      "It may retain all interest simply because Mei did not ask for payment.",
      "It may retrospectively waive Mei’s entitlement by an internal partner decision.",
      "It must account to Mei for a fair sum of interest on her client money."
    ],
    "correctIndex": 4,
    "explanation": "The firm must account for a fair sum of interest on client money, including money in a general client account. A different arrangement requires an informed written agreement; the partner’s proposed unilateral decision cannot remove the obligation.",
    "optionExplanations": [
      "The general client account distinction does not exclude rule 7.1.",
      "Rule 7.1 requires a fair sum, not a universal eight per cent rate.",
      "The duty to account is not conditional on a client’s demand.",
      "An internal decision is not an informed written agreement with the client.",
      "Rule 7.1 applies to client money and is not restricted to designated accounts."
    ],
    "authority": "SRA Accounts Rules 2019, rr 7.1, 7.2."
  },
  {
    "id": "sqe1-flk2-sa-05",
    "paper": "FLK2",
    "subject": "solicitors-accounts",
    "subtopic": "breaches-reporting",
    "difficulty": "challenging",
    "prompt": "During the required client-account reconciliation, cashier Priya discovers that £2,400 of client Omar’s money was mistakenly paid to meet the firm’s rent. The firm has available business funds, but the finance partner wants to wait until the landlord repays the mistaken payment next month. The last reconciliation was five weeks ago. Which immediate response is required, independently of whether further regulatory reporting is necessary?",
    "options": [
      "Wait for the landlord’s repayment because the mistake was inadvertent.",
      "Replace the £2,400 immediately from available business funds and correct the breach promptly.",
      "Transfer £2,400 from another client’s ledger to conceal Omar’s shortfall temporarily.",
      "Record the shortfall but defer correction until the annual accountant’s report.",
      "Treat the five-week reconciliation as late because reconciliation is required every seven days."
    ],
    "correctIndex": 1,
    "explanation": "The improperly withdrawn client money must be replaced immediately and the breach corrected promptly. Rule 8.3’s reconciliation requirement is at least every five weeks; discovering the error through that control does not permit delayed replacement.",
    "optionExplanations": [
      "Inadvertence does not suspend the immediate replacement duty.",
      "Rule 6.1 requires immediate replacement; reconciliation should not await third-party repayment.",
      "Other clients’ money cannot be appropriated to repair the firm’s breach.",
      "Recordkeeping does not replace prompt correction and immediate replacement.",
      "Rule 8.3 requires reconciliation at least every five weeks, not weekly."
    ],
    "authority": "SRA Accounts Rules 2019, rr 6.1, 8.3."
  },
  {
    "id": "sqe1-flk2-sa-06",
    "paper": "FLK2",
    "subject": "solicitors-accounts",
    "subtopic": "double-entry",
    "difficulty": "challenging",
    "prompt": "A firm receives £7,500 by bank transfer from client Lucas solely towards the deposit on his purchase. No bill has been delivered and no amount is yet due to the firm. The money is correctly paid into the general client bank account. The cashier must now record the receipt using conventional double-entry bookkeeping, showing both the bank asset and the firm’s liability to Lucas. Which pair of entries correctly records this receipt?",
    "options": [
      "Credit client bank cash book £7,500; debit Lucas’s client ledger, client side, £7,500.",
      "Debit business bank cash book £7,500; credit fee income £7,500.",
      "Debit Lucas’s client ledger, business side, £7,500; credit fee income £7,500.",
      "Debit client bank cash book £7,500; credit Lucas’s client ledger, client side, £7,500.",
      "Debit client bank cash book £7,500; credit business bank cash book £7,500."
    ],
    "correctIndex": 3,
    "explanation": "The receipt increases the client bank asset, requiring a debit, and increases the liability owed to Lucas, requiring a credit on the client side of his ledger. Rule 8.1 requires accurate contemporaneous records separating client-side client-money transactions from business-side entries.",
    "optionExplanations": [
      "These are payment entries, reducing bank and liability rather than recording receipt.",
      "The receipt is client money, not billed fee income or business cash.",
      "That treats the transaction like a bill, not a receipt of client deposit money.",
      "The bank asset increases by a debit and the liability to Lucas increases by a credit.",
      "There is no transfer from business bank; the required counterpart is Lucas’s client liability."
    ],
    "authority": "SRA Accounts Rules 2019, r 8.1(a)(i)–(ii); conventional double-entry bookkeeping principles."
  }
];
