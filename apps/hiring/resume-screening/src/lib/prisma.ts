import { PrismaClient } from "@prisma/client";

// Single shared client, reused across the process (avoids exhausting Postgres
// connections when this module is imported by multiple routes/services).
export const prisma = new PrismaClient();
