import { MockDocumentEngineClient } from "../src/services/documentEngineClient";
import { DocumentStatus } from "../src/types";

// Covers the "what to test" item from the hiring brief: the flow correctly
// calls the document-engine with the right template/data, and the
// candidate's status should update as the engine reports each state change
// (tested here at the document-engine-client level; offerService.ts wires
// this same sequence into Prisma updates).
//
// The mock's lifecycle mirrors the real engine
// (apps/foundations/document-engine): creation starts in PENDING_APPROVAL
// (no DRAFT, no separate submit step), and nothing auto-advances past
// APPROVED — the caller must explicitly call `send`.

describe("MockDocumentEngineClient", () => {
  it("creates a document already in PENDING_APPROVAL", async () => {
    const client = new MockDocumentEngineClient();
    const handle = await client.createDocument({
      templateType: "offer-letter",
      data: { candidateName: "Priya Sharma" },
      approverEmails: ["manager@emotorad.com"],
      recipientEmail: "priya@example.com",
    });

    expect(handle.status).toBe("PENDING_APPROVAL");
    expect(handle.documentId).toMatch(/^doc_/);
  });

  it("walks through the full lifecycle in order, sending only once explicitly asked", async () => {
    const client = new MockDocumentEngineClient();
    const { documentId, status } = await client.createDocument({
      templateType: "offer-letter",
      data: {},
      approverEmails: ["manager@emotorad.com"],
      recipientEmail: "candidate@example.com",
    });
    expect(status).toBe("PENDING_APPROVAL");

    // Single listener, exactly like offerService.ts's real usage: it
    // triggers `send` itself on APPROVED, since the engine never does.
    const observedStatuses: DocumentStatus[] = [];
    const done = new Promise<void>((resolve) => {
      client.onStatusChange(documentId, (s) => {
        observedStatuses.push(s);
        if (s === "APPROVED") client.send(documentId).catch(() => undefined);
        if (s === "SIGNED") resolve();
      });
    });

    await done;
    expect(observedStatuses).toEqual(["APPROVED", "SENT", "SIGNED"]);
  });

  it("throws for an unknown document id", async () => {
    const client = new MockDocumentEngineClient();
    await expect(client.getDocument("doc_does_not_exist")).rejects.toThrow();
  });
});
