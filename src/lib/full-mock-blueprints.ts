// Blueprints for Full Exam Simulations (UBE + SQE).
// These describe section structure, counts and durations. The actual
// questions are generated from src/lib/full-mock-questions.ts.

export type Pathway = "UBE" | "SQE";

export type SectionKind = "mcq" | "essay" | "mpt";

export type SectionBlueprint = {
  id: string;            // stable id, used as section_type
  title: string;
  kind: SectionKind;
  questions: number;
  durationSeconds: number;
  optionsCount: 4 | 5;   // MBE = 4, SQE = 5
  description: string;
};

export type SimulationBlueprint = {
  pathway: Pathway;
  examType: string;             // e.g. "Full UBE Simulation"
  totalDurationLabel: string;   // "12 hours"
  sections: SectionBlueprint[];
};

export const UBE_FULL: SimulationBlueprint = {
  pathway: "UBE",
  examType: "Full UBE Simulation",
  totalDurationLabel: "12 hours",
  sections: [
    {
      id: "mbe-am",
      title: "MBE Morning",
      kind: "mcq",
      questions: 100,
      durationSeconds: 3 * 60 * 60,
      optionsCount: 4,
      description: "100 single-best-answer questions across the seven MBE subjects.",
    },
    {
      id: "mbe-pm",
      title: "MBE Afternoon",
      kind: "mcq",
      questions: 100,
      durationSeconds: 3 * 60 * 60,
      optionsCount: 4,
      description: "100 single-best-answer questions across the seven MBE subjects.",
    },
    {
      id: "mee",
      title: "MEE Essays",
      kind: "essay",
      questions: 6,
      durationSeconds: 3 * 60 * 60,
      optionsCount: 4,
      description: "Six 30-minute essay prompts on MEE-tested subjects.",
    },
    {
      id: "mpt",
      title: "MPT Tasks",
      kind: "mpt",
      questions: 2,
      durationSeconds: 3 * 60 * 60,
      optionsCount: 4,
      description: "Two closed-library lawyering tasks (90 minutes each).",
    },
  ],
};

/**
 * Legacy SQE1 format (sittings up to and including July 2026): 180 questions
 * per FLK as two 90-question sessions, every FLK subject in both sessions.
 * Kept only so simulations started under it still resolve their sections,
 * question counts and results. New simulations never use it.
 */
export const SQE_FULL_LEGACY: SimulationBlueprint = {
  pathway: "SQE",
  examType: "Full SQE1 Simulation",
  totalDurationLabel: "~10 hours",
  sections: [
    { id: "flk1-b1", title: "FLK1 — Block 1", kind: "mcq", questions: 90, durationSeconds: 153 * 60, optionsCount: 5, description: "90 SBA questions across FLK1 subjects." },
    { id: "flk1-b2", title: "FLK1 — Block 2", kind: "mcq", questions: 90, durationSeconds: 153 * 60, optionsCount: 5, description: "90 SBA questions across FLK1 subjects." },
    { id: "flk2-b1", title: "FLK2 — Block 1", kind: "mcq", questions: 90, durationSeconds: 153 * 60, optionsCount: 5, description: "90 SBA questions across FLK2 subjects." },
    { id: "flk2-b2", title: "FLK2 — Block 2", kind: "mcq", questions: 90, durationSeconds: 153 * 60, optionsCount: 5, description: "90 SBA questions across FLK2 subjects." },
  ],
};

/**
 * SQE1 format from the January 2027 sitting onwards (SRA, 10 Sept 2026):
 * 170 questions per FLK as two 85-question sessions of 2h 33m. Each session
 * tests only its own subjects, randomised within the session; Ethics and
 * Professional Conduct stays pervasive and can appear in any session.
 * Source: https://sqe.sra.org.uk/news-item/2026/09/10/important-changes-to-sqe1-for-january-2027-onwards
 */
export const SQE1_2027_SESSION_SUBJECTS: Record<string, string[]> = {
  "flk1-s1": ["Business Law and Practice", "Dispute Resolution", "Legal Services"],
  "flk1-s2": ["Tort", "Contract Law", "Legal Systems (Legal System of England and Wales; Constitutional and Administrative Law and EU Law)"],
  "flk2-s1": ["Wills and the Administration of Estates", "Solicitors Accounts (in the context of Wills)", "Trusts Law", "Land Law"],
  "flk2-s2": ["Property Law and Practice", "Solicitors Accounts (in the context of Property)", "Criminal Liability", "Criminal Law and Practice"],
};

function sqe2027Session(id: string, title: string): SectionBlueprint {
  const subjects = SQE1_2027_SESSION_SUBJECTS[id]!;
  return {
    id,
    title,
    kind: "mcq",
    questions: 85,
    durationSeconds: 153 * 60,
    optionsCount: 5,
    description: `85 SBA questions, mixed in random order: ${subjects.join("; ")}. Ethics can appear throughout.`,
  };
}

export const SQE_FULL: SimulationBlueprint = {
  pathway: "SQE",
  examType: "Full SQE1 Simulation",
  totalDurationLabel: "~10 hours",
  sections: [
    sqe2027Session("flk1-s1", "FLK1 — Session 1"),
    sqe2027Session("flk1-s2", "FLK1 — Session 2"),
    sqe2027Session("flk2-s1", "FLK2 — Session 1"),
    sqe2027Session("flk2-s2", "FLK2 — Session 2"),
  ],
};

