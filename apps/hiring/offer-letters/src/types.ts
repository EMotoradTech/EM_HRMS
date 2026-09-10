// Mirrors the (mock) document-engine contract in
// docs/contracts/document-engine-api.md, and the local Prisma OfferStatus
// enum as a plain string union so pure mapping/status logic doesn't need the
// generated Prisma client to be unit tested.
export type DocumentStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "SIGNED";

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
  templateId: string;
  data: Record<string, unknown>;
  approvalChain: ApprovalStep[];
  recipientEmail: string;
}

export interface DocumentHandle {
  documentId: string;
  status: DocumentStatus;
}

export type DocumentStatusListener = (status: DocumentStatus) => void;

export interface DocumentEngineClient {
  createDocument(input: CreateDocumentInput): Promise<DocumentHandle>;
  submitForApproval(documentId: string): Promise<DocumentHandle>;
  getDocument(documentId: string): Promise<DocumentHandle>;
  onStatusChange(documentId: string, listener: DocumentStatusListener): void;
}
