import { CandidateFields } from "../types";

// Known skill vocabulary to match against resume text. This is intentionally
// a flat list rather than an ML/NER model — keeps ranking explainable, and is
// easy for HR to extend as new roles come up.
export const SKILL_VOCABULARY = [
  "javascript", "typescript", "node.js", "nodejs", "express", "react", "vue",
  "angular", "python", "django", "flask", "java", "spring", "c++", "c#",
  "go", "golang", "rust", "postgresql", "postgres", "mysql", "mongodb",
  "redis", "docker", "kubernetes", "aws", "azure", "gcp", "git", "ci/cd",
  "graphql", "rest api", "prisma", "sql", "html", "css", "sass",
  "next.js", "nextjs", "embedded c", "firmware", "cad", "solidworks",
  "autocad", "matlab", "plc", "electrical design", "battery management systems",
  "bms", "motor control", "power electronics", "supply chain", "procurement",
  "vendor management", "quality control", "six sigma", "lean manufacturing",
];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d{1,3}[\s-]?)?\d{10}\b/;
const EXPERIENCE_RE = /(\d+(?:\.\d+)?)\+?\s*years?\s*(?:of)?\s*(?:relevant\s*|professional\s*|work\s*)?experience/i;

const QUALIFICATION_PATTERNS = [
  "b.tech", "b.e.", "be ", "bachelor of engineering", "bachelor of technology",
  "m.tech", "m.e.", "master of engineering", "master of technology",
  "mba", "bca", "mca", "b.sc", "m.sc", "diploma", "phd", "ph.d",
];

export function extractFieldsFromText(rawText: string): CandidateFields {
  const text = rawText.replace(/\r\n/g, "\n");
  const lowerText = text.toLowerCase();

  const email = text.match(EMAIL_RE)?.[0] ?? null;
  const phone = text.match(PHONE_RE)?.[0] ?? null;

  // Heuristic: the candidate's name is usually the first non-empty line that
  // isn't an email/phone/section header.
  const name =
    text
      .split("\n")
      .map((l) => l.trim())
      .find((line) => line.length > 0 && line.length < 60 && !EMAIL_RE.test(line) && !PHONE_RE.test(line)) ?? null;

  const extractedSkills = SKILL_VOCABULARY.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );

  const experienceMatch = text.match(EXPERIENCE_RE);
  const totalExperienceYears = experienceMatch ? parseFloat(experienceMatch[1]) : null;

  const qualifications = QUALIFICATION_PATTERNS.filter((q) => lowerText.includes(q));

  return {
    name,
    email,
    phone,
    extractedSkills,
    totalExperienceYears,
    qualifications,
    rawText: text,
  };
}

export async function extractTextFromFile(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const pdfParse = require("pdf-parse");
    const result = await pdfParse(buffer);
    return result.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported resume file type: ${mimeType}`);
}

export async function parseResumeFile(buffer: Buffer, mimeType: string): Promise<CandidateFields> {
  const text = await extractTextFromFile(buffer, mimeType);
  return extractFieldsFromText(text);
}
