export type SectionStatus = 'NOT_STARTED' | 'STARTED' | 'COMPLETED';

export interface ProgressRecord {
  joinerId: string;
  sectionKey: string;
  status: SectionStatus;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Storage-agnostic interface for per-joiner section progress. The Prisma-backed
 * implementation is used at runtime; the in-memory one backs the unit tests so
 * core logic can be tested without a live Postgres instance.
 */
export interface ProgressRepository {
  get(joinerId: string, sectionKey: string): Promise<ProgressRecord | null>;
  upsert(record: ProgressRecord): Promise<ProgressRecord>;
  listForJoiner(joinerId: string): Promise<ProgressRecord[]>;
}

export class InMemoryProgressRepository implements ProgressRepository {
  private store = new Map<string, ProgressRecord>();

  private key(joinerId: string, sectionKey: string) {
    return `${joinerId}::${sectionKey}`;
  }

  async get(joinerId: string, sectionKey: string): Promise<ProgressRecord | null> {
    return this.store.get(this.key(joinerId, sectionKey)) ?? null;
  }

  async upsert(record: ProgressRecord): Promise<ProgressRecord> {
    this.store.set(this.key(record.joinerId, record.sectionKey), record);
    return record;
  }

  async listForJoiner(joinerId: string): Promise<ProgressRecord[]> {
    return [...this.store.values()].filter((r) => r.joinerId === joinerId);
  }
}
