import { useMemo, useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Circle,
  Clock,
  Compass,
  Flame,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  ProgressPill,
  StatusPill,
} from "@/components/dashboard/command-centre";
import { loadPlan, pullPlanFromCloud, savePlan, type StoredPlan, type StrategyTask } from "@/lib/plan-store";
import {
  aggregateSubjectMinutes,
  buildExamMap,
  examSummary,
  getUserExamId,
  matchesFilter,
  matchesSearch,
  SYLLABUSES,
  type Chapter,
  type ExamId,
  type ExamMap,
  type RecommendedAction,
  type SubTopic,
  type Subject,
  type TopicFilter,
} from "@/lib/topic-map";
import { useEffect } from "react";

export const Route = createFileRoute("/topics")({
  beforeLoad: async () => {
    const { requireAccess } = await import("@/lib/access-guard");
    await requireAccess();
  },
  component: TopicsPage,
  head: () => ({
    meta: [
      { title: "Topic Map · Tentra" },
      {
        name: "description",
        content:
          "Full SQE1 & UBE syllabus map — track confidence, weak spots and next actions by subject, chapter and sub-topic as you study.",
      },
    ],
  }),
});

const ACTION_LABEL: Record<RecommendedAction, string> = {
  quiz: "Start quiz",
  revise: "Revise",
  "add-to-plan": "Add to plan",
  start: "Start topic",
};

/* -------------------- Filters + search -------------------- */

const FILTERS: { id: TopicFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "weak-spots", label: "Weak spots" },
  { id: "untouched", label: "Untouched" },
  { id: "due-for-recall", label: "Due for recall" },
  { id: "high-yield", label: "High yield" },
  { id: "improving", label: "Improving" },
];

function FilterBar({
  filter,
  onFilter,
  q,
  onQ,
}: {
  filter: TopicFilter;
  onFilter: (f: TopicFilter) => void;
  q: string;
  onQ: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="-mx-1 flex flex-1 flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilter(f.id)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              filter === f.id
                ? "border-transparent bg-foreground text-background"
                : "border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="relative w-full md:w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Search topics, chapters or sub-topics…"
          className="w-full rounded-full border border-border/50 bg-card py-2 pl-9 pr-3 text-[12.5px] text-foreground placeholder:text-muted-foreground/70 focus:border-pink/50 focus:outline-none"
        />
      </div>
    </div>
  );
}

/* -------------------- Summary cards -------------------- */

function SummaryCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: "violet" | "pink" | "amber" | "cyan";
}) {
  const cls =
    accent === "pink"
      ? "bg-pink/10 text-pink/90"
      : accent === "amber"
        ? "bg-amber-500/10 text-amber-500/90"
        : accent === "cyan"
          ? "bg-cyan/10 text-cyan/90"
          : "bg-violet-500/10 text-violet-400/90";
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
          {label}
        </span>
        <span className={`grid h-6 w-6 place-items-center rounded-full ${cls}`}>
          {icon}
        </span>
      </div>
      <div className="mt-3 font-display text-2xl text-foreground">{value}</div>
      <p className="mt-1 text-[11.5px] text-muted-foreground/80">{sub}</p>
    </div>
  );
}

function SummaryRow({ map }: { map: ExamMap }) {
  const s = examSummary(map);
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <SummaryCard
        label="Overall coverage"
        value={`${s.coveragePct}%`}
        sub={s.coveragePct > 0 ? "of syllabus started" : "Not started yet"}
        icon={<Compass className="h-3 w-3" />}
        accent="violet"
      />
      <SummaryCard
        label="Weak spots"
        value={s.weakSpots > 0 ? String(s.weakSpots) : "—"}
        sub={s.weakSpots > 0 ? "identified from quizzes" : "No quiz data yet"}
        icon={<AlertTriangle className="h-3 w-3" />}
        accent="pink"
      />
      <SummaryCard
        label="Untouched"
        value={String(s.untouched)}
        sub="not yet started"
        icon={<Circle className="h-3 w-3" />}
        accent="amber"
      />
      <SummaryCard
        label="Due this week"
        value={s.dueThisWeek > 0 ? String(s.dueThisWeek) : "—"}
        sub={s.dueThisWeek > 0 ? "need recall" : "No recall data yet"}
        icon={<Clock className="h-3 w-3" />}
        accent="cyan"
      />
    </div>
  );
}

