import { prisma } from "../lib/prisma";
import { getDocumentEngineClient } from "./documentEngineClient";
import { mapDocumentStatusToOfferStatuses } from "./statusMapping";

// Must match a key in apps/foundations/document-engine's TEMPLATES registry
// (src/lib/templateEngine.ts) — the real engine 404s/throws on anything else.
const OFFER_LETTER_TEMPLATE_TYPE = "offer-letter";

interface CandidateInput {
  name: string;
  email: string;
  role: string;
  ctc?: string;
  joiningDate?: string;
  reportingManager?: string;
  location?: string;
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
  // The engine's approval chain is an ordered array of emails (order = index)
  // — not {approverEmail, order} objects — so sort and flatten here rather
  // than changing this app's own POST /candidates request shape.
  const approverEmails = [...input.approvalChain]
    .sort((a, b) => a.order - b.order)
    .map((step) => step.approverEmail);

  const handle = await client.createDocument({
    templateType: OFFER_LETTER_TEMPLATE_TYPE,
    data: {
      // Field names match apps/foundations/document-engine's offer-letter
      // template placeholders (src/lib/templateEngine.ts), which differ from
      // this app's own candidate field names.
      candidateName: input.name,
      designation: input.role,
      startDate: input.joiningDate,
      ctc: input.ctc,
      reportingManager: input.reportingManager,
      location: input.location,
    },
    approverEmails,
    recipientEmail: input.email,
  });

  await prisma.offerCandidate.update({
    where: { id: candidate.id },
    data: { documentEngineId: handle.documentId },
  });

  // The engine's POST /documents already returns the document in
  // PENDING_APPROVAL (no separate "submit" step) — apply both that and
  // OFFER_GENERATED now, since onStatusChange (registered next) only fires
  // on *changes* observed after this point, not the state as of creation.
  await applyOfferStatuses(candidate.id, [
    "OFFER_GENERATED",
    ...mapDocumentStatusToOfferStatuses(handle.status),
  ]);

  client.onStatusChange(handle.documentId, (status) => {
    const statuses = mapDocumentStatusToOfferStatuses(status);
    applyOfferStatuses(candidate.id, statuses).catch((err) => {
      // eslint-disable-next-line no-console
      console.error(`Failed to apply offer status update for ${candidate.id}:`, err);
    });

    // The engine never auto-sends once approved — something has to ask it
    // to. That's this app's job ("no manual HR follow-up" per the brief),
    // not a human clicking send.
    if (status === "APPROVED") {
      client.send(handle.documentId).catch((err) => {
        // eslint-disable-next-line no-console
        console.error(`Failed to send document for candidate ${candidate.id}:`, err);
      });
    }
  });

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
