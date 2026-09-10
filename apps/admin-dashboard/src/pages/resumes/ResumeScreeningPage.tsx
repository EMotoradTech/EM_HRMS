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
  formatDate,
} from "../../components/ui";

interface JD {
  id: string;
  title: string;
  requiredSkills: string[];
  minExperienceYears?: number;
  createdAt: string;
}

interface Candidate {
  id: string;
  name?: string;
  email?: string;
  score: number;
  rank: number;
  sourceFileName: string;
  extractedSkills: string[];
}

function CreateJdModal({ onClose }: { onClose: () => void }) {
  const api = useApi("resumeScreening");
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.post("/job-descriptions", { title, rawText }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-descriptions"] });
      onClose();
    },
  });

  return (
    <Modal
      title="New job description"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !title}>
            Create
          </Button>
        </>
      }
    >
      {mutation.isError && <ErrorBanner message={(mutation.error as Error).message} />}
      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Senior Backend Engineer" />
      </Field>
      <Field
        label="Description (free text)"
        hint='Parsed heuristically for "Required Skills:", "Preferred Skills:", "Qualifications:", and an experience range like "3-6 years"'
      >
        <textarea rows={8} value={rawText} onChange={(e) => setRawText(e.target.value)} />
      </Field>
    </Modal>
  );
}

function JdDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const api = useApi("resumeScreening");
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [sendTo, setSendTo] = useState("");

  const { data, error, refetch } = useQuery<{ jd: JD; candidates: Candidate[] }>({
    queryKey: ["job-descriptions", id, "shortlist"],
    queryFn: () => api.get(`/job-descriptions/${id}/shortlist`),
  });

  const upload = useMutation({
    mutationFn: async () => {
      const files = fileInput.current?.files;
      if (!files || files.length === 0) throw new Error("Choose at least one resume file");
      const form = new FormData();
      Array.from(files).forEach((f) => form.append("resumes", f));
      return api.upload(`/job-descriptions/${id}/candidates/upload`, form);
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: ["job-descriptions"] });
      if (fileInput.current) fileInput.current.value = "";
    },
  });

  const send = useMutation({
    mutationFn: () =>
      api.post(`/job-descriptions/${id}/shortlist/send`, {
        to: sendTo.split(",").map((e) => e.trim()).filter(Boolean),
      }),
  });

  return (
    <Modal title="Job description" onClose={onClose}>
      {error && <ErrorBanner message={(error as Error).message} />}
      {data && (
        <div>
          <h4 style={{ margin: "0 0 4px" }}>{data.jd.title}</h4>
          {data.jd.requiredSkills.length > 0 && (
            <p className="muted" style={{ fontSize: 13 }}>
              Required: {data.jd.requiredSkills.join(", ")}
            </p>
          )}

          <Card>
            {upload.isError && <ErrorBanner message={(upload.error as Error).message} />}
            <p style={{ marginTop: 0, fontSize: 13 }}>
              Bulk-upload resumes (Naukri auto-pull is unvalidated — see this app's README).
            </p>
            <input type="file" multiple accept=".pdf,.docx" ref={fileInput} />{" "}
            <Button small onClick={() => upload.mutate()} disabled={upload.isPending}>
              {upload.isPending ? "Scoring…" : "Upload & rank"}
            </Button>
          </Card>

          <h4 style={{ margin: "16px 0 8px" }}>Shortlist ({data.candidates.length})</h4>
          <DataTable
            rows={data.candidates}
            rowKey={(c) => c.id}
            emptyMessage="No candidates uploaded yet."
            columns={[
              { header: "#", render: (c) => c.rank },
              { header: "Name", render: (c) => c.name ?? "—" },
              { header: "Score", render: (c) => c.score },
              { header: "File", render: (c) => c.sourceFileName },
              { header: "Skills", render: (c) => c.extractedSkills.join(", ") || "—" },
            ]}
          />

          {data.candidates.length > 0 && (
            <Card>
              {send.isError && <ErrorBanner message={(send.error as Error).message} />}
              {send.isSuccess && (
                <p style={{ color: "var(--success)", fontSize: 13, marginTop: 0 }}>Shortlist sent (stubbed).</p>
              )}
              <Field label="Send shortlist to" hint="Comma-separated stakeholder emails">
                <input value={sendTo} onChange={(e) => setSendTo(e.target.value)} />
              </Field>
              <Button small variant="primary" onClick={() => send.mutate()} disabled={send.isPending || !sendTo}>
                Send
              </Button>
            </Card>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ResumeScreeningPage() {
  const api = useApi("resumeScreening");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<JD[]>({
    queryKey: ["job-descriptions"],
    queryFn: () => api.get("/job-descriptions"),
  });

  return (
    <div>
      <PageHeader
        title="Resume Screening & Ranking"
        description="Score and rank candidate resumes against a job description's stated requirements, with a transparent breakdown — not a black box."
        actions={<Button variant="primary" onClick={() => setShowCreate(true)}>New JD</Button>}
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
            emptyMessage="No job descriptions yet."
            columns={[
              { header: "Title", render: (r) => r.title },
              { header: "Required skills", render: (r) => r.requiredSkills.join(", ") || "—" },
              { header: "Min experience", render: (r) => (r.minExperienceYears != null ? `${r.minExperienceYears}y` : "—") },
              { header: "Created", render: (r) => formatDate(r.createdAt) },
            ]}
          />
        )}
      </Card>
      {showCreate && <CreateJdModal onClose={() => setShowCreate(false)} />}
      {selected && <JdDetailModal id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
