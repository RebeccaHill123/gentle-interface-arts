// Edge function: generate a personalised SQE study plan via Lovable AI Gateway
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ExamPath = "SQE1_FULL" | "FLK1" | "FLK2" | "SQE2" | "CUSTOM";
type IntensityTier = "beginner" | "intermediate" | "advanced" | "resitter";
type CoverageMode = "even" | "advanced";

interface PlanRequest {
  name: string;
  examDate: string; // ISO date
  hoursPerWeek: number;
  modules: { id: string; name: string; confidence: number; weakSubtopics?: string[] }[]; // confidence 1-5
  examType: "SQE1" | "SQE2";
  examPath?: ExamPath;
  intensity?: IntensityTier;
  coverageMode?: CoverageMode;
  recentMockAccuracy?: { module: string; accuracy: number }[];
  recentlyStudied?: { module: string; daysAgo: number }[];
}

type TaskMinutes = 30 | 45 | 60 | 90 | 120;
type TaskBucket = "must" | "should" | "optional";
type TaskDifficulty = "foundational" | "core" | "challenging";

interface StudyTask {
  title: string;
  module: string;
  minutes: TaskMinutes;
  taskType: "timed-sba" | "mistake-review" | "scenario-drill" | "active-recall" | "mixed-mock" | "concept-deepdive" | "ethics-application";
  rationale: "high-yield" | "weak-area" | "recency-gap" | "mixed-practice" | "mock-prep" | "ethics-cornerstone";
  priority: "high" | "medium" | "low";
  why: string;
  subtopic?: string;
  difficulty?: TaskDifficulty;
  output?: string;
  bucket?: TaskBucket;
}

interface Allocation {
  module: string;
  hours: number;
  rationale: StudyTask["rationale"];
  note: string;
  subtopics?: string[];
  method?: string;
  outcome?: string;
}

interface WeeklyFocusEntry {
  week: number;
  theme: string;
  modules: string[];
  hours: number;
  reason?: string;
  balance?: { review: number; recall: number; practice: number; mistakes: number };
}

interface StudyPlanResponse {
  overview: string;
  weeklyStrategy: {
    summary: string;
    allocations: Allocation[];
  };
  weeklyFocus: WeeklyFocusEntry[];
  todayTasks: StudyTask[];
  masteryTargets: { module: string; targetConfidence: number; priority: "high" | "medium" | "low" }[];
}

