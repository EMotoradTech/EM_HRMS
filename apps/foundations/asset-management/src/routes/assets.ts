import { Router, Request, Response, NextFunction } from "express";
import { AssetService, AssetStateError } from "../services/assetService";

export function assetsRouter(service: AssetService): Router {
  const router = Router();

  router.post("/assets", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type, identifier } = req.body;
      if (!type || !identifier) {
        return res.status(400).json({ error: "type and identifier are required" });
      }
      res.status(201).json(await service.createAsset({ type, identifier }));
    } catch (err) {
      next(err);
    }
  });

  router.post("/assets/:id/issue", async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.issue(req.params.id, req.body.employeeEmail));
    } catch (err) {
      next(err);
    }
  });

  router.post("/assets/:id/return", async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.returnAsset(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.post("/assets/:id/lost", async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.markLost(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.get(
    "/employees/:email/assets",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(await service.assetsIssuedTo(req.params.email));
      } catch (err) {
        next(err);
      }
    }
  );

  router.get("/assets/unreturned", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      res.json(await service.assetsNeverReturned());
    } catch (err) {
      next(err);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AssetStateError) {
      return res.status(409).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  });

  return router;
}