/** Questions per FLK and in total for the current SQE1 format. */
export const SQE1_QUESTIONS_PER_FLK = 170;
export const SQE1_QUESTIONS_TOTAL = 340;

/** Blueprint for NEW simulations. Every remaining SQE1 sitting is January 2027 or later. */
export function getBlueprint(pathway: Pathway): SimulationBlueprint {
  return pathway === "UBE" ? UBE_FULL : SQE_FULL;
}

/**
 * Blueprint an existing simulation was created under, worked out from its
 * saved section ids, so simulations started in the legacy format keep their
 * own counts and results.
 */
export function getBlueprintForSections(
  pathway: Pathway,
  sectionTypes: readonly string[],
): SimulationBlueprint {
  if (pathway === "SQE" && sectionTypes.some((t) => SQE_FULL_LEGACY.sections.some((s) => s.id === t))) {
    return SQE_FULL_LEGACY;
  }
  return getBlueprint(pathway);
}

/**
 * Short timed mocks run in the same simulation runner (timer, autosave, resume,
 * results) as full mocks, but are not part of the full blueprint. MCQ minis use
 * the full paper's average pace (SQE1 153 min / 85 Qs and MBE 180 min / 100 Qs
 * are both 1.8 min per question, so 10 Qs = 18 min). One MEE essay is 30 min,
 * one MPT task is 90 min.
 *
 * "-v2" ids draw 10 distinct items per attempt with shuffled options (seeded by
 * the saved section id). The unversioned ids are kept only so attempts saved
 * before v2 still resolve to their original questions and scores.
 */
export const MINI_SECTIONS: Record<Pathway, SectionBlueprint[]> = {
  SQE: [
    { id: "flk1-mini-v2", title: "FLK1 Mini Mock", kind: "mcq", questions: 10, durationSeconds: 18 * 60, optionsCount: 5, description: "10 different SBA questions across FLK1 subjects, timed at the full paper's average of 1.8 min per question." },
    { id: "flk2-mini-v2", title: "FLK2 Mini Mock", kind: "mcq", questions: 10, durationSeconds: 18 * 60, optionsCount: 5, description: "10 different SBA questions across FLK2 subjects, timed at the full paper's average of 1.8 min per question." },
  ],
  UBE: [
    { id: "mbe-mini-v2", title: "MBE Mini Mock", kind: "mcq", questions: 10, durationSeconds: 18 * 60, optionsCount: 4, description: "10 different MBE questions across the seven MBE subjects, timed at the full MBE's average of 1.8 min per question." },
    { id: "mee-mini-v2", title: "Mini MEE", kind: "essay", questions: 1, durationSeconds: 30 * 60, optionsCount: 4, description: "One MEE essay in 30 minutes, the suggested time per essay on exam day." },
    { id: "mpt-mini-v2", title: "Mini MPT", kind: "mpt", questions: 1, durationSeconds: 90 * 60, optionsCount: 4, description: "One closed-library MPT task in 90 minutes, the time allowed per task on exam day." },
  ],
};

/** Pre-v2 mini sections: resolvable for saved attempts, never offered for new ones. */
const LEGACY_MINI_SECTIONS: Record<Pathway, SectionBlueprint[]> = {
  SQE: [
    { id: "flk1-mini", title: "FLK1 Mini Mock", kind: "mcq", questions: 10, durationSeconds: 18 * 60, optionsCount: 5, description: "10 SBA questions across FLK1 subjects." },
    { id: "flk2-mini", title: "FLK2 Mini Mock", kind: "mcq", questions: 10, durationSeconds: 18 * 60, optionsCount: 5, description: "10 SBA questions across FLK2 subjects." },
  ],
  UBE: [
    { id: "mbe-mini", title: "MBE Mini Mock", kind: "mcq", questions: 10, durationSeconds: 18 * 60, optionsCount: 4, description: "10 MBE questions." },
    { id: "mee-mini", title: "Mini MEE", kind: "essay", questions: 1, durationSeconds: 30 * 60, optionsCount: 4, description: "One MEE essay in 30 minutes." },
    { id: "mpt-mini", title: "Mini MPT", kind: "mpt", questions: 1, durationSeconds: 90 * 60, optionsCount: 4, description: "One closed-library MPT task in 90 minutes." },
  ],
};

/** Mini sections whose questions are drawn fresh per attempt. */
export function isSeededMini(sectionId: string): boolean {
  return /-mini-v2$/.test(sectionId);
}

export function getMiniSection(pathway: Pathway, sectionId: string): SectionBlueprint | undefined {
  return MINI_SECTIONS[pathway].find((s) => s.id === sectionId)
    ?? LEGACY_MINI_SECTIONS[pathway].find((s) => s.id === sectionId);
}

export function getSection(pathway: Pathway, sectionId: string): SectionBlueprint | undefined {
  const current = getBlueprint(pathway).sections.find((s) => s.id === sectionId) ?? getMiniSection(pathway, sectionId);
  if (current || pathway !== "SQE") return current;
  return SQE_FULL_LEGACY.sections.find((s) => s.id === sectionId);
}
