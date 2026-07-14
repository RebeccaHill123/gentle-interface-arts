import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ExamKind = "SQE" | "UBE";

export interface GeneratedCard {
  id: string;
  front: string;
  back: string;
  exam_tip: string | null;
  difficulty: "Easy" | "Medium" | "Hard";
  source: "ai";
  topic: string;
}

export interface FetchSubtopicResult {
  status: "ready" | "pending" | "failed";
  cards: GeneratedCard[];
  error?: string | null;
}

const MODEL = "google/gemini-2.5-flash";
const TARGET_CARDS = 15;

interface Input {
  examKind: ExamKind;
  subject: string;
  subtopic: string;
  deckId: string;
}

function validateInput(raw: unknown): Input {
  const r = raw as Partial<Input>;
  if (!r || typeof r !== "object") throw new Error("Invalid input");
  if (r.examKind !== "SQE" && r.examKind !== "UBE") throw new Error("Invalid examKind");
  const subject = String(r.subject ?? "").trim();
  const subtopic = String(r.subtopic ?? "").trim();
  const deckId = String(r.deckId ?? "").trim();
  if (!subject || !subtopic || !deckId) throw new Error("Missing subject/subtopic/deckId");
  return { examKind: r.examKind, subject, subtopic, deckId };
}

/** Fetch existing generated cards for a sub-topic (no generation). Public. */
export const fetchSubtopicDeck = createServerFn({ method: "POST" })
  .inputValidator(validateInput)
  .handler(async ({ data }): Promise<FetchSubtopicResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: status }, { data: cards }] = await Promise.all([
      supabaseAdmin
        .from("generated_deck_status")
        .select("status, last_error")
        .eq("exam_kind", data.examKind)
        .eq("subject", data.subject)
        .eq("subtopic", data.subtopic)
        .maybeSingle(),
      supabaseAdmin
        .from("generated_flashcards")
        .select("id, front, back, exam_tip, difficulty, source")
        .eq("exam_kind", data.examKind)
        .eq("subject", data.subject)
        .eq("subtopic", data.subtopic)
        .order("created_at", { ascending: true }),
    ]);

    return {
      status: (status?.status as "ready" | "pending" | "failed" | undefined) ??
        (cards && cards.length > 0 ? "ready" : "pending"),
      cards: (cards ?? []).map((c) => ({
        id: c.id,
        front: c.front,
        back: c.back,
        exam_tip: c.exam_tip,
        difficulty: c.difficulty as "Easy" | "Medium" | "Hard",
        source: "ai" as const,
        topic: data.subtopic,
      })),
      error: status?.last_error ?? null,
    };
  });

