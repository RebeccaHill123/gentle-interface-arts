import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";

export interface ProStatus {
  isPro: boolean; // "has access" — grandfathered OR active subscription
  isGrandfathered: boolean;
  proSince: string | null;
}

export async function getProStatus(): Promise<ProStatus> {
  const user = await waitForAuthUser();
  if (!user)
    return { isPro: false, isGrandfathered: false, proSince: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("is_pro, grandfathered_pro, pro_since")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data)
    return { isPro: false, isGrandfathered: false, proSince: null };
  return {
    isPro: !!data.is_pro || !!data.grandfathered_pro,
    isGrandfathered: !!data.grandfathered_pro,
    proSince: data.pro_since ?? null,
  };
}
