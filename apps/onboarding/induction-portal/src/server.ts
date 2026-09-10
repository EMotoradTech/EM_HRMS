import express, { Request, Response } from 'express';
import { InductionService } from './service';

export function createServer(service: InductionService) {
  const app = express();
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  // All sections, no per-joiner progress — used to render the static structure.
  app.get('/sections', (_req: Request, res: Response) => {
    res.json(service.listSections());
  });

  // All sections merged with a specific joiner's progress.
  app.get('/joiners/:joinerId/progress', async (req: Request, res: Response) => {
    const view = await service.getJoinerView(req.params.joinerId);
    res.json(view);
  });

  app.post(
    '/joiners/:joinerId/sections/:sectionKey/start',
    async (req: Request, res: Response) => {
      try {
        const record = await service.markStarted(req.params.joinerId, req.params.sectionKey);
        res.json(record);
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  );

  app.post(
    '/joiners/:joinerId/sections/:sectionKey/complete',
    async (req: Request, res: Response) => {
      try {
        const record = await service.markCompleted(req.params.joinerId, req.params.sectionKey);
        res.json(record);
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  );

  return app;
}
