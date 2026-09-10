import { CandidateFields, JDRequirements, ScoreBreakdown } from "../types";

// Weights are deliberately simple and fixed (not learned) so HR can see and
// trust exactly why a score came out the way it did. Adjust here if HR wants
// to re-balance what matters most.
const WEIGHTS = {
  requiredSkills: 0.55,
  preferredSkills: 0.15,
  experience: 0.2,
  qualifications: 0.1,
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function scoreSkills(jdSkills: string[], candidateSkills: string[]): { score: number; matched: string[]; missing: string[] } {
  if (jdSkills.length === 0) {
    return { score: 1, matched: [], missing: [] };
  }
  const candidateSet = new Set(candidateSkills.map(normalize));
  const matched = jdSkills.filter((s) => candidateSet.has(normalize(s)));
  const missing = jdSkills.filter((s) => !candidateSet.has(normalize(s)));
  return { score: matched.length / jdSkills.length, matched, missing };
}

function scoreExperience(
  candidateYears: number | null,
  minRequired?: number,
  maxRequired?: number
): { score: number; meetsMinimum: boolean } {
  if (minRequired === undefined && maxRequired === undefined) {
    return { score: 1, meetsMinimum: true };
  }
  if (candidateYears === null) {
    return { score: 0, meetsMinimum: false };
  }
  const min = minRequired ?? 0;
  if (candidateYears < min) {
    // Partial credit that decays the further short the candidate falls,
    // rather than a hard zero — still transparent via the breakdown.
    return { score: Math.max(0, candidateYears / min), meetsMinimum: false };
  }
  if (maxRequired !== undefined && candidateYears > maxRequired * 1.5) {
    // Very overqualified candidates score slightly lower than a perfect fit.
    return { score: 0.85, meetsMinimum: true };
  }
  return { score: 1, meetsMinimum: true };
}

function scoreQualifications(
  required: string[],
  candidateQualifications: string[]
): { score: number; matched: string[]; missing: string[] } {
  if (required.length === 0) {
    return { score: 1, matched: [], missing: [] };
  }
  const candidateSet = new Set(candidateQualifications.map(normalize));
  const matched = required.filter((q) => candidateSet.has(normalize(q)));
  const missing = required.filter((q) => !candidateSet.has(normalize(q)));
  return { score: matched.length / required.length, matched, missing };
}

export function scoreCandidate(jd: JDRequirements, candidate: CandidateFields): ScoreBreakdown {
  const requiredSkillResult = scoreSkills(jd.requiredSkills, candidate.extractedSkills);
  const preferredSkillResult = scoreSkills(jd.preferredSkills, candidate.extractedSkills);
  const experienceResult = scoreExperience(
    candidate.totalExperienceYears,
    jd.minExperienceYears,
    jd.maxExperienceYears
  );
  const qualificationResult = scoreQualifications(jd.requiredQualifications, candidate.qualifications);

  const skillsScore = requiredSkillResult.score * 0.8 + preferredSkillResult.score * 0.2;

  const totalScore =
    skillsScore * (WEIGHTS.requiredSkills + WEIGHTS.preferredSkills) +
    experienceResult.score * WEIGHTS.experience +
    qualificationResult.score * WEIGHTS.qualifications;

  const explanation: string[] = [];
  if (requiredSkillResult.missing.length > 0) {
    explanation.push(`Missing required skills: ${requiredSkillResult.missing.join(", ")}`);
  }
  if (requiredSkillResult.matched.length > 0) {
    explanation.push(`Matched required skills: ${requiredSkillResult.matched.join(", ")}`);
  }
  if (!experienceResult.meetsMinimum) {
    explanation.push(
      `Experience (${candidate.totalExperienceYears ?? "unknown"} yrs) is below the required minimum (${jd.minExperienceYears ?? "n/a"} yrs)`
    );
  }
  if (qualificationResult.missing.length > 0) {
    explanation.push(`Missing qualifications: ${qualificationResult.missing.join(", ")}`);
  }

  return {
    totalScore: Math.round(totalScore * 1000) / 1000,
    skills: {
      score: Math.round(skillsScore * 1000) / 1000,
      weight: WEIGHTS.requiredSkills + WEIGHTS.preferredSkills,
      detail: {
        matchedRequired: requiredSkillResult.matched,
        missingRequired: requiredSkillResult.missing,
        matchedPreferred: preferredSkillResult.matched,
      },
    },
    experience: {
      score: Math.round(experienceResult.score * 1000) / 1000,
      weight: WEIGHTS.experience,
      detail: {
        candidateYears: candidate.totalExperienceYears,
        minRequired: jd.minExperienceYears ?? null,
        maxRequired: jd.maxExperienceYears ?? null,
        meetsMinimum: experienceResult.meetsMinimum,
      },
    },
    qualifications: {
      score: Math.round(qualificationResult.score * 1000) / 1000,
      weight: WEIGHTS.qualifications,
      detail: {
        matched: qualificationResult.matched,
        missing: qualificationResult.missing,
      },
    },
    explanation,
  };
}
