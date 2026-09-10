/**
 * Pure exit-status state machine. DB-free so the brief's explicit test —
 * "an exit with unreturned assets is correctly blocked/flagged rather
 * than silently marked complete" — is directly unit-testable, without
 * needing the real document-engine or asset-management services.
 */

export type ExitStatus =
  | "INITIATED"
  | "DOCUMENTS_GENERATED"
  | "APPROVALS_CLEARED"
  | "SENT"
  | "SIGNED"
  | "ASSETS_CLEARED"
  | "COMPLETE";

export interface ExitCase {
  id: string;
  employeeEmail: string;
  designation: string;
  lastWorkingDay: string;
  status: ExitStatus;
  documentId?: string;
}

export class ExitStateError extends Error {}
export class ExitBlockedError extends ExitStateError {
  constructor(public blockers: string[]) {
    super(`Exit is blocked: ${blockers.join("; ")}`);
  }
}

const ORDER: ExitStatus[] = [
  "INITIATED",
  "DOCUMENTS_GENERATED",
  "APPROVALS_CLEARED",
  "SENT",
  "SIGNED",
  "ASSETS_CLEARED",
  "COMPLETE",
];

function assertSequential(current: ExitStatus, next: ExitStatus): void {
  const currentIndex = ORDER.indexOf(current);
  const nextIndex = ORDER.indexOf(next);
  if (nextIndex !== currentIndex + 1) {
    throw new ExitStateError(
      `Cannot move exit case from ${current} to ${next} — expected ${ORDER[currentIndex + 1]}.`
    );
  }
}

export function initiateExit(params: {
  id: string;
  employeeEmail: string;
  designation: string;
  lastWorkingDay: string;
}): ExitCase {
  return { ...params, status: "INITIATED" };
}

export function markDocumentsGenerated(exitCase: ExitCase, documentId: string): ExitCase {
  assertSequential(exitCase.status, "DOCUMENTS_GENERATED");
  return { ...exitCase, status: "DOCUMENTS_GENERATED", documentId };
}

export function markApprovalsCleared(exitCase: ExitCase): ExitCase {
  assertSequential(exitCase.status, "APPROVALS_CLEARED");
  return { ...exitCase, status: "APPROVALS_CLEARED" };
}

export function markSent(exitCase: ExitCase): ExitCase {
  assertSequential(exitCase.status, "SENT");
  return { ...exitCase, status: "SENT" };
}

export function markSigned(exitCase: ExitCase): ExitCase {
  assertSequential(exitCase.status, "SIGNED");
  return { ...exitCase, status: "SIGNED" };
}

/**
 * The core rule from the brief: exit formalities must check asset-management
 * for any assets not yet returned by this employee, and treat that as a
 * blocker — never let the exit finish silently while something is
 * outstanding. Only transitions to ASSETS_CLEARED (and, immediately after,
 * COMPLETE) once `unreturnedAssetIdentifiers` is empty; otherwise throws
 * ExitBlockedError naming what's still outstanding, and the case stays at
 * SIGNED.
 */
export function completeExit(
  exitCase: ExitCase,
  unreturnedAssetIdentifiers: string[]
): ExitCase {
  if (exitCase.status !== "SIGNED") {
    throw new ExitStateError(
      `Exit must be SIGNED before it can be completed (currently ${exitCase.status}).`
    );
  }
  if (unreturnedAssetIdentifiers.length > 0) {
    throw new ExitBlockedError(
      unreturnedAssetIdentifiers.map((id) => `asset ${id} not yet returned`)
    );
  }
  return { ...exitCase, status: "COMPLETE" };
}
