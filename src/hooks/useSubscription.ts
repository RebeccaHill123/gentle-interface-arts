import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";

export interface SubscriptionState {
  loading: boolean;
  hasAccess: boolean;
  isGrandfathered: boolean;
  isSubscriber: boolean;
  plan: "founding_monthly" | "pro_monthly" | "pro_six_month" | null;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const INITIAL: SubscriptionState = {
  loading: true,
  hasAccess: false,
  isGrandfathered: false,
  isSubscriber: false,
  plan: null,
  status: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
};

function computeFromRow(row: any): SubscriptionState {
  const status = (row?.subscription_status as string | null) ?? null;
  const periodEnd = (row?.current_period_end as string | null) ?? null;
  const isSubscriber =
    status === "active" ||
    status === "trialing" ||
    (status === "canceled" &&
      !!periodEnd &&
      new Date(periodEnd).getTime() > Date.now());
  return {
    loading: false,
    hasAccess: !!row?.grandfathered_pro || !!row?.is_pro || isSubscriber,
    isGrandfathered: !!row?.grandfathered_pro,
    isSubscriber,
    plan: (row?.stripe_price_id as SubscriptionState["plan"]) ?? null,
    status,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: !!row?.cancel_at_period_end,
  };
}

export function useSubscription(): SubscriptionState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<SubscriptionState>(INITIAL);

  const load = useCallback(async () => {
    const user = await waitForAuthUser();
    if (!user) {
      setState({ ...INITIAL, loading: false });
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select(
        "is_pro, grandfathered_pro, stripe_price_id, subscription_status, current_period_end, cancel_at_period_end",
      )
      .eq("user_id", user.id)
      .maybeSingle();
    setState(computeFromRow(data));
  }, []);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      await load();
      const user = await waitForAuthUser();
      if (!user || !mounted) return;
      channel = supabase
        .channel(`profile:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (!mounted) return;
            setState(computeFromRow(payload.new));
          },
        )
        .subscribe();
    })();
    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [load]);

  return { ...state, refresh: load };
}

/** Server-authoritative recheck. Polls until access is granted or timeout. */
export async function waitForAccess(timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const user = await waitForAuthUser();
    if (!user) return false;
    const { data } = await supabase
      .from("profiles")
      .select("is_pro, grandfathered_pro, subscription_status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    const s = computeFromRow(data);
    if (s.hasAccess) return true;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}
