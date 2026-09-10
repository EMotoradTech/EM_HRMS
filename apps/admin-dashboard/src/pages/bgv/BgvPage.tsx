import { useRef, useState } from "react";
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

const CHECK_TYPES = ["EDUCATION", "EMPLOYMENT", "ADDRESS", "IDENTITY", "CRIMINAL_RECORD", "REFERENCE"];
const CHECK_STATUSES = ["PENDING", "IN_PROGRESS", "VERIFIED", "FLAGGED", "FAILED"];

interface Check {
  type: string;
  status: string;
  notes?: string;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  stakeholderEmail?: string;
  overallStatus: string;
  checks: Check[];
}

function CreateCandidateModal({ onClose }: { onClose: () => void }) {
  const api = useApi("bgvTracking");
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [stakeholderEmail, setStakeholderEmail] = useState("");
  const [checkTypes, setCheckTypes] = useState<string[]>(["EDUCATION", "EMPLOYMENT", "ADDRESS", "IDENTITY"]);

  const toggle = (t: string) =>
    setCheckTypes((cur) => (cur.includes(t) ? cur.filter((c) => c !== t) : [...cur, t]));

  const mutation = useMutation({
    mutationFn: () => api.post("/candidates", { name, email, stakeholderEmail, checkTypes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bgv-candidates"] });
      onClose();
    },
  });

  return (
    <Modal
      title="Add BGV candidate"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !name || !email}>
            Add
          </Button>
        </>
      }
    >
      {mutation.isError && <ErrorBanner message={(mutation.error as Error).message} />}
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Email">
        <input value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Stakeholder email (optional)" hint="Notified once every check is verified">
        <input value={stakeholderEmail} onChange={(e) => setStakeholderEmail(e.target.value)} />
      </Field>
      <Field label="Checks that apply">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {CHECK_TYPES.map((t) => (
            <label key={t} style={{ fontSize: 13, display: "flex", gap: 4, alignItems: "center" }}>
              <input type="checkbox" checked={checkTypes.includes(t)} onChange={() => toggle(t)} />
              {t}
            </label>
          ))}
        </div>
      </Field>
    </Modal>
  );
}

function CandidateDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const api = useApi("bgvTracking");
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploadCheckType, setUploadCheckType] = useState(CHECK_TYPES[0]);

  const { data, error } = useQuery<Candidate>({
    queryKey: ["bgv-candidates", id],
    queryFn: () => api.get(`/candidates/${id}`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bgv-candidates"] });
    qc.invalidateQueries({ queryKey: ["bgv-candidates", id] });
  };

  const updateCheck = useMutation({
    mutationFn: ({ type, status }: { type: string; status: string }) =>
      api.patch(`/candidates/${id}/checks/${type}`, { status }),
    onSuccess: invalidate,
  });

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileInput.current?.files?.[0];
      if (!file) throw new Error("Choose a file first");
      const form = new FormData();
      form.append("document", file);
      form.append("checkType", uploadCheckType);
      return api.upload(`/candidates/${id}/documents`, form);
    },
    onSuccess: () => {
      if (fileInput.current) fileInput.current.value = "";
    },
  });

  return (
    <Modal title="BGV candidate" onClose={onClose}>
      {error && <ErrorBanner message={(error as Error).message} />}
      {data && (
        <div>
          <p>
            <strong>{data.name}</strong> — {data.email}
          </p>
          <p>
            Overall: <StatusBadge status={data.overallStatus} />
          </p>

          {updateCheck.isError && <ErrorBanner message={(updateCheck.error as Error).message} />}
          <table className="data-table">
            <thead>
              <tr>
                <th>Check</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.checks.map((c) => (
                <tr key={c.type}>
                  <td>{c.type}</td>
                  <td>
                    <select
                      value={c.status}
                      onChange={(e) => updateCheck.mutate({ type: c.type, status: e.target.value })}
                    >
                      {CHECK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Card>
            {upload.isError && <ErrorBanner message={(upload.error as Error).message} />}
            {upload.isSuccess && <p style={{ color: "var(--success)", fontSize: 13, marginTop: 0 }}>Uploaded.</p>}
            <p style={{ marginTop: 0, fontSize: 13 }}>Upload a document for one check</p>
            <div className="field-row">
              <Field label="Check type">
                <select value={uploadCheckType} onChange={(e) => setUploadCheckType(e.target.value)}>
                  {CHECK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="File">
                <input type="file" ref={fileInput} />
              </Field>
            </div>
            <Button small onClick={() => upload.mutate()} disabled={upload.isPending}>
              Upload
            </Button>
          </Card>
        </div>
      )}
    </Modal>
  );
}

export function BgvPage() {
  const api = useApi("bgvTracking");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<Candidate[]>({
    queryKey: ["bgv-candidates"],
    queryFn: () => api.get("/candidates"),
  });

  return (
    <div>
      <PageHeader
        title="Background Verification Tracking"
        description="A workflow/status tracker sitting on top of whatever BGV vendor or manual process HR already uses — not a verification engine itself."
        actions={<Button variant="primary" onClick={() => setShowCreate(true)}>Add candidate</Button>}
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
            emptyMessage="No candidates in BGV yet."
            columns={[
              { header: "Name", render: (r) => r.name },
              { header: "Email", render: (r) => r.email },
              { header: "Overall", render: (r) => <StatusBadge status={r.overallStatus} /> },
              {
                header: "Checks",
                render: (r) => `${r.checks.filter((c) => c.status === "VERIFIED").length}/${r.checks.length} verified`,
              },
            ]}
          />
        )}
      </Card>
      {showCreate && <CreateCandidateModal onClose={() => setShowCreate(false)} />}
      {selected && <CandidateDetailModal id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
