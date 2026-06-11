import { Link } from "@tanstack/react-router";

export function BrandMark({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span
        className="relative grid h-8 w-8 place-items-center rounded-lg transition-transform group-hover:scale-[1.04]"
        style={{
          background:
            "linear-gradient(120deg, oklch(0.72 0.20 350), oklch(0.60 0.20 270))",
          boxShadow:
            "0 1px 0 0 oklch(1 0 0 / 0.25) inset, 0 6px 16px -8px oklch(0.55 0.18 320 / 0.45)",
        }}
      >
        <span className="font-display text-[15px] font-semibold tracking-[-0.02em] text-primary-foreground">
          T
        </span>
      </span>
      {withWordmark && (
        <span className="font-display text-[16px] font-medium tracking-[-0.02em] text-foreground">
          Tentra
        </span>
      )}
    </Link>
  );
}
