import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, RefreshCw, Send, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { mergeMessages, type ChatMsg } from "@/lib/community-chat-merge";

type Msg = ChatMsg;
type Status = "loading" | "ready" | "error";

const COLS = "id, user_id, display_name, body, created_at";

function time(iso: string) {
  const d = new Date(iso);
  const t = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString()
    ? t
    : `${d.toLocaleDateString([], { day: "numeric", month: "short" })} ${t}`;
}

export function CommunityChat({ userId, examType, displayName, cohortLabel }: { userId: string; examType: string; displayName: string; cohortLabel: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [live, setLive] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const deleted = useRef(new Set<string>());
  const [reconnectKey, setReconnectKey] = useState(0);

  const fetchLatest = useCallback(async () => {
    const { data, error } = await supabase
      .from("community_messages")
      .select(COLS)
      .eq("exam_type", examType)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      setStatus((s) => (s === "ready" ? s : "error"));
      return;
    }
    // The server snapshot is authoritative; keep only newer realtime rows it may not include yet.
    setMsgs((prev) => mergeMessages(prev, (data as Msg[]) ?? [], deleted.current, true));
    setStatus("ready");
  }, [examType]);

  useEffect(() => {
    setStatus("loading");
    setMsgs([]);
    deleted.current = new Set();
    fetchLatest();
  }, [fetchLatest]);

  useEffect(() => {
    let wasDown = false;
    const channel = supabase
      .channel(`community-${examType}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages", filter: `exam_type=eq.${examType}` }, (p) => {
        setMsgs((prev) => mergeMessages(prev, [p.new as Msg], deleted.current));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (p) => {
        const id = (p.old as { id?: string }).id;
        if (!id) return;
        deleted.current.add(id);
        setMsgs((prev) => prev.filter((x) => x.id !== id));
      })
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setLive(true);
          if (wasDown) fetchLatest(); // catch up on anything missed while offline
          wasDown = false;
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          wasDown = true;
          setLive(false);
        }
      });
    const onWake = () => {
      if (document.visibilityState === "visible") fetchLatest();
    };
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
      supabase.removeChannel(channel);
    };
  }, [examType, fetchLatest, reconnectKey]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length, status]);

  async function send() {
    const body = text.trim().slice(0, 1000);
    if (!body || sending) return;
    setSending(true);
    const { data, error } = await supabase
      .from("community_messages")
      .insert({ user_id: userId, exam_type: examType, display_name: displayName, body })
      .select(COLS)
      .single();
    setSending(false);
    if (error || !data) {
      toast.error("Message not sent", { description: "Your text is still in the box. Check your connection and try again." });
      return;
    }
    setText("");
    setMsgs((prev) => mergeMessages(prev, [data as Msg], deleted.current));
  }

  async function remove(id: string) {
    setDeleting(id);
    const { error } = await supabase.from("community_messages").delete().eq("id", id);
    setDeleting(null);
    if (error) return toast.error("Couldn't delete that message. Please try again.");
    deleted.current.add(id);
    setMsgs((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <section aria-labelledby="chat-h" className="flex flex-col rounded-3xl border border-border bg-card shadow-card">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h2 id="chat-h" className="flex items-center gap-2 text-base font-semibold text-foreground">
            <MessageSquare className="h-4 w-4 text-pink" /> Cohort chat
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Only {cohortLabel} can see this. Be kind — no content from live sittings.
          </p>
        </div>
        <span className={`mt-0.5 inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${live ? "bg-pink/10 text-pink" : "bg-muted text-muted-foreground"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${live ? "bg-pink" : "bg-muted-foreground"}`} />
          {live ? "Live" : "Offline"}
        </span>
      </header>

      {!live && status === "ready" && (
        <div role="status" className="flex items-center justify-between gap-2 bg-muted/60 px-4 py-2 text-xs text-muted-foreground sm:px-5">
          <span className="flex items-center gap-1.5"><WifiOff className="h-3.5 w-3.5" /> Reconnecting… new messages may be delayed.</span>
          <button type="button" className="font-medium underline" onClick={() => { setReconnectKey((k) => k + 1); fetchLatest(); }}>
            Reconnect
          </button>
        </div>
      )}

      <div ref={listRef} aria-live="polite" className="h-[55vh] min-h-64 space-y-3 overflow-y-auto bg-muted/20 px-3 py-4 sm:h-96 sm:px-5">
        {status === "loading" ? (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading messages…</span>
          </div>
        ) : status === "error" ? (
          <div role="alert" className="grid h-full place-items-center text-center text-sm text-muted-foreground">
            <div>
              <p>Couldn't load the chat.</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => { setStatus("loading"); fetchLatest(); }}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Try again
              </Button>
            </div>
          </div>
        ) : msgs.length === 0 ? (
          <p className="grid h-full place-items-center text-center text-sm text-muted-foreground">No messages yet — say hello to your cohort.</p>
        ) : (
          msgs.map((m) => {
            const mine = m.user_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[75%] ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border border-border bg-card text-foreground"}`}>
                  <div className={`flex items-center gap-2 text-[11px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    <span className="font-medium">{mine ? "You" : m.display_name}</span>
                    <time dateTime={m.created_at}>{time(m.created_at)}</time>
                    {mine && (
                      <button type="button" aria-label="Delete message" disabled={deleting === m.id} onClick={() => remove(m.id)} className="-m-1 rounded p-1 opacity-70 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        {deleting === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
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
        className="flex items-end gap-2 border-t border-border p-3 sm:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="chat-input" className="sr-only">Message your cohort</label>
        <textarea
          id="chat-input"
          value={text}
          maxLength={1000}
          rows={1}
          disabled={status !== "ready"}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${cohortLabel}…`}
          className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 sm:text-sm"
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim() || status !== "ready"} aria-label="Send message" className="h-11 w-11 shrink-0 rounded-full">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </section>
  );
}
