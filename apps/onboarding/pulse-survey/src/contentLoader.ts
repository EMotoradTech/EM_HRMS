import fs from 'fs';
import path from 'path';

export type Cadence = 'MONTHLY' | 'DAILY';

export interface SurveyQuestion {
  id: string;
  type: 'multiple_choice' | 'scale' | 'free_text';
  prompt: string;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
}

export interface SurveyDefinition {
  key: string;
  title: string;
  cadence: Cadence;
  questions: SurveyQuestion[];
}

export function loadSurveys(contentDir: string): SurveyDefinition[] {
  const surveysDir = path.join(contentDir, 'surveys');
  if (!fs.existsSync(surveysDir)) {
    return [];
  }

  const files = fs.readdirSync(surveysDir).filter((f) => f.toLowerCase().endsWith('.json'));

  return files.map((file) => {
    const raw = fs.readFileSync(path.join(surveysDir, file), 'utf-8');
    const data = JSON.parse(raw);

    if (!data.key || !data.title || !data.cadence || !Array.isArray(data.questions)) {
      throw new Error(`Survey file "${file}" is missing required fields.`);
    }
    if (data.cadence !== 'MONTHLY' && data.cadence !== 'DAILY') {
      throw new Error(`Survey "${data.key}" has an invalid cadence "${data.cadence}".`);
    }

    return data as SurveyDefinition;
  });
}
