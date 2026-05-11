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

export async function upgradeToPro(): Promise<ProStatus> {
  const user = await waitForAuthUser();
  if (!user) throw new Error("Not signed in");
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("profiles")
    .update({ is_pro: true, pro_since: now })
    .eq("user_id", user.id);
  if (error) throw error;
  return { isPro: true, proSince: now };
}

export async function cancelPro(): Promise<ProStatus> {
  const user = await waitForAuthUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("profiles")
    .update({ is_pro: false })
    .eq("user_id", user.id);
  if (error) throw error;
  return { isPro: false, proSince: null };
}