/* -------------------- Rows -------------------- */

function subMetaLine(sub: SubTopic): string {
  if (!sub.progress) return "No activity yet";
  const bits: string[] = [];
  if (sub.progress.timeSpentMinutes > 0) bits.push(`${sub.progress.timeSpentMinutes}m spent`);
  else bits.push("No study time logged");
  if (sub.accuracy !== null) bits.push(`${sub.accuracy}% accuracy`);
  else bits.push("No quiz data yet");
  if (sub.lastRevisedDaysAgo !== null)
    bits.push(`Last revised ${sub.lastRevisedDaysAgo}d ago`);
  return bits.join(" · ");
}

function addSubTopicToTodayPlan(sub: SubTopic): boolean {
  const stored = loadPlan();
  if (!stored) return false;
  const task: StrategyTask = {
    title: `Build foundation: ${sub.name}`,
    module: sub.subject,
    minutes: 30,
    taskType: "concept-deepdive",
    priority: sub.isHighYield ? "high" : "medium",
    subtopic: sub.name,
    difficulty: "foundational",
    bucket: sub.isHighYield ? "must" : "should",
    why: `Added from the Topic Map — ${sub.isHighYield ? "high-yield " : ""}foundation on ${sub.name}.`,
    output: `Rule scaffold + 3 short application prompts on ${sub.name}.`,
  };
  const existing = stored.plan.todayTasks ?? [];
  const already = existing.some(
    (t) => (t.subtopic ?? "").toLowerCase() === sub.name.toLowerCase() && t.module === sub.subject,
  );
  if (already) return false;
  stored.plan.todayTasks = [...existing, task];
  savePlan(stored);
  return true;
}

