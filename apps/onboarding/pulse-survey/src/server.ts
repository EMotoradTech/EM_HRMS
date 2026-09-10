import cors from 'cors';
import express, { Request, Response } from 'express';
import { PulseSurveyService } from './service';
import { DuplicateSubmissionError } from './responseRepository';

export function createServer(service: PulseSurveyService) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  app.get('/surveys', (_req: Request, res: Response) => {
    res.json(service.listSurveys());
  });

  // The unique link each recipient gets contains their opaque identifier as a query
  // param; it's used only in-memory to derive the dedupe hash and is never logged
  // or persisted by this route.
  app.post('/surveys/:surveyKey/responses', async (req: Request, res: Response) => {
    try {
      const { employeeIdentifier, answers } = req.body ?? {};
      if (!employeeIdentifier || !Array.isArray(answers)) {
        return res
          .status(400)
          .json({ error: '"employeeIdentifier" and "answers" (array) are required' });
      }
      const record = await service.submitResponse(req.params.surveyKey, {
        employeeIdentifier,
        answers,
      });
      // Echo back only non-identifying fields
      res.status(201).json({
        surveyKey: record.surveyKey,
        period: record.period,
        submittedAt: record.submittedAt,
      });
    } catch (err) {
      if (err instanceof DuplicateSubmissionError) {
        return res.status(409).json({ error: err.message });
      }
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // Aggregate-only — see PulseSurveyService.getAggregateReport. There is
  // deliberately no endpoint that returns raw per-response rows.
  app.get('/surveys/:surveyKey/report/:period', async (req: Request, res: Response) => {
    try {
      const report = await service.getAggregateReport(req.params.surveyKey, req.params.period);
      res.json(report);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}
