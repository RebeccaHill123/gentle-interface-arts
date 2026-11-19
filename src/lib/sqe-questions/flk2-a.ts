import type { SqeBankQuestion } from "./types";

export const FLK2_A: SqeBankQuestion[] = [
  {
    id: "sqe1-flk2-pp-01",
    paper: "FLK2",
    subject: "property-practice",
    subtopic: "freehold-sale",
    difficulty: "core",
    prompt:
      "Amira agrees a price for Ben's registered freehold house. Their solicitors prepare an ordinary private-treaty sale contract expressly marked 'subject to contract'. Amira signs her part and returns it to her solicitor. Ben signs his part, but the solicitors have not exchanged contracts or otherwise concluded a binding agreement. Amira has paid for searches and a survey. Ben now accepts a higher offer from another buyer. Amira asks whether her signature and expenditure oblige Ben to sell to her. Which advice is most accurate?",
    options: [
      "Ben must complete because Amira has signed her part of the contract.",
      "Ben must complete because the solicitors have agreed the purchase price.",
      "Ben is not yet contractually obliged to sell because the transaction remains subject to contract.",
      "Ben must complete because Amira has incurred foreseeable conveyancing expenses.",
      "Ben must complete unless he first reimburses Amira's search and survey costs.",
    ],
    correctIndex: 2,
    explanation:
      "The parties have expressly postponed contractual commitment by proceeding subject to contract. Neither Amira's signature nor her expenditure removes that qualification, and the facts disclose no concluded land contract.",
    optionExplanations: [
      "Signing her own part does not itself conclude the subject-to-contract transaction.",
      "Agreement on price does not override the express subject-to-contract qualification.",
      "Correct: the parties have not yet concluded a binding contract.",
      "Preparatory expenditure does not itself oblige Ben to complete the sale.",
      "Reimbursement is not a condition of Ben's freedom to withdraw on these facts.",
    ],
    authority:
      "Law of Property (Miscellaneous Provisions) Act 1989, s 2(1), (3); Chillingworth v Esche [1924] 1 Ch 97.",
  },
  {
    id: "sqe1-flk2-pp-02",
    paper: "FLK2",
    subject: "property-practice",
    subtopic: "leasehold",
    difficulty: "standard",
    prompt:
      "Nadia holds a commercial lease granted in 2021. It prohibits assignment without the landlord's written consent, which is not to be unreasonably withheld. She applies in writing for consent to assign the whole lease to a financially sound company and supplies all reasonably required information. The landlord says it will leave the application unanswered until Nadia pays an unrelated debt owed by her brother. No term of the lease permits that demand. Which statement best describes the landlord's obligations?",
    options: [
      "It must decide within a reasonable time and give written reasons if consent is refused.",
      "It may remain silent indefinitely because the covenant requires written consent.",
      "It must consent immediately, without any opportunity to investigate the proposed assignee.",
      "It may withhold consent for any reason because assignment changes the tenant.",
      "It must obtain a court order before communicating its decision to Nadia.",
    ],
    correctIndex: 0,
    explanation:
      "A written application engages the statutory duty to give consent within a reasonable time unless withholding it is reasonable. The landlord must give written notice of its decision, including reasons for refusal; the unrelated debt does not justify using the application as leverage.",
    optionExplanations: [
      "Correct: the statutory duties include a timely decision and written reasons for refusal.",
      "Silence does not avoid the duty to deal with the written application within a reasonable time.",
      "The landlord has a reasonable period to assess the application.",
      "The qualified covenant and statutory duties prevent arbitrary refusal.",
      "The landlord makes the consent decision without needing a prior court order.",
    ],
    authority: "Landlord and Tenant Act 1988, s 1(3), (4), (6).",
  },
  {
    id: "sqe1-flk2-pp-03",
    paper: "FLK2",
    subject: "property-practice",
    subtopic: "leasehold",
    difficulty: "challenging",
    prompt:
      "Luca is negotiating a five-year shop lease in England. The landlord wants to exclude statutory renewal rights. Luca receives the prescribed warning notice on Monday and is due to become contractually bound on Friday of the same week. He has not previously entered into an agreement for lease. The draft lease contains the required references to the exclusion arrangements. His solicitor explains that a declaration must be completed before Luca becomes bound. Which step is required if the Friday timetable is retained?",
    options: [
      "Luca must sign a simple declaration because the proposed term exceeds three years.",
      "The landlord must register the warning notice at HM Land Registry before Friday.",
      "Luca must surrender his renewal rights by deed after the lease has commenced.",
      "The parties must obtain the county court's approval before granting the lease.",
      "Luca or a duly authorised person must make the prescribed statutory declaration before he becomes bound.",
    ],
    correctIndex: 4,
    explanation:
      "Where fewer than 14 days separate the warning notice and the tenant becoming contractually bound, the statutory-declaration procedure is required. A simple declaration is insufficient on this timetable, and court approval is not the contracting-out mechanism.",
    optionExplanations: [
      "A simple declaration is available only where the requisite advance-notice period is met.",
      "Registration of the warning notice is not part of the prescribed procedure.",
      "The required procedure must precede contractual commitment, not follow commencement.",
      "The current procedure does not require a court order approving exclusion.",
      "Correct: the short notice period requires the prescribed statutory declaration.",
    ],
    authority:
      "Landlord and Tenant Act 1954, s 38A; Regulatory Reform (Business Tenancies) (England and Wales) Order 2003, SI 2003/3096, art 2 and Schs 1–2.",
  },
  {
    id: "sqe1-flk2-pp-04",
    paper: "FLK2",
    subject: "property-practice",
    subtopic: "searches-enquiries",
    difficulty: "core",
    prompt:
      "Priya is buying a detached house on a recently constructed estate in England. The registered title shows a right to use the access road, but neither the title nor the seller's replies establishes whether the highway authority maintains that road at public expense. Priya is concerned that she may have to contribute to substantial future repairs. Her solicitor is selecting the appropriate standard investigation before exchange. Which investigation most directly addresses whether the road is publicly maintainable?",
    options: [
      "A drainage and water search showing the location of public sewers.",
      "Local authority highway enquiries identifying roads maintained at public expense.",
      "An official search with priority against the seller's registered title.",
      "A bankruptcy search against Priya's name.",
      "An environmental search assessing historical contamination.",
    ],
    correctIndex: 1,
    explanation:
      "Highway enquiries address the maintenance status of the access road. A private right of way does not itself establish that the road is a highway maintainable at public expense.",
    optionExplanations: [
      "Sewer information does not establish responsibility for maintaining the access road.",
      "Correct: highway enquiries directly investigate public maintenance status.",
      "A priority search protects the registration priority of the proposed disposition.",
      "A bankruptcy search concerns personal insolvency, not road maintenance.",
      "Contamination information does not determine whether a road is publicly maintainable.",
    ],
    authority: "Highways Act 1980, s 36(6).",
  },
  {
    id: "sqe1-flk2-pp-05",
    paper: "FLK2",
    subject: "property-practice",
    subtopic: "contract-completion",
    difficulty: "challenging",
    prompt:
      "Owen's solicitor holds Owen's signed purchase contract, while Ruth's solicitor holds Ruth's signed sale contract. The documents are in identical terms. Both clients authorise exchange, and the solicitors wish to exchange by telephone while each retains the part signed by their own client until the exchange call. They do not need a chain-release arrangement and have not authorised one solicitor to hold both parts before exchange. Which Law Society exchange formula is the appropriate starting point?",
    options: [
      "Formula A, because each solicitor holds only their own client's signed part.",
      "Formula C, because every telephone exchange must use a chain-release procedure.",
      "No formula, because a telephone exchange cannot create a binding land contract.",
      "Formula B, because each solicitor holds their own client's signed part.",
      "Formula A, because it requires neither solicitor to possess a signed contract.",
    ],
    correctIndex: 3,
    explanation:
      "Formula B is designed for an exchange where each solicitor holds the part signed by their own client. Formula A assumes one solicitor holds both signed parts, while Formula C addresses release arrangements commonly used in chains.",
    optionExplanations: [
      "Formula A is not the starting point where the signed parts are held separately in this way.",
      "A chain-release procedure is not required for every telephone exchange.",
      "Telephone exchange can conclude a contract using compliant signed documents.",
      "Correct: the stated custody arrangements match Formula B.",
      "Formula A does not dispense with signed contractual documents.",
    ],
    authority:
      "Law Society Formulae for Exchanging Contracts by Telephone, Formula B; Law of Property (Miscellaneous Provisions) Act 1989, s 2(1), (3).",
  },
  {
    id: "sqe1-flk2-pp-06",
    paper: "FLK2",
    subject: "property-practice",
    subtopic: "contract-completion",
    difficulty: "standard",
    prompt:
      "Ellis exchanges contracts to buy a vacant freehold house from Farah. The contract incorporates the Standard Conditions of Sale, fifth edition, without amendment to the risk provisions. It contains no provision requiring Farah to insure for Ellis's benefit. Before completion, an accidental fire seriously damages the house without fault by either party. Ellis has not arranged insurance because he assumed risk would remain with Farah until the transfer was completed. Who bears the contractual risk of this accidental damage?",
    options: [
      "Farah, because legal title remains registered in her name.",
      "Farah, because the house was vacant when contracts were exchanged.",
      "Ellis, because the property is at the buyer's risk from the date of the contract.",
      "Both parties equally, because neither caused the fire.",
      "Neither party, because accidental damage automatically terminates the contract.",
    ],
    correctIndex: 2,
    explanation:
      "The unamended Standard Conditions place the property at the buyer's risk from the date of the contract. Ellis should therefore have addressed insurance from exchange rather than assuming that registration or completion determined contractual risk.",
    optionExplanations: [
      "Retention of legal title does not displace the express contractual risk allocation.",
      "Vacancy does not reverse the standard condition allocating risk to the buyer.",
      "Correct: the contractual risk passed to Ellis at exchange.",
      "Absence of fault does not create equal sharing under the standard condition.",
      "Accidental damage does not automatically terminate this contract.",
    ],
    authority: "Standard Conditions of Sale, fifth edition, condition 5.1.1.",
  },
  {
    id: "sqe1-flk2-pp-07",
    paper: "FLK2",
    subject: "property-practice",
    subtopic: "sdlt-vat",
    difficulty: "standard",
    prompt:
      "Harriet contracts to buy a freehold house in Bristol from Isaac. They exchange contracts in June, pay only an ordinary deposit, and complete in July. Harriet does not take possession, pay substantially all the price or otherwise substantially perform the contract before completion. She asks which event ordinarily fixes the effective date of the transaction for stamp duty land tax purposes. No special statutory rule or relief changes the ordinary position. Which answer should her solicitor give?",
    options: [
      "The date on which Harriet first instructs her solicitor.",
      "The date on which the seller accepts Harriet's offer.",
      "The date on which the parties exchange contracts.",
      "The date on which HM Land Registry registers Harriet as proprietor.",
      "The date on which the purchase is completed.",
    ],
    correctIndex: 4,
    explanation:
      "For an ordinary contract completed without prior substantial performance, the effective date is completion. Exchange alone and subsequent registration do not set the effective date on these facts.",
    optionExplanations: [
      "Instructing a solicitor is not the land transaction's effective date.",
      "Acceptance of an offer does not establish the effective date here.",
      "There has been no substantial performance making an earlier date relevant.",
      "Registration follows the transaction and is not the ordinary SDLT effective date.",
      "Correct: completion is the effective date in the stated circumstances.",
    ],
    authority: "Finance Act 2003, ss 44(3)–(5) and 119(1).",
  },
  {
    id: "sqe1-flk2-pp-08",
    paper: "FLK2",
    subject: "property-practice",
    subtopic: "post-completion",
    difficulty: "challenging",
    prompt:
      "Jamal buys an unregistered freehold cottage in England for value. His solicitor completes the transfer by deed but mistakenly treats the transaction as though registration were optional. No application for first registration is made within the statutory period, and the registrar has not extended that period. Jamal asks about the consequence for the legal estate transferred to him. Which statement most accurately describes the statutory position once the period has expired?",
    options: [
      "The transfer becomes void as regards the legal estate, which reverts to the transferor on a bare trust for Jamal.",
      "Jamal retains the legal estate indefinitely, but cannot mortgage the cottage.",
      "The transfer becomes void for all purposes and Jamal automatically loses every beneficial interest.",
      "The legal estate automatically vests in the Crown as ownerless property.",
      "The legal estate passes to Jamal automatically on expiry of the registration period.",
    ],
    correctIndex: 0,
    explanation:
      "A transfer of this kind triggers compulsory first registration, normally requiring an application within two months. Failure without an extension makes the transfer void as regards the legal estate, which reverts to the transferor to hold on bare trust for the transferee.",
    optionExplanations: [
      "Correct: this is the statutory consequence for a transfer of the legal estate.",
      "The failure affects ownership of the legal estate, not merely mortgageability.",
      "The statute preserves the transferee's beneficial position through a bare trust.",
      "There is no automatic vesting in the Crown.",
      "Expiry defeats the transfer of the legal estate rather than perfecting it.",
    ],
    authority: "Land Registration Act 2002, ss 4(1)(a), 6(1), (4)–(5) and 7(1)–(2).",
  },
  {
    id: "sqe1-flk2-pp-09",
    paper: "FLK2",
    subject: "property-practice",
    subtopic: "post-completion",
    difficulty: "standard",
    prompt:
      "Keira completes the purchase of a registered freehold warehouse from Leon. The transfer deed is validly executed and dated, the price is paid, and Keira receives possession. Her registration application is being prepared but has not yet been completed by HM Land Registry. There is no dispute about the contract or any competing disposition. Keira asks whether completion of the transfer deed alone has made her the legal owner of the registered estate. Which answer is correct?",
    options: [
      "She acquired the legal estate when the parties exchanged contracts.",
      "The transfer does not operate at law until the registration requirements are met.",
      "She acquired the legal estate solely by paying the purchase price.",
      "She acquired the legal estate solely by taking possession of the warehouse.",
      "Registration is optional because the transfer was made by deed.",
    ],
    correctIndex: 1,
    explanation:
      "A transfer of a registered estate is a disposition required to be completed by registration. Until that requirement is met, the disposition does not operate at law, notwithstanding completion of the conveyancing transaction.",
    optionExplanations: [
      "Exchange does not transfer the registered legal estate.",
      "Correct: registration is necessary for this transfer to operate at law.",
      "Payment of the price does not replace the registration requirement.",
      "Possession does not perfect a registrable transfer at law.",
      "Execution as a deed does not dispense with registration.",
    ],
    authority: "Land Registration Act 2002, s 27(1), (2)(a).",
  },

  {
    id: "sqe1-flk2-land-01",
    paper: "FLK2",
    subject: "land-law",
    subtopic: "estates-interests",
    difficulty: "core",
    prompt:
      "Maya owns a freehold house and wants her uncle, Nabil, to enjoy it for his lifetime, with her daughter taking the property after his death. Her solicitor is considering the distinction between legal estates and beneficial interests under a trust of land. Maya asks whether an estate limited to Nabil's life can itself exist as a legal estate under the modern statutory scheme. Which statement correctly identifies the estates capable of existing at law?",
    options: [
      "A fee simple absolute in possession and an estate for a person's life only.",
      "A term of years absolute and every beneficial interest under a trust.",
      "A fee simple absolute in possession, a life estate and a fee tail.",
      "A fee simple absolute in possession and a term of years absolute.",
      "A life estate and a fee tail, but not a fixed-term lease.",
    ],
    correctIndex: 3,
    explanation:
      "The only estates capable of subsisting or being conveyed or created at law are the fee simple absolute in possession and the term of years absolute. Nabil's proposed lifetime enjoyment would need to be structured as a beneficial interest rather than a legal life estate.",
    optionExplanations: [
      "A life estate is not one of the two permitted legal estates.",
      "Beneficial interests under trusts are not legal estates.",
      "Neither a life estate nor a fee tail can now subsist as a legal estate.",
      "Correct: these are the two statutory legal estates.",
      "The proposition excludes a permitted legal estate and includes two impermissible ones.",
    ],
    authority: "Law of Property Act 1925, s 1(1), (3).",
  },
  {
    id: "sqe1-flk2-land-02",
    paper: "FLK2",
    subject: "land-law",
    subtopic: "registered-unregistered",
    difficulty: "standard",
    prompt:
      "Olivia has a beneficial interest under a trust of her home and lives there openly. Her brother Patrick is the sole registered proprietor and sells the house to Quentin, who pays the purchase money to Patrick alone. Before completion, Quentin inspects the house and meets Olivia, whose occupation is obvious. He asks her no questions about her rights. Olivia remains in actual occupation at the time of the transfer, and her interest has not otherwise been released. What is the best analysis?",
    options: [
      "Her interest is automatically overreached because Patrick is the registered proprietor.",
      "Her interest binds Quentin as an overriding interest on the stated facts.",
      "Her interest binds only if she has registered a notice protecting the trust interest.",
      "Her occupation creates a legal lease regardless of the nature of her existing interest.",
      "Her interest is defeated because Quentin paid full market value.",
    ],
    correctIndex: 1,
    explanation:
      "Olivia's existing proprietary interest is coupled with actual occupation, and no stated Schedule 3 exception applies. Payment to a sole individual trustee has not overreached it, so Quentin takes subject to the overriding interest.",
    optionExplanations: [
      "Payment to a sole individual trustee does not satisfy the relevant overreaching requirement.",
      "Correct: her beneficial interest is protected by her actual occupation on these facts.",
      "Trust interests cannot be protected by notice, and actual occupation may protect priority.",
      "Actual occupation does not change her beneficial interest into a legal lease.",
      "Payment of value does not defeat an applicable overriding interest.",
    ],
    authority:
      "Land Registration Act 2002, ss 29, 33(a)(i) and Sch 3 para 2; Law of Property Act 1925, ss 2 and 27(2).",
  },
  {
    id: "sqe1-flk2-land-03",
    paper: "FLK2",
    subject: "land-law",
    subtopic: "co-ownership",
    difficulty: "standard",
    prompt:
      "Rosa and Sam hold their home as trustees and beneficial tenants in common in equal shares. After their relationship ends, Sam applies under TOLATA for an order for sale. Rosa remains there with their nine-year-old child. The property was bought as a family home, and no secured creditor is involved. Rosa believes the child's residence prevents the court from ordering a sale until the child reaches 18. Which advice best states the court's approach?",
    options: [
      "The child's welfare is relevant alongside the trust's purposes and the creators' intentions, but is not an absolute veto.",
      "The child's welfare is paramount and automatically prevents a sale before adulthood.",
      "Sam's equal beneficial share gives him an unconditional right to immediate sale.",
      "The court must ignore the original purpose because the relationship has ended.",
      "Only the registered trustees' financial contributions may be considered.",
    ],
    correctIndex: 0,
    explanation:
      "TOLATA permits an application for an order concerning trustees' functions, including sale. The statutory considerations include the creators' intentions, the trust's purposes and the welfare of a minor occupying or reasonably expected to occupy the property; welfare is not made paramount.",
    optionExplanations: [
      "Correct: the court weighs the relevant statutory considerations.",
      "The statute does not give the child's welfare paramount status or impose an automatic bar.",
      "An equal share does not confer an unconditional entitlement to immediate sale.",
      "The trust's purposes remain a statutory consideration.",
      "The inquiry is not confined to contributions.",
    ],
    authority: "Trusts of Land and Appointment of Trustees Act 1996, ss 14 and 15(1).",
  },
  {
    id: "sqe1-flk2-land-04",
    paper: "FLK2",
    subject: "land-law",
    subtopic: "easements",
    difficulty: "challenging",
    prompt:
      "Tessa owns a house beside a private ornamental garden owned by Umar. A proposed deed would give the house's successive owners a right to walk and sit in the garden. The garden would remain under Umar's possession and management, and the proposed use would not exclude him. The right would enhance the ordinary residential enjoyment of Tessa's house rather than merely benefit her business or personal preferences. Which statement best explains whether recreational use prevents the right from being an easement?",
    options: [
      "Every recreational right is incapable of being an easement.",
      "The right fails because an easement must increase the house's rental income.",
      "The right fails because dominant and servient land must share a boundary.",
      "The right is necessarily a licence because the servient land is a garden.",
      "Recreational use can accommodate the house and is not inherently inconsistent with an easement.",
    ],
    correctIndex: 4,
    explanation:
      "Re Ellenborough Park establishes that rights to use a communal garden may accommodate residential land. Recreation is not an automatic disqualification where the right benefits the dominant tenement and otherwise satisfies the characteristics of an easement.",
    optionExplanations: [
      "Recreational rights are not categorically excluded.",
      "A measurable increase in rental income is not an essential characteristic.",
      "The land must have a sufficient relationship, but need not share a boundary.",
      "The servient land's use as a garden does not make the right necessarily personal.",
      "Correct: ordinary residential enjoyment can satisfy the accommodation requirement.",
    ],
    authority: "Re Ellenborough Park [1956] Ch 131.",
  },
  {
    id: "sqe1-flk2-land-05",
    paper: "FLK2",
    subject: "land-law",
    subtopic: "easements",
    difficulty: "challenging",
    prompt:
      "Vera owns a workshop and adjoining yard. She lets the workshop to Will and expressly permits him to cross the retained yard to reach its rear loading door. Will regularly exercises that permission during the tenancy. Vera later conveys the workshop's freehold to Will by deed, retaining the yard. The conveyance says nothing about access and does not exclude section 62. The route is capable of existing as an easement and is not inconsistent with the conveyance. What is the strongest basis for Will's continuing right?",
    options: [
      "His previous permission automatically became an easement after one year's use.",
      "Every transfer of a workshop creates a right of way over all neighbouring land.",
      "Section 62 may elevate the previously enjoyed permission into an easement on the conveyance.",
      "A right of way can arise only if the conveyance uses the word 'easement'.",
      "The earlier tenancy prevents any access right arising on the freehold conveyance.",
    ],
    correctIndex: 2,
    explanation:
      "Section 62 can pass liberties and privileges enjoyed with conveyed land and, in appropriate circumstances, convert a prior permission into an easement. Will's separate occupation and established use before the freehold conveyance support that result, absent exclusion or inconsistency.",
    optionExplanations: [
      "There is no one-year rule automatically converting permission into an easement.",
      "The statute does not create unrestricted rights over all neighbouring land.",
      "Correct: section 62 provides the relevant mechanism on these facts.",
      "An easement may arise by statutory implication without that express wording.",
      "The tenancy and prior enjoyment support, rather than prevent, the section 62 argument.",
    ],
    authority: "Law of Property Act 1925, s 62(1), (4); Wright v Macadam [1949] 2 KB 744.",
  },
  {
    id: "sqe1-flk2-land-06",
    paper: "FLK2",
    subject: "land-law",
    subtopic: "easements",
    difficulty: "standard",
    prompt:
      "Xavier owns a single estate containing a farmhouse and a barn. For years he uses a clearly visible gravel track over the farmhouse land to reach the barn. He sells the barn to Yasmin and retains the farmhouse. The track use was continuous and apparent, reasonably necessary for the barn's enjoyment, and exercised for its benefit when the estate was divided. The conveyance excludes section 62 but contains no contrary intention concerning common-law implied grants. Which doctrine most directly supports Yasmin's claim to the track?",
    options: [
      "Prescription, because Xavier's use against himself counts as adverse user.",
      "Proprietary estoppel, because every subdivision contains an assurance of access.",
      "An implied reservation, because Yasmin retained the farmhouse land.",
      "The rule in Wheeldon v Burrows concerning implied grants of qualifying quasi-easements.",
      "Necessity alone, because reasonable convenience is identical to strict necessity.",
    ],
    correctIndex: 3,
    explanation:
      "On a grant of part, Wheeldon v Burrows may imply qualifying quasi-easements used by the common owner for the benefit of the part granted. The stated facts meet the relevant conditions, and excluding section 62 does not itself exclude this separate doctrine.",
    optionExplanations: [
      "An owner cannot acquire a prescriptive easement against their own land.",
      "No assurance and detrimental reliance establishing estoppel are stated.",
      "Yasmin receives the barn; this is a claimed grant, not a reservation for retained land.",
      "Correct: the pre-existing quasi-easement satisfies the stated requirements.",
      "Reasonable necessity under this doctrine is not identical to strict necessity.",
    ],
    authority: "Wheeldon v Burrows (1879) 12 Ch D 31.",
  },
  {
    id: "sqe1-flk2-land-07",
    paper: "FLK2",
    subject: "land-law",
    subtopic: "covenants",
    difficulty: "core",
    prompt:
      "Zara sells part of her registered garden to Adam, who covenants for the benefit of Zara's retained house not to use the transferred land for commercial purposes. The covenant identifies the benefited house, touches and concerns it, and is properly protected by a notice. Adam sells to Bella, who proposes opening a car repair business on the land. There is no contrary intention about the covenant's benefit passing with the house. Which statement best describes the position?",
    options: [
      "The restrictive burden can bind Bella in equity, and the benefit can pass with the identified house.",
      "The burden binds Bella at common law merely because she owns Adam's former land.",
      "The burden cannot bind Bella because only positive covenants bind successors in equity.",
      "The benefit automatically became personal to Zara and could never pass to a successor.",
      "The notice converts the restriction into a legal easement.",
    ],
    correctIndex: 0,
    explanation:
      "A restrictive covenant may bind a successor in equity where the relevant requirements, including protection of priority, are satisfied. Section 78 supports annexation of the benefit to sufficiently identified benefited land, absent a contrary intention.",
    optionExplanations: [
      "Correct: the facts support the equitable burden and an annexed benefit.",
      "The burden of this freehold covenant does not run at common law merely with ownership.",
      "The equitable doctrine concerns restrictive, not ordinary positive, burdens.",
      "The wording and identification of benefited land contradict an exclusively personal benefit.",
      "A notice protects priority; it does not change the covenant into an easement.",
    ],
    authority:
      "Tulk v Moxhay (1848) 2 Ph 774; Law of Property Act 1925, s 78; Federated Homes Ltd v Mill Lodge Properties Ltd [1980] 1 WLR 594.",
  },
  {
    id: "sqe1-flk2-land-08",
    paper: "FLK2",
    subject: "land-law",
    subtopic: "leases",
    difficulty: "standard",
    prompt:
      "Clara signs an agreement headed 'personal licence' allowing her to occupy a self-contained flat for 12 months at a monthly rent. In substance she has exclusive possession: the owner, Dev, retains no right to introduce other occupiers or move her elsewhere, and his entry rights are confined to genuine inspection and repair. There are no services requiring unrestricted access and no special family or employment arrangement. Dev says the document's heading conclusively prevents a tenancy. Which analysis is best?",
    options: [
      "It is a licence because the document uses that label.",
      "It is a licence because Dev retains a limited right to inspect and repair.",
      "It is a tenancy because the substance gives exclusive possession for a term at rent.",
      "It is a tenancy only if the occupation continues for more than three years.",
      "It is a licence because a tenancy requires the owner to live in the same building.",
    ],
    correctIndex: 2,
    explanation:
      "The substance of the arrangement, not its label, determines whether it is a tenancy. Exclusive possession for a fixed term at rent points to a tenancy here, and ordinary inspection and repair rights do not negate exclusive possession.",
    optionExplanations: [
      "The heading cannot override the substantive rights granted.",
      "Limited genuine access rights are compatible with exclusive possession.",
      "Correct: the substantive arrangement meets the ordinary tenancy characteristics.",
      "A tenancy can exist for a much shorter term.",
      "The owner's residence in the building is not a requirement for a tenancy.",
    ],
    authority: "Street v Mountford [1985] AC 809.",
  },
  {
    id: "sqe1-flk2-land-09",
    paper: "FLK2",
    subject: "land-law",
    subtopic: "mortgages",
    difficulty: "challenging",
    prompt:
      "Ethan mortgages a commercial investment property to a bank by deed. The mortgage money is due, the statutory power of sale is exercisable, and the bank markets the property openly. Its valuer identifies valuable planning permission for conversion, but the bank omits that information from the particulars and fails to tell bidders. The property consequently sells for substantially less than its proper market value. Ethan accepts that the bank could choose to sell at that time. What is his strongest complaint?",
    options: [
      "The bank was required to postpone sale until the property market reached its peak.",
      "The bank could sell only with Ethan's consent, despite the exercisable power.",
      "The bank was required to obtain the highest price imaginable regardless of market evidence.",
      "The bank became Ethan's trustee and had to subordinate its interests entirely to his.",
      "The bank failed to take reasonable care to obtain the property's true market value at the time of sale.",
    ],
    correctIndex: 4,
    explanation:
      "A mortgagee exercising its power of sale must take reasonable care to obtain the property's true market value at the time of sale. Omitting material planning potential can breach that duty, even though the mortgagee was entitled to choose when to sell.",
    optionExplanations: [
      "The mortgagee need not wait for an optimal future market.",
      "An exercisable power does not generally depend on the mortgagor's further consent.",
      "The duty concerns reasonable care and market value, not a guaranteed theoretical maximum.",
      "The mortgagee is not a trustee required wholly to disregard its own interests.",
      "Correct: the marketing omission supports a breach of the sale duty.",
    ],
    authority:
      "Law of Property Act 1925, ss 101 and 103; Cuckmere Brick Co Ltd v Mutual Finance Ltd [1971] Ch 949.",
  },

  {
    id: "sqe1-flk2-wills-01",
    paper: "FLK2",
    subject: "wills-estates",
    subtopic: "validity",
    difficulty: "core",
    prompt:
      "Fiona prepares a paper will at home. She signs it alone and later invites two neighbours, Grace and Hugo, to witness it. Both neighbours are physically present together when Fiona shows them her signature and expressly acknowledges it as her signature on her will. Each neighbour then signs as a witness in Fiona's physical presence. Fiona has testamentary capacity and intends her signature to give effect to the document. Is the will invalid merely because neither neighbour saw Fiona originally sign it?",
    options: [
      "Yes, because witnesses must always see the original act of signing.",
      "No, because acknowledging her signature before both witnesses together satisfies that aspect of execution.",
      "Yes, because a will signed before witnesses arrive can be validated only by a solicitor.",
      "No, because witnesses are unnecessary when the testator signs every page.",
      "Yes, because acknowledgement is permitted only for a signature made by someone else.",
    ],
    correctIndex: 1,
    explanation:
      "Section 9 permits the testator either to sign or to acknowledge their signature in the presence of two witnesses present at the same time. The witnesses then attest and sign in the testator's presence, as happened here.",
    optionExplanations: [
      "Acknowledgement of an existing signature is expressly permitted.",
      "Correct: Fiona acknowledged her signature to both witnesses together.",
      "A solicitor's participation is not a statutory execution requirement.",
      "Signing every page does not dispense with witnessing requirements.",
      "Acknowledgement is not confined to signatures made by another person.",
    ],
    authority: "Wills Act 1837, s 9.",
  },
  {
    id: "sqe1-flk2-wills-02",
    paper: "FLK2",
    subject: "wills-estates",
    subtopic: "validity",
    difficulty: "core",
    prompt:
      "Imran validly executes a will leaving his estate to his sister. Three years later he marries Julia in a legally valid marriage. The will contains no reference to Julia, no contemplation-of-marriage wording and nothing showing an intention that it should survive a marriage to her. Imran makes no later will or codicil and dies while still married to Julia. His sister asks whether the earlier will remains effective simply because Imran never physically destroyed it. Which answer is correct?",
    options: [
      "The will remains effective because revocation always requires physical destruction.",
      "The will remains effective because marriage affects gifts to spouses only.",
      "The will is suspended during marriage but automatically revives on death.",
      "The will remains effective unless Julia proves that Imran intended to revoke it.",
      "The marriage revoked the will because no relevant contemplation-of-marriage exception applies.",
    ],
    correctIndex: 4,
    explanation:
      "Marriage generally revokes an existing will. The exception for a will made in contemplation of marriage to a particular person does not apply on these facts, and physical destruction is unnecessary.",
    optionExplanations: [
      "Marriage is an independent statutory method of revocation.",
      "The effect is not confined to gifts involving the spouse.",
      "The statute does not merely suspend the will until death.",
      "Revocation does not depend on Julia proving a separate intention to revoke.",
      "Correct: the ordinary statutory revocation rule applies.",
    ],
    authority: "Wills Act 1837, s 18.",
  },
  {
    id: "sqe1-flk2-wills-03",
    paper: "FLK2",
    subject: "wills-estates",
    subtopic: "validity",
    difficulty: "standard",
    prompt:
      "Kavita's validly executed will gives £12,000 to her friend Lewis and leaves residue to a charity. Lewis's wife, Mabel, is one of the two attesting witnesses; the other witness is independent. Lewis and Mabel were married when the will was executed. Neither receives any other benefit, and no other relevant circumstance affects validity. After Kavita's death, Lewis argues that his legacy is safe because he did not personally witness the will. What is the effect of Mabel's attestation?",
    options: [
      "The whole will is void because a witness is married to a beneficiary.",
      "The legacy remains valid because Lewis himself did not attest.",
      "Mabel automatically receives the legacy in place of Lewis.",
      "Lewis's legacy is void, but the will is not invalid merely for that reason.",
      "The charitable residue is void, but Lewis's legacy remains effective.",
    ],
    correctIndex: 3,
    explanation:
      "Section 15 invalidates a beneficial gift to an attesting witness or that witness's spouse or civil partner. It does not invalidate the whole will, and Lewis cannot avoid the rule by pointing out that only Mabel witnessed it.",
    optionExplanations: [
      "The statutory consequence affects the gift, not the entire will.",
      "The rule extends to the witness's spouse.",
      "The witness does not acquire the void gift.",
      "Correct: the gift to Lewis fails while the will otherwise remains effective.",
      "Mabel's attestation does not invalidate the independent charity's residuary gift.",
    ],
    authority: "Wills Act 1837, s 15.",
  },
  {
    id: "sqe1-flk2-wills-04",
    paper: "FLK2",
    subject: "wills-estates",
    subtopic: "intestacy",
    difficulty: "standard",
    prompt:
      "Noah dies intestate, domiciled in England and Wales. He has no surviving spouse or civil partner. His daughter, Olivia, survives him. His son, Peter, died before him leaving two children, Quinn and Rose, both of whom survive Noah and are adults. There are no other descendants and no issue about survivorship. After payment of liabilities, the personal representatives must distribute the residuary estate under the statutory trusts. How should it be divided?",
    options: [
      "Olivia receives one half; Quinn and Rose each receive one quarter.",
      "Olivia, Quinn and Rose each receive one third.",
      "Olivia receives the whole estate because grandchildren cannot inherit while any child survives.",
      "Quinn and Rose each receive one half, and Olivia receives nothing.",
      "Olivia receives one quarter; Quinn and Rose each receive three eighths.",
    ],
    correctIndex: 0,
    explanation:
      "With no surviving spouse or civil partner, the estate passes to issue on the statutory trusts. Distribution is by family branch: Olivia takes her half, and Peter's children share the half he would have taken.",
    optionExplanations: [
      "Correct: Peter's descendants represent his branch and divide its half equally.",
      "Distribution is not equally per capita across the surviving generations.",
      "Grandchildren can represent a predeceased child despite another child surviving.",
      "Olivia remains entitled to her own branch's share.",
      "There is no basis for assigning three quarters of the estate to Peter's branch.",
    ],
    authority: "Administration of Estates Act 1925, ss 46(1)(ii) and 47(1).",
  },
  {
    id: "sqe1-flk2-wills-05",
    paper: "FLK2",
    subject: "wills-estates",
    subtopic: "validity",
    difficulty: "challenging",
    prompt:
      "Saira's will gives £90,000 to her son Tariq and leaves residue to her friend Uma. Tariq dies before Saira, leaving two children, Veda and Yusuf, both alive when Saira later dies. The will contains no substitution clause, survivorship condition or other wording indicating that the gift should fail if Tariq predeceases Saira. The legacy is not a class gift, and there are no other relevant provisions. Who is entitled to the £90,000 legacy?",
    options: [
      "Uma, because every gift to a person who predeceases the testator lapses into residue.",
      "Tariq's personal representatives, for distribution under his own will.",
      "Veda and Yusuf, equally, under the statutory substitution rule for a deceased child's issue.",
      "Saira's intestacy beneficiaries, because a failed pecuniary legacy cannot enter residue.",
      "Veda alone, if she is older than Yusuf.",
    ],
    correctIndex: 2,
    explanation:
      "Section 33 prevents lapse of a gift to the testator's child or remoter descendant who dies leaving issue alive at the testator's death, unless a contrary intention appears. Veda and Yusuf therefore take Tariq's gift equally in the stated circumstances.",
    optionExplanations: [
      "The anti-lapse provision is an exception to the ordinary lapse rule.",
      "The substitution operates in favour of qualifying issue, not Tariq's estate.",
      "Correct: the statutory conditions are satisfied and no contrary intention appears.",
      "The gift does not fail, and the suggested rule about residue is also incorrect.",
      "Age priority does not determine their shares.",
    ],
    authority: "Wills Act 1837, s 33(1), (3).",
  },
  {
    id: "sqe1-flk2-wills-06",
    paper: "FLK2",
    subject: "wills-estates",
    subtopic: "iht",
    difficulty: "standard",
    prompt:
      "William gives his adult daughter Xanthe a cash gift outright. He retains no benefit, and the gift is not made through a trust or as part of associated arrangements. Assume that no exemption applies, that the gift qualifies as a potentially exempt transfer, and that the relevant statutory rules remain applicable. William survives for eight complete years after making the gift and then dies. Xanthe asks how the gift is treated for inheritance tax. Which answer is correct?",
    options: [
      "It becomes chargeable solely because William eventually dies.",
      "It becomes an exempt transfer because William survived seven years after making it.",
      "It is automatically added to William's death estate because Xanthe is his daughter.",
      "It remains a chargeable lifetime transfer regardless of his survival.",
      "It is taxed as Xanthe's income in place of inheritance tax.",
    ],
    correctIndex: 1,
    explanation:
      "An otherwise qualifying potentially exempt transfer becomes exempt if the transferor survives seven years. William's eight-year survival therefore makes this gift exempt, and the absence of retained benefit avoids a reservation-of-benefit issue on these facts.",
    optionExplanations: [
      "Death after the seven-year period does not itself make this PET chargeable.",
      "Correct: the required survival period has been exceeded.",
      "The parent-child relationship does not bring an outright exempt gift back into the estate.",
      "The question identifies the transfer as a PET, not an immediately chargeable transfer.",
      "An outright capital gift is not converted into taxable income by the PET rules.",
    ],
    authority: "Inheritance Tax Act 1984, s 3A(1), (4).",
  },
  {
    id: "sqe1-flk2-wills-07",
    paper: "FLK2",
    subject: "wills-estates",
    subtopic: "administration",
    difficulty: "core",
    prompt:
      "Yvonne dies leaving a valid will appointing her friend Zain as sole executor. Zain is an adult with capacity, wishes to act, and has not renounced or been passed over. The estate includes a sole-name investment account whose provider requires a grant before releasing the funds. There is no dispute about the will and no reason for a special or limited grant. Which form of grant should Zain ordinarily apply for in order to prove the will and administer the estate?",
    options: [
      "Letters of administration on intestacy.",
      "Letters of administration with the will annexed, because every will requires that grant.",
      "A grant of representation to the residuary beneficiary instead of the executor.",
      "A grant of probate to Zain as the proving executor.",
      "A grant appointing the investment provider as personal representative.",
    ],
    correctIndex: 3,
    explanation:
      "A willing and competent executor appointed by a valid will ordinarily proves the will by obtaining probate. Letters of administration with the will annexed are relevant where administration is needed but no executor proves.",
    optionExplanations: [
      "Yvonne did not die intestate.",
      "An appointed executor willing and able to prove ordinarily receives probate.",
      "The residuary beneficiary does not displace the available appointed executor.",
      "Correct: probate is the appropriate ordinary grant.",
      "The account provider's demand for a grant does not appoint it as representative.",
    ],
    authority: "Non-Contentious Probate Rules 1987, SI 1987/2024, r 20.",
  },
  {
    id: "sqe1-flk2-wills-08",
    paper: "FLK2",
    subject: "wills-estates",
    subtopic: "intestacy",
    difficulty: "challenging",
    prompt:
      "Aisha's father dies domiciled in England and Wales. Aisha is an adult child considering a claim for reasonable financial provision under the Inheritance (Provision for Family and Dependants) Act 1975. An ordinary grant of probate is first taken out on 10 January. There is no earlier grant, no relevant special-grant issue and no agreement affecting proceedings. Aisha consults a solicitor eight months after that grant without having issued an application. Which statement best describes the limitation position?",
    options: [
      "She remains within time because the ordinary period is 12 months from death.",
      "She remains within time because adult children have six years from the grant.",
      "She is absolutely barred because the court has no power to permit a late application.",
      "Time has not started because it runs only from completion of administration.",
      "The ordinary six-month period from the first grant has expired, so she needs the court's permission to apply.",
    ],
    correctIndex: 4,
    explanation:
      "Section 4 generally requires an application within six months from the date representation is first taken out. The court may permit an application after that period, so Aisha needs permission rather than being automatically and absolutely barred.",
    optionExplanations: [
      "The ordinary statutory period is not 12 months from death.",
      "Adult children do not receive a separate six-year period under this provision.",
      "The court has an express power to permit a late application.",
      "Completion of administration is not the statutory starting point.",
      "Correct: the ordinary period has expired but permission remains possible.",
    ],
    authority:
      "Inheritance (Provision for Family and Dependants) Act 1975, s 4.",
  },

  {
    id: "sqe1-flk2-eth-01",
    paper: "FLK2",
    subject: "ethics",
    subtopic: "conflicts",
    difficulty: "standard",
    prompt:
      "Solicitor Beth is asked to represent both Colin, who is selling a house, and Dana, who is buying it. They are unrelated and are negotiating whether Colin must pay for serious structural repairs and give an indemnity about disputed access. Each wants Beth to secure terms at the other's expense. Beth identifies an actual conflict, and neither the substantially-common-interest exception nor the same-objective exception applies. Both clients nevertheless offer informed written consent to joint representation. What should Beth do?",
    options: [
      "Decline to act for both in the conflicted transaction because consent alone does not satisfy an exception.",
      "Act for both because informed written consent always cures a client conflict.",
      "Act for both if she charges each client exactly the same fee.",
      "Act for both if each agrees not to complain about the negotiated outcome.",
      "Act for both because every seller and buyer share a substantially common interest in completing.",
    ],
    correctIndex: 0,
    explanation:
      "Paragraph 6.2 prohibits acting where there is a conflict or significant risk unless a specified exception and its conditions apply. Written consent is not a freestanding exception, and the facts expressly exclude both available exceptions.",
    optionExplanations: [
      "Correct: joint consent cannot authorise acting outside the permitted exceptions.",
      "Consent is necessary within an exception but is not sufficient by itself.",
      "Equal fees do not remove conflicting duties to the clients.",
      "A waiver of complaints cannot disapply the professional conflict rule.",
      "A shared wish to complete does not automatically establish the required substantially common interest.",
    ],
    authority:
      "SRA Code of Conduct for Solicitors, RELs and RFLs, para 6.2(a)–(b), (i)–(iii).",
  },
  {
    id: "sqe1-flk2-eth-02",
    paper: "FLK2",
    subject: "ethics",
    subtopic: "conflicts",
    difficulty: "core",
    prompt:
      "Solicitor Elena completed the administration of Farid's estate for his executor, Grace. Months after the retainer ends, a local journalist asks Elena to confirm confidential details Grace supplied about the estate's beneficiaries and a family dispute. None of the information is public. Grace has not authorised disclosure, and no law requires or permits Elena to disclose it. The journalist says the story would help explain a controversial local property sale. What is Elena's professional obligation?",
    options: [
      "Disclose the information because the administration retainer has ended.",
      "Disclose the information if the journalist promises not to name Grace.",
      "Disclose the information because public interest in a property sale always overrides confidentiality.",
      "Keep the information confidential despite the retainer having ended.",
      "Disclose the information if no beneficiary can prove immediate financial loss.",
    ],
    correctIndex: 3,
    explanation:
      "The confidentiality duty covers current and former clients' affairs. It continues after the retainer ends, and the facts provide neither client consent nor a legal basis permitting or requiring disclosure.",
    optionExplanations: [
      "Ending the retainer does not end the confidentiality duty.",
      "A promise about attribution does not authorise disclosure of confidential information.",
      "Journalistic interest does not itself supply a legal exception.",
      "Correct: the continuing confidentiality duty applies.",
      "The duty does not depend on proof of immediate financial loss.",
    ],
    authority:
      "SRA Code of Conduct for Solicitors, RELs and RFLs, para 6.3.",
  },
  {
    id: "sqe1-flk2-eth-03",
    paper: "FLK2",
    subject: "ethics",
    subtopic: "duties-court",
    difficulty: "standard",
    prompt:
      "Hassan, a solicitor acting as a sole practitioner for a seller, personally gives the buyer's solicitor an unqualified professional undertaking to discharge a specified mortgage from the completion money immediately after completion. Completion occurs and sufficient money is available. The seller then instructs Hassan to pay all the proceeds to the seller instead and says the mortgage can wait. The buyer's solicitor has not released or varied the undertaking. What must Hassan do?",
    options: [
      "Follow the seller's later instruction because client instructions override professional undertakings.",
      "Perform the undertaking within the agreed timescale despite the seller's contrary instruction.",
      "Treat the undertaking as cancelled because the seller has withdrawn authority.",
      "Delay indefinitely unless the buyer's solicitor obtains a court order.",
      "Retain only enough money for his fees and pay the remaining proceeds to the seller.",
    ],
    correctIndex: 1,
    explanation:
      "A solicitor must perform undertakings within the agreed timescale, or within a reasonable time if none is agreed. Hassan's personal, unqualified undertaking is not cancelled by the client's subsequent contrary instruction.",
    optionExplanations: [
      "Client instructions do not override the obligation to perform the undertaking.",
      "Correct: Hassan must honour the undertaking he gave.",
      "The client's change of mind does not unilaterally release the undertaking.",
      "Compliance is required without waiting for enforcement proceedings.",
      "Paying away the funds needed for discharge would fail to perform the undertaking.",
    ],
    authority:
      "SRA Code of Conduct for Solicitors, RELs and RFLs, para 1.3.",
  },
  {
    id: "sqe1-flk2-eth-04",
    paper: "FLK2",
    subject: "ethics",
    subtopic: "regulation",
    difficulty: "standard",
    prompt:
      "Isla instructs solicitor Jonah to advise on an application for a grant of representation. At engagement, Jonah explains his hourly rate and the likely work but provides no complaints information. He says the firm supplies that information only if a client later becomes dissatisfied. Isla has never used a solicitor before and asks what written complaints information should have been supplied at the outset. Which answer correctly identifies the required information?",
    options: [
      "Only the name of the person who will send the final bill.",
      "Only the firm's internal complaints procedure, with external redress explained after proceedings begin.",
      "Her right to complain about services and charges, how and to whom to complain, and any right to complain to the Legal Ombudsman and when.",
      "Only a statement that she must sue the firm if she disputes its service.",
      "Only the SRA's address, because it determines every complaint about a solicitor's bill.",
    ],
    correctIndex: 2,
    explanation:
      "Clients must receive the specified complaints information in writing at engagement. Explaining costs alone does not satisfy the separate obligation to explain internal complaints and any available Legal Ombudsman route.",
    optionExplanations: [
      "Identifying a billing contact is not the required complaints information.",
      "Relevant external redress information is required at engagement, not only after proceedings begin.",
      "Correct: this identifies the information required by the Code at engagement.",
      "Court proceedings are not the only avenue for resolving service or charges complaints.",
      "The SRA is not the universal adjudicator of individual service and bill complaints.",
    ],
    authority:
      "SRA Code of Conduct for Solicitors, RELs and RFLs, para 8.3(a)–(c).",
  },
];
