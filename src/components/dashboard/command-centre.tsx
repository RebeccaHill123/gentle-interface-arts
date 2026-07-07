import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Circle,
  Compass,
  Flame,
  Play,
  Sparkles,
  Target,
  Timer,
  Zap,
} from "lucide-react";
import {
  buildExamMap,
  coverage,
  realDueForRecall,
  realWeakSpots,
  suggestedPriority,
  untouchedTopics,
  type ExamId,
  type RecommendedAction,
  type SubTopic,
  type Subject,
  type TopicStatus,
  type UserTopicProgress,
} from "@/lib/topic-map";

/* -------------------- Pills -------------------- */

const STATUS_LABEL: Record<TopicStatus, { label: string; cls: string }> = {
  "not-started": { label: "Not started", cls: "bg-foreground/[0.05] text-muted-foreground" },
  studied: { label: "Studied", cls: "bg-foreground/[0.05] text-foreground/80" },
  "not-enough-data": { label: "Not enough data", cls: "bg-foreground/[0.05] text-muted-foreground" },
  weak: { label: "Weak spot", cls: "bg-pink/10 text-pink/90" },
  improving: { label: "Improving", cls: "bg-cyan/10 text-cyan/90" },
  strong: { label: "Strong", cls: "bg-emerald-500/10 text-emerald-500/90" },
  "due-for-recall": { label: "Due for recall", cls: "bg-amber-500/10 text-amber-500/90" },
  "high-yield": { label: "High yield", cls: "bg-violet-500/10 text-violet-400/90" },
};

