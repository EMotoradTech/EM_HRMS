import { TrainingService } from '../src/service';
import { InMemoryProgressRepository } from '../src/progressRepository';
import { Module } from '../src/contentLoader';

const MODULES: Module[] = [
  {
    key: 'lineup',
    title: 'Product Lineup',
    order: 1,
    lessonBody: 'x',
    quiz: [
      { question: 'Q1', options: ['a', 'b', 'c'], correctIndex: 0 },
      { question: 'Q2', options: ['a', 'b', 'c'], correctIndex: 2 },
      { question: 'Q3', options: ['a', 'b', 'c'], correctIndex: 1 },
    ],
  },
  {
    key: 'specs',
    title: 'Key Specs',
    order: 2,
    lessonBody: 'y',
    quiz: [],
  },
];

function makeService() {
  return new TrainingService(MODULES, new InMemoryProgressRepository());
}

describe('TrainingService — completion tracking', () => {
  it('marks a no-quiz module completed and reflects it in the joiner view', async () => {
    const service = makeService();
    await service.markCompleted('joiner-1', 'specs');

    const view = await service.getJoinerView('joiner-1');
    const specs = view.find((m) => m.key === 'specs')!;
    expect(specs.completed).toBe(true);
    expect(specs.completedAt).not.toBeNull();
  });

  it('rejects completing an unknown module', async () => {
    const service = makeService();
    await expect(service.markCompleted('joiner-1', 'nope')).rejects.toThrow(/Unknown module key/);
  });
});

describe('TrainingService — quiz scoring', () => {
  it('produces a known, reproducible score for a fixed set of answers', () => {
    const service = makeService();
    // 2 correct out of 3 (Q1 correct, Q2 wrong, Q3 correct)
    const result = service.scoreQuiz('lineup', { answers: [0, 1, 1] });
    expect(result).toEqual({ score: 2, total: 3, passed: false }); // 2/3 = 0.667 < 0.7 threshold
  });

  it('marks a quiz passed when the score meets the 70% threshold', () => {
    const service = makeService();
    const result = service.scoreQuiz('lineup', { answers: [0, 2, 1] }); // all 3 correct
    expect(result).toEqual({ score: 3, total: 3, passed: true });
  });

  it('rejects a submission with the wrong number of answers', () => {
    const service = makeService();
    expect(() => service.scoreQuiz('lineup', { answers: [0, 1] })).toThrow(/Expected 3 answers/);
  });

  it('rejects scoring a module with no quiz', () => {
    const service = makeService();
    expect(() => service.scoreQuiz('specs', { answers: [] })).toThrow(/has no quiz/);
  });

  it('submitQuiz persists the attempt and auto-completes the module on a pass', async () => {
    const service = makeService();
    const record = await service.submitQuiz('joiner-1', 'lineup', { answers: [0, 2, 1] });

    expect(record.quizPassed).toBe(true);
    expect(record.completed).toBe(true);

    const view = await service.getJoinerView('joiner-1');
    const lineup = view.find((m) => m.key === 'lineup')!;
    expect(lineup.quizScore).toBe(3);
    expect(lineup.completed).toBe(true);
  });

  it('submitQuiz records a failed attempt without marking the module completed', async () => {
    const service = makeService();
    const record = await service.submitQuiz('joiner-1', 'lineup', { answers: [1, 1, 1] }); // 1/3

    expect(record.quizPassed).toBe(false);
    expect(record.completed).toBe(false);
  });
});
