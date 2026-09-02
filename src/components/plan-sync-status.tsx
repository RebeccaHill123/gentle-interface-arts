// Honest, minimal sync status: shown only while a plan change is stored on
// this device but not yet confirmed by the server.
import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { isPlanSyncPending, retryPlanSync } from "@/lib/plan-store";

export function PlanSyncStatus() {
  const [pending, setPending] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const read = () => setPending(isPlanSyncPending());
    read();
    const id = window.setInterval(read, 4000);
    const onOnline = () => {
      void retryPlanSync().finally(read);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onOnline();
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (!pending) return null;

  const retry = async () => {
    setRetrying(true);
    try {
      await retryPlanSync();
    } finally {
      setPending(isPlanSyncPending());
      setRetrying(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        <CloudOff className="h-3.5 w-3.5" />
        Saved on this device — syncing to your account.
      </span>
      <button
        type="button"
        onClick={() => void retry()}
        disabled={retrying}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 font-medium text-foreground transition-colors hover:bg-background disabled:opacity-60"
      >
        <RefreshCw className={`h-3 w-3 ${retrying ? "animate-spin" : ""}`} />
        {retrying ? "Syncing" : "Retry now"}
      </button>
    </div>
  );
}
