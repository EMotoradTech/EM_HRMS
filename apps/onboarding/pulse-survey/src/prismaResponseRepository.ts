import { PrismaClient } from '@prisma/client';
import {
  AnswerEntry,
  ResponseRecord,
  ResponseRepository,
  DuplicateSubmissionError,
} from './responseRepository';

export class PrismaResponseRepository implements ResponseRepository {
  constructor(private prisma: PrismaClient) {}

  async create(record: ResponseRecord): Promise<ResponseRecord> {
    try {
      const row = await this.prisma.surveyResponse.create({
        data: {
          surveyKey: record.surveyKey,
          period: record.period,
          dedupeTokenHash: record.dedupeTokenHash,
          answers: record.answers as unknown as object,
          submittedAt: record.submittedAt,
        },
      });
      return {
        surveyKey: row.surveyKey,
        period: row.period,
        dedupeTokenHash: row.dedupeTokenHash,
        answers: row.answers as unknown as AnswerEntry[],
        submittedAt: row.submittedAt,
      };
    } catch (err: any) {
      // Prisma unique constraint violation -> our @@unique([surveyKey, period, dedupeTokenHash])
      if (err?.code === 'P2002') {
        throw new DuplicateSubmissionError();
      }
      throw err;
    }
  }

  async listBySurveyAndPeriod(surveyKey: string, period: string): Promise<ResponseRecord[]> {
    const rows = await this.prisma.surveyResponse.findMany({ where: { surveyKey, period } });
    return rows.map((row: (typeof rows)[number]) => ({
      surveyKey: row.surveyKey,
      period: row.period,
      dedupeTokenHash: row.dedupeTokenHash,
      answers: row.answers as unknown as AnswerEntry[],
      submittedAt: row.submittedAt,
    }));
  }
}
