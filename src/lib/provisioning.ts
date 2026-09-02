// Pure, testable decision helpers for purchase-to-access integrity.
//
// The webhook claim flow and the dashboard recovery path both need to answer
// the same two questions without touching the network:
//   1. does this profile row grant access (identical rules to requireAccess)?
//   2. is a pending-plan claim genuinely complete, or only optimistically
//      labelled "claimed"?
// Keeping these as pure functions makes the integrity rules unit-testable.

export type ProfileAccessFields = {
  is_pro?: boolean | null;
  grandfathered_pro?: boolean | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
};

/**
 * Mirrors `requireAccess` exactly: grandfathered, is_pro, active, trialing, or
 * a cancellation still inside its paid period.
 */
export function profileHasAccess(
  profile: ProfileAccessFields | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!profile) return false;
  const status = profile.subscription_status ?? null;
  const graceActive =
    status === "canceled" &&
    !!profile.current_period_end &&
    new Date(profile.current_period_end).getTime() > now;
  return (
    !!profile.grandfathered_pro ||
    !!profile.is_pro ||
    status === "active" ||
    status === "trialing" ||
    graceActive
  );
}

export type ClaimVerificationInput = {
  status?: string | null;
  claimedUserId?: string | null;
  /** The user id provisioning resolved for this checkout, when known. */
  expectedUserId?: string | null;
  profile?: ProfileAccessFields | null;
  profileExists?: boolean;
  hasPlanRow?: boolean;
  magicLinkHash?: string | null;
};

export type ClaimVerification = { complete: boolean; missing: string[] };

/**
 * A claim may only be reported as final when every downstream side effect has
 * been verified. Anything missing keeps the row retriable.
 */
export function verifyClaim(
  input: ClaimVerificationInput,
  now: number = Date.now(),
): ClaimVerification {
  const missing: string[] = [];
  if (input.status !== "claimed") missing.push("status");
  if (!input.claimedUserId) missing.push("claimed_user_id");
  if (
    input.expectedUserId &&
    input.claimedUserId &&
    input.expectedUserId !== input.claimedUserId
  ) {
    missing.push("claimed_user_mismatch");
  }
  if (input.profileExists === false) missing.push("profile");
  if (!profileHasAccess(input.profile, now)) missing.push("entitlement");
  if (!input.hasPlanRow) missing.push("user_plan");
  if (!input.magicLinkHash) missing.push("magic_link");
  return { complete: missing.length === 0, missing };
}

/**
 * `pollPendingClaim` may only tell the browser "claimed" when the stored claim
 * is final: claimed status, an owning user, and a usable first-access hash.
 */
export function isFinalStoredClaim(row: {
  status?: string | null;
  claimed_user_id?: string | null;
  magic_link_hash?: string | null;
}): boolean {
  return (
    row.status === "claimed" &&
    !!row.claimed_user_id &&
    !!row.magic_link_hash
  );
}
