import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import {
  Layers,
  BookOpen,
  Brain,
  ArrowLeft,
  Star,
  Check,
  RotateCcw,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { waitForAuthUser } from "@/lib/auth-session";
import {
  getDecksFor,
  getCardsFor,
  getDeckFor,
  getCardsByDeckFor,
  type Deck,
  type Flashcard,
  type CardArea,
  type ExamKind,
} from "@/lib/flashcards-data";
import {
  getAllProgress,
  markCard,
  toggleStar,
  resetDeckProgress,
  type CardProgress,
} from "@/lib/flashcards-progress";
import { loadPlan } from "@/lib/plan-store";
import { isUbePath } from "@/lib/exam-paths";

type FlashcardsSearch = { subject?: string; subtopic?: string };

export const Route = createFileRoute("/flashcards")({
  validateSearch: (raw: Record<string, unknown>): FlashcardsSearch => {
    const s: FlashcardsSearch = {};
    if (typeof raw.subject === "string" && raw.subject.trim()) s.subject = raw.subject.trim();
    if (typeof raw.subtopic === "string" && raw.subtopic.trim()) s.subtopic = raw.subtopic.trim();
    return s;
  },
  beforeLoad: async () => {
    const { requireAccess } = await import("@/lib/access-guard");
    await requireAccess();
  },
  component: FlashcardsPage,
  head: () => ({
    meta: [
      { title: "SQE Flashcards — adaptive rule recall | Tentra" },
      {
        name: "description",
        content:
          "High-yield SQE flashcards across FLK1 and FLK2. Target weak areas, star key rules and build fast recall with Tentra.",
      },
      { property: "og:title", content: "SQE Flashcards | Tentra" },
      {
        property: "og:description",
        content:
          "High-yield SQE flashcards: build fast recall across rules, exceptions and exam traps.",
      },
      { property: "og:url", content: "https://tentraapp.com/flashcards" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/flashcards" }],
  }),
});

type Filter = "all" | "FLK1" | "FLK2" | "MBE" | "MEE" | "MPT" | "weak" | "starred";

function useExamKind(): ExamKind {
  return useMemo(() => {
    const plan = loadPlan();
    const path = plan?.input.examPath;
    const isUbe = path ? isUbePath(path) : plan?.input.examType === "UBE";
    return isUbe ? "UBE" : "SQE";
  }, []);
}

type ReviewMode =
  | { kind: "deck"; deckId: string }
  | { kind: "weak" }
  | { kind: "starred" };

function useProgress() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener("tentra:flashcards-updated", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("tentra:flashcards-updated", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return useMemo(() => getAllProgress(), [tick]);
}

function FlashcardsPage() {
  const [mode, setMode] = useState<ReviewMode | null>(null);
  const kind = useExamKind();

  if (mode) {
    return <StudyView mode={mode} kind={kind} onExit={() => setMode(null)} />;
  }

  return <DeckBrowser kind={kind} onStart={setMode} />;
}

// ---------- Deck browser ----------

function DeckBrowser({ kind, onStart }: { kind: ExamKind; onStart: (m: ReviewMode) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const progress = useProgress();
  const isUbe = kind === "UBE";
  const decks = useMemo(() => getDecksFor(kind), [kind]);
  const cards = useMemo(() => getCardsFor(kind), [kind]);

  const decksFiltered = useMemo(() => {
    if (filter === "all" || filter === "weak" || filter === "starred") return decks;
    return decks.filter((d) => d.flk === filter);
  }, [filter, decks]);

  const weakCount = useMemo(
    () =>
      cards.filter((c) => progress[c.id]?.status === "needs_review").length,
    [progress, cards],
  );
  const starredCount = useMemo(
    () => cards.filter((c) => progress[c.id]?.starred).length,
    [progress, cards],
  );

  const continueDeck = useMemo(() => {
    let best: { deckId: string; lastAt: number } | null = null;
    for (const card of cards) {
      const p = progress[card.id];
      if (!p?.lastReviewedAt) continue;
      if (!best || p.lastReviewedAt > best.lastAt)
        best = { deckId: card.deckId, lastAt: p.lastReviewedAt };
    }
    return best ? getDeckFor(kind, best.deckId) ?? null : null;
  }, [progress, cards, kind]);

  const areaChips: Filter[] = isUbe ? ["MBE", "MEE", "MPT"] : ["FLK1", "FLK2"];
  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All" },
    ...areaChips.map((id) => ({ id, label: id })),
    { id: "weak", label: "Weak areas", count: weakCount },
    { id: "starred", label: "Starred", count: starredCount },
  ];

  return (
    <AppShell
      title="Flashcards"
      subtitle={isUbe ? "Adaptive rule recall for MBE, MEE & MPT." : "Adaptive rule recall for FLK1 & FLK2."}
      showBack
      backTo="/mocks"
      backLabel="Back to Mocks & Practice"
    >
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card md:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-pink-blue opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-gradient-pink-blue opacity-10 blur-3xl" />
        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <Badge
              variant="outline"
              className="rounded-full border-border text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              {isUbe ? "MBE · MEE · MPT" : "FLK1 · FLK2"}
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Flashcards
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              {isUbe
                ? "Build fast recall across high-yield UBE rules, doctrines and exam traps."
                : "Build fast recall across high-yield SQE rules, definitions and exam traps."}
            </p>
          </div>
          <div className="hidden h-32 w-32 shrink-0 place-items-center rounded-3xl bg-gradient-pink-blue text-primary-foreground opacity-80 shadow-glow md:grid">
            <Layers className="h-14 w-14" />
          </div>
        </div>
      </section>

      {/* Continue + quick review */}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {continueDeck ? (
          <button
            onClick={() => onStart({ kind: "deck", deckId: continueDeck.id })}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:border-primary/40"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-pink-blue opacity-20 blur-2xl" />
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Continue review
            </div>
            <div className="mt-1 text-base font-semibold text-foreground">
              {continueDeck.title}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Pick up where you left off
            </div>
            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
          </button>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card/40 p-5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Continue review
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Open a deck below to start your first session.
            </div>
          </div>
        )}

        <button
          onClick={() => onStart({ kind: "weak" })}
          disabled={weakCount === 0}
          className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Review weak cards
            </div>
            <div className="mt-1 text-base font-semibold text-foreground">
              {weakCount} card{weakCount === 1 ? "" : "s"} flagged
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Targets anything marked "needs review"
            </div>
          </div>
          <Brain className="h-5 w-5 text-muted-foreground transition group-hover:text-foreground" />
        </button>

        <button
          onClick={() => onStart({ kind: "starred" })}
          disabled={starredCount === 0}
          className="group relative flex items-center justify-between overflow-hidden rounded-2xl border border-border bg-card p-5 text-left shadow-card transition hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Review starred
            </div>
            <div className="mt-1 text-base font-semibold text-foreground">
              {starredCount} saved
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Your shortlist of essentials
            </div>
          </div>
          <Star className="h-5 w-5 text-muted-foreground transition group-hover:text-foreground" />
        </button>
      </section>

      {/* Filters */}
      <section className="mt-8 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition",
              filter === f.id
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border bg-background/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            {typeof f.count === "number" && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {f.count}
              </span>
            )}
          </button>
        ))}
      </section>

      {/* Deck grid */}
      {filter === "weak" || filter === "starred" ? (
        <section className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 p-6 text-sm text-muted-foreground">
          Use the “Review {filter === "weak" ? "weak" : "starred"} cards”
          card above to start a focused session across every deck.
        </section>
      ) : (
        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decksFiltered.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              kind={kind}
              progress={progress}
              onOpen={() => onStart({ kind: "deck", deckId: deck.id })}
            />
          ))}
        </section>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Study guidance only. Not legal advice.
      </p>
    </AppShell>
  );
}

