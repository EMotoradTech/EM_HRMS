import { Router, Request, Response, NextFunction } from "express";
import { ExitService } from "../services/exitService";

export function exitCasesRouter(service: ExitService): Router {
  const router = Router();

  router.get("/exit-cases", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.listAll());
    } catch (err) {
      next(err);
    }
  });

  router.post("/exit-cases", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeEmail, designation, lastWorkingDay, approverEmails } = req.body;
      if (!employeeEmail || !designation || !lastWorkingDay || !Array.isArray(approverEmails)) {
        return res.status(400).json({
          error: "employeeEmail, designation, lastWorkingDay, approverEmails[] are required",
        });
      }
      const exitCase = await service.initiate({
        employeeEmail,
        designation,
        lastWorkingDay,
        approverEmails,
      });
      res.status(201).json(exitCase);
    } catch (err) {
      next(err);
    }
  });

  router.post("/exit-cases/:id/sync", async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.syncWithDocumentEngine(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/exit-cases/:id/complete",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await service.attemptComplete(req.params.id);
        res.status(result.completed ? 200 : 409).json(result);
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/exit-cases/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.getStatus(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
