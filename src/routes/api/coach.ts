import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `You are Tentra Coach — an elite, supportive AI study coach for SQE (Solicitors Qualifying Examination) candidates.

Personality:
- Like a personal trainer for studying: warm, motivating, high-performance, never preachy.
- Friendly, modern, Gen Z professional tone. Use the user's name when known.
- Concise by default. Use short paragraphs, bold key terms, and bullet lists.
- When asked to explain, use simple analogies first, then the precise legal framing.

Capabilities:
- Explain legal concepts (land law, trusts, contract, tort, equity, criminal, ethics, dispute resolution, business law) clearly.
- Generate quizzes (MCQs with 4 options, indicate correct answer + 1-line explanation).
- Build adaptive crash/study plans with day-by-day blocks.
- Diagnose weak topics from user-described mock results.
- Provide motivation, accountability nudges, burnout-aware advice, and "rescue plans" before exams.
- Estimate exam readiness % when context allows; otherwise ask for inputs (mock scores, topics covered, days left).

Rules:
- Never invent specific case citations or statute numbers you aren't confident about. If unsure, say so.
- This is study guidance, not legal advice.
- Always end longer answers with a single follow-up suggestion or quick-action question.`;

export const Route = createFileRoute("/api/coach")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const SUPABASE_URL = process.env.SUPABASE_URL;
          const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;

          if (!LOVABLE_API_KEY) {
            return new Response(JSON.stringify({ error: "AI not configured" }), { status: 500 });
          }

          const authHeader = request.headers.get("authorization") || "";
          if (!authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
          }
          const token = authHeader.replace("Bearer ", "");

          let userContext = "";
          if (SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
              global: { headers: { Authorization: `Bearer ${token}` } },
              auth: { persistSession: false, autoRefreshToken: false },
            });
            const { data: claims } = await supabase.auth.getClaims(token);
            if (claims?.claims?.sub) {
              const userId = claims.claims.sub as string;
              const { data: profile } = await supabase
                .from("profiles")
                .select("first_name, display_name, is_pro")
                .eq("user_id", userId)
                .maybeSingle();
              const { data: plan } = await supabase
                .from("user_plans")
                .select("plan")
                .eq("user_id", userId)
                .maybeSingle();
              const name = profile?.first_name || profile?.display_name || "there";
              userContext = `\n\nUser context:\n- Name: ${name}\n- Pro member: ${profile?.is_pro ? "yes" : "no"}`;
              if (plan?.plan) {
                userContext += `\n- Plan summary: ${JSON.stringify(plan.plan).slice(0, 800)}`;
              }
            }
          }

          const body = await request.json().catch(() => ({}));
          const messages = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];

          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              stream: true,
              messages: [
                { role: "system", content: SYSTEM_PROMPT + userContext },
                ...messages,
              ],
            }),
          });

          if (!aiRes.ok) {
            if (aiRes.status === 429) {
              return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429 });
            }
            if (aiRes.status === 402) {
              return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Workspace settings." }), { status: 402 });
            }
            const t = await aiRes.text();
            console.error("AI gateway error", aiRes.status, t);
            return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500 });
          }

          return new Response(aiRes.body, {
            headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
          });
        } catch (e) {
          console.error("coach error", e);
          return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500 });
        }
      },
    },
  },
});