function DeckCard({
  deck,
  kind,
  progress,
  onOpen,
}: {
  deck: Deck;
  kind: ExamKind;
  progress: Record<string, CardProgress>;
  onOpen: () => void;
}) {
  const cards = getCardsByDeckFor(kind, deck.id);
  const completed = cards.filter(
    (c) => progress[c.id]?.status === "got_it",
  ).length;
  const pct = cards.length ? Math.round((completed / cards.length) * 100) : 0;

  return (
    <button
      onClick={onOpen}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-5 text-left backdrop-blur transition hover:border-primary/40 hover:shadow-card"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-pink-blue opacity-10 blur-2xl" />
      <div className="relative flex items-center justify-between">
        <Badge
          variant="outline"
          className="rounded-full border-border text-[10px] uppercase tracking-wide text-muted-foreground"
        >
          {deck.flk}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          {cards.length} cards
        </span>
      </div>
      <div className="relative mt-3 text-base font-semibold text-foreground">
        {deck.title}
      </div>
      <p className="relative mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">
        {deck.description}
      </p>
      <div className="relative mt-4 space-y-1.5">
        <Progress value={pct} className="h-1.5" />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {completed}/{cards.length} mastered
          </span>
          <span>{pct}%</span>
        </div>
      </div>
    </button>
  );
}

// ---------- Study view ----------

function buildQueue(mode: ReviewMode, kind: ExamKind): Flashcard[] {
  const progress = getAllProgress();
  const allCards = getCardsFor(kind);
  let pool: Flashcard[] = [];
  if (mode.kind === "deck") pool = getCardsByDeckFor(kind, mode.deckId);
  else if (mode.kind === "weak")
    pool = allCards.filter((c) => progress[c.id]?.status === "needs_review");
  else pool = allCards.filter((c) => progress[c.id]?.starred);

  // Adaptive weighting: needs_review cards appear twice, got_it skipped in deck
  // mode if everything has been seen at least once.
  const expanded: Flashcard[] = [];
  for (const card of pool) {
    const p = progress[card.id];
    expanded.push(card);
    if (p?.status === "needs_review") expanded.push(card);
  }
  // Shuffle
  for (let i = expanded.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
  }
  return expanded;
}

