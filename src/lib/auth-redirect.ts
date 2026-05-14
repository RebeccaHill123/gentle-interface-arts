// Returns the canonical URL to send users to after clicking an auth email link
// (signup verification, password reset, magic link, etc.).
//
// Why not just `window.location.origin`?
// - A user often signs up on desktop, but opens the verification email on
//   their phone. Supabase persists the session in the *clicking* device's
//   browser. So the email link must always land on the real production app,
//   not on whatever preview/lovable URL the desktop happened to use.
// - We also want a stable target that matches the Supabase "Allowed
//   Redirect URLs" allow-list, otherwise Supabase silently falls back to
//   Site URL (which is how users end up on lovable.dev).
//
// Rule:
// - In production (tentraapp.com / www.tentraapp.com) → always use
//   https://tentraapp.com/auth/callback.
// - On localhost / preview / lovable.app subdomains → use the current origin
//   so dev/preview flows still work (these origins must also be added to
//   the Supabase allow-list).

const PRODUCTION_ORIGIN = "https://tentraapp.com";

const PRODUCTION_HOSTS = new Set(["tentraapp.com", "www.tentraapp.com"]);

export function getAuthRedirectURL(path: string = "/auth/callback"): string {
  if (typeof window === "undefined") {
    return `${PRODUCTION_ORIGIN}${path}`;
  }
  const host = window.location.hostname;
  // Local dev / lovable preview / sandbox — use current origin.
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovable.dev")
  ) {
    return `${window.location.origin}${path}`;
  }
  // Anything else (production custom domain, www) → canonical production.
  if (PRODUCTION_HOSTS.has(host)) {
    return `${PRODUCTION_ORIGIN}${path}`;
  }
  // Unknown host — fall back to current origin to avoid breaking redirects.
  return `${window.location.origin}${path}`;
}
