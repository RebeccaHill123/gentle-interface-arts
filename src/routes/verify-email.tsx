import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Loader2, Mail } from "lucide-react";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailPage,
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Check your inbox · Tentra" },
      {
        name: "description",
        content:
          "Confirm your email address to continue building your Tentra study plan.",
      },
    ],
  }),
});

function VerifyEmailPage() {
  const { email } = Route.useSearch();
  const navigate = useNavigate();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setRedirecting(true);
      navigate({ to: "/dashboard" });
    }, 3200);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <BackgroundBlobs />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <BrandMark />
        <Link
          to="/login"
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </div>

      <div className="relative mx-auto flex max-w-md flex-col px-6 py-10">
        <div
          className="rounded-[2rem] border border-border bg-card/70 p-8 backdrop-blur md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500"
          aria-live="polite"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-center text-3xl font-normal text-foreground md:text-4xl">
            Check your{" "}
            <span className="italic text-gradient-tentra">inbox</span>
          </h1>
          {email ? (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              We've sent a confirmation link to{" "}
              <span className="font-medium text-foreground">{email}</span>.
            </p>
          ) : (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              We've sent you a confirmation link.
            </p>
          )}
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Can't see it? It may be in your{" "}
            <span className="font-medium text-foreground">junk</span> or spam
            folder.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {redirecting ? "Taking you to your plan…" : "Taking you to your plan…"}
          </div>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link
              to="/dashboard"
              className="font-medium text-foreground hover:underline"
            >
              Continue now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
