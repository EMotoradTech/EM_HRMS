import path from 'path';
import { loadModules } from '../src/contentLoader';

const CONTENT_DIR = path.join(__dirname, '..', 'content');

describe('loadModules', () => {
  it('loads placeholder modules sorted by order', () => {
    const modules = loadModules(CONTENT_DIR);
    expect(modules.map((m) => m.key)).toEqual(['product-lineup', 'key-specs-positioning']);
  });

  it('loads quiz questions for a module that has one', () => {
    const modules = loadModules(CONTENT_DIR);
    const lineup = modules.find((m) => m.key === 'product-lineup')!;
    expect(lineup.quiz.length).toBe(2);
    expect(lineup.quiz[0].options.length).toBe(4);
  });

  it('allows a module with an empty quiz array', () => {
    const modules = loadModules(CONTENT_DIR);
    const specs = modules.find((m) => m.key === 'key-specs-positioning')!;
    expect(specs.quiz).toEqual([]);
  });
});
