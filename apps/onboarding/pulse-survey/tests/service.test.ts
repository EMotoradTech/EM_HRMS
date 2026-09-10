import { PulseSurveyService } from '../src/service';
import { InMemoryResponseRepository, DuplicateSubmissionError } from '../src/responseRepository';
import { SurveyDefinition } from '../src/contentLoader';

const SURVEYS: SurveyDefinition[] = [
  {
    key: 'monthly-pulse',
    title: 'Monthly Pulse',
    cadence: 'MONTHLY',
    questions: [
      { id: 'q1', type: 'scale', prompt: 'How are you feeling?' },
      { id: 'q2', type: 'multiple_choice', prompt: 'Do you have what you need?', options: ['Yes', 'No'] },
      { id: 'q3', type: 'free_text', prompt: 'Anything else?' },
    ],
  },
];

const SECRET = 'test-secret';
const NOW = new Date('2026-09-10T12:00:00Z');

function makeService() {
  return new PulseSurveyService(SURVEYS, new InMemoryResponseRepository(), SECRET);
}

describe('PulseSurveyService — anonymity', () => {
  it('never stores an identifying field on a submitted response — REQUIRED TEST per brief', async () => {
    const repo = new InMemoryResponseRepository();
    const service = new PulseSurveyService(SURVEYS, repo, SECRET);

    await service.submitResponse(
      'monthly-pulse',
      {
        employeeIdentifier: 'atul.manhas@emotorad.com',
        answers: [
          { questionId: 'q1', value: 4 },
          { questionId: 'q2', value: 'Yes' },
          { questionId: 'q3', value: 'Loving the new office plants' },
        ],
      },
      NOW
    );

    const stored = await repo.listBySurveyAndPeriod('monthly-pulse', '2026-09');
    expect(stored).toHaveLength(1);

    const record = stored[0];
    const allFieldNames = Object.keys(record);
    // No field name resembling an identity field anywhere on the stored record
    for (const field of allFieldNames) {
      expect(field.toLowerCase()).not.toMatch(/name|email|employee|user|ip/);
    }

    // And the identifier string itself must not appear anywhere in the serialized record —
    // not even inside answers, dedupeTokenHash, or any other field.
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain('atul.manhas@emotorad.com');
    expect(serialized).not.toContain('atul');
  });

  it('rejects a second submission from the same person in the same period (dedup, not identity)', async () => {
    const service = makeService();
    const submission = {
      employeeIdentifier: 'emp-123',
      answers: [
        { questionId: 'q1', value: 3 },
        { questionId: 'q2', value: 'Yes' },
        { questionId: 'q3', value: '' },
      ],
    };

    await service.submitResponse('monthly-pulse', submission, NOW);
    await expect(service.submitResponse('monthly-pulse', submission, NOW)).rejects.toThrow(
      DuplicateSubmissionError
    );
  });

  it('allows the same person to respond again once the period changes', async () => {
    const service = makeService();
    const submission = {
      employeeIdentifier: 'emp-123',
      answers: [
        { questionId: 'q1', value: 3 },
        { questionId: 'q2', value: 'Yes' },
        { questionId: 'q3', value: '' },
      ],
    };

    await service.submitResponse('monthly-pulse', submission, new Date('2026-09-10T12:00:00Z'));
    await expect(
      service.submitResponse('monthly-pulse', submission, new Date('2026-10-01T12:00:00Z'))
    ).resolves.toBeDefined();
  });
});

describe('PulseSurveyService — aggregate reporting', () => {
  it('produces aggregate-only stats and never exposes a per-response view', async () => {
    const service = makeService();
    await service.submitResponse(
      'monthly-pulse',
      {
        employeeIdentifier: 'emp-1',
        answers: [
          { questionId: 'q1', value: 4 },
          { questionId: 'q2', value: 'Yes' },
          { questionId: 'q3', value: 'great' },
        ],
      },
      NOW
    );
    await service.submitResponse(
      'monthly-pulse',
      {
        employeeIdentifier: 'emp-2',
        answers: [
          { questionId: 'q1', value: 2 },
          { questionId: 'q2', value: 'No' },
          { questionId: 'q3', value: 'meh' },
        ],
      },
      NOW
    );

    const report = await service.getAggregateReport('monthly-pulse', '2026-09');

    expect(report.totalResponses).toBe(2);
    const q1 = report.questions.find((q) => q.questionId === 'q1')!;
    expect(q1.average).toBe(3); // (4 + 2) / 2

    const q2 = report.questions.find((q) => q.questionId === 'q2')!;
    expect(q2.optionCounts).toEqual({ Yes: 1, No: 1 });

    const q3 = report.questions.find((q) => q.questionId === 'q3')!;
    // free_text aggregates to a count only — never the raw text
    expect(q3.responseCount).toBe(2);
    expect((q3 as any).rawResponses).toBeUndefined();
    expect(JSON.stringify(report)).not.toContain('great');
    expect(JSON.stringify(report)).not.toContain('meh');
  });
});
