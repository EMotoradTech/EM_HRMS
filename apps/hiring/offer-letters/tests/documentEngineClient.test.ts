import { MockDocumentEngineClient } from "../src/services/documentEngineClient";
import { DocumentStatus } from "../src/types";

// Covers the "what to test" item from the hiring brief: the flow correctly
// calls the document-engine (mock) with the right template/data, and the
// candidate's status should update as the engine reports each state change
// (tested here at the document-engine-client level; offerService.ts wires
// this same sequence into Prisma updates).

describe("MockDocumentEngineClient", () => {
  it("creates a document in DRAFT with the given template and data", async () => {
    const client = new MockDocumentEngineClient();
    const handle = await client.createDocument({
      templateId: "offer-letter-v1",
      data: { candidateName: "Priya Sharma" },
      approvalChain: [{ approverEmail: "manager@emotorad.com", order: 1 }],
      recipientEmail: "priya@example.com",
    });

    expect(handle.status).toBe("DRAFT");
    expect(handle.documentId).toMatch(/^doc_/);
  });

  it("walks through the full lifecycle in order once submitted for approval", async () => {
    const client = new MockDocumentEngineClient();
    const { documentId } = await client.createDocument({
      templateId: "offer-letter-v1",
      data: {},
      approvalChain: [{ approverEmail: "manager@emotorad.com", order: 1 }],
      recipientEmail: "candidate@example.com",
    });

    const observedStatuses: DocumentStatus[] = [];
    const done = new Promise<void>((resolve) => {
      client.onStatusChange(documentId, (status) => {
        observedStatuses.push(status);
        if (status === "SIGNED") resolve();
      });
    });

    await client.submitForApproval(documentId);
    await done;

    expect(observedStatuses).toEqual(["PENDING_APPROVAL", "APPROVED", "SENT", "SIGNED"]);
  });

  it("throws for an unknown document id", async () => {
    const client = new MockDocumentEngineClient();
    await expect(client.getDocument("doc_does_not_exist")).rejects.toThrow();
  });
});
