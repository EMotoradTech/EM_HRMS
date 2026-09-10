import 'dotenv/config';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { loadModules } from './contentLoader';
import { TrainingService } from './service';
import { PrismaProgressRepository } from './prismaProgressRepository';
import { createServer } from './server';

const PORT = Number(process.env.PORT ?? 4002);
const CONTENT_DIR = path.resolve(process.env.CONTENT_DIR ?? './content');

const prisma = new PrismaClient();
const modules = loadModules(CONTENT_DIR);
const service = new TrainingService(modules, new PrismaProgressRepository(prisma));
const app = createServer(service);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`product-training listening on :${PORT} (${modules.length} modules loaded)`);
});
