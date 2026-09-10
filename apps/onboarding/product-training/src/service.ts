import { Module } from './contentLoader';
import { ModuleProgressRecord, ProgressRepository } from './progressRepository';

export interface QuizSubmission {
  // answers[i] = the selected option index for quiz question i, in the module's quiz order
  answers: number[];
}

export interface QuizResult {
  score: number;
  total: number;
  passed: boolean;
}

const PASS_THRESHOLD = 0.7; // 70% correct to pass, applied uniformly across modules

export class TrainingService {
  constructor(
    private modules: Module[],
    private repo: ProgressRepository
  ) {}

  private getModule(moduleKey: string): Module {
    const module = this.modules.find((m) => m.key === moduleKey);
    if (!module) {
      throw new Error(`Unknown module key "${moduleKey}"`);
    }
    return module;
  }

  /** Scores a quiz submission against a module's answer key. Pure function — no side effects. */
  scoreQuiz(moduleKey: string, submission: QuizSubmission): QuizResult {
    const module = this.getModule(moduleKey);
    if (module.quiz.length === 0) {
      throw new Error(`Module "${moduleKey}" has no quiz to score.`);
    }
    if (submission.answers.length !== module.quiz.length) {
      throw new Error(
        `Expected ${module.quiz.length} answers for module "${moduleKey}", got ${submission.answers.length}.`
      );
    }

    let score = 0;
    module.quiz.forEach((q, i) => {
      if (submission.answers[i] === q.correctIndex) {
        score += 1;
      }
    });

    const total = module.quiz.length;
    return { score, total, passed: score / total >= PASS_THRESHOLD };
  }

  /** Scores the quiz and persists the attempt + completion in one step. */
  async submitQuiz(
    joinerId: string,
    moduleKey: string,
    submission: QuizSubmission
  ): Promise<ModuleProgressRecord> {
    const result = this.scoreQuiz(moduleKey, submission);
    const existing = await this.repo.get(joinerId, moduleKey);

    return this.repo.upsert({
      joinerId,
      moduleKey,
      // Passing the quiz completes the module; failing does not auto-complete it.
      completed: result.passed || existing?.completed || false,
      completedAt: result.passed ? new Date() : existing?.completedAt ?? null,
      quizScore: result.score,
      quizTotal: result.total,
      quizPassed: result.passed,
      quizAttemptedAt: new Date(),
    });
  }

  /** For modules without a quiz — mark complete once the lesson's been viewed. */
  async markCompleted(joinerId: string, moduleKey: string): Promise<ModuleProgressRecord> {
    this.getModule(moduleKey); // validates the key exists
    const existing = await this.repo.get(joinerId, moduleKey);
    return this.repo.upsert({
      joinerId,
      moduleKey,
      completed: true,
      completedAt: new Date(),
      quizScore: existing?.quizScore ?? null,
      quizTotal: existing?.quizTotal ?? null,
      quizPassed: existing?.quizPassed ?? null,
      quizAttemptedAt: existing?.quizAttemptedAt ?? null,
    });
  }

  async getJoinerView(joinerId: string) {
    const progress = await this.repo.listForJoiner(joinerId);
    const byKey = new Map(progress.map((p) => [p.moduleKey, p]));

    return this.modules.map((module) => {
      const p = byKey.get(module.key);
      return {
        key: module.key,
        title: module.title,
        order: module.order,
        hasQuiz: module.quiz.length > 0,
        completed: p?.completed ?? false,
        completedAt: p?.completedAt ?? null,
        quizScore: p?.quizScore ?? null,
        quizTotal: p?.quizTotal ?? null,
        quizPassed: p?.quizPassed ?? null,
      };
    });
  }

  listModules(): Module[] {
    return this.modules;
  }
}
