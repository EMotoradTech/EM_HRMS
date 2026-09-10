import {
  CreateDocumentInput,
  DocumentEngineClient,
  DocumentHandle,
  DocumentStatus,
  DocumentStatusListener,
} from "../types";

const TERMINAL_STATUSES: DocumentStatus[] = ["FILED", "REJECTED"];

interface EngineDocumentResponse {
  id: string;
  status: DocumentStatus;
}

// Real client for apps/foundations/document-engine, per
// docs/contracts/document-engine-api.md (the authoritative contract Person A
// published — not the draft this app originally wrote its mock against).
// Implements the same DocumentEngineClient interface as the mock so routes/
// services never need to change — only src/index.ts's choice of which
// client to construct (via DOCUMENT_ENGINE_MODE) changes.
//
// The real engine has no webhook — see the contract's auth/endpoint list.
// onStatusChange here polls GET /documents/:id/status instead, at
// `pollIntervalMs`, and stops once the document reaches a terminal status
// (FILED or REJECTED).
export class HttpDocumentEngineClient implements DocumentEngineClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
    private pollIntervalMs = 3000
  ) {}

  async createDocument(input: CreateDocumentInput): Promise<DocumentHandle> {
    const doc = await this.request<EngineDocumentResponse>("POST", "/documents", {
      templateType: input.templateType,
      data: input.data,
      recipientEmail: input.recipientEmail,
      approverEmails: input.approverEmails,
    });
    return toHandle(doc);
  }

  async send(documentId: string): Promise<DocumentHandle> {
    const doc = await this.request<EngineDocumentResponse>(
      "POST",
      `/documents/${documentId}/send`
    );
    return toHandle(doc);
  }

  async getDocument(documentId: string): Promise<DocumentHandle> {
    const doc = await this.request<EngineDocumentResponse>(
      "GET",
      `/documents/${documentId}/status`
    );
    return toHandle(doc);
  }

  onStatusChange(documentId: string, listener: DocumentStatusListener): void {
    let lastStatus: DocumentStatus | undefined;

    const timer = setInterval(async () => {
      try {
        const handle = await this.getDocument(documentId);
        if (handle.status !== lastStatus) {
          lastStatus = handle.status;
          listener(handle.status);
        }
        if (TERMINAL_STATUSES.includes(handle.status)) {
          clearInterval(timer);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`document-engine poll failed for ${documentId}:`, err);
      }
    }, this.pollIntervalMs);

    // Don't hold the process open just for this poll (e.g. in tests).
    if (typeof timer.unref === "function") timer.unref();
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": this.apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`document-engine request failed: ${method} ${path} -> ${response.status} ${text}`);
    }
    return response.json() as Promise<T>;
  }
}

function toHandle(doc: EngineDocumentResponse): DocumentHandle {
  return { documentId: doc.id, status: doc.status };
}
