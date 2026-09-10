import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface Section {
  key: string;
  title: string;
  order: number;
  type: 'markdown' | 'embed';
  body: string;
  // Present only when type === 'embed'
  embedUrl?: string;
  embedKind?: 'pdf' | 'slides';
}

/**
 * Loads every section from a directory of Markdown files with front-matter.
 * This is intentionally file-based (not hardcoded in the UI) so HR can add or
 * edit a section by dropping/editing a .md file — no redeploy, no developer.
 */
export function loadSections(contentDir: string): Section[] {
  const sectionsDir = path.join(contentDir, 'sections');
  if (!fs.existsSync(sectionsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(sectionsDir)
    .filter((f) => f.toLowerCase().endsWith('.md'));

  const sections: Section[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(sectionsDir, file), 'utf-8');
    const { data, content } = matter(raw);

    if (!data.key || !data.title) {
      throw new Error(
        `Section file "${file}" is missing required front-matter fields "key"/"title".`
      );
    }

    return {
      key: String(data.key),
      title: String(data.title),
      order: Number(data.order ?? 0),
      type: data.type === 'embed' ? 'embed' : 'markdown',
      body: content.trim(),
      embedUrl: data.embedUrl ? String(data.embedUrl) : undefined,
      embedKind: data.embedKind ? String(data.embedKind) as 'pdf' | 'slides' : undefined,
    };
  });

  sections.sort((a, b) => a.order - b.order);

  const keys = new Set<string>();
  for (const s of sections) {
    if (keys.has(s.key)) {
      throw new Error(`Duplicate section key "${s.key}" found in ${sectionsDir}.`);
    }
    keys.add(s.key);
  }

  return sections;
}
