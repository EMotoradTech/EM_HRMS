/**
 * Pure, DB-agnostic core of the Document & Approval Workflow Engine.
 *
 * Kept free of Prisma/Express so the state machine (the actual "core logic"
 * called out in the brief's "what to test" section) can be unit tested
 * directly, without a database. `src/services/documentService.ts` wraps
 * this with Prisma persistence.
 */

export type DocumentStatus =
  | "GENERATED"
  | "PENDING_APPROVAL"
  | "REJECTED"
  | "APPROVED"
  | "SENT"
  | "SIGNED"
  | "FILED";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalStep {
  order: number;
  approverEmail: string;
  status: ApprovalStatus;
  comment?: string;
  decidedAt?: string;
}

export interface AuditLogEntry {
  action: string;
  actor: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentInstance {
  id: string;
  templateType: string;
  data: Record<string, unknown>;
  recipientEmail: string;
  status: DocumentStatus;
  renderedBody?: string;
  approvals: ApprovalStep[];
  auditLog: AuditLogEntry[];
  signature?: {
    signerName: string;
    signedAt: string;
    ipAddress?: string;
    provider: string;
  };
}

export class ApprovalEngineError extends Error {}

function audit(
  doc: DocumentInstance,
  action: string,
  actor: string,
  metadata?: Record<string, unknown>
): void {
  doc.auditLog.push({
    action,
    actor,
    timestamp: new Date().toISOString(),
    metadata,
  });
}

/**
 * Create a new document instance with an ordered approval chain.
 * approverEmails[0] must approve before approverEmails[1] can act, etc.
 * (Generic — the caller supplies the chain per document type, not a
 * hardcoded org chart, per the brief.)
 */
export function createDocumentInstance(params: {
  id: string;
  templateType: string;
  data: Record<string, unknown>;
  recipientEmail: string;
  approverEmails: string[];
  renderedBody?: string;
}): DocumentInstance {
  if (params.approverEmails.length === 0) {
    throw new ApprovalEngineError(
      "A document instance requires at least one approver."
    );
  }

  const doc: DocumentInstance = {
    id: params.id,
    templateType: params.templateType,
    data: params.data,
    recipientEmail: params.recipientEmail,
    status: "PENDING_APPROVAL",
    renderedBody: params.renderedBody,
    approvals: params.approverEmails.map((approverEmail, i) => ({
      order: i,
      approverEmail,
      status: "PENDING" as ApprovalStatus,
    })),
    auditLog: [],
  };

  audit(doc, "generated", "system", { templateType: params.templateType });
  return doc;
}

/** The approval step currently awaiting a decision, or undefined if none. */
export function currentStep(doc: DocumentInstance): ApprovalStep | undefined {
  return doc.approvals
    .slice()
    .sort((a, b) => a.order - b.order)
    .find((step) => step.status === "PENDING");
}

export function allApproved(doc: DocumentInstance): boolean {
  return doc.approvals.every((step) => step.status === "APPROVED");
}

export function approveStep(
  doc: DocumentInstance,
  approverEmail: string,
  comment?: string
): DocumentInstance {
  if (doc.status === "REJECTED") {
    throw new ApprovalEngineError(
      "Document was rejected and cannot be approved further."
    );
  }

  const step = currentStep(doc);
  if (!step) {
    throw new ApprovalEngineError("No pending approval step on this document.");
  }
  if (step.approverEmail !== approverEmail) {
    throw new ApprovalEngineError(
      `It is not ${approverEmail}'s turn to approve this document.`
    );
  }

  step.status = "APPROVED";
  step.comment = comment;
  step.decidedAt = new Date().toISOString();
  audit(doc, "approved", approverEmail, { order: step.order, comment });

  if (allApproved(doc)) {
    doc.status = "APPROVED";
    audit(doc, "all_approvals_cleared", "system");
  } else {
    doc.status = "PENDING_APPROVAL";
  }

  return doc;
}

export function rejectStep(
  doc: DocumentInstance,
  approverEmail: string,
  comment?: string
): DocumentInstance {
  if (doc.status === "REJECTED") {
    throw new ApprovalEngineError("Document is already rejected.");
  }

  const step = currentStep(doc);
  if (!step) {
    throw new ApprovalEngineError("No pending approval step on this document.");
  }
  if (step.approverEmail !== approverEmail) {
    throw new ApprovalEngineError(
      `It is not ${approverEmail}'s turn to act on this document.`
    );
  }

  step.status = "REJECTED";
  step.comment = comment;
  step.decidedAt = new Date().toISOString();
  doc.status = "REJECTED";
  audit(doc, "rejected", approverEmail, { order: step.order, comment });

  return doc;
}

/** A document may only be sent once every approval step has cleared. */
export function markSent(doc: DocumentInstance, actor = "system"): DocumentInstance {
  if (!allApproved(doc)) {
    throw new ApprovalEngineError(
      "Document cannot be sent until all approvals are collected."
    );
  }
  doc.status = "SENT";
  audit(doc, "sent", actor, { recipient: doc.recipientEmail });
  return doc;
}

export function markSigned(
  doc: DocumentInstance,
  signature: { signerName: string; ipAddress?: string; provider: string }
): DocumentInstance {
  if (doc.status !== "SENT") {
    throw new ApprovalEngineError(
      "Document must be sent before it can be signed."
    );
  }
  doc.status = "SIGNED";
  doc.signature = {
    signerName: signature.signerName,
    signedAt: new Date().toISOString(),
    ipAddress: signature.ipAddress,
    provider: signature.provider,
  };
  audit(doc, "signed", signature.signerName, { provider: signature.provider });
  return doc;
}

export function markFiled(doc: DocumentInstance, actor = "system"): DocumentInstance {
  if (doc.status !== "SIGNED") {
    throw new ApprovalEngineError("Only a signed document can be filed.");
  }
  doc.status = "FILED";
  audit(doc, "filed", actor);
  return doc;
}
