import "dotenv/config";
import cors from "cors";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { assetsRouter } from "./routes/assets";
import { AssetService } from "./services/assetService";

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
const service = new AssetService(prisma);

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(assetsRouter(service));

const port = process.env.PORT ? Number(process.env.PORT) : 4004;
if (require.main === module) {
  app.listen(port, () => console.log(`asset-management listening on :${port}`));
}

export { app };
