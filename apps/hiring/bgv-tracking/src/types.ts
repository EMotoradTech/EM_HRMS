// Mirrors the Prisma enums in prisma/schema.prisma, kept as plain string
// literal types so the status-computation logic in statusEngine.ts has no
// dependency on the generated Prisma client and can be unit tested without a
// database or a `prisma generate` step.
export type CheckType =
  | "EDUCATION"
  | "EMPLOYMENT"
  | "ADDRESS"
  | "IDENTITY"
  | "CRIMINAL_RECORD"
  | "REFERENCE";

export type CheckStatus = "PENDING" | "IN_PROGRESS" | "VERIFIED" | "FLAGGED" | "FAILED";

export type OverallStatus = "IN_PROGRESS" | "COMPLETE" | "BLOCKED";

export interface CheckLike {
  type: CheckType;
  status: CheckStatus;
}

export const DEFAULT_CHECK_TYPES: CheckType[] = ["EDUCATION", "EMPLOYMENT", "ADDRESS", "IDENTITY"];
