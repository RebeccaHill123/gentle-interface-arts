import { createFileRoute, redirect } from "@tanstack/react-router";
import { Layers, BookOpen, Brain, Clock, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { waitForAuthUser } from "@/lib/auth-session";

export const Route = createFileRoute("/flashcards")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: FlashcardsPage,
  head: () => ({
    meta: [
      { title: "SQE Flashcards — adaptive rule recall | Tentra" },
      {
        name: "description",
        content:
          "Adaptive flashcards for SQE rule recall. Target weak areas, build retention and review high-yield legal principles with Tentra.",
      },
      { property: "og:title", content: "SQE Flashcards | Tentra" },
      {
        property: "og:description",
        content: "Adaptive flashcards for SQE rule recall and weak-area targeting.",
      },
      { property: "og:url", content: "https://tentraapp.com/flashcards" },
    ],
    links: [{ rel: "canonical", href: "https://tentraapp.com/flashcards" }],
  }),
});

function FlashcardsPage() {
  return (
    <AppShell
      title="Flashcards"
      subtitle="Adaptive rule recall for FLK1 & FLK2."
      showBack
      backTo="/mocks"
      backLabel="Back to Mocks & Practice"
    >
      {/* Hero — coming soon */}
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-card md:p-12">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-pink-blue opacity-20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-gradient-pink-blue opacity-10 blur-3xl" />

        <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <Badge
              variant="outline"
              className="rounded-full border-border text-[10px] uppercase tracking-wide text-muted-foreground"
            >
              Coming soon
            </Badge>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-5xl">
              Flashcards
            </h2>
            <p className="mt-3 text-base text-muted-foreground md:text-lg">
              Review key rules, definitions and high-yield legal principles in a
              focused, adaptive format.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" /> Topic-based decks
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                <Brain className="h-3.5 w-3.5" /> Weak-area generation
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> Spaced repetition
              </span>
            </div>
          </div>

          <div className="hidden h-32 w-32 shrink-0 place-items-center rounded-3xl bg-gradient-pink-blue text-primary-foreground opacity-70 shadow-glow md:grid">
            <Layers className="h-14 w-14" />
          </div>
        </div>
      </section>

      {/* Feature preview cards */}
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {(
          [
            {
              title: "Topic Decks",
              desc: "Curated flashcard sets for every SQE module — from contract formation to land registration.",
              icon: BookOpen,
            },
            {
              title: "Adaptive Recall",
              desc: "Cards generated automatically from your weakest practice areas to close knowledge gaps fast.",
              icon: Brain,
            },
            {
              title: "Quick Review",
              desc: "Short, high-intensity sessions designed for commutes, breaks and last-minute revision.",
              icon: Clock,
            },
          ] as const
        ).map((f) => (
          <div
            key={f.title}
            className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card/70 p-6 backdrop-blur"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-pink-blue opacity-10 blur-2xl" />
            <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-pink-blue text-primary-foreground shadow-glow">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="relative mt-5">
              <div className="text-base font-semibold text-foreground">
                {f.title}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
