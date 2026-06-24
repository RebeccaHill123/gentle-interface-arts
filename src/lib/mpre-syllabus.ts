// MPRE — Multistate Professional Responsibility Examination
// 60 MCQs covering ABA Model Rules + Code of Judicial Conduct.

export interface MpreSubtopic {
  id: string;
  name: string;
}

export interface MpreSubject {
  id: string;
  name: string;
  weight: number; // share of MPRE marks (~)
  subtopics: MpreSubtopic[];
}

export const MPRE_SYLLABUS: MpreSubject[] = [
  {
    id: "conflicts",
    name: "Conflicts of Interest",
    weight: 0.14,
    subtopics: [
      { id: "current-clients", name: "Current-client conflicts" },
      { id: "former-clients", name: "Former-client conflicts" },
      { id: "imputed", name: "Imputed disqualification & screening" },
      { id: "business-trans", name: "Business transactions with clients" },
    ],
  },
  {
    id: "confidentiality",
    name: "Client–Lawyer Relationship & Confidentiality",
    weight: 0.13,
    subtopics: [
      { id: "duty", name: "Duty of confidentiality (Rule 1.6)" },
      { id: "exceptions", name: "Permissive & mandatory disclosures" },
      { id: "privilege", name: "Attorney-client privilege vs confidentiality" },
      { id: "formation", name: "Formation & scope of representation" },
    ],
  },
  {
    id: "competence",
    name: "Competence, Diligence & Communication",
    weight: 0.1,
    subtopics: [
      { id: "competence", name: "Competence & legal knowledge (Rule 1.1)" },
      { id: "diligence", name: "Diligence & workload (Rule 1.3)" },
      { id: "communication", name: "Communication with clients (Rule 1.4)" },
      { id: "malpractice", name: "Malpractice & limiting liability" },
    ],
  },
  {
    id: "client-funds",
    name: "Client Funds, Property & Fees",
    weight: 0.1,
    subtopics: [
      { id: "trust-accounts", name: "Trust accounts & safekeeping (Rule 1.15)" },
      { id: "fees", name: "Reasonable fees & fee agreements (Rule 1.5)" },
      { id: "contingency", name: "Contingency fees & restrictions" },
      { id: "fee-splitting", name: "Fee splitting with other lawyers" },
    ],
  },
  {
    id: "litigation",
    name: "Litigation & Other Forms of Advocacy",
    weight: 0.12,
    subtopics: [
      { id: "candor", name: "Candor toward the tribunal (Rule 3.3)" },
      { id: "fairness", name: "Fairness to opposing party (Rule 3.4)" },
      { id: "trial-publicity", name: "Trial publicity & jurors" },
      { id: "frivolous", name: "Frivolous claims & meritorious contentions" },
    ],
  },
  {
    id: "different-roles",
    name: "Different Roles of the Lawyer",
    weight: 0.1,
    subtopics: [
      { id: "advisor", name: "Lawyer as advisor & evaluator" },
      { id: "negotiator", name: "Lawyer as negotiator (Rule 4.1)" },
      { id: "third-persons", name: "Dealings with represented & unrepresented persons" },
      { id: "prosecutor", name: "Special responsibilities of a prosecutor" },
    ],
  },
  {
    id: "transactions-non-clients",
    name: "Transactions with Persons Other than Clients",
    weight: 0.08,
    subtopics: [
      { id: "truthful", name: "Truthfulness in statements (Rule 4.1)" },
      { id: "contact-represented", name: "Contact with represented persons (Rule 4.2)" },
      { id: "unrepresented", name: "Dealing with unrepresented persons (Rule 4.3)" },
    ],
  },
  {
    id: "law-firms",
    name: "Law Firms & Associations",
    weight: 0.08,
    subtopics: [
      { id: "supervision", name: "Supervisory & subordinate lawyers" },
      { id: "non-lawyer", name: "Responsibilities re non-lawyer assistants" },
      { id: "restrictions", name: "Restrictions on right to practice" },
    ],
  },
  {
    id: "regulation",
    name: "Regulation of the Legal Profession",
    weight: 0.08,
    subtopics: [
      { id: "admission", name: "Admission & maintenance of license" },
      { id: "discipline", name: "Disciplinary authority & reporting (Rule 8.3)" },
      { id: "uap", name: "Unauthorized & multijurisdictional practice (Rule 5.5)" },
      { id: "misconduct", name: "Misconduct (Rule 8.4)" },
    ],
  },
  {
    id: "judicial-conduct",
    name: "Judicial Conduct",
    weight: 0.07,
    subtopics: [
      { id: "impartiality", name: "Impartiality & disqualification" },
      { id: "extrajudicial", name: "Extrajudicial activities" },
      { id: "political", name: "Political & campaign activity of judges" },
    ],
  },
];

export function getMpreSubjects(): { name: string; component?: string }[] {
  return MPRE_SYLLABUS.map((s) => ({ name: s.name, component: "MPRE" }));
}

export function getMpreSubjectByName(name: string): MpreSubject | undefined {
  return MPRE_SYLLABUS.find((s) => s.name === name);
}
