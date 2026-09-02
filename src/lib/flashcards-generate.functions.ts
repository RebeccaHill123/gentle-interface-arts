import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  resolveEntitlementForUser,
  type EntitlementClient,
  type EntitlementDenial,
} from "@/lib/entitlement";
import { validateDeckRequest } from "@/lib/flashcards-catalog";

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
  status: "ready" | "pending" | "failed" | "denied" | "unavailable";
  cards: GeneratedCard[];
  error?: string | null;
}

const MODEL = "google/gemini-2.5-flash";
const TARGET_CARDS = 15;
/** Another in-flight generation younger than this is treated as the owner. */
const PENDING_TTL_MS = 60_000;

interface Input {
  examKind: ExamKind;
  subject: string;
  subtopic: string;
  deckId: string;
}

function validateInput(raw: unknown): Input {
  const res = validateDeckRequest(raw);
  if (!res.ok) throw new Error(res.error);
  const { examKind, subject, subtopic, deckId } = res.value;
  return { examKind, subject, subtopic, deckId };
}

function denied(d: EntitlementDenial): FetchSubtopicResult {
  return {
    status: d.status === 503 ? "unavailable" : "denied",
    cards: [],
    error: d.message,
  };
}

type AuthContext = { supabase: unknown; userId: string };

async function checkAccess(context: AuthContext): Promise<EntitlementDenial | null> {
  const result = await resolveEntitlementForUser(
    context.supabase as EntitlementClient,
    context.userId,
  );
  return result.ok ? null : result;
}

function mapCards(
  rows: Array<{
    id: string;
    front: string;
    back: string;
    exam_tip: string | null;
    difficulty: string;
  }> | null,
  topic: string,
): GeneratedCard[] {
  return (rows ?? []).map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    exam_tip: c.exam_tip,
    difficulty: c.difficulty as "Easy" | "Medium" | "Hard",
    source: "ai" as const,
    topic,
  }));
}

/**
 * Fetch existing generated cards for a sub-topic (no generation).
 * Premium content: requires an authenticated user with active access.
 */
