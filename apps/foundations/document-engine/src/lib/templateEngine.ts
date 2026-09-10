/**
 * Minimal template rendering: {{field}} substitution over a plain-text/HTML
 * template, parameterized by candidate/employee data. Swappable for a
 * full Handlebars setup later without changing callers — the engine's
 * public surface (renderTemplate) is intentionally tiny.
 */

export const TEMPLATES: Record<string, string> = {
  "offer-letter": `Dear {{candidateName}},

We are pleased to offer you the position of {{designation}} at EMotorad,
reporting to {{reportingManager}}, with a start date of {{startDate}}.

Annual CTC: {{ctc}}
Location: {{location}}

Please sign and return this letter to confirm your acceptance.

Regards,
EMotorad HR`,

  "appointment-letter": `Dear {{candidateName}},

Further to your acceptance of our offer, this confirms your appointment as
{{designation}} at EMotorad, effective {{startDate}}.

This letter, together with your offer letter, forms your terms of
employment.

Regards,
EMotorad HR`,

  "relieving-letter": `Dear {{employeeName}},

This is to confirm that your employment with EMotorad as {{designation}}
ends on {{lastWorkingDay}}. We wish you the best in your future endeavors.

Regards,
EMotorad HR`,
};

export class TemplateNotFoundError extends Error {}

export function renderTemplate(
  templateType: string,
  data: Record<string, unknown>
): string {
  const template = TEMPLATES[templateType];
  if (!template) {
    throw new TemplateNotFoundError(
      `No template registered for type "${templateType}". Known types: ${Object.keys(
        TEMPLATES
      ).join(", ")}`
    );
  }

  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, field: string) => {
    const value = data[field];
    return value === undefined || value === null ? `[[${field}]]` : String(value);
  });
}
