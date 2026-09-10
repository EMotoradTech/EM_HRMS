import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  ApprovalEngineError,
  DocumentInstance as EngineDoc,
  approveStep,
  createDocumentInstance,
  markFiled,
  markSent,
  markSigned,
  rejectStep,
} from "../lib/approvalEngine";
import { renderTemplate } from "../lib/templateEngine";
import { EmailSender } from "../lib/emailSender";
import { ESignProvider } from "../lib/esign";

/**
 * Loads a DocumentInstance + its approvals/audit log from Prisma into the
 * plain-object shape the pure engine operates on, runs the requested
 * transition, then persists every changed field + new audit entries back.
 * This keeps the state machine itself (approvalEngine.ts) fully DB-free
 * and unit-testable, while this class is the thin, harder-to-unit-test
 * glue — exercised via integration/manual testing instead.
 */
export class DocumentService {
  constructor(
    private prisma: PrismaClient,
    private emailSender: EmailSender,
    private esignProvider: ESignProvider
  ) {}

  async createDocument(input: {
    templateType: string;
    data: Record<string, unknown>;
    recipientEmail: string;
    approverEmails: string[];
  }) {
    const renderedBody = renderTemplate(input.templateType, input.data);
    const id = randomUUID();
    const engineDoc = createDocumentInstance({
      id,
      templateType: input.templateType,
      data: input.data,
      recipientEmail: input.recipientEmail,
      approverEmails: input.approverEmails,
      renderedBody,
    });

    return this.prisma.documentInstance.create({
      data: {
        id: engineDoc.id,
        templateType: engineDoc.templateType,
        data: engineDoc.data as any,
        recipientEmail: engineDoc.recipientEmail,
        status: engineDoc.status as any,
        renderedBody: engineDoc.renderedBody,
        approvals: {
          create: engineDoc.approvals.map((a) => ({
            order: a.order,
            approverEmail: a.approverEmail,
            status: a.status as any,
          })),
        },
        auditLog: {
          create: engineDoc.auditLog.map((entry) => ({
            action: entry.action,
            actor: entry.actor,
            metadata: entry.metadata as any,
          })),
        },
      },
      include: { approvals: true, auditLog: true },
    });
  }

  private async loadEngineDoc(documentId: string): Promise<EngineDoc> {
    const record = await this.prisma.documentInstance.findUniqueOrThrow({
      where: { id: documentId },
      include: { approvals: true, auditLog: true, signature: true },
    });

    return {
      id: record.id,
      templateType: record.templateType,
      data: record.data as Record<string, unknown>,
      recipientEmail: record.recipientEmail,
      status: record.status as EngineDoc["status"],
      renderedBody: record.renderedBody ?? undefined,
      approvals: record.approvals.map((a: (typeof record.approvals)[number]) => ({
        order: a.order,
        approverEmail: a.approverEmail,
        status: a.status as EngineDoc["approvals"][number]["status"],
        comment: a.comment ?? undefined,
        decidedAt: a.decidedAt?.toISOString(),
      })),
      auditLog: record.auditLog.map((e: (typeof record.auditLog)[number]) => ({
        action: e.action,
        actor: e.actor,
        timestamp: e.timestamp.toISOString(),
        metadata: (e.metadata as Record<string, unknown>) ?? undefined,
      })),
      signature: record.signature
        ? {
            signerName: record.signature.signerName,
            signedAt: record.signature.signedAt.toISOString(),
            ipAddress: record.signature.ipAddress ?? undefined,
            provider: record.signature.provider,
          }
        : undefined,
    };
  }

  private async persist(doc: EngineDoc, previousAuditCount: number) {
    const newAuditEntries = doc.auditLog.slice(previousAuditCount);

    await this.prisma.$transaction([
      this.prisma.documentInstance.update({
        where: { id: doc.id },
        data: { status: doc.status as any },
      }),
      ...doc.approvals.map((a) =>
        this.prisma.approvalStep.updateMany({
          where: { documentId: doc.id, order: a.order },
          data: {
            status: a.status as any,
            comment: a.comment,
            decidedAt: a.decidedAt ? new Date(a.decidedAt) : null,
          },
        })
      ),
      ...(newAuditEntries.length
        ? [
            this.prisma.auditLogEntry.createMany({
              data: newAuditEntries.map((e) => ({
                documentId: doc.id,
                action: e.action,
                actor: e.actor,
                metadata: e.metadata as any,
              })),
            }),
          ]
        : []),
    ]);
  }

  async approve(documentId: string, approverEmail: string, comment?: string) {
    const doc = await this.loadEngineDoc(documentId);
    const previousAuditCount = doc.auditLog.length;
    approveStep(doc, approverEmail, comment);
    await this.persist(doc, previousAuditCount);
    return doc;
  }

  async reject(documentId: string, approverEmail: string, comment?: string) {
    const doc = await this.loadEngineDoc(documentId);
    const previousAuditCount = doc.auditLog.length;
    rejectStep(doc, approverEmail, comment);
    await this.persist(doc, previousAuditCount);
    return doc;
  }

  async send(documentId: string) {
    const doc = await this.loadEngineDoc(documentId);
    const previousAuditCount = doc.auditLog.length;
    markSent(doc);
    await this.persist(doc, previousAuditCount);
    await this.emailSender.send(
      doc.recipientEmail,
      `Your ${doc.templateType} from EMotorad`,
      doc.renderedBody ?? ""
    );
    return doc;
  }

  async sign(documentId: string, signerName: string, ipAddress?: string) {
    const doc = await this.loadEngineDoc(documentId);
    const previousAuditCount = doc.auditLog.length;
    const capture = await this.esignProvider.capture({ signerName, ipAddress });
    markSigned(doc, capture);
    await this.persist(doc, previousAuditCount);

    if (doc.signature) {
      await this.prisma.signatureRecord.create({
        data: {
          documentId: doc.id,
          signerName: doc.signature.signerName,
          ipAddress: doc.signature.ipAddress,
          provider: doc.signature.provider,
        },
      });
    }
    return doc;
  }

  async file(documentId: string) {
    const doc = await this.loadEngineDoc(documentId);
    const previousAuditCount = doc.auditLog.length;
    markFiled(doc);
    await this.persist(doc, previousAuditCount);
    return doc;
  }

  async getStatus(documentId: string) {
    return this.loadEngineDoc(documentId);
  }
}

export { ApprovalEngineError };
