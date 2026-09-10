import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import {
  ExitCase,
  initiateExit,
  markDocumentsGenerated,
  markApprovalsCleared,
  markSent,
  markSigned,
  completeExit,
  ExitBlockedError,
} from "../lib/exitEngine";
import { DocumentEngineClient, AssetManagementClient } from "../lib/clients";

function toEngineCase(record: {
  id: string;
  employeeEmail: string;
  designation: string;
  lastWorkingDay: Date;
  status: string;
  documentId: string | null;
}): ExitCase {
  return {
    id: record.id,
    employeeEmail: record.employeeEmail,
    designation: record.designation,
    lastWorkingDay: record.lastWorkingDay.toISOString(),
    status: record.status as ExitCase["status"],
    documentId: record.documentId ?? undefined,
  };
}

export class ExitService {
  constructor(
    private prisma: PrismaClient,
    private documentEngine: DocumentEngineClient,
    private assetManagement: AssetManagementClient
  ) {}

  async initiate(input: {
    employeeEmail: string;
    designation: string;
    lastWorkingDay: string;
    approverEmails: string[];
  }) {
    const record = await this.prisma.exitCase.create({
      data: {
        employeeEmail: input.employeeEmail,
        designation: input.designation,
        lastWorkingDay: new Date(input.lastWorkingDay),
      },
    });

    // Kick off relieving-letter generation via document-engine right away —
    // reusing the engine, not rebuilding document generation here.
    const doc = await this.documentEngine.createRelievingLetter({
      employeeName: input.employeeEmail,
      designation: input.designation,
      lastWorkingDay: input.lastWorkingDay,
      recipientEmail: input.employeeEmail,
      approverEmails: input.approverEmails,
    });

    const updated = markDocumentsGenerated(toEngineCase(record), doc.id);
    await this.prisma.exitCase.update({
      where: { id: record.id },
      data: { status: updated.status, documentId: updated.documentId },
    });
    return updated;
  }

  /** Polls document-engine and advances local status to mirror it. */
  async syncWithDocumentEngine(exitCaseId: string) {
    const record = await this.prisma.exitCase.findUniqueOrThrow({ where: { id: exitCaseId } });
    let exitCase = toEngineCase(record);
    if (!exitCase.documentId) return exitCase;

    const docStatus = await this.documentEngine.getStatus(exitCase.documentId);

    if (docStatus.status === "APPROVED" && exitCase.status === "DOCUMENTS_GENERATED") {
      exitCase = markApprovalsCleared(exitCase);
    }
    if (docStatus.status === "SENT" && exitCase.status === "APPROVALS_CLEARED") {
      exitCase = markSent(exitCase);
    }
    if (docStatus.status === "SIGNED" && exitCase.status === "SENT") {
      exitCase = markSigned(exitCase);
    }

    await this.prisma.exitCase.update({
      where: { id: exitCaseId },
      data: { status: exitCase.status },
    });
    return exitCase;
  }

  /**
   * Attempts to complete the exit. Checks asset-management for unreturned
   * assets first — this is the guard the brief requires: exit formalities
   * must not finish silently while a laptop (or anything else) is still
   * outstanding.
   */
  async attemptComplete(exitCaseId: string) {
    const record = await this.prisma.exitCase.findUniqueOrThrow({ where: { id: exitCaseId } });
    const exitCase = toEngineCase(record);

    const unreturned = await this.assetManagement.unreturnedAssetsFor(exitCase.employeeEmail);

    try {
      const completed = completeExit(exitCase, unreturned);
      await this.prisma.exitCase.update({
        where: { id: exitCaseId },
        data: { status: completed.status },
      });
      return { completed: true, exitCase: completed };
    } catch (err) {
      if (err instanceof ExitBlockedError) {
        return { completed: false, blockers: err.blockers, exitCase };
      }
      throw err;
    }
  }

  async getStatus(exitCaseId: string) {
    const record = await this.prisma.exitCase.findUniqueOrThrow({ where: { id: exitCaseId } });
    return toEngineCase(record);
  }
}
