import { PrismaClient } from '@prisma/client';
import { ProgressRecord, ProgressRepository } from './progressRepository';

/**
 * Real (Postgres via Prisma) implementation of ProgressRepository, used at
 * runtime. Not exercised in unit tests — see tests/service.test.ts, which uses
 * InMemoryProgressRepository instead.
 */
export class PrismaProgressRepository implements ProgressRepository {
  constructor(private prisma: PrismaClient) {}

  async get(joinerId: string, sectionKey: string): Promise<ProgressRecord | null> {
    const row = await this.prisma.sectionProgress.findUnique({
      where: { joinerId_sectionKey: { joinerId, sectionKey } },
    });
    return row
      ? {
          joinerId: row.joinerId,
          sectionKey: row.sectionKey,
          status: row.status as ProgressRecord['status'],
          startedAt: row.startedAt,
          completedAt: row.completedAt,
        }
      : null;
  }

  async upsert(record: ProgressRecord): Promise<ProgressRecord> {
    const row = await this.prisma.sectionProgress.upsert({
      where: {
        joinerId_sectionKey: { joinerId: record.joinerId, sectionKey: record.sectionKey },
      },
      create: { ...record },
      update: { ...record },
    });
    return {
      joinerId: row.joinerId,
      sectionKey: row.sectionKey,
      status: row.status as ProgressRecord['status'],
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    };
  }

  async listForJoiner(joinerId: string): Promise<ProgressRecord[]> {
    const rows = await this.prisma.sectionProgress.findMany({ where: { joinerId } });
    return rows.map((row: (typeof rows)[number]) => ({
      joinerId: row.joinerId,
      sectionKey: row.sectionKey,
      status: row.status as ProgressRecord['status'],
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    }));
  }
}
