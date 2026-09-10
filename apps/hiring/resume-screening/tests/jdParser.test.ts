import { normalizeStructuredJD, parseFreeTextJD } from "../src/services/jdParser";

describe("parseFreeTextJD", () => {
  const rawText = `
Backend Engineer

Required Skills: Node.js, PostgreSQL, TypeScript

Preferred Skills: Docker, AWS

Qualifications: B.Tech

3-6 years of experience required.
`;

  it("extracts required and preferred skills from section headers", () => {
    const jd = parseFreeTextJD("Backend Engineer", rawText);
    expect(jd.requiredSkills).toEqual(["Node.js", "PostgreSQL", "TypeScript"]);
    expect(jd.preferredSkills).toEqual(["Docker", "AWS"]);
  });

  it("extracts qualifications", () => {
    const jd = parseFreeTextJD("Backend Engineer", rawText);
    expect(jd.requiredQualifications).toEqual(["B.Tech"]);
  });

  it("extracts an experience range", () => {
    const jd = parseFreeTextJD("Backend Engineer", rawText);
    expect(jd.minExperienceYears).toBe(3);
    expect(jd.maxExperienceYears).toBe(6);
  });

  it("degrades gracefully when a section is missing", () => {
    const jd = parseFreeTextJD("Ops Role", "Some unstructured description with no clear sections.");
    expect(jd.requiredSkills).toEqual([]);
    expect(jd.minExperienceYears).toBeUndefined();
  });
});

describe("normalizeStructuredJD", () => {
  it("fills in defaults for omitted fields", () => {
    const jd = normalizeStructuredJD({ title: "QA Engineer" });
    expect(jd.requiredSkills).toEqual([]);
    expect(jd.preferredSkills).toEqual([]);
    expect(jd.requiredQualifications).toEqual([]);
    expect(jd.keywords).toEqual([]);
  });

  it("passes through provided structured fields unchanged", () => {
    const jd = normalizeStructuredJD({
      title: "QA Engineer",
      requiredSkills: ["selenium"],
      minExperienceYears: 2,
    });
    expect(jd.requiredSkills).toEqual(["selenium"]);
    expect(jd.minExperienceYears).toBe(2);
  });
});
