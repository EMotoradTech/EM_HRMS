import { PrismaClient } from "@prisma/client";
import { VaultDocumentMeta } from "../lib/accessControl";
import { AuditRecordInput, VaultDocumentListItem, VaultRepository } from "./vaultService";

export class PrismaVaultRepository implements VaultRepository {
  constructor(private prisma: PrismaClient) {}

  async getDocument(id: string): Promise<VaultDocumentMeta | null> {
    const doc = await this.prisma.vaultDocument.findUnique({
      where: { id },
      include: { sharedWith: true },
    });
    if (!doc) return null;
    return {
      id: doc.id,
      owner: doc.owner,
      sharedWith: doc.sharedWith.map((g: (typeof doc.sharedWith)[number]) => g.granteeEmail),
    };
  }

  async createDocument(input: {
    owner: string;
    documentType: string;
    associatedPerson?: string;
    storageRef: string;
  }): Promise<VaultDocumentMeta> {
    const doc = await this.prisma.vaultDocument.create({ data: input });
    return { id: doc.id, owner: doc.owner, sharedWith: [] };
  }

  async shareDocument(documentId: string, granteeEmail: string): Promise<void> {
    await this.prisma.sharedGrant.upsert({
      where: { documentId_granteeEmail: { documentId, granteeEmail } },
      update: {},
      create: { documentId, granteeEmail, grantedBy: "system" },
    });
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.prisma.vaultDocument.delete({ where: { id: documentId } });
  }

  async recordAudit(entry: AuditRecordInput): Promise<void> {
    await this.prisma.vaultAuditEntry.create({
      data: {
        documentId: entry.documentId,
        actorEmail: entry.actorEmail,
        actorRole: entry.actorRole,
        action: entry.action as any,
        allowed: entry.allowed,
        reason: entry.reason,
      },
    });
  }

  async getAuditLog(documentId: string): Promise<AuditRecordInput[]> {
    const entries = await this.prisma.vaultAuditEntry.findMany({
      where: { documentId },
      orderBy: { timestamp: "asc" },
    });
    return entries.map((e: (typeof entries)[number]) => ({
      documentId: e.documentId,
      actorEmail: e.actorEmail,
      actorRole: e.actorRole,
      action: e.action as any,
      allowed: e.allowed,
      reason: e.reason ?? "",
    }));
  }

  async listDocuments(): Promise<VaultDocumentListItem[]> {
    const docs = await this.prisma.vaultDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { sharedWith: true },
    });
    return docs.map((doc: (typeof docs)[number]) => ({
      id: doc.id,
      owner: doc.owner,
      documentType: doc.documentType,
      associatedPerson: doc.associatedPerson ?? undefined,
      createdAt: doc.createdAt,
      sharedWith: doc.sharedWith.map((g: (typeof doc.sharedWith)[number]) => g.granteeEmail),
    }));
  }
}
