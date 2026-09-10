import cron from 'node-cron';
import { Cadence } from './contentLoader';

/**
 * Pure decision function: given a cadence, the last time this survey was sent,
 * and "now," should it fire again? Kept separate from node-cron so it's
 * testable without real timers or a live scheduler.
 *
 * - DAILY: fires once every calendar day (has a day elapsed since last send,
 *   or never sent before).
 * - MONTHLY: fires once every calendar month (the month has changed since the
 *   last send, or never sent before).
 */
export function shouldFire(cadence: Cadence, lastSentAt: Date | null, now: Date): boolean {
  if (!lastSentAt) {
    return true;
  }

  if (cadence === 'DAILY') {
    return !isSameCalendarDay(lastSentAt, now);
  }

  // MONTHLY
  return !(lastSentAt.getUTCFullYear() === now.getUTCFullYear() && lastSentAt.getUTCMonth() === now.getUTCMonth());
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

/** Computes the period string used for dedup/aggregation scoping (see prisma schema). */
export function periodFor(cadence: Cadence, now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  if (cadence === 'MONTHLY') {
    return `${y}-${m}`;
  }
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Wires the pure cadence logic to real cron ticks for local dev / production.
 * Checks once a day (03:00) whether each survey's cadence says it's due, and
 * invokes `onDue` if so. `getLastSentAt` and `recordSent` let the caller track
 * last-send state however it likes (in Postgres, in this case).
 */
export function startScheduler(params: {
  surveys: { key: string; cadence: Cadence }[];
  getLastSentAt: (surveyKey: string) => Promise<Date | null>;
  recordSent: (surveyKey: string, at: Date) => Promise<void>;
  onDue: (surveyKey: string) => Promise<void>;
  now?: () => Date;
}) {
  const now = params.now ?? (() => new Date());

  return cron.schedule('0 3 * * *', async () => {
    const at = now();
    for (const survey of params.surveys) {
      const lastSentAt = await params.getLastSentAt(survey.key);
      if (shouldFire(survey.cadence, lastSentAt, at)) {
        await params.onDue(survey.key);
        await params.recordSent(survey.key, at);
      }
    }
  });
}