/** Generate a deck for a sub-topic. Auth-gated. Idempotent per (examKind, subject, subtopic). */
export const generateSubtopicDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInput)
  .handler(async ({ data }): Promise<FetchSubtopicResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    // Idempotency: if already ready, return cached.
    const { data: existingStatus } = await supabaseAdmin
      .from("generated_deck_status")
      .select("status, updated_at")
      .eq("exam_kind", data.examKind)
      .eq("subject", data.subject)
      .eq("subtopic", data.subtopic)
      .maybeSingle();

    if (existingStatus?.status === "ready") {
      const { data: cards } = await supabaseAdmin
        .from("generated_flashcards")
        .select("id, front, back, exam_tip, difficulty")
        .eq("exam_kind", data.examKind)
        .eq("subject", data.subject)
        .eq("subtopic", data.subtopic)
        .order("created_at", { ascending: true });
      return {
        status: "ready",
        cards: (cards ?? []).map((c) => ({
          id: c.id,
          front: c.front,
          back: c.back,
          exam_tip: c.exam_tip,
          difficulty: c.difficulty as "Easy" | "Medium" | "Hard",
          source: "ai" as const,
          topic: data.subtopic,
        })),
      };
    }

    if (existingStatus?.status === "pending") {
      const ageMs = Date.now() - new Date(existingStatus.updated_at as unknown as string).getTime();
      if (ageMs < 60_000) {
        return { status: "pending", cards: [] };
      }
    }

    // Mark pending
    await supabaseAdmin.from("generated_deck_status").upsert({
      exam_kind: data.examKind,
      subject: data.subject,
      subtopic: data.subtopic,
      status: "pending",
      card_count: 0,
      last_error: null,
      model: MODEL,
      updated_at: new Date().toISOString(),
    });

    const examLabel = data.examKind === "UBE"
      ? "US bar exam (UBE — MBE/MEE/MPT)"
      : "SQE1 (England & Wales)";

    const systemPrompt = `You are drafting original revision flashcards for the ${examLabel}.
Write from primary sources only (statute, case law, official exam specification). Never copy or paraphrase third-party commercial materials (Brainscape, Barbri, Quimbee, AdaptiBar, Kaplan, etc.).
Produce exactly ${TARGET_CARDS} high-quality flashcards for the sub-topic "${data.subtopic}" within the subject "${data.subject}".
Requirements:
- Mix difficulties: roughly 5 Easy, 6 Medium, 4 Hard.
- Each card: a crisp question on the front (≤ 140 chars), a precise legal answer on the back (≤ 500 chars), and an optional short exam tip (≤ 200 chars).
- Prefer black-letter law, elements, tests, exceptions, and common exam traps.
- Where relevant, cite the statute/section or leading authority in the answer.
- No preamble, no numbering inside the front/back text.
Return STRICT JSON only, matching:
{"cards":[{"front":"...","back":"...","exam_tip":"..."|null,"difficulty":"Easy"|"Medium"|"Hard"}]}`;

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate the ${TARGET_CARDS} flashcards now for "${data.subtopic}" (${data.subject}, ${examLabel}). Return JSON only.` },
          ],
        }),
      });

      if (!aiRes.ok) {
        const txt = await aiRes.text();
        const msg = aiRes.status === 429
          ? "AI gateway rate-limited. Try again in a moment."
          : aiRes.status === 402
            ? "AI credits exhausted. Add credits in workspace settings."
            : `AI gateway error (${aiRes.status})`;
        await supabaseAdmin.from("generated_deck_status").upsert({
          exam_kind: data.examKind,
          subject: data.subject,
          subtopic: data.subtopic,
          status: "failed",
          card_count: 0,
          last_error: `${msg}: ${txt.slice(0, 200)}`,
          model: MODEL,
          updated_at: new Date().toISOString(),
        });
        return { status: "failed", cards: [], error: msg };
      }

      const payload = await aiRes.json() as { choices?: Array<{ message?: { content?: string } }> };
      const raw = payload.choices?.[0]?.message?.content ?? "{}";
      let parsed: { cards?: Array<{ front?: string; back?: string; exam_tip?: string | null; difficulty?: string }> };
      try {
        parsed = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : { cards: [] };
      }

      const clean = (parsed.cards ?? [])
        .map((c) => ({
          front: String(c.front ?? "").trim().slice(0, 400),
          back: String(c.back ?? "").trim().slice(0, 1200),
          exam_tip: c.exam_tip ? String(c.exam_tip).trim().slice(0, 400) : null,
          difficulty: (c.difficulty === "Easy" || c.difficulty === "Hard" ? c.difficulty : "Medium") as "Easy" | "Medium" | "Hard",
        }))
        .filter((c) => c.front.length > 4 && c.back.length > 4);

      if (clean.length === 0) {
        await supabaseAdmin.from("generated_deck_status").upsert({
          exam_kind: data.examKind,
          subject: data.subject,
          subtopic: data.subtopic,
          status: "failed",
          card_count: 0,
          last_error: "Model returned no usable cards",
          model: MODEL,
          updated_at: new Date().toISOString(),
        });
        return { status: "failed", cards: [], error: "No cards generated" };
      }

      const rows = clean.map((c) => ({
        exam_kind: data.examKind,
        subject: data.subject,
        subtopic: data.subtopic,
        deck_id: data.deckId,
        front: c.front,
        back: c.back,
        exam_tip: c.exam_tip,
        difficulty: c.difficulty,
        source: "ai",
        model: MODEL,
      }));

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("generated_flashcards")
        .insert(rows)
        .select("id, front, back, exam_tip, difficulty");

      if (insertErr) throw insertErr;

      await supabaseAdmin.from("generated_deck_status").upsert({
        exam_kind: data.examKind,
        subject: data.subject,
        subtopic: data.subtopic,
        status: "ready",
        card_count: inserted?.length ?? 0,
        last_error: null,
        model: MODEL,
        updated_at: new Date().toISOString(),
      });

      return {
        status: "ready",
        cards: (inserted ?? []).map((c) => ({
          id: c.id,
          front: c.front,
          back: c.back,
          exam_tip: c.exam_tip,
          difficulty: c.difficulty as "Easy" | "Medium" | "Hard",
          source: "ai" as const,
          topic: data.subtopic,
        })),
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      await supabaseAdmin.from("generated_deck_status").upsert({
        exam_kind: data.examKind,
        subject: data.subject,
        subtopic: data.subtopic,
        status: "failed",
        card_count: 0,
        last_error: msg.slice(0, 300),
        model: MODEL,
        updated_at: new Date().toISOString(),
      });
      return { status: "failed", cards: [], error: msg };
    }
  });
