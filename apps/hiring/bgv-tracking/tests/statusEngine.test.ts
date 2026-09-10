import { computeOverallStatus } from "../src/services/statusEngine";
import { CheckLike } from "../src/types";

describe("computeOverallStatus", () => {
  it("is COMPLETE only once every check is verified", () => {
    const checks: CheckLike[] = [
      { type: "EDUCATION", status: "VERIFIED" },
      { type: "EMPLOYMENT", status: "VERIFIED" },
      { type: "ADDRESS", status: "VERIFIED" },
      { type: "IDENTITY", status: "VERIFIED" },
    ];
    expect(computeOverallStatus(checks)).toBe("COMPLETE");
  });

  it("is IN_PROGRESS while any check is still pending or in progress", () => {
    const checks: CheckLike[] = [
      { type: "EDUCATION", status: "VERIFIED" },
      { type: "EMPLOYMENT", status: "IN_PROGRESS" },
      { type: "ADDRESS", status: "PENDING" },
      { type: "IDENTITY", status: "VERIFIED" },
    ];
    expect(computeOverallStatus(checks)).toBe("IN_PROGRESS");
  });

  it("a single flagged check blocks completion even if every other check is verified", () => {
    const checks: CheckLike[] = [
      { type: "EDUCATION", status: "VERIFIED" },
      { type: "EMPLOYMENT", status: "VERIFIED" },
      { type: "ADDRESS", status: "FLAGGED" },
      { type: "IDENTITY", status: "VERIFIED" },
    ];
    expect(computeOverallStatus(checks)).toBe("BLOCKED");
  });

  it("a single failed check blocks completion even if every other check is verified", () => {
    const checks: CheckLike[] = [
      { type: "EDUCATION", status: "VERIFIED" },
      { type: "EMPLOYMENT", status: "FAILED" },
    ];
    expect(computeOverallStatus(checks)).toBe("BLOCKED");
  });

  it("treats a candidate with no checks yet as IN_PROGRESS, not COMPLETE", () => {
    expect(computeOverallStatus([])).toBe("IN_PROGRESS");
  });
});
