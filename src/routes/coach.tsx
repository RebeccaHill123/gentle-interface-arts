import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Sparkles,
  Send,
  Loader2,
  ArrowUpRight,
  AlertTriangle,
  Brain,
  GraduationCap,
  Target,
  History,
  RefreshCw,
  Compass,
  ShieldAlert,
  CalendarClock,
  BookOpenCheck,
} from "lucide-react";
import { waitForAuthUser } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { loadPlan, computeStreak } from "@/lib/plan-store";
import { deriveAnalytics, type AnalyticsBundle } from "@/lib/analytics-derive";

type Msg = { role: "user" | "assistant"; content: string };
type Suggestion = { label: string; prompt: string };
type Mode = "coach" | "tutor";

const MODES: {
  id: Mode;
  label: string;
  blurb: string;
  systemHint: string;
}[] = [
  {
    id: "coach",
    label: "Coach",
    blurb: "Strategy, planning and exam readiness.",
    systemHint:
      "Reply as a senior SQE study strategist. Prioritise sequencing, trade-offs, mock performance, recency decay and pacing. Cite the user's snapshot where relevant. Be direct, structured and exam-focused.",
  },
  {
    id: "tutor",
    label: "Tutor",
    blurb: "Legal concepts, worked examples and SBA practice.",
    systemHint:
      "Reply as a private SQE1 tutor (FLK1/FLK2). Explain the law with academic precision, structured headings, worked examples and key authorities only when certain. Where useful, offer to test understanding with SBA-style questions.",
  },
];

const SUGGESTIONS_BY_MODE: Record<Mode, Suggestion[]> = {
  coach: [
    { label: "Prioritise this week", prompt: "What should I prioritise this week based on my weak areas, recency decay and exam proximity? Give me a 3-step ordered plan with the reasoning behind each step." },
    { label: "Review my mocks", prompt: "Review my recent mock performance and identify the highest-risk topics I need to drill before the exam. Tell me what's improving, what's regressing, and the next 3 sessions." },
    { label: "Build a 7-day catch-up", prompt: "Build me a focused 7-day catch-up plan. Use my available hours, prioritise the highest-leverage modules, and tell me exactly what to do each day." },
    { label: "Am I on track?", prompt: "Given my exam date, readiness and recent activity — am I on track? Be honest. If I'm not, prescribe what changes this week." },
    { label: "Highest mark-impact today", prompt: "What should I revise today for the single highest mark impact? Cite the data — recency, accuracy, syllabus weight — and give me a 60-minute session structure." },
  ],
  tutor: [
    { label: "Explain consideration", prompt: "Explain the doctrine of consideration using SQE-style examples. Cover past consideration, sufficiency vs adequacy, and the Williams v Roffey exception. Finish with one SBA to test me." },
    { label: "Test me on easements", prompt: "Test me on easements. Ask one SQE1-style SBA at a time, wait for my answer, mark it, then explain. Cover creation, scope and termination across the set." },
    { label: "5 SBAs on negligence", prompt: "Give me 5 SQE1-style single best answer questions on negligence — duty, breach, causation, remoteness. Four options each (A–D), correct answer marked, one-line explanation per question." },
    { label: "Mark my reasoning", prompt: "I'll give you my answer and reasoning to a problem question. Mark it as an SQE examiner would, explain exactly where the reasoning is wrong, and show the model answer structure." },
    { label: "Compare resulting & constructive trusts", prompt: "Compare resulting and constructive trusts: when each arises, the leading authorities, and the most-tested SQE traps. Finish with two contrasting worked examples." },
  ],
};

const THINKING_LINES = [
  "Reading your performance snapshot…",
  "Cross-referencing recent sessions…",
  "Calibrating to your confidence map…",
  "Drafting the response…",
];

const HISTORY_KEY = "coach:lastConversation";

export const Route = createFileRoute("/coach")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: CoachPage,
  head: () => ({
    meta: [
      { title: "Tentra Coach · Your exam strategist & private tutor" },
      { name: "description", content: "An intelligent study coach and private tutor. Plan strategically, drill weak areas, test understanding and stay on track for qualification." },
    ],
  }),
});

