export interface AnswerEntry {
  questionId: string;
  value: string | number;
}

// NOTE: deliberately no name/email/employeeId field anywhere on this type —
// see prisma/schema.prisma for the anonymity rationale.
export interface ResponseRecord {
  surveyKey: string;
  period: string;
  dedupeTokenHash: string;
  answers: AnswerEntry[];
  submittedAt: Date;
}

export class DuplicateSubmissionError extends Error {
  constructor() {
    super('A response has already been submitted for this survey period.');
  }
}

export interface ResponseRepository {
  create(record: ResponseRecord): Promise<ResponseRecord>;
  listBySurveyAndPeriod(surveyKey: string, period: string): Promise<ResponseRecord[]>;
}

export class InMemoryResponseRepository implements ResponseRepository {
  private records: ResponseRecord[] = [];

  async create(record: ResponseRecord): Promise<ResponseRecord> {
    const duplicate = this.records.find(
      (r) =>
        r.surveyKey === record.surveyKey &&
        r.period === record.period &&
        r.dedupeTokenHash === record.dedupeTokenHash
    );
    if (duplicate) {
      throw new DuplicateSubmissionError();
    }
    this.records.push(record);
    return record;
  }

  async listBySurveyAndPeriod(surveyKey: string, period: string): Promise<ResponseRecord[]> {
    return this.records.filter((r) => r.surveyKey === surveyKey && r.period === period);
  }
}
