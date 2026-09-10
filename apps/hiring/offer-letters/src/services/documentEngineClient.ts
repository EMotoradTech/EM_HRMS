import {
  CreateDocumentInput,
  DocumentEngineClient,
  DocumentHandle,
  DocumentStatus,
  DocumentStatusListener,
} from "../types";

// Local dev/test stand-in for the real document-engine
// (apps/foundations/document-engine), matching its actual behavior:
// - POST /documents requires a non-empty approver list and returns a
//   document already in PENDING_APPROVAL — there's no separate "submit"
//   step, so createDocument starts the lifecycle itself.
// - The engine never auto-advances past APPROVED: sending is a distinct
//   action the caller must trigger (see the `send` method), matching
//   apps/foundations/document-engine's POST /documents/:id/send.
// - Signing is a real candidate/signer action against the engine, not
//   something offer-letters (or this mock's caller) triggers — so the mock
//   simulates a signer completing it shortly after send, purely so local
//   dev/test can see the full pipeline complete without a live signer.
export class MockDocumentEngineClient implements DocumentEngineClient {
  private documents = new Map<string, DocumentHandle>();
  private listeners = new Map<string, DocumentStatusListener[]>();

  async createDocument(_input: CreateDocumentInput): Promise<DocumentHandle> {
    const documentId = `doc_${Math.random().toString(36).slice(2, 10)}`;
    const handle: DocumentHandle = { documentId, status: "PENDING_APPROVAL" };
    this.documents.set(documentId, handle);

    // Simulate an approver clearing the (single-step, in this mock) chain —
    // the real engine requires an actual POST .../approve per approver.
    setImmediate(() => this.transitionTo(documentId, "APPROVED"));

    return handle;
  }

  async send(documentId: string): Promise<DocumentHandle> {
    this.transitionTo(documentId, "SENT");
    // Simulate a candidate signing shortly after receiving the document.
    setImmediate(() => this.transitionTo(documentId, "SIGNED"));
    return this.documents.get(documentId)!;
  }

  async getDocument(documentId: string): Promise<DocumentHandle> {
    return this.requireDocument(documentId);
  }

  onStatusChange(documentId: string, listener: DocumentStatusListener): void {
    const existing = this.listeners.get(documentId) ?? [];
    existing.push(listener);
    this.listeners.set(documentId, existing);
  }

  private requireDocument(documentId: string): DocumentHandle {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error(`Unknown mock document: ${documentId}`);
    return doc;
  }

  private transitionTo(documentId: string, status: DocumentStatus): void {
    const doc = this.requireDocument(documentId);
    doc.status = status;
    for (const listener of this.listeners.get(documentId) ?? []) {
      listener(status);
    }
  }
}

let activeClient: DocumentEngineClient = new MockDocumentEngineClient();

export function setDocumentEngineClient(client: DocumentEngineClient): void {
  activeClient = client;
}

export function getDocumentEngineClient(): DocumentEngineClient {
  return activeClient;
}
