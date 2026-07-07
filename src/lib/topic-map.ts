// Flexible topic-map data structure that supports both SQE1 and UBE exams.
// The dashboard currently reads from `MOCK_TOPIC_MAP`; when live user data
// is available this can be swapped for a derivation from `deriveAnalytics`
// output + syllabus metadata without changing the UI components.

export type SubTopicStatus = "untouched" | "weak" | "medium" | "strong";
export type SubjectStatus = "weak-spot" | "improving" | "needs-practice" | "on-track";
export type SubTopicPriority = "must" | "should" | "optional";
export type RecommendedAction = "quiz" | "revise" | "add-to-plan";

export interface SubTopic {
  id: string;
  name: string;
  confidence: SubTopicStatus;
  accuracy: number | null; // 0..100
  timeSpentMin: number;
  lastRevisedDaysAgo: number | null; // null = untouched
  priority: SubTopicPriority;
  highYield?: boolean;
  recommendedAction: RecommendedAction;
}

export interface Chapter {
  id: string;
  name: string;
  subTopics: SubTopic[];
}

export interface Subject {
  id: string;
  name: string;
  shortName?: string;
  progress: number; // 0..100
  status: SubjectStatus;
  chapters: Chapter[];
}

export interface ExamComponent {
  id: string;
  name: string;
  subjects: Subject[];
}

export type ExamId = "SQE1" | "UBE";

export interface ExamMap {
  exam: ExamId;
  components: ExamComponent[];
}

// ---------- Mock data ---------------------------------------------------------

const st = (
  id: string,
  name: string,
  confidence: SubTopicStatus,
  opts: Partial<SubTopic> = {},
): SubTopic => ({
  id,
  name,
  confidence,
  accuracy: opts.accuracy ?? null,
  timeSpentMin: opts.timeSpentMin ?? 0,
  lastRevisedDaysAgo: opts.lastRevisedDaysAgo ?? null,
  priority: opts.priority ?? "should",
  highYield: opts.highYield,
  recommendedAction:
    opts.recommendedAction ??
    (confidence === "untouched"
      ? "add-to-plan"
      : confidence === "weak"
        ? "quiz"
        : "revise"),
});

export const MOCK_TOPIC_MAP: ExamMap = {
  exam: "SQE1",
  components: [
    {
      id: "flk1",
      name: "FLK1",
      subjects: [
        {
          id: "blp",
          name: "Business Law & Practice",
          shortName: "BLP",
          progress: 36,
          status: "weak-spot",
          chapters: [
            {
              id: "corp-gov",
              name: "Corporate governance",
              subTopics: [
                st("blp-dd", "Directors' duties", "weak", {
                  accuracy: 42,
                  timeSpentMin: 55,
                  lastRevisedDaysAgo: 9,
                  priority: "must",
                  highYield: true,
                }),
                st("blp-cf", "Company formation", "medium", {
                  accuracy: 61,
                  timeSpentMin: 90,
                  lastRevisedDaysAgo: 4,
                  priority: "should",
                }),
              ],
            },
            {
              id: "insolvency",
              name: "Insolvency",
              subTopics: [
                st("blp-ins", "Insolvency", "untouched", {
                  priority: "must",
                  highYield: true,
                }),
              ],
            },
          ],
        },
        {
          id: "contract",
          name: "Contract",
          progress: 48,
          status: "improving",
          chapters: [
            {
              id: "formation",
              name: "Formation",
              subTopics: [
                st("con-fmt", "Formation", "medium", {
                  accuracy: 68,
                  timeSpentMin: 120,
                  lastRevisedDaysAgo: 2,
                  priority: "must",
                  highYield: true,
                }),
                st("con-mis", "Misrepresentation", "weak", {
                  accuracy: 51,
                  timeSpentMin: 40,
                  lastRevisedDaysAgo: 12,
                  priority: "should",
                }),
              ],
            },
            {
              id: "remedies",
              name: "Remedies",
              subTopics: [
                st("con-rem", "Remedies", "weak", {
                  accuracy: 48,
                  timeSpentMin: 25,
                  lastRevisedDaysAgo: 14,
                  priority: "should",
                }),
              ],
            },
          ],
        },
        {
          id: "tort",
          name: "Tort",
          progress: 41,
          status: "needs-practice",
          chapters: [
            {
              id: "negligence",
              name: "Negligence",
              subTopics: [
                st("tort-ol", "Occupiers' liability", "weak", {
                  accuracy: 46,
                  timeSpentMin: 35,
                  lastRevisedDaysAgo: 7,
                  priority: "must",
                }),
                st("tort-vl", "Vicarious liability", "medium", {
                  accuracy: 58,
                  timeSpentMin: 60,
                  lastRevisedDaysAgo: 5,
                  priority: "should",
                }),
                st("tort-def", "Negligence defences", "weak", {
                  accuracy: 44,
                  timeSpentMin: 20,
                  lastRevisedDaysAgo: 15,
                  priority: "should",
                }),
              ],
            },
          ],
        },
      ],
    },
  ],
};

// ---------- Derivations ------------------------------------------------------

export function flatSubjects(map: ExamMap): Subject[] {
  return map.components.flatMap((c) => c.subjects);
}

export function flatSubTopics(map: ExamMap): SubTopic[] {
  return flatSubjects(map).flatMap((s) => s.chapters.flatMap((c) => c.subTopics));
}

/** Overall coverage: % of sub-topics with any confidence other than "untouched". */
export function coverage(map: ExamMap): {
  mappedPct: number;
  untouchedCount: number;
  totalCount: number;
} {
  const all = flatSubTopics(map);
  const untouched = all.filter((s) => s.confidence === "untouched").length;
  const mappedPct = all.length ? Math.round(((all.length - untouched) / all.length) * 100) : 0;
  return { mappedPct, untouchedCount: untouched, totalCount: all.length };
}

/** Weakest subject: lowest progress with weak/needs-practice status. */
export function weakestSubject(map: ExamMap): Subject | null {
  const subjects = flatSubjects(map);
  const ranked = [...subjects].sort((a, b) => a.progress - b.progress);
  return ranked[0] ?? null;
}

/** Weakest sub-topics inside a subject (for the insight subtitle). */
export function weakSubTopicNames(subject: Subject, limit = 2): string[] {
  return subject.chapters
    .flatMap((c) => c.subTopics)
    .filter((s) => s.confidence === "weak" || s.confidence === "untouched")
    .slice(0, limit)
    .map((s) => s.name);
}

/** Today's priority: pick the highest-priority high-yield sub-topic due for recall. */
export function todaysPriority(map: ExamMap): { subject: Subject; sub: SubTopic } | null {
  const subjects = flatSubjects(map);
  for (const s of subjects) {
    for (const c of s.chapters) {
      for (const sub of c.subTopics) {
        if (sub.priority === "must" && sub.highYield && sub.confidence !== "strong") {
          return { subject: s, sub };
        }
      }
    }
  }
  const first = subjects[0]?.chapters[0]?.subTopics[0];
  return first ? { subject: subjects[0], sub: first } : null;
}
