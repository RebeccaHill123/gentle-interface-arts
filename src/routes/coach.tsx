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
  Flame,
  Target,
  HeartPulse,
  TrendingUp,
  AlertTriangle,
  Timer,
  LineChart,
  Layers,
  Gauge,
} from "lucide-react";
import { waitForAuthUser } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { loadPlan, computeStreak } from "@/lib/plan-store";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS: { icon: typeof Target; label: string; prompt: string }[] = [
  { icon: TrendingUp, label: "Analyse my mock trend", prompt: "Analyse my recent mock performance — what's trending up, what's regressing, and which modules need re-weighting this week?" },
  { icon: AlertTriangle, label: "Find my weak patterns", prompt: "Identify my weakest patterns across modules and task types. Be specific about timing, accuracy and topic clusters, and tell me what to drill first." },
  { icon: Layers, label: "Why these priorities?", prompt: "Walk me through why my current top-priority topics were chosen — cite recency gaps, confidence levels and high-yield weighting." },
  { icon: Timer, label: "Land Law timed drill", prompt: "Build me a 45-minute timed Land Law SBA drill targeting my weakest sub-topics, at SQE pace (~1.7 min/question)." },
  { icon: LineChart, label: "Re-plan this week", prompt: "Recommend strategic changes to this week's plan based on my recent performance, recency decay and exam proximity. What do I add, drop, or interleave?" },
  { icon: Gauge, label: "Adjust intensity", prompt: "Given how many hours I've actually completed vs target, my streak and how close the exam is — should I scale intensity up or down, and how?" },
];

export const Route = createFileRoute("/coach")({
  beforeLoad: async () => {
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: CoachPage,
  head: () => ({
    meta: [
      { title: "Tentra Coach · Your AI study coach" },
      { name: "description", content: "An AI coach that explains concepts, builds plans, generates quizzes, and keeps you accountable for the SQE." },
    ],
  }),
});

function CoachPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [greeting, setGreeting] = useState("Hey — ready to lock in?");
  const [readiness, setReadiness] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    (async () => {
      const user = await waitForAuthUser();
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, display_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      const name = profile?.first_name || profile?.display_name?.split(" ")[0] || "";
      const hour = new Date().getHours();
      const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
      setGreeting(name ? `${part}, ${name} — what are we tackling?` : `${part} — what are we tackling?`);

      const plan = loadPlan();
      if (plan) {
        setStreak(computeStreak(plan.sessions).current);
        const mods = plan.input?.modules ?? [];
        if (mods.length) {
          const avg =
            mods.reduce((a: number, m: { confidence?: number }) => a + (m.confidence ?? 0), 0) /
            mods.length;
          setReadiness(Math.round(Math.min(95, Math.max(15, avg * 18 + 25))));
        }
      }
    })().catch(() => {});
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isStreaming]);

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

  const burnoutNote = useMemo(() => {
    if (streak >= 14) return "You're on a serious run — sleep is part of the plan.";
    if (streak >= 5) return "Strong momentum. Keep sessions to 90 min max with breaks.";
    return "Small reps. One focus block today beats a perfect plan tomorrow.";
  }, [streak]);

  return (
    <AppShell
      title="Tentra Coach"
      subtitle="Your AI study coach"
      actions={
        <span className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs backdrop-blur sm:inline-flex">
          <Sparkles className="h-3.5 w-3.5 text-pink" />
          <span className="font-semibold">AI Coach</span>
        </span>
      }
    >
      <div className="flex flex-col">

        {/* Orb + greeting */}
        <section className="mt-6 flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 -z-10 animate-pulse rounded-full bg-gradient-pink-blue opacity-40 blur-2xl" />
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-pink-blue shadow-glow">
              <Sparkles className="h-9 w-9 text-primary-foreground" />
            </div>
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">{greeting}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Ask anything. I can explain concepts, build plans, generate quizzes, and keep you accountable.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Pill icon={Flame} label={`${streak}-day streak`} />
            {readiness !== null && <Pill icon={Target} label={`Readiness ~${readiness}%`} />}
            <Pill icon={HeartPulse} label={burnoutNote} subtle />
          </div>
        </section>

        {/* Chat */}
        <section
          ref={scrollerRef}
          className="mt-6 flex-1 overflow-y-auto rounded-3xl border border-border bg-card/40 p-4 backdrop-blur md:p-6"
          style={{ maxHeight: "60vh" }}
        >
          {messages.length === 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {SUGGESTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="group flex items-center gap-3 rounded-2xl border border-border bg-background/40 px-4 py-3 text-left text-sm transition-all hover:border-pink/50 hover:bg-background/70"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-pink-blue/20 text-pink">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{s.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <Bubble key={i} role={m.role} content={m.content} />
              ))}
              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Coach is thinking…
                </div>
              )}
            </div>
          )}
        </section>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="mt-4 flex items-end gap-2 rounded-3xl border border-border bg-card/60 p-2 backdrop-blur"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
            }}
            placeholder="Ask Coach anything — concepts, plans, quizzes, motivation…"
            rows={1}
            className="min-h-[44px] flex-1 resize-none border-0 bg-transparent focus-visible:ring-0"
          />
          <Button
            type="submit"
            disabled={!canSend}
            className="h-11 rounded-2xl bg-gradient-pink-blue px-4 text-primary-foreground shadow-glow hover:opacity-95"
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Study guidance, not legal advice. Coach can make mistakes — verify key citations.
        </p>
      </div>
    </AppShell>
  );
}

function Pill({ icon: Icon, label, subtle }: { icon: typeof Flame; label: string; subtle?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
        subtle
          ? "border-border bg-background/40 text-muted-foreground"
          : "border-pink/30 bg-pink/10 text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5 text-pink" /> {label}
    </span>
  );
}

function Bubble({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isUser
            ? "bg-gradient-pink-blue text-primary-foreground"
            : "border border-border bg-background/70 text-foreground"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none [&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_h1]:text-base [&_h2]:text-base [&_h3]:text-sm [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
