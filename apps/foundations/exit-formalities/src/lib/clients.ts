import fetch from "node-fetch";

/**
 * Thin HTTP clients for the two services this app wires together.
 * exit-formalities reuses document-engine "the same pattern as offer
 * letters" (per the brief) rather than reimplementing document generation,
 * and calls asset-management to check for unreturned assets before
 * allowing an exit to complete.
 */

export class DocumentEngineClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  private headers() {
    return { "Content-Type": "application/json", "x-internal-api-key": this.apiKey };
  }

  async createRelievingLetter(input: {
    employeeName: string;
    designation: string;
    lastWorkingDay: string;
    recipientEmail: string;
    approverEmails: string[];
  }) {
    const res = await fetch(`${this.baseUrl}/documents`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        templateType: "relieving-letter",
        data: input,
        recipientEmail: input.recipientEmail,
        approverEmails: input.approverEmails,
      }),
    });
    if (!res.ok) throw new Error(`document-engine createDocument failed: ${res.status}`);
    return res.json() as Promise<{ id: string; status: string }>;
  }

  async getStatus(documentId: string) {
    const res = await fetch(`${this.baseUrl}/documents/${documentId}/status`, {
      headers: this.headers(),
    });
    if (!res.ok) throw new Error(`document-engine getStatus failed: ${res.status}`);
    return res.json() as Promise<{ status: string }>;
  }
}

export class AssetManagementClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async unreturnedAssetsFor(employeeEmail: string): Promise<string[]> {
    const res = await fetch(
      `${this.baseUrl}/employees/${encodeURIComponent(employeeEmail)}/assets`,
      { headers: { "x-internal-api-key": this.apiKey } }
    );
    if (!res.ok) throw new Error(`asset-management lookup failed: ${res.status}`);
    const assets = (await res.json()) as { identifier: string }[];
    return assets.map((a) => a.identifier);
  }
}
