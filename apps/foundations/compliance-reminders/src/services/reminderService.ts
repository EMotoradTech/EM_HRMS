import { PrismaClient } from "@prisma/client";
import { ComplianceItem, evaluateReminder } from "../lib/reminderEngine";
import { EmailSender } from "../lib/emailSender";

export class ReminderService {
  constructor(private prisma: PrismaClient, private emailSender: EmailSender) {}

  async createItem(input: {
    name: string;
    dayOfMonth: number;
    owner: string;
    leadTimeDays: number;
  }) {
    return this.prisma.complianceItem.create({
      data: {
        name: input.name,
        dayOfMonth: input.dayOfMonth,
        owner: input.owner,
        leadTimeDays: input.leadTimeDays,
      },
    });
  }

  async listItems() {
    return this.prisma.complianceItem.findMany();
  }

  /** Runs once per day (see scheduler.ts). Notifies + records lastNotifiedForDueDate. */
  async runDailyCheck(today: Date = new Date()): Promise<{ notified: string[] }> {
    const records = await this.prisma.complianceItem.findMany();
    const notified: string[] = [];

    for (const record of records) {
      const item: ComplianceItem = {
        id: record.id,
        name: record.name,
        recurrence: { type: "MONTHLY", dayOfMonth: record.dayOfMonth },
        owner: record.owner,
        leadTimeDays: record.leadTimeDays,
        lastNotifiedForDueDate: record.lastNotifiedForDueDate?.toISOString(),
      };

      const decision = evaluateReminder(item, today);
      if (decision.shouldFire) {
        await this.emailSender.send(
          item.owner,
          `Compliance deadline approaching: ${item.name}`,
          `${item.name} is due on ${decision.dueDate.toDateString()} (${decision.daysUntilDue} day(s) away).`
        );
        await this.prisma.complianceItem.update({
          where: { id: record.id },
          data: { lastNotifiedForDueDate: decision.dueDate },
        });
        notified.push(record.id);
      }
    }

    return { notified };
  }
}
