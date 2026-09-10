import { Router, Request, Response, NextFunction } from "express";
import { ReminderService } from "../services/reminderService";

export function complianceItemsRouter(service: ReminderService): Router {
  const router = Router();

  router.post("/compliance-items", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, dayOfMonth, owner, leadTimeDays } = req.body;
      if (!name || !dayOfMonth || !owner || leadTimeDays === undefined) {
        return res.status(400).json({
          error: "name, dayOfMonth, owner, and leadTimeDays are required",
        });
      }
      const item = await service.createItem({ name, dayOfMonth, owner, leadTimeDays });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  });

  router.get("/compliance-items", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.listItems());
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/compliance-items/run-check",
    async (_req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(await service.runDailyCheck());
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
}
