import { shouldFire, periodFor } from '../src/scheduler';

describe('shouldFire', () => {
  it('fires when the survey has never been sent before, regardless of cadence', () => {
    expect(shouldFire('DAILY', null, new Date('2026-09-10T09:00:00Z'))).toBe(true);
    expect(shouldFire('MONTHLY', null, new Date('2026-09-10T09:00:00Z'))).toBe(true);
  });

  describe('DAILY cadence', () => {
    it('does not fire again on the same calendar day', () => {
      const lastSent = new Date('2026-09-10T03:00:00Z');
      const now = new Date('2026-09-10T18:00:00Z');
      expect(shouldFire('DAILY', lastSent, now)).toBe(false);
    });

    it('fires again once the calendar day has changed', () => {
      const lastSent = new Date('2026-09-10T03:00:00Z');
      const now = new Date('2026-09-11T03:00:00Z');
      expect(shouldFire('DAILY', lastSent, now)).toBe(true);
    });
  });

  describe('MONTHLY cadence', () => {
    it('does not fire again within the same calendar month', () => {
      const lastSent = new Date('2026-09-01T03:00:00Z');
      const now = new Date('2026-09-28T03:00:00Z');
      expect(shouldFire('MONTHLY', lastSent, now)).toBe(false);
    });

    it('fires again once the calendar month has changed', () => {
      const lastSent = new Date('2026-09-28T03:00:00Z');
      const now = new Date('2026-10-01T03:00:00Z');
      expect(shouldFire('MONTHLY', lastSent, now)).toBe(true);
    });

    it('fires again across a year boundary', () => {
      const lastSent = new Date('2026-12-15T03:00:00Z');
      const now = new Date('2027-01-05T03:00:00Z');
      expect(shouldFire('MONTHLY', lastSent, now)).toBe(true);
    });
  });
});

describe('periodFor', () => {
  it('returns a YYYY-MM period for MONTHLY cadence', () => {
    expect(periodFor('MONTHLY', new Date('2026-09-10T00:00:00Z'))).toBe('2026-09');
  });

  it('returns a YYYY-MM-DD period for DAILY cadence', () => {
    expect(periodFor('DAILY', new Date('2026-09-10T00:00:00Z'))).toBe('2026-09-10');
  });
});
