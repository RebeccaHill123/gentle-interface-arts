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

// SECURITY: Pro status MUST only be granted server-side after a verified
// payment event (e.g. Stripe webhook). The database enforces this with a
// trigger that blocks any client-side mutation of `is_pro` / `pro_since`,
// so calling this from the browser will always fail.
//
// To wire payments: create a server route under `app/routes/api/public/`
// that verifies the payment provider's webhook signature, then uses
// `supabaseAdmin` (service role) to set `is_pro = true` on the user's row.
export async function upgradeToPro(): Promise<ProStatus> {
  throw new Error(
    "Pro upgrades must go through the secure payment flow. Please complete checkout to activate Pro.",
  );
}

export async function cancelPro(): Promise<ProStatus> {
  throw new Error(
    "Pro cancellation must go through the secure payment flow. Please contact support.",
  );
}
