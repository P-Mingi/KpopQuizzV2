// Owner, 2026-11-09: every launch file carries "-- Verify:" lines (a read-only query and the value it returns). This runs the lines
// of the headers of L21, L22 and L23 and of their rollbacks, parsed out of the files themselves, on the real chain on PGlite, so the
// header cannot drift from the file: after each apply the forward header holds, after each rollback the rollback header holds.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { afterJ4, afterSessionG, applyLaunchFiles, liveGames } from './otakudle-fixture';
import { MIGRATIONS, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const FILES = [
  { name: 'L21', up: 'L21-l1-series-games-corrections.sql', down: 'L21-l1-series-games-corrections.rollback.sql' },
  { name: 'L22', up: 'L22-l1-otakudle-facts-corrections.sql', down: 'L22-l1-otakudle-facts-corrections.rollback.sql' },
  { name: 'L23', up: 'L23-l1-otakudle-first-adaptation.sql', down: 'L23-l1-otakudle-first-adaptation.rollback.sql' },
];

interface Verify { query: string; expect: string }
/** The "-- Verify: <query>;   expect <value>" lines of a file header, as the owner reads them. */
function verifyOf(file: string): Verify[] {
  const out: Verify[] = [];
  for (const line of readLaunch(file).split('\n')) {
    if (!line.startsWith('-- Verify:')) continue;
    const m = /^-- Verify: (select .*;)   expect (.*)$/.exec(line);
    if (!m) throw new Error(`${file}: unreadable Verify line: ${line}`);
    out.push({ query: m[1]!, expect: m[2]! });
  }
  return out;
}

async function check(db: PGlite, file: string): Promise<void> {
  const list = verifyOf(file);
  expect(list.length, `${file}: 3 to 12 Verify lines`).toBeGreaterThanOrEqual(3);
  expect(list.length, `${file}: 3 to 12 Verify lines`).toBeLessThanOrEqual(12);
  for (const v of list) {
    const r = await rows<Record<string, unknown>>(db, v.query.replace(/;$/, ''));
    expect(r.length, v.query).toBe(1);
    const cell = Object.values(r[0]!)[0];
    expect(cell === null ? 'NULL' : String(cell), v.query).toBe(v.expect);
  }
}

let db: PGlite;
beforeAll(async () => {
  db = await afterSessionG();
  await db.exec(readMigration('024-dle-series-games.sql'));
  await afterJ4(db);
  await db.exec(readMigration('024-dle-series-games.sql'));
  await applyLaunchFiles(db);
  for (const f of ['L15-A2-series-games.sql', 'L17-l1-op-affiliation.sql', 'L18-l1-otakudle-genres.sql']) await db.exec(readLaunch(f));
  // The three games as production has them: live, with a bank of 365 days drawn from the pool before the corrections.
  await liveGames(db, ['otakudle-one-piece', 'otakudle-dragon-ball', 'otakudle']);
});

describe('the Verify lines of the headers hold on the chain', () => {
  it('the headers carry them, with a value each', () => {
    for (const f of FILES) for (const file of [f.up, f.down]) expect(verifyOf(file).length, file).toBeGreaterThanOrEqual(3);
  });

  it('forward: after each apply the Verify lines of that file hold', async () => {
    for (const f of FILES) {
      await db.exec(readLaunch(f.up));
      await check(db, f.up);
    }
  });

  it('a second run changes none of them', async () => {
    for (const f of FILES) await db.exec(readLaunch(f.up));
    for (const f of FILES) await check(db, f.up);
  });

  it('rollback: after each rollback (L23, L22, L21) the Verify lines of that rollback hold', async () => {
    for (const f of [...FILES].reverse()) {
      await db.exec(readLaunch(f.down));
      await check(db, f.down);
    }
  });

  it('the forward and the rollback of a file never expect the same values for all their lines', () => {
    for (const f of FILES) expect(verifyOf(f.up).map((v) => v.expect)).not.toEqual(verifyOf(f.down).map((v) => v.expect));
  });
});
