import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiClient";
import { Button, Card, DataTable, ErrorBanner, Field, Modal, PageHeader } from "../../components/ui";

interface ComplianceItem {
  id: string;
  name: string;
  dayOfMonth: number;
  owner: string;
  leadTimeDays: number;
}

function CreateItemModal({ onClose }: { onClose: () => void }) {
  const api = useApi("complianceReminders");
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("15");
  const [owner, setOwner] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("5");

  const mutation = useMutation({
    mutationFn: () =>
      api.post("/compliance-items", {
        name,
        dayOfMonth: Number(dayOfMonth),
        owner,
        leadTimeDays: Number(leadTimeDays),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance-items"] });
      onClose();
    },
  });

  return (
    <Modal
      title="New compliance item"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !name || !owner}>
            Create
          </Button>
        </>
      }
    >
      {mutation.isError && <ErrorBanner message={(mutation.error as Error).message} />}
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="PF payment" />
      </Field>
      <div className="field-row">
        <Field label="Day of month">
          <input type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
        </Field>
        <Field label="Lead time (days)">
          <input type="number" min={0} value={leadTimeDays} onChange={(e) => setLeadTimeDays(e.target.value)} />
        </Field>
      </div>
      <Field label="Owner email">
        <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="finance@emotorad.com" />
      </Field>
    </Modal>
  );
}

export function CompliancePage() {
  const api = useApi("complianceReminders");
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, error } = useQuery<ComplianceItem[]>({
    queryKey: ["compliance-items"],
    queryFn: () => api.get("/compliance-items"),
  });

  const runCheck = useMutation({
    mutationFn: () => api.post<{ notified: string[] }>("/compliance-items/run-check"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compliance-items"] }),
  });

  return (
    <div>
      <PageHeader
        title="Compliance Reminders"
        description="Statutory deadlines (PF, ESI, and anything else recurring) with a daily scheduler that notifies the owner ahead of the due date."
        actions={
          <>
            <Button onClick={() => runCheck.mutate()} disabled={runCheck.isPending}>
              {runCheck.isPending ? "Running…" : "Run check now"}
            </Button>
            <Button variant="primary" onClick={() => setShowCreate(true)}>
              New item
            </Button>
          </>
        }
      />
      {error && <ErrorBanner message={(error as Error).message} />}
      {runCheck.isError && <ErrorBanner message={(runCheck.error as Error).message} />}
      {runCheck.data && (
        <div className="error-banner" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
          {runCheck.data.notified.length
            ? `Notified: ${runCheck.data.notified.join(", ")}`
            : "Ran — nothing due within its lead time right now."}
        </div>
      )}
      <Card>
        {isLoading ? (
          "Loading…"
        ) : (
          <DataTable
            rows={data ?? []}
            rowKey={(r) => r.id}
            emptyMessage="No compliance items yet."
            columns={[
              { header: "Name", render: (r) => r.name },
              { header: "Day of month", render: (r) => r.dayOfMonth },
              { header: "Lead time", render: (r) => `${r.leadTimeDays} days` },
              { header: "Owner", render: (r) => r.owner },
            ]}
          />
        )}
      </Card>
      {showCreate && <CreateItemModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
