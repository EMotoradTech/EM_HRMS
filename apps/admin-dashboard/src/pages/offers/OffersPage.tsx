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
  formatDate,
} from "../../components/ui";

interface OfferCandidate {
  id: string;
  name: string;
  email: string;
  role: string;
  ctc?: string;
  joiningDate?: string;
  status: string;
  documentEngineId?: string;
  statusHistory: { status: string; at: string }[];
}

function CreateOfferModal({ onClose }: { onClose: () => void }) {
  const api = useApi("offerLetters");
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [ctc, setCtc] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [reportingManager, setReportingManager] = useState("");
  const [location, setLocation] = useState("");
  const [approvalChain, setApprovalChain] = useState("manager@emotorad.com, hr-head@emotorad.com");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/candidates", {
        name,
        email,
        role,
        ctc,
        joiningDate,
        reportingManager,
        location,
        approvalChain: approvalChain
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean)
          .map((approverEmail, order) => ({ approverEmail, order })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["offer-candidates"] });
      onClose();
    },
  });

  return (
    <Modal
      title="Mark candidate selected"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !name || !email || !role}>
            Generate offer
          </Button>
        </>
      }
    >
      {mutation.isError && (
        <ErrorBanner
          message={`${(mutation.error as Error).message} (needs document-engine reachable from offer-letters' own backend when DOCUMENT_ENGINE_MODE=http)`}
        />
      )}
      <div className="field-row">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      <div className="field-row">
        <Field label="Role / designation">
          <input value={role} onChange={(e) => setRole(e.target.value)} />
        </Field>
        <Field label="CTC">
          <input value={ctc} onChange={(e) => setCtc(e.target.value)} placeholder="12,00,000" />
        </Field>
      </div>
      <div className="field-row">
        <Field label="Joining date">
          <input type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
        </Field>
        <Field label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
      </div>
      <Field label="Reporting manager">
        <input value={reportingManager} onChange={(e) => setReportingManager(e.target.value)} />
      </Field>
      <Field label="Approval chain" hint="Comma-separated emails, in order">
        <input value={approvalChain} onChange={(e) => setApprovalChain(e.target.value)} />
      </Field>
    </Modal>
  );
}

function OfferDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const api = useApi("offerLetters");
  const { data, error } = useQuery<OfferCandidate>({
    queryKey: ["offer-candidates", id],
    queryFn: () => api.get(`/candidates/${id}`),
  });

  return (
    <Modal title="Offer pipeline" onClose={onClose}>
      {error && <ErrorBanner message={(error as Error).message} />}
      {data && (
        <div>
          <p>
            <strong>{data.name}</strong> — {data.role}
          </p>
          <p>
            Status: <StatusBadge status={data.status} />
          </p>
          {data.documentEngineId && <p className="mono muted">document-engine id: {data.documentEngineId}</p>}
          <h4 style={{ margin: "16px 0 8px" }}>History</h4>
          <div className="timeline">
            {data.statusHistory.map((h, i) => (
              <div className="timeline-item" key={i}>
                <div className="t-status">{h.status}</div>
                <div className="t-time">{formatDate(h.at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function OffersPage() {
  const api = useApi("offerLetters");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<OfferCandidate[]>({
    queryKey: ["offer-candidates"],
    queryFn: () => api.get("/candidates"),
  });

  return (
    <div>
      <PageHeader
        title="Offer & Appointment Letters"
        description="Once a candidate is selected: generate the offer via document-engine, route it through approval, and track status through to onboarding-ready — no manual HR follow-up."
        actions={<Button variant="primary" onClick={() => setShowCreate(true)}>Mark selected</Button>}
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
            emptyMessage="No candidates in the offer pipeline yet."
            columns={[
              { header: "Name", render: (r) => r.name },
              { header: "Role", render: (r) => r.role },
              { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { header: "CTC", render: (r) => r.ctc ?? "—" },
            ]}
          />
        )}
      </Card>
      {showCreate && <CreateOfferModal onClose={() => setShowCreate(false)} />}
      {selected && <OfferDetailModal id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
