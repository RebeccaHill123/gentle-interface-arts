import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { waitForAuthUser } from "@/lib/auth-session";

export const Route = createFileRoute("/focus")({
  beforeLoad: async () => {
    const { requireAccess } = await import("@/lib/access-guard");
    await requireAccess();
  },
  component: () => <Outlet />,
});