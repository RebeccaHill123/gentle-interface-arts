import { describe, expect, it } from "vitest";
import { parseAcquisitionSearch } from "@/lib/acquisition";

describe("acquisition exam routing", () => {
  it("keeps a generic visit exam-neutral", () => {
    expect(parseAcquisitionSearch({ src: "landing" })).toEqual({
      exam: undefined,
      src: "landing",
      placement: undefined,
      date: undefined,
      hours: undefined,
    });
  });

  it.each(["sqe1", "sqe2", "ube", "mpre"] as const)(
    "preserves the explicit %s pathway",
    (exam) => {
      expect(parseAcquisitionSearch({ exam }).exam).toBe(exam);
    },
  );

  it("does not turn an invalid pathway into SQE1", () => {
    expect(parseAcquisitionSearch({ exam: "ny-bar" }).exam).toBeUndefined();
  });
});