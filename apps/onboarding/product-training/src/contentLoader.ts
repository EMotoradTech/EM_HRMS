import fs from 'fs';
import path from 'path';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Module {
  key: string;
  title: string;
  order: number;
  lessonBody: string;
  quiz: QuizQuestion[];
}

/**
 * Loads every module from a directory of JSON files. File-based (not hardcoded)
 * so the product team can add/edit a module without a developer or redeploy.
 */
export function loadModules(contentDir: string): Module[] {
  const modulesDir = path.join(contentDir, 'modules');
  if (!fs.existsSync(modulesDir)) {
    return [];
  }

  const files = fs.readdirSync(modulesDir).filter((f) => f.toLowerCase().endsWith('.json'));

  const modules: Module[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(modulesDir, file), 'utf-8');
    const data = JSON.parse(raw);

    if (!data.key || !data.title) {
      throw new Error(`Module file "${file}" is missing required fields "key"/"title".`);
    }

    const quiz: QuizQuestion[] = Array.isArray(data.quiz) ? data.quiz : [];
    for (const q of quiz) {
      if (
        typeof q.question !== 'string' ||
        !Array.isArray(q.options) ||
        typeof q.correctIndex !== 'number' ||
        q.correctIndex < 0 ||
        q.correctIndex >= q.options.length
      ) {
        throw new Error(`Module "${data.key}" has a malformed quiz question.`);
      }
    }

    return {
      key: String(data.key),
      title: String(data.title),
      order: Number(data.order ?? 0),
      lessonBody: String(data.lessonBody ?? ''),
      quiz,
    };
  });

  modules.sort((a, b) => a.order - b.order);

  const keys = new Set<string>();
  for (const m of modules) {
    if (keys.has(m.key)) {
      throw new Error(`Duplicate module key "${m.key}" found in ${modulesDir}.`);
    }
    keys.add(m.key);
  }

  return modules;
}
