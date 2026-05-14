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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sun,
  Flame,
  Activity,
  Brain,
  GraduationCap,
  ClipboardList,
  LineChart,
  MessageSquare,
  BookOpen,
  Layers,
  Target,
  ListChecks,
  Lightbulb,
  History,
  RefreshCw,
} from "lucide-react";
import { waitForAuthUser } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { loadPlan, computeStreak } from "@/lib/plan-store";
import { deriveAnalytics, type AnalyticsBundle } from "@/lib/analytics-derive";

type Msg = { role: "user" | "assistant"; content: string };
type Suggestion = { label: string; prompt: string; icon?: typeof Sparkles };
type Mode = "coach" | "tutor" | "practice" | "analyse";

const MODES: {
  id: Mode;
  label: string;
  icon: typeof Sparkles;
  blurb: string;
  systemHint: string;
}[] = [
  {
    id: "coach",
    label: "Coach",
    icon: Sparkles,
    blurb: "Strategy, planning and what to do next.",
    systemHint:
      "Reply as a strategic study coach. Prioritise planning, sequencing and trade-offs.",
  },
  {
    id: "tutor",
    label: "Tutor",
    icon: GraduationCap,
    blurb: "Explain a topic, walk through a rule, teach me.",
    systemHint:
      "Reply as a 1:1 SQE tutor. Explain the law clearly, with structure, key cases/statutes only when certain, and a worked example.",
  },
  {
    id: "practice",
    label: "Practice",
    icon: ClipboardList,
    blurb: "Quiz me, generate SBAs, drill weak areas.",
    systemHint:
      "Reply as an SQE assessment author. Generate exam-style SBA questions with 4 options, mark the correct answer, and give a one-line explanation per question.",
  },
  {
    id: "analyse",
    label: "Analyse",
    icon: LineChart,
    blurb: "Read my data, surface risks and patterns.",
    systemHint:
      "Reply as a performance analyst. Cite the user's snapshot data explicitly, identify patterns, name the single highest-leverage move.",
  },
];

const SUGGESTIONS_BY_MODE: Record<Mode, Suggestion[]> = {
  coach: [
    { label: "Build tonight's revision session", prompt: "Build me tonight's revision session — 60 minutes, structured, prioritised by what my data says I need most.", icon: ListChecks },
    { label: "Re-plan my week", prompt: "Re-plan my week strategically based on recent performance, recency gaps and exam proximity. What gets added, dropped or interleaved — and why?", icon: RefreshCw },
    { label: "What should I prioritise tomorrow?", prompt: "Based on my data, what are the 3 most important things I should do tomorrow, in order, and why each one?", icon: Target },
    { label: "Reduce workload this week", prompt: "I'm feeling stretched. Cut my plan back to the essentials this week without losing exam-readiness — and explain the trade-offs.", icon: Activity },
  ],
  tutor: [
    { label: "Explain easements simply", prompt: "Explain easements simply, like I'm a beginner. Cover creation, scope and termination, with one short worked example.", icon: BookOpen },
    { label: "Summarise negligence in 2 mins", prompt: "Summarise negligence in 2 minutes — the four elements, the key tests, and the 2 most-tested traps in SQE1.", icon: Lightbulb },
    { label: "Explain consideration like I'm new", prompt: "Explain the doctrine of consideration like I'm completely new to it. Cover past consideration, sufficiency vs adequacy, and the practical exception in Williams v Roffey.", icon: BookOpen },
    { label: "Walk me through trust formalities", prompt: "Walk me through the formalities for creating an express trust over land vs personalty, with the section references and one common SQE trap.", icon: GraduationCap },
  ],
  practice: [
    { label: "Quiz me on consideration", prompt: "Quiz me on consideration. Ask one SBA at a time, wait for my answer, then mark it and explain.", icon: MessageSquare },
    { label: "Generate 5 SBA questions on trusts", prompt: "Generate 5 SQE1-style SBA questions on trusts. Provide 4 options each (A–D), mark the correct answer, and add a one-line explanation per question.", icon: ClipboardList },
    { label: "Test me on criminal law", prompt: "Test me on criminal law with 5 mixed SBAs across non-fatal offences, theft and homicide. Show the answers and explanations after I answer.", icon: Target },
    { label: "Give me a mini mock", prompt: "Give me a 10-question mini mock from across FLK1 subjects, exam-style, with mark scheme at the end.", icon: Layers },
    { label: "Create a flashcard set", prompt: "Create a 10-card flashcard set on the most-tested rules in land law. Format as 'Q: …' / 'A: …' pairs.", icon: Layers },
  ],
  analyse: [
    { label: "What am I weakest at?", prompt: "Based on my snapshot, what am I weakest at right now? Be specific, cite the data, and tell me the single highest-leverage move this week.", icon: AlertTriangle },
    { label: "Review my mock feedback", prompt: "Look at my recent mock performance and give me feedback: what's improving, what's regressing, and what to drill next.", icon: LineChart },
    { label: "Explain my biggest performance risk", prompt: "What is my single biggest risk to passing right now? Cite the data and tell me how to neutralise it this week.", icon: AlertTriangle },
    { label: "Where are my recency gaps?", prompt: "Which subjects have the worst recency decay right now and how should I sequence them back into my plan over the next 7 days?", icon: History },
  ],
};

