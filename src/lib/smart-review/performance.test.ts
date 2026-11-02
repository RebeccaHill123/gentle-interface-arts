import { describe, expect, it } from "vitest";
import {
  buildSubtopicPerformance,
  buildSubjectPerformance,
  overallPerformance,
} from "./performance";
import { diagnoseWeakAreas, weakestAreaHeadline } from "./diagnosis";
import { buildSessionSummary } from "./summary";
import { scoreSession } from "./sessions";
import type { GradedAttemptRow } from "@/lib/study-log";

let seq = 0;
function attempt(over: Partial<GradedAttemptRow>): GradedAttemptRow {
  seq++;
  return {
    id: `a${seq}`,
    occurred_at: `2026-10-${String((seq % 28) + 1).padStart(2, "0")}T10:00:00Z`,
    local_date: `2026-10-${String((seq % 28) + 1).padStart(2, "0")}`,
    exam_path: "ube-full",
    source_type: "practice",
    source_ref: null,
    question_fingerprint: `q_${seq}`,
    subject: "Real Property",
    subtopic: "Vested vs contingent remainders",
    is_correct: true,
    duration_seconds: 60,
    voided_at: null,
    ...over,
  };
}

function run(subject: string, subtopic: string, results: boolean[], dayStart = 1): GradedAttemptRow[] {
  return results.map((r, i) =>
    attempt({
      subject,
      subtopic,
      is_correct: r,
      local_date: `2026-10-${String(dayStart + i).padStart(2, "0")}`,
      occurred_at: `2026-10-${String(dayStart + i).padStart(2, "0")}T10:00:00Z`,
    }),
  );
}

describe("buildSubtopicPerformance", () => {
  it("never calls a topic strong after a single correct answer", () => {
    const [p] = buildSubtopicPerformance(run("Real Property", "Class gifts", [true]));
    expect(p.status).toBe("developing");
    expect(p.attempted).toBe(1);
  });

  it("marks a topic strong only with a real sample across sittings", () => {
    const oneSitting = buildSubtopicPerformance(
      run("Real Property", "Class gifts", [true, true, true, true, true], 1),
    )[0];
    // All five on consecutive days counts as multiple sittings → strong.
    expect(oneSitting.status).toBe("strong");

    const sameDay = run("Real Property", "Class gifts", [true, true, true, true, true], 1).map(
      (a) => ({ ...a, local_date: "2026-10-01" }),
    );
    const [p] = buildSubtopicPerformance(sameDay);
    expect(p.sittings).toBe(1);
    expect(p.status).toBe("developing");
  });

  it("flags needs-review from the recent window, not one isolated error", () => {
    const attempts = [
      ...run("Real Property", "RAP", [true, true, true, true], 1),
      ...run("Real Property", "RAP", [false], 10),
    ];
    const [p] = buildSubtopicPerformance(attempts);
    // 4/5 in the recent window — an isolated error, not a weakness.
    expect(p.status).not.toBe("needs-review");
  });

  it("recovers from needs-review when recent answers improve", () => {
    const attempts = [
      ...run("Real Property", "RAP", [false, false, false], 1),
      ...run("Real Property", "RAP", [true, true, true, true, true], 10),
    ];
    const [p] = buildSubtopicPerformance(attempts);
    expect(p.status).not.toBe("needs-review");
  });

  it("marks persistent recent failure as needs-review with targeted review", () => {
    const [p] = buildSubtopicPerformance(
      run("Real Property", "RAP", [false, true, false, false], 1),
    );
    expect(p.status).toBe("needs-review");
    expect(p.needsTargetedReview).toBe(true);
  });

  it("detects improvement between earlier and recent windows", () => {
    const attempts = [
      ...run("Real Property", "RAP", [false, false, true], 1),
      ...run("Real Property", "RAP", [true, true, true, true, true], 10),
    ];
    const [p] = buildSubtopicPerformance(attempts);
    expect(p.improving).toBe(true);
  });
});

