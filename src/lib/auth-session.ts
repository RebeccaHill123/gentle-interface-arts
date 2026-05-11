import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AUTH_CALLBACK_COMPLETE_KEY = "tentra.auth.callback.completedAt";

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
    if (data.session?.user) return data.session;
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