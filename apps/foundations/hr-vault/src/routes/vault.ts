import { Router, Request, Response, NextFunction } from "express";
import { VaultService, AccessDeniedError } from "../services/vaultService";

function actorFromHeaders(req: Request) {
  return {
    email: req.header("x-actor-email") ?? "",
    role: req.header("x-actor-role") ?? "",
  };
}

export function vaultRouter(service: VaultService): Router {
  const router = Router();

  router.post("/vault/documents", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = actorFromHeaders(req);
      const doc = await service.store(actor, req.body);
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.get("/vault/documents/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = actorFromHeaders(req);
      const doc = await service.read(actor, req.params.id);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/vault/documents/:id/share",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const actor = actorFromHeaders(req);
        await service.share(actor, req.params.id, req.body.granteeEmail);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    }
  );

  router.delete("/vault/documents/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = actorFromHeaders(req);
      await service.delete(actor, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  router.get(
    "/vault/documents/:id/audit-log",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const log = await service.getAuditLog(req.params.id);
        res.json(log);
      } catch (err) {
        next(err);
      }
    }
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AccessDeniedError) {
      return res.status(403).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  });

  return router;
}
