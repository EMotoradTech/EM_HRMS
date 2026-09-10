// Pure, DB-free approval-chain logic. Kept separate from documentService.ts
// (which talks to Postgres) specifically so the core rules — "all approvals
// required before send," "rejection blocks progression" — can be unit tested
// without a database, per the app's "definition of done" testing requirement.

export type ApprovalDecisionValue = "PENDING" | "APPROVED" | "REJECTED";

export type DocumentStatusValue =
  | "GENERATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "SIGNED"
  | "FILED";

export interface ApprovalRecord {
  stepIndex: number;
  approverEmail: string;
  decision: ApprovalDecisionValue;
}

/** Builds the ordered, all-PENDING approval chain for a new document instance. */
export function buildApprovalChain(approverChain: string[]): ApprovalRecord[] {
  return approverChain.map((approverEmail, stepIndex) => ({
    stepIndex,
    approverEmail,
    decision: "PENDING" as const,
  }));
}

/** A document with no configured approvers is auto-approved (edge case, not the norm). */
export function initialStatusFor(approverChain: string[]): DocumentStatusValue {
  return approverChain.length === 0 ? "APPROVED" : "PENDING_APPROVAL";
}

export interface ApprovalDecisionResult {
  updatedApprovals: ApprovalRecord[];
  nextApprovalIndex: number;
  newStatus: DocumentStatusValue;
  isFullyApproved: boolean;
  isRejected: boolean;
}

/**
 * Applies one approver's decision to the chain.
 * - Only the current step (currentApprovalIndex) may be decided — approvals are strictly sequential.
 * - A REJECTED decision at any step halts progression permanently (status -> REJECTED).
 * - An APPROVED decision on the last step moves the document to APPROVED (ready to send).
 * - An APPROVED decision on a non-last step advances currentApprovalIndex by one.
 */
export function applyApprovalDecision(
  approvals: ApprovalRecord[],
  currentApprovalIndex: number,
  stepIndex: number,
  approverEmail: string,
  decision: "APPROVED" | "REJECTED"
): ApprovalDecisionResult {
  if (stepIndex !== currentApprovalIndex) {
    throw new Error(
      `Cannot decide step ${stepIndex}: document is currently awaiting step ${currentApprovalIndex}`
    );
  }

  const step = approvals.find((a) => a.stepIndex === stepIndex);
  if (!step) {
    throw new Error(`No approval step ${stepIndex} exists for this document`);
  }
  if (step.decision !== "PENDING") {
    throw new Error(`Step ${stepIndex} has already been decided (${step.decision})`);
  }
  if (step.approverEmail.toLowerCase() !== approverEmail.toLowerCase()) {
    throw new Error(
      `Step ${stepIndex} must be decided by ${step.approverEmail}, not ${approverEmail}`
    );
  }

  const updatedApprovals = approvals.map((a) =>
    a.stepIndex === stepIndex ? { ...a, decision } : a
  );

  if (decision === "REJECTED") {
    return {
      updatedApprovals,
      nextApprovalIndex: currentApprovalIndex,
      newStatus: "REJECTED",
      isFullyApproved: false,
      isRejected: true,
    };
  }

  const isLastStep = stepIndex === approvals.length - 1;
  if (isLastStep) {
    return {
      updatedApprovals,
      nextApprovalIndex: currentApprovalIndex,
      newStatus: "APPROVED",
      isFullyApproved: true,
      isRejected: false,
    };
  }

  return {
    updatedApprovals,
    nextApprovalIndex: currentApprovalIndex + 1,
    newStatus: "PENDING_APPROVAL",
    isFullyApproved: false,
    isRejected: false,
  };
}
