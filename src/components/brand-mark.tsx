import { Link } from "@tanstack/react-router";

/** Provisional Tentra monogram: a geometric T with a sunset-pink horizon line. */
export function TentraMonogram({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="var(--ink)" />
      <rect x="16" y="18" width="32" height="5" fill="var(--ivory)" />
      <rect x="29.5" y="23" width="5" height="25" fill="var(--ivory)" />
      <rect x="16" y="50" width="32" height="2" fill="var(--sunset)" />
    </svg>
  );
}

export function BrandMark({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link to="/" aria-label="Tentra home" className="group flex items-center gap-2.5">
      <TentraMonogram className="h-8 w-8 rounded-[10px] ring-1 ring-border transition-transform group-hover:scale-[1.04]" />
      {withWordmark && (
        <span className="wordmark text-[13px] font-normal text-foreground">Tentra</span>
      )}
    </Link>
  );
}
