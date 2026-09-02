import { waitForAuthUser } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { redirect } from "@tanstack/react-router";
import { ENTITLEMENT_SELECT } from "@/lib/entitlement";
import {
  decideBrowserAccess,
  safeNextPath,
  type AccessDecision,
} from "@/lib/access-decision";
import type { ProfileAccessFields } from "@/lib/provisioning";

async function readProfile(userId: string): Promise<{
  readError: boolean;
  profile: ProfileAccessFields | null;
}> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(ENTITLEMENT_SELECT)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return { readError: true, profile: null };
    return { readError: false, profile: (data as ProfileAccessFields | null) ?? null };
  } catch {
    return { readError: true, profile: null };
  }
}

/**
 * Route guard for pages that require an authenticated user with active access
 * (paying subscriber, trialist, grace period, or grandfathered member).
 *
 * - No user → /auth
 * - Confirmed missing / inactive profile → /subscribe
 * - Profile read failure (after one bounded retry) → /access-unavailable
 *
 * This is UX only; every server surface enforces entitlement independently.
 */
export async function requireAccess(currentPath?: string) {
  if (typeof window === "undefined") return;
  const user = await waitForAuthUser();
  if (!user) {
    throw redirect({
      to: "/auth",
      search: { mode: "signin", from: undefined, next: undefined },
    });
  }

  let read = await readProfile(user.id);
  if (read.readError) {
    await new Promise((r) => setTimeout(r, 600));
    read = await readProfile(user.id);
  }

  const decision: AccessDecision = decideBrowserAccess(read);
  const next = safeNextPath(currentPath);
  if (decision === "unavailable") {
    throw redirect({ to: "/access-unavailable", search: { next } });
  }
  if (decision === "subscribe") {
    throw redirect({ to: "/subscribe", search: { next } });
  }
}


export async function requireAuth() {
  if (typeof window === "undefined") return;
  const user = await waitForAuthUser();
  if (!user)
    throw redirect({
      to: "/auth",
      search: { mode: "signin", from: undefined, next: undefined },
    });
}
