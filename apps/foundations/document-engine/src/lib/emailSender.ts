/**
 * Pluggable email sender. Local dev uses LogEmailSender (stub — no real
 * send). Swap in a Gmail/SMTP-backed implementation later without
 * touching callers, per PROGRAM-OVERVIEW.md's pluggable-sender pattern.
 */

export interface EmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

export class LogEmailSender implements EmailSender {
  public sentLog: { to: string; subject: string; body: string }[] = [];

  async send(to: string, subject: string, body: string): Promise<void> {
    this.sentLog.push({ to, subject, body });
    // eslint-disable-next-line no-console
    console.log(`[stub email] to=${to} subject="${subject}"`);
  }
}