const THINKING_LINES = [
  "Reading your performance snapshot…",
  "Pulling syllabus weighting…",
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
      { title: "Tentra Coach · Your AI SQE tutor & strategist" },
      { name: "description", content: "A conversational AI SQE tutor and study strategist. Ask legal questions, generate practice, drill weak areas and get adaptive plans." },
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Bootstrap: profile + analytics + last conversation flag
  useEffect(() => {
    (async () => {
      const user = await waitForAuthUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, display_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      const name = profile?.first_name || profile?.display_name?.split(" ")[0] || "";
      setFirstName(name);

      const plan = loadPlan();
      if (plan) {
        setStreak(computeStreak(plan.sessions).current);
        setAnalytics(deriveAnalytics(plan));
        if (plan.input?.examDate) {
          const d = Math.max(0, Math.round((+new Date(plan.input.examDate) - Date.now()) / 86400000));
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

  const contextualHook = useMemo(() => {
    if (!analytics) return "Ask me anything — I'll teach, plan, quiz or analyse.";
    const weakest = analytics.weakest[0];
    const trend = analytics.subjects.find((s) => s.trend !== null);
    if (weakest && trend) {
      return `Based on your recent ${weakest.module} scores, I'd start there — but ask me anything.`;
    }
    if (weakest) return `${weakest.module} is your softest module right now. Want me to drill or explain it?`;
    if (daysToExam !== null && daysToExam < 60) return `${daysToExam} days to exam. Let's make every session count.`;
    return "Ask me anything — I'll teach, plan, quiz or analyse.";
  }, [analytics, daysToExam]);

  const strategicInsights = useMemo(() => {
    if (!analytics) return [];
    const out: { icon: typeof TrendingUp; tone: "good" | "warn" | "info"; text: string; prompt: string }[] = [];

    const improving = analytics.subjects
      .filter((s) => s.trend !== null && (s.trend ?? 0) >= 5)
      .sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0))[0];
    if (improving) {
      out.push({
        icon: TrendingUp,
        tone: "good",
        text: `${improving.module} accuracy is up ${improving.trend}% — momentum is yours.`,
        prompt: `${improving.module} is improving — what should I do to lock in the gains?`,
      });
    }

    const declining = analytics.subjects
      .filter((s) => s.trend !== null && (s.trend ?? 0) <= -5)
      .sort((a, b) => (a.trend ?? 0) - (b.trend ?? 0))[0];
    if (declining) {
      out.push({
        icon: TrendingDown,
        tone: "warn",
        text: `${declining.module} has dropped ${Math.abs(declining.trend ?? 0)}% — flagging for reinforcement.`,
        prompt: `Diagnose why ${declining.module} is regressing and prescribe the next 3 sessions.`,
      });
    }

    const stale = analytics.subjects
      .filter((s) => s.recencyDays !== null && s.recencyDays >= 10 && s.highYield >= 4)
      .sort((a, b) => (b.recencyDays ?? 0) - (a.recencyDays ?? 0))[0];
    if (stale) {
      out.push({
        icon: AlertTriangle,
        tone: "warn",
        text: `${stale.module} hasn't been revised in ${stale.recencyDays} days.`,
        prompt: `Build a 45-minute refresher for ${stale.module} that targets the highest-yield gaps.`,
      });
    }

    if (analytics.peak && out.length < 3) {
      out.push({
        icon: Sun,
        tone: "info",
        text: `You perform ${analytics.peak.uplift}% better in ${analytics.peak.label} blocks.`,
        prompt: `How should I structure my ${analytics.peak.label} blocks for maximum yield?`,
      });
    }

    if (daysToExam !== null && analytics.readiness && out.length < 3) {
      const r = analytics.readiness.score;
      if (daysToExam <= 30 && r < 65) {
        out.push({
          icon: Activity,
          tone: "warn",
          text: `${daysToExam} days to exam at ${r}% readiness — scale mock exposure now.`,
          prompt: `${daysToExam} days to exam at ${r}% readiness — what's the highest-leverage 7-day plan?`,
        });
      } else if (r >= 70) {
        out.push({
          icon: Brain,
          tone: "good",
          text: `Readiness is tracking at ${r}%. Hold the line.`,
          prompt: `Readiness is ${r}% — how do I protect the gains over the next 2 weeks?`,
        });
      }
    }

    if (!out.length && streak >= 3) {
      out.push({
        icon: Flame,
        tone: "good",
        text: `${streak}-day streak. Consistency is the engine.`,
        prompt: `I'm on a ${streak}-day streak. How do I get the most from today's session?`,
      });
    }

    return out.slice(0, 3);
  }, [analytics, daysToExam, streak]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const dyn: Suggestion[] = [];
    if (analytics && (mode === "coach" || mode === "analyse" || mode === "practice")) {
      const weakest = analytics.weakest[0];
      if (weakest) {
        dyn.push({
          label: mode === "practice" ? `Drill ${weakest.module}` : `Why is ${weakest.module} weak?`,
          prompt:
            mode === "practice"
              ? `Build me a 10-question SBA drill on ${weakest.module}, targeting my weakest sub-topics, with answers and explanations.`
              : `Diagnose why ${weakest.module} is underperforming for me. Use my recency, confidence, accuracy and trend — and prescribe the next 3 sessions.`,
          icon: Target,
        });
      }
    }
    return [...dyn, ...SUGGESTIONS_BY_MODE[mode]].slice(0, 7);
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

    // Inject a lightweight mode hint as a leading system-style user note,
    // only on the first message of a fresh conversation, so the assistant
    // adopts the right register without bloating long threads.
    const modeHint = MODES.find((m) => m.id === mode)?.systemHint ?? "";
    const userMsg: Msg = { role: "user", content: text };
    const next: Msg[] =
      messages.length === 0 && modeHint
        ? [{ role: "user", content: `[${MODES.find((m) => m.id === mode)?.label} mode] ${modeHint}` }, { role: "assistant", content: "Understood." }, ...messages, userMsg]
        : [...messages, userMsg];

    // Show the user's actual message in the UI (skip the hidden hint pair if present)
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
  const activeMode = MODES.find((m) => m.id === mode)!;

  return (
    <AppShell
      title="Tentra Coach"
      subtitle="Your AI SQE tutor & strategist"
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
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        {/* MODE TABS */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card/40 p-1 backdrop-blur">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
                      : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="px-1 text-xs text-muted-foreground">{activeMode.blurb}</p>
        </div>

        {/* EMPTY STATE */}
        {isEmpty && (
          <section className="flex flex-col gap-5 animate-fade-in">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Tentra Coach</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-[28px]">
                {greeting}{" "}
                <span className="text-muted-foreground">{contextualHook}</span>
              </h1>
            </div>

            {/* Capability grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                { icon: BookOpen, label: "Ask legal questions" },
                { icon: GraduationCap, label: "Topic explanations" },
                { icon: ClipboardList, label: "Generate practice" },
                { icon: ListChecks, label: "Personalised plans" },
                { icon: Target, label: "Review weak areas" },
                { icon: LineChart, label: "Mock feedback" },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.label}
                    className="flex items-center gap-2 rounded-xl border border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground backdrop-blur"
                  >
                    <Icon className="h-3.5 w-3.5 text-pink" />
                    {c.label}
                  </div>
                );
              })}
            </div>

            {/* Strategic insights — only on Coach/Analyse modes */}
            {(mode === "coach" || mode === "analyse") && strategicInsights.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Based on your recent data
                </p>
                <div className="grid gap-2">
                  {strategicInsights.map((ins, i) => {
                    const Icon = ins.icon;
                    const tone =
                      ins.tone === "good"
                        ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300"
                        : ins.tone === "warn"
                          ? "border-amber-400/30 bg-amber-400/5 text-amber-300"
                          : "border-pink/30 bg-pink/5 text-pink";
                    return (
                      <button
                        key={i}
                        onClick={() => send(ins.prompt)}
                        className="group flex items-start gap-3 rounded-2xl border border-border bg-card/40 p-3.5 text-left backdrop-blur transition-colors hover:border-pink/40 hover:bg-card/60"
                      >
                        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${tone}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <p className="flex-1 text-sm leading-relaxed text-foreground">{ins.text}</p>
                        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resume prior conversation */}
            {hasPrior && (
              <button
                onClick={resumePrior}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 p-3 text-left backdrop-blur transition hover:border-pink/40 hover:bg-card/60"
              >
                <span className="flex items-center gap-2.5">
                  <span className="grid h-8 w-8 place-items-center rounded-xl border border-border bg-background/60 text-muted-foreground">
                    <History className="h-4 w-4" />
                  </span>
                  <span className="text-sm">
                    <span className="font-medium text-foreground">Resume last conversation</span>
                    <span className="ml-1 text-muted-foreground">— pick up where you left off</span>
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
        <section className="sticky bottom-4 z-10 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => {
              const Icon = s.icon ?? Sparkles;
              return (
                <button
                  key={s.label}
                  onClick={() => send(s.prompt)}
                  disabled={isStreaming}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-all hover:border-pink/40 hover:bg-card hover:text-foreground disabled:opacity-50"
                >
                  <Icon className="h-3 w-3 text-pink" />
                  {s.label}
                  <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); void send(); }}
            className="relative flex items-end gap-2 rounded-3xl border border-border bg-card/80 p-2 shadow-lg shadow-black/10 backdrop-blur-xl focus-within:border-pink/40"
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
                  ? "Ask me to explain a topic, walk through a rule, teach you something…"
                  : mode === "practice"
                    ? "Ask me to quiz you, generate SBAs, or run a mini mock…"
                    : mode === "analyse"
                      ? "Ask me to read your data, surface risks, or review a mock…"
                      : "Ask for a re-plan, prioritisation, or push back on a recommendation…"
              }
              rows={1}
              className="min-h-[44px] flex-1 resize-none border-0 bg-transparent text-[15px] focus-visible:ring-0"
            />
            <Button
              type="submit"
              disabled={!canSend}
              className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-pink-blue p-0 text-primary-foreground shadow-glow hover:opacity-95 disabled:opacity-40"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
          <p className="text-center text-[11px] text-muted-foreground">
            Tutoring, planning, practice and analysis. Study guidance, not legal advice.
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
            : "bg-gradient-pink-blue text-primary-foreground shadow-glow"
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
          <div className="prose prose-sm prose-invert max-w-none text-[15px] leading-relaxed [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1 [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
