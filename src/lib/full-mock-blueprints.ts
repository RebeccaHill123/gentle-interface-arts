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

export const SQE_FULL: SimulationBlueprint = {
  pathway: "SQE",
  examType: "Full SQE1 Simulation",
  totalDurationLabel: "~10 hours",
  sections: [
    {
      id: "flk1-b1",
      title: "FLK1 — Block 1",
      kind: "mcq",
      questions: 90,
      durationSeconds: 153 * 60,
      optionsCount: 5,
      description: "90 SBA questions across FLK1 subjects.",
    },
    {
      id: "flk1-b2",
      title: "FLK1 — Block 2",
      kind: "mcq",
      questions: 90,
      durationSeconds: 153 * 60,
      optionsCount: 5,
      description: "90 SBA questions across FLK1 subjects.",
    },
    {
      id: "flk2-b1",
      title: "FLK2 — Block 1",
      kind: "mcq",
      questions: 90,
      durationSeconds: 153 * 60,
      optionsCount: 5,
      description: "90 SBA questions across FLK2 subjects.",
    },
    {
      id: "flk2-b2",
      title: "FLK2 — Block 2",
      kind: "mcq",
      questions: 90,
      durationSeconds: 153 * 60,
      optionsCount: 5,
      description: "90 SBA questions across FLK2 subjects.",
    },
  ],
};

export function getBlueprint(pathway: Pathway): SimulationBlueprint {
  return pathway === "UBE" ? UBE_FULL : SQE_FULL;
}

export function getSection(pathway: Pathway, sectionId: string): SectionBlueprint | undefined {
  return getBlueprint(pathway).sections.find((s) => s.id === sectionId);
}
