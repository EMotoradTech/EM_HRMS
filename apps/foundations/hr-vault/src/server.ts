import "dotenv/config";
import express from "express";
import { PrismaClient } from "@prisma/client";
import { vaultRouter } from "./routes/vault";
import { VaultService } from "./services/vaultService";
import { PrismaVaultRepository } from "./services/prismaVaultRepository";

const app = express();
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
const service = new VaultService(new PrismaVaultRepository(prisma));

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use(vaultRouter(service));

const port = process.env.PORT ? Number(process.env.PORT) : 4002;
if (require.main === module) {
  app.listen(port, () => console.log(`hr-vault listening on :${port}`));
}

export { app };
