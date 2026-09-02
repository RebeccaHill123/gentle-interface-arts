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

/**
 * What `pollPendingClaim` may report to the browser. A stored row labelled
 * "claimed" is only reported as claimed when the claimed user really has access
 * AND an attached plan — legacy rows from the earlier implementation can carry
 * the label without either, and must stay retriable ("paid").
 */
export function resolvePolledClaimStatus(input: {
  row: {
    status?: string | null;
    claimed_user_id?: string | null;
    magic_link_hash?: string | null;
  };
  profile?: ProfileAccessFields | null;
  hasPlanRow?: boolean;
  now?: number;
}): "claimed" | "paid" | "pending" | "expired" {
  const { row } = input;
  if (isFinalStoredClaim(row)) {
    const verified =
      profileHasAccess(input.profile, input.now ?? Date.now()) &&
      !!input.hasPlanRow;
    return verified ? "claimed" : "paid";
  }
  if (row.status === "claimed") return "paid";
  return (row.status as "pending" | "paid" | "expired") ?? "pending";
}


/**
 * What the checkout return page may do next. Nothing completes before the
 * pending claim is verified — an existing browser session on its own is never
 * proof that this purchase was provisioned.
 */
export function decideReturnStep(input: {
  pollStatus: "pending" | "paid" | "claimed" | "expired" | "not_found";
  hasSession: boolean;
  hasMagicLinkHash?: boolean;
}): "wait" | "not-found" | "complete" | "magic-link" | "email-fallback" {
  if (input.pollStatus === "not_found") return "not-found";
  if (input.pollStatus !== "claimed") return "wait";
  if (input.hasSession) return "complete";
  return input.hasMagicLinkHash ? "magic-link" : "email-fallback";
}

/**
 * What a webhook delivery should do with an existing pending row.
 * A fully verified claim is a no-op (duplicate delivery). Any repair re-runs
 * provisioning and always mints a FRESH magic link, because a stored hash from
 * a partial claim may already be used or expired.
 */
export function decideClaimAction(
  verification: ClaimVerification,
): { action: "noop" } | { action: "provision"; freshMagicLink: true } {
  return verification.complete
    ? { action: "noop" }
    : { action: "provision", freshMagicLink: true };
}
