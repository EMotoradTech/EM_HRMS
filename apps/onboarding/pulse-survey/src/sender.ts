export interface SurveySender {
  /** Sends a survey link to a recipient. `link` should already be a fully-formed unique URL. */
  send(recipientEmail: string, subject: string, link: string): Promise<void>;
}

/**
 * Local-dev / test stub: logs instead of actually sending. Swap for a Gmail/SMTP
 * implementation of the same interface when real delivery is wired up — nothing
 * else in this app needs to change.
 */
export class ConsoleLogSender implements SurveySender {
  async send(recipientEmail: string, subject: string, link: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[stub email] To: ${recipientEmail} | Subject: ${subject} | Link: ${link}`);
  }
}
