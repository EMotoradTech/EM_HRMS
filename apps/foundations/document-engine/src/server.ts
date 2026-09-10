import "dotenv/config";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { documentsRouter } from "./routes/documents";
import { DocumentService } from "./services/documentService";
import { LogEmailSender } from "./lib/emailSender";
import { getESignProvider } from "./lib/esign";

const app = express();
app.use(express.json());

// Simple shared-secret auth for internal service-to-service calls
// (Person B's offer-letter app calls this). See docs/contracts/document-engine-api.md.
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const key = req.header("x-internal-api-key");
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Missing or invalid x-internal-api-key" });
  }
  next();
});

const prisma = new PrismaClient();
const emailSender = new LogEmailSender();
const esignProvider = getESignProvider(process.env.ESIGN_PROVIDER);
const documentService = new DocumentService(prisma, emailSender, esignProvider);

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(documentsRouter(documentService));

const port = process.env.PORT ? Number(process.env.PORT) : 4001;
if (require.main === module) {
  app.listen(port, () => console.log(`document-engine listening on :${port}`));
}

export { app };
