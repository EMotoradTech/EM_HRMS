export interface JDRequirements {
  title: string;
  rawText?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  minExperienceYears?: number;
  maxExperienceYears?: number;
  requiredQualifications: string[];
  keywords: string[];
}

export interface CandidateFields {
  name: string | null;
  email: string | null;
  phone: string | null;
  extractedSkills: string[];
  totalExperienceYears: number | null;
  qualifications: string[];
  rawText: string;
}

export interface SkillScoreDetail {
  matchedRequired: string[];
  missingRequired: string[];
  matchedPreferred: string[];
}

export interface ExperienceScoreDetail {
  candidateYears: number | null;
  minRequired: number | null;
  maxRequired: number | null;
  meetsMinimum: boolean;
}

export interface QualificationScoreDetail {
  matched: string[];
  missing: string[];
}

export interface ScoreBreakdown {
  totalScore: number;
  skills: {
    score: number;
    weight: number;
    detail: SkillScoreDetail;
  };
  experience: {
    score: number;
    weight: number;
    detail: ExperienceScoreDetail;
  };
  qualifications: {
    score: number;
    weight: number;
    detail: QualificationScoreDetail;
  };
  explanation: string[];
}
