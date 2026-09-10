import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useApi } from "../../lib/apiClient";
import { Button, Card, ErrorBanner, Field, PageHeader } from "../../components/ui";

interface SurveyQuestion {
  id: string;
  type: "multiple_choice" | "scale" | "free_text";
  prompt: string;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

interface Survey {
  key: string;
  title: string;
  cadence: "MONTHLY" | "DAILY";
  questions: SurveyQuestion[];
}

interface AggregateReport {
  surveyKey: string;
  period: string;
  totalResponses: number;
  questions: {
    questionId: string;
    prompt: string;
    type: string;
    optionCounts?: Record<string, number>;
    average?: number;
    responseCount: number;
  }[];
}

function currentPeriod(cadence: "MONTHLY" | "DAILY"): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  if (cadence === "MONTHLY") return `${y}-${m}`;
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function SurveyCard({ survey }: { survey: Survey }) {
  const api = useApi("pulseSurvey");
  const [period, setPeriod] = useState(currentPeriod(survey.cadence));
  const [identifier, setIdentifier] = useState("test-employee-1");
  const [answers, setAnswers] = useState<Record<string, string | number>>({});

  const report = useQuery<AggregateReport>({
    queryKey: ["pulse-report", survey.key, period],
    queryFn: () => api.get(`/surveys/${survey.key}/report/${period}`),
  });

  const submit = useMutation({
    mutationFn: () =>
      api.post(`/surveys/${survey.key}/responses`, {
        employeeIdentifier: identifier,
        answers: survey.questions.map((q) => ({ questionId: q.id, value: answers[q.id] ?? "" })),
      }),
    onSuccess: () => report.refetch(),
  });

  return (
    <Card>
      <h3 style={{ margin: "0 0 2px" }}>{survey.title}</h3>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>{survey.cadence.toLowerCase()} cadence</p>

      <div className="field-row">
        <Field label="Report period" hint={survey.cadence === "MONTHLY" ? "YYYY-MM" : "YYYY-MM-DD"}>
          <input value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
      </div>
      {report.error && <ErrorBanner message={(report.error as Error).message} />}
      {report.data && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13 }}>
            <strong>{report.data.totalResponses}</strong> response(s) — aggregate only, no
            per-response data is ever exposed (by design, for anonymity).
          </p>
          {report.data.questions.map((q) => (
            <div key={q.questionId} style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>{q.prompt}</strong>
              {q.type === "scale" && <div className="muted">average: {q.average} ({q.responseCount} responses)</div>}
              {q.type === "multiple_choice" && (
                <div className="muted">
                  {Object.entries(q.optionCounts ?? {})
                    .map(([opt, count]) => `${opt}: ${count}`)
                    .join(", ")}
                </div>
              )}
              {q.type === "free_text" && <div className="muted">{q.responseCount} response(s)</div>}
            </div>
          ))}
        </div>
      )}

      <details>
        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          Submit a test response
        </summary>
        <div style={{ marginTop: 10 }}>
          {submit.isError && <ErrorBanner message={(submit.error as Error).message} />}
          {submit.isSuccess && (
            <p style={{ color: "var(--success)", fontSize: 13 }}>Submitted (anonymously — nothing identifying was stored).</p>
          )}
          <Field label="Employee identifier" hint="Used only to derive a one-way dedupe hash — never stored">
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </Field>
          {survey.questions.map((q) => (
            <Field key={q.id} label={q.prompt}>
              {q.type === "multiple_choice" && (
                <select
                  value={String(answers[q.id] ?? "")}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                >
                  <option value="">—</option>
                  {(q.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}
              {q.type === "scale" && (
                <input
                  type="number"
                  min={q.scaleMin ?? 1}
                  max={q.scaleMax ?? 5}
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: Number(e.target.value) }))}
                />
              )}
              {q.type === "free_text" && (
                <input
                  value={String(answers[q.id] ?? "")}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </Field>
          ))}
          <Button small variant="primary" onClick={() => submit.mutate()} disabled={submit.isPending}>
            Submit
          </Button>
        </div>
      </details>
    </Card>
  );
}

export function PulsePage() {
  const api = useApi("pulseSurvey");
  const { data, isLoading, error } = useQuery<Survey[]>({
    queryKey: ["pulse-surveys"],
    queryFn: () => api.get("/surveys"),
  });

  const surveys = useMemo(() => data ?? [], [data]);

  return (
    <div>
      <PageHeader
        title="Engagement & Pulse Survey"
        description="Monthly detailed pulse + daily mood check, genuinely anonymous by design — reporting is aggregate-only, there is no per-response view anywhere in this system."
      />
      {error && <ErrorBanner message={(error as Error).message} />}
      {isLoading && "Loading…"}
      {surveys.map((s) => (
        <SurveyCard key={s.key} survey={s} />
      ))}
    </div>
  );
}
