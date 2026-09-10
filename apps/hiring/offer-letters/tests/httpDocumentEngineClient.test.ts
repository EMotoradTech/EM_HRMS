import { HttpDocumentEngineClient } from "../src/services/httpDocumentEngineClient";

// Verifies this client actually matches apps/foundations/document-engine's
// real API (docs/contracts/document-engine-api.md) — endpoint paths, the
// x-internal-api-key auth header, request/response shapes, and the polling
// fallback used in place of a webhook (the real engine doesn't have one).

describe("HttpDocumentEngineClient", () => {
  const baseUrl = "http://localhost:4001";
  const apiKey = "test-key";

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("POSTs /documents with the real contract's field names and auth header", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "doc-123", status: "PENDING_APPROVAL" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new HttpDocumentEngineClient(baseUrl, apiKey);
    const handle = await client.createDocument({
      templateType: "offer-letter",
      data: { candidateName: "Asha Rao" },
      approverEmails: ["manager@emotorad.com", "hr-head@emotorad.com"],
      recipientEmail: "asha@example.com",
    });

    expect(handle).toEqual({ documentId: "doc-123", status: "PENDING_APPROVAL" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/documents`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-internal-api-key": apiKey }),
        body: JSON.stringify({
          templateType: "offer-letter",
          data: { candidateName: "Asha Rao" },
          recipientEmail: "asha@example.com",
          approverEmails: ["manager@emotorad.com", "hr-head@emotorad.com"],
        }),
      })
    );
  });

  it("POSTs /documents/:id/send with no body", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "doc-123", status: "SENT" }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new HttpDocumentEngineClient(baseUrl, apiKey);
    const handle = await client.send("doc-123");

    expect(handle).toEqual({ documentId: "doc-123", status: "SENT" });
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/documents/doc-123/send`,
      expect.objectContaining({ method: "POST", body: undefined })
    );
  });

  it("surfaces the status code and body on a non-ok response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Missing or invalid x-internal-api-key",
    }) as unknown as typeof fetch;

    const client = new HttpDocumentEngineClient(baseUrl, apiKey);
    await expect(client.getDocument("doc-123")).rejects.toThrow(/401/);
  });

  it("polls GET /documents/:id/status, only notifying on changes, and stops at a terminal status", async () => {
    jest.useFakeTimers();
    const statuses = ["PENDING_APPROVAL", "PENDING_APPROVAL", "APPROVED", "SIGNED", "FILED"];
    const fetchMock = jest.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ id: "doc-123", status: statuses.shift() ?? "FILED" }),
    }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new HttpDocumentEngineClient(baseUrl, apiKey, 1000);
    const observed: string[] = [];
    client.onStatusChange("doc-123", (s) => observed.push(s));

    for (let i = 0; i < 5; i++) {
      await jest.advanceTimersByTimeAsync(1000);
    }

    expect(observed).toEqual(["PENDING_APPROVAL", "APPROVED", "SIGNED", "FILED"]);

    const callsAtTerminal = fetchMock.mock.calls.length;
    await jest.advanceTimersByTimeAsync(1000);
    expect(fetchMock.mock.calls.length).toBe(callsAtTerminal);
  });
});
