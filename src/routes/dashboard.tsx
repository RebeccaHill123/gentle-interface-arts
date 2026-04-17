import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Home,
  CheckCircle2,
  Leaf,
  Calendar,
  Settings,
  Bell,
  Plus,
  Sparkles,
  TrendingUp,
  Moon,
  Sun,
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Your bloom · Bloomly" },
      { name: "description", content: "Your gentle dashboard for today." },
    ],
  }),
});

type Task = { id: string; label: string; tone: string; done: boolean; time?: string };

const initialTasks: Task[] = [
  { id: "1", label: "Morning pages", tone: "bg-mint", done: true, time: "7:30" },
  { id: "2", label: "Walk to the bakery", tone: "bg-peach", done: true, time: "8:15" },
  { id: "3", label: "Draft launch email", tone: "bg-lavender", done: false, time: "10:00" },
  { id: "4", label: "Lunch with Sam", tone: "bg-blush", done: false, time: "12:30" },
  { id: "5", label: "Water the monstera", tone: "bg-butter", done: false, time: "16:00" },
  { id: "6", label: "Evening stretch", tone: "bg-mint", done: false, time: "20:00" },
];

function DashboardPage() {
  const [tasks, setTasks] = useState(initialTasks);
  const completed = tasks.filter((t) => t.done).length;
  const progress = Math.round((completed / tasks.length) * 100);

  const toggle = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-6">
        <Sidebar />

        <div className="flex-1 space-y-6">
          <TopBar />

          <section className="rounded-4xl bg-gradient-hero p-8 shadow-card md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-wider text-primary">
                  Tuesday, gentle morning
                </div>
                <h1 className="mt-2 text-4xl font-bold text-foreground md:text-5xl">
                  Hi Sunny — let's bloom 🌸
                </h1>
                <p className="mt-3 max-w-lg text-muted-foreground">
                  You've got 6 things on your plate today. No rush — pick whatever
                  feels easiest and start there.
                </p>
              </div>
              <div className="rounded-3xl bg-card p-5 shadow-soft">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Today's bloom
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <div className="font-display text-5xl font-bold text-primary">
                    {progress}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {completed} / {tasks.length}
                  </div>
                </div>
                <div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-warm transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Panel
                title="Today's plan"
                action={
                  <Button size="sm" variant="ghost" className="rounded-full">
                    <Plus className="mr-1 h-4 w-4" /> Add
                  </Button>
                }
              >
                <ul className="space-y-2">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => toggle(t.id)}
                        className="group flex w-full items-center gap-4 rounded-2xl bg-muted/50 p-3 text-left transition-colors hover:bg-muted"
                      >
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${t.tone} transition-transform group-hover:scale-105`}
                        >
                          {t.done ? (
                            <CheckCircle2 className="h-5 w-5 text-foreground" />
                          ) : (
                            <span className="h-3 w-3 rounded-full border-2 border-foreground/40" />
                          )}
                        </span>
                        <span
                          className={`flex-1 font-medium ${
                            t.done
                              ? "text-muted-foreground line-through"
                              : "text-foreground"
                          }`}
                        >
                          {t.label}
                        </span>
                        {t.time && (
                          <span className="text-sm text-muted-foreground">{t.time}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel title="Habit garden">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    { name: "Read", streak: 12, tone: "bg-peach", icon: Sparkles },
                    { name: "Stretch", streak: 8, tone: "bg-mint", icon: Leaf },
                    { name: "Sleep early", streak: 5, tone: "bg-lavender", icon: Moon },
                  ].map((h) => {
                    const Icon = h.icon;
                    return (
                      <div
                        key={h.name}
                        className={`rounded-3xl ${h.tone} p-5 shadow-card`}
                      >
                        <Icon className="h-5 w-5 text-foreground" />
                        <div className="mt-4 text-2xl font-bold text-foreground">
                          {h.streak}
                          <span className="ml-1 text-sm font-medium opacity-70">days</span>
                        </div>
                        <div className="text-sm text-foreground/80">{h.name}</div>
                        <div className="mt-3 flex gap-1">
                          {Array.from({ length: 7 }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full ${
                                i < 5 ? "bg-foreground/70" : "bg-foreground/20"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="This week">
                <div className="flex items-end justify-between gap-2">
                  {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => {
                    const h = [55, 80, 65, 90, 40, 70, 30][i];
                    const isToday = i === 1;
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-32 w-full items-end">
                          <div
                            className={`w-full rounded-xl transition-all ${
                              isToday ? "bg-gradient-warm" : "bg-mint"
                            }`}
                            style={{ height: `${h}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-semibold ${
                            isToday ? "text-primary" : "text-muted-foreground"
                          }`}
                        >
                          {d}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-mint/40 p-3 text-sm text-mint-foreground">
                  <TrendingUp className="h-4 w-4" /> Up 18% from last week — sweet!
                </div>
              </Panel>

              <Panel title="Mood check-in">
                <p className="text-sm text-muted-foreground">How are you feeling?</p>
                <div className="mt-3 flex justify-between gap-2">
                  {["😴", "🌧️", "😌", "🌼", "🌟"].map((e) => (
                    <button
                      key={e}
                      className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-2xl transition-transform hover:-translate-y-1 hover:bg-secondary"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title="A little note">
                <div className="rounded-2xl bg-gradient-cool p-5">
                  <Sun className="h-5 w-5 text-foreground" />
                  <p className="mt-3 font-display text-lg leading-snug text-foreground">
                    "Small steps, soft heart. You're already doing more than you think."
                  </p>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const items = [
    { icon: Home, label: "Today", active: true },
    { icon: Calendar, label: "Calendar" },
    { icon: Leaf, label: "Habits" },
    { icon: Sparkles, label: "Journal" },
    { icon: Settings, label: "Settings" },
  ];
  return (
    <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-4xl bg-sidebar p-5 shadow-card md:flex">
      <BrandMark />
      <nav className="mt-8 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
                it.active
                  ? "bg-card text-foreground shadow-card"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {it.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-3xl bg-gradient-sunshine p-5">
        <div className="font-display text-lg font-bold text-butter-foreground">
          Bloom Pro
        </div>
        <p className="mt-1 text-xs text-butter-foreground/80">
          Unlock unlimited gardens & moods.
        </p>
        <Button size="sm" className="mt-3 w-full rounded-full">
          Upgrade
        </Button>
      </div>
    </aside>
  );
}

function TopBar() {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-card p-3 pl-5 shadow-card">
      <div className="md:hidden">
        <BrandMark withWordmark={false} />
      </div>
      <div className="hidden text-sm text-muted-foreground md:block">
        <Link to="/" className="hover:text-foreground">
          ← Back to landing
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" className="rounded-full">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm font-bold text-primary-foreground">
          S
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
