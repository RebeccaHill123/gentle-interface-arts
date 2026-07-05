import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Loader2 } from "lucide-react";

type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDecision | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDecision | null; error: Error | null }>;
};
type AuthorizationDetails = {
  client?: { name?: string; client_id?: string; logo_uri?: string };
  scopes?: string[];
  redirect_url?: string;
  redirect_to?: string;
};
type AuthorizationDecision = { redirect_url?: string; redirect_to?: string };

function oauth() {
  const authAny = supabase.auth as unknown as { oauth?: OAuthNs };
  if (!authAny.oauth) throw new Error("Supabase OAuth is not available in this client.");
  return authAny.oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { mode: "signin" as const, next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      throw redirect({ href: immediate });
    }
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <p className="text-sm text-muted-foreground">
        Could not load this authorization request: {String((error as Error)?.message ?? error)}
      </p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<null | "approve" | "deny">(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an external app";

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="relative min-h-screen grid place-items-center p-6">
      <BackgroundBlobs />
      <div className="relative w-full max-w-md rounded-3xl border bg-card/70 backdrop-blur-xl p-8 shadow-glow">
        <div className="flex justify-center mb-6">
          <BrandMark />
        </div>
        <h1 className="text-xl font-semibold text-center tracking-tight">
          Connect {clientName} to your Tentra account
        </h1>
        <p className="mt-3 text-sm text-muted-foreground text-center">
          {clientName} is requesting access to act on your behalf. It will be able to read your profile, study plan and
          mock exam history, and log study sessions.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive text-center">
            {error}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => decide(true)} disabled={busy !== null} size="lg">
            {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : `Approve ${clientName}`}
          </Button>
          <Button onClick={() => decide(false)} disabled={busy !== null} variant="ghost" size="lg">
            {busy === "deny" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Deny"}
          </Button>
        </div>
      </div>
    </main>
  );
}
