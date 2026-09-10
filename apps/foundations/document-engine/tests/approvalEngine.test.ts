import {
  createDocumentInstance,
  approveStep,
  rejectStep,
  markSent,
  markSigned,
  markFiled,
  allApproved,
  ApprovalEngineError,
} from "../src/lib/approvalEngine";

function newDoc(approverEmails = ["manager@emotorad.com", "hr-head@emotorad.com"]) {
  return createDocumentInstance({
    id: "doc-1",
    templateType: "offer-letter",
    data: { candidateName: "Asha Rao" },
    recipientEmail: "asha@example.com",
    approverEmails,
  });
}

describe("document creation", () => {
  it("starts PENDING_APPROVAL with a pending step per approver, in order", () => {
    const doc = newDoc();
    expect(doc.status).toBe("PENDING_APPROVAL");
    expect(doc.approvals).toHaveLength(2);
    expect(doc.approvals.every((a) => a.status === "PENDING")).toBe(true);
    expect(doc.auditLog).toHaveLength(1);
    expect(doc.auditLog[0].action).toBe("generated");
  });

  it("rejects a document with no approvers", () => {
    expect(() =>
      createDocumentInstance({
        id: "doc-2",
        templateType: "offer-letter",
        data: {},
        recipientEmail: "x@example.com",
        approverEmails: [],
      })
    ).toThrow(ApprovalEngineError);
  });
});

describe("approval requirement before sending", () => {
  it("cannot be sent until all approvals are collected", () => {
    const doc = newDoc();
    expect(() => markSent(doc)).toThrow(ApprovalEngineError);
    expect(allApproved(doc)).toBe(false);
  });

  it("can be sent once every approver has approved, in order", () => {
    const doc = newDoc();
    approveStep(doc, "manager@emotorad.com");
    expect(allApproved(doc)).toBe(false); // second step still pending
    approveStep(doc, "hr-head@emotorad.com");
    expect(allApproved(doc)).toBe(true);
    expect(doc.status).toBe("APPROVED");

    const sent = markSent(doc);
    expect(sent.status).toBe("SENT");
    expect(sent.auditLog.map((e) => e.action)).toEqual([
      "generated",
      "approved",
      "approved",
      "all_approvals_cleared",
      "sent",
    ]);
  });

  it("rejects an approval attempt out of order", () => {
    const doc = newDoc();
    expect(() => approveStep(doc, "hr-head@emotorad.com")).toThrow(
      ApprovalEngineError
    );
  });
});

describe("rejection blocks progression", () => {
  it("halts the document on rejection at any step, and further approval is impossible", () => {
    const doc = newDoc();
    approveStep(doc, "manager@emotorad.com");
    const rejected = rejectStep(doc, "hr-head@emotorad.com", "Comp mismatch");
    expect(rejected.status).toBe("REJECTED");
    expect(() => approveStep(doc, "hr-head@emotorad.com")).toThrow(
      ApprovalEngineError
    );
    expect(() => markSent(doc)).toThrow(ApprovalEngineError);
  });
});

describe("every transition is logged", () => {
  it("records generated -> approved(x2) -> sent -> signed -> filed", () => {
    const doc = newDoc();
    approveStep(doc, "manager@emotorad.com");
    approveStep(doc, "hr-head@emotorad.com");
    markSent(doc);
    markSigned(doc, { signerName: "Asha Rao", provider: "standalone" });
    markFiled(doc);

    expect(doc.auditLog.map((e) => e.action)).toEqual([
      "generated",
      "approved",
      "approved",
      "all_approvals_cleared",
      "sent",
      "signed",
      "filed",
    ]);
    expect(doc.status).toBe("FILED");
  });

  it("cannot sign before sending, or file before signing", () => {
    const doc = newDoc();
    approveStep(doc, "manager@emotorad.com");
    approveStep(doc, "hr-head@emotorad.com");
    expect(() =>
      markSigned(doc, { signerName: "Asha Rao", provider: "standalone" })
    ).toThrow(ApprovalEngineError);

    markSent(doc);
    expect(() => markFiled(doc)).toThrow(ApprovalEngineError);
  });
});
