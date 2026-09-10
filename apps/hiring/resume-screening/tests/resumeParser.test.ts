import { extractFieldsFromText } from "../src/services/resumeParser";

describe("extractFieldsFromText", () => {
  const sampleResume = `
Priya Sharma
priya.sharma@example.com
+91 9876543210

Summary
Backend engineer with 5 years of experience building services in Node.js
and PostgreSQL, with some exposure to Docker and AWS.

Education
B.Tech, Computer Science
`;

  it("extracts name, email, and phone", () => {
    const fields = extractFieldsFromText(sampleResume);
    expect(fields.name).toBe("Priya Sharma");
    expect(fields.email).toBe("priya.sharma@example.com");
    expect(fields.phone).toContain("9876543210");
  });

  it("extracts known skills mentioned in the text", () => {
    const fields = extractFieldsFromText(sampleResume);
    expect(fields.extractedSkills).toEqual(
      expect.arrayContaining(["node.js", "postgresql", "docker", "aws"])
    );
  });

  it("extracts years of experience", () => {
    const fields = extractFieldsFromText(sampleResume);
    expect(fields.totalExperienceYears).toBe(5);
  });

  it("extracts qualifications", () => {
    const fields = extractFieldsFromText(sampleResume);
    expect(fields.qualifications).toContain("b.tech");
  });

  it("handles resumes with no matching skills or qualifications gracefully", () => {
    const fields = extractFieldsFromText("Just a name\nNo other structured info here.");
    expect(fields.extractedSkills).toEqual([]);
    expect(fields.qualifications).toEqual([]);
    expect(fields.totalExperienceYears).toBeNull();
    expect(fields.email).toBeNull();
  });
});
