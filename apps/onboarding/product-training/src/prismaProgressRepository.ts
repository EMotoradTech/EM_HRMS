import { PrismaClient } from '@prisma/client';
import { ModuleProgressRecord, ProgressRepository } from './progressRepository';

export class PrismaProgressRepository implements ProgressRepository {
  constructor(private prisma: PrismaClient) {}

  private toRecord(row: any): ModuleProgressRecord {
    return {
      joinerId: row.joinerId,
      moduleKey: row.moduleKey,
      completed: row.completed,
      completedAt: row.completedAt,
      quizScore: row.quizScore,
      quizTotal: row.quizTotal,
      quizPassed: row.quizPassed,
      quizAttemptedAt: row.quizAttemptedAt,
    };
  }

  async get(joinerId: string, moduleKey: string): Promise<ModuleProgressRecord | null> {
    const row = await this.prisma.moduleProgress.findUnique({
      where: { joinerId_moduleKey: { joinerId, moduleKey } },
    });
    return row ? this.toRecord(row) : null;
  }

  async upsert(record: ModuleProgressRecord): Promise<ModuleProgressRecord> {
    const row = await this.prisma.moduleProgress.upsert({
      where: { joinerId_moduleKey: { joinerId: record.joinerId, moduleKey: record.moduleKey } },
      create: { ...record },
      update: { ...record },
    });
    return this.toRecord(row);
  }

  async listForJoiner(joinerId: string): Promise<ModuleProgressRecord[]> {
    const rows = await this.prisma.moduleProgress.findMany({ where: { joinerId } });
    return rows.map((r: (typeof rows)[number]) => this.toRecord(r));
  }
}