function SubTopicRow({ sub, onPlanChanged }: { sub: SubTopic; onPlanChanged: () => void }) {
  const label = ACTION_LABEL[sub.recommendedAction];
  const aria = `${label} — ${sub.name}`;
  const buttonClass =
    "shrink-0 rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:border-pink/40 hover:text-pink";

  let action: React.ReactNode;
  if (sub.recommendedAction === "start") {
    action = (
      <Link
        to="/flashcards"
        search={{ subject: sub.subject, subtopic: sub.name }}
        aria-label={aria}
        className={buttonClass}
      >
        {label}
      </Link>
    );
  } else if (sub.recommendedAction === "quiz") {
    action = (
      <Link
        to="/practice"
        search={{ subject: sub.subject, subtopic: sub.name, length: 10, mode: "quiz" }}
        aria-label={aria}
        className={buttonClass}
      >
        {label}
      </Link>
    );
  } else if (sub.recommendedAction === "revise") {
    action = (
      <Link
        to="/practice"
        search={{ subject: sub.subject, subtopic: sub.name, length: 5, mode: "revise" }}
        aria-label={aria}
        className={buttonClass}
      >
        {label}
      </Link>
    );
  } else {
    // add-to-plan
    action = (
      <button
        type="button"
        aria-label={aria}
        onClick={() => {
          const ok = addSubTopicToTodayPlan(sub);
          if (ok) {
            toast.success("Added to today's plan", {
              description: `${sub.name} · ${sub.subject}`,
            });
            onPlanChanged();
          } else {
            toast.info("Already in today's plan", {
              description: `${sub.name} · ${sub.subject}`,
            });
          }
        }}
        className={buttonClass}
      >
        {label}
      </button>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/[0.02]">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">
            {sub.name}
          </span>
          <StatusPill status={sub.status} />
          {sub.isHighYield && sub.status !== "high-yield" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-400/90">
              <Zap className="h-2.5 w-2.5" /> High yield
            </span>
          )}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground/80">
          {subMetaLine(sub)}
        </div>
        {sub.microTopics && sub.microTopics.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {sub.microTopics.map((m) => (
              <span
                key={m}
                className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
      {action}
    </li>
  );
}

function ChapterBlock({
  chapter,
  visibleSubTopics,
  onPlanChanged,
}: {
  chapter: Chapter;
  visibleSubTopics: SubTopic[];
  onPlanChanged: () => void;
}) {
  const [open, setOpen] = useState(true);
  if (visibleSubTopics.length === 0) return null;
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-left text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground/85 transition-colors hover:text-foreground"
      >
        <span>
          {chapter.name}{" "}
          <span className="text-muted-foreground/60">({visibleSubTopics.length})</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul className="mt-1 space-y-0.5">
          {visibleSubTopics.map((s) => (
            <SubTopicRow key={s.id} sub={s} onPlanChanged={onPlanChanged} />
          ))}
        </ul>
      )}
    </div>
  );
}

function subjectMetaLine(subject: Subject): string {
  if (!subject.hasActivity) return "No activity yet";
  const bits: string[] = [];
  if (subject.timeSpentMinutes > 0) bits.push(`${subject.timeSpentMinutes}m logged`);
  const started = subject.chapters
    .flatMap((c) => c.subTopics)
    .filter((s) => s.progress !== null).length;
  if (started > 0) bits.push(`${started} sub-topic${started === 1 ? "" : "s"} touched`);
  return bits.join(" · ") || "No activity yet";
}

function SubjectBlock({
  subject,
  visibleByChapter,
  totalVisible,
  defaultOpen,
  onPlanChanged,
}: {
  subject: Subject;
  visibleByChapter: Map<string, SubTopic[]>;
  totalVisible: number;
  defaultOpen: boolean;
  onPlanChanged: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (totalVisible === 0) return null;
  const startedCount = subject.chapters
    .flatMap((c) => c.subTopics)
    .filter((s) => s.progress !== null).length;
  const total = subject.chapters.flatMap((c) => c.subTopics).length;
  const startedPct = total > 0 ? Math.round((startedCount / total) * 100) : 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left transition-colors hover:bg-foreground/[0.02]"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">
              {subject.name}
            </span>
            <StatusPill status={subject.status} />
            <span className="text-[10.5px] text-muted-foreground/70">
              {totalVisible} sub-topic{totalVisible === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <ProgressPill pct={startedPct} hasActivity={subject.hasActivity} />
            <span className="text-[11px] text-muted-foreground/80">
              {subjectMetaLine(subject)}
            </span>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mb-2 ml-3 mt-1 border-l border-border/40 pl-3">
          {subject.chapters.map((c) => (
            <ChapterBlock
              key={c.id}
              chapter={c}
              visibleSubTopics={visibleByChapter.get(c.id) ?? []}
              onPlanChanged={onPlanChanged}
            />
          ))}
        </div>
      )}
    </li>
  );
}

/* -------------------- Page -------------------- */

const EXAMS: { id: ExamId; label: string }[] = [
  { id: "SQE1", label: "SQE1" },
  { id: "UBE", label: "UBE" },
];

