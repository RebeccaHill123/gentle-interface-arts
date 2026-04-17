import { Link } from "@tanstack/react-router";

export function BrandMark({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-pink-blue shadow-glow transition-transform group-hover:scale-105">
        <span className="font-display text-xl font-bold text-primary-foreground">
          T
        </span>
      </span>
      {withWordmark && (
        <span className="text-lg font-bold tracking-tight text-foreground">
          Tentra
        </span>
      )}
    </Link>
  );
}
