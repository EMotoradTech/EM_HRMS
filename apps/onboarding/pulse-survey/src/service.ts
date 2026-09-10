import { SurveyDefinition } from './contentLoader';
import { deriveDedupeTokenHash } from './dedupeToken';
import { periodFor } from './scheduler';
import { AnswerEntry, ResponseRepository } from './responseRepository';

export interface SubmissionInput {
  employeeIdentifier: string; // used only to derive the one-way dedupe hash below; never persisted
  answers: AnswerEntry[];
}

export interface AggregateQuestionResult {
  questionId: string;
  prompt: string;
  type: SurveyDefinition['questions'][number]['type'];
  // For multiple_choice: option -> count. For scale: average + distribution. For free_text: just a count of responses.
  optionCounts?: Record<string, number>;
  average?: number;
  responseCount: number;
}

export interface AggregateReport {
  surveyKey: string;
  period: string;
  totalResponses: number;
  questions: AggregateQuestionResult[];
}

export class PulseSurveyService {
  constructor(
    private surveys: SurveyDefinition[],
    private repo: ResponseRepository,
    private dedupeSecret: string
  ) {}

  private getSurvey(surveyKey: string): SurveyDefinition {
    const survey = this.surveys.find((s) => s.key === surveyKey);
    if (!survey) {
      throw new Error(`Unknown survey key "${surveyKey}"`);
    }
    return survey;
  }

  /**
   * Records a response for the current period. `employeeIdentifier` is used ONLY
   * to derive a one-way hash for duplicate detection — it is never stored, and
   * the stored hash cannot be reversed back to it. See dedupeToken.ts.
   */
  async submitResponse(surveyKey: string, input: SubmissionInput, now: Date = new Date()) {
    const survey = this.getSurvey(surveyKey);
    const period = periodFor(survey.cadence, now);

    const requiredIds = new Set(survey.questions.map((q) => q.id));
    for (const a of input.answers) {
      if (!requiredIds.has(a.questionId)) {
        throw new Error(`Answer references unknown question id "${a.questionId}"`);
      }
    }

    const dedupeTokenHash = deriveDedupeTokenHash(
      this.dedupeSecret,
      input.employeeIdentifier,
      surveyKey,
      period
    );

    return this.repo.create({
      surveyKey,
      period,
      dedupeTokenHash,
      answers: input.answers,
      submittedAt: now,
    });
  }

  /**
   * Aggregate-only report for a survey period — never a per-response view.
   * There is deliberately no method on this class that returns raw response
   * rows to a caller; only these computed aggregates.
   */
  async getAggregateReport(surveyKey: string, period: string): Promise<AggregateReport> {
    const survey = this.getSurvey(surveyKey);
    const responses = await this.repo.listBySurveyAndPeriod(surveyKey, period);

    const questions: AggregateQuestionResult[] = survey.questions.map((q) => {
      const answersForQuestion = responses
        .map((r) => r.answers.find((a) => a.questionId === q.id))
        .filter((a): a is AnswerEntry => a !== undefined);

      if (q.type === 'scale') {
        const values = answersForQuestion.map((a) => Number(a.value));
        const average = values.length
          ? values.reduce((sum, v) => sum + v, 0) / values.length
          : 0;
        return {
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          average: Math.round(average * 100) / 100,
          responseCount: values.length,
        };
      }

      if (q.type === 'multiple_choice') {
        const optionCounts: Record<string, number> = {};
        for (const opt of q.options ?? []) {
          optionCounts[opt] = 0;
        }
        for (const a of answersForQuestion) {
          const key = String(a.value);
          optionCounts[key] = (optionCounts[key] ?? 0) + 1;
        }
        return {
          questionId: q.id,
          prompt: q.prompt,
          type: q.type,
          optionCounts,
          responseCount: answersForQuestion.length,
        };
      }

      // free_text: aggregate view is just a count — never surface raw text per-respondent
      // here, since free text is the easiest field to accidentally re-identify someone from.
      return {
        questionId: q.id,
        prompt: q.prompt,
        type: q.type,
        responseCount: answersForQuestion.length,
      };
    });

    return {
      surveyKey,
      period,
      totalResponses: responses.length,
      questions,
    };
  }

  listSurveys(): SurveyDefinition[] {
    return this.surveys;
  }
}
