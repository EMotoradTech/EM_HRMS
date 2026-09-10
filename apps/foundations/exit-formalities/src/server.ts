import "dotenv/config";
import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { exitCasesRouter } from "./routes/exitCases";
import { ExitService } from "./services/exitService";
import { DocumentEngineClient, AssetManagementClient } from "./lib/clients";

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const key = req.header("x-internal-api-key");
  if (!key || key !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: "Missing or invalid x-internal-api-key" });
  }
  next();
});

const prisma = new PrismaClient();
const apiKey = process.env.INTERNAL_API_KEY ?? "";
const documentEngine = new DocumentEngineClient(
  process.env.DOCUMENT_ENGINE_URL ?? "http://localhost:4001",
  apiKey
);
const assetManagement = new AssetManagementClient(
  process.env.ASSET_MANAGEMENT_URL ?? "http://localhost:4004",
  apiKey
);
const service = new ExitService(prisma, documentEngine, assetManagement);

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(exitCasesRouter(service));

const port = process.env.PORT ? Number(process.env.PORT) : 4005;
if (require.main === module) {
  app.listen(port, () => console.log(`exit-formalities listening on :${port}`));
}

export { app };
