import { checkAccess, Actor, VaultAction, VaultDocumentMeta } from "../lib/accessControl";

export class AccessDeniedError extends Error {}

export interface VaultDocumentListItem extends VaultDocumentMeta {
  documentType: string;
  associatedPerson?: string;
  createdAt: Date;
}

export interface AuditRecordInput {
  documentId: string;
  actorEmail: string;
  actorRole: string;
  action: VaultAction;
  allowed: boolean;
  reason: string;
}

/**
 * Storage-agnostic repository interface. `PrismaVaultRepository` (below)
 * implements this against Postgres; tests use a simple in-memory fake so
 * the service's access-control + audit-logging behavior is verifiable
 * without a database.
 */
export interface VaultRepository {
  getDocument(id: string): Promise<VaultDocumentMeta | null>;
  recordAudit(entry: AuditRecordInput): Promise<void>;
  createDocument(input: {
    owner: string;
    documentType: string;
    associatedPerson?: string;
    storageRef: string;
  }): Promise<VaultDocumentMeta>;
  shareDocument(documentId: string, granteeEmail: string): Promise<void>;
  deleteDocument(documentId: string): Promise<void>;
  getAuditLog(documentId: string): Promise<AuditRecordInput[]>;
  listDocuments(): Promise<VaultDocumentListItem[]>;
}

export class VaultService {
  constructor(private repo: VaultRepository) {}

  private async enforce(
    actor: Actor,
    doc: VaultDocumentMeta,
    action: VaultAction
  ): Promise<void> {
    const decision = checkAccess(actor, doc, action);
    await this.repo.recordAudit({
      documentId: doc.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action,
      allowed: decision.allowed,
      reason: decision.reason,
    });
    if (!decision.allowed) {
      throw new AccessDeniedError(decision.reason);
    }
  }

  async store(
    actor: Actor,
    input: {
      documentType: string;
      associatedPerson?: string;
      storageRef: string;
    }
  ): Promise<VaultDocumentMeta> {
    if (actor.role !== "HR") {
      throw new AccessDeniedError("Only HR can store documents in the vault");
    }
    const doc = await this.repo.createDocument({
      owner: actor.email,
      documentType: input.documentType,
      associatedPerson: input.associatedPerson,
      storageRef: input.storageRef,
    });
    await this.repo.recordAudit({
      documentId: doc.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: "WRITE",
      allowed: true,
      reason: "Document created",
    });
    return doc;
  }

  async read(actor: Actor, documentId: string): Promise<VaultDocumentMeta> {
    const doc = await this.repo.getDocument(documentId);
    if (!doc) throw new Error("Document not found");
    await this.enforce(actor, doc, "READ");
    return doc;
  }

  async share(actor: Actor, documentId: string, granteeEmail: string): Promise<void> {
    const doc = await this.repo.getDocument(documentId);
    if (!doc) throw new Error("Document not found");
    await this.enforce(actor, doc, "SHARE");
    await this.repo.shareDocument(documentId, granteeEmail);
  }

  async delete(actor: Actor, documentId: string): Promise<void> {
    const doc = await this.repo.getDocument(documentId);
    if (!doc) throw new Error("Document not found");
    await this.enforce(actor, doc, "DELETE");
    await this.repo.deleteDocument(documentId);
  }

  async getAuditLog(documentId: string): Promise<AuditRecordInput[]> {
    return this.repo.getAuditLog(documentId);
  }

  /** Every document in the vault — HR-only, same default-deny rule as everything else here. */
  async list(actor: Actor): Promise<VaultDocumentListItem[]> {
    if (actor.role !== "HR") {
      throw new AccessDeniedError("Only HR can list vault documents");
    }
    return this.repo.listDocuments();
  }
}
