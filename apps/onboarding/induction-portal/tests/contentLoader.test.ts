import path from 'path';
import { loadSections } from '../src/contentLoader';

const CONTENT_DIR = path.join(__dirname, '..', 'content');

describe('loadSections', () => {
  it('loads all placeholder sections from the real content directory, sorted by order', () => {
    const sections = loadSections(CONTENT_DIR);

    expect(sections.length).toBeGreaterThanOrEqual(4);
    const keys = sections.map((s) => s.key);
    expect(keys).toEqual(['policies', 'culture-book', 'company-presentation', 'hr-events-leave']);
  });

  it('parses the rich "embed" type correctly for the company presentation section', () => {
    const sections = loadSections(CONTENT_DIR);
    const presentation = sections.find((s) => s.key === 'company-presentation');

    expect(presentation).toBeDefined();
    expect(presentation!.type).toBe('embed');
    expect(presentation!.embedKind).toBe('pdf');
    expect(presentation!.embedUrl).toBeTruthy();
  });

  it('defaults to "markdown" type for sections without an explicit type', () => {
    const sections = loadSections(CONTENT_DIR);
    const policies = sections.find((s) => s.key === 'policies');

    expect(policies!.type).toBe('markdown');
    expect(policies!.body.length).toBeGreaterThan(0);
  });

  it('returns an empty array when the content directory does not exist', () => {
    const sections = loadSections(path.join(__dirname, 'does-not-exist'));
    expect(sections).toEqual([]);
  });
});
