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

interface DocApproval {
  order: number;
  approverEmail: string;
  status: string;
  comment?: string;
  decidedAt?: string;
}

interface DocListItem {
  id: string;
  templateType: string;
  recipientEmail: string;
  status: string;
  createdAt: string;
  approvals: DocApproval[];
}

interface DocDetail extends DocListItem {
  data: Record<string, unknown>;
  renderedBody?: string;
  auditLog: { action: string; actor: string; timestamp: string; metadata?: Record<string, unknown> }[];
  signature?: { signerName: string; signedAt: string; ipAddress?: string; provider: string };
}

const TEMPLATE_TYPES = ["offer-letter", "appointment-letter", "relieving-letter"];

function CreateDocumentModal({ onClose }: { onClose: () => void }) {
  const api = useApi("documentEngine");
  const qc = useQueryClient();
  const [templateType, setTemplateType] = useState(TEMPLATE_TYPES[0]);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [approverEmails, setApproverEmails] = useState("");
  const [dataJson, setDataJson] = useState(
    '{\n  "candidateName": "",\n  "designation": "",\n  "startDate": "",\n  "ctc": "",\n  "reportingManager": "",\n  "location": ""\n}'
  );

  const mutation = useMutation({
    mutationFn: () => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataJson);
      } catch {
        throw new Error("Template data must be valid JSON");
      }
      return api.post("/documents", {
        templateType,
        data,
        recipientEmail,
        approverEmails: approverEmails
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      onClose();
    },
  });

  return (
    <Modal
      title="Generate a document"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create & submit for approval"}
          </Button>
        </>
      }
    >
      {mutation.isError && <ErrorBanner message={(mutation.error as Error).message} />}
      <Field label="Template type">
        <select value={templateType} onChange={(e) => setTemplateType(e.target.value)}>
          {TEMPLATE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Recipient email">
        <input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="candidate@example.com" />
      </Field>
      <Field label="Approver emails" hint="Comma-separated, in approval order">
        <input
          value={approverEmails}
          onChange={(e) => setApproverEmails(e.target.value)}
          placeholder="manager@emotorad.com, hr-head@emotorad.com"
        />
      </Field>
      <Field label="Template data (JSON)" hint="Fields matching the chosen template's placeholders">
        <textarea rows={7} value={dataJson} onChange={(e) => setDataJson(e.target.value)} className="mono" />
      </Field>
    </Modal>
  );
}

function DocumentDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const api = useApi("documentEngine");
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery<DocDetail>({
    queryKey: ["documents", id],
    queryFn: () => api.get(`/documents/${id}/status`),
  });

  const [approverEmail, setApproverEmail] = useState("");
  const [comment, setComment] = useState("");
  const [signerName, setSignerName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["documents"] });
    qc.invalidateQueries({ queryKey: ["documents", id] });
  };

  const pendingStep = data?.approvals
    .slice()
    .sort((a, b) => a.order - b.order)
    .find((a) => a.status === "PENDING");
  // The input pre-fills with the pending approver's email but is still
  // editable — fall back to it here too so clicking Approve/Reject without
  // touching the field acts as that approver, instead of silently sending "".
  const effectiveApproverEmail = approverEmail || pendingStep?.approverEmail || "";

  const approve = useMutation({
    mutationFn: () => api.post(`/documents/${id}/approve`, { approverEmail: effectiveApproverEmail, comment }),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: () => api.post(`/documents/${id}/reject`, { approverEmail: effectiveApproverEmail, comment }),
    onSuccess: invalidate,
  });
  const send = useMutation({ mutationFn: () => api.post(`/documents/${id}/send`), onSuccess: invalidate });
  const sign = useMutation({
    mutationFn: () => api.post(`/documents/${id}/sign`, { signerName }),
    onSuccess: invalidate,
  });
  const file = useMutation({ mutationFn: () => api.post(`/documents/${id}/file`), onSuccess: invalidate });

  return (
    <Modal title="Document detail" onClose={onClose}>
      {isLoading && "Loading…"}
      {error && <ErrorBanner message={(error as Error).message} />}
      {data && (
        <div>
          <p className="mono muted" style={{ marginTop: 0 }}>{data.id}</p>
          <p>
            <strong>{data.templateType}</strong> → {data.recipientEmail} &nbsp;
            <StatusBadge status={data.status} />
          </p>

          {data.renderedBody && (
            <Card>
              <pre style={{ whiteSpace: "pre-wrap", margin: 0, fontSize: 12.5 }}>{data.renderedBody}</pre>
            </Card>
          )}

          <h4 style={{ margin: "16px 0 8px" }}>Approval chain</h4>
          <ul style={{ paddingLeft: 18, margin: 0, fontSize: 13 }}>
            {data.approvals
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((a) => (
                <li key={a.order}>
                  {a.approverEmail} — <StatusBadge status={a.status} />
                  {a.comment && <span className="muted"> “{a.comment}”</span>}
                </li>
              ))}
          </ul>

          {pendingStep && (
            <Card>
              <p style={{ marginTop: 0, fontSize: 13 }}>
                Act as the pending approver: <strong>{pendingStep.approverEmail}</strong>
              </p>
              {(approve.isError || reject.isError) && (
                <ErrorBanner message={((approve.error ?? reject.error) as Error).message} />
              )}
              <Field label="Approver email">
                <input value={effectiveApproverEmail} onChange={(e) => setApproverEmail(e.target.value)} />
              </Field>
              <Field label="Comment (optional)">
                <input value={comment} onChange={(e) => setComment(e.target.value)} />
              </Field>
              <Button variant="primary" small onClick={() => approve.mutate()} disabled={approve.isPending}>
                Approve
              </Button>{" "}
              <Button variant="danger" small onClick={() => reject.mutate()} disabled={reject.isPending}>
                Reject
              </Button>
            </Card>
          )}

          {data.status === "APPROVED" && (
            <Card>
              {send.isError && <ErrorBanner message={(send.error as Error).message} />}
              <p style={{ marginTop: 0, fontSize: 13 }}>
                All approvals cleared. offer-letters normally triggers this automatically — you can
                also send it manually here.
              </p>
              <Button variant="primary" small onClick={() => send.mutate()} disabled={send.isPending}>
                Send
              </Button>
            </Card>
          )}

          {data.status === "SENT" && (
            <Card>
              {sign.isError && <ErrorBanner message={(sign.error as Error).message} />}
              <p style={{ marginTop: 0, fontSize: 13 }}>Simulate the recipient signing:</p>
              <Field label="Signer name">
                <input value={signerName} onChange={(e) => setSignerName(e.target.value)} />
              </Field>
              <Button variant="primary" small onClick={() => sign.mutate()} disabled={sign.isPending || !signerName}>
                Sign
              </Button>
            </Card>
          )}

          {data.status === "SIGNED" && (
            <Card>
              {file.isError && <ErrorBanner message={(file.error as Error).message} />}
              <Button variant="primary" small onClick={() => file.mutate()} disabled={file.isPending}>
                Mark filed
              </Button>
            </Card>
          )}

          <h4 style={{ margin: "16px 0 8px" }}>Audit log</h4>
          <div className="timeline">
            {data.auditLog.map((e, i) => (
              <div className="timeline-item" key={i}>
                <div className="t-status">{e.action} — {e.actor}</div>
                <div className="t-time">{formatDate(e.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function DocumentsPage() {
  const api = useApi("documentEngine");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<DocListItem[]>({
    queryKey: ["documents"],
    queryFn: () => api.get("/documents"),
  });

  return (
    <div>
      <PageHeader
        title="Documents & Approvals"
        description="Generate a document from a template, route it through an ordered approval chain, send it, and capture a signature — the shared engine offer-letters and exit-formalities build on."
        actions={<Button variant="primary" onClick={() => setShowCreate(true)}>Generate document</Button>}
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
            emptyMessage="No documents yet — generate one to get started."
            columns={[
              { header: "Template", render: (r) => r.templateType },
              { header: "Recipient", render: (r) => r.recipientEmail },
              { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              {
                header: "Approvals",
                render: (r) => `${r.approvals.filter((a) => a.status === "APPROVED").length}/${r.approvals.length}`,
              },
              { header: "Created", render: (r) => formatDate(r.createdAt) },
            ]}
          />
        )}
      </Card>
      {showCreate && <CreateDocumentModal onClose={() => setShowCreate(false)} />}
      {selected && <DocumentDetailModal id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
