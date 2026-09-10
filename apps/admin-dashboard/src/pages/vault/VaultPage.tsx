import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiClient";
import {
  Button,
  Card,
  DataTable,
  ErrorBanner,
  Field,
  Modal,
  PageHeader,
  formatDate,
} from "../../components/ui";

interface VaultDoc {
  id: string;
  owner: string;
  documentType: string;
  associatedPerson?: string;
  createdAt: string;
  sharedWith: string[];
}

interface AuditEntry {
  actorEmail: string;
  actorRole: string;
  action: string;
  allowed: boolean;
  reason: string;
}

function CreateVaultDocModal({ onClose }: { onClose: () => void }) {
  const api = useApi("hrVault");
  const qc = useQueryClient();
  const [documentType, setDocumentType] = useState("signed-offer-letter");
  const [associatedPerson, setAssociatedPerson] = useState("");
  const [storageRef, setStorageRef] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post("/vault/documents", { documentType, associatedPerson, storageRef }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vault-documents"] });
      onClose();
    },
  });

  return (
    <Modal
      title="Store a document"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !storageRef}>
            Store
          </Button>
        </>
      }
    >
      {mutation.isError && <ErrorBanner message={(mutation.error as Error).message} />}
      <Field label="Document type">
        <input value={documentType} onChange={(e) => setDocumentType(e.target.value)} />
      </Field>
      <Field label="Associated person (optional)" hint="Employee/candidate email this document relates to">
        <input value={associatedPerson} onChange={(e) => setAssociatedPerson(e.target.value)} />
      </Field>
      <Field label="Storage reference" hint="Pointer to where the file bytes actually live">
        <input value={storageRef} onChange={(e) => setStorageRef(e.target.value)} placeholder="s3://bucket/key.pdf" />
      </Field>
    </Modal>
  );
}

function VaultDocDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const api = useApi("hrVault");
  const qc = useQueryClient();
  const [granteeEmail, setGranteeEmail] = useState("");

  const { data, error } = useQuery<VaultDoc>({
    queryKey: ["vault-documents", id],
    queryFn: () => api.get(`/vault/documents/${id}`),
  });
  const { data: log } = useQuery<AuditEntry[]>({
    queryKey: ["vault-documents", id, "audit"],
    queryFn: () => api.get(`/vault/documents/${id}/audit-log`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["vault-documents"] });
  };

  const share = useMutation({
    mutationFn: () => api.post(`/vault/documents/${id}/share`, { granteeEmail }),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: () => api.del(`/vault/documents/${id}`),
    onSuccess: () => {
      invalidate();
      onClose();
    },
  });

  return (
    <Modal title="Vault document" onClose={onClose}>
      {error && <ErrorBanner message={(error as Error).message} />}
      {data && (
        <div>
          <p className="mono muted" style={{ marginTop: 0 }}>{data.id}</p>
          <p>
            Owner: <strong>{data.owner}</strong>
          </p>
          <p>Shared with: {data.sharedWith.length ? data.sharedWith.join(", ") : <span className="muted">nobody</span>}</p>

          {share.isError && <ErrorBanner message={(share.error as Error).message} />}
          <Field label="Share with (email)">
            <input value={granteeEmail} onChange={(e) => setGranteeEmail(e.target.value)} placeholder="candidate@example.com" />
          </Field>
          <Button variant="primary" small onClick={() => share.mutate()} disabled={share.isPending || !granteeEmail}>
            Share
          </Button>{" "}
          <Button variant="danger" small onClick={() => del.mutate()} disabled={del.isPending}>
            Delete
          </Button>
          {del.isError && <ErrorBanner message={(del.error as Error).message} />}

          <h4 style={{ margin: "16px 0 8px" }}>Audit log</h4>
          <div className="timeline">
            {(log ?? []).map((e, i) => (
              <div className="timeline-item" key={i}>
                <div className="t-status">
                  {e.action} by {e.actorEmail} ({e.actorRole}) — {e.allowed ? "allowed" : "denied"}
                </div>
                <div className="t-time">{e.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function VaultPage() {
  const api = useApi("hrVault");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<VaultDoc[]>({
    queryKey: ["vault-documents"],
    queryFn: () => api.get("/vault/documents"),
  });

  return (
    <div>
      <PageHeader
        title="HR Vault"
        description="Access-controlled document storage with a full audit trail. Default-deny: only the HR role (set on the Settings page) can list, read, share, or delete."
        actions={<Button variant="primary" onClick={() => setShowCreate(true)}>Store document</Button>}
      />
      {error && <ErrorBanner message={(error as Error).message} />}
      <Card>
        {isLoading ? (
          "Loading…"
        ) : (
          <DataTable
            rows={data ?? []}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSelected(r.id)}
            emptyMessage="Nothing stored yet."
            columns={[
              { header: "Type", render: (r) => r.documentType },
              { header: "Owner", render: (r) => r.owner },
              { header: "Associated with", render: (r) => r.associatedPerson ?? "—" },
              { header: "Shared with", render: (r) => (r.sharedWith.length ? r.sharedWith.join(", ") : "—") },
              { header: "Created", render: (r) => formatDate(r.createdAt) },
            ]}
          />
        )}
      </Card>
      {showCreate && <CreateVaultDocModal onClose={() => setShowCreate(false)} />}
      {selected && <VaultDocDetailModal id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
