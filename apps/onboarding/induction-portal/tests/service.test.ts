import { InductionService } from '../src/service';
import { InMemoryProgressRepository } from '../src/progressRepository';
import { Section } from '../src/contentLoader';

const SECTIONS: Section[] = [
  { key: 'policies', title: 'Company Policies', order: 1, type: 'markdown', body: 'x' },
  { key: 'culture-book', title: 'Culture Book', order: 2, type: 'markdown', body: 'y' },
];

function makeService() {
  return new InductionService(SECTIONS, new InMemoryProgressRepository());
}

describe('InductionService', () => {
  it('reports NOT_STARTED for every section on a joiner with no activity yet', async () => {
    const service = makeService();
    const view = await service.getJoinerView('joiner-1');

    expect(view).toHaveLength(2);
    expect(view.every((s) => s.status === 'NOT_STARTED')).toBe(true);
  });

  it('persists a "completed" section and reflects it in the joiner view', async () => {
    const service = makeService();
    await service.markCompleted('joiner-1', 'policies');

    const view = await service.getJoinerView('joiner-1');
    const policies = view.find((s) => s.key === 'policies')!;

    expect(policies.status).toBe('COMPLETED');
    expect(policies.completedAt).not.toBeNull();
    // The other section is untouched
    const culture = view.find((s) => s.key === 'culture-book')!;
    expect(culture.status).toBe('NOT_STARTED');
  });

  it('marking a section "started" does not affect other sections or other joiners', async () => {
    const service = makeService();
    await service.markStarted('joiner-1', 'policies');

    const joiner1View = await service.getJoinerView('joiner-1');
    const joiner2View = await service.getJoinerView('joiner-2');

    expect(joiner1View.find((s) => s.key === 'policies')!.status).toBe('STARTED');
    expect(joiner2View.find((s) => s.key === 'policies')!.status).toBe('NOT_STARTED');
  });

  it('never downgrades a COMPLETED section back to STARTED', async () => {
    const service = makeService();
    await service.markCompleted('joiner-1', 'policies');
    await service.markStarted('joiner-1', 'policies');

    const view = await service.getJoinerView('joiner-1');
    expect(view.find((s) => s.key === 'policies')!.status).toBe('COMPLETED');
  });

  it('rejects progress updates against an unknown section key', async () => {
    const service = makeService();
    await expect(service.markCompleted('joiner-1', 'not-a-real-section')).rejects.toThrow(
      /Unknown section key/
    );
  });
});
