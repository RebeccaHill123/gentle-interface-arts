import { waitForAuthUser } from "@/lib/auth-session";
import { supabase } from "@/integrations/supabase/client";
import { redirect } from "@tanstack/react-router";

/**
 * Route guard for pages that require an authenticated user with active access
 * (paying subscriber or grandfathered Early Access member).
 *
 * - No user → redirect to /auth
 * - Signed in but no access → redirect to /subscribe
 */
export async function requireAccess(currentPath?: string) {
  if (typeof window === "undefined") return;
  const user = await waitForAuthUser();
  if (!user) {
    throw redirect({ to: "/auth", search: { mode: "signin" } });
  }
  const { data } = await supabase
    .from("profiles")
    .select("is_pro, grandfathered_pro, subscription_status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return; // profile still being created — let page load
  const status = data.subscription_status;
  const graceActive =
    status === "canceled" &&
    !!data.current_period_end &&
    new Date(data.current_period_end).getTime() > Date.now();
  const hasAccess =
    !!data.grandfathered_pro ||
    !!data.is_pro ||
    status === "active" ||
    status === "trialing" ||
    graceActive;
  if (!hasAccess) {
    throw redirect({
      to: "/subscribe",
      search: currentPath ? { next: currentPath } : undefined,
    });
  }
}

export async function requireAuth() {
  if (typeof window === "undefined") return;
  const user = await waitForAuthUser();
  if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
}
