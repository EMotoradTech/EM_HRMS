import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "../../lib/apiClient";
import { Button, Card, ErrorBanner, Field, Modal, PageHeader, StatusBadge } from "../../components/ui";

interface ModuleProgress {
  key: string;
  title: string;
  order: number;
  hasQuiz: boolean;
  completed: boolean;
  quizScore: number | null;
  quizTotal: number | null;
  quizPassed: boolean | null;
}

interface QuizModule {
  key: string;
  title: string;
  lessonBody: string;
  quiz: { question: string; options: string[] }[];
}

function QuizModal({
  joinerId,
  moduleKey,
  onClose,
}: {
  joinerId: string;
  moduleKey: string;
  onClose: () => void;
}) {
  const api = useApi("productTraining");
  const qc = useQueryClient();
  const { data: modules } = useQuery<QuizModule[]>({
    queryKey: ["training-modules"],
    queryFn: () => api.get("/modules"),
  });
  const module = modules?.find((m) => m.key === moduleKey);
  const [answers, setAnswers] = useState<number[]>([]);

  const submit = useMutation({
    mutationFn: () =>
      api.post<{ quizScore: number; quizTotal: number; quizPassed: boolean }>(
        `/joiners/${joinerId}/modules/${moduleKey}/quiz`,
        { answers }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training-progress", joinerId] }),
  });

  if (!module) return null;

  return (
    <Modal
      title={module.title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <Button
            variant="primary"
            onClick={() => submit.mutate()}
            disabled={submit.isPending || answers.length !== module.quiz.length}
          >
            Submit quiz
          </Button>
        </>
      }
    >
      {submit.isError && <ErrorBanner message={(submit.error as Error).message} />}
      {submit.data && (
        <div className="error-banner" style={{ background: "var(--success-bg)", color: "var(--success)" }}>
          Score {submit.data.quizScore}/{submit.data.quizTotal} —{" "}
          {submit.data.quizPassed ? "passed" : "not yet passed"}
        </div>
      )}
      <p style={{ fontSize: 13 }}>{module.lessonBody}</p>
      {module.quiz.map((q, qi) => (
        <div key={qi} style={{ marginBottom: 14 }}>
          <p style={{ fontWeight: 600, fontSize: 13 }}>{q.question}</p>
          {q.options.map((opt, oi) => (
            <label key={oi} style={{ display: "block", fontSize: 13, marginBottom: 4 }}>
              <input
                type="radio"
                name={`q-${qi}`}
                checked={answers[qi] === oi}
                onChange={() =>
                  setAnswers((cur) => {
                    const next = [...cur];
                    next[qi] = oi;
                    return next;
                  })
                }
              />{" "}
              {opt}
            </label>
          ))}
        </div>
      ))}
    </Modal>
  );
}

export function TrainingPage() {
  const api = useApi("productTraining");
  const qc = useQueryClient();
  const [joinerId, setJoinerId] = useState("joiner-demo-1");
  const [quizFor, setQuizFor] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ModuleProgress[]>({
    queryKey: ["training-progress", joinerId],
    queryFn: () => api.get(`/joiners/${joinerId}/progress`),
    enabled: !!joinerId,
  });

  const complete = useMutation({
    mutationFn: (key: string) => api.post(`/joiners/${joinerId}/modules/${key}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["training-progress", joinerId] }),
  });

  return (
    <div>
      <PageHeader
        title="Product Training"
        description="Basic EMotorad product knowledge for new joiners — structured lessons with an optional end-of-module quiz (70% to pass)."
      />
      <Card>
        <Field label="Joiner ID">
          <input value={joinerId} onChange={(e) => setJoinerId(e.target.value)} style={{ maxWidth: 320 }} />
        </Field>
      </Card>

      {error && <ErrorBanner message={(error as Error).message} />}
      {complete.isError && <ErrorBanner message={(complete.error as Error).message} />}
      {isLoading && "Loading…"}

      {(data ?? [])
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((m) => (
          <Card key={m.key}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{m.title}</strong>{" "}
                <StatusBadge status={m.completed ? "COMPLETED" : "NOT_STARTED"} />
                {m.hasQuiz && m.quizScore != null && (
                  <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
                    quiz: {m.quizScore}/{m.quizTotal}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {m.hasQuiz ? (
                  <Button small onClick={() => setQuizFor(m.key)}>
                    Take quiz
                  </Button>
                ) : (
                  !m.completed && (
                    <Button small variant="primary" onClick={() => complete.mutate(m.key)} disabled={complete.isPending}>
                      Mark completed
                    </Button>
                  )
                )}
              </div>
            </div>
          </Card>
        ))}

      {quizFor && <QuizModal joinerId={joinerId} moduleKey={quizFor} onClose={() => setQuizFor(null)} />}
    </div>
  );
}
