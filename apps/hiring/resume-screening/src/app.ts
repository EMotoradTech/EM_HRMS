import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { jobDescriptionsRouter } from "./routes/jobDescriptions";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/job-descriptions", jobDescriptionsRouter);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: err.message ?? "Internal server error" });
  });

  return app;
}
