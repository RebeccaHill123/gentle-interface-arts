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

interface StudyTask {
  title: string;
  module: string;
  minutes: TaskMinutes;
  taskType: "timed-sba" | "mistake-review" | "scenario-drill" | "active-recall" | "mixed-mock" | "concept-deepdive" | "ethics-application";
  rationale: "high-yield" | "weak-area" | "recency-gap" | "mixed-practice" | "mock-prep" | "ethics-cornerstone";
  priority: "high" | "medium" | "low";
  why: string;
}

interface StudyPlanResponse {
  overview: string;
  weeklyStrategy: {
    summary: string;
    allocations: { module: string; hours: number; rationale: StudyTask["rationale"]; note: string }[];
  };
  weeklyFocus: { week: number; theme: string; modules: string[]; hours: number }[];
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

  const focusModules = scoredModules.slice(0, Math.min(6, scoredModules.length || 1));
  const durations: TaskMinutes[] = [];
  let remaining = targetMinutes;
  while (remaining > 0) {
    const next: TaskMinutes = remaining >= 90 ? 90 : remaining >= 60 ? 60 : remaining >= 45 ? 45 : 30;
    durations.push(next);
    remaining -= next;
  }

  const taskTypes: StudyTask["taskType"][] = ["timed-sba", "active-recall", "scenario-drill", "mistake-review", "ethics-application", "mixed-mock"];
  const rationales: StudyTask["rationale"][] = ["weak-area", "high-yield", "mixed-practice", "recency-gap", "ethics-cornerstone", "mock-prep"];
  const todayTasks = durations.map((minutes, index): StudyTask => {
    const module = focusModules[index % focusModules.length] ?? scoredModules[0];
    const weak = module.weakSubtopics ?? [];
    const subtopics = weak.length > 0 ? weak : module.subject.subtopics;
    const topicA = subtopics[index % subtopics.length];
    const topicB = subtopics[(index + 2) % subtopics.length] ?? topicA;
    const isWeak = module.confidence <= 2 || weak.length > 0;
    const isStale = (module.recencyDays ?? 99) > 10;
    const rationale = isStale ? "recency-gap" : isWeak ? "weak-area" : rationales[index % rationales.length];
    const isResitter = intensity === "resitter";
    const baseTaskType = isResitter && index % 3 === 2 ? "mixed-mock" : isWeak && intensity === "beginner" ? "concept-deepdive" : taskTypes[index % taskTypes.length];
    const taskType = module.name.includes("Ethics") || rationale === "ethics-cornerstone" ? "ethics-application" : baseTaskType;
    return {
      title: `${taskType === "timed-sba" || taskType === "mixed-mock" ? "Timed mixed SBA set" : taskType === "active-recall" ? "Active recall drill" : taskType === "mistake-review" ? "Mistake-log review" : taskType === "concept-deepdive" ? "Concept deep-dive" : "Scenario drill"} on ${topicA}${topicB !== topicA ? ` and ${topicB}` : ""}`,
      module: module.name,
      minutes,
      taskType,
      rationale,
      priority: module.score >= 0.55 ? "high" : module.score >= 0.42 ? "medium" : "low",
      why: `${module.name} is prioritised for ${weak.length > 0 ? `flagged weak subtopics (${weak.slice(0, 2).join(", ")})` : isWeak ? "low confidence" : module.subject.highYield >= 4 ? "high-yield coverage" : "balanced interleaving"}${isStale ? " and revision staleness" : ""}.`,
    };
  });

  const totalScore = focusModules.reduce((sum, module) => sum + module.score, 0) || 1;
  const allocations = focusModules.map((module) => ({
    module: module.name,
    hours: Math.round((body.hoursPerWeek * module.score / totalScore) * 10) / 10,
    rationale: (module.confidence <= 2 ? "weak-area" : module.subject.highYield >= 5 ? "high-yield" : "mixed-practice") as StudyTask["rationale"],
    note: `${module.subject.groups.join("/")} cluster; HY${module.subject.highYield}, confidence ${module.confidence}/5.`,
  }));

  return {
    overview: `${body.name}, this plan prioritises ${focusModules.slice(0, 3).map((m) => m.name).join(", ")} because they combine high SQE yield with your current confidence and revision recency profile. The week is deliberately interleaved so weak areas are reinforced without crowding out mixed SBA practice.`,
    weeklyStrategy: {
      summary: `This week allocates ${body.hoursPerWeek} hours across high-yield weak areas, recency gaps and mixed practice blocks. Task minutes total ${todayTasks.reduce((sum, task) => sum + task.minutes, 0)} minutes.`,
      allocations,
    },
    todayTasks,
    weeklyFocus: Array.from({ length: Math.min(12, Math.max(4, Math.ceil(84 / 7))) }, (_, index) => {
      const first = scoredModules[index % scoredModules.length] ?? focusModules[0];
      const second = scoredModules[(index + 1) % scoredModules.length] ?? first;
      return {
        week: index + 1,
        hours: body.hoursPerWeek,
        theme: index < 2 ? `High-yield repair: ${first.name} with ${second.name}` : index >= 8 ? `Mock analysis and targeted refresh: ${first.name}` : `Interleaved consolidation: ${first.subject.groups[0] ?? first.name}`,
        modules: Array.from(new Set([first.name, second.name])),
      };
    }),
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

    const userPrompt = `Design ${body.name}'s ${body.examType} weekly strategy.
Exam date: ${body.examDate} (${daysUntilExam} days away)
Available study time: ${body.hoursPerWeek} hours/week
Confidence per module (1=weak, 5=strong):
${body.modules.map((m) => `- ${m.name}: ${m.confidence}/5`).join("\n")}${mockSummary}${recencySummary}

Apply the planner doctrine. Produce: (a) a 1–2 sentence overview that names the highest-priority subjects + reasoning, (b) a weekly allocation across modules with rationale tags + plain-English notes (tilt toward high-yield + weak-area + recency-gap, suppress HY≤2 niche topics), (c) academically-specific strategic study blocks for THIS WEEK using interleaving + spaced repetition (mix timed-sba, mistake-review, scenario-drill, active-recall, mixed-mock), each task referencing canonical subtopic names. CRITICAL: the SUM of block minutes MUST equal ${body.hoursPerWeek * 60} (±10%) — i.e. ${body.hoursPerWeek} hours total. Generate as many blocks as needed (typically ${Math.max(4, Math.ceil(body.hoursPerWeek * 60 / 75))}–${Math.ceil(body.hoursPerWeek * 60 / 45)} blocks) using the allowed durations 30/45/60/90/120, and keep the per-module hour split aligned with the weekly allocation in (b). (d) up to 12 weeks of forward-looking weekly themes built around topic clusters, (e) mastery targets per module by exam day weighted by HY + paper weight.`;

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
                            },
                            required: ["module", "hours", "rationale", "note"],
                          },
                        },
                      },
                      required: ["summary", "allocations"],
                    },
                    weeklyFocus: {
                      type: "array",
                      description: "Up to 12 forward-looking weekly themes",
                      items: {
                        type: "object",
                        properties: {
                          week: { type: "number" },
                          theme: { type: "string" },
                          modules: { type: "array", items: { type: "string" } },
                          hours: { type: "number" },
                        },
                        required: ["week", "theme", "modules", "hours"],
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
