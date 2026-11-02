import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Msg = { id: string; user_id: string; display_name: string; body: string; created_at: string };

function time(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function CommunityChat({ userId, examType, displayName, cohortLabel }: { userId: string; examType: string; displayName: string; cohortLabel: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("community_messages")
      .select("id, user_id, display_name, body, created_at")
      .eq("exam_type", examType)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => active && setMsgs(((data as Msg[]) ?? []).reverse()));

    const channel = supabase
      .channel(`community-${examType}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `exam_type=eq.${examType}` }, (p) => {
        const m = p.new as Msg;
        setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (p) => {
        const id = (p.old as { id?: string }).id;
        if (id) setMsgs((prev) => prev.filter((x) => x.id !== id));
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [examType]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length]);

  async function send() {
    const body = text.trim().slice(0, 1000);
    if (!body) return;
    setSending(true);
    const { data, error } = await supabase
      .from("community_messages")
      .insert({ user_id: userId, exam_type: examType, display_name: displayName, body })
      .select("id, user_id, display_name, body, created_at")
      .single();
    setSending(false);
    if (error) return toast.error("Couldn't send your message.");
    setText("");
    setMsgs((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Msg]));
  }

  async function remove(id: string) {
    const { error } = await supabase.from("community_messages").delete().eq("id", id);
    if (!error) setMsgs((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-card">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <MessageSquare className="h-4 w-4 text-pink" /> Cohort chat
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Ask questions, share tips and keep each other going. Only {cohortLabel} can see this. Be kind — no exam content from live sittings.
      </p>
      <div ref={listRef} className="mt-4 h-80 space-y-3 overflow-y-auto rounded-2xl bg-muted/30 p-4">
        {msgs.length === 0 ? (
          <p className="pt-24 text-center text-sm text-muted-foreground">No messages yet — say hello to your cohort.</p>
        ) : (
          msgs.map((m) => {
            const mine = m.user_id === userId;
            return (
              <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"}`}>
                  <div className={`flex items-center gap-2 text-[11px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    <span className="font-medium">{mine ? "You" : m.display_name}</span>
                    <span>{time(m.created_at)}</span>
                    {mine && (
                      <button type="button" aria-label="Delete message" onClick={() => remove(m.id)} className="opacity-0 transition group-hover:opacity-100">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">{m.body}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          value={text}
          maxLength={1000}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Message your cohort…"
          className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" disabled={sending || !text.trim()} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}
