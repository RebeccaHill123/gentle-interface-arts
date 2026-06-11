import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Flame,
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
import { ProfileMenu } from "@/components/profile-menu";

export type AppRoute =
  | "/dashboard"
  | "/focus"
  | "/coach"
  | "/mocks"
  | "/analytics"
  | "/community"
  | "/settings";

const NAV: { to: AppRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/focus", label: "Focus", icon: Flame },
  { to: "/coach", label: "AI Coach", icon: Sparkles },
  { to: "/mocks", label: "Mocks & Practice", icon: Scale },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/community", label: "Community", icon: Users },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const MOBILE_NAV = NAV.filter((n) =>
  ["/dashboard", "/focus", "/coach", "/analytics", "/settings"].includes(n.to),
);

interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: AppRoute | "/";
  backLabel?: string;
  actions?: ReactNode;
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-7xl gap-6 p-4 md:p-6">
        <DesktopSidebar />

        <div className="flex min-w-0 flex-1 flex-col space-y-6 pb-24 md:pb-0">
          {/* Top bar — quieter, hairline border, more breathing room */}
          <header className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/50 px-4 py-3 backdrop-blur md:px-5 md:py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setMobileNavOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground transition-colors hover:text-foreground md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              {showBack && (
                <button
                  onClick={() => navigate({ to: backTo })}
                  className="hidden items-center gap-1.5 text-[12.5px] font-normal text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
                </button>
              )}
              <div className="min-w-0">
                <h1 className="truncate font-display text-[15px] font-medium tracking-[-0.015em] text-foreground md:text-[17px]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="truncate text-[11.5px] font-normal text-muted-foreground md:text-[12px]">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {actions}
              <ProfileMenu />
            </div>
          </header>

          {showBack && (
            <button
              onClick={() => navigate({ to: backTo })}
              className="-mt-3 inline-flex items-center gap-1.5 self-start text-[12px] font-normal text-muted-foreground transition-colors hover:text-foreground sm:hidden"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> {backLabel}
            </button>
          )}

          <main className={bare ? "" : "min-w-0"}>{children}</main>
        </div>
      </div>

      <MobileBottomNav />

      {mobileNavOpen && <MobileDrawer onClose={() => setMobileNavOpen(false)} />}
    </div>
  );
}

function DesktopSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-60 shrink-0 flex-col rounded-2xl border border-border/60 bg-sidebar/60 p-5 backdrop-blur md:flex">
      <BrandMark />
      <nav className="mt-9 flex-1 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = path === item.to || path.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] tracking-[-0.005em] transition-colors ${
                active
                  ? "bg-foreground/[0.04] font-medium text-foreground"
                  : "font-normal text-muted-foreground hover:bg-foreground/[0.025] hover:text-foreground"
              }`}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full"
                  style={{
                    background:
                      "linear-gradient(180deg, oklch(0.72 0.20 350), oklch(0.60 0.20 270))",
                  }}
                />
              )}
              <Icon className={`h-[15px] w-[15px] ${active ? "text-pink" : "text-muted-foreground/80 group-hover:text-foreground"}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 rounded-xl border border-border/60 bg-foreground/[0.02] p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-pink" />
          <div className="text-[12.5px] font-medium tracking-[-0.005em] text-foreground">
            Tentra Pro
          </div>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-snug text-muted-foreground">
          Mock exams, AI feedback and smart re-planning.
        </p>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="mt-3 h-8 w-full rounded-lg border border-border/60 text-[12.5px] font-normal text-foreground hover:bg-foreground/[0.04]"
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = path === item.to || path.startsWith(item.to + "/");
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-[10px] font-medium transition-colors ${
                  active ? "text-pink" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`grid h-8 w-8 place-items-center rounded-lg transition-colors ${
                    active ? "bg-pink/10 text-pink" : ""
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
        className="absolute left-0 top-0 h-full w-72 max-w-[85vw] border-r border-border/60 bg-sidebar p-5 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <BrandMark />
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border/60 bg-background/50 text-muted-foreground hover:text-foreground"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="mt-7 space-y-0.5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = path === item.to || path.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
                  active
                    ? "bg-foreground/[0.04] font-medium text-foreground"
                    : "font-normal text-muted-foreground hover:bg-foreground/[0.025] hover:text-foreground"
                }`}
              >
                <Icon className={`h-[15px] w-[15px] ${active ? "text-pink" : ""}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
