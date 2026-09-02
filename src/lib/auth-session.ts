import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AUTH_CALLBACK_COMPLETE_KEY = "tentra.auth.callback.completedAt";
/**
 * Last authenticated user id observed in this browser. Local, offline-capable
 * writes (plan sync marker, study-log queue) must bind an owner synchronously,
 * so ownership can never be inferred from "whoever signs in next".
 */
export const AUTH_OWNER_KEY = "tentra.auth.owner.v1";

let cachedOwnerId: string | null = null;

export function rememberAuthOwner(userId: string | null) {
  cachedOwnerId = userId;
  if (typeof window === "undefined") return;
  try {
    if (userId) window.localStorage.setItem(AUTH_OWNER_KEY, userId);
    else window.localStorage.removeItem(AUTH_OWNER_KEY);
  } catch {
    /* storage unavailable: in-memory owner still applies for this tab */
  }
}

/** Synchronous best-effort owner for offline-durable local writes. */
export function getCachedAuthOwnerId(): string | null {
  if (cachedOwnerId) return cachedOwnerId;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(AUTH_OWNER_KEY) || null;
  } catch {
    return null;
  }
}

export function forgetAuthOwner() {
  rememberAuthOwner(null);
}

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export function markAuthCallbackComplete() {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(AUTH_CALLBACK_COMPLETE_KEY, String(Date.now()));
}

export function hasRecentAuthCallback(maxAgeMs = 30_000) {
  if (typeof window === "undefined") return false;
  const raw = window.sessionStorage.getItem(AUTH_CALLBACK_COMPLETE_KEY);
  const completedAt = raw ? Number(raw) : 0;
  return Number.isFinite(completedAt) && Date.now() - completedAt < maxAgeMs;
}

export async function waitForAuthSession({
  timeoutMs = 8_000,
  intervalMs = 150,
}: {
  timeoutMs?: number;
  intervalMs?: number;
} = {}): Promise<Session | null> {
  if (typeof window === "undefined") return null;

  const deadline = Date.now() + timeoutMs;
  while (true) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      rememberAuthOwner(data.session.user.id);
      return data.session;
    }
    if (Date.now() >= deadline) return null;
    await delay(intervalMs);
  }
}

export async function waitForAuthUser(options?: {
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<User | null> {
  const session = await waitForAuthSession(options);
  return session?.user ?? null;
}