import { describe, it, expect } from "vitest";
import {
  profileHasAccess,
  verifyClaim,
  isFinalStoredClaim,
  resolvePolledClaimStatus,
  decideReturnStep,
  decideClaimAction,
} from "./provisioning";
import { decidePlanLoad } from "./plan-recovery";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

const entitled = { is_pro: true, subscription_status: "active" };

describe("profileHasAccess", () => {
  it("grants access for active, trialing, grandfathered and grace", () => {
    expect(profileHasAccess({ subscription_status: "active" })).toBe(true);
    expect(profileHasAccess({ subscription_status: "trialing" })).toBe(true);
    expect(profileHasAccess({ grandfathered_pro: true })).toBe(true);
    expect(
      profileHasAccess({
        subscription_status: "canceled",
        current_period_end: future,
      }),
    ).toBe(true);
  });

  it("denies access with no profile or an expired cancellation", () => {
    expect(profileHasAccess(null)).toBe(false);
    expect(
      profileHasAccess({
        subscription_status: "canceled",
        current_period_end: past,
      }),
    ).toBe(false);
  });
});

describe("verifyClaim", () => {
  const complete = {
    status: "claimed",
    claimedUserId: "u1",
    expectedUserId: "u1",
    profile: entitled,
    profileExists: true,
    hasPlanRow: true,
    magicLinkHash: "hash",
  };

  it("is complete only when every step is verified", () => {
    expect(verifyClaim(complete)).toEqual({ complete: true, missing: [] });
  });

  it("stays retriable when the plan insert failed", () => {
    const r = verifyClaim({ ...complete, hasPlanRow: false });
    expect(r.complete).toBe(false);
    expect(r.missing).toContain("user_plan");
  });

  it("stays retriable when the entitlement write failed", () => {
    const r = verifyClaim({ ...complete, profile: { is_pro: false } });
    expect(r.complete).toBe(false);
    expect(r.missing).toContain("entitlement");
  });

  it("stays retriable when the profile row is missing", () => {
    const r = verifyClaim({ ...complete, profileExists: false, profile: null });
    expect(r.complete).toBe(false);
    expect(r.missing).toContain("profile");
  });

  it("stays retriable when no magic-link hash was generated", () => {
    const r = verifyClaim({ ...complete, magicLinkHash: null });
    expect(r.complete).toBe(false);
    expect(r.missing).toContain("magic_link");
  });

  it("flags a claim landing on the wrong user", () => {
    const r = verifyClaim({ ...complete, claimedUserId: "u2" });
    expect(r.missing).toContain("claimed_user_mismatch");
  });

  it("treats a legacy claimed-but-incomplete row as repairable", () => {
    const r = verifyClaim({
      status: "claimed",
      claimedUserId: "u1",
      profile: entitled,
      profileExists: true,
      hasPlanRow: false,
      magicLinkHash: null,
    });
    expect(r.complete).toBe(false);
    expect(r.missing).toEqual(["user_plan", "magic_link"]);
  });

  it("is deterministic and idempotent for the same input", () => {
    expect(verifyClaim(complete)).toEqual(verifyClaim(complete));
  });
});

describe("isFinalStoredClaim", () => {
  it("requires claimed status, a user and a magic-link hash", () => {
    expect(
      isFinalStoredClaim({
        status: "claimed",
        claimed_user_id: "u1",
        magic_link_hash: "h",
      }),
    ).toBe(true);
    expect(
      isFinalStoredClaim({ status: "claimed", claimed_user_id: "u1" }),
    ).toBe(false);
    expect(isFinalStoredClaim({ status: "paid" })).toBe(false);
  });
});

