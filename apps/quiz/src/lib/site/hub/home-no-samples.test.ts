import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { SAMPLE_NAMES } from './home-samples.test-support';

// Lot H2c: no sample of the design's script is left in a render path. The samples live in home-samples.test-support.ts and the tests only;
// the page, its loaders and its components hold none of their names, import no test file, and every link is built from the registry.

const SRC = fileURLToPath(new URL('../../../', import.meta.url));
const HUB = `${SRC}lib/site/hub/`;
const COMPONENTS = `${SRC}components/hub/home/`;
const PAGE = `${SRC}app/sites/[site]/home-hub.tsx`;
const COPY = `${SRC}copy/hub/h1.ts`;

const isTest = (f: string): boolean => /\.test\.tsx?$/.test(f) || f.includes('.test-support.');
const list = (dir: string, keep: (f: string) => boolean): string[] => readdirSync(dir).filter((f) => /\.tsx?$/.test(f) && !isTest(f) && keep(f)).map((f) => `${dir}${f}`);

const RENDER_PATHS: string[] = [
  ...list(HUB, (f) => f.startsWith('home-')),
  ...list(COMPONENTS, () => true),
  PAGE,
];

describe('no sample in a render path', () => {
  it('scans the loaders, the components and the page', () => {
    const names = RENDER_PATHS.map((f) => f.slice(SRC.length));
    // home v3: For you is gone; the done marks of Today and the image slots joined
    for (const f of ['home-doors', 'home-today', 'home-quick', 'home-hot', 'home-crossover', 'home-topfans', 'home-viewer', 'home-surprise', 'home-done', 'home-assets']) {
      expect(names, f).toContain(`lib/site/hub/${f}.ts`);
    }
    expect(names).toContain('components/hub/home/home-page.tsx');
    expect(names).toContain('app/sites/[site]/home-hub.tsx');
  });

  it('holds none of the names of the design script', () => {
    for (const file of [...RENDER_PATHS, COPY]) {
      const text = readFileSync(file, 'utf8');
      for (const name of SAMPLE_NAMES) expect(text.includes(name), `${file.slice(SRC.length)} holds "${name}"`).toBe(false);
    }
  });

  it('imports no sample, no test support and no fake', () => {
    for (const file of RENDER_PATHS) {
      const text = readFileSync(file, 'utf8');
      expect(text, file.slice(SRC.length)).not.toMatch(/test-support|\.test'|samples/);
    }
  });

  it('writes no site address: every link is a path the page completes with the registry origin', () => {
    for (const file of RENDER_PATHS) {
      expect(readFileSync(file, 'utf8'), file.slice(SRC.length)).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
    }
  });

  it('keeps the samples file out of the loaders (it is imported by tests only)', () => {
    const importers = readdirSync(HUB).filter((f) => /\.tsx?$/.test(f) && readFileSync(`${HUB}${f}`, 'utf8').includes('home-samples.test-support'));
    for (const f of importers) expect(isTest(f), f).toBe(true);
  });
});
