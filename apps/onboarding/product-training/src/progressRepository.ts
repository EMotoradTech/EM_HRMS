export interface ModuleProgressRecord {
  joinerId: string;
  moduleKey: string;
  completed: boolean;
  completedAt: Date | null;
  quizScore: number | null;
  quizTotal: number | null;
  quizPassed: boolean | null;
  quizAttemptedAt: Date | null;
}

export interface ProgressRepository {
  get(joinerId: string, moduleKey: string): Promise<ModuleProgressRecord | null>;
  upsert(record: ModuleProgressRecord): Promise<ModuleProgressRecord>;
  listForJoiner(joinerId: string): Promise<ModuleProgressRecord[]>;
}

export class InMemoryProgressRepository implements ProgressRepository {
  private store = new Map<string, ModuleProgressRecord>();

  private key(joinerId: string, moduleKey: string) {
    return `${joinerId}::${moduleKey}`;
  }

  async get(joinerId: string, moduleKey: string): Promise<ModuleProgressRecord | null> {
    return this.store.get(this.key(joinerId, moduleKey)) ?? null;
  }

  async upsert(record: ModuleProgressRecord): Promise<ModuleProgressRecord> {
    this.store.set(this.key(record.joinerId, record.moduleKey), record);
    return record;
  }

  async listForJoiner(joinerId: string): Promise<ModuleProgressRecord[]> {
    return [...this.store.values()].filter((r) => r.joinerId === joinerId);
  }
}
