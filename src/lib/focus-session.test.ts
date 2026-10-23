import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { elapsedMs, loadSession, pauseSession, startSession, type StartSessionInput } from "./focus-session";

const task: StartSessionInput = {
  minutes: 120, title: "Contract law", module: "Contracts", origin: "today",
  planned: { taskId: "task-a", planId: "plan-a", scheduleVersion: 1 },
};
const options = { replace: true, preserveSameTask: true };

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T08:00:00Z"));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("reopening Today task timers", () => {
  it("keeps the same 120-minute session and its elapsed time", () => {
    const first = startSession(task, options).session;
    vi.advanceTimersByTime(10 * 60_000);
    const reopened = startSession(task, options);
    expect(reopened.started).toBe(false);
    expect(reopened.session).toEqual(first);
    expect(elapsedMs(reopened.session)).toBe(10 * 60_000);
    expect(loadSession()).toEqual(first);
  });
  it("preserves a paused task and its accumulated pause time", () => {
    const first = startSession(task, options).session;
    vi.advanceTimersByTime(5 * 60_000);
    const paused = pauseSession({ ...first, pausedTotalMs: 60_000 });
    vi.advanceTimersByTime(2 * 60_000);
    expect(startSession(task, options).session).toEqual(paused);
    expect(elapsedMs(paused)).toBe(4 * 60_000);
  });
  it("replaces a 15-minute quick sprint with the selected 120-minute task", () => {
    const quick = startSession({ minutes: 15, title: task.title, origin: "focus" }).session;
    const result = startSession(task, options);
    expect(result.started).toBe(true);
    expect(result.session.sessionId).not.toBe(quick.sessionId);
    expect(result.session.plannedMs).toBe(120 * 60_000);
  });
  it("replaces a different task even when its title is identical", () => {
    startSession(task, options);
    const result = startSession({ ...task, planned: { taskId: "task-b", planId: "plan-a", scheduleVersion: 1 } }, options);
    expect(result.started).toBe(true);
    expect(result.session.planned?.taskId).toBe("task-b");
  });
  it("does not confuse identical task IDs from different plans", () => {
    startSession(task, options);
    expect(startSession({ ...task, planned: { taskId: "task-a", planId: "plan-b", scheduleVersion: 1 } }, options).started).toBe(true);
  });
  it("preserves legacy Today tasks without scheduled references", () => {
    const legacy = { ...task, planned: undefined };
    const first = startSession(legacy, options).session;
    vi.advanceTimersByTime(60_000);
    expect(startSession(legacy, options).session).toEqual(first);
  });
  it("starts fresh after the same task was logged or became stale", () => {
    const first = startSession(task, options).session;
    localStorage.setItem("tentra.session.active.v1", JSON.stringify({ ...first, loggedAt: Date.now() }));
    expect(startSession(task, options).started).toBe(true);
    vi.advanceTimersByTime(211 * 60_000);
    expect(startSession(task, options).started).toBe(true);
  });
});