import {
  CreateDocumentInput,
  DocumentEngineClient,
  DocumentHandle,
  DocumentStatusListener,
} from "../types";

// Real client for Person A's document-engine, once it exists. Implements the
// same DocumentEngineClient interface as the mock so routes/services never
// need to change — only src/index.ts's choice of which client to construct
// (via DOCUMENT_ENGINE_MODE) changes.
//
// NOT YET WIRED TO A WEBHOOK RECEIVER: onStatusChange here just accumulates
// listeners in memory. Once the real contract is published, add a route that
// receives the engine's webhook POST and calls the matching listeners (keyed
// by documentId), the same way the mock invokes them directly.
export class HttpDocumentEngineClient implements DocumentEngineClient {
  private listeners = new Map<string, DocumentStatusListener[]>();

  constructor(private baseUrl: string, private token: string) {}

  async createDocument(input: CreateDocumentInput): Promise<DocumentHandle> {
    return this.request("POST", "/documents", input);
  }

  async submitForApproval(documentId: string): Promise<DocumentHandle> {
    return this.request("POST", `/documents/${documentId}/submit-for-approval`);
  }

  async getDocument(documentId: string): Promise<DocumentHandle> {
    return this.request("GET", `/documents/${documentId}`);
  }

  onStatusChange(documentId: string, listener: DocumentStatusListener): void {
    const existing = this.listeners.get(documentId) ?? [];
    existing.push(listener);
    this.listeners.set(documentId, existing);
  }

  /** Called by the webhook route once one exists (see class comment above). */
  dispatchWebhookEvent(documentId: string, status: DocumentHandle["status"]): void {
    for (const listener of this.listeners.get(documentId) ?? []) {
      listener(status);
    }
  }

  private async request(method: string, path: string, body?: unknown): Promise<DocumentHandle> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`document-engine request failed: ${method} ${path} -> ${response.status}`);
    }
    return response.json() as Promise<DocumentHandle>;
  }
}
