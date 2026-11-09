// Lane otkdata (owner 2026-11-09, audit 06, section 2.3): the Otakudle facts and the first adaptation. The real files 019, 023, 024, L04, L13, L15, L17, L18, L21, then L22 and L23 and their rollbacks on PGlite.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { afterJ4, afterSessionG, applyLaunchFiles } from './otakudle-fixture';
import { MIGRATIONS, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L22 = 'L22-l1-otakudle-facts-corrections.sql';
const L22R = 'L22-l1-otakudle-facts-corrections.rollback.sql';

interface Snap { facts: string; sources: string; ents: string; cur: string }
async function snap(db: PGlite): Promise<Snap> {
  return {
    facts: JSON.stringify(await rows(db, `select character_id, gender, species, role_at_debut, first_appearance, voice_actor_ja, featured, updated_at from public.character_facts order by character_id`)),
    sources: JSON.stringify(await rows(db, `select entity_type, entity_id, field, source, source_ref, source_url, fetched_at from public.entity_sources order by entity_type, entity_id, field, source`)),
    ents: JSON.stringify(await rows(db, `select game_id, entity_id, attrs, hints, can_be_target, in_pool from public.dle_entities where game_id = 'otakudle' order by entity_id`)),
    cur: JSON.stringify(await rows(db, `select game_id, entity_id, excluded, weight, note from public.dle_curation order by game_id, entity_id`)),
  };
}

interface Facts { gender: string | null; species: string | null; role_at_debut: string | null; first_appearance: string | null; voice_actor_ja: string | null; featured: boolean }
const facts = async (db: PGlite, series: string, slug: string): Promise<Facts> =>
  (await rows<Facts>(db, `select f.gender, f.species, f.role_at_debut, f.first_appearance, f.voice_actor_ja, f.featured from public.character_facts f join public.characters c on c.id = f.character_id join public.groups g on g.id = c.group_id and g.site_id = 'anime' where g.slug = $1 and c.slug = $2`, [series, slug]))[0]!;
const sources = (db: PGlite, entity: string, field: string): Promise<{ source: string; source_ref: string | null; source_url: string }[]> =>
  rows(db, `select source, source_ref, source_url from public.entity_sources where entity_type = 'character' and entity_id = $1 and field = $2 order by source`, [entity, field]);
const answers = (db: PGlite): Promise<number> => one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool`);
const isAnswer = async (db: PGlite, slug: string): Promise<boolean> =>
  (await rows<{ t: boolean }>(db, `select e.can_be_target and e.in_pool as t from public.dle_entities e join public.characters c on c.id::text = e.entity_id where e.game_id = 'otakudle' and c.slug = $1`, [slug]))[0]?.t ?? false;

let db: PGlite;
let beforeL22: Snap;
let afterL22: Snap;
let answersBefore: number;

beforeAll(async () => {
  db = await afterSessionG();
  await db.exec(readMigration('024-dle-series-games.sql'));
  await afterJ4(db);
  await db.exec(readMigration('024-dle-series-games.sql'));
  await applyLaunchFiles(db);
  await db.exec(readLaunch('L15-A2-series-games.sql'));
  await db.exec(readLaunch('L17-l1-op-affiliation.sql'));
  await db.exec(readLaunch('L18-l1-otakudle-genres.sql'));
  await db.exec(readLaunch('L21-l1-series-games-corrections.sql'));
  await db.exec(`select public.dle_refresh_entities('otakudle')`);
  answersBefore = await answers(db);
  beforeL22 = await snap(db);
  await db.exec(readLaunch(L22));
  afterL22 = await snap(db);
});

describe('L22: the Otakudle facts', () => {
  it('the answers: the characters with a complete row join, Haise Sasaki leaves for Ken Kaneki', async () => {
    const after = await answers(db);
    console.log('otakudle answers', answersBefore, '->', after);
    expect(after).toBeGreaterThan(answersBefore);
    for (const s of ['goku', 'frieza', 'gohan', 'piccolo', 'nezuko-kamado', 'inosuke-hashibira', 'alphonse-elric', 'ken-kaneki']) expect(await isAnswer(db, s), s).toBe(true);
    expect(await isAnswer(db, 'haise-sasaki')).toBe(false);
    expect(await isAnswer(db, 'rimuru-tempest')).toBe(false);
  });
});
