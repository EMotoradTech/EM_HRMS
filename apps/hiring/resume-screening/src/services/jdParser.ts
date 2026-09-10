import { JDRequirements } from "../types";

// Free-text JDs vary a lot in format, so this looks for common section
// headers rather than trying to fully understand the prose. Callers who
// already have structured fields (e.g. a form in the HR tool) should skip
// this and build a JDRequirements object directly instead.

const SECTION_HEADERS: Record<string, RegExp> = {
  requiredSkills: /(required skills|must[- ]have skills|core skills)\s*[:\-]/i,
  preferredSkills: /(preferred skills|good to have|nice to have)\s*[:\-]/i,
  requiredQualifications: /(qualifications?|education)\s*[:\-]/i,
};

const EXPERIENCE_RANGE_RE = /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*years?/i;
const EXPERIENCE_MIN_RE = /(\d+(?:\.\d+)?)\+?\s*years?/i;

function extractListAfterHeader(text: string, header: RegExp): string[] {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => header.test(line));
  if (headerIndex === -1) return [];

  const items: string[] = [];
  // Same-line content after the header (e.g. "Required Skills: Node, SQL")
  const sameLineMatch = lines[headerIndex].split(/[:\-]/).slice(1).join(":");
  if (sameLineMatch && sameLineMatch.trim()) {
    items.push(...splitItems(sameLineMatch));
  }

  // Subsequent bullet/comma-separated lines until the next blank line or header.
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) break;
    if (Object.values(SECTION_HEADERS).some((h) => h.test(line))) break;
    items.push(...splitItems(line.replace(/^[-*•]\s*/, "")));
  }

  return items;
}

function splitItems(segment: string): string[] {
  return segment
    .split(/,|•|\band\b/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractExperienceRange(text: string): { min?: number; max?: number } {
  const rangeMatch = text.match(EXPERIENCE_RANGE_RE);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }
  const minMatch = text.match(EXPERIENCE_MIN_RE);
  if (minMatch) {
    return { min: parseFloat(minMatch[1]) };
  }
  return {};
}

export function parseFreeTextJD(title: string, rawText: string): JDRequirements {
  const requiredSkills = extractListAfterHeader(rawText, SECTION_HEADERS.requiredSkills);
  const preferredSkills = extractListAfterHeader(rawText, SECTION_HEADERS.preferredSkills);
  const requiredQualifications = extractListAfterHeader(
    rawText,
    SECTION_HEADERS.requiredQualifications
  );
  const { min, max } = extractExperienceRange(rawText);

  return {
    title,
    rawText,
    requiredSkills,
    preferredSkills,
    requiredQualifications,
    minExperienceYears: min,
    maxExperienceYears: max,
    keywords: [],
  };
}

export function normalizeStructuredJD(input: Partial<JDRequirements> & { title: string }): JDRequirements {
  return {
    title: input.title,
    rawText: input.rawText,
    requiredSkills: input.requiredSkills ?? [],
    preferredSkills: input.preferredSkills ?? [],
    requiredQualifications: input.requiredQualifications ?? [],
    minExperienceYears: input.minExperienceYears,
    maxExperienceYears: input.maxExperienceYears,
    keywords: input.keywords ?? [],
  };
}
