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
  StatusBadge,
} from "../../components/ui";

interface Issuance {
  employeeEmail: string;
  returnedAt: string | null;
}

interface Asset {
  id: string;
  type: string;
  identifier: string;
  status: "IN_STOCK" | "ISSUED" | "RETURNED" | "LOST";
  issuances: Issuance[];
}

function issuedTo(a: Asset): string | undefined {
  return a.issuances.find((i) => !i.returnedAt)?.employeeEmail;
}

function CreateAssetModal({ onClose }: { onClose: () => void }) {
  const api = useApi("assetManagement");
  const qc = useQueryClient();
  const [type, setType] = useState("laptop");
  const [identifier, setIdentifier] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post("/assets", { type, identifier }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      onClose();
    },
  });

  return (
    <Modal
      title="Add asset"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !identifier}>
            Add
          </Button>
        </>
      }
    >
      {mutation.isError && <ErrorBanner message={(mutation.error as Error).message} />}
      <Field label="Type">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="laptop">laptop</option>
          <option value="id-card">id-card</option>
          <option value="sim">sim</option>
          <option value="other">other</option>
        </select>
      </Field>
      <Field label="Identifier" hint="Serial number / asset tag — must be unique">
        <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
      </Field>
    </Modal>
  );
}

function IssueModal({ assetId, onClose }: { assetId: string; onClose: () => void }) {
  const api = useApi("assetManagement");
  const qc = useQueryClient();
  const [employeeEmail, setEmployeeEmail] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post(`/assets/${assetId}/issue`, { employeeEmail }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      onClose();
    },
  });

  return (
    <Modal
      title="Issue asset"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !employeeEmail}>
            Issue
          </Button>
        </>
      }
    >
      {mutation.isError && <ErrorBanner message={(mutation.error as Error).message} />}
      <Field label="Employee email">
        <input value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function AssetsPage() {
  const api = useApi("assetManagement");
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [issueFor, setIssueFor] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<Asset[]>({
    queryKey: ["assets"],
    queryFn: () => api.get("/assets"),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["assets"] });
  const returnAsset = useMutation({
    mutationFn: (id: string) => api.post(`/assets/${id}/return`),
    onSuccess: invalidate,
  });
  const markLost = useMutation({
    mutationFn: (id: string) => api.post(`/assets/${id}/lost`),
    onSuccess: invalidate,
  });

  return (
    <div>
      <PageHeader
        title="Asset Management"
        description="Laptops, ID cards, SIMs, and anything else issued to employees — tracked through issue, return, and loss, with an eye on what's still outstanding."
        actions={<Button variant="primary" onClick={() => setShowCreate(true)}>Add asset</Button>}
      />
      {error && <ErrorBanner message={(error as Error).message} />}
      {(returnAsset.isError || markLost.isError) && (
        <ErrorBanner message={((returnAsset.error ?? markLost.error) as Error).message} />
      )}
      <Card>
        {isLoading ? (
          "Loading…"
        ) : (
          <DataTable
            rows={data ?? []}
            rowKey={(r) => r.id}
            emptyMessage="No assets yet."
            columns={[
              { header: "Type", render: (r) => r.type },
              { header: "Identifier", render: (r) => <span className="mono">{r.identifier}</span> },
              { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { header: "Issued to", render: (r) => issuedTo(r) ?? "—" },
              {
                header: "",
                render: (r) => (
                  <div style={{ display: "flex", gap: 6 }}>
                    {r.status === "IN_STOCK" && (
                      <Button small onClick={() => setIssueFor(r.id)}>
                        Issue
                      </Button>
                    )}
                    {r.status === "ISSUED" && (
                      <>
                        <Button small onClick={() => returnAsset.mutate(r.id)}>
                          Return
                        </Button>
                        <Button small variant="danger" onClick={() => markLost.mutate(r.id)}>
                          Lost
                        </Button>
                      </>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
      {showCreate && <CreateAssetModal onClose={() => setShowCreate(false)} />}
      {issueFor && <IssueModal assetId={issueFor} onClose={() => setIssueFor(null)} />}
    </div>
  );
}
