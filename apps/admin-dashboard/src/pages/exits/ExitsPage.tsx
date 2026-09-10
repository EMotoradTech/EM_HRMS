import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiClient";
import { useSettings } from "../../lib/settings";
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

interface ExitCase {
  id: string;
  employeeEmail: string;
  designation: string;
  lastWorkingDay: string;
  status: string;
  documentId?: string;
}

interface CompleteResult {
  completed: boolean;
  blockers?: string[];
  exitCase: ExitCase;
}

function CreateExitModal({ onClose }: { onClose: () => void }) {
  const api = useApi("exitFormalities");
  const qc = useQueryClient();
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [lastWorkingDay, setLastWorkingDay] = useState("");
  const [approverEmails, setApproverEmails] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/exit-cases", {
        employeeEmail,
        designation,
        lastWorkingDay,
        approverEmails: approverEmails.split(",").map((e) => e.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exit-cases"] });
      onClose();
    },
  });

  return (
    <Modal
      title="Initiate exit"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            Initiate — generates the relieving letter
          </Button>
        </>
      }
    >
      {mutation.isError && (
        <ErrorBanner
          message={`${(mutation.error as Error).message} (needs document-engine and asset-management reachable from exit-formalities' own backend — see its .env)`}
        />
      )}
      <Field label="Employee email">
        <input value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} />
      </Field>
      <Field label="Designation">
        <input value={designation} onChange={(e) => setDesignation(e.target.value)} />
      </Field>
      <Field label="Last working day">
        <input type="date" value={lastWorkingDay} onChange={(e) => setLastWorkingDay(e.target.value)} />
      </Field>
      <Field label="Approver emails" hint="Comma-separated, in order">
        <input value={approverEmails} onChange={(e) => setApproverEmails(e.target.value)} />
      </Field>
    </Modal>
  );
}

function ExitDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const api = useApi("exitFormalities");
  const { settings } = useSettings();
  const qc = useQueryClient();
  const [completeResult, setCompleteResult] = useState<CompleteResult | null>(null);

  const { data, error } = useQuery<ExitCase>({
    queryKey: ["exit-cases", id],
    queryFn: () => api.get(`/exit-cases/${id}`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["exit-cases"] });
    qc.invalidateQueries({ queryKey: ["exit-cases", id] });
  };

  const sync = useMutation({
    mutationFn: () => api.post<ExitCase>(`/exit-cases/${id}/sync`),
    onSuccess: invalidate,
  });

  // Deliberately not using api.post here: this endpoint returns a meaningful
  // body on both 200 (completed) and 409 (blocked) — the shared client throws
  // on any non-2xx, which would swallow the blockers list.
  const complete = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${api.baseUrl}/exit-cases/${id}/complete`, {
        method: "POST",
        headers: { "x-internal-api-key": settings.apiKey },
      });
      const body = (await res.json()) as CompleteResult;
      return body;
    },
    onSuccess: (result) => {
      setCompleteResult(result);
      invalidate();
    },
  });

  return (
    <Modal title="Exit case" onClose={onClose}>
      {error && <ErrorBanner message={(error as Error).message} />}
      {data && (
        <div>
          <p>
            <strong>{data.employeeEmail}</strong> — {data.designation}
          </p>
          <p>
            Status: <StatusBadge status={data.status} /> &nbsp; Last working day:{" "}
            {formatDate(data.lastWorkingDay)}
          </p>
          {data.documentId && <p className="mono muted">document: {data.documentId}</p>}

          {sync.isError && <ErrorBanner message={(sync.error as Error).message} />}
          <Button small onClick={() => sync.mutate()} disabled={sync.isPending}>
            Sync with document-engine
          </Button>{" "}
          <Button small variant="primary" onClick={() => complete.mutate()} disabled={complete.isPending}>
            Attempt complete
          </Button>

          {completeResult && (
            <div
              className="error-banner"
              style={
                completeResult.completed
                  ? { background: "var(--success-bg)", color: "var(--success)", marginTop: 12 }
                  : { marginTop: 12 }
              }
            >
              {completeResult.completed
                ? "Exit marked complete."
                : `Blocked: ${completeResult.blockers?.join("; ")}`}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ExitsPage() {
  const api = useApi("exitFormalities");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ExitCase[]>({
    queryKey: ["exit-cases"],
    queryFn: () => api.get("/exit-cases"),
  });

  return (
    <div>
      <PageHeader
        title="Exit Formalities"
        description="The offboarding mirror of offer letters: generates relieving-letter paperwork via document-engine, and won't let an exit complete while assets remain unreturned."
        actions={<Button variant="primary" onClick={() => setShowCreate(true)}>Initiate exit</Button>}
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
            emptyMessage="No exits initiated yet."
            columns={[
              { header: "Employee", render: (r) => r.employeeEmail },
              { header: "Designation", render: (r) => r.designation },
              { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { header: "Last working day", render: (r) => formatDate(r.lastWorkingDay) },
            ]}
          />
        )}
      </Card>
      {showCreate && <CreateExitModal onClose={() => setShowCreate(false)} />}
      {selected && <ExitDetailModal id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
