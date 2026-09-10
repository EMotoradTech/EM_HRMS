import cron from "node-cron";
import { ReminderService } from "./services/reminderService";

/** Fires the daily compliance check at 08:00 server time. */
export function startDailyScheduler(service: ReminderService): void {
  cron.schedule("0 8 * * *", () => {
    service.runDailyCheck().catch((err) => console.error("Daily compliance check failed:", err));
  });
}
