// Same pluggable-sender pattern as document-engine's LogEmailSender.
export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class LogEmailSender implements EmailSender {
  public sentLog: { to: string; subject: string; body: string }[] = [];

  async send(to: string, subject: string, body: string): Promise<void> {
    this.sentLog.push({ to, subject, body });
    console.log(`[stub email] to=${to} subject="${subject}"`);
  }
}
