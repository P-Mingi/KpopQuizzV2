// Owner, 2026-11-09: a launch file the owner may apply from the Supabase SQL Editor is ONE DO block (the editor does not always
// keep temp tables or settings from one statement or Run to the next). The generators write them through
// scripts/anime/sql/single-do-block.mjs; this pins the result, so a regenerated file that falls back to statements fails CI.
// The pglite proofs of each file (op-affiliation.test.ts, genres.test.ts) run these exact files.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { MIGRATIONS } from './pglite-harness';

const FILES: [file: string, tag: string][] = [
  ['L19-l1-kpopdle-data-fixes.sql', 'o1l19'],
  ['L19-l1-kpopdle-data-fixes.rollback.sql', 'o1l19r'],
  ['L20-l1-kpopdle-view.sql', 'o1l20'],
  ['L20-l1-kpopdle-view.rollback.sql', 'o1l20r'],
  ['L17-l1-op-affiliation.sql', 'o1l17'],
  ['L17-l1-op-affiliation.rollback.sql', 'o1l17r'],
  ['L18-l1-otakudle-genres.sql', 'o1l18'],
  ['L18-l1-otakudle-genres.rollback.sql', 'o1l18r'],
  ['L21-l1-series-games-corrections.sql', 'o1l21'],
  ['L21-l1-series-games-corrections.rollback.sql', 'o1l21r'],
  ['L22-l1-otakudle-facts-corrections.sql', 'o1l22'],
  ['L22-l1-otakudle-facts-corrections.rollback.sql', 'o1l22r'],
  ['L23-l1-otakudle-first-adaptation.sql', 'o1l23'],
  ['L23-l1-otakudle-first-adaptation.rollback.sql', 'o1l23r'],
  ['L28-l1-quiz-merges.sql', 'o1l28'],
  ['L28-l1-quiz-merges.rollback.sql', 'o1l28r'],
  ['L32-l1-character-refs.sql', 'o1l32'],
  ['L32-l1-character-refs.rollback.sql', 'o1l32r'],
];

describe('launch files the owner may run from the Supabase SQL Editor are one DO block', () => {
  it.each(FILES)('%s', (file, tag) => {
    const sql = readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
    const outer = `$${tag}$`;
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code.endsWith(`end ${outer};`)).toBe(true);
    expect(code.split(outer).length).toBe(3);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    // No session setting as its own statement (the SET clause of a multi-line UPDATE is fine).
    expect(sql).not.toMatch(/^set\s+(lock_timeout|client_min_messages|statement_timeout|search_path|role|session)\b/im);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
  });
});
