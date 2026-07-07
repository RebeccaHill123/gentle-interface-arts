import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Compass,
  Flame,
  Play,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import {
  MOCK_TOPIC_MAP,
  coverage,
  dueForRecall,
  todaysPriority,
  untouchedTopics,
  weakSubTopicNames,
  weakestSubject,
  weakestSubTopics,
  type RecommendedAction,
  type SubTopic,
  type SubTopicStatus,
  type Subject,
  type SubjectStatus,
} from "@/lib/topic-map";

/* -------------------- Pills -------------------- */

const STATUS_LABEL: Record<SubjectStatus, { label: string; cls: string }> = {
  "weak-spot": { label: "Weak spot", cls: "bg-pink/10 text-pink/90" },
  improving: { label: "Improving", cls: "bg-cyan/10 text-cyan/90" },
  "needs-practice": {
    label: "Needs practice",
    cls: "bg-amber-500/10 text-amber-500/90",
  },
  "on-track": { label: "On track", cls: "bg-emerald-500/10 text-emerald-500/90" },
};

const CONFIDENCE_LABEL: Record<SubTopicStatus, { label: string; cls: string }> = {
  untouched: { label: "Untouched", cls: "bg-foreground/[0.05] text-muted-foreground" },
  weak: { label: "Weak", cls: "bg-pink/10 text-pink/90" },
  medium: { label: "Medium", cls: "bg-cyan/10 text-cyan/90" },
  strong: { label: "Strong", cls: "bg-emerald-500/10 text-emerald-500/90" },
};

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  must: { label: "Must do", cls: "bg-pink/10 text-pink/90" },
  "weak-spot": { label: "Weak spot", cls: "bg-amber-500/10 text-amber-500/90" },
  "high-yield": { label: "High yield", cls: "bg-violet-500/10 text-violet-400/90" },
  should: { label: "Should do", cls: "bg-cyan/10 text-cyan/90" },
  optional: { label: "Optional", cls: "bg-foreground/[0.05] text-muted-foreground" },
};

