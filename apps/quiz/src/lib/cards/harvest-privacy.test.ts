// Bunnyverse Cards lot 6: the repository holds no birth date and no month of an 18th birthday. This scans the lot 6 data files
// (docs/design/cards/data/lot6/) and the generated SQL (docs/pending-migrations/cards/116-*) for a birth or opening key, and for a
// date written on the same line as a birth or an opening word. The photo dates of the credits are not birth dates and stay allowed.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { HARVEST_SQL } from './harvest-fixture';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const LOT6 = path.join(REPO, 'docs/design/cards/data/lot6');
const SQL = path.join(REPO, 'docs/pending-migrations/cards');

const files = (): string[] => [
  ...(existsSync(LOT6) ? readdirSync(LOT6).map((f) => path.join(LOT6, f)) : []),
  ...readdirSync(SQL).filter((f) => f.startsWith('116-')).map((f) => path.join(SQL, f)),
];
const DATE = /\b(19|20)\d{2}-(0[1-9]|1[0-2])(-\d{2})?\b/;
const WORD = /birth|born|opens?_?month|opening|18th|eighteenth|turns? 18/i;

describe('lot 6: no birth date and no month of an 18th birthday in the repository', () => {
  it('holds no birth or opening key in the data files, and no date on a line that speaks of a birth or an opening', () => {
    const bad: string[] = [];
    for (const f of files()) {
      const text = readFileSync(f, 'utf8');
      if (f.endsWith('.json')) {
        const keys = [...text.matchAll(/"([A-Za-z0-9_]+)"\s*:/g)].map((m) => m[1]!);
        for (const k of keys) if (/birth|born|open|eighteen|age_lock_month/i.test(k)) bad.push(`${path.basename(f)}: key ${k}`);
      }
      text.split('\n').forEach((line, i) => {
        if (WORD.test(line) && DATE.test(line)) bad.push(`${path.basename(f)}:${i + 1}: ${line.slice(0, 80)}`);
      });
    }
    expect(bad).toEqual([]);
  });
  it('the generated SQL (built here from a fixture) and its rollback hold no date on a line that speaks of a birth or an opening', () => {
    const bad = [HARVEST_SQL.sql, HARVEST_SQL.rollback].flatMap((t) => t.split('\n').filter((l) => WORD.test(l) && DATE.test(l)));
    expect(bad).toEqual([]);
    expect(HARVEST_SQL.sql).not.toMatch(/"(birth|born|opens|opening)[a-z_]*"\s*:/i);
  });
  it('the scan catches what it must (a made-up line and key)', () => {
    expect(WORD.test('born on 2000-01-05') && DATE.test('born on 2000-01-05')).toBe(true);
    expect(DATE.test('opens_month := \'2028-06\'')).toBe(true);
    expect(DATE.test('photo date 2026-01-01')).toBe(true);
    expect(WORD.test('photo date 2026-01-01')).toBe(false);
  });
});
