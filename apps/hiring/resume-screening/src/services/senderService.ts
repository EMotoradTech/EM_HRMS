// Pluggable sender: swap ConsoleEmailSender for a real SMTP/Gmail-API-backed
// implementation later without touching the routes that call send().
export interface ShortlistSender {
  send(to: string[], subject: string, body: string): Promise<{ delivered: boolean; provider: string }>;
}

export class ConsoleEmailSender implements ShortlistSender {
  async send(to: string[], subject: string, body: string) {
    // eslint-disable-next-line no-console
    console.log(`[stub email] to=${to.join(", ")} subject="${subject}"\n${body}`);
    return { delivered: true, provider: "console-stub" };
  }
}

let activeSender: ShortlistSender = new ConsoleEmailSender();

export function setShortlistSender(sender: ShortlistSender): void {
  activeSender = sender;
}

export function getShortlistSender(): ShortlistSender {
  return activeSender;
}
