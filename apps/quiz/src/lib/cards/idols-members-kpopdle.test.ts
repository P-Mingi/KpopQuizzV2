// Bunnyverse Cards lot 2, integrator review point 1: the rows file 099 adds to public.idols stay out of Kpopdle until their clues are filled.
// The real Kpopdle files (011 to 021e, the production state of lib/dle/kpopdle-fixture.ts, then L20, the view in production) run on PGlite;
// the subjects' groups rows exist, as in production; then 099 runs and the pool is refreshed. The pool, the possible answers and the entities
// with an empty clue are counted before and after: nothing moves. Clearing needs_review on those rows (what the owner does once the clues
// are filled) shows what the guard keeps out: guessable entities with empty clues.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { kpopdleWorld } from '../dle/kpopdle-fixture';
import { MIGRATIONS, one } from '../dle/pglite-harness';

import { readCardsSql } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const SQL099 = readCardsSql('099-idols-members.sql');
const SUBJECTS = JSON.parse(SQL099.slice(SQL099.indexOf('$members$[') + '$members$'.length, SQL099.indexOf(']$members$') + 1)) as Array<{
  slug: string; members: Array<{ active: boolean }>;
}>;
const L20 = readFileSync(path.join(MIGRATIONS, 'launch', 'L20-l1-kpopdle-view.sql'), 'utf8');

interface Pool { view: number; inPool: number; targets: number; emptyClue: number }
async function pool(db: PGlite): Promise<Pool> {
  await db.exec(`select public.dle_refresh_entities('kpopdle-idol')`);
  return {
    view: await one<number>(db, `select count(*)::int from public.dle_src_kpop_idol`),
    inPool: await one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and in_pool`),
    targets: await one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and can_be_target`),
    // a guessable entity with a column of the game left empty
    emptyClue: await one<number>(db, `select count(*)::int from public.dle_entities e where e.game_id = 'kpopdle-idol' and e.in_pool
      and exists (select 1 from public.dle_attributes a where a.game_id = e.game_id
                  and coalesce(cardinality(public.dle_values(e.attrs -> a.key -> 'v')), 0) = 0)`),
  };
}

describe('099-idols-members.sql and Kpopdle', () => {
  let db: PGlite;
  let before: Pool;
  let notices: string[];
  beforeAll(async () => {
    db = await kpopdleWorld();
    await db.exec(L20);
    for (const s of SUBJECTS) {
      await db.query(`insert into public.groups (name, slug, record_label, generation, fandom_name) select $1, $1, 'Some Label', '3rd Gen', 'fan'
                      where not exists (select 1 from public.groups where slug = $1)`, [s.slug]);
    }
    before = await pool(db);
    notices = [];
    await db.exec(SQL099, { onNotice: (n) => notices.push(n.message ?? '') });
  });

  it('adds its rows to idols', async () => {
    const added = await one<number>(db, `select count(*)::int from public.idols where review_reason like '099-idols-members%'`);
    const total = notices.map((n) => /^099-idols-members: (\d+) rows added in \d+ subjects$/.exec(n)?.[1]).find(Boolean);
    expect(added).toBeGreaterThan(0);
    expect(added).toBe(Number(total));
    expect(added).toBeLessThanOrEqual(SUBJECTS.reduce((n, s) => n + s.members.length, 0));
    expect(await one(db, `select count(*)::int from public.idols where review_reason like '099-idols-members%' and active and not needs_review`)).toBe(0);
  });

  it('leaves the Kpopdle pool exactly as it was: same entities, same answers, no entity with an empty clue added', async () => {
    const after = await pool(db);
    expect(after).toEqual(before);
    expect(await one(db, `select count(*)::int from public.dle_entities e join public.idols i on i.id::text = e.entity_id
                          where e.game_id = 'kpopdle-idol' and i.review_reason like '099-idols-members%'`)).toBe(0);
    expect(notices).toContain(`099-idols-members: Kpopdle source ${before.view} entities before and after (no row of this file enters Kpopdle)`);
  });

  it('shows what the wait keeps out: cleared too early, the active rows would be guessable with empty clues', async () => {
    const active = await one<number>(db, `select count(*)::int from public.idols where review_reason like '099-idols-members%' and active`);
    await db.exec(`update public.idols set needs_review = false where review_reason like '099-idols-members%' and active`);
    const early = await pool(db);
    expect(early.inPool).toBe(before.inPool + active);
    expect(early.emptyClue).toBe(before.emptyClue + active);
    expect(early.targets).toBe(before.targets);
    await db.exec(`update public.idols set needs_review = true where review_reason like '099-idols-members%' and active`);
    const back = await pool(db);
    expect(back.inPool).toBe(before.inPool);
    expect(back.targets).toBe(before.targets);
  });
});
