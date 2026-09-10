// Pluggable notifier: swap ConsoleNotifier for a real email/Slack integration
// later without touching the routes that call notify().
export interface StakeholderNotifier {
  notify(to: string, subject: string, body: string): Promise<{ delivered: boolean; provider: string }>;
}

export class ConsoleNotifier implements StakeholderNotifier {
  async notify(to: string, subject: string, body: string) {
    // eslint-disable-next-line no-console
    console.log(`[stub notification] to=${to} subject="${subject}"\n${body}`);
    return { delivered: true, provider: "console-stub" };
  }
}

let activeNotifier: StakeholderNotifier = new ConsoleNotifier();

export function setStakeholderNotifier(notifier: StakeholderNotifier): void {
  activeNotifier = notifier;
}

export function getStakeholderNotifier(): StakeholderNotifier {
  return activeNotifier;
}
