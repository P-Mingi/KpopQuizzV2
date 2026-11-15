// The KpopCards QA harness (e2e/o1/CARDS) runs only through its own config, against the fixture dev server of its README. Named *.spec.ts,
// its files were collected by the default Playwright config that CI's e2e job runs (206 failures on 2026-11-15: no server at localhost).
// Its specs are *.kc.ts, and only playwright.kpopcards.config.ts collects that suffix.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const CARDS = join(__dirname, '../../../e2e/o1/CARDS');
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(join(dir, d.name)) : [join(dir, d.name)]));

describe('the KpopCards harness stays out of CI', () => {
  it('no file of e2e/o1/CARDS is a *.spec.ts or *.test.ts (the default config and CI would run it)', () => {
    const all = files(CARDS);
    expect(all.filter((f) => /\.kc\.ts$/.test(f)).length).toBeGreaterThanOrEqual(7);
    expect(all.filter((f) => /\.(spec|test)\.[cm]?[jt]sx?$/.test(f))).toEqual([]);
  });
  it('its config collects *.kc.ts only', () => {
    expect(readFileSync(join(CARDS, 'playwright.kpopcards.config.ts'), 'utf8')).toMatch(/^ {2}testMatch: \/\\\.kc\\\.ts\$\/,$/m);
  });
});
