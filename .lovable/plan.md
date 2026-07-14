## Goal

Massively expand flashcard coverage across every SQE and UBE sub-topic in `topic-map.ts` (~150+ sub-topics) without hand-authoring thousands of cards, and without touching proprietary content.

Approach: **hybrid**. Keep the existing hand-written cards as a permanent seed set, and generate additional cards on-demand per sub-topic via Lovable AI, cached in the database so each sub-topic is only ever generated once (per difficulty band).

## What changes for the user

- Every sub-topic row in Topic Map has real flashcards.
- Opening a sub-topic deck that has no cards yet shows a short "Generating your deck…" state (5–10s), then reveals ~15 cards. Next visit is instant.
- Existing decks (FLK1/FLK2/MBE/MEE/MPT browser) keep working exactly as today; the seed cards still show first, generated cards blend in.
- A small "AI-generated" badge on cards produced by the model, so users can tell them apart from Tentra-authored ones.

## Technical plan

### 1. Database (migration)

New table `public.generated_flashcards`:

```
id uuid pk
exam_kind text          -- 'SQE' | 'UBE'
subject text            -- matches topic-map subject label
subtopic text           -- matches topic-map sub-topic label
deck_id text            -- existing deck id (e.g. 'contract', 'mbe-contracts') for browser integration
front text
back text
exam_tip text null
difficulty text         -- 'Easy' | 'Medium' | 'Hard'
source text             -- 'ai' (future-proof for 'editorial')
model text              -- e.g. 'google/gemini-2.5-flash'
created_at timestamptz default now()
```

Plus a `generated_deck_status` table keyed by `(exam_kind, subject, subtopic)` tracking `status ('pending'|'ready'|'failed')`, `card_count`, `last_error`, `updated_at` — so the UI can poll and we don't double-generate.

GRANTs: `SELECT` to `authenticated` and `anon` (cards are non-sensitive study content); `ALL` to `service_role`. RLS on, public read policy, writes only via service role (server functions).

### 2. Server function: `generateSubtopicDeck`

`src/lib/flashcards-generate.functions.ts` — `createServerFn` (auth-gated via `requireSupabaseAuth` so only signed-in users can trigger generation and burn credits).

- Input: `{ examKind, subject, subtopic }`.
- Checks `generated_deck_status`; if `ready`, returns immediately.
- If `pending` and recent (<60s), returns pending.
- Otherwise marks `pending`, calls Lovable AI (`google/gemini-2.5-flash`) with a strict system prompt: "You are drafting SQE/UBE revision flashcards from primary sources (statute, case law, official specifications). Produce 15 cards covering the sub-topic {X} of {subject}. Mix of Easy/Medium/Hard. Each card: front (question ≤120 chars), back (answer ≤400 chars), optional exam_tip (≤180 chars). No proprietary content."
- Uses AI SDK `generateText` with `Output.object` (Zod schema, no `.min/.max` per SDK guidance — clamp in code).
- Inserts rows via `supabaseAdmin` (loaded inside the handler), updates status to `ready`, returns cards.
- Errors → status `failed`, surfaces message to UI.

### 3. Read path

`src/lib/flashcards-data.ts` currently exports `getCardsFor`, `getDeckFor` etc. from static arrays. Add a new async fetcher `fetchSubtopicCards({ examKind, subject, subtopic })` used by the topic-deep-link mode in `flashcards.tsx`:

- Query Supabase for existing generated cards + merge with any matching static seed cards filtered by subtopic string.
- If zero cards, call `generateSubtopicDeck` and re-query.

The existing deck browser (`getDecksFor`, `getCardsByDeckFor`) is extended to union static seed cards with generated cards for that deck.

### 4. UI changes (`src/routes/flashcards.tsx`)

- Topic mode (`kind: 'topic'`) switches from synchronous `useMemo` filter to a `useQuery` that calls `fetchSubtopicCards`.
- Loading skeleton with "Preparing your deck — this takes a few seconds the first time" copy.
- "AI-generated" chip on cards where `source === 'ai'`.
- Empty/error states with retry.

### 5. Seed set stays

`flashcards-data.ts` and `flashcards-data-ube.ts` remain the day-one baseline (currently ~260 cards). No content removed. Over time these act as style exemplars and guaranteed-quality fallbacks.

### 6. Guardrails

- Rate limit: only one generation per `(subject, subtopic)` per 60s (status table).
- Credit safety: server fn is auth-gated; anonymous users see seed cards only.
- Content safety: system prompt forbids copying from named commercial providers; requires citations to statute/case names where relevant.
- 402 / 429 from AI Gateway surfaced as a user-visible toast ("AI generation temporarily unavailable — showing seed cards").

## Out of scope for this change

- Spaced repetition scheduling changes.
- Bulk pre-generation of every sub-topic (deferred — on-demand is cheaper and only generates what users actually study).
- Editorial review workflow (future).

## Files touched

- new: migration for `generated_flashcards` + `generated_deck_status` (+ GRANTs + RLS + policies)
- new: `src/lib/flashcards-generate.functions.ts`
- edit: `src/lib/flashcards-data.ts` (add async fetchers, keep static exports)
- edit: `src/routes/flashcards.tsx` (async topic mode + loading/AI-badge UI)
