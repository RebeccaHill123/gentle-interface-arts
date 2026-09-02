// Shared, testable server-side entitlement decision.
//
// Browser route guards are UX, not authorization. Every surface that can spend
// workspace AI credits or return premium generated study content must resolve
// the authenticated user's *real* access here, before touching a provider or a
// premium cache.
//
// Status semantics (deliberately distinct):
//   401 — no/invalid bearer token, or the token's user cannot be resolved
//   403 — authenticated, but genuinely no access (missing profile or inactive)
//   503 — the entitlement/profile read itself failed (fail closed as
//         *unavailable*, never as "not subscribed")

import { profileHasAccess, type ProfileAccessFields } from "@/lib/provisioning";

export const ENTITLEMENT_SELECT =
  "is_pro, grandfathered_pro, subscription_status, current_period_end";

export type EntitlementDenial = {
  ok: false;
  status: 401 | 403 | 503;
  code: "unauthenticated" | "no_access" | "unavailable";
  message: string;
};

export type EntitlementGrant = {
  ok: true;
  userId: string;
  profile: ProfileAccessFields;
};

export type EntitlementResult = EntitlementGrant | EntitlementDenial;

export const DENIAL_MESSAGES = {
  unauthenticated: "Sign in to continue.",
  no_access:
    "This feature needs an active Tentra subscription or trial. Start your plan to unlock it.",
  unavailable:
    "We couldn't confirm your subscription right now. Please try again in a moment.",
} as const;

function deny(
  status: 401 | 403 | 503,
  code: EntitlementDenial["code"],
): EntitlementDenial {
  return { ok: false, status, code, message: DENIAL_MESSAGES[code] };
}

/**
 * Pure decision: given what we learned about the token and the profile read,
 * decide grant / 401 / 403 / 503. Kept pure so the rule is unit-testable and
 * cannot drift between the HTTP route, the Edge Function, the server functions
 * and the MCP tools.
 */
export function decideEntitlement(
  input: {
    /** A bearer token was present and well-formed. */
    tokenPresent: boolean;
    /** The auth provider failed or rejected the token. */
    authError?: boolean;
    userId?: string | null;
    /** The profile read errored (transient DB/network failure). */
    profileError?: boolean;
    /** null/undefined + no error means the row genuinely does not exist. */
    profile?: ProfileAccessFields | null;
  },
  now: number = Date.now(),
): EntitlementResult {
  if (!input.tokenPresent) return deny(401, "unauthenticated");
  if (input.authError || !input.userId) return deny(401, "unauthenticated");
  if (input.profileError) return deny(503, "unavailable");
  if (!input.profile) return deny(403, "no_access");
  if (!profileHasAccess(input.profile, now)) return deny(403, "no_access");
  return { ok: true, userId: input.userId, profile: input.profile };
}

/** Minimal shape of the Supabase clients used by the adapters below. */
export type EntitlementClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => Promise<{
          data: ProfileAccessFields | null;
          error: unknown;
        }>;
      };
    };
  };
};

/**
 * Reads the profile *as the user* (RLS applies) and applies the decision.
 * The caller has already resolved `userId` from a validated token.
 */
export async function resolveEntitlementForUser(
  client: EntitlementClient,
  userId: string | null | undefined,
  now: number = Date.now(),
): Promise<EntitlementResult> {
  if (!userId) return deny(401, "unauthenticated");
  let profile: ProfileAccessFields | null = null;
  let profileError = false;
  try {
    const res = await client
      .from("profiles")
      .select(ENTITLEMENT_SELECT)
      .eq("user_id", userId)
      .maybeSingle();
    if (res.error) profileError = true;
    else profile = res.data ?? null;
  } catch {
    profileError = true;
  }
  return decideEntitlement(
    { tokenPresent: true, userId, profileError, profile },
    now,
  );
}

/** Extract a bearer token from an Authorization header value. */
export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = m?.[1]?.trim();
  return token && token.length > 10 ? token : null;
}

export function denialResponse(
  denial: EntitlementDenial,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(
    JSON.stringify({ error: denial.message, code: denial.code }),
    {
      status: denial.status,
      headers: { "Content-Type": "application/json", ...extraHeaders },
    },
  );
}
