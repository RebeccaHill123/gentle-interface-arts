import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function BrandMark({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 group">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-warm shadow-soft transition-transform group-hover:rotate-6">
        <Sparkles className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </span>
      {withWordmark && (
        <span className="font-display text-xl font-bold tracking-tight text-foreground">
          bloomly
        </span>
      )}
    </Link>
  );
}
