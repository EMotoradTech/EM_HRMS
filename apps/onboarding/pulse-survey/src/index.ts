import 'dotenv/config';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { loadSurveys } from './contentLoader';
import { PulseSurveyService } from './service';
import { PrismaResponseRepository } from './prismaResponseRepository';
import { createServer } from './server';
import { startScheduler } from './scheduler';
import { ConsoleLogSender } from './sender';

const PORT = Number(process.env.PORT ?? 4003);
const CONTENT_DIR = path.resolve(process.env.CONTENT_DIR ?? './content');
const DEDUPE_TOKEN_SECRET = process.env.DEDUPE_TOKEN_SECRET ?? '';

const prisma = new PrismaClient();
const surveys = loadSurveys(CONTENT_DIR);
const service = new PulseSurveyService(surveys, new PrismaResponseRepository(prisma), DEDUPE_TOKEN_SECRET);
const app = createServer(service);
const sender = new ConsoleLogSender();

// Scheduler: checks daily whether the monthly pulse / daily mood check are due,
// and (in this stub) logs a send per "recipient" — swap the recipient source and
// sender implementation for real ones (e.g. Keka employee list + Gmail) later
// without touching submission/reporting logic above.
startScheduler({
  surveys: surveys.map((s) => ({ key: s.key, cadence: s.cadence })),
  getLastSentAt: async (surveyKey) => {
    const row = await prisma.surveySendLog.findUnique({ where: { surveyKey } });
    return row?.lastSentAt ?? null;
  },
  recordSent: async (surveyKey, at) => {
    await prisma.surveySendLog.upsert({
      where: { surveyKey },
      create: { surveyKey, lastSentAt: at },
      update: { lastSentAt: at },
    });
  },
  onDue: async (surveyKey) => {
    // Placeholder recipient list — real deployment pulls this from Keka/HR-Vault,
    // not from survey response data (which is never joined against identities).
    const placeholderRecipients = ['placeholder-employee@example.com'];
    for (const email of placeholderRecipients) {
      const link = `https://onboarding.emotorad.internal/surveys/${surveyKey}?e=${encodeURIComponent(email)}`;
      await sender.send(email, `EMotorad — ${surveyKey}`, link);
    }
  },
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`pulse-survey listening on :${PORT} (${surveys.length} surveys loaded)`);
});