describe("decidePlanLoad", () => {
  it("is ready when a plan exists anywhere", () => {
    expect(
      decidePlanLoad({ cloudOk: true, hasCloudPlan: true, hasLocalPlan: false }),
    ).toEqual({ kind: "ready" });
    expect(
      decidePlanLoad({ cloudOk: false, hasCloudPlan: false, hasLocalPlan: true }),
    ).toEqual({ kind: "ready" });
  });

  it("recovers rather than onboarding when the read failed", () => {
    expect(
      decidePlanLoad({ cloudOk: false, hasCloudPlan: false, hasLocalPlan: false }),
    ).toEqual({ kind: "recover", reason: "read-error" });
  });

  it("recovers rather than onboarding when there is genuinely no plan", () => {
    expect(
      decidePlanLoad({ cloudOk: true, hasCloudPlan: false, hasLocalPlan: false }),
    ).toEqual({ kind: "recover", reason: "missing" });
  });
});

describe("decideReturnStep", () => {
  it("never completes on an existing session before the claim is verified", () => {
    for (const pollStatus of ["pending", "paid", "expired"] as const) {
      expect(
        decideReturnStep({ pollStatus, hasSession: true, hasMagicLinkHash: true }),
      ).toBe("wait");
    }
  });

  it("lets an authenticated purchaser skip the magic link once claimed", () => {
    expect(decideReturnStep({ pollStatus: "claimed", hasSession: true })).toBe(
      "complete",
    );
  });

  it("uses the magic link when claimed and not signed in", () => {
    expect(
      decideReturnStep({
        pollStatus: "claimed",
        hasSession: false,
        hasMagicLinkHash: true,
      }),
    ).toBe("magic-link");
    expect(
      decideReturnStep({ pollStatus: "claimed", hasSession: false }),
    ).toBe("email-fallback");
  });

  it("reports an unknown token", () => {
    expect(
      decideReturnStep({ pollStatus: "not_found", hasSession: true }),
    ).toBe("not-found");
  });
});

describe("resolvePolledClaimStatus", () => {
  const finalRow = {
    status: "claimed",
    claimed_user_id: "u1",
    magic_link_hash: "h",
  };

  it("reports claimed only with real access and an attached plan", () => {
    expect(
      resolvePolledClaimStatus({
        row: finalRow,
        profile: entitled,
        hasPlanRow: true,
      }),
    ).toBe("claimed");
  });

  it("keeps a legacy claimed row without entitlement retriable", () => {
    expect(
      resolvePolledClaimStatus({
        row: finalRow,
        profile: { is_pro: false, subscription_status: null },
        hasPlanRow: true,
      }),
    ).toBe("paid");
  });

  it("keeps a legacy claimed row without a plan retriable", () => {
    expect(
      resolvePolledClaimStatus({
        row: finalRow,
        profile: entitled,
        hasPlanRow: false,
      }),
    ).toBe("paid");
  });

  it("keeps a claimed row with no hash retriable and passes other statuses through", () => {
    expect(
      resolvePolledClaimStatus({
        row: { status: "claimed", claimed_user_id: "u1" },
        profile: entitled,
        hasPlanRow: true,
      }),
    ).toBe("paid");
    expect(resolvePolledClaimStatus({ row: { status: "pending" } })).toBe(
      "pending",
    );
  });
});

describe("decideClaimAction", () => {
  const complete = {
    status: "claimed",
    claimedUserId: "u1",
    expectedUserId: "u1",
    profile: entitled,
    profileExists: true,
    hasPlanRow: true,
    magicLinkHash: "hash",
  };

  it("makes a fully verified duplicate webhook a no-op", () => {
    expect(decideClaimAction(verifyClaim(complete))).toEqual({ action: "noop" });
  });

  it("repairs a legacy claim and always requires a fresh magic link", () => {
    const legacy = verifyClaim({ ...complete, hasPlanRow: false });
    expect(decideClaimAction(legacy)).toEqual({
      action: "provision",
      freshMagicLink: true,
    });
    const staleHash = verifyClaim({ ...complete, profile: { is_pro: false } });
    expect(decideClaimAction(staleHash)).toEqual({
      action: "provision",
      freshMagicLink: true,
    });
  });
});
