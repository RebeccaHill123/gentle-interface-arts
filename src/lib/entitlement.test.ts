import { describe, expect, it, vi } from "vitest";
import { decideEntitlement } from "@/lib/entitlement";
import { decideBrowserAccess, safeNextPath } from "@/lib/access-decision";
import { validateChatMessages, validateQuizInput } from "@/lib/ai-request-validation";

const NOW = new Date("2026-03-01T12:00:00Z").getTime();
const future = new Date(NOW + 5 * 86400000).toISOString();
const past = new Date(NOW - 5 * 86400000).toISOString();

describe("decideEntitlement", () => {
  it("401s with no token", () => {
    const r = decideEntitlement({ tokenPresent: false }, NOW);
    expect(r).toMatchObject({ ok: false, status: 401, code: "unauthenticated" });
  });

  it("401s on auth error or missing user", () => {
    expect(decideEntitlement({ tokenPresent: true, authError: true }, NOW)).toMatchObject({ status: 401 });
    expect(decideEntitlement({ tokenPresent: true, userId: null }, NOW)).toMatchObject({ status: 401 });
  });

  it("503s when the profile read fails (fails closed as unavailable)", () => {
    const r = decideEntitlement({ tokenPresent: true, userId: "u1", profileError: true }, NOW);
    expect(r).toMatchObject({ ok: false, status: 503, code: "unavailable" });
  });

  it("403s on missing profile", () => {
    expect(decideEntitlement({ tokenPresent: true, userId: "u1", profile: null }, NOW)).toMatchObject({
      status: 403,
      code: "no_access",
    });
  });

  it("403s on an inactive profile", () => {
    const r = decideEntitlement(
      { tokenPresent: true, userId: "u1", profile: { is_pro: false, subscription_status: "canceled", current_period_end: past } },
      NOW,
    );
    expect(r.ok).toBe(false);
  });

  it("allows active, trialing, grandfathered and cancellation grace", () => {
    const cases = [
      { subscription_status: "active" },
      { subscription_status: "trialing" },
      { grandfathered_pro: true },
      { is_pro: true },
      { subscription_status: "canceled", current_period_end: future },
    ];
    for (const profile of cases) {
      expect(decideEntitlement({ tokenPresent: true, userId: "u1", profile }, NOW).ok).toBe(true);
    }
  });
});

describe("provider is never reached on denial", () => {
  async function handler(
    entitlement: ReturnType<typeof decideEntitlement>,
    provider: () => Promise<unknown>,
  ) {
    if (!entitlement.ok) return entitlement.status;
    await provider();
    return 200;
  }

  it("skips the provider for 401/403/503", async () => {
    const provider = vi.fn(async () => ({}));
    for (const input of [
      { tokenPresent: false },
      { tokenPresent: true, userId: "u1", profile: null },
      { tokenPresent: true, userId: "u1", profileError: true },
    ]) {
      await handler(decideEntitlement(input, NOW), provider);
    }
    expect(provider).not.toHaveBeenCalled();
  });

  it("calls the provider once when entitled", async () => {
    const provider = vi.fn(async () => ({}));
    const status = await handler(
      decideEntitlement({ tokenPresent: true, userId: "u1", profile: { is_pro: true } }, NOW),
      provider,
    );
    expect(status).toBe(200);
    expect(provider).toHaveBeenCalledTimes(1);
  });
});

describe("decideBrowserAccess", () => {
  it("read error => unavailable, never subscribe", () => {
    expect(decideBrowserAccess({ readError: true, profile: null }, NOW)).toBe("unavailable");
  });
  it("no row => subscribe", () => {
    expect(decideBrowserAccess({ readError: false, profile: null }, NOW)).toBe("subscribe");
  });
  it("inactive => subscribe", () => {
    expect(
      decideBrowserAccess({ readError: false, profile: { is_pro: false, subscription_status: "past_due" } }, NOW),
    ).toBe("subscribe");
  });
  it("active / grandfathered / grace => allow", () => {
    expect(decideBrowserAccess({ readError: false, profile: { subscription_status: "active" } }, NOW)).toBe("allow");
    expect(decideBrowserAccess({ readError: false, profile: { grandfathered_pro: true } }, NOW)).toBe("allow");
    expect(
      decideBrowserAccess({ readError: false, profile: { subscription_status: "canceled", current_period_end: future } }, NOW),
    ).toBe("allow");
  });
});

describe("safeNextPath", () => {
  it("rejects open redirects", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "dashboard", undefined, null]) {
      expect(safeNextPath(bad as string)).toBeUndefined();
    }
  });
  it("accepts same-origin paths", () => {
    expect(safeNextPath("/dashboard?tab=today")).toBe("/dashboard?tab=today");
  });
});

describe("AI request validation", () => {
  it("rejects system/tool roles and malformed content", () => {
    expect(validateChatMessages({ messages: [{ role: "system", content: "x" }] }).ok).toBe(false);
    expect(validateChatMessages({ messages: [{ role: "user", content: 5 }] }).ok).toBe(false);
    expect(validateChatMessages({ messages: [] }).ok).toBe(false);
    expect(validateChatMessages(null).ok).toBe(false);
  });

  it("rejects oversized payloads", () => {
    const many = Array.from({ length: 50 }, () => ({ role: "user", content: "hi" }));
    expect(validateChatMessages({ messages: many }).ok).toBe(false);
    expect(
      validateChatMessages({ messages: [{ role: "user", content: "x".repeat(50_000) }] }).ok,
    ).toBe(false);
  });

  it("accepts a normal conversation", () => {
    const r = validateChatMessages({
      messages: [
        { role: "user", content: "Explain consideration" },
        { role: "assistant", content: "Sure" },
        { role: "user", content: "More detail" },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it("validates quiz input", () => {
    expect(validateQuizInput({ examType: "MEE", module: "Contract" }).ok).toBe(false);
    expect(validateQuizInput({ examType: "SQE1", module: "A" }).ok).toBe(false);
    const r = validateQuizInput({ examType: "SQE1", module: "Contract law", confidence: 99 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.confidence).toBeLessThanOrEqual(5);
  });
});
