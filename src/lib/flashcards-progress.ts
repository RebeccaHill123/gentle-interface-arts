// Local progress store for flashcards. Keyed per-card so it can later be
// migrated to a Supabase `user_flashcard_progress` table.

export type CardStatus = "new" | "got_it" | "needs_review";

export interface CardProgress {
  status: CardStatus;
  starred: boolean;
  reviewCount: number;
  lastReviewedAt: number | null;
}

const KEY = "tentra.flashcards.progress.v1";

type Store = Record<string, CardProgress>;

const empty = (): CardProgress => ({
  status: "new",
  starred: false,
  reviewCount: 0,
  lastReviewedAt: null,
});

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
    window.dispatchEvent(new Event("tentra:flashcards-updated"));
  } catch {
    /* ignore */
  }
}

export function getProgress(cardId: string): CardProgress {
  const store = read();
  return store[cardId] ?? empty();
}

export function getAllProgress(): Store {
  return read();
}

export function updateProgress(
  cardId: string,
  patch: Partial<CardProgress>,
) {
  const store = read();
  const current = store[cardId] ?? empty();
  store[cardId] = { ...current, ...patch };
  write(store);
}

export function markCard(cardId: string, status: CardStatus) {
  const store = read();
  const current = store[cardId] ?? empty();
  store[cardId] = {
    ...current,
    status,
    reviewCount: current.reviewCount + 1,
    lastReviewedAt: Date.now(),
  };
  write(store);
}

export function toggleStar(cardId: string) {
  const store = read();
  const current = store[cardId] ?? empty();
  store[cardId] = { ...current, starred: !current.starred };
  write(store);
}

export function resetDeckProgress(cardIds: string[]) {
  const store = read();
  for (const id of cardIds) delete store[id];
  write(store);
}