describe("buildSubjectPerformance / overallPerformance", () => {
  it("aggregates subjects worst-first and never fabricates accuracy", () => {
    const attempts = [
      ...run("Real Property", "RAP", [false, false, true], 1),
      ...run("Evidence", "Hearsay", [true, true, true], 10),
    ];
    const subjects = buildSubjectPerformance(buildSubtopicPerformance(attempts));
    expect(subjects[0].subject).toBe("Real Property");
    expect(subjects[0].needsReviewCount).toBe(1);

    const overall = overallPerformance(attempts);
    expect(overall.totalAttempted).toBe(6);
    expect(overall.totalCorrect).toBe(4);
    expect(overallPerformance([]).accuracy).toBeNull();
  });
});

describe("diagnoseWeakAreas", () => {
  it("distinguishes repeated misses from isolated slips", () => {
    const subs = buildSubtopicPerformance([
      ...run("Real Property", "RAP", [false, false], 1),
      ...run("Real Property", "RAP", [false, true], 10),
      ...run("Evidence", "Hearsay", [true, true, true, true, true], 1),
      ...run("Evidence", "Hearsay", [true, true, true, true, false], 10),
    ]);
    const recs = diagnoseWeakAreas(subs);
    const rap = recs.find((r) => r.subtopic === "RAP");
    const hearsay = recs.find((r) => r.subtopic === "Hearsay");
    expect(rap?.kind).toBe("repeated");
    expect(hearsay?.kind).toBe("isolated");
    // Repeated patterns outrank isolated slips.
    expect(recs.indexOf(rap!)).toBeLessThan(recs.indexOf(hearsay!));
  });

  it("recommends relearning when recent accuracy is very low in one sitting", () => {
    const sameDay = run("Real Property", "RAP", [false, false, false, true], 1).map((a) => ({
      ...a,
      local_date: "2026-10-01",
    }));
    const subs = buildSubtopicPerformance(sameDay);
    const [rec] = diagnoseWeakAreas(subs);
    expect(rec.kind).toBe("relearn");
    expect(rec.suggestedDifficulty).toBe("Easy");
  });

  it("produces a headline only when there is something to say", () => {
    expect(weakestAreaHeadline([])).toBeNull();
    const subs = buildSubtopicPerformance(run("Real Property", "RAP", [false, false, false], 1));
    expect(weakestAreaHeadline(subs)).toContain("RAP");
  });
});

describe("scoreSession", () => {
  const questions = [
    { prompt: "Q1", options: ["a", "b", "c", "d"], correctIndex: 0, explanation: "e" },
    { prompt: "Q2", options: ["a", "b", "c", "d"], correctIndex: 1, explanation: "e" },
    { prompt: "Q3", options: ["a", "b", "c", "d"], correctIndex: 2, explanation: "e" },
  ];

  it("excludes flagged questions from the score", () => {
    const s = scoreSession({ questions, answers: [0, 0, 2], flagged: [1] });
    expect(s.scored).toBe(2);
    expect(s.correct).toBe(2);
    expect(s.accuracy).toBe(1);
  });

  it("counts unanswered questions as incorrect but not answered", () => {
    const s = scoreSession({ questions, answers: [0, null, 2], flagged: [] });
    expect(s.scored).toBe(3);
    expect(s.correct).toBe(2);
    expect(s.answered).toBe(2);
  });
});

describe("buildSessionSummary", () => {
  const questions = [
    { prompt: "Class gifts vest when?", options: ["a", "b", "c", "d"], correctIndex: 0, explanation: "e", memoryRule: "Ambiguity resolves at the testator's death." },
    { prompt: "A contingent remainder depends on?", options: ["a", "b", "c", "d"], correctIndex: 1, explanation: "e" },
  ];

  it("references the actual missed question and its memory rule", () => {
    const s = buildSessionSummary({ subject: "Real Property", questions, answers: [0, 0], flagged: [] });
    expect(s).toContain("1/2");
    expect(s).toContain("contingent remainder");
  });

  it("never claims a perfect score when one was missed", () => {
    const s = buildSessionSummary({ subject: "Real Property", questions, answers: [0, 0], flagged: [] });
    expect(s).not.toContain("all");
  });

  it("handles a fully flagged set honestly", () => {
    const s = buildSessionSummary({ subject: "Real Property", questions, answers: [0, 1], flagged: [0, 1] });
    expect(s).toContain("no score");
  });
});
