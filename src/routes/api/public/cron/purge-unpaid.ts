import { createFileRoute } from "@tanstack/react-router";

// Deletes auth users who signed up more than PURGE_AFTER_HOURS ago and never
// completed payment: no active subscription, not grandfathered, no Stripe
// subscription linked (accounts that reached checkout but failed keep their
// row so the user can retry).
//
// Called by pg_cron every 6 hours. Auth is a Bearer of the service role key,
// matching the convention used by /lovable/email/queue/process.

const PURGE_AFTER_HOURS = 72;

export const Route = createFileRoute("/api/public/cron/purge-unpaid")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!serviceKey) {
          return new Response("Service role key not configured", { status: 500 });
        }
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Unauthorized", { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length).trim();
        if (token !== serviceKey) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find profiles that qualify for purge.
        const cutoffIso = new Date(
          Date.now() - PURGE_AFTER_HOURS * 60 * 60 * 1000,
        ).toISOString();

        const { data: candidates, error: selectErr } = await supabaseAdmin
          .from("profiles")
          .select("user_id, email, created_at")
          .lt("created_at", cutoffIso)
          .eq("is_pro", false)
          .eq("grandfathered_pro", false)
          .is("stripe_subscription_id", null)
          .limit(500);

        if (selectErr) {
          return new Response(`Query failed: ${selectErr.message}`, { status: 500 });
        }

        const results: { userId: string; email: string | null; ok: boolean; error?: string }[] = [];
        for (const row of candidates ?? []) {
          const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(row.user_id);
          results.push({
            userId: row.user_id,
            email: row.email,
            ok: !delErr,
            ...(delErr ? { error: delErr.message } : {}),
          });
        }

        return Response.json({
          scanned: candidates?.length ?? 0,
          deleted: results.filter((r) => r.ok).length,
          failed: results.filter((r) => !r.ok).length,
          cutoff: cutoffIso,
        });
      },
    },
  },
});
