// Deciding what an entitled user with no visible plan should see.
//
// An authenticated, paying user must never be silently thrown back into
// onboarding: that looks like their purchase was lost. Instead we distinguish
// "we couldn't read the plan" from "there genuinely is no plan", and offer an
// explicit recovery choice in both cases.

export type PlanLoadDecision =
  | { kind: "ready" }
  /** The read failed — retrying is the right first action. */
  | { kind: "recover"; reason: "read-error" }
  /** Read succeeded and there is no plan anywhere — rebuilding is the fix. */
  | { kind: "recover"; reason: "missing" };

export function decidePlanLoad(input: {
  /** false when the cloud read itself failed. */
  cloudOk: boolean;
  hasCloudPlan: boolean;
  hasLocalPlan: boolean;
}): PlanLoadDecision {
  if (input.hasCloudPlan || input.hasLocalPlan) return { kind: "ready" };
  if (!input.cloudOk) return { kind: "recover", reason: "read-error" };
  return { kind: "recover", reason: "missing" };
}
