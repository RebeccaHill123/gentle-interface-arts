import { Link } from "@tanstack/react-router";
import tentraT from "@/assets/tentra-t.png";

export function BrandMark({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span
        className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-lg transition-transform group-hover:scale-[1.04]"
        style={{
          background:
            "radial-gradient(120% 120% at 30% 20%, oklch(0.97 0.03 340) 0%, oklch(0.94 0.04 300) 45%, oklch(0.93 0.04 250) 100%)",
          boxShadow:
            "0 1px 0 0 oklch(1 0 0 / 0.55) inset, 0 6px 16px -10px oklch(0.55 0.18 320 / 0.45)",
        }}
      >
        <img
          src={tentraT}
          alt=""
          aria-hidden="true"
          className="h-[22px] w-[22px] object-contain"
          draggable={false}
        />
      </span>
      {withWordmark && (
        <span className="font-display text-[16px] font-medium tracking-[-0.02em] text-foreground">
          Tentra
        </span>
      )}
    </Link>
  );
}
