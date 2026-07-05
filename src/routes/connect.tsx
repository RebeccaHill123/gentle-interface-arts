import { useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { BackgroundBlobs } from "@/components/background-blobs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Copy, Sparkles, MessageSquareText } from "lucide-react";

export const Route = createFileRoute("/connect")({
  component: ConnectPage,
  head: () => ({
    meta: [
      { title: "Use Tentra with ChatGPT — Tentra" },
      {
        name: "description",
        content:
          "Connect Tentra to ChatGPT to check your plan, log study sessions, review weak areas and generate mini tests from your actual progress.",
      },
      { property: "og:title", content: "Use Tentra with ChatGPT" },
      {
        property: "og:description",
        content:
          "Connect Tentra to ChatGPT to check your plan, log study sessions, review weak areas and generate mini tests from your actual progress.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});

const EXAMPLE_PROMPTS = [
  "What should I study today?",
  "Log 45 minutes of SQE1 Contract Law.",
  "Quiz me on my weakest area.",
  "I missed yesterday — adjust my week.",
  "How am I doing this week?",
];

function ConnectPage() {
  const [mcpUrl, setMcpUrl] = useState("https://tentraapp.com/mcp");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMcpUrl(new URL("/mcp", window.location.origin).toString());
    }
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(mcpUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="relative min-h-screen">
      <BackgroundBlobs />
      <div className="relative mx-auto max-w-3xl px-6 py-10 md:py-16">
        <div className="mb-8 flex items-center justify-between">
          <BrandMark />
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to dashboard
          </Link>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-[11.5px] text-muted-foreground backdrop-blur">
            <Sparkles className="h-3 w-3 text-primary" />
            New — agent integration
          </div>
          <h1 className="text-[1.9rem] font-medium tracking-[-0.02em] text-foreground md:text-[2.4rem]">
            Use Tentra with ChatGPT
          </h1>
          <p className="max-w-2xl text-[15px] leading-[1.6] text-muted-foreground">
            Connect Tentra to ChatGPT to check your plan, log study sessions, review weak
            areas and generate mini tests from your actual progress. Your AI Coach and AI
            Tutor stay in-app too — this just makes them available from your assistant.
          </p>
        </div>

        {/* URL card */}
        <div className="mt-8 rounded-3xl border border-border/60 bg-gradient-soft p-5 backdrop-blur md:p-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Your Tentra server URL
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-2xl border border-border/60 bg-card/70 px-4 py-3 text-[13.5px] text-foreground">
              {mcpUrl}
            </code>
            <Button
              onClick={copy}
              className="rounded-2xl px-4"
              variant="default"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy URL
                </>
              )}
            </Button>
          </div>
          <p className="mt-3 text-[12.5px] text-muted-foreground">
            You'll paste this into ChatGPT or Claude when adding Tentra as a connector.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <StepsCard
            title="Connect from ChatGPT"
            steps={[
              <>
                Open{" "}
                <a
                  href="https://chatgpt.com/#settings/Connectors/Advanced"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  ChatGPT → Settings → Connectors → Advanced
                </a>{" "}
                and enable Developer mode.
              </>,
              <>In the chat composer's "+" menu, turn on Developer mode.</>,
              <>Click "Add sources", then "Connect more".</>,
              <>Name the connector Tentra and paste the URL above.</>,
              <>Sign in with your Tentra account when prompted, then approve access.</>,
              <>Ask ChatGPT: "What should I study today?"</>,
            ]}
          />
          <StepsCard
            title="Connect from Claude"
            steps={[
              <>
                Open{" "}
                <a
                  href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Claude → Custom connectors
                </a>
                .
              </>,
              <>Name the connector Tentra and paste the URL above.</>,
              <>Sign in with your Tentra account and approve access.</>,
              <>Enable the connector from the chat composer.</>,
              <>Ask Claude: "Quiz me on my weakest area."</>,
            ]}
          />
        </div>

        {/* Example prompts */}
        <div className="mt-8 rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur md:p-6">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <MessageSquareText className="h-3.5 w-3.5" />
            Try these prompts
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {EXAMPLE_PROMPTS.map((p) => (
              <li
                key={p}
                className="rounded-2xl border border-border/50 bg-card/50 px-4 py-3 text-[13.5px] text-foreground"
              >
                "{p}"
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] text-muted-foreground">
            Tentra reads your plan, weak areas and recent sessions to answer. Anything
            that saves data (like logging a session) will ask you to confirm first.
          </p>
        </div>

        <div className="mt-10 text-center text-[12px] text-muted-foreground">
          <Link to="/dashboard" className="underline underline-offset-2">
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function StepsCard({ title, steps }: { title: string; steps: React.ReactNode[] }) {
  return (
    <div className="rounded-3xl border border-border/60 bg-card/60 p-5 backdrop-blur md:p-6">
      <h2 className="text-[1rem] font-medium tracking-[-0.01em] text-foreground">{title}</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3 text-[13.5px] leading-[1.55] text-foreground">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-border/60 bg-card text-[11px] font-medium text-muted-foreground">
              {i + 1}
            </span>
            <span className="text-foreground/90">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