export const fetchSubtopicDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInput)
  .handler(async ({ data, context }): Promise<FetchSubtopicResult> => {
    const deny = await checkAccess(context as unknown as AuthContext);
    if (deny) return denied(deny);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [statusRes, cardsRes] = await Promise.all([
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

    if (statusRes.error || cardsRes.error) {
      console.error(
        "fetchSubtopicDeck read failed",
        statusRes.error ?? cardsRes.error,
      );
      return {
        status: "unavailable",
        cards: [],
        error: "Couldn't load these flashcards right now. Please try again.",
      };
    }

    const status = statusRes.data?.status as
      | "ready"
      | "pending"
      | "failed"
      | undefined;
    return {
      status: status ?? (cardsRes.data && cardsRes.data.length > 0 ? "ready" : "pending"),
      cards: mapCards(cardsRes.data, data.subtopic),
      error: statusRes.data?.last_error ? "Generation previously failed." : null,
    };
  });

/** Generate a deck for a sub-topic. Requires active access. Idempotent per (examKind, subject, subtopic). */
export const generateSubtopicDeck = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validateInput)
  .handler(async ({ data, context }): Promise<FetchSubtopicResult> => {
    const deny = await checkAccess(context as unknown as AuthContext);
    if (deny) return denied(deny);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      console.error("generateSubtopicDeck: LOVABLE_API_KEY missing");
      return {
        status: "unavailable",
        cards: [],
        error: "Flashcard generation is temporarily unavailable.",
      };
    }

    const match = {
      exam_kind: data.examKind,
      subject: data.subject,
      subtopic: data.subtopic,
    };

    const readStatus = async () =>
      supabaseAdmin
        .from("generated_deck_status")
        .select("status, updated_at")
        .eq("exam_kind", data.examKind)
        .eq("subject", data.subject)
        .eq("subtopic", data.subtopic)
        .maybeSingle();

    const readCards = async () =>
      supabaseAdmin
        .from("generated_flashcards")
        .select("id, front, back, exam_tip, difficulty")
        .eq("exam_kind", data.examKind)
        .eq("subject", data.subject)
        .eq("subtopic", data.subtopic)
        .order("created_at", { ascending: true });

    const writeStatus = async (patch: {
      status: "pending" | "ready" | "failed";
      card_count: number;
      last_error: string | null;
      updated_at: string;
    }) => {
      const { error } = await supabaseAdmin
        .from("generated_deck_status")
        .upsert({ ...match, model: MODEL, ...patch });
      if (error) console.error("generated_deck_status write failed", error);
      return !error;
    };

    const existing = await readStatus();
    if (existing.error) {
      console.error("generateSubtopicDeck status read failed", existing.error);
      return {
        status: "unavailable",
        cards: [],
        error: "Couldn't start generation right now. Please try again.",
      };
    }

    if (existing.data?.status === "ready") {
      const cards = await readCards();
      if (cards.error) {
        return {
          status: "unavailable",
          cards: [],
          error: "Couldn't load these flashcards right now. Please try again.",
        };
      }
      return { status: "ready", cards: mapCards(cards.data, data.subtopic) };
    }

    // Duplicate-generation guard: a recent pending row belongs to another
    // in-flight request. Residual limitation: two requests arriving inside the
    // same few milliseconds can both observe "no fresh pending" — the claim
    // re-read below narrows but cannot fully eliminate that distributed race
    // without a dedicated atomic claim column.
    const isFresh = (updatedAt: unknown) => {
      const t = new Date(String(updatedAt ?? "")).getTime();
      return Number.isFinite(t) && Date.now() - t < PENDING_TTL_MS;
    };
    if (existing.data?.status === "pending" && isFresh(existing.data.updated_at)) {
      return { status: "pending", cards: [] };
    }

    const claimedAt = new Date().toISOString();
    const claimed = await writeStatus({
      status: "pending",
      card_count: 0,
      last_error: null,
      updated_at: claimedAt,
    });
    if (!claimed) {
      return {
        status: "unavailable",
        cards: [],
        error: "Couldn't start generation right now. Please try again.",
      };
    }

    // Verify we still hold the claim (no newer writer took over).
    const verify = await readStatus();
    if (verify.error) {
      return {
        status: "unavailable",
        cards: [],
        error: "Couldn't start generation right now. Please try again.",
      };
    }
    if (verify.data?.status === "ready") {
      const cards = await readCards();
      if (cards.error) {
        return {
          status: "unavailable",
          cards: [],
          error: "Couldn't load these flashcards right now. Please try again.",
        };
      }
      return { status: "ready", cards: mapCards(cards.data, data.subtopic) };
    }
    const heldAt = new Date(String(verify.data?.updated_at ?? claimedAt)).getTime();
    if (Number.isFinite(heldAt) && heldAt > new Date(claimedAt).getTime()) {
      // Someone else re-claimed after us — let them generate.
      return { status: "pending", cards: [] };
    }

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

    const fail = async (internal: string, userMessage: string): Promise<FetchSubtopicResult> => {
      await writeStatus({
        status: "failed",
        card_count: 0,
        last_error: internal.slice(0, 300),
        updated_at: new Date().toISOString(),
      });
      return { status: "failed", cards: [], error: userMessage };
    };

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
        const userMessage = aiRes.status === 429
          ? "Too many requests right now. Try again in a moment."
          : "Flashcard generation is temporarily unavailable. Please try again shortly.";
        console.error("flashcard gateway error", aiRes.status, txt.slice(0, 300));
        return await fail(`gateway ${aiRes.status}`, userMessage);
      }

      const payload = await aiRes.json() as { choices?: Array<{ message?: { content?: string } }> };
      const raw = payload.choices?.[0]?.message?.content ?? "{}";
      let parsed: { cards?: Array<{ front?: string; back?: string; exam_tip?: string | null; difficulty?: string }> };
      try {
        parsed = JSON.parse(raw);
      } catch {
        const m = raw.match(/\{[\s\S]*\}/);
        parsed = m ? JSON.parse(m[0]) : { cards: [] };
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
        return await fail("Model returned no usable cards", "No cards could be generated. Please try again.");
      }

      const rows = clean.map((c) => ({
        ...match,
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

      if (insertErr || !inserted || inserted.length === 0) {
        console.error("flashcard insert failed", insertErr);
        return await fail(
          insertErr?.message ?? "insert returned no rows",
          "Couldn't save the generated flashcards. Please try again.",
        );
      }

      const marked = await writeStatus({
        status: "ready",
        card_count: inserted.length,
        last_error: null,
        updated_at: new Date().toISOString(),
      });
      if (!marked) {
        // The cards exist, but the readiness marker did not persist. Report the
        // cards we actually have rather than claiming a clean success.
        return {
          status: "ready",
          cards: mapCards(inserted, data.subtopic),
          error: "Saved, but this deck may regenerate on next visit.",
        };
      }

      return { status: "ready", cards: mapCards(inserted, data.subtopic) };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("flashcard generation error", msg);
      return await fail(msg, "Flashcard generation failed. Please try again.");
    }
  });
