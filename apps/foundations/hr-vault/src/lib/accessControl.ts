/**
 * Pure access-control decisions for the HR Vault. Kept DB-free so the
 * "non-HR role is denied" rule (explicitly called out in the brief's
 * "what to test" section) is unit-testable directly.
 */

export type VaultAction = "READ" | "WRITE" | "SHARE" | "DELETE";

export interface Actor {
  email: string;
  role: "HR" | "EMPLOYEE" | "CANDIDATE" | string;
}

export interface VaultDocumentMeta {
  id: string;
  owner: string;
  sharedWith: string[]; // emails granted access to this specific document
}

export interface AccessDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Default-deny model: only the HR role may read/write/share/delete, EXCEPT
 * a non-HR actor may READ a document that has been explicitly shared to
 * their email (e.g. a candidate downloading their own signed letter).
 */
export function checkAccess(
  actor: Actor,
  doc: VaultDocumentMeta,
  action: VaultAction
): AccessDecision {
  if (actor.role === "HR") {
    return { allowed: true, reason: "HR role has full access" };
  }

  if (action === "READ" && doc.sharedWith.includes(actor.email)) {
    return {
      allowed: true,
      reason: "Document was explicitly shared with this recipient",
    };
  }

  return {
    allowed: false,
    reason:
      action === "READ"
        ? "Non-HR actor and document was not shared with this recipient"
        : `Non-HR actors cannot perform ${action}`,
  };
}
