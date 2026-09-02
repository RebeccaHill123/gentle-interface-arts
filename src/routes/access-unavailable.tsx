import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { safeNextPath } from "@/lib/access-decision";

export const Route = createFileRoute("/access-unavailable")({
  validateSearch: (search: Record<string, unknown>): { next?: string } => {
    const next = safeNextPath(
      typeof search.next === "string" ? search.next : undefined,
    );
    return next ? { next } : {};
  },
  component: AccessUnavailablePage,
  head: () => ({
    meta: [
      { title: "We couldn't confirm your access — Tentra" },
      {
        name: "description",
        content:
          "Tentra couldn't confirm your subscription status right now. Retry in a moment or head back to your account.",
      },
      { property: "og:title", content: "We couldn't confirm your access — Tentra" },
      {
        property: "og:description",
        content:
          "A temporary issue stopped Tentra confirming your subscription. Retry in a moment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function AccessUnavailablePage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [retrying, setRetrying] = useState(false);

  const retry = () => {
    setRetrying(true);
    const target = safeNextPath(next) ?? "/dashboard";
    // Full reload so the route guard re-runs from a clean state.
    window.location.assign(target);
  };

  return (
    <AppShell>
      <div className="mx-auto flex max-w-lg flex-col items-center px-5 py-16 text-center">
        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-card">
          <AlertTriangle className="h-5 w-5 text-foreground/70" aria-hidden />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          We couldn't confirm your access
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This is a temporary issue on our side — not a problem with your
          subscription. Nothing has changed on your account. Please try again in a
          moment.
        </p>
        <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={retry} disabled={retrying} className="gap-2">
            {retrying ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-4 w-4" aria-hidden />
            )}
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/settings" })}
          >
            Back to account
          </Button>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Still stuck? Email{" "}
          <a
            className="underline underline-offset-4"
            href="mailto:support@tentraapp.com"
          >
            support@tentraapp.com
          </a>{" "}
          and we'll sort it. Or return to the{" "}
          <Link to="/" className="underline underline-offset-4">
            homepage
          </Link>
          .
        </p>
      </div>
    </AppShell>
  );
}
