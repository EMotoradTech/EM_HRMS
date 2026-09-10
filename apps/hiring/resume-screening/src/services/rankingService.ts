import { CandidateFields, JDRequirements, ScoreBreakdown } from "../types";
import { scoreCandidate } from "./scoringEngine";

export interface RankedCandidate<T extends CandidateFields = CandidateFields> {
  candidate: T;
  rank: number;
  breakdown: ScoreBreakdown;
}

// Sorted by score desc; ties broken alphabetically by name so re-running the
// same inputs always produces the same order (no ambiguity in "who's #3").
export function rankCandidates<T extends CandidateFields>(
  jd: JDRequirements,
  candidates: T[]
): RankedCandidate<T>[] {
  const scored = candidates.map((candidate) => ({
    candidate,
    breakdown: scoreCandidate(jd, candidate),
  }));

  scored.sort((a, b) => {
    if (b.breakdown.totalScore !== a.breakdown.totalScore) {
      return b.breakdown.totalScore - a.breakdown.totalScore;
    }
    return (a.candidate.name ?? "").localeCompare(b.candidate.name ?? "");
  });

  return scored.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));
}
