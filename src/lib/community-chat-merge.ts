export type ChatMsg = { id: string; user_id: string; display_name: string; body: string; created_at: string };

/**
 * Deterministically merge chat messages from the initial fetch, realtime events
 * and own sends: dedupe by id, drop deleted ids, sort by (created_at, id).
 * With `snapshot`, `incoming` is an authoritative server page: existing rows
 * older than its newest row are dropped unless present in it (deleted while offline).
 */
export function mergeMessages(prev: ChatMsg[], incoming: ChatMsg[], deleted: Set<string>, snapshot = false, max = 200): ChatMsg[] {
  const byId = new Map<string, ChatMsg>();
  let keep = prev;
  if (snapshot && incoming.length) {
    const ids = new Set(incoming.map((m) => m.id));
    const newest = incoming.reduce((a, m) => (m.created_at > a ? m.created_at : a), "");
    keep = prev.filter((m) => ids.has(m.id) || m.created_at > newest);
  } else if (snapshot) {
    keep = [];
  }
  for (const m of [...keep, ...incoming]) if (!deleted.has(m.id)) byId.set(m.id, m);
  const out = [...byId.values()].sort((a, b) =>
    a.created_at === b.created_at ? (a.id < b.id ? -1 : 1) : a.created_at < b.created_at ? -1 : 1,
  );
  return out.slice(-max);
}
