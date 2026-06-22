import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Early Access: Pro is free. This server function grants Pro to the
// authenticated user via the service-role client (the DB trigger blocks
// any client-side mutation of is_pro / pro_since).
export const activateEarlyAccessPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ is_pro: true, pro_since: new Date().toISOString() })
      .eq("user_id", userId)
      .select("is_pro, pro_since")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isPro: !!data?.is_pro, proSince: data?.pro_since ?? null };
  });
