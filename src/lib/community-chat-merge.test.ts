import { describe, expect, it } from "vitest";
import { mergeMessages, type ChatMsg } from "./community-chat-merge";

const m = (id: string, t: string): ChatMsg => ({ id, user_id: "u", display_name: "A", body: id, created_at: `2026-11-18T10:${t}:00Z` });

describe("mergeMessages", () => {
  it("dedupes an own send that also arrives via realtime", () => {
    expect(mergeMessages([m("a", "01")], [m("a", "01")], new Set()).map((x) => x.id)).toEqual(["a"]);
  });
  it("orders by time regardless of arrival order", () => {
    expect(mergeMessages([m("b", "05")], [m("a", "01")], new Set()).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("never resurrects a deleted message", () => {
    expect(mergeMessages([], [m("a", "01")], new Set(["a"]))).toEqual([]);
  });
  it("snapshot drops rows deleted while offline but keeps newer realtime rows", () => {
    const out = mergeMessages([m("gone", "02"), m("new", "09")], [m("a", "01"), m("b", "05")], new Set(), true);
    expect(out.map((x) => x.id)).toEqual(["a", "b", "new"]);
  });
});