function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [streak, setStreak] = useState(0);
  const [analytics, setAnalytics] = useState<AnalyticsBundle | null>(null);
  const [daysToExam, setDaysToExam] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("coach");
  const [thinkingIdx, setThinkingIdx] = useState(0);
  const [hasPrior, setHasPrior] = useState(false);
  const [examType, setExamType] = useState<"SQE1" | "SQE2" | "UBE" | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const isUbe = examType === "UBE";

  // Bootstrap: profile + analytics + last conversation flag
  useEffect(() => {
    (async () => {
      const user = await waitForAuthUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const name = profile?.first_name || profile?.display_name?.split(" ")[0] || "";
      setFirstName(name);

      const plan = loadPlan();
      if (plan) {
        setExamType(plan.input.examType);
        setStreak(computeStreak(plan.sessions).current);
        setAnalytics(deriveAnalytics(plan));
        if (plan.input?.examDate) {
          const d = Math.max(0, Math.round((+new Date(plan.input.examDate) - Date.now()) / 86_400_000));
          setDaysToExam(d);
        }
      }
    })().catch(() => {});

    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { messages?: Msg[] };
        if (Array.isArray(parsed.messages) && parsed.messages.length > 0) setHasPrior(true);
      }
      const prefilled = sessionStorage.getItem("coach:autosend");
      if (prefilled) {
        sessionStorage.removeItem("coach:autosend");
        setTimeout(() => { void send(prefilled); }, 200);
      }
    } catch {}
  }, []);

  // Persist conversation
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify({ messages: messages.slice(-30), savedAt: Date.now() }),
      );
      setHasPrior(true);
    } catch {}
  }, [messages]);

  // Animated thinking text
  useEffect(() => {
    if (!isStreaming) return;
    setThinkingIdx(0);
    const id = setInterval(() => {
      setThinkingIdx((i) => (i + 1) % THINKING_LINES.length);
    }, 1100);
    return () => clearInterval(id);
  }, [isStreaming]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return firstName ? `${part}, ${firstName}.` : `${part}.`;
  }, [firstName]);

  // Intelligent contextual insight derived from exam distance + readiness
  const heroInsight = useMemo(() => {
    if (daysToExam === null) {
      return "Set an exam date in onboarding to unlock strategic guidance tailored to your timeline.";
    }
    if (daysToExam === 0) return "Exam day. Trust your preparation — review high-yield rules only.";
    const r = analytics?.readiness?.score ?? null;
    if (daysToExam <= 7) {
      return `You're ${daysToExam} days out — protect sleep, taper volume, and run timed SBAs only on your weakest two modules.`;
    }
    if (daysToExam <= 21) {
      if (r !== null && r < 65) return `${daysToExam} days out at ${r}% readiness — scale mock exposure now and cut anything that isn't moving the score.`;
      return `${daysToExam} days out — today should be about consolidation and timed practice, not new volume.`;
    }
    if (daysToExam <= 45) {
      return `You're ${daysToExam} days out — the window where strategy outperforms effort. Prioritise weak areas before broad coverage.`;
    }
    if (daysToExam <= 90) {
      return `${daysToExam} days out — build depth on your weakest modules now while there's still time for spaced repetition to compound.`;
    }
    return `${daysToExam} days out — establish the cadence and breadth now; tactical drills come later.`;
  }, [daysToExam, analytics]);

  // Three curated premium insight cards
  const insightCards = useMemo(() => {
    type Card = {
      eyebrow: string;
      icon: typeof Target;
      title: string;
      body: string;
      prompt: string;
    };
    const cards: Card[] = [];

    // 1. Today's focus
    const weakest = analytics?.weakest?.[0];
    if (weakest) {
      cards.push({
        eyebrow: "Today's focus",
        icon: Target,
        title: weakest.module,
        body: `Your lowest-confidence module — a focused 45-minute block here will move the needle furthest today.`,
        prompt: `Build me a 45-minute high-yield session on ${weakest.module}, structured around my weakest sub-topics, with a short SBA set at the end.`,
      });
    } else {
      cards.push({
        eyebrow: "Today's focus",
        icon: Target,
        title: "Set the day's priority",
        body: "Tell me what you've got today and I'll shape it into the single highest-impact session.",
        prompt: "I have 60 minutes today. What's the single highest-impact session I should run, and how should I structure it?",
      });
    }

    // 2. Highest-risk area
    const declining = analytics?.subjects
      ?.filter((s) => s.trend !== null && (s.trend ?? 0) <= -5)
      .sort((a, b) => (a.trend ?? 0) - (b.trend ?? 0))[0];
    const stale = analytics?.subjects
      ?.filter((s) => s.recencyDays !== null && s.recencyDays >= 10 && s.highYield >= 4)
      .sort((a, b) => (b.recencyDays ?? 0) - (a.recencyDays ?? 0))[0];

    if (declining) {
      cards.push({
        eyebrow: "Highest risk",
        icon: ShieldAlert,
        title: `${declining.module} regressing`,
        body: `Accuracy down ${Math.abs(declining.trend ?? 0)}% on recent sessions — left unaddressed this becomes an exam-day liability.`,
        prompt: `Diagnose why ${declining.module} is regressing and prescribe the next three sessions to reverse the trend.`,
      });
    } else if (stale) {
      cards.push({
        eyebrow: "Highest risk",
        icon: ShieldAlert,
        title: `${stale.module} going stale`,
        body: `${stale.recencyDays} days since last revision on a high-yield module. Recency decay compounds quickly this close to exam.`,
        prompt: `Build a 45-minute refresher for ${stale.module} that targets the highest-yield gaps and reverses recency decay.`,
      });
    } else if (daysToExam !== null && (analytics?.readiness?.score ?? 100) < 65) {
      cards.push({
        eyebrow: "Highest risk",
        icon: ShieldAlert,
        title: "Readiness below threshold",
        body: `Readiness at ${analytics?.readiness?.score}% with ${daysToExam} days remaining — mock exposure needs to scale this week.`,
        prompt: `My readiness is ${analytics?.readiness?.score}% with ${daysToExam} days to exam. What's the highest-leverage 7-day plan?`,
      });
    } else {
      cards.push({
        eyebrow: "Highest risk",
        icon: ShieldAlert,
        title: "Audit my exam risk",
        body: "Run a diagnostic across my data and surface the single biggest threat to passing — before it becomes one.",
        prompt: "What is my single biggest risk to passing right now? Cite the data and tell me how to neutralise it this week.",
      });
    }

    // 3. Recommended session
    const peak = analytics?.peak;
    if (peak) {
      cards.push({
        eyebrow: "Recommended session",
        icon: CalendarClock,
        title: `${peak.label} block`,
        body: `You perform ${peak.uplift}% better in ${peak.label.toLowerCase()} blocks. Pair it with active recall on your weakest module.`,
        prompt: `Design my next ${peak.label.toLowerCase()} block — 60 minutes, structured around my weakest module with active recall and one SBA set.`,
      });
    } else if (streak >= 3) {
      cards.push({
        eyebrow: "Recommended session",
        icon: CalendarClock,
        title: `Keep the ${streak}-day streak`,
        body: "Momentum is compounding. A short, focused block today is worth more than a heavy session tomorrow.",
        prompt: `I'm on a ${streak}-day streak. Design a 30-minute session that maintains momentum without burnout.`,
      });
    } else {
      cards.push({
        eyebrow: "Recommended session",
        icon: CalendarClock,
        title: "Design tonight's session",
        body: "Tell me your available time and energy level — I'll structure the highest-value block around your current data.",
        prompt: "Design tonight's revision session — 60 minutes, structured, prioritised by what my data says I need most.",
      });
    }

    return cards;
  }, [analytics, daysToExam, streak]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const dyn: Suggestion[] = [];
    if (analytics && mode === "coach") {
      const weakest = analytics.weakest[0];
      if (weakest) {
        dyn.push({
          label: `Why is ${weakest.module} weak?`,
          prompt: `Diagnose why ${weakest.module} is underperforming for me. Use my recency, confidence, accuracy and trend — and prescribe the next 3 sessions.`,
        });
      }
    }
    if (analytics && mode === "tutor") {
      const weakest = analytics.weakest[0];
      if (weakest) {
        dyn.push({
          label: `Drill ${weakest.module}`,
          prompt: `Build me a 10-question SBA drill on ${weakest.module}, targeting my weakest sub-topics, with answers and explanations.`,
        });
      }
    }
    return [...dyn, ...SUGGESTIONS_BY_MODE[mode]].slice(0, 5);
  }, [mode, analytics]);

  const canSend = input.trim().length > 0 && !isStreaming;

  function resumePrior() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { messages?: Msg[] };
      if (Array.isArray(parsed.messages) && parsed.messages.length > 0) {
        setMessages(parsed.messages);
        toast.success("Picked up where you left off");
      }
    } catch {}
  }

  function newConversation() {
    setMessages([]);
    try { localStorage.removeItem(HISTORY_KEY); } catch {}
    setHasPrior(false);
  }

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || isStreaming) return;
    setInput("");

    const modeHint = MODES.find((m) => m.id === mode)?.systemHint ?? "";
    const userMsg: Msg = { role: "user", content: text };
    const next: Msg[] =
      messages.length === 0 && modeHint
        ? [{ role: "user", content: `[${MODES.find((m) => m.id === mode)?.label} mode] ${modeHint}` }, { role: "assistant", content: "Understood." }, ...messages, userMsg]
        : [...messages, userMsg];

    const visible: Msg[] = [...messages, userMsg];
    setMessages(visible);
    setIsStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not signed in");

      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errBody = await resp.json().catch(() => ({ error: "Coach is unavailable" }));
        if (resp.status === 429) toast.error("You're going fast — try again in a moment.");
        else if (resp.status === 402) toast.error("AI credits exhausted. Add funds in Workspace settings.");
        else toast.error(errBody.error || "Coach is unavailable");
        setMessages((prev) => prev.slice(0, -1));
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantStarted = false;
      let assistantText = "";
      let done = false;

      while (!done) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantText += delta;
              if (!assistantStarted) {
                assistantStarted = true;
                setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
              } else {
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[copy.length - 1] = { role: "assistant", content: assistantText };
                  return copy;
                });
              }
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("Coach connection lost");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <AppShell
      title="Tentra Coach"
      subtitle="Your SQE strategist and private tutor."
      actions={
        !isEmpty ? (
          <button
            onClick={newConversation}
            className="hidden items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition hover:border-pink/40 hover:text-foreground sm:inline-flex"
          >
            <RefreshCw className="h-3 w-3" /> New conversation
          </button>
        ) : null
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        {/* MODE TOGGLE — Coach | Tutor only */}
        <div className="flex flex-col gap-3">
          <div className="inline-flex w-full items-center gap-1 rounded-2xl border border-border bg-card/40 p-1 backdrop-blur sm:w-auto sm:self-start">
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`relative flex-1 rounded-xl px-5 py-2 text-sm font-medium tracking-tight transition sm:flex-none ${
                    active
                      ? "bg-gradient-pink-violet text-primary-foreground shadow-[0_8px_24px_-12px_rgba(236,72,153,0.4)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{MODES.find((m) => m.id === mode)!.blurb}</p>
        </div>

        {/* EMPTY STATE — Insight panel + curated cards */}
        {isEmpty && (
          <section className="flex flex-col gap-8 animate-fade-in">
            {/* Hero insight panel */}
            <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-pink/[0.04] via-card/40 to-blue/[0.04] p-7 backdrop-blur sm:p-9">
              <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-pink-violet opacity-[0.08] blur-3xl" />
              <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {mode === "coach" ? "Strategy briefing" : "Tutor session"}
              </p>
              <h2 className="mt-3 font-display text-2xl font-light leading-[1.25] tracking-[-0.02em] text-foreground sm:text-[28px]">
                {greeting}{" "}
                <span className="text-muted-foreground">{heroInsight}</span>
              </h2>
              {streak >= 3 && (
                <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <Brain className="h-3.5 w-3.5 text-pink" />
                  {streak}-day study streak — consistency compounds.
                </p>
              )}
            </div>

            {/* Three curated insight cards */}
            {mode === "coach" && (
              <div className="grid gap-3 sm:grid-cols-3">
                {insightCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => send(card.prompt)}
                      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card/50 p-5 text-left backdrop-blur transition-all hover:border-pink/40 hover:bg-card/80 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.12)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-background/60 text-pink">
                          <Icon className="h-4 w-4" />
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                          {card.eyebrow}
                        </p>
                        <h3 className="mt-1.5 font-display text-[15px] font-medium leading-snug tracking-tight text-foreground">
                          {card.title}
                        </h3>
                      </div>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">{card.body}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {mode === "tutor" && (
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    eyebrow: "Explain",
                    icon: BookOpenCheck,
                    title: "A concept, clearly",
                    body: "Pick any topic — I'll teach it with structure, authority and a worked example.",
                    prompt: "Explain a tricky SQE concept clearly with structure, key authorities and a worked example. Start with: which topic should we cover?",
                  },
                  {
                    eyebrow: "Test",
                    icon: Compass,
                    title: "My understanding",
                    body: "I'll generate SBA-style questions and mark your reasoning as an examiner would.",
                    prompt: "Test my understanding with 5 SQE1-style SBA questions on a topic of my choice. Mark each answer and explain the reasoning.",
                  },
                  {
                    eyebrow: "Review",
                    icon: AlertTriangle,
                    title: "A wrong answer",
                    body: "Show me where your reasoning broke down — I'll diagnose it and rebuild the structure.",
                    prompt: "I got a question wrong. I'll share my reasoning — diagnose where I went wrong, explain the correct analysis, and show the model structure.",
                  },
                ].map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => send(card.prompt)}
                      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card/50 p-5 text-left backdrop-blur transition-all hover:border-pink/40 hover:bg-card/80 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.12)]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-background/60 text-pink">
                          <Icon className="h-4 w-4" />
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                          {card.eyebrow}
                        </p>
                        <h3 className="mt-1.5 font-display text-[15px] font-medium leading-snug tracking-tight text-foreground">
                          {card.title}
                        </h3>
                      </div>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">{card.body}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Resume prior conversation */}
            {hasPrior && (
              <button
                onClick={resumePrior}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 px-4 py-3 text-left backdrop-blur transition hover:border-pink/40 hover:bg-card/60"
              >
                <span className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-xl border border-border bg-background/60 text-muted-foreground">
                    <History className="h-4 w-4" />
                  </span>
                  <span className="text-sm">
                    <span className="font-medium text-foreground">Resume last conversation</span>
                    <span className="ml-1.5 text-muted-foreground">— pick up where you left off</span>
                  </span>
                </span>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </section>
        )}

        {/* CONVERSATION */}
        {!isEmpty && (
          <section
            ref={scrollerRef}
            className="-mx-2 flex-1 overflow-y-auto px-2"
            style={{ maxHeight: "calc(100vh - 320px)" }}
          >
            <div className="flex flex-col gap-6">
              {messages.map((m, i) => (
                <Message key={i} role={m.role} content={m.content} firstName={firstName} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 pl-11 text-xs text-muted-foreground animate-fade-in">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink" />
                  </span>
                  <span key={thinkingIdx} className="animate-fade-in">{THINKING_LINES[thinkingIdx]}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* COMPOSER */}
        <section className="mt-2 flex flex-col gap-4">
          {/* Curated suggested prompts */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.prompt)}
                disabled={isStreaming}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-xs text-muted-foreground backdrop-blur transition-all hover:border-pink/40 hover:bg-card hover:text-foreground disabled:opacity-50"
              >
                {s.label}
                <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void send(); }}
            className="relative flex items-end gap-2 rounded-3xl border border-border bg-card/80 p-2 shadow-lg shadow-black/[0.06] backdrop-blur-xl focus-within:border-pink/40"
          >
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
              }}
              placeholder={
                mode === "tutor"
                  ? "Ask your tutor to explain a topic, test you, or mark your reasoning…"
                  : "Ask your coach to re-plan, prioritise, or pressure-test your strategy…"
              }
              rows={1}
              className="min-h-[44px] flex-1 resize-none border-0 bg-transparent text-[15px] focus-visible:ring-0"
            />
            <Button
              type="submit"
              disabled={!canSend}
              className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-pink-violet p-0 text-primary-foreground shadow-glow transition-all hover:brightness-[1.06] disabled:opacity-40"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-center text-[11px] tracking-wide text-muted-foreground/70">
            Study guidance, not legal advice.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function Message({ role, content, firstName }: { role: "user" | "assistant"; content: string; firstName: string }) {
  const isUser = role === "user";
  const initial = (firstName?.[0] || "Y").toUpperCase();

  return (
    <div className="flex gap-3 animate-fade-in">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold ${
          isUser
            ? "border border-border bg-background/60 text-muted-foreground"
            : "bg-gradient-pink-violet text-primary-foreground shadow-glow"
        }`}
      >
        {isUser ? initial : <Sparkles className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1 pt-1">
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {isUser ? "You" : "Tentra Coach"}
        </div>
        {isUser ? (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none text-[15px] leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
