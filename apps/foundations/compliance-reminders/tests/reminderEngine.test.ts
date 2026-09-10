import { computeNextDueDate, evaluateReminder, ComplianceItem } from "../src/lib/reminderEngine";

function pfItem(overrides: Partial<ComplianceItem> = {}): ComplianceItem {
  return {
    id: "pf-1",
    name: "PF payment",
    recurrence: { type: "MONTHLY", dayOfMonth: 15 },
    owner: "payroll@emotorad.com",
    leadTimeDays: 5,
    ...overrides,
  };
}

describe("computeNextDueDate", () => {
  it("returns this month's date if it hasn't passed yet", () => {
    const due = computeNextDueDate({ type: "MONTHLY", dayOfMonth: 15 }, new Date(2026, 8, 10));
    expect(due.getMonth()).toBe(8);
    expect(due.getDate()).toBe(15);
  });

  it("rolls to next month if this month's date already passed", () => {
    const due = computeNextDueDate({ type: "MONTHLY", dayOfMonth: 15 }, new Date(2026, 8, 20));
    expect(due.getMonth()).toBe(9);
    expect(due.getDate()).toBe(15);
  });
});

describe("evaluateReminder", () => {
  it("does not fire when the deadline is well beyond the lead time", () => {
    const decision = evaluateReminder(pfItem(), new Date(2026, 8, 1)); // due 15th, 14 days out, lead=5
    expect(decision.shouldFire).toBe(false);
  });

  it("fires when the deadline is within the lead time", () => {
    const decision = evaluateReminder(pfItem(), new Date(2026, 8, 11)); // 4 days out, lead=5
    expect(decision.shouldFire).toBe(true);
  });

  it("fires exactly at the lead-time boundary (inclusive)", () => {
    const decision = evaluateReminder(pfItem(), new Date(2026, 8, 10)); // exactly 5 days out
    expect(decision.shouldFire).toBe(true);
  });

  it("does not fire twice for the same due date once already notified", () => {
    const dueDateIso = new Date(2026, 8, 15).toISOString();
    const decision = evaluateReminder(
      pfItem({ lastNotifiedForDueDate: dueDateIso }),
      new Date(2026, 8, 12)
    );
    expect(decision.shouldFire).toBe(false);
    expect(decision.reason).toMatch(/already notified/i);
  });

  it("fires again once the cycle rolls over to a new due date", () => {
    // Notified for September's 15th; checking in October, ahead of October's 15th within lead time.
    const decision = evaluateReminder(
      pfItem({ lastNotifiedForDueDate: new Date(2026, 8, 15).toISOString() }),
      new Date(2026, 9, 11)
    );
    expect(decision.shouldFire).toBe(true);
  });
});
