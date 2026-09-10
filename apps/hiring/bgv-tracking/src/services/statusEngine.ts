import { CheckLike, OverallStatus } from "../types";

// A candidate's overall status only flips to COMPLETE once every one of
// their checks is VERIFIED. A single FLAGGED or FAILED check blocks
// completion outright, even if every other check is verified — it doesn't
// just sit at "in progress", it needs explicit attention.
export function computeOverallStatus(checks: CheckLike[]): OverallStatus {
  if (checks.length === 0) return "IN_PROGRESS";

  if (checks.some((c) => c.status === "FLAGGED" || c.status === "FAILED")) {
    return "BLOCKED";
  }

  if (checks.every((c) => c.status === "VERIFIED")) {
    return "COMPLETE";
  }

  return "IN_PROGRESS";
}
