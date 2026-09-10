import 'dotenv/config';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { loadSections } from './contentLoader';
import { InductionService } from './service';
import { PrismaProgressRepository } from './prismaProgressRepository';
import { createServer } from './server';

const PORT = Number(process.env.PORT ?? 4001);
const CONTENT_DIR = path.resolve(process.env.CONTENT_DIR ?? './content');

const prisma = new PrismaClient();
const sections = loadSections(CONTENT_DIR);
const service = new InductionService(sections, new PrismaProgressRepository(prisma));
const app = createServer(service);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`induction-portal listening on :${PORT} (${sections.length} sections loaded)`);
});
