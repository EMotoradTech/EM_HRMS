import cors from 'cors';
import express, { Request, Response } from 'express';
import { TrainingService } from './service';

export function createServer(service: TrainingService) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  app.get('/modules', (_req: Request, res: Response) => {
    // Never leak correctIndex to the client
    const safe = service.listModules().map(({ key, title, order, lessonBody, quiz }) => ({
      key,
      title,
      order,
      lessonBody,
      quiz: quiz.map((q) => ({ question: q.question, options: q.options })),
    }));
    res.json(safe);
  });

  app.get('/joiners/:joinerId/progress', async (req: Request, res: Response) => {
    res.json(await service.getJoinerView(req.params.joinerId));
  });

  app.post('/joiners/:joinerId/modules/:moduleKey/complete', async (req: Request, res: Response) => {
    try {
      res.json(await service.markCompleted(req.params.joinerId, req.params.moduleKey));
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/joiners/:joinerId/modules/:moduleKey/quiz', async (req: Request, res: Response) => {
    try {
      const answers = req.body?.answers;
      if (!Array.isArray(answers)) {
        return res.status(400).json({ error: '"answers" must be an array of option indices' });
      }
      res.json(await service.submitQuiz(req.params.joinerId, req.params.moduleKey, { answers }));
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}