const SQE_FALLBACK_SUBJECTS: Record<string, { weight: number; highYield: number; groups: string[]; subtopics: string[] }> = {
  "Contract": { weight: 0.18, highYield: 5, groups: ["Obligations", "Business"], subtopics: ["formation", "terms", "vitiating factors", "discharge", "remedies", "privity"] },
  "Tort": { weight: 0.15, highYield: 5, groups: ["Obligations"], subtopics: ["negligence duty, breach, causation and remoteness", "psychiatric and economic loss", "occupiers' liability", "nuisance and Rylands", "vicarious liability", "defences"] },
  "Business Law & Practice": { weight: 0.18, highYield: 5, groups: ["Business"], subtopics: ["business vehicles", "company formation", "directors' duties", "share capital", "partnerships and LLPs", "insolvency", "business tax"] },
  "Constitutional & Administrative Law": { weight: 0.10, highYield: 4, groups: ["Public Law"], subtopics: ["parliamentary sovereignty", "separation of powers", "judicial review grounds and remedies", "Human Rights Act 1998"] },
  "Legal System": { weight: 0.08, highYield: 3, groups: ["Public Law"], subtopics: ["sources of law", "statutory interpretation", "precedent", "legal services"] },
  "Legal System of England & Wales": { weight: 0.08, highYield: 3, groups: ["Public Law"], subtopics: ["sources of law", "statutory interpretation", "precedent", "legal services"] },
  "Ethics & Professional Conduct": { weight: 0.15, highYield: 5, groups: ["Ethics cornerstone"], subtopics: ["SRA Principles", "conflicts and confidentiality", "client money", "AML and POCA", "duties to court"] },
  "EU Law": { weight: 0.03, highYield: 2, groups: ["Public Law"], subtopics: ["retained EU law", "legacy supremacy"] },
  "EU & Retained Law": { weight: 0.03, highYield: 2, groups: ["Public Law"], subtopics: ["retained EU law", "legacy supremacy"] },
  "Land Law": { weight: 0.13, highYield: 5, groups: ["Property", "Private Client"], subtopics: ["estates and interests", "registered and unregistered title", "co-ownership", "easements", "covenants", "leases and LTA 1954", "mortgages"] },
  "Property Practice": { weight: 0.13, highYield: 5, groups: ["Property"], subtopics: ["freehold sale and purchase", "leasehold", "searches and enquiries", "contract, exchange and completion", "SDLT and VAT", "post-completion"] },
  "Trusts": { weight: 0.10, highYield: 5, groups: ["Private Client", "Property"], subtopics: ["express trusts", "resulting and constructive trusts", "trustees' duties", "breach and equitable remedies", "tracing"] },
  "Criminal Law": { weight: 0.10, highYield: 4, groups: ["Litigation"], subtopics: ["actus reus, mens rea and causation", "homicide", "non-fatal offences", "theft and fraud", "defences"] },
  "Criminal Practice": { weight: 0.10, highYield: 4, groups: ["Litigation"], subtopics: ["PACE and police powers", "pre-charge advice", "bail", "plea and allocation", "trial evidence", "sentencing"] },
  "Criminal Law & Practice": { weight: 0.20, highYield: 4, groups: ["Litigation"], subtopics: ["homicide and non-fatal offences", "theft and fraud", "PACE and police powers", "bail and first hearings", "trial evidence", "sentencing"] },
  "Dispute Resolution": { weight: 0.13, highYield: 5, groups: ["Litigation"], subtopics: ["pre-action and ADR", "starting claims, jurisdiction and limitation", "statements of case", "interim applications", "disclosure and evidence", "trial and costs", "enforcement"] },
  "Wills & Estates": { weight: 0.10, highYield: 4, groups: ["Private Client"], subtopics: ["validity and execution", "intestacy and family provision", "IHT", "estate administration", "trusts in wills"] },
  "Solicitors Accounts": { weight: 0.07, highYield: 5, groups: ["Ethics", "Business"], subtopics: ["client vs business account", "SRA Accounts Rules", "double-entry bookkeeping", "interest, disbursements and VAT", "breaches and reconciliations"] },
};

function safeParsePlan(payload: unknown): StudyPlanResponse | null {
  if (!payload || typeof payload !== "object") return null;
  const maybe = payload as Partial<StudyPlanResponse>;
  if (
    typeof maybe.overview === "string" &&
    Array.isArray(maybe.todayTasks) &&
    maybe.todayTasks.length > 0 &&
    Array.isArray(maybe.weeklyFocus) &&
    Array.isArray(maybe.masteryTargets)
  ) {
    return maybe as StudyPlanResponse;
  }
  return null;
}

function extractStructuredPlan(data: any): StudyPlanResponse | null {
  const message = data?.choices?.[0]?.message;
  const toolArguments = message?.tool_calls?.[0]?.function?.arguments;
  if (toolArguments) {
    try {
      const parsed = typeof toolArguments === "string" ? JSON.parse(toolArguments) : toolArguments;
      const plan = safeParsePlan(parsed);
      if (plan) return plan;
    } catch (error) {
      console.error("Could not parse tool-call plan", error);
    }
  }

  const content = message?.content;
  if (typeof content === "string" && content.trim()) {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? content.match(/\{[\s\S]*\}/)?.[0];
    if (jsonMatch) {
      try {
        const plan = safeParsePlan(JSON.parse(jsonMatch));
        if (plan) return plan;
      } catch (error) {
        console.error("Could not parse content plan", error);
      }
    }
  }

  return null;
}

