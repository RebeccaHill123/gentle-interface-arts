import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, Compass } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { waitForAuthUser } from "@/lib/auth-session";
import { MOCK_TOPIC_MAP, flatSubjects } from "@/lib/topic-map";
import { TopicRow } from "@/components/dashboard/command-centre";

export const Route = createFileRoute("/topics")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) {
      throw redirect({ to: "/auth", search: { mode: "signin" } });
    }
  },
  component: TopicsPage,
  head: () => ({
    meta: [
      { title: "Topic Map · Tentra" },
      {
        name: "description",
        content:
          "Full syllabus Topic Map — track progress, weak spots and next actions by subject, chapter and sub-topic.",
      },
    ],
  }),
});

function TopicsPage() {
  const subjects = flatSubjects(MOCK_TOPIC_MAP);
  return (
    <AppShell title="Topic Map" subtitle="Every subject, chapter and sub-topic.">
      <div className="space-y-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Dashboard
        </Link>
        <section className="rounded-3xl border border-border/40 bg-card p-6 shadow-card md:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl text-foreground md:text-2xl">
                {MOCK_TOPIC_MAP.exam} Topic Map
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Track progress by subject, chapter and sub-topic. Expand any subject
                to see confidence, last revised and quick actions.
              </p>
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-violet-500/10 text-violet-400/90">
              <Compass className="h-4 w-4" />
            </span>
          </div>
          <ul className="mt-6 divide-y divide-border/40">
            {subjects.map((s) => (
              <TopicRow key={s.id} subject={s} />
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
