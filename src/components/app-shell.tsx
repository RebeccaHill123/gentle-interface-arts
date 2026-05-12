import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Flame,
  Activity,
  Sparkles,
  Scale,
  BarChart3,
  Users,
  Settings as SettingsIcon,
  ArrowLeft,
  Menu,
  X,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type AppRoute =
  | "/dashboard"
  | "/focus"
  | "/sessions"
  | "/coach"
  | "/mocks"
  | "/analytics"
  | "/community"
  | "/settings";

const NAV: { to: AppRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/focus", label: "Focus", icon: Flame },
  { to: "/sessions", label: "Sessions", icon: Activity },
  { to: "/coach", label: "AI Coach", icon: Sparkles },
  { to: "/mocks", label: "Mock Exams", icon: Scale },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/community", label: "Community", icon: Users },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

// Mobile bottom nav: 5 most-used items
const MOBILE_NAV = NAV.filter((n) =>
  ["/dashboard", "/focus", "/coach", "/analytics", "/settings"].includes(n.to),
);

interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  /** If set, show a Back button that navigates here. Defaults to "/dashboard" when showBack is true. */
  showBack?: boolean;
  backTo?: AppRoute | "/";
  backLabel?: string;
  /** Right-side header actions */
  actions?: ReactNode;
  /** When true, padding is removed (page handles its own layout). */
  bare?: boolean;
}

export function AppShell({
  children,
  title,
  subtitle,
  showBack = false,
  backTo = "/dashboard",
  backLabel = "Back to Dashboard",
  actions,
  bare = false,
}: AppShellProps) {
  const [initials, setInitials] = useState("?");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const name =
        profile?.first_name ||
        profile?.display_name?.split(" ")[0] ||
        user.email?.split("@")[0] ||
        "";
      if (active) setInitials((name[0] || "?").toUpperCase());
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-6">
        {/* Desktop sidebar */}
        <DesktopSidebar />

        <div className="flex min-w-0 flex-1 flex-col space-y-6 pb-24 md:pb-0">
          {/* Top bar */}
          <header className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 p-3 pl-4 backdrop-blur md:pl-5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background/40 md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              {showBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: backTo })}
                  className="hidden rounded-full text-xs text-muted-foreground sm:inline-flex"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
                </Button>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold text-foreground md:text-lg">
                  {title}
                </h1>
                {subtitle && (
                  <p className="truncate text-[11px] text-muted-foreground md:text-xs">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-pink-blue text-sm font-semibold text-primary-foreground">
                {initials}
              </div>
            </div>
          </header>

          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: backTo })}
              className="-mt-3 self-start rounded-full text-xs text-muted-foreground sm:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
            </Button>
          )}

          <main className={bare ? "" : "min-w-0"}>{children}</main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <MobileBottomNav />

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <MobileDrawer onClose={() => setMobileNavOpen(false)} />
      )}
    </div>
  );
}

function DesktopSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-3xl border border-border bg-sidebar p-5 shadow-card md:flex">
      <BrandMark />
      <nav className="mt-8 flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = path === item.to || path.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-pink" />
          <div className="text-xs font-semibold text-foreground">Tentra Pro</div>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Mock exams, AI feedback & smart re-planning.
        </p>
        <Button
          asChild
          size="sm"
          className="mt-3 w-full rounded-full bg-gradient-pink-blue text-primary-foreground shadow-glow hover:opacity-95"
        >
          <Link to="/pro">Upgrade</Link>
        </Button>
      </div>
    </aside>
  );
}

function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = path === item.to || path.startsWith(item.to + "/");
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-pink"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-xl transition-all ${
                    active ? "bg-gradient-pink-blue text-primary-foreground shadow-glow" : ""
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="fixed inset-0 z-50 md:hidden" onClick={onClose}>
      <div className="absolute inset-0 bg-background/70 backdrop-blur" />
      <div
        className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-border bg-sidebar p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <BrandMark />
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background/40"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="mt-6 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
