// Sign-out hygiene: a departing account's study state must not remain on a
// shared browser, while device preferences must survive.
import { beforeEach, describe, expect, it } from "vitest";
import { clearLocalUserData } from "./local-data-boundary";

class FakeStorage {
  map = new Map<string, string>();
  broken = false;
  getItem(k: string) {
    return this.map.has(k) ? (this.map.get(k) as string) : null;
  }
  setItem(k: string, v: string) {
    if (this.broken) throw new Error("unavailable");
    this.map.set(k, v);
  }
  removeItem(k: string) {
    if (this.broken) throw new Error("unavailable");
    this.map.delete(k);
  }
  key(i: number) {
    return Array.from(this.map.keys())[i] ?? null;
  }
  get length() {
    return this.map.size;
  }
}

let s: FakeStorage;

beforeEach(() => {
  s = new FakeStorage();
  s.map.set("tentra.plan.v1", "{}");
  s.map.set("tentra.plan.sync.v1", "{}");
  s.map.set("practice:active:v1", "{}");
  s.map.set("practice:config", "{}");
  s.map.set("tentra.focus.active.v1", "{}");
  s.map.set("tentra.fullmock.sim-1", "{}");
  s.map.set("tentra.flashcards.progress.v1", "{}");
  s.map.set("tentra.theme", "dark");
  s.map.set("tentra.focus.prefs.v1", "{}");
});

describe("clearLocalUserData", () => {
  it("removes owned study state and keeps preferences", () => {
    const r = clearLocalUserData("user-a", s);
    expect(r.ok).toBe(true);
    for (const k of [
      "tentra.plan.v1",
      "tentra.plan.sync.v1",
      "practice:active:v1",
      "practice:config",
      "tentra.focus.active.v1",
      "tentra.fullmock.sim-1",
      "tentra.flashcards.progress.v1",
    ]) {
      expect(s.getItem(k)).toBeNull();
    }
    expect(s.getItem("tentra.theme")).toBe("dark");
    expect(s.getItem("tentra.focus.prefs.v1")).toBe("{}");
  });

  it("strips only the departing owner's queued writes", () => {
    s.map.set(
      "tentra.studylog.queue.v1",
      JSON.stringify([
        { kind: "event", ownerUserId: "user-a" },
        { kind: "event", ownerUserId: "user-b" },
      ]),
    );
    clearLocalUserData("user-a", s);
    expect(JSON.parse(s.getItem("tentra.studylog.queue.v1") as string)).toEqual([
      { kind: "event", ownerUserId: "user-b" },
    ]);
  });

  it("strips only the departing owner's ledger entries", () => {
    s.map.set(
      "tentra.studylog.ledger.v1",
      JSON.stringify({
        a: { loggedAt: "1", ownerUserId: "user-a" },
        b: { loggedAt: "2", ownerUserId: "user-b" },
      }),
    );
    clearLocalUserData("user-a", s);
    expect(JSON.parse(s.getItem("tentra.studylog.ledger.v1") as string)).toEqual({
      b: { loggedAt: "2", ownerUserId: "user-b" },
    });
  });

  it("retains legacy ownerless queue items rather than destroying them", () => {
    s.map.set("tentra.studylog.queue.v1", JSON.stringify([{ kind: "event" }]));
    clearLocalUserData("user-a", s);
    expect(JSON.parse(s.getItem("tentra.studylog.queue.v1") as string)).toEqual([
      { kind: "event" },
    ]);
  });

  it("reports failure without throwing when storage is unavailable", () => {
    s.broken = true;
    expect(clearLocalUserData("user-a", s).ok).toBe(false);
  });

  it("is a no-op when there is no storage at all", () => {
    expect(clearLocalUserData("user-a", null)).toEqual({ removed: [], ok: false });
  });
});
