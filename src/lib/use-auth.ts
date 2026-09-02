import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { forgetAuthOwner, getCachedAuthOwnerId, rememberAuthOwner } from "@/lib/auth-session";
import { clearLocalUserData } from "@/lib/local-data-boundary";
import { clearOnboardingDraft } from "@/lib/plan-store";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Set up listener FIRST
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      // Bind the owner synchronously so offline study/plan writes can be
      // attributed to this account, never to whoever signs in next.
      if (session?.user) rememberAuthOwner(session.user.id);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Then check for existing session
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session?.user) rememberAuthOwner(data.session.user.id);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, isAuthenticated: !!user };
}

export async function signOut() {
  // Capture the departing owner while the session is still known.
  const owner = getCachedAuthOwnerId();
  const { error } = await supabase.auth.signOut();
  // A failed sign-out leaves the user signed in: touch nothing.
  if (error) throw error;
  // Best-effort, allowlisted cleanup so the next account on this browser never
  // sees — or re-uploads — the previous user's study state.
  clearLocalUserData(owner, typeof window === "undefined" ? null : window.localStorage);
  forgetAuthOwner();
  clearOnboardingDraft();
}
