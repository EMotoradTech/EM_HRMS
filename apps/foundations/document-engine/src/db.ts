import { PrismaClient } from "@prisma/client";

// Single shared Prisma client for this app's own isolated database
// (em_hrms_document_engine). Never import this from another app.
export const prisma = new PrismaClient();
