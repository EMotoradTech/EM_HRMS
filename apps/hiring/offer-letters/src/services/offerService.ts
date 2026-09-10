import { prisma } from "../lib/prisma";
import { getDocumentEngineClient } from "./documentEngineClient";
import { mapDocumentStatusToOfferStatuses } from "./statusMapping";

const OFFER_LETTER_TEMPLATE_ID = "offer-letter-v1";

interface CandidateInput {
  name: string;
  email: string;
  role: string;
  ctc?: string;
  joiningDate?: string;
  approvalChain: { approverEmail: string; order: number }[];
}

// Called when a candidate is marked "selected". Generates the offer letter
// via the document-engine (or its mock), kicks off approval, and tracks the
// candidate's status as the engine reports each state change.
export async function startOfferForCandidate(input: CandidateInput) {
  const candidate = await prisma.offerCandidate.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      ctc: input.ctc,
      joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
      status: "SELECTED",
      statusHistory: [{ status: "SELECTED", at: new Date().toISOString() }],
    },
  });

  const client = getDocumentEngineClient();
  const { documentId } = await client.createDocument({
    templateId: OFFER_LETTER_TEMPLATE_ID,
    data: {
      candidateName: input.name,
      role: input.role,
      ctc: input.ctc,
      joiningDate: input.joiningDate,
    },
    approvalChain: input.approvalChain,
    recipientEmail: input.email,
  });

  await applyOfferStatuses(candidate.id, ["OFFER_GENERATED"]);
  await prisma.offerCandidate.update({
    where: { id: candidate.id },
    data: { documentEngineId: documentId },
  });

  client.onStatusChange(documentId, (status) => {
    const statuses = mapDocumentStatusToOfferStatuses(status);
    applyOfferStatuses(candidate.id, statuses).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to apply offer status update for ${candidate.id}:`, err);
    });
  });

  await client.submitForApproval(documentId);

  return prisma.offerCandidate.findUniqueOrThrow({ where: { id: candidate.id } });
}

async function applyOfferStatuses(candidateId: string, statuses: string[]) {
  for (const status of statuses) {
    const current = await prisma.offerCandidate.findUniqueOrThrow({ where: { id: candidateId } });
    const history = Array.isArray(current.statusHistory) ? current.statusHistory : [];
    await prisma.offerCandidate.update({
      where: { id: candidateId },
      data: {
        status: status as any,
        statusHistory: [...history, { status, at: new Date().toISOString() }] as any,
      },
    });
  }
}