export function StatusPill({ status }: { status: TopicStatus }) {
  const meta = STATUS_LABEL[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

const ACTION_LABEL: Record<RecommendedAction, string> = {
  quiz: "Start quiz",
  revise: "Revise",
  "add-to-plan": "Add to plan",
  start: "Start topic",
};

export function ProgressPill({
  pct,
  hasActivity,
}: {
  pct: number;
  hasActivity: boolean;
}) {
  if (!hasActivity) {
    return (
      <span className="text-[11px] text-muted-foreground/70">No activity yet</span>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-pink-blue transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="text-[11px] font-medium text-foreground/80">{pct}%</span>
    </div>
  );
}

/* -------------------- Insight cards -------------------- */

interface InsightCardProps {
  title: string;
  value: string;
  subtext: string;
  ctaLabel: string;
  onCta?: () => void;
  ctaTo?: string;
  icon: React.ReactNode;
  accent: "pink" | "violet" | "cyan";
}

export function InsightCard({
  title,
  value,
  subtext,
  ctaLabel,
  onCta,
  ctaTo,
  icon,
  accent,
}: InsightCardProps) {
  const accentCls =
    accent === "pink"
      ? "bg-pink/10 text-pink/90"
      : accent === "violet"
        ? "bg-violet-500/10 text-violet-400/90"
        : "bg-cyan/10 text-cyan/90";
  const cta = (
    <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-foreground/80 transition-colors group-hover:text-foreground">
      {ctaLabel} <ArrowRight className="h-3 w-3" />
    </span>
  );
  return (
    <div className="group flex h-full flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-pink/30 hover:shadow-glow">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
            {title}
          </span>
          <span className={`grid h-6 w-6 place-items-center rounded-full ${accentCls}`}>
            {icon}
          </span>
        </div>
        <div className="mt-3 line-clamp-1 font-display text-[1.35rem] leading-tight text-foreground">
          {value}
        </div>
        <p className="mt-1 line-clamp-2 text-[12px] text-muted-foreground/85">
          {subtext}
        </p>
      </div>
      <div className="mt-4">
        {ctaTo ? (
          <Link to={ctaTo} className="inline-block">{cta}</Link>
        ) : (
          <button type="button" onClick={onCta} className="inline-block">
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}

/* -------------------- Today's plan cards -------------------- */

export interface TodayPlanItem {
  id: string;
  title: string;
  subject: string;
  subTopic?: string;
  minutes: number;
  format: string;
  priority: "must" | "weak-spot" | "high-yield";
  reason: string;
  done?: boolean;
}

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  must: { label: "Must do", cls: "bg-pink/10 text-pink/90" },
  "weak-spot": { label: "Weak spot", cls: "bg-amber-500/10 text-amber-500/90" },
  "high-yield": { label: "High yield", cls: "bg-violet-500/10 text-violet-400/90" },
  should: { label: "Should do", cls: "bg-cyan/10 text-cyan/90" },
  optional: { label: "Optional", cls: "bg-foreground/[0.05] text-muted-foreground" },
};

export function TodayPlanCard({
  item,
  onStart,
}: {
  item: TodayPlanItem;
  onStart?: () => void;
}) {
  const meta = PRIORITY_LABEL[item.priority] ?? PRIORITY_LABEL.should;
  return (
    <li>
      <div
        className={`group flex items-stretch gap-4 rounded-2xl border border-border/40 bg-card p-4 shadow-card transition-all hover:border-pink/30 hover:shadow-glow ${
          item.done ? "opacity-70" : ""
        }`}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>
              {meta.label}
            </span>
            <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground">
              {item.subject}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground">
              <Timer className="h-2.5 w-2.5" /> {item.minutes}m
            </span>
            <span className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground">
              {item.format}
            </span>
          </div>
          <p className="text-sm font-medium leading-snug text-foreground">
            {item.title}
          </p>
          {item.reason && (
            <p className="text-[11.5px] italic text-muted-foreground/85">
              {item.reason}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onStart}
          aria-label={`Start ${item.title}`}
          className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-full border border-border/60 bg-background transition-all group-hover:border-transparent group-hover:bg-gradient-pink-blue group-hover:text-primary-foreground group-hover:shadow-glow"
        >
          <Play className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

/* -------------------- Snapshot rows -------------------- */

function subMetaLine(sub: SubTopic): string {
  if (!sub.progress) return "No activity yet";
  const bits: string[] = [];
  if (sub.progress.timeSpentMinutes > 0) bits.push(`${sub.progress.timeSpentMinutes}m spent`);
  if (sub.accuracy !== null) bits.push(`${sub.accuracy}% accuracy`);
  else if (sub.progress.timeSpentMinutes > 0) bits.push("No quiz data yet");
  if (sub.lastRevisedDaysAgo !== null)
    bits.push(`Last revised ${sub.lastRevisedDaysAgo}d ago`);
  return bits.join(" · ") || "No activity yet";
}

function SnapshotItem({ sub }: { sub: SubTopic }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-2.5 py-2 transition-colors hover:bg-foreground/[0.02]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[12.5px] font-medium text-foreground">
            {sub.name}
          </span>
          <StatusPill status={sub.status} />
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
          {sub.subject} · {subMetaLine(sub)}
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full border border-border/60 px-2.5 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:border-pink/40 hover:text-pink"
      >
        {ACTION_LABEL[sub.recommendedAction]}
      </button>
    </li>
  );
}

function SnapshotBucket({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: SubTopic[];
  emptyLabel: string;
}) {
  return (
    <div>
      <div className="mb-1 px-2.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="px-2.5 py-2 text-[12px] text-muted-foreground/80">{emptyLabel}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((s) => (
            <SnapshotItem key={s.id} sub={s} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function TopicMapSnapshot({
  examId,
  progress,
  subjectMinutes,
}: {
  examId: ExamId;
  progress?: Map<string, UserTopicProgress>;
  subjectMinutes?: Map<string, number>;
}) {
  const map = buildExamMap(examId, progress, subjectMinutes);
  const weak = realWeakSpots(map, 3);
  const due = realDueForRecall(map, 3);
  const untouched = untouchedTopics(map, 3);
  return (
    <section className="flex h-full flex-col rounded-3xl border border-border/40 bg-card p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-foreground">
            {examId} Topic Map snapshot
          </h3>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Real activity only — no invented metrics.
          </p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/10 text-violet-400/90">
          <Compass className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-4 space-y-4">
        <SnapshotBucket
          title="Weak spots"
          items={weak}
          emptyLabel="Your weak spots will appear here once you complete quizzes or study sessions."
        />
        <SnapshotBucket
          title="Due for recall"
          items={due}
          emptyLabel="Nothing due yet — start a study session to activate recall tracking."
        />
        <SnapshotBucket
          title="Untouched (high-yield first)"
          items={untouched}
          emptyLabel="Every priority topic has been started."
        />
      </div>
      <div className="mt-5 border-t border-border/40 pt-4">
        <Link
          to="/topics"
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground/85 hover:text-foreground"
        >
          Open full Topic Map <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

/* -------------------- Command Centre (compose) -------------------- */

export function CommandCentre({
  userName,
  examId,
  progress,
  subjectMinutes,
  onReviewWeak,
  onStartPriority,
  onStartFocus,
  onStartDiagnostic,
  todayItems,
  onStartItem,
}: {
  userName: string;
  examId: ExamId;
  progress?: Map<string, UserTopicProgress>;
  subjectMinutes?: Map<string, number>;
  onReviewWeak?: () => void;
  onStartPriority?: () => void;
  onStartFocus?: () => void;
  onStartDiagnostic?: () => void;
  todayItems?: TodayPlanItem[];
  onStartItem?: (id: string) => void;
}) {
  const map = buildExamMap(examId, progress, subjectMinutes);
  const cov = coverage(map);
  const weakList = realWeakSpots(map, 1);
  const priority = suggestedPriority(map);
  const hasAnyActivity = cov.startedCount > 0;

  const weakValue = weakList[0]?.name ?? "None yet";
  const weakSubtext = weakList[0]
    ? `${weakList[0].subject} · ${weakList[0].accuracy}% accuracy`
    : hasAnyActivity
      ? "No weak spots detected yet"
      : "Complete a quiz to identify weak areas";

  const priorityValue = priority?.name ?? "Pick a topic";
  const prioritySubtext = !priority
    ? "Open the Topic Map to add one"
    : priority.isHighYield
      ? `${priority.subject} · High-yield · Not started`
      : `${priority.subject} · Suggested next`;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card p-6 md:p-8 shadow-card">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-gradient-pink-blue opacity-[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan/20 opacity-[0.08] blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-pink" />
            {userName ? `Hi ${userName.split(" ")[0]},` : "Welcome back,"} you're on the {examId} route
          </div>
          <h2 className="mt-3 font-display text-2xl tracking-[-0.01em] text-foreground md:text-[1.75rem]">
            {hasAnyActivity ? "Your exam command centre" : `Start building your ${examId} map`}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {hasAnyActivity
              ? "See what needs attention, what's improving, and what to revise next."
              : `Complete a focus session or quiz to let Tentra identify your weak areas, track recall gaps and recommend what to study next.`}
          </p>

          {!hasAnyActivity && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onStartFocus}
                className="rounded-full bg-gradient-pink-blue px-4 py-2 text-[12.5px] font-medium text-primary-foreground shadow-glow transition-all hover:brightness-[1.06]"
              >
                Start {examId} focus session
              </button>
              <button
                type="button"
                onClick={onStartDiagnostic}
                className="rounded-full border border-border/60 bg-background px-4 py-2 text-[12.5px] font-medium text-foreground transition-colors hover:border-pink/40"
              >
                Take diagnostic quiz
              </button>
              <Link
                to="/topics"
                className="rounded-full border border-border/60 bg-background px-4 py-2 text-[12.5px] font-medium text-foreground transition-colors hover:border-pink/40"
              >
                Open {examId} Topic Map
              </Link>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InsightCard
              title="Weakest area"
              value={weakValue}
              subtext={weakSubtext}
              ctaLabel="Review weak spots"
              onCta={onReviewWeak}
              icon={<AlertTriangle className="h-3 w-3" />}
              accent="pink"
            />
            <InsightCard
              title="Coverage"
              value={`${cov.startedPct}% started`}
              subtext={`${cov.untouchedCount} of ${cov.totalCount} topics not started`}
              ctaLabel="Open Topic Map"
              ctaTo="/topics"
              icon={<Compass className="h-3 w-3" />}
              accent="violet"
            />
            <InsightCard
              title="Today's priority"
              value={priorityValue}
              subtext={prioritySubtext}
              ctaLabel={
                priority?.recommendedAction === "start" || !hasAnyActivity
                  ? "Start topic"
                  : "Continue"
              }
              onCta={onStartPriority}
              icon={priority?.isHighYield ? <Zap className="h-3 w-3" /> : <Target className="h-3 w-3" />}
              accent="cyan"
            />
          </div>
        </div>
      </section>

      {/* Two-column body */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <section className="flex flex-col rounded-3xl border border-border/40 bg-card p-6 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-medium text-foreground">Today's plan</h3>
              <p className="mt-1 text-xs text-muted-foreground/80">
                {todayItems && todayItems.length > 0
                  ? "Blocks from your study plan."
                  : "Your study plan will populate here as you generate one and log activity."}
              </p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-pink/10 text-pink/90">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          {todayItems && todayItems.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {todayItems.map((item) => (
                <TodayPlanCard
                  key={item.id}
                  item={item}
                  onStart={() => onStartItem?.(item.id)}
                />
              ))}
            </ul>
          ) : (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 p-6 text-center">
              <Circle className="h-5 w-5 text-muted-foreground/70" />
              <p className="mt-3 text-sm text-foreground">No blocks scheduled today</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Start a focus session or generate a plan to see recommended blocks here.
              </p>
            </div>
          )}
        </section>

        <TopicMapSnapshot examId={examId} progress={progress} subjectMinutes={subjectMinutes} />
      </div>
    </div>
  );
}
