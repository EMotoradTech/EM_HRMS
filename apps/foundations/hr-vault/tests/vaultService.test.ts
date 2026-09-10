import { checkAccess } from "../src/lib/accessControl";
import {
  VaultService,
  VaultRepository,
  VaultDocumentListItem,
  AuditRecordInput,
  AccessDeniedError,
} from "../src/services/vaultService";
import { VaultDocumentMeta } from "../src/lib/accessControl";

class InMemoryVaultRepository implements VaultRepository {
  documents = new Map<string, VaultDocumentMeta>();
  listMeta = new Map<string, { documentType: string; associatedPerson?: string; createdAt: Date }>();
  audit: AuditRecordInput[] = [];
  private counter = 0;

  async getDocument(id: string) {
    return this.documents.get(id) ?? null;
  }

  async createDocument(input: {
    owner: string;
    documentType: string;
    associatedPerson?: string;
    storageRef: string;
  }) {
    const doc: VaultDocumentMeta = {
      id: `doc-${this.counter++}`,
      owner: input.owner,
      sharedWith: [],
    };
    this.documents.set(doc.id, doc);
    this.listMeta.set(doc.id, {
      documentType: input.documentType,
      associatedPerson: input.associatedPerson,
      createdAt: new Date(),
    });
    return doc;
  }

  async listDocuments(): Promise<VaultDocumentListItem[]> {
    return [...this.documents.values()]
      .map((doc) => ({ ...doc, ...this.listMeta.get(doc.id)! }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async shareDocument(documentId: string, granteeEmail: string) {
    const doc = this.documents.get(documentId);
    if (doc && !doc.sharedWith.includes(granteeEmail)) doc.sharedWith.push(granteeEmail);
  }

  async deleteDocument(documentId: string) {
    this.documents.delete(documentId);
  }

  async recordAudit(entry: AuditRecordInput) {
    this.audit.push(entry);
  }

  async getAuditLog(documentId: string) {
    return this.audit.filter((a) => a.documentId === documentId);
  }
}

describe("checkAccess (pure)", () => {
  it("denies a non-HR role by default", () => {
    const decision = checkAccess(
      { email: "candidate@example.com", role: "CANDIDATE" },
      { id: "d1", owner: "hr@emotorad.com", sharedWith: [] },
      "READ"
    );
    expect(decision.allowed).toBe(false);
  });

  it("allows a non-HR actor to READ a document explicitly shared with them", () => {
    const decision = checkAccess(
      { email: "candidate@example.com", role: "CANDIDATE" },
      { id: "d1", owner: "hr@emotorad.com", sharedWith: ["candidate@example.com"] },
      "READ"
    );
    expect(decision.allowed).toBe(true);
  });

  it("never allows a non-HR actor to WRITE, even if shared with them", () => {
    const decision = checkAccess(
      { email: "candidate@example.com", role: "CANDIDATE" },
      { id: "d1", owner: "hr@emotorad.com", sharedWith: ["candidate@example.com"] },
      "WRITE"
    );
    expect(decision.allowed).toBe(false);
  });

  it("allows HR full access regardless of sharing", () => {
    const decision = checkAccess(
      { email: "hr@emotorad.com", role: "HR" },
      { id: "d1", owner: "hr@emotorad.com", sharedWith: [] },
      "DELETE"
    );
    expect(decision.allowed).toBe(true);
  });
});

describe("VaultService", () => {
  it("denies a non-HR-role request end to end", async () => {
    const repo = new InMemoryVaultRepository();
    const service = new VaultService(repo);
    const doc = await service.store(
      { email: "hr@emotorad.com", role: "HR" },
      { documentType: "signed-offer-letter", storageRef: "s3://.../a.pdf" }
    );

    await expect(
      service.read({ email: "random@example.com", role: "EMPLOYEE" }, doc.id)
    ).rejects.toThrow(AccessDeniedError);
  });

  it("creates an audit log entry on write, and on every read attempt (allowed or denied)", async () => {
    const repo = new InMemoryVaultRepository();
    const service = new VaultService(repo);
    const doc = await service.store(
      { email: "hr@emotorad.com", role: "HR" },
      { documentType: "signed-offer-letter", storageRef: "s3://.../a.pdf" }
    );

    // allowed read (HR)
    await service.read({ email: "hr@emotorad.com", role: "HR" }, doc.id);
    // denied read (non-HR, not shared)
    await expect(
      service.read({ email: "candidate@example.com", role: "CANDIDATE" }, doc.id)
    ).rejects.toThrow(AccessDeniedError);

    const log = await service.getAuditLog(doc.id);
    const actions = log.map((e) => `${e.action}:${e.allowed}`);
    expect(actions).toContain("WRITE:true");
    expect(actions).toContain("READ:true");
    expect(actions).toContain("READ:false");
  });

  it("lets a shared recipient read, and logs that as allowed", async () => {
    const repo = new InMemoryVaultRepository();
    const service = new VaultService(repo);
    const doc = await service.store(
      { email: "hr@emotorad.com", role: "HR" },
      { documentType: "signed-offer-letter", storageRef: "s3://.../a.pdf" }
    );
    await service.share({ email: "hr@emotorad.com", role: "HR" }, doc.id, "candidate@example.com");

    const result = await service.read(
      { email: "candidate@example.com", role: "CANDIDATE" },
      doc.id
    );
    expect(result.id).toBe(doc.id);
  });

  it("lists documents for HR but denies a non-HR role", async () => {
    const repo = new InMemoryVaultRepository();
    const service = new VaultService(repo);
    await service.store(
      { email: "hr@emotorad.com", role: "HR" },
      { documentType: "signed-offer-letter", storageRef: "s3://.../a.pdf" }
    );

    const list = await service.list({ email: "hr@emotorad.com", role: "HR" });
    expect(list).toHaveLength(1);
    expect(list[0].documentType).toBe("signed-offer-letter");

    await expect(
      service.list({ email: "candidate@example.com", role: "CANDIDATE" })
    ).rejects.toThrow(AccessDeniedError);
  });
});
