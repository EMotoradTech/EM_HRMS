import { deriveDedupeTokenHash } from '../src/dedupeToken';

describe('deriveDedupeTokenHash', () => {
  it('is deterministic for the same inputs', () => {
    const a = deriveDedupeTokenHash('secret', 'emp-123', 'monthly-pulse', '2026-09');
    const b = deriveDedupeTokenHash('secret', 'emp-123', 'monthly-pulse', '2026-09');
    expect(a).toBe(b);
  });

  it('differs when the employee identifier differs', () => {
    const a = deriveDedupeTokenHash('secret', 'emp-123', 'monthly-pulse', '2026-09');
    const b = deriveDedupeTokenHash('secret', 'emp-456', 'monthly-pulse', '2026-09');
    expect(a).not.toBe(b);
  });

  it('differs across periods for the same employee (so they can respond again next period)', () => {
    const a = deriveDedupeTokenHash('secret', 'emp-123', 'monthly-pulse', '2026-09');
    const b = deriveDedupeTokenHash('secret', 'emp-123', 'monthly-pulse', '2026-10');
    expect(a).not.toBe(b);
  });

  it('differs across surveys for the same employee and period', () => {
    const a = deriveDedupeTokenHash('secret', 'emp-123', 'monthly-pulse', '2026-09');
    const b = deriveDedupeTokenHash('secret', 'emp-123', 'daily-mood', '2026-09');
    expect(a).not.toBe(b);
  });

  it('produces a fixed-length hex hash that does not visibly contain the identifier', () => {
    const hash = deriveDedupeTokenHash('secret', 'atul.manhas@emotorad.com', 'monthly-pulse', '2026-09');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain('atul');
    expect(hash).not.toContain('emotorad');
  });

  it('throws if no secret is configured, rather than silently hashing with an empty key', () => {
    expect(() => deriveDedupeTokenHash('', 'emp-123', 'monthly-pulse', '2026-09')).toThrow(
      /DEDUPE_TOKEN_SECRET/
    );
  });
});
