// Canonical, shared resolution + validation for AI flashcard deck requests.
//
// The generated-flashcard endpoints spend workspace AI credits, so they must not
// accept arbitrary prompt text as "subject"/"subtopic". Requests are validated
// against the authoritative syllabus and the deck catalog, and the deckId is
// re-derived server-side so a client cannot claim a mismatched combination.

import {
  getDecksFor,
  type CardArea,
  type ExamKind,
} from "@/lib/flashcards-data";
import { SYLLABUSES, type ExamId } from "@/lib/topic-map";

export const MAX_FIELD_CHARS = 120;

export function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function syllabusIdFor(kind: ExamKind): ExamId {
  return kind === "UBE" ? "UBE" : "SQE1";
}

/** Canonical deck id/area for a subject — the single source of truth. */
export function resolveTopicDeck(
  kind: ExamKind,
  subject: string,
): { id: string; area: CardArea } {
  const decks = getDecksFor(kind);
  const want = normalizeName(subject);
  const match = decks.find((d) => {
    const n = normalizeName(d.subject);
    const t = normalizeName(d.title);
    return (
      n === want ||
      n.includes(want) ||
      want.includes(n) ||
      t.includes(want) ||
      want.includes(t)
    );
  });
  if (match) return { id: match.id, area: match.flk };
  const fallbackArea: CardArea = kind === "UBE" ? "MBE" : "FLK1";
  return { id: `topic-${want.replace(/\s+/g, "-")}`, area: fallbackArea };
}

type SyllabusEntry = { subject: string; subtopic: string };

let cache: Partial<Record<ExamId, SyllabusEntry[]>> = {};

function entriesFor(examId: ExamId): SyllabusEntry[] {
  const cached = cache[examId];
  if (cached) return cached;
  const out: SyllabusEntry[] = [];
  for (const component of SYLLABUSES[examId].components) {
    for (const subject of component.subjects) {
      for (const chapter of subject.chapters) {
        for (const st of chapter.subTopics) {
          out.push({
            subject: normalizeName(subject.name),
            subtopic: normalizeName(st.name),
          });
          if (subject.shortName) {
            out.push({
              subject: normalizeName(subject.shortName),
              subtopic: normalizeName(st.name),
            });
          }
        }
      }
    }
  }
  cache = { ...cache, [examId]: out };
  return out;
}

export type DeckRequest = {
  examKind: ExamKind;
  subject: string;
  subtopic: string;
  deckId: string;
};

export type DeckRequestResult =
  | { ok: true; value: DeckRequest & { area: CardArea } }
  | { ok: false; error: string };

/**
 * Validates raw input, checks the (subject, subtopic) pair exists in the
 * authoritative syllabus for the exam, and requires the client's deckId to
 * equal the canonical deck id derived from that subject.
 */
export function validateDeckRequest(raw: unknown): DeckRequestResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid input" };
  const r = raw as Record<string, unknown>;
  const examKind = r["examKind"];
  if (examKind !== "SQE" && examKind !== "UBE") {
    return { ok: false, error: "Invalid examKind" };
  }
  const readField = (key: string): string | null => {
    const v = r[key];
    if (typeof v !== "string") return null;
    const t = v.trim();
    if (!t || t.length > MAX_FIELD_CHARS) return null;
    return t;
  };
  const subject = readField("subject");
  const subtopic = readField("subtopic");
  const deckId = readField("deckId");
  if (!subject || !subtopic || !deckId) {
    return { ok: false, error: "Invalid subject/subtopic/deckId" };
  }

  const examId = syllabusIdFor(examKind);
  const wantSubject = normalizeName(subject);
  const wantSubtopic = normalizeName(subtopic);
  const known = entriesFor(examId).some(
    (e) => e.subject === wantSubject && e.subtopic === wantSubtopic,
  );
  if (!known) {
    return { ok: false, error: "Unknown subject or sub-topic for this exam" };
  }

  const canonical = resolveTopicDeck(examKind, subject);
  if (canonical.id !== deckId) {
    return { ok: false, error: "Deck does not match subject" };
  }
  return {
    ok: true,
    value: { examKind, subject, subtopic, deckId: canonical.id, area: canonical.area },
  };
}
