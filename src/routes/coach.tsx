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
} from "lucide-react";
import { waitForAuthUser } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { loadPlan, computeStreak } from "@/lib/plan-store";
import { deriveAnalytics, type AnalyticsBundle } from "@/lib/analytics-derive";

type Msg = { role: "user" | "assistant"; content: string };

type Suggestion = { label: string; prompt: string };

const BASE_SUGGESTIONS: Suggestion[] = [
  { label: "Re-plan my week", prompt: "Re-plan my week strategically based on recent performance, recency gaps and exam proximity. What gets added, dropped or interleaved — and why?" },
  { label: "What should I prioritise tomorrow?", prompt: "Based on my data, what are the 3 most important things I should do tomorrow, in order, and why each one?" },
  { label: "Generate a weak-area drill", prompt: "Design a focused drill that targets my weakest patterns. Specify module, format, length, pacing and what success looks like." },
  { label: "Explain my biggest performance risk", prompt: "What is my single biggest risk to passing right now? Cite the data and tell me how to neutralise it this week." },
  { label: "Reduce workload this week", prompt: "I'm feeling stretched. Cut my plan back to the essentials this week without losing exam-readiness — and explain the trade-offs." },
  { label: "Challenge me with hard SBAs", prompt: "Build me a high-difficulty SBA challenge in my weakest module at full SQE pace. Tell me what you're testing and why." },
];

