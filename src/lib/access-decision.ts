// Pure browser-guard decision, so browser and server semantics cannot drift.
//
// A transient profile-read failure is NOT evidence that someone is unsubscribed:
// it must fail closed to a friendly "unavailable" screen, never to /subscribe.

import { profileHasAccess, type ProfileAccessFields } from "@/lib/provisioning";

export type AccessDecision = "allow" | "subscribe" | "unavailable";

export function decideBrowserAccess(
  input: { readError: boolean; profile: ProfileAccessFields | null | undefined },
  now: number = Date.now(),
): AccessDecision {
  if (input.readError) return "unavailable";
  if (!input.profile) return "subscribe";
  return profileHasAccess(input.profile, now) ? "allow" : "subscribe";
}

/** Only same-origin absolute paths may be carried through a redirect. */
export function safeNextPath(path: string | null | undefined): string | undefined {
  if (typeof path !== "string") return undefined;
  const trimmed = path.trim();
  if (!trimmed.startsWith("/")) return undefined;
  if (trimmed.startsWith("//")) return undefined;
  if (trimmed.includes("\\")) return undefined;
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(trimmed)) return undefined;
  return trimmed.slice(0, 300);
}
