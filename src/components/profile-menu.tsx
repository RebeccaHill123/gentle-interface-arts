import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Settings as SettingsIcon,
  Palette,
  Bell,
  LogOut,
  CreditCard,
  BookOpen,
  Sparkles,
  Keyboard,
  GraduationCap,
  Check,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/use-auth";
import { getProStatus } from "@/lib/pro-store";
import { toast } from "sonner";

interface ProfileInfo {
  name: string;
  email: string;
  initial: string;
  isPro: boolean;
}

export function ProfileMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<ProfileInfo>({
    name: "Tentra user",
    email: "",
    initial: "?",
    isPro: false,
  });
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("tentra.theme") as "dark" | "light") || "dark";
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active || !user) return;
      const [{ data: profile }, pro] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, last_name, display_name, email")
          .eq("user_id", user.id)
          .maybeSingle(),
        getProStatus(),
      ]);
      if (!active) return;
      const name =
        profile?.display_name ||
        [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
        user.email?.split("@")[0] ||
        "Tentra user";
      const email = profile?.email || user.email || "";
      setInfo({
        name,
        email,
        initial: (name[0] || email[0] || "?").toUpperCase(),
        isPro: pro.isPro,
      });
    };
    load();
    const onProChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ isPro: boolean }>).detail;
      if (detail && typeof detail.isPro === "boolean") {
        setInfo((prev) => ({ ...prev, isPro: detail.isPro }));
      } else {
        load();
      }
    };
    window.addEventListener("tentra:pro-changed", onProChanged);
    return () => {
      active = false;
      window.removeEventListener("tentra:pro-changed", onProChanged);
    };
  }, []);

  const handleSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
      toast.success("Signed out");
      navigate({ to: "/", replace: true });
    } catch {
      toast.error("Could not sign out");
    }
  };

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("tentra.theme", next);
      document.documentElement.classList.toggle("light", next === "light");
    }
    toast.success(`${next === "dark" ? "Dark" : "Light"} theme`);
  };

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  const soon = (label: string) => {
    setOpen(false);
    toast.message(`${label} — coming soon`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Open profile menu"
          className="group relative grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-gradient-pink-blue text-sm font-semibold text-primary-foreground shadow-card transition-all duration-200 hover:scale-105 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink/60"
        >
          {info.initial}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-72 overflow-hidden rounded-2xl border-border/60 bg-card/80 p-0 shadow-card backdrop-blur-xl data-[state=open]:animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 p-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-pink-blue text-base font-semibold text-primary-foreground shadow-glow">
            {info.initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-foreground">
                {info.name}
              </span>
              <PlanBadge isPro={info.isPro} />
            </div>
            {info.email && (
              <div className="truncate text-[11px] text-muted-foreground">
                {info.email}
              </div>
            )}
          </div>
        </div>

        {/* Primary actions */}
        <Section>
          <Item
            icon={SettingsIcon}
            label="Settings"
            onSelect={() => go("/settings")}
          />
          <Item
            icon={Palette}
            label="Appearance"
            trailing={
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {theme}
              </span>
            }
            onSelect={toggleTheme}
          />
          <Item
            icon={Bell}
            label="Notifications"
            onSelect={() => soon("Notifications")}
          />
        </Section>

        <Divider />

        {/* Future-ready */}
        <Section>
          {!info.isPro && (
            <Item
              icon={Sparkles}
              label="Unlock Pro — free in Early Access"
              accent
              onSelect={() => go("/pro")}
            />
          )}
          <Item
            icon={CreditCard}
            label="Membership"
            onSelect={() => go("/pro")}
          />
          <Item
            icon={Keyboard}
            label="Keyboard shortcuts"
            trailing={<Kbd>?</Kbd>}
            onSelect={() => soon("Keyboard shortcuts")}
          />
        </Section>

        <Divider />

        <Section>
          <Item
            icon={LogOut}
            label="Log out"
            destructive
            onSelect={handleSignOut}
          />
        </Section>
      </PopoverContent>
    </Popover>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return <div className="space-y-0.5 p-2">{children}</div>;
}

function Divider() {
  return <div className="h-px bg-border/60" />;
}

function Item({
  icon: Icon,
  label,
  onSelect,
  trailing,
  accent,
  destructive,
}: {
  icon: typeof SettingsIcon;
  label: string;
  onSelect: () => void;
  trailing?: React.ReactNode;
  accent?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-all duration-150 ${
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : accent
            ? "text-foreground hover:bg-gradient-pink-blue hover:text-primary-foreground hover:shadow-glow"
            : "text-foreground/90 hover:bg-gradient-pink-blue hover:text-primary-foreground"
      }`}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${
          accent ? "text-pink group-hover:text-primary-foreground" : ""
        }`}
      />
      <span className="flex-1 truncate font-medium">{label}</span>
      {trailing}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

function PlanBadge({ isPro }: { isPro: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
        isPro
          ? "bg-gradient-pink-blue text-primary-foreground shadow-glow"
          : "border border-border/60 bg-background/40 text-muted-foreground"
      }`}
    >
      {isPro ? <Check className="h-2.5 w-2.5" /> : null}
      {isPro ? "Pro" : "Free"}
    </span>
  );
}
