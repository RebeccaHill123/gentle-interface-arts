import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Scale, Sparkles, Lock } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { waitForAuthUser } from "@/lib/auth-session";

export const Route = createFileRoute("/mocks")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: MocksPage,
  head: () => ({
    meta: [
      { title: "Mock exams · Tentra" },
      { name: "description", content: "Practice under exam conditions." },
    ],
  }),
});

function MocksPage() {
  return (
    <AppShell title="Mock Exams" subtitle="Practice under exam conditions.">
      <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-pink-blue shadow-glow">
          <Scale className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-foreground">
          Timed mocks are coming soon
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Sit full-length SQE1 and SQE2 mocks under exam conditions, with instant
          marking, topic-by-topic accuracy and AI-written feedback.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95">
            <Link to="/pro">
              <Sparkles className="mr-1.5 h-4 w-4" /> Get early access with Pro
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/coach">Try a coach quiz instead</Link>
          </Button>
        </div>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { title: "FLK1 mock", desc: "180 MCQs · 5 hrs" },
          { title: "FLK2 mock", desc: "180 MCQs · 5 hrs" },
          { title: "Skills paper", desc: "SQE2 written tasks" },
        ].map((c) => (
          <div
            key={c.title}
            className="relative overflow-hidden rounded-2xl border border-border bg-card/60 p-5 backdrop-blur"
          >
            <div className="absolute right-3 top-3">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="text-sm font-semibold text-foreground">{c.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