function StudyView({
  mode,
  kind,
  onExit,
}: {
  mode: ReviewMode;
  kind: ExamKind;
  onExit: () => void;
}) {
  const [queue, setQueue] = useState<Flashcard[]>(() => buildQueue(mode, kind));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const progress = useProgress();

  const card = queue[index];
  const total = queue.length;
  const done = index >= total;

  const heading =
    mode.kind === "deck"
      ? getDeckFor(kind, mode.deckId)?.title ?? "Deck"
      : mode.kind === "weak"
        ? "Weak-area review"
        : "Starred cards";

  const flkBadge: CardArea | null =
    mode.kind === "deck" ? getDeckFor(kind, mode.deckId)?.flk ?? null : null;

  const handleStatus = (status: "got_it" | "needs_review") => {
    if (!card) return;
    markCard(card.id, status);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  const handleStar = () => {
    if (!card) return;
    toggleStar(card.id);
  };

  const restart = () => {
    setQueue(buildQueue(mode, kind));
    setIndex(0);
    setRevealed(false);
  };

  const resetDeck = () => {
    if (mode.kind !== "deck") return;
    resetDeckProgress(getCardsByDeckFor(kind, mode.deckId).map((c) => c.id));
    restart();
  };

  return (
    <AppShell title={heading} subtitle="One card at a time. Be honest.">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All decks
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {flkBadge && (
            <Badge
              variant="outline"
              className="rounded-full border-border text-[10px] uppercase tracking-wide"
            >
              {flkBadge}
            </Badge>
          )}
          {!done && (
            <span>
              Card {Math.min(index + 1, total)} of {total}
            </span>
          )}
        </div>
      </div>

      <Progress
        value={total ? (Math.min(index, total) / total) * 100 : 0}
        className="h-1.5"
      />

      {!card ? (
        <CompletionPanel
          mode={mode}
          kind={kind}
          progress={progress}
          onRestart={restart}
          onResetDeck={mode.kind === "deck" ? resetDeck : undefined}
          onExit={onExit}
        />
      ) : (
        <div className="mt-8">
          <div
            className={cn(
              "relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card transition md:p-12",
              revealed && "ring-1 ring-primary/20",
            )}
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-pink-blue opacity-15 blur-3xl" />
            <div className="relative flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>{card.topic}</span>
              <div className="flex items-center gap-2">
                <span>{card.difficulty}</span>
                <button
                  onClick={handleStar}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Star card"
                >
                  <Star
                    className={cn(
                      "h-4 w-4",
                      progress[card.id]?.starred &&
                        "fill-primary text-primary",
                    )}
                  />
                </button>
              </div>
            </div>

            <div className="relative mt-6 text-xl font-semibold leading-snug text-foreground md:text-2xl">
              {card.front}
            </div>

            {revealed && (
              <div className="relative mt-6 space-y-4 border-t border-border pt-6">
                <p className="text-base leading-relaxed text-foreground/90">
                  {card.back}
                </p>
                {card.examTip && (
                  <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-foreground">
                      <Sparkles className="h-3.5 w-3.5" /> Exam tip
                    </div>
                    {card.examTip}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {!revealed ? (
              <Button
                onClick={() => setRevealed(true)}
                className="bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-90"
                size="lg"
              >
                <BookOpen className="mr-2 h-4 w-4" /> Reveal answer
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleStatus("needs_review")}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Needs review
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleStatus("got_it")}
                  className="bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-90"
                >
                  <Check className="mr-2 h-4 w-4" /> Got it
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Study guidance only. Not legal advice.
      </p>
    </AppShell>
  );
}

function CompletionPanel({
  mode,
  kind,
  progress,
  onRestart,
  onResetDeck,
  onExit,
}: {
  mode: ReviewMode;
  kind: ExamKind;
  progress: Record<string, CardProgress>;
  onRestart: () => void;
  onResetDeck?: () => void;
  onExit: () => void;
}) {
  const allCards = getCardsFor(kind);
  const cards =
    mode.kind === "deck"
      ? getCardsByDeckFor(kind, mode.deckId)
      : mode.kind === "weak"
        ? allCards.filter((c) => progress[c.id]?.status === "needs_review")
        : allCards.filter((c) => progress[c.id]?.starred);
  const mastered = cards.filter(
    (c) => progress[c.id]?.status === "got_it",
  ).length;
  const pct = cards.length ? Math.round((mastered / cards.length) * 100) : 0;

  return (
    <div className="mt-8 rounded-3xl border border-border bg-card p-8 text-center shadow-card md:p-12">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
        <Check className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-2xl font-semibold text-foreground">
        Session complete
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {mastered} of {cards.length} mastered · {pct}% completion
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="outline" onClick={onExit}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> All decks
        </Button>
        <Button
          onClick={onRestart}
          className="bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-90"
        >
          <RotateCcw className="mr-1.5 h-4 w-4" /> Review again
        </Button>
        {onResetDeck && (
          <Button variant="ghost" onClick={onResetDeck}>
            Reset deck progress
          </Button>
        )}
      </div>
      <Link
        to="/coach"
        className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        Ask the Coach to target your weakest area
        <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
