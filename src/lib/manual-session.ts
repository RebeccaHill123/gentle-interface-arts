// Controller for the dashboard "Record session" dialog.
//
// Extracted so the acceptance rules are deterministically testable without
// rendering the dashboard: nothing is claimed as logged unless the canonical
// write was accepted (server-confirmed or durably queued), and a double submit
// can only produce one write.
import type { WriteResult } from "@/lib/study-log";

export interface ManualSessionInput {
  minutes: string;
  moduleName: string;
  note: string;
}

export type ManualSessionOutcome =
  | { status: "invalid"; message: string }
  | { status: "busy" }
  | { status: "error"; message: string }
  | { status: "accepted"; queued: boolean; message: string };

export interface ManualSessionDeps {
  /** Immediate (synchronous) lock so two rapid submits cannot both enter. */
  lock: { current: boolean };
  record: (input: {
    minutes: number;
    moduleName: string;
    note: string;
  }) => Promise<WriteResult>;
}

export async function submitManualSession(
  input: ManualSessionInput,
  deps: ManualSessionDeps,
): Promise<ManualSessionOutcome> {
  const minutes = parseInt(input.minutes, 10);
  if (!minutes || minutes <= 0) {
    return { status: "invalid", message: "Add a number of minutes" };
  }
  if (deps.lock.current) return { status: "busy" };
  deps.lock.current = true;
  try {
    const moduleName = input.moduleName.trim();
    const note = input.note.trim();
    const res = await deps.record({ minutes, moduleName, note });
    // A durably queued write IS accepted: the session is on this device and
    // will sync. Only a write that persisted nowhere is an error — otherwise
    // the user retries and double-records the same session.
    if (!res.ok && !res.queued) {
      return {
        status: "error",
        message: res.error ?? "We couldn't save that session. Try again.",
      };
    }
    const subject = moduleName ? ` of ${moduleName}` : "";
    return {
      status: "accepted",
      queued: res.queued,
      message: res.queued
        ? `Logged ${minutes} minutes${subject} — saved on this device, syncing.`
        : `Logged ${minutes} minutes${subject}`,
    };
  } catch (e) {
    return {
      status: "error",
      message: e instanceof Error ? e.message : "We couldn't save that session. Try again.",
    };
  } finally {
    deps.lock.current = false;
  }
}