function buildDeterministicPlan(body: PlanRequest): StudyPlanResponse {
  const targetMinutes = Math.max(30, Math.round(body.hoursPerWeek * 60));
  const studiedByModule = new Map((body.recentlyStudied ?? []).map((m) => [m.module, m.daysAgo]));
  const mockByModule = new Map((body.recentMockAccuracy ?? []).map((m) => [m.module, m.accuracy]));
  const intensity: IntensityTier = body.intensity ?? "intermediate";
  const intensityWeakBoost = intensity === "resitter" ? 0.25 : intensity === "advanced" ? 0.15 : intensity === "beginner" ? 0.05 : 0.1;
  const scoredModules = body.modules
    .map((module) => {
      const subject = SQE_FALLBACK_SUBJECTS[module.name] ?? { weight: 0.08, highYield: 3, groups: [body.examType], subtopics: [module.name] };
      const confidenceGap = Math.max(0, 5 - module.confidence) / 5;
      const recencyDays = studiedByModule.get(module.name);
      const recencyBoost = recencyDays === undefined ? 0.2 : Math.min(1, recencyDays / 14) * 0.3;
      const mockAccuracy = mockByModule.get(module.name);
      const mockWeakness = mockAccuracy === undefined ? 0 : Math.max(0, 0.7 - mockAccuracy);
      const subtopicBoost = (module.weakSubtopics?.length ?? 0) > 0 ? intensityWeakBoost : 0;
      const score = subject.weight * 0.4 + (subject.highYield / 5) * 0.3 + confidenceGap * 0.2 + recencyBoost * 0.1 + mockWeakness * 0.15 + subtopicBoost;
      return { ...module, subject, score, recencyDays, mockAccuracy };
    })
    .sort((a, b) => b.score - a.score);

  const priorityCount = Math.min(3, scoredModules.length || 1);
  const priorityModules = scoredModules.slice(0, priorityCount);
  const focusModules = scoredModules.slice(0, Math.min(6, scoredModules.length || 1));

  const durations: TaskMinutes[] = [];
  let remaining = targetMinutes;
  while (remaining > 0) {
    const next: TaskMinutes = remaining >= 90 ? 90 : remaining >= 60 ? 60 : remaining >= 45 ? 45 : 30;
    durations.push(next);
    remaining -= next;
  }

  const methodFor = (taskType: StudyTask["taskType"], minutes: number): string => {
    switch (taskType) {
      case "timed-sba": return `${Math.max(10, Math.round(minutes / 1.6))} timed SBAs with full review of every incorrect answer`;
      case "mixed-mock": return `${Math.max(15, Math.round(minutes / 1.6))}-question mixed mock under exam timing, then mark-scheme reflection`;
      case "mistake-review": return "Re-attempt 3 recent mistakes, then articulate the rule each one tested";
      case "scenario-drill": return "Work through 2–3 fact patterns, stating the issue, rule, application and conclusion aloud";
      case "active-recall": return "Closed-book recall notes, then self-grade against your condensed outline";
      case "concept-deepdive": return "Read the SRA spec line, then build a one-page schematic of the doctrine";
      case "ethics-application": return "Apply SRA Principles to 3 short scenarios and write the regulatory response";
      default: return "Focused study block";
    }
  };
  const outputFor = (taskType: StudyTask["taskType"]): string => {
    switch (taskType) {
      case "timed-sba": return "Log 3 recurring mistakes into your mistake log";
      case "mixed-mock": return "Capture your accuracy and your two weakest topics";
      case "mistake-review": return "Mark each mistake as resolved or carry forward";
      case "scenario-drill": return "One condensed IRAC paragraph per scenario";
      case "active-recall": return "A one-page recall sheet you can re-test in 3 days";
      case "concept-deepdive": return "One schematic added to your revision binder";
      case "ethics-application": return "Three-line regulatory note per scenario";
      default: return "A short reflection on what you learned";
    }
  };

  const taskTypes: StudyTask["taskType"][] = ["timed-sba", "active-recall", "scenario-drill", "mistake-review", "ethics-application", "mixed-mock"];
  const todayTasks: StudyTask[] = durations.map((minutes, index) => {
    // Bias first ~60% of blocks toward priority modules so the week stays coherent.
    const useModule = index < Math.ceil(durations.length * 0.6)
      ? priorityModules[index % priorityModules.length]
      : focusModules[index % focusModules.length];
    const module = useModule ?? scoredModules[0];
    const weak = module.weakSubtopics ?? [];
    const subtopics = weak.length > 0 ? weak : module.subject.subtopics;
    const topicA = subtopics[index % subtopics.length];
    const topicB = subtopics[(index + 2) % subtopics.length] ?? topicA;
    const isWeak = module.confidence <= 2 || weak.length > 0;
    const isStale = (module.recencyDays ?? 99) > 10;
    const rationale: StudyTask["rationale"] = isStale ? "recency-gap" : isWeak ? "weak-area" : (["high-yield","mixed-practice","mock-prep"] as const)[index % 3];
    const isResitter = intensity === "resitter";
    const baseTaskType: StudyTask["taskType"] = isResitter && index % 3 === 2
      ? "mixed-mock"
      : isWeak && intensity === "beginner"
        ? "concept-deepdive"
        : taskTypes[index % taskTypes.length];
    const taskType: StudyTask["taskType"] = module.name.includes("Ethics") || rationale === "ethics-cornerstone" ? "ethics-application" : baseTaskType;
    const titleVerb = taskType === "timed-sba" ? "Timed SBA set" :
      taskType === "mixed-mock" ? "Mixed mock set" :
      taskType === "active-recall" ? "Active recall drill" :
      taskType === "mistake-review" ? "Mistake-log review" :
      taskType === "concept-deepdive" ? "Concept deep-dive" :
      taskType === "ethics-application" ? "Ethics application" :
      "Scenario drill";
    const difficulty: TaskDifficulty = module.confidence <= 2 ? "foundational" : module.subject.highYield >= 4 ? "challenging" : "core";
    const priority: "high" | "medium" | "low" = module.score >= 0.55 ? "high" : module.score >= 0.42 ? "medium" : "low";
    return {
      title: `${titleVerb}: ${topicA}${topicB !== topicA ? ` & ${topicB}` : ""}`,
      module: module.name,
      minutes,
      taskType,
      rationale,
      priority,
      why: `${module.name} is prioritised ${weak.length > 0 ? `because you flagged ${weak.slice(0, 2).join(" and ")} as weak` : isWeak ? "because confidence is still low here" : module.subject.highYield >= 4 ? "for its high SQE yield" : "to keep related topics fresh"}${isStale ? " and it hasn't been touched recently" : ""}.`,
      subtopic: topicA,
      difficulty,
      output: outputFor(taskType),
      bucket: undefined, // assigned below by priority pass
    };
  });

  // Assign Must / Should / Optional buckets by priority and order.
  const sortedIdx = todayTasks
    .map((t, i) => ({ i, score: (t.priority === "high" ? 3 : t.priority === "medium" ? 2 : 1) * 10 - i }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.i);
  const mustCount = Math.max(1, Math.round(sortedIdx.length * 0.5));
  const shouldCount = Math.max(0, Math.round(sortedIdx.length * 0.3));
  sortedIdx.forEach((idx, rank) => {
    todayTasks[idx].bucket = rank < mustCount ? "must" : rank < mustCount + shouldCount ? "should" : "optional";
  });

  const totalScore = focusModules.reduce((sum, module) => sum + module.score, 0) || 1;
  const allocations: Allocation[] = focusModules.map((module) => {
    const weak = module.weakSubtopics ?? [];
    const focusList = (weak.length > 0 ? weak : module.subject.subtopics).slice(0, 4);
    const rationale: StudyTask["rationale"] = module.confidence <= 2
      ? "weak-area"
      : (module.recencyDays ?? 0) > 10 ? "recency-gap"
      : module.subject.highYield >= 5 ? "high-yield" : "mixed-practice";
    const method = module.confidence <= 2
      ? "Short concept recap, then timed SBAs on the weak subtopics, then a mistake-log review"
      : module.subject.highYield >= 4
        ? "Timed SBA practice on high-yield subtopics, followed by structured mistake review"
        : "Mixed interleaved practice with brief recall notes";
    const outcome = module.confidence <= 2
      ? "Move from foundational gaps to confident application on the named subtopics"
      : "Hold your accuracy at 75%+ on the named subtopics and tighten exam timing";
    return {
      module: module.name,
      hours: Math.round((body.hoursPerWeek * module.score / totalScore) * 10) / 10,
      rationale,
      note: `${module.subject.groups.join(" / ")} — HY${module.subject.highYield}, confidence ${module.confidence}/5${(module.recencyDays ?? 0) > 10 ? ", last revised >10d ago" : ""}.`,
      subtopics: focusList,
      method,
      outcome,
    };
  });

  // Balance derived from intensity (sums to 100).
  const balance = intensity === "beginner"
    ? { review: 40, recall: 30, practice: 20, mistakes: 10 }
    : intensity === "resitter"
      ? { review: 10, recall: 20, practice: 50, mistakes: 20 }
      : intensity === "advanced"
        ? { review: 15, recall: 20, practice: 45, mistakes: 20 }
        : { review: 25, recall: 25, practice: 35, mistakes: 15 };

  const weekOneReason = priorityModules.length >= 2
    ? `Repair weak areas in ${priorityModules[0].name} and ${priorityModules[1].name}, then apply through mixed SBA practice.`
    : priorityModules.length === 1
      ? `Rebuild confidence in ${priorityModules[0].name} with focused recall and timed SBAs.`
      : `Build momentum across your selected subjects.`;

  const weeksAhead = Math.min(12, Math.max(4, Math.ceil((Math.max(1, scoredModules.length) * 2))));
  const weeklyFocus: WeeklyFocusEntry[] = Array.from({ length: weeksAhead }, (_, index) => {
    const first = scoredModules[index % scoredModules.length] ?? focusModules[0];
    const second = scoredModules[(index + 1) % scoredModules.length] ?? first;
    const third = scoredModules[(index + 2) % scoredModules.length] ?? second;
    const trio = Array.from(new Set([first.name, second.name, third.name])).slice(0, 3);
    const theme = index === 0
      ? `Repair weak areas in ${first.name}${second.name !== first.name ? ` and ${second.name}` : ""}, then apply through mixed SBA practice`
      : index < 3
        ? `Consolidate ${first.subject.groups[0] ?? first.name} with interleaved ${second.name}`
        : index >= weeksAhead - 2
          ? `Mock-led refresh: ${first.name} with timed scenarios across ${second.name}`
          : `Interleaved practice across ${first.subject.groups[0] ?? first.name} with spaced re-touch of ${second.name}`;
    const reason = index === 0
      ? weekOneReason
      : `Carries forward gains in ${first.name} while re-touching ${second.name} on a spaced-repetition schedule.`;
    return {
      week: index + 1,
      hours: body.hoursPerWeek,
      theme,
      modules: trio,
      reason,
      balance,
    };
  });

  return {
    overview: `${body.name}, this plan leads with ${priorityModules.map((m) => m.name).join(", ")} because they combine high SQE yield with your current confidence and revision recency. The week is deliberately interleaved so weak areas are repaired without crowding out mixed SBA practice.`,
    weeklyStrategy: {
      summary: `This week allocates ${body.hoursPerWeek} hours across high-yield weak areas and recency gaps, with the priority on ${priorityModules.map((m) => m.name).join(" and ")}. Blocks balance recall, timed practice and mistake review.`,
      allocations,
    },
    todayTasks,
    weeklyFocus,
    masteryTargets: scoredModules.map((module) => ({
      module: module.name,
      targetConfidence: module.subject.highYield >= 4 || module.confidence <= 2 ? 5 : 4,
      priority: module.score >= 0.55 ? "high" : module.score >= 0.42 ? "medium" : "low",
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require an authenticated user — defence in depth (verify_jwt is also true).
  const authHeader = req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ") || authHeader.replace("Bearer ", "").trim().length === 0) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: PlanRequest | null = null;
  let daysUntilExam = 1;
  try {
    body = await req.json();
    if (!body || !Array.isArray(body.modules) || body.modules.length === 0 || !body.examDate || !body.name) {
      throw new Error("Invalid plan request");
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    daysUntilExam = Math.max(
      1,
      Math.ceil(
        (new Date(body.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
      ),
    );

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured; using deterministic plan fallback");
      return new Response(
        JSON.stringify({ plan: buildDeterministicPlan(body), daysUntilExam, fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const systemPrompt = `You are an elite UK SQE coach with deep knowledge of the SRA assessment specification, examiner reports and historical question frequencies. You design adaptive weekly strategies that read like an Oxbridge tutor + sports performance analyst.

# SQE syllabus (canonical — use EXACT subject + subtopic names in tasks)

## FLK1 (≈18% Contract, 18% BLP, 15% Tort, 15% Ethics, 13% Dispute Res, 10% Constitutional, 8% Legal System, 3% EU)
- Contract — HY5 — formation; terms (CRA/UCTA); vitiating factors; discharge; remedies; privity. Group: Obligations, Business.
- Tort — HY5 — negligence (duty/breach/causation/remoteness); psych & economic loss; occupiers'; nuisance/Rylands; vicarious; defences. Group: Obligations.
- Business Law & Practice — HY5 — vehicles; CA 2006 formation; directors' duties; share capital; partnerships/LLPs; insolvency; business tax (CT/IT/CGT/VAT). Group: Business.
- Dispute Resolution — HY5 — pre-action/ADR; starting claim/jurisdiction/limitation; statements of case; interim apps & case management; disclosure/witness/expert; trial/costs; enforcement. Group: Litigation.
- Constitutional & Administrative — HY4 — sovereignty; separation; judicial review (HY5); HRA 1998 (HY5). Group: Public Law.
- Legal System — HY3 — sources; statutory interpretation; precedent; legal services. Group: Public Law.
- Ethics & Professional Conduct — HY5 (PERVASIVE — appears in BOTH papers) — SRA Principles; conflicts/confidentiality; client money; AML/POCA; duties to court. Group: Ethics cornerstone.
- EU & Retained Law — HY2 — retained EU law; legacy supremacy. Group: Public Law.

## FLK2 (≈13% Land, 13% Property Practice, 10% Trusts, 10% Crim Law, 10% Crim Practice, 10% Wills, 7% Solicitors Accounts + Ethics pervasive)
- Land Law — HY5 — estates/interests; registered/unregistered; co-ownership; easements (HY5); covenants (HY5); leases & LTA 1954; mortgages (HY5). Group: Property, Private Client.
- Property Practice — HY5 — freehold sale/purchase; leasehold; searches/enquiries; contract/exchange/completion; SDLT/VAT; post-completion. Group: Property.
- Trusts — HY5 — express trusts (certainties/formalities); resulting & constructive (HY5); trustees' duties; breach & equitable remedies; tracing; charitable. Group: Private Client, Property.
- Criminal Law — HY4 — actus/mens/causation; homicide (HY5); non-fatal; theft/fraud; defences; inchoate/secondary. Group: Litigation.
- Criminal Practice — HY4 — PACE & police powers (HY5); pre-charge; bail; plea/allocation; trial evidence (bad character, hearsay) (HY5); sentencing; youths. Group: Litigation.
- Wills & Estates — HY4 — validity/execution; intestacy & family provision; IHT (HY5); estate administration; trusts in wills. Group: Private Client.
- Solicitors Accounts — HY5 — client vs business account; SRA Accounts Rules; double-entry bookkeeping; interest/disbursements/VAT; breaches/reconciliations. Group: Ethics, Business.

# Planner doctrine
1. PRIORITY SCORE = 0.4·subjectWeight + 0.3·HY/5 + 0.2·confidenceGap + 0.1·recencyBoost. Apply explicitly.
2. Weak (confidence ≤ 2) AND high-yield (HY ≥ 4) topics get DOUBLE the time of strong/low-yield areas.
3. INTERLEAVE within related groups (Property cluster, Obligations, Litigation, Private Client, Public Law, Business, Ethics cornerstone) — never single-subject grinds.
4. SPACED REPETITION — re-touch a topic at 1d, 3d, 7d, 14d. Anything stale (>10 days) earns a Revision Refresh block.
5. SUPPRESS low-yield niche topics (HY ≤ 2) — at most one short block per week.
6. Mock exposure scales with proximity to exam (0–25% of weekly hours far out, 40–55% in the final 4 weeks).
7. Ethics is CROSS-PAPER — embed ethics scenarios into other modules' tasks regularly.

Tasks MUST be academically specific. Bad: "Study land law". Good: "Timed mixed SBA set on easements, restrictive covenants & mortgages (35 Qs in 52 mins) — focus on enforceability against successors". Today is ${new Date().toISOString().slice(0, 10)}.

Task minutes MUST be one of: 30, 45, 60, 90, 120.`;

    const mockSummary = body.recentMockAccuracy?.length
      ? `\nRecent mock accuracy:\n${body.recentMockAccuracy.map((m) => `- ${m.module}: ${Math.round(m.accuracy * 100)}%`).join("\n")}`
      : "";
    const recencySummary = body.recentlyStudied?.length
      ? `\nLast revised (days ago):\n${body.recentlyStudied.map((m) => `- ${m.module}: ${m.daysAgo}d`).join("\n")}`
      : "";

    const examPath = body.examPath ?? (body.examType === "SQE2" ? "SQE2" : "SQE1_FULL");
    const intensity = body.intensity ?? "intermediate";
    const coverageMode = body.coverageMode ?? "even";
    const intensityGuidance: Record<string, string> = {
      beginner: "Lead with concept-deepdive and active-recall. Limit timed mocks to 15-20% of weekly minutes. Build foundations before pace.",
      intermediate: "Balanced mix: ~40% SBA practice, 30% scenario/active recall, 20% deepdive, 10% mock. Standard interleaving.",
      advanced: "Heavy SBA + mock exposure (≥40% mocks/timed-sba). Surgical weak-area drills. Minimal concept time unless gaps exist.",
      resitter: "RESITTER MODE — assume prior coverage. ≥50% timed-sba/mixed-mock. Aggressive spaced repetition (1d/3d/7d/14d) on every flagged weak subtopic. Treat low-confidence + flagged subtopics as the entire revision spine.",
    };
    const weakSubtopicSummary = body.modules
      .filter((m) => (m.weakSubtopics?.length ?? 0) > 0)
      .map((m) => `  - ${m.name}: ${m.weakSubtopics!.join("; ")}`)
      .join("\n");
    const weakSubtopicBlock = weakSubtopicSummary
      ? `\nUSER-FLAGGED WEAK SUBTOPICS (give these noticeably more sessions, drills, mocks and spaced-repetition reps; reference by name in task titles):\n${weakSubtopicSummary}`
      : "";

    const userPrompt = `Design ${body.name}'s ${examPath} weekly strategy.
Exam path: ${examPath} (${body.examType})
Intensity tier: ${intensity.toUpperCase()} — ${intensityGuidance[intensity]}
Coverage mode: ${coverageMode === "advanced" ? "ADVANCED PERSONALISATION — bias hard toward flagged weak subtopics" : "EVEN — balanced coverage tuned by HY weighting"}
Exam date: ${body.examDate} (${daysUntilExam} days away)
Available study time: ${body.hoursPerWeek} hours/week
Confidence per module (1=weak, 5=strong):
${body.modules.map((m) => `- ${m.name}: ${m.confidence}/5`).join("\n")}${weakSubtopicBlock}${mockSummary}${recencySummary}

Apply the planner doctrine. Voice MUST sound like a calm, premium legal revision coach — never robotic. Produce:
(a) a 1–2 sentence overview that names the highest-priority subjects + reasoning (mention intensity and any weak subtopics by name);
(b) weeklyStrategy.allocations across modules. For EACH allocation include: rationale tag, plain-English note, 2–4 EXACT subtopics to cover this week, the suggested study method (one sentence), the expected outcome (one sentence). Tilt toward high-yield + weak-area + recency-gap; suppress HY≤2 niche topics; flagged weak modules get a noticeably larger share;
(c) todayTasks — academically-specific study blocks for THIS WEEK using interleaving + spaced repetition. Restrict tasks to the 2–3 priority subjects in weeklyFocus[0].modules PLUS at most 1–2 maintenance blocks on other subjects (so the week is coherent, not a random timetable). For EACH task include: title (names the exact subtopic), module, minutes, taskType, rationale, priority, why (one line), subtopic (canonical name), difficulty (foundational | core | challenging), output (the concrete artefact the user should produce), bucket (must | should | optional — split roughly 50% must, 30% should, 20% optional by minutes). CRITICAL: SUM of block minutes MUST equal ${body.hoursPerWeek * 60} (±10%). Typical count: ${Math.max(4, Math.ceil(body.hoursPerWeek * 60 / 75))}–${Math.ceil(body.hoursPerWeek * 60 / 45)} blocks. Allowed durations: 30/45/60/90/120;
(d) weeklyFocus — up to 12 forward-looking weekly themes built around topic clusters with spaced-repetition re-touches. EACH week MUST have: a clear theme in plain English (e.g. "Repair weak areas in Land Law and Business Law, then apply through mixed SBA practice"), 2–3 priority modules only, a one-sentence reason explaining why those subjects were chosen this week, target hours, and a balance object {review, recall, practice, mistakes} as percentages summing to 100;
(e) masteryTargets per module by exam day weighted by HY + paper weight + flagged weakness.
The allocations, tasks and weeklyFocus[0] MUST be internally consistent — same priority modules, same subtopics, no random interleaving of unrelated subjects unless explicitly framed as maintenance.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "study_plan",
                description: "Personalised SQE weekly strategy",
                parameters: {
                  type: "object",
                  properties: {
                    overview: {
                      type: "string",
                      description: "1-2 sentence strategy overview",
                    },
                    weeklyStrategy: {
                      type: "object",
                      description: "This week's intelligent allocation + tasks",
                      properties: {
                        summary: {
                          type: "string",
                          description: "Why this week is structured this way (1-2 sentences)",
                        },
                        allocations: {
                          type: "array",
                          description: "How the week's hours are split across modules — 4-7 entries totalling roughly the user's weekly hours",
                          items: {
                            type: "object",
                            properties: {
                              module: { type: "string" },
                              hours: { type: "number" },
                              rationale: {
                                type: "string",
                                enum: [
                                  "high-yield",
                                  "weak-area",
                                  "recency-gap",
                                  "mixed-practice",
                                  "mock-prep",
                                  "ethics-cornerstone",
                                ],
                              },
                              note: {
                                type: "string",
                                description: "One-line reason in plain English",
                              },
                              subtopics: {
                                type: "array",
                                description: "2–4 exact subtopic names to cover this week for this module",
                                items: { type: "string" },
                              },
                              method: {
                                type: "string",
                                description: "Suggested approach in one sentence (e.g. '60 min recall notes, 90 min timed SBA, 60 min mistake review')",
                              },
                              outcome: {
                                type: "string",
                                description: "Expected outcome by week end in one sentence",
                              },
                            },
                            required: ["module", "hours", "rationale", "note", "subtopics", "method", "outcome"],
                          },
                        },
                      },
                      required: ["summary", "allocations"],
                    },
                    weeklyFocus: {
                      type: "array",
                      description: "Up to 12 forward-looking weekly themes. Each week MUST have a coherent theme, 2–3 priority modules, a one-line reason, target hours and a balance object.",
                      items: {
                        type: "object",
                        properties: {
                          week: { type: "number" },
                          theme: { type: "string" },
                          modules: { type: "array", items: { type: "string" } },
                          hours: { type: "number" },
                          reason: {
                            type: "string",
                            description: "Plain-English explanation of WHY these subjects this week",
                          },
                          balance: {
                            type: "object",
                            description: "Time split as percentages, summing to 100",
                            properties: {
                              review: { type: "number" },
                              recall: { type: "number" },
                              practice: { type: "number" },
                              mistakes: { type: "number" },
                            },
                            required: ["review", "recall", "practice", "mistakes"],
                          },
                        },
                        required: ["week", "theme", "modules", "hours", "reason", "balance"],
                      },
                    },
                    todayTasks: {
                      type: "array",
                      description: `Strategic study blocks for THIS WEEK. Total minutes across blocks MUST sum to roughly ${body.hoursPerWeek * 60} (±10%) — the user's weekly hour target. Generate as many blocks as needed; do NOT cap at 5. Each title must be academically specific (named topics, format, count). Minutes must be one of 30, 45, 60, 90, 120.`,
                      items: {
                        type: "object",
                        properties: {
                          title: {
                            type: "string",
                            description: "Specific, strategic task. e.g. 'Timed mixed SBA set on easements, restrictive covenants & mortgages (35 Qs)'",
                          },
                          module: { type: "string", description: "Primary module" },
                          minutes: {
                            type: "number",
                            enum: [30, 45, 60, 90, 120],
                          },
                          taskType: {
                            type: "string",
                            enum: [
                              "timed-sba",
                              "mistake-review",
                              "scenario-drill",
                              "active-recall",
                              "mixed-mock",
                              "concept-deepdive",
                              "ethics-application",
                            ],
                          },
                          rationale: {
                            type: "string",
                            enum: [
                              "high-yield",
                              "weak-area",
                              "recency-gap",
                              "mixed-practice",
                              "mock-prep",
                              "ethics-cornerstone",
                            ],
                          },
                          priority: {
                            type: "string",
                            enum: ["high", "medium", "low"],
                          },
                          why: {
                            type: "string",
                            description: "One-line explanation of why this task now",
                          },
                        },
                        required: ["title", "module", "minutes", "taskType", "rationale", "priority", "why"],
                      },
                    },
                    masteryTargets: {
                      type: "array",
                      description: "Target confidence per module by exam day",
                      items: {
                        type: "object",
                        properties: {
                          module: { type: "string" },
                          targetConfidence: { type: "number" },
                          priority: {
                            type: "string",
                            enum: ["high", "medium", "low"],
                          },
                        },
                        required: ["module", "targetConfidence", "priority"],
                      },
                    },
                  },
                  required: [
                    "overview",
                    "weeklyStrategy",
                    "weeklyFocus",
                    "todayTasks",
                    "masteryTargets",
                  ],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "study_plan" } },
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error", response.status, text);
      return new Response(JSON.stringify({ plan: buildDeterministicPlan(body), daysUntilExam, fallback: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const structuredPlan = extractStructuredPlan(data);
    const plan = structuredPlan ?? buildDeterministicPlan(body);

    return new Response(
      JSON.stringify({ plan, daysUntilExam, fallback: !structuredPlan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-plan error", e);
    if (body) {
      return new Response(
        JSON.stringify({ plan: buildDeterministicPlan(body), daysUntilExam, fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
