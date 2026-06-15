import { useMemo } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Users, MessageSquare, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { waitForAuthUser } from "@/lib/auth-session";
import { loadPlan } from "@/lib/plan-store";

function useExamLabel() {
  const plan = useMemo(() => {
    if (typeof window === "undefined") return null;
    return loadPlan();
  }, []);
  const isUbe = plan?.input.examType === "UBE";
  return {
    isUbe,
    examName: isUbe ? "Bar" : "SQE",
    candidateLabel: isUbe ? "Bar candidates" : "SQE candidates",
    professionLabel: isUbe ? "future attorneys" : "solicitors",
  };
}

export const Route = createFileRoute("/community")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: CommunityPage,
  head: () => ({
    meta: [
      { title: "Community · Tentra" },
      { name: "description", content: "Study alongside other candidates." },
    ],
  }),
});

function CommunityPage() {
  const { candidateLabel, professionLabel } = useExamLabel();
  return (
    <AppShell title="Community" subtitle={`Study alongside other ${candidateLabel}.`}>
      <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-pink-blue shadow-glow">
          <Users className="h-6 w-6 text-primary-foreground" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold text-foreground">
          Community is launching soon
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Streak leaderboards, study groups, peer Q&amp;A and weekly challenges —
          built for the next cohort of {professionLabel}.
        </p>
      </section>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { icon: Trophy, title: "Leaderboards", desc: "See how your streak stacks up." },
          { icon: MessageSquare, title: "Study circles", desc: "Small groups, same exam date." },
          { icon: Users, title: "Peer Q&A", desc: "Ask, answer, level up together." },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.title}
              className="rounded-2xl border border-border bg-card/60 p-5 backdrop-blur"
            >
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-pink-blue/20 text-pink">
                <Icon className="h-4 w-4" />
              </div>
              <div className="mt-3 text-sm font-semibold text-foreground">{c.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{c.desc}</div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
