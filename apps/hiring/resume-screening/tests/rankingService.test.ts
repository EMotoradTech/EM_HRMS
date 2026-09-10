import { rankCandidates } from "../src/services/rankingService";
import { CandidateFields, JDRequirements } from "../src/types";

// Fixed inputs, per the "what to test" section of the hiring brief:
// ranking a known small set of resumes against a known JD should produce a
// sensible, reproducible order every time.

const jd: JDRequirements = {
  title: "Backend Engineer",
  requiredSkills: ["node.js", "postgresql", "typescript"],
  preferredSkills: ["docker", "aws"],
  requiredQualifications: ["b.tech"],
  minExperienceYears: 3,
  maxExperienceYears: 6,
  keywords: [],
};

function candidate(overrides: Partial<CandidateFields>): CandidateFields {
  return {
    name: "Unnamed",
    email: null,
    phone: null,
    extractedSkills: [],
    totalExperienceYears: null,
    qualifications: [],
    rawText: "",
    ...overrides,
  };
}

// Deliberately monotonic on every axis (skills, experience, qualification)
// so the expected order is unambiguous.
const excellent = candidate({
  name: "Asha Rao",
  extractedSkills: ["node.js", "postgresql", "typescript", "docker", "aws"],
  totalExperienceYears: 4,
  qualifications: ["b.tech"],
});

const good = candidate({
  name: "Bala Krishnan",
  extractedSkills: ["node.js", "postgresql", "docker"],
  totalExperienceYears: 4,
  qualifications: ["b.tech"],
});

const fair = candidate({
  name: "Chetan Mehta",
  extractedSkills: ["node.js"],
  totalExperienceYears: 4,
  qualifications: [],
});

const poor = candidate({
  name: "Divya Iyer",
  extractedSkills: [],
  totalExperienceYears: null,
  qualifications: [],
});

describe("rankCandidates", () => {
  it("produces a reproducible, sensible order for a known JD and candidate set", () => {
    const ranked = rankCandidates(jd, [poor, fair, excellent, good]);

    expect(ranked.map((r) => r.candidate.name)).toEqual([
      "Asha Rao",
      "Bala Krishnan",
      "Chetan Mehta",
      "Divya Iyer",
    ]);

    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4]);

    // Scores should be strictly decreasing given the monotonic fixtures above.
    const scores = ranked.map((r) => r.breakdown.totalScore);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThan(scores[i - 1]);
    }
  });

  it("gives the strongest candidate a near-perfect score", () => {
    const ranked = rankCandidates(jd, [excellent]);
    expect(ranked[0].breakdown.totalScore).toBeGreaterThan(0.95);
  });

  it("explains why an under-experienced candidate scored lower", () => {
    const underExperienced = candidate({
      name: "Esha Nair",
      extractedSkills: ["node.js", "postgresql", "typescript"],
      totalExperienceYears: 1,
      qualifications: ["b.tech"],
    });
    const ranked = rankCandidates(jd, [underExperienced]);
    const breakdown = ranked[0].breakdown;
    expect(breakdown.experience.detail.meetsMinimum).toBe(false);
    expect(breakdown.explanation.some((line) => line.includes("below the required minimum"))).toBe(true);
  });

  it("is stable (re-running the same inputs yields the same order)", () => {
    const first = rankCandidates(jd, [poor, fair, excellent, good]);
    const second = rankCandidates(jd, [poor, fair, excellent, good]);
    expect(first.map((r) => r.candidate.name)).toEqual(second.map((r) => r.candidate.name));
  });
});