export function StatusPill({ status }: { status: SubjectStatus }) {
  const meta = STATUS_LABEL[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

export function ProgressPill({ pct }: { pct: number }) {
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
  format: string; // e.g. "Timed practice"
  priority: "must" | "weak-spot" | "high-yield";
  reason: string;
  done?: boolean;
}

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
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.cls}`}
            >
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

/* -------------------- Topic Map snapshot -------------------- */

const ACTION_LABEL: Record<RecommendedAction, string> = {
  quiz: "Quiz",
  revise: "Revise",
  "add-to-plan": "Add to plan",
};

export function SubTopicRow({ sub }: { sub: SubTopic }) {
  const meta = CONFIDENCE_LABEL[sub.confidence];
  const revised =
    sub.lastRevisedDaysAgo === null
      ? "Untouched"
      : `Last revised ${sub.lastRevisedDaysAgo}d ago`;
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-foreground/[0.02]">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">
            {sub.name}
          </span>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}
          >
            {meta.label}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground/80">
          {revised}
          {sub.accuracy !== null && ` · ${sub.accuracy}% accuracy`}
        </div>
      </div>
      <button
        type="button"
        className="shrink-0 rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:border-pink/40 hover:text-pink"
      >
        {ACTION_LABEL[sub.recommendedAction]}
      </button>
    </li>
  );
}

export function TopicRow({ subject }: { subject: Subject }) {
  const [open, setOpen] = useState(false);
  const allSubs = subject.chapters.flatMap((c) => c.subTopics);
  const chips = allSubs
    .filter((s) => s.confidence === "weak" || s.confidence === "untouched")
    .slice(0, 3);
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
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <ProgressPill pct={subject.progress} />
            {chips.map((s) => (
              <span
                key={s.id}
                className="rounded-full bg-foreground/[0.04] px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {s.name}
              </span>
            ))}
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="mb-2 ml-3 mt-1 space-y-1 border-l border-border/40 pl-3">
          {allSubs.map((s) => (
            <SubTopicRow key={s.id} sub={s} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function TopicMapSnapshot({ subjects }: { subjects: Subject[] }) {
  return (
    <section className="flex h-full flex-col rounded-3xl border border-border/40 bg-card p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-medium text-foreground">Topic Map</h3>
          <p className="mt-1 text-xs text-muted-foreground/80">
            Track progress by subject, chapter and sub-topic.
          </p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/10 text-violet-400/90">
          <Compass className="h-4 w-4" />
        </span>
      </div>
      <ul className="mt-4 divide-y divide-border/40">
        {subjects.map((s) => (
          <TopicRow key={s.id} subject={s} />
        ))}
      </ul>
      <div className="mt-4 border-t border-border/40 pt-4">
        <Link
          to="/topics"
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground/85 hover:text-foreground"
        >
          View full Topic Map <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}

/* -------------------- Command Centre (compose) -------------------- */

export function CommandCentre({
  userName,
  onReviewWeak,
  onStartPriority,
  todayItems,
  onStartItem,
}: {
  userName: string;
  onReviewWeak?: () => void;
  onStartPriority?: () => void;
  todayItems?: TodayPlanItem[];
  onStartItem?: (id: string) => void;
}) {
  const map = MOCK_TOPIC_MAP;
  const weakest = weakestSubject(map);
  const cov = coverage(map);
  const priority = todaysPriority(map);
  const subjects = flatSubjects(map);

  const weakSubs = weakest ? weakSubTopicNames(weakest) : [];
  const weakSubtext = weakSubs.length
    ? `${weakSubs.join(" and ")} need attention`
    : "Log a session to surface weak spots";

  const items: TodayPlanItem[] =
    todayItems && todayItems.length > 0
      ? todayItems
      : DEFAULT_TODAY_ITEMS;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card p-6 md:p-8 shadow-card">
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-gradient-pink-blue opacity-[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan/20 opacity-[0.08] blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3 w-3 text-pink" />
            {userName ? `Hi ${userName.split(" ")[0]},` : "Welcome back,"} here's your snapshot
          </div>
          <h2 className="mt-3 font-display text-2xl tracking-[-0.01em] text-foreground md:text-[1.75rem]">
            Your exam command centre
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            See what needs attention, what's improving, and what Tentra recommends
            you revise next.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InsightCard
              title="Weakest area"
              value={weakest?.name ?? "—"}
              subtext={weakSubtext}
              ctaLabel="Review weak spots"
              onCta={onReviewWeak}
              icon={<AlertTriangle className="h-3 w-3" />}
              accent="pink"
            />
            <InsightCard
              title="Coverage"
              value={`${cov.mappedPct}% mapped`}
              subtext={`${cov.untouchedCount} topics untouched this month`}
              ctaLabel="Open Topic Map"
              ctaTo="/topics"
              icon={<Compass className="h-3 w-3" />}
              accent="violet"
            />
            <InsightCard
              title="Today's priority"
              value={priority?.sub.name ?? "Pick a topic"}
              subtext={
                priority?.sub.highYield
                  ? "High-yield and due for recall"
                  : "Recommended next by Tentra"
              }
              ctaLabel={`Start ${items[0]?.minutes ?? 25}-min block`}
              onCta={onStartPriority ?? (() => onStartItem?.(items[0]?.id ?? ""))}
              icon={<Target className="h-3 w-3" />}
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
                Three recommended blocks, chosen from your weak spots and today's priorities.
              </p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-pink/10 text-pink/90">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <TodayPlanCard
                key={item.id}
                item={item}
                onStart={() => onStartItem?.(item.id)}
              />
            ))}
          </ul>
        </section>

        <TopicMapSnapshot subjects={subjects} />
      </div>
    </div>
  );
}

/* -------------------- Default mock plan items -------------------- */

const DEFAULT_TODAY_ITEMS: TodayPlanItem[] = [
  {
    id: "t1",
    title: "Timed SBA set: Contract formation & vitiating factors",
    subject: "Contract",
    subTopic: "Formation",
    minutes: 25,
    format: "Timed practice",
    priority: "must",
    reason: "High-yield and due for recall",
  },
  {
    id: "t2",
    title: "Active recall: Directors' duties",
    subject: "BLP",
    subTopic: "Directors' duties",
    minutes: 20,
    format: "Active recall",
    priority: "weak-spot",
    reason: "Low accuracy last time (42%)",
  },
  {
    id: "t3",
    title: "Scenario drill: occupiers' liability",
    subject: "Tort",
    subTopic: "Occupiers' liability",
    minutes: 25,
    format: "Application",
    priority: "high-yield",
    reason: "Not revised in 9 days",
  },
];
