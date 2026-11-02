import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Users, Trophy, Flame, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { loadPlan } from "@/lib/plan-store";
import { getExamLabel } from "@/lib/exam-label";

export const Route = createFileRoute("/community")({
  beforeLoad: async () => {
    const { requireAccess } = await import("@/lib/access-guard");
    await requireAccess();
  },
  component: CommunityPage,
  head: () => ({
    meta: [
      { title: "Community · Tentra" },
      { name: "description", content: "Weekly study momentum and check-ins with candidates sitting your exam." },
      { property: "og:title", content: "Community · Tentra" },
      { property: "og:description", content: "Weekly study momentum and check-ins with candidates sitting your exam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Member = { exam_type: string; display_name: string; opted_in: boolean };
type Row = { user_id: string; display_name: string; week_minutes: number; week_questions: number; streak_days: number; is_me: boolean };
type Checkin = { id: string; display_name: string; topic: string; note: string | null; created_at: string; is_me: boolean };

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtMins(m: number) {
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
}
function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h}h ago` : "yesterday";
}

function CommunityPage() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [plan, setPlan] = useState<ReturnType<typeof loadPlan>>(null);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setPlan(loadPlan()), []);
  const examType = plan?.input.examType ?? "SQE1";
  const label = getExamLabel(plan?.input.examType, plan?.input.examPath);
  const subjects = useMemo(() => (plan?.input.modules ?? []).map((m) => m.name).slice(0, 10), [plan]);

  const refresh = useCallback(async () => {
    const [lb, ci] = await Promise.all([
      supabase.rpc("get_community_leaderboard"),
      supabase.rpc("get_community_checkins"),
    ]);
    setRows((lb.data as Row[]) ?? []);
    setCheckins((ci.data as Checkin[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const [{ data: m }, { data: p }] = await Promise.all([
          supabase.from("community_members").select("exam_type, display_name, opted_in").eq("user_id", uid).maybeSingle(),
          supabase.from("profiles").select("first_name, last_name").eq("user_id", uid).maybeSingle(),
        ]);
        setMember(m ?? null);
        const first = p?.first_name?.trim() ?? "";
        const initial = p?.last_name?.trim()?.[0];
        setName(m?.display_name ?? (first ? `${first}${initial ? ` ${initial}.` : ""}` : ""));
        if (m?.opted_in) await refresh();
      }
      setReady(true);
    })();
  }, [refresh]);

  // Keep the cohort in step with the student's current exam.
  useEffect(() => {
    if (userId && member?.opted_in && plan && member.exam_type !== examType) {
      supabase.from("community_members").update({ exam_type: examType }).eq("user_id", userId).then(() => {
        setMember({ ...member, exam_type: examType });
        refresh();
      });
    }
  }, [userId, member, plan, examType, refresh]);

  async function join(anonymous: boolean) {
    if (!userId) return;
    const display = anonymous || !name.trim() ? `${label} candidate` : name.trim().slice(0, 40);
    setBusy(true);
    const { error } = await supabase.from("community_members").upsert({ user_id: userId, exam_type: examType, display_name: display, opted_in: true });
    setBusy(false);
    if (error) return toast.error("Couldn't join right now. Please try again.");
    setMember({ exam_type: examType, display_name: display, opted_in: true });
    await refresh();
  }

  async function leave() {
    if (!userId) return;
    await supabase.from("community_members").update({ opted_in: false }).eq("user_id", userId);
    setMember((m) => (m ? { ...m, opted_in: false } : m));
    setRows([]);
    setCheckins([]);
    toast.success("You're hidden from the community.");
  }

  async function checkIn() {
    if (!userId || !topic.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("community_checkins").upsert(
      { user_id: userId, exam_type: examType, local_date: todayLocal(), topic: topic.trim().slice(0, 80), note: note.trim().slice(0, 140) || null },
      { onConflict: "user_id,local_date" },
    );
    setBusy(false);
    if (error) return toast.error("Couldn't save your check-in.");
    setNote("");
    toast.success("Checked in for today.");
    await refresh();
  }

  const cohort = `${label} candidates`;
  const myCheckin = checkins.find((c) => c.is_me);

  if (!ready) {
    return (
      <AppShell title="Community" subtitle="Study alongside other candidates.">
        <div className="grid place-items-center py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
      </AppShell>
    );
  }

  if (!member?.opted_in) {
    return (
      <AppShell title="Community" subtitle={`Study alongside other ${cohort}.`}>
        <section className="rounded-3xl border border-border bg-card p-8 shadow-card">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-pink-blue shadow-glow">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-foreground">Join your {label} cohort</h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            See this week's study momentum, keep your streak visible and share what you're revising today.
            Only other {cohort} see you, and only your study minutes, question count and streak are shared — never your scores.
          </p>
          <div className="mt-6 max-w-sm space-y-3">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="cn">Display name</label>
            <Input id="cn" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rebecca H." />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => join(false)}>Join with this name</Button>
              <Button variant="outline" disabled={busy} onClick={() => join(true)}>Join anonymously</Button>
            </div>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell title="Community" subtitle={`This week with other ${cohort}.`}>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><Trophy className="h-4 w-4 text-pink" /> Weekly momentum</h2>
            <span className="text-xs text-muted-foreground">Resets every Monday</span>
          </div>
          {rows.length <= 1 && (
            <p className="mt-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              You're one of the first in this cohort — more candidates will appear here as they join.
            </p>
          )}
          <ol className="mt-4 divide-y divide-border">
            {rows.map((r, i) => (
              <li key={r.user_id} className={`flex items-center gap-3 py-3 ${r.is_me ? "rounded-xl bg-accent/40 px-2" : ""}`}>
                <span className="w-6 text-center text-sm font-semibold text-muted-foreground">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium text-foreground">{r.display_name}{r.is_me && " (you)"}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{fmtMins(r.week_minutes)}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{r.week_questions} Qs</span>
                <span className={`flex items-center gap-1 text-xs ${r.streak_days >= 7 ? "text-pink" : "text-muted-foreground"}`}><Flame className="h-3 w-3" />{r.streak_days}d</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground"><CheckCircle2 className="h-4 w-4 text-pink" /> Today's check-in</h2>
          <p className="mt-1 text-xs text-muted-foreground">{myCheckin ? `You're on: ${myCheckin.topic}. Update it any time.` : "What are you tackling today?"}</p>
          {subjects.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {subjects.map((s) => (
                <button key={s} type="button" onClick={() => setTopic(s)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${topic === s ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="mt-3 space-y-2">
            <Input value={topic} maxLength={80} onChange={(e) => setTopic(e.target.value)} placeholder="Topic" />
            <Input value={note} maxLength={140} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (e.g. 2 hours of past questions)" />
            <Button className="w-full" disabled={busy || !topic.trim()} onClick={checkIn}>Check in</Button>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-foreground">Revising now</h3>
          {checkins.length === 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">No check-ins in the last 48 hours yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {checkins.map((c) => (
                <li key={c.id} className="rounded-xl border border-border p-3">
                  <div className="flex justify-between text-xs"><span className="font-medium text-foreground">{c.display_name}</span><span className="text-muted-foreground">{ago(c.created_at)}</span></div>
                  <div className="mt-1 text-sm text-foreground">{c.topic}</div>
                  {c.note && <div className="mt-0.5 text-xs text-muted-foreground">{c.note}</div>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Showing as <span className="font-medium">{member.display_name}</span>.{" "}
        <button type="button" onClick={leave} className="underline">Hide me from the community</button>
      </p>
    </AppShell>
  );
}
