import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { waitForAuthUser } from "@/lib/auth-session";

export const Route = createFileRoute("/focus")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const user = await waitForAuthUser();
    if (!user) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: () => <Outlet />,
});