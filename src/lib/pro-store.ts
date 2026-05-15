import { supabase } from "@/integrations/supabase/client";
import { waitForAuthUser } from "@/lib/auth-session";

export interface ProStatus {
  isPro: boolean;
  proSince: string | null;
}

export async function getProStatus(): Promise<ProStatus> {
  const user = await waitForAuthUser();
  if (!user) return { isPro: false, proSince: null };
  const { data, error } = await supabase
    .from("profiles")
    .select("is_pro, pro_since")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !data) return { isPro: false, proSince: null };
  return { isPro: !!data.is_pro, proSince: data.pro_since ?? null };
}

// Early Access flag — Pro is free. When this flips to false, swap the
// upgrade flow back to the secure payment route under `/api/public/`.
export const PRO_EARLY_ACCESS_FREE = true;

import { activateEarlyAccessPro } from "@/lib/pro.functions";

export async function upgradeToPro(): Promise<ProStatus> {
  if (!PRO_EARLY_ACCESS_FREE) {
    throw new Error(
      "Pro upgrades require checkout. Please complete payment to activate Pro.",
    );
  }
  const result = await activateEarlyAccessPro();
  return { isPro: result.isPro, proSince: result.proSince };
}

export async function cancelPro(): Promise<ProStatus> {
  // No-op during Early Access — Pro is free, nothing to cancel.
  return { isPro: true, proSince: null };
}
