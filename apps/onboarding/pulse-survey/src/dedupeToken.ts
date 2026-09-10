import crypto from 'crypto';

/**
 * Produces a one-way, non-reversible token used ONLY to detect a duplicate
 * submission from the same person within the same survey period. It is NOT
 * an identifier and must never be stored anywhere alongside a name, email, or
 * employee ID — only alongside the response content itself (see prisma schema).
 *
 * `employeeIdentifier` (e.g. an employee ID or email) exists only transiently
 * in the recipient's unique survey link / this function's input — never
 * persisted in plaintext by this service.
 */
export function deriveDedupeTokenHash(
  secret: string,
  employeeIdentifier: string,
  surveyKey: string,
  period: string
): string {
  if (!secret) {
    throw new Error('DEDUPE_TOKEN_SECRET is required to derive a dedupe token.');
  }
  return crypto
    .createHmac('sha256', secret)
    .update(`${surveyKey}::${period}::${employeeIdentifier}`)
    .digest('hex');
}
