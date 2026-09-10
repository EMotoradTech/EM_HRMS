import { Section } from './contentLoader';
import { ProgressRecord, ProgressRepository } from './progressRepository';

export interface SectionWithProgress extends Section {
  status: ProgressRecord['status'];
  startedAt: Date | null;
  completedAt: Date | null;
}

export class InductionService {
  constructor(
    private sections: Section[],
    private repo: ProgressRepository
  ) {}

  private sectionExists(sectionKey: string): boolean {
    return this.sections.some((s) => s.key === sectionKey);
  }

  /** Marks a section "started" for a joiner (idempotent — won't downgrade COMPLETED). */
  async markStarted(joinerId: string, sectionKey: string): Promise<ProgressRecord> {
    if (!this.sectionExists(sectionKey)) {
      throw new Error(`Unknown section key "${sectionKey}"`);
    }
    const existing = await this.repo.get(joinerId, sectionKey);
    if (existing && existing.status === 'COMPLETED') {
      return existing; // never downgrade a completed section back to started
    }
    return this.repo.upsert({
      joinerId,
      sectionKey,
      status: 'STARTED',
      startedAt: existing?.startedAt ?? new Date(),
      completedAt: null,
    });
  }

  /** Marks a section "completed" for a joiner. This is the persisted signal HR sees. */
  async markCompleted(joinerId: string, sectionKey: string): Promise<ProgressRecord> {
    if (!this.sectionExists(sectionKey)) {
      throw new Error(`Unknown section key "${sectionKey}"`);
    }
    const existing = await this.repo.get(joinerId, sectionKey);
    return this.repo.upsert({
      joinerId,
      sectionKey,
      status: 'COMPLETED',
      startedAt: existing?.startedAt ?? new Date(),
      completedAt: new Date(),
    });
  }

  /** Returns every section merged with this joiner's progress (NOT_STARTED by default). */
  async getJoinerView(joinerId: string): Promise<SectionWithProgress[]> {
    const progress = await this.repo.listForJoiner(joinerId);
    const byKey = new Map(progress.map((p) => [p.sectionKey, p]));

    return this.sections.map((section) => {
      const p = byKey.get(section.key);
      return {
        ...section,
        status: p?.status ?? 'NOT_STARTED',
        startedAt: p?.startedAt ?? null,
        completedAt: p?.completedAt ?? null,
      };
    });
  }

  listSections(): Section[] {
    return this.sections;
  }
}
