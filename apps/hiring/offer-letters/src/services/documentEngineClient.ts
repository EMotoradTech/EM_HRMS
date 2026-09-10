import {
  CreateDocumentInput,
  DocumentEngineClient,
  DocumentHandle,
  DocumentStatus,
  DocumentStatusListener,
} from "../types";

// Stands in for Person A's document-engine (apps/foundations/document-engine)
// per docs/contracts/document-engine-api.md, which is a mock this app wrote
// itself because the real contract/implementation didn't exist yet — see
// that file for why and what to do once it lands.
//
// Simulates the real engine's async behavior (approval chain clears →
// engine sends the document → engine captures signature) by walking through
// the documented lifecycle on setImmediate ticks and invoking the same
// listener a webhook would call, instead of a real delay — callers don't
// need real time to pass to see it complete.
export class MockDocumentEngineClient implements DocumentEngineClient {
  private documents = new Map<string, DocumentHandle>();
  private listeners = new Map<string, DocumentStatusListener[]>();

  async createDocument(_input: CreateDocumentInput): Promise<DocumentHandle> {
    const documentId = `doc_${Math.random().toString(36).slice(2, 10)}`;
    const handle: DocumentHandle = { documentId, status: "DRAFT" };
    this.documents.set(documentId, handle);
    return handle;
  }

  async submitForApproval(documentId: string): Promise<DocumentHandle> {
    this.requireDocument(documentId);
    this.transitionTo(documentId, "PENDING_APPROVAL");

    // Simulate the approval chain clearing, then the engine sending the
    // document and capturing the signature, each on its own tick.
    setImmediate(() => this.transitionTo(documentId, "APPROVED"));
    setImmediate(() => setImmediate(() => this.transitionTo(documentId, "SENT")));
    setImmediate(() => setImmediate(() => setImmediate(() => this.transitionTo(documentId, "SIGNED"))));

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