export const Route = createFileRoute("/coach")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: CoachPage,
  head: () => ({
    meta: [
      { title: "Tentra Coach · Your AI study strategist" },
      { name: "description", content: "A conversational AI strategist that synthesises your mocks, confidence, recency and consistency into adaptive SQE guidance." },
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

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
          const d = Math.max(
            0,
            Math.round((+new Date(plan.input.examDate) - Date.now()) / 86400000),
          );
          setDaysToExam(d);
        }
      }
    })().catch(() => {});

    try {
      const prefilled = sessionStorage.getItem("coach:autosend");
      if (prefilled) {
        sessionStorage.removeItem("coach:autosend");
        setTimeout(() => { void send(prefilled); }, 200);
      }
    } catch {}
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

  // Auto-grow textarea
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

  // Build dynamic strategic insights from real analytics
  const strategicInsights = useMemo(() => {
    if (!analytics) return [];
    const out: { icon: typeof TrendingUp; tone: "good" | "warn" | "info"; text: string }[] = [];

    const improving = analytics.subjects
      .filter((s) => s.trend !== null && (s.trend ?? 0) >= 5)
      .sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0))[0];
    if (improving) {
      out.push({
        icon: TrendingUp,
        tone: "good",
        text: `${improving.module} accuracy is up ${improving.trend}% across recent sessions — momentum is yours.`,
      });
    }

    const declining = analytics.subjects
      .filter((s) => s.trend !== null && (s.trend ?? 0) <= -5)
      .sort((a, b) => (a.trend ?? 0) - (b.trend ?? 0))[0];
    if (declining) {
      out.push({
        icon: TrendingDown,
        tone: "warn",
        text: `${declining.module} has dropped ${Math.abs(declining.trend ?? 0)}% — flagging for spaced reinforcement.`,
      });
    }

    const stale = analytics.subjects
      .filter((s) => s.recencyDays !== null && s.recencyDays >= 10 && s.highYield >= 4)
      .sort((a, b) => (b.recencyDays ?? 0) - (a.recencyDays ?? 0))[0];
    if (stale) {
      out.push({
        icon: AlertTriangle,
        tone: "warn",
        text: `${stale.module} hasn't been revised in ${stale.recencyDays} days. Recency decay is starting to bite.`,
      });
    }

    if (analytics.peak && out.length < 3) {
      out.push({
        icon: Sun,
        tone: "info",
        text: `You perform ${analytics.peak.uplift}% better in ${analytics.peak.label} blocks — protect that window.`,
      });
    }

    if (daysToExam !== null && analytics.readiness && out.length < 3) {
      const r = analytics.readiness.score;
      if (daysToExam <= 30 && r < 65) {
        out.push({
          icon: Activity,
          tone: "warn",
          text: `${daysToExam} days to exam at ${r}% readiness — scaling mock exposure is the highest-leverage move.`,
        });
      } else if (r >= 70) {
        out.push({
          icon: Brain,
          tone: "good",
          text: `Readiness is tracking at ${r}%. Hold the line and protect weak-area drills.`,
        });
      }
    }

    if (!out.length && streak >= 3) {
      out.push({
        icon: Flame,
        tone: "good",
        text: `${streak}-day streak. Consistency is the engine — log a session today to keep compounding.`,
      });
    }

    return out.slice(0, 3);
  }, [analytics, daysToExam, streak]);

  // Suggestions adapt to real data
  const suggestions = useMemo<Suggestion[]>(() => {
    const dyn: Suggestion[] = [];
    if (analytics) {
      const weakest = analytics.weakest[0];
      if (weakest) {
        dyn.push({
          label: `Explain why ${weakest.module} is weak`,
          prompt: `Diagnose why ${weakest.module} is underperforming for me. Use my recency, confidence, accuracy and trend — and prescribe the next 3 sessions.`,
        });
      }
      const top = analytics.atRisk[0];
      if (top && top.module !== weakest?.module) {
        dyn.push({
          label: `Drill ${top.module} now`,
          prompt: `Build me a focused ${top.module} drill targeting my weakest sub-topics, sized for one focus block, with timing guidance.`,
        });
      }
    }
    return [...dyn, ...BASE_SUGGESTIONS].slice(0, 7);
  }, [analytics]);

  const canSend = input.trim().length > 0 && !isStreaming;

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || isStreaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
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
      subtitle="Your AI study strategist"
      actions={
        <span className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs backdrop-blur sm:inline-flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pink opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-pink" />
          </span>
          <span className="font-medium text-muted-foreground">Synthesising your data</span>
        </span>
      }
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {/* SECTION 1 — Strategic insight strip */}
        {isEmpty && (
          <section className="flex flex-col gap-4 pt-2">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Strategic read</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-[28px]">
                {greeting}{" "}
                <span className="text-muted-foreground">
                  {analytics?.hasAnyData
                    ? "Here's what your data is telling me."
                    : "Log a few sessions and I'll start synthesising your strategy."}
                </span>
              </h1>
            </div>

            {strategicInsights.length > 0 && (
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
                    <div
                      key={i}
                      className="group flex items-start gap-3 rounded-2xl border border-border bg-card/40 p-3.5 backdrop-blur transition-colors hover:bg-card/60"
                    >
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="flex-1 text-sm leading-relaxed text-foreground">{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* SECTION 2 — Conversation */}
        {!isEmpty && (
          <section
            ref={scrollerRef}
            className="-mx-2 flex-1 overflow-y-auto px-2 pt-4"
            style={{ maxHeight: "calc(100vh - 280px)" }}
          >
            <div className="flex flex-col gap-6">
              {messages.map((m, i) => (
                <Message key={i} role={m.role} content={m.content} firstName={firstName} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 pl-11 text-xs text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-pink" />
                  </span>
                  Reading your data…
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION 3 + 4 — Composer with suggestion chips */}
        <section className="sticky bottom-4 z-10 flex flex-col gap-3">
          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.prompt)}
                disabled={isStreaming}
                className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur transition-all hover:border-pink/40 hover:bg-card hover:text-foreground disabled:opacity-50"
              >
                {s.label}
                <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
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
              placeholder="Ask for analysis, a re-plan, or push back on a recommendation…"
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
            Synthesising mocks, confidence, recency and consistency. Study guidance, not legal advice.
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
    <div className="flex gap-3">
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
