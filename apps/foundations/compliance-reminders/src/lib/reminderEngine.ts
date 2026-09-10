/**
 * Pure due-date + fire-decision logic. DB-free so "fires within lead time,
 * doesn't fire otherwise" (explicitly called out in the brief) is directly
 * unit-testable against fixed dates, with no scheduler or DB involved.
 */

export interface MonthlyRecurrence {
  type: "MONTHLY";
  dayOfMonth: number; // 1-28, kept simple to avoid month-length edge cases
}

export interface ComplianceItem {
  id: string;
  name: string;
  recurrence: MonthlyRecurrence;
  owner: string;
  leadTimeDays: number;
  lastNotifiedForDueDate?: string; // ISO date, dedupes repeated fires for the same cycle
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * The next occurrence of the recurrence on or after `referenceDate`.
 * If this month's day has already passed, rolls to next month.
 */
export function computeNextDueDate(
  recurrence: MonthlyRecurrence,
  referenceDate: Date
): Date {
  const ref = startOfDay(referenceDate);
  const thisMonthDue = new Date(ref.getFullYear(), ref.getMonth(), recurrence.dayOfMonth);

  if (thisMonthDue >= ref) {
    return thisMonthDue;
  }
  return new Date(ref.getFullYear(), ref.getMonth() + 1, recurrence.dayOfMonth);
}

function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / msPerDay);
}

export interface FireDecision {
  shouldFire: boolean;
  dueDate: Date;
  daysUntilDue: number;
  reason: string;
}

/**
 * Should this item notify today? Fires once the due date is within
 * leadTimeDays (inclusive) and hasn't already been notified for that
 * specific due date.
 */
export function evaluateReminder(item: ComplianceItem, today: Date): FireDecision {
  const dueDate = computeNextDueDate(item.recurrence, today);
  const daysUntilDue = daysBetween(today, dueDate);

  if (daysUntilDue > item.leadTimeDays) {
    return {
      shouldFire: false,
      dueDate,
      daysUntilDue,
      reason: `${daysUntilDue} days out, beyond the ${item.leadTimeDays}-day lead time`,
    };
  }

  if (daysUntilDue < 0) {
    return { shouldFire: false, dueDate, daysUntilDue, reason: "Due date already passed" };
  }

  const dueDateIso = startOfDay(dueDate).toISOString();
  if (item.lastNotifiedForDueDate === dueDateIso) {
    return {
      shouldFire: false,
      dueDate,
      daysUntilDue,
      reason: "Already notified for this due date",
    };
  }

  return {
    shouldFire: true,
    dueDate,
    daysUntilDue,
    reason: `Within the ${item.leadTimeDays}-day lead time`,
  };
}
