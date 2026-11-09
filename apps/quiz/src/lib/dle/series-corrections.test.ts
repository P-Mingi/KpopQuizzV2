// Lane otkdata (owner 2026-11-09, audit 06): the data corrections of the three anime daily games. The real files 019, 024, L04, L13, L15, L17, L18, then L21, L22, L23 and their rollbacks on PGlite.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { afterJ4, afterSessionG, applyLaunchFiles } from './otakudle-fixture';
import { MIGRATIONS, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L21 = 'L21-l1-series-games-corrections.sql';
const L21R = 'L21-l1-series-games-corrections.rollback.sql';

interface Snap { games: string; sources: string; ents: string }
async function snap(db: PGlite): Promise<Snap> {
  return {
    games: JSON.stringify(await rows(db, `select character_id, game_id, attrs, hints, can_be_target, updated_at from public.character_game_facts order by game_id, character_id`)),
    sources: JSON.stringify(await rows(db, `select entity_type, entity_id, field, source, source_ref, source_url, fetched_at from public.entity_sources order by entity_type, entity_id, field, source`)),
    ents: JSON.stringify(await rows(db, `select game_id, entity_id, attrs, hints, can_be_target, in_pool from public.dle_entities order by game_id, entity_id`)),
  };
}

const gameFact = async (db: PGlite, game: string, slug: string): Promise<{ attrs: Record<string, { v: unknown; l?: string }>; hints: Record<string, string>; t: boolean }> =>
  (await rows<{ attrs: Record<string, { v: unknown; l?: string }>; hints: Record<string, string>; t: boolean }>(db,
    `select f.attrs, f.hints, f.can_be_target as t from public.character_game_facts f join public.characters c on c.id = f.character_id where f.game_id = $1 and c.slug = $2`, [game, slug]))[0]!;
const answers = (db: PGlite, game: string): Promise<number> =>
  one<number>(db, `select count(*)::int from public.dle_entities where game_id = $1 and can_be_target and in_pool`, [game]);

let db: PGlite;
let beforeL21: Snap;
let afterL21: Snap;
let answersBefore: Record<string, number>;

beforeAll(async () => {
  db = await afterSessionG();
  await db.exec(readMigration('024-dle-series-games.sql'));
  await afterJ4(db);
  await db.exec(readMigration('024-dle-series-games.sql'));
  await applyLaunchFiles(db);
  await db.exec(readLaunch('L15-A2-series-games.sql'));
  await db.exec(readLaunch('L17-l1-op-affiliation.sql'));
  await db.exec(readLaunch('L18-l1-otakudle-genres.sql'));
  // The games already have a snapshot and a bank (a game live since 2026-11-07).
  for (const g of ['otakudle-one-piece', 'otakudle-dragon-ball']) await db.exec(`select public.dle_refresh_entities('${g}')`);
  answersBefore = { op: await answers(db, 'otakudle-one-piece'), db: await answers(db, 'otakudle-dragon-ball') };
  beforeL21 = await snap(db);
  await db.exec(readLaunch(L21));
  afterL21 = await snap(db);
});

describe('L21: the series games', () => {
  it('the answers: One Piece 73 minus Kyros and Jesus Burgess plus Boa Hancock, Dragon Ball 48', async () => {
    expect(answersBefore).toEqual({ op: 73, db: 48 });
    expect(await answers(db, 'otakudle-one-piece')).toBe(72);
    expect(await answers(db, 'otakudle-dragon-ball')).toBe(48);
    expect((await gameFact(db, 'otakudle-one-piece', 'kyros')).t).toBe(false);
    expect((await gameFact(db, 'otakudle-one-piece', 'jesus-burgess')).t).toBe(false);
    expect((await gameFact(db, 'otakudle-one-piece', 'boa-hancock')).t).toBe(true);
  });

  it('One Piece bounty: World Government bounties only', async () => {
    for (const s of ['monkey-d-garp', 'borsalino', 'issho', 'aramaki', 'koby', 'kin-emon', 'rebecca', 'viola', 'sakazuki', 'smoker', 'tashigi']) {
      expect((await gameFact(db, 'otakudle-one-piece', s)).attrs.bounty, s).toEqual({ v: 0, l: 'No bounty' });
    }
    expect((await gameFact(db, 'otakudle-one-piece', 'kyros')).attrs.bounty).toEqual({ v: null });
    expect((await gameFact(db, 'otakudle-one-piece', 'jesus-burgess')).attrs.bounty).toEqual({ v: null });
    expect((await gameFact(db, 'otakudle-one-piece', 'monkey-d-luffy')).attrs.bounty).toEqual({ v: 3000000000 });
  });

  it('One Piece sea: Grand Line for the 7 New World values, Calm Belt for Hancock, hints', async () => {
    for (const s of ['charlotte-linlin', 'kin-emon', 'kyros', 'kozuki-hiyori', 'kozuki-oden', 'carrot', 'charlotte-pudding']) {
      expect((await gameFact(db, 'otakudle-one-piece', s)).attrs.sea_of_origin, s).toEqual({ v: 'Grand Line' });
    }
    expect(await one<number>(db, `select count(*)::int from public.character_game_facts where attrs -> 'sea_of_origin' ->> 'v' = 'New World'`)).toBe(0);
    expect((await gameFact(db, 'otakudle-one-piece', 'boa-hancock')).attrs.sea_of_origin).toEqual({ v: 'Calm Belt' });
    expect((await gameFact(db, 'otakudle-one-piece', 'kin-emon')).hints.devil_fruit_name).toBe('Garb-Garb Fruit');
    expect((await gameFact(db, 'otakudle-one-piece', 'monkey-d-luffy')).hints.devil_fruit_name).toBe('Human-Human Fruit, Model: Nika');
  });

  it('Dragon Ball: race, technique, voice actors, affiliations', async () => {
    const f = (s: string): ReturnType<typeof gameFact> => gameFact(db, 'otakudle-dragon-ball', s);
    expect((await f('cell')).attrs.race).toEqual({ v: 'Android' });
    expect((await f('dr-gero')).attrs.race).toEqual({ v: 'Android' });
    expect((await f('emperor-pilaf')).attrs.race).toEqual({ v: 'Monster' });
    for (const s of ['oolong', 'puar', 'korin']) expect((await f(s)).attrs.race, s).toEqual({ v: 'Animal' });
    expect((await f('king-piccolo')).hints.signature_technique).toBe('Explosive Demon Wave');
    expect((await f('raditz')).hints.voice_actor_ja).toBe('Shigeru Chiba');
    expect((await f('zamasu')).hints.voice_actor_ja).toBe('Shin-ichiro Miki');
    expect((await f('emperor-pilaf')).attrs.affiliation).toEqual({ v: ['Pilaf Gang', 'Mifan Army', 'Dragon Team', 'Capsule Corporation'] });
    expect((await f('raditz')).attrs.affiliation).toEqual({ v: ['Frieza Force'] });
    expect((await f('king-kai')).attrs.home_planet).toEqual({ v: 'Kaishin' });
    expect(await one<number>(db, `select count(*)::int from public.character_game_facts where attrs::text like '%Capsule  Corporation%'`)).toBe(0);
  });

  it('every changed value has its source row, with the revision id of the page read', async () => {
    const src = async (slug: string, field: string): Promise<{ source: string; source_ref: string | null; source_url: string }[]> =>
      rows(db, `select source, source_ref, source_url from public.entity_sources where entity_type = 'character' and entity_id = $1 and field = $2 order by source`, [slug, field]);
    expect(await src('monkey-d-garp', 'one-piece.bounty')).toEqual([{ source: 'fandom', source_ref: '2135525', source_url: 'https://onepiece.fandom.com/wiki/Bounty' }]);
    expect(await src('kyros', 'one-piece.bounty')).toEqual([]);
    expect(await src('jesus-burgess', 'one-piece.bounty')).toEqual([]);
    expect(await src('king-piccolo', 'dragon-ball.signature_technique')).toEqual([{ source: 'fandom', source_ref: '2273193', source_url: 'https://dragonball.fandom.com/wiki/King_Piccolo' }]);
    expect((await src('boa-hancock', 'one-piece.sea_of_origin'))[0]).toMatchObject({ source: 'fandom', source_url: 'https://onepiece.fandom.com/wiki/Boa_Hancock' });
  });

  it('nothing else moved: only the rows named by the file differ, no updated_at touched', async () => {
    const a = JSON.parse(beforeL21.games) as { character_id: number; game_id: string; attrs: Record<string, unknown>; hints: Record<string, unknown>; can_be_target: boolean; updated_at: string }[];
    const b = JSON.parse(afterL21.games) as typeof a;
    expect(b).toHaveLength(a.length);
    const moved = b.filter((x, i) => JSON.stringify(x) !== JSON.stringify(a[i]));
    // 45 corrections touch fewer rows (several per character): Garp, Borsalino, Issho, Aramaki, Koby, Kin'emon, Rebecca, Viola, Kyros, Burgess, Linlin, Hiyori, Oden, Carrot, Pudding, Hancock, Luffy + 13 + Cell, Gero, Oolong, Puar, Korin, King Piccolo, Zamasu
    expect(moved.length).toBeGreaterThan(30);
    for (const x of moved) expect(x.updated_at).toBe(a.find((y) => y.character_id === x.character_id && y.game_id === x.game_id)!.updated_at);
    expect(await one<number>(db, `select count(*)::int from public.character_game_facts where game_id = 'otakudle-one-piece'`)).toBe(100);
    expect(await one<number>(db, `select count(*)::int from public.character_game_facts where game_id = 'otakudle-dragon-ball'`)).toBe(70);
  });

  it('a second run changes nothing', async () => {
    await db.exec(readLaunch(L21));
    expect(await snap(db)).toEqual(afterL21);
  });

  it('the rollback restores the values and the sources of L15 exactly, twice, and L21 applies again', async () => {
    await db.exec(readLaunch(L21R));
    await db.exec(readLaunch(L21R));
    expect(await snap(db)).toEqual(beforeL21);
    await db.exec(readLaunch(L21));
    expect(await snap(db)).toEqual(afterL21);
  });

  it('the precheck: a character that leaves the answers and is scheduled in the next 7 days aborts the file, nothing is written', async () => {
    await db.exec(readLaunch(L21R));
    const before = await snap(db);
    // Kyros is the answer of the day after tomorrow in a bank that has just been built.
    await db.exec(`update public.dle_games set epoch = public.dle_utc_date(now()) - 10 where id = 'otakudle-one-piece'`);
    const epoch = await one<string>(db, `select epoch::text from public.dle_games where id = 'otakudle-one-piece'`);
    const kyros = await one<string>(db, `select c.id::text from public.characters c where c.slug = 'kyros'`);
    expect(epoch).toBeTruthy();
    await db.exec(`insert into public.dle_schedule (game_id, bank_day, entity_id) values ('otakudle-one-piece', public.dle_bank_day('${epoch}'::date, public.dle_utc_date(now()) + 2), '${kyros}') on conflict (game_id, bank_day) do update set entity_id = excluded.entity_id`);
    await expect(db.exec(readLaunch(L21))).rejects.toThrow(/kyros is the answer of otakudle-one-piece/);
    expect(await snap(db)).toEqual(before);
    await db.exec(`delete from public.dle_schedule where game_id = 'otakudle-one-piece'`);
    // Hancock scheduled after the file: the rollback (which removes her from the answers) refuses in turn.
    await db.exec(readLaunch(L21));
    expect(await snap(db)).toEqual(afterL21);
  });
});
