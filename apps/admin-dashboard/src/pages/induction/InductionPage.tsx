import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiClient";
import { Button, Card, ErrorBanner, Field, PageHeader, StatusBadge } from "../../components/ui";

interface SectionWithProgress {
  key: string;
  title: string;
  order: number;
  type: "markdown" | "embed";
  body: string;
  embedUrl?: string;
  embedKind?: string;
  status: "NOT_STARTED" | "STARTED" | "COMPLETED";
}

export function InductionPage() {
  const api = useApi("inductionPortal");
  const qc = useQueryClient();
  const [joinerId, setJoinerId] = useState("joiner-demo-1");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<SectionWithProgress[]>({
    queryKey: ["induction-progress", joinerId],
    queryFn: () => api.get(`/joiners/${joinerId}/progress`),
    enabled: !!joinerId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["induction-progress", joinerId] });
  const start = useMutation({
    mutationFn: (key: string) => api.post(`/joiners/${joinerId}/sections/${key}/start`),
    onSuccess: invalidate,
  });
  const complete = useMutation({
    mutationFn: (key: string) => api.post(`/joiners/${joinerId}/sections/${key}/complete`),
    onSuccess: invalidate,
  });

  return (
    <div>
      <PageHeader
        title="Induction Self-Serve Portal"
        description="Policies, culture book, company presentation, and HR event/leave rules for new joiners — content loaded from Markdown files, editable without a redeploy."
      />
      <Card>
        <Field label="Joiner ID" hint="This app doesn't keep its own roster — enter the joiner's employee ID/email as used elsewhere">
          <input value={joinerId} onChange={(e) => setJoinerId(e.target.value)} style={{ maxWidth: 320 }} />
        </Field>
      </Card>

      {error && <ErrorBanner message={(error as Error).message} />}
      {isLoading && "Loading…"}

      {(data ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s) => (
          <Card key={s.key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ cursor: "pointer" }} onClick={() => setExpanded(expanded === s.key ? null : s.key)}>
                <strong>{s.title}</strong> <StatusBadge status={s.status} />
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {s.status === "NOT_STARTED" && (
                  <Button small onClick={() => start.mutate(s.key)} disabled={start.isPending}>
                    Mark started
                  </Button>
                )}
                {s.status !== "COMPLETED" && (
                  <Button small variant="primary" onClick={() => complete.mutate(s.key)} disabled={complete.isPending}>
                    Mark completed
                  </Button>
                )}
              </div>
            </div>
            {expanded === s.key && (
              <div style={{ marginTop: 12, fontSize: 13 }}>
                {s.type === "embed" ? (
                  <p>
                    {s.embedKind ?? "embed"}:{" "}
                    <a href={s.embedUrl} target="_blank" rel="noreferrer">
                      {s.embedUrl}
                    </a>
                  </p>
                ) : (
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{s.body}</pre>
                )}
              </div>
            )}
          </Card>
        ))}

      {(start.isError || complete.isError) && (
        <ErrorBanner message={((start.error ?? complete.error) as Error).message} />
      )}
    </div>
  );
}