function TopicsPage() {
  const [stored, setStored] = useState<StoredPlan | null>(null);
  const [planTick, setPlanTick] = useState(0);
  const onPlanChanged = () => {
    setStored(loadPlan());
    setPlanTick((t) => t + 1);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      const cloud = await pullPlanFromCloud();
      if (!active) return;
      setStored(cloud ?? loadPlan());
    })();
    return () => {
      active = false;
    };
  }, []);

  const userExamId: ExamId = getUserExamId(stored?.input.examType);
  const [exam, setExam] = useState<ExamId | null>(null);
  const activeExam: ExamId = exam ?? userExamId;

  const [filter, setFilter] = useState<TopicFilter>("all");
  const [q, setQ] = useState("");

  const subjectMinutes = useMemo(
    () => aggregateSubjectMinutes(stored?.sessions ?? []),
    [stored],
  );

  const map = useMemo(
    () => buildExamMap(activeExam, new Map(), subjectMinutes),
    [activeExam, subjectMinutes],
  );

  const filtered = useMemo(() => {
    const perSubject = new Map<
      string,
      { subject: Subject; byChapter: Map<string, SubTopic[]>; total: number }
    >();
    for (const comp of map.components) {
      for (const subj of comp.subjects) {
        const byChapter = new Map<string, SubTopic[]>();
        let total = 0;
        for (const ch of subj.chapters) {
          const list = ch.subTopics.filter(
            (s) => matchesFilter(s, filter) && matchesSearch(s, q),
          );
          if (list.length > 0) {
            byChapter.set(ch.id, list);
            total += list.length;
          }
        }
        perSubject.set(subj.id, { subject: subj, byChapter, total });
      }
    }
    return perSubject;
  }, [map, filter, q]);

  const activeFilter = filter !== "all" || q.length > 0;
  const isSwitched = exam !== null && exam !== userExamId;

  return (
    <AppShell title="Topic Map" subtitle="Every subject, chapter and sub-topic.">
      <div className="space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Dashboard
        </Link>

        {/* Header */}
        <section className="rounded-3xl border border-border/40 bg-card p-6 shadow-card md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="h-3 w-3 text-pink" /> Currently tracking: {userExamId}
              </div>
              <h2 className="mt-3 font-display text-2xl tracking-[-0.01em] text-foreground md:text-[1.75rem]">
                {SYLLABUSES[activeExam].label} Topic Map
              </h2>
              <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                Track progress by component, subject, chapter and sub-topic.
                Expand any subject for chapters, and any chapter for individual
                sub-topics with quick actions.
              </p>
              {isSwitched && (
                <p className="mt-3 max-w-2xl rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12px] text-amber-500/90">
                  You're viewing the {activeExam} map. This doesn't change your
                  active study route ({userExamId}) — confirm in Settings if you
                  want to switch.
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                Switch exam map
              </span>
              <div className="flex gap-1 rounded-full border border-border/50 bg-background p-1">
                {EXAMS.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setExam(e.id)}
                    className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors ${
                      activeExam === e.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Summary */}
        <SummaryRow map={map} />

        {/* Filters + search */}
        <section className="rounded-2xl border border-border/40 bg-card p-4 shadow-card">
          <FilterBar filter={filter} onFilter={setFilter} q={q} onQ={setQ} />
        </section>

        {/* Components */}
        <div className="space-y-6">
          {map.components.map((comp) => {
            const compTotal = comp.subjects.reduce(
              (a, s) => a + (filtered.get(s.id)?.total ?? 0),
              0,
            );
            if (compTotal === 0) return null;
            return (
              <section
                key={comp.id}
                className="rounded-3xl border border-border/40 bg-card p-6 shadow-card md:p-8"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg text-foreground md:text-xl">
                      {comp.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground/85">
                      {comp.subjects.length} subject
                      {comp.subjects.length === 1 ? "" : "s"} · {compTotal}{" "}
                      matching sub-topic{compTotal === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-500/10 text-violet-400/90">
                    <Flame className="h-4 w-4" />
                  </span>
                </div>
                <ul className="mt-4 divide-y divide-border/40">
                  {comp.subjects.map((subj) => {
                    const f = filtered.get(subj.id);
                    if (!f || f.total === 0) return null;
                    return (
                      <SubjectBlock
                        key={subj.id}
                        subject={subj}
                        visibleByChapter={f.byChapter}
                        totalVisible={f.total}
                        defaultOpen={activeFilter}
                      />
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {Array.from(filtered.values()).every((v) => v.total === 0) && (
            <div className="rounded-3xl border border-border/40 bg-card p-10 text-center shadow-card">
              <p className="text-sm text-foreground">This topic has no activity yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Start a session, complete a quiz or add it to your plan to begin
                tracking confidence, accuracy and recall.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
