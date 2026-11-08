import { Link } from "@tanstack/react-router";

/** Tentra monogram: a white swoosh-T on a pink → lilac → blue gradient tile. */
export function TentraMonogram({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tentra-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#F6A8D8" />
          <stop offset="0.5" stop-color="#C9A6EF" />
          <stop offset="1" stop-color="#A9C6F5" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#tentra-mark)" />
      {/* Swoosh crossbar: rounded pill whose right tip sweeps downward */}
      <path
        d="M15 23.5 C15 18.5 19 15.5 25 15.5 L45 15.5 C51 15.5 53.5 18.5 51.5 22.5 C49.5 26.5 44 28 38 28 L22 28 C17 28 15 26.5 15 23.5 Z"
        fill="#FDFBFE"
      />
      {/* Leaf stem: flat top, straight left edge, petal curve to the base */}
      <path
        d="M28 31.5 L36 31.5 C42.5 31.5 45 35 45 40 C45 47 40 51.5 33 51.5 C29.5 51.5 28 50 28 45.5 Z"
        fill="#FDFBFE"
      />
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
