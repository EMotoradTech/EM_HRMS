// Mirrors the real document-engine contract in
// docs/contracts/document-engine-api.md / apps/foundations/document-engine,
// and the local Prisma OfferStatus enum as a plain string union so pure
// mapping/status logic doesn't need the generated Prisma client to be unit
// tested.
//
// Note there is no DRAFT status: the real engine's POST /documents creates a
// document already in PENDING_APPROVAL (it requires a non-empty approver
// list), so this app never observes a DRAFT state. FILED is the engine's
// terminal state after signing, once someone marks the document filed.
export type DocumentStatus =
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "SIGNED"
  | "FILED";

export type OfferStatus =
  | "SELECTED"
  | "OFFER_GENERATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "SIGNED"
  | "ONBOARDING_READY";

export interface ApprovalStep {
  approverEmail: string;
  order: number;
}

export interface CreateDocumentInput {
  templateType: string;
  data: Record<string, unknown>;
  approverEmails: string[];
  recipientEmail: string;
}

export interface DocumentHandle {
  documentId: string;
  status: DocumentStatus;
}

export type DocumentStatusListener = (status: DocumentStatus) => void;

export interface DocumentEngineClient {
  createDocument(input: CreateDocumentInput): Promise<DocumentHandle>;
  // The real engine never auto-advances past APPROVED — something has to
  // explicitly ask it to send. This app is that something (see
  // offerService.ts): "no manual HR follow-up" means offer-letters itself
  // triggers the send the moment approvals clear, not a human.
  send(documentId: string): Promise<DocumentHandle>;
  getDocument(documentId: string): Promise<DocumentHandle>;
  onStatusChange(documentId: string, listener: DocumentStatusListener): void;
}
