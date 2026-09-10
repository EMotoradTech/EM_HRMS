import { Router, Request, Response, NextFunction } from "express";
import { DocumentService, ApprovalEngineError } from "../services/documentService";

export function documentsRouter(service: DocumentService): Router {
  const router = Router();

  router.post("/documents", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateType, data, recipientEmail, approverEmails } = req.body;
      if (!templateType || !recipientEmail || !Array.isArray(approverEmails)) {
        return res.status(400).json({
          error: "templateType, recipientEmail, and approverEmails[] are required",
        });
      }
      const doc = await service.createDocument({
        templateType,
        data: data ?? {},
        recipientEmail,
        approverEmails,
      });
      res.status(201).json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.post(
    "/documents/:id/approve",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { approverEmail, comment } = req.body;
        const doc = await service.approve(req.params.id, approverEmail, comment);
        res.json(doc);
      } catch (err) {
        next(err);
      }
    }
  );

  router.post(
    "/documents/:id/reject",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { approverEmail, comment } = req.body;
        const doc = await service.reject(req.params.id, approverEmail, comment);
        res.json(doc);
      } catch (err) {
        next(err);
      }
    }
  );

  router.post("/documents/:id/send", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await service.send(req.params.id);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.post("/documents/:id/sign", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { signerName, ipAddress } = req.body;
      const doc = await service.sign(req.params.id, signerName, ipAddress);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.post("/documents/:id/file", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await service.file(req.params.id);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  router.get("/documents/:id/status", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await service.getStatus(req.params.id);
      res.json(doc);
    } catch (err) {
      next(err);
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  router.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ApprovalEngineError) {
      return res.status(409).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  });

  return router;
}
