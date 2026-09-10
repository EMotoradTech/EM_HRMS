import { renderTemplate, TemplateNotFoundError } from "../src/lib/templateEngine";

describe("renderTemplate", () => {
  it("substitutes known fields into the offer-letter template", () => {
    const body = renderTemplate("offer-letter", {
      candidateName: "Asha Rao",
      designation: "Software Engineer",
      reportingManager: "Kush",
      startDate: "2026-10-01",
      ctc: "12,00,000",
      location: "Pune",
    });
    expect(body).toContain("Dear Asha Rao,");
    expect(body).toContain("Software Engineer");
    expect(body).not.toContain("{{");
  });

  it("leaves an obvious placeholder marker for missing fields, rather than silently blanking them", () => {
    const body = renderTemplate("offer-letter", { candidateName: "Asha Rao" });
    expect(body).toContain("[[designation]]");
  });

  it("throws for an unregistered template type", () => {
    expect(() => renderTemplate("not-a-real-template", {})).toThrow(
      TemplateNotFoundError
    );
  });
});
