import { describe, expect, it, vi } from "vitest";
import { submitManualSession } from "./manual-session";
import type { WriteResult } from "./study-log";

const ok: WriteResult = { ok: true, queued: false };
// Shape actually produced by recordStudyActivity when the canonical write
// failed but the event was durably enqueued on this device.
const queued: WriteResult = {
  ok: false,
  queued: true,
  error: "Saved on this device; will sync.",
};
const failed: WriteResult = {
  ok: false,
  queued: false,
  error: "We couldn't save this to your account or this device. Try again.",
};

function deps(result: WriteResult | (() => Promise<WriteResult>)) {
  const record = vi.fn(async () =>
    typeof result === "function" ? await result() : result,
  );
  return { lock: { current: false }, record };
}

describe("submitManualSession", () => {
  it("rejects a non-positive duration without writing", async () => {
    const d = deps(ok);
    const out = await submitManualSession({ minutes: "0", moduleName: "", note: "" }, d);
    expect(out).toEqual({ status: "invalid", message: "Add a number of minutes" });
    expect(d.record).not.toHaveBeenCalled();
  });

  it("reports the returned error on hard failure", async () => {
    const d = deps(failed);
    const out = await submitManualSession({ minutes: "30", moduleName: "Trusts", note: "" }, d);
    expect(out).toEqual({ status: "error", message: failed.error });
  });

  it("treats a queued write as accepted with honest syncing copy", async () => {
    const out = await submitManualSession({ minutes: "45", moduleName: "Trusts", note: "" }, deps(queued));
    expect(out.status).toBe("accepted");
    if (out.status === "accepted") {
      expect(out.queued).toBe(true);
      expect(out.message).toContain("saved on this device, syncing");
    }
  });

  it("confirms a server-accepted write", async () => {
    const out = await submitManualSession({ minutes: "45", moduleName: "Trusts", note: " x " }, deps(ok));
    expect(out).toEqual({
      status: "accepted",
      queued: false,
      message: "Logged 45 minutes of Trusts",
    });
  });

  it("double submission makes exactly one call", async () => {
    let release: (() => void) | null = null;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const d = deps(async () => {
      await gate;
      return ok;
    });
    const first = submitManualSession({ minutes: "30", moduleName: "", note: "" }, d);
    const second = await submitManualSession({ minutes: "30", moduleName: "", note: "" }, d);
    expect(second).toEqual({ status: "busy" });
    release!();
    expect((await first).status).toBe("accepted");
    expect(d.record).toHaveBeenCalledTimes(1);
    expect(d.lock.current).toBe(false);
  });

  it("releases the lock after a thrown write and surfaces the message", async () => {
    const d = {
      lock: { current: false },
      record: vi.fn(async () => {
        throw new Error("boom");
      }),
    };
    const out = await submitManualSession({ minutes: "30", moduleName: "", note: "" }, d);
    expect(out).toEqual({ status: "error", message: "boom" });
    expect(d.lock.current).toBe(false);
  });
});
