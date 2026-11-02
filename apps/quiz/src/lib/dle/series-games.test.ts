// The daily games of one series (024, L15, CR-023) on PGlite: Otakudle One Piece and Otakudle Dragon Ball. The pool, a play with right, near and wrong cells and arrows, the
// hints at 5 and 10 errors, the "No Devil Fruit" hint, the voice actor that stands in for a missing technique, everything closed to the browser, the real L04 and L15 files,
// and L14 opening a series game only when its pool is enough.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { dleClient } from './client';
import { rpcAs } from './game-fixture';
import { afterJ4, afterSessionG, readActivation, readActivationUndo, runCheck, seedIdols, applyLaunchFiles } from './otakudle-fixture';
import { MIGRATIONS, failure, one, readMigration, rows } from './pglite-harness';
import { parsePool } from './read';

import type { PGlite } from '@electric-sql/pglite';
import type { KeyStore } from './local';
import type { DleCell } from './types';

// PGlite on a loaded runner: one timeout for the whole file, tests and hooks.
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const EPOCH = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
const TODAY = new Date().toISOString().slice(0, 10);
const MIGRATION = '024-dle-series-games.sql';
const GAMES = ['otakudle-one-piece', 'otakudle-dragon-ball'] as const;
const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');

function store(token: string): KeyStore {
  return { getItem: () => token, setItem: () => undefined, removeItem: () => undefined };
}

/** A database as session G leaves it, with 024 applied; then (J4) the anime site and 023 and 024 again. */
async function afterG(): Promise<PGlite> {
  const db = await afterSessionG();
  await db.exec(readMigration(MIGRATION));
  return db;
}
async function afterJ4With024(db: PGlite): Promise<void> {
  await afterJ4(db);
  await db.exec(readMigration(MIGRATION));
}

type Attrs = Record<string, { v: unknown; l?: string }>;
interface Fx { readonly slug: string; readonly name: string; readonly attrs: Attrs; readonly hints?: Record<string, string>; readonly target?: boolean; readonly status?: string; readonly identity?: boolean; readonly game?: string }

const opBase = (): Attrs => ({
  gender: { v: 'male' }, affiliation: { v: ['Crew A'] }, devil_fruit_type: { v: 'Paramecia' }, haki: { v: ['none'] }, bounty: { v: 100_000_000 }, height_cm: { v: 170 },
  sea_of_origin: { v: 'East Blue' }, debut_arc: { v: 2, l: 'Orange Town' },
});
const dbBase = (): Attrs => ({
  gender: { v: 'male' }, race: { v: 'Human' }, affiliation: { v: ['Z Fighters'] }, home_planet: { v: 'Earth' }, universe: { v: 7 }, debut_series: { v: 2, l: 'Dragon Ball Z' },
  debut_saga: { v: 12, l: 'Dragon Ball Z: Frieza Saga' }, alignment_at_debut: { v: 'good' },
});

async function seedSeries(db: PGlite, slug: string, title: string, game: string, chars: readonly Fx[], published = true): Promise<void> {
  await db.query(`insert into public.groups (name, slug, site_id) values ($1, $2, 'anime') on conflict (slug) do nothing`, [title, slug]);
  await db.query(
    `insert into public.series (group_id, type, title_en, studios, anime_start_year, manga_start_year, status, published)
     values ((select id from public.groups where slug = $1), 'anime_manga', $2, '[]'::jsonb, 1999, 1997, 'finished', $3) on conflict (group_id) do nothing`,
    [slug, title, published],
  );
  for (const x of chars) {
    await db.query(
      `insert into public.characters (group_id, slug, name, aliases, role, debut_arc_ord, debut_medium, spoiler_level, identity_spoiler, status)
       values ((select id from public.groups where slug = $1), $2, $3, '{}', 'main', 1, 'both', 5, $4, $5)`,
      [slug, x.slug, x.name, x.identity ?? false, x.status ?? 'published'],
    );
    await db.query(
      `insert into public.character_game_facts (character_id, game_id, attrs, hints, can_be_target)
       values ((select c.id from public.characters c join public.groups g on g.id = c.group_id where g.slug = $1 and c.slug = $2), $3, $4::jsonb, $5::jsonb, $6)`,
      [slug, x.slug, x.game ?? game, JSON.stringify(x.attrs), JSON.stringify(x.hints ?? {}), x.target ?? true],
    );
  }
}

const filler = (prefix: string, n: number, base: () => Attrs, hints: Record<string, string>, tweak: (i: number, a: Attrs) => void): Fx[] =>
  Array.from({ length: n }, (_, i) => {
    const attrs = base();
    tweak(i, attrs);
    return { slug: `${prefix}-${i + 1}`, name: `${prefix.toUpperCase()} ${String(i + 1).padStart(2, '0')}`, attrs, hints };
  });

const OP_CHARS: readonly Fx[] = [
  { slug: 'target', name: 'Target Pirate', attrs: { ...opBase(), affiliation: { v: ['Crew A', 'Crew B'] }, devil_fruit_type: { v: 'Zoan' }, haki: { v: ['observation', 'armament'] }, bounty: { v: 1_000_000_000 }, height_cm: { v: 180 }, debut_arc: { v: 5, l: 'Arlong Park' } }, hints: { devil_fruit_name: 'Test-Test Fruit' } },
  { slug: 'plain', name: 'Plain Sailor', attrs: { ...opBase(), devil_fruit_type: { v: 'none' }, bounty: { v: 0, l: 'No bounty' } } },
  { slug: 'no-name', name: 'Nameless Fruit', attrs: { ...opBase(), devil_fruit_type: { v: 'Logia' } } },
  { slug: 'no-bounty-known', name: 'Unknown Bounty', attrs: { ...opBase(), bounty: { v: null } }, hints: { devil_fruit_name: 'X-X Fruit' } },
  { slug: 'draft', name: 'Draft Pirate', attrs: opBase(), hints: { devil_fruit_name: 'D-D Fruit' }, status: 'draft' },
  { slug: 'hidden-identity', name: 'Identity Pirate', attrs: opBase(), hints: { devil_fruit_name: 'I-I Fruit' }, identity: true },
  { slug: 'wrong-game', name: 'Facts Of Another Game', attrs: opBase(), hints: { devil_fruit_name: 'W-W Fruit' }, game: 'otakudle-dragon-ball' },
  ...filler('crew', 12, opBase, { devil_fruit_name: 'Filler Fruit' }, (i, a) => { a.bounty = { v: 50_000_000 * (i + 1) }; a.debut_arc = { v: 1 + (i % 4), l: `Arc ${1 + (i % 4)}` }; }),
];

const DB_CHARS: readonly Fx[] = [
  { slug: 'hero', name: 'Hero Saiyan', attrs: { ...dbBase(), race: { v: 'Saiyan' }, affiliation: { v: ['Z Fighters', 'Universe 7 Team'] }, universe: { v: 7 }, debut_series: { v: 1, l: 'Dragon Ball' }, debut_saga: { v: 3, l: 'Dragon Ball: Red Ribbon Army Saga' } }, hints: { signature_technique: 'Kamehameha', voice_actor_ja: 'Voice Both' } },
  { slug: 'voice-only', name: 'Voice Only', attrs: { ...dbBase(), alignment_at_debut: { v: 'evil' } }, hints: { voice_actor_ja: 'Voice Only Actor' } },
  { slug: 'nothing', name: 'Nothing To Say', attrs: dbBase() },
  { slug: 'incomplete', name: 'No Planet', attrs: { ...dbBase(), home_planet: { v: null } }, hints: { signature_technique: 'Masenko' } },
  { slug: 'rival', name: 'Rival Warrior', attrs: { ...dbBase(), race: { v: 'Saiyan' }, affiliation: { v: ['Z Fighters', 'Saiyan Army'] }, universe: { v: 6 }, debut_series: { v: 4, l: 'Dragon Ball Super' }, debut_saga: { v: 25, l: 'Dragon Ball Super: Universe 6 and Duplicate Vegeta Saga' } }, hints: { signature_technique: 'Big Bang' } },
  ...filler('fighter', 12, dbBase, { signature_technique: 'Filler Beam' }, (i, a) => { a.universe = { v: 1 + (i % 12) }; }),
];

describe('024 in session G and in J4', () => {
  it('session G: the table and the views closed to the browser, no game while L01 has not added the anime site; J4: the two games, off, with their columns, hints and minimums; a second run changes nothing', async () => {
    const db = await afterG();
    expect(await rows(db, `select id from public.dle_games where id like 'otakudle-%'`)).toEqual([]);
    expect(await one(db, `select relrowsecurity from pg_class where oid = 'public.character_game_facts'::regclass`)).toBe(true);
    expect(await one(db, `select count(*)::int from pg_policy where polrelid = 'public.character_game_facts'::regclass`)).toBe(0);
    for (const t of ['character_game_facts', 'dle_src_otakudle_one_piece', 'dle_src_otakudle_dragon_ball']) {
      for (const role of ['anon', 'authenticated']) expect(await one(db, `select has_table_privilege('${role}', 'public.${t}', 'select')`), `${role} ${t}`).toBe(false);
      expect(await failure(db, `set role anon; select * from public.${t}; reset role`), t).toMatch(/permission denied/);
      await db.exec('reset role');
      expect(await one(db, `select has_table_privilege('service_role', 'public.${t}', 'select')`)).toBe(true);
    }
    expect(await failure(db, `set role authenticated; insert into public.character_game_facts (character_id, game_id, attrs) values (1, 'otakudle-one-piece', '{}'); reset role`)).toMatch(/permission denied/);
    await db.exec('reset role');
    expect((await runCheck(db, 'V-024.sql')).filter((r) => r[0] !== 'ok')).toEqual([]);

    await afterJ4With024(db);
    expect(await rows(db, `select id, universe, entity_kind, source_view, min_pool, no_repeat_days, hint_keys, hint_after, active, epoch from public.dle_games where id like 'otakudle-%' order by id`)).toEqual([
      { id: 'otakudle-dragon-ball', universe: 'anime', entity_kind: 'character', source_view: 'dle_src_otakudle_dragon_ball', min_pool: 30, no_repeat_days: 120, hint_keys: ['signature_technique', 'voice_actor_ja', 'initial'], hint_after: [5, 5, 10], active: false, epoch: null },
      { id: 'otakudle-one-piece', universe: 'anime', entity_kind: 'character', source_view: 'dle_src_otakudle_one_piece', min_pool: 40, no_repeat_days: 120, hint_keys: ['devil_fruit_name', 'initial'], hint_after: [5, 10], active: false, epoch: null },
    ]);
    expect(await rows(db, `select key, kind, near::int from public.dle_attributes where game_id = 'otakudle-one-piece' order by position`)).toEqual([
      { key: 'gender', kind: 'single', near: null }, { key: 'affiliation', kind: 'multi', near: null }, { key: 'devil_fruit_type', kind: 'single', near: null }, { key: 'haki', kind: 'multi', near: null },
      { key: 'bounty', kind: 'number', near: null }, { key: 'height_cm', kind: 'number', near: null }, { key: 'sea_of_origin', kind: 'single', near: null }, { key: 'debut_arc', kind: 'ordinal', near: null },
    ]);
    // Dragon Ball has no height (owner, 2026-11-03).
    expect(await rows(db, `select key, kind from public.dle_attributes where game_id = 'otakudle-dragon-ball' order by position`)).toEqual([
      { key: 'gender', kind: 'single' }, { key: 'race', kind: 'single' }, { key: 'affiliation', kind: 'multi' }, { key: 'home_planet', kind: 'single' }, { key: 'universe', kind: 'number' },
      { key: 'debut_series', kind: 'ordinal' }, { key: 'debut_saga', kind: 'ordinal' }, { key: 'alignment_at_debut', kind: 'single' },
    ]);
    expect((await runCheck(db, 'V-024.sql')).filter((r) => r[0] !== 'ok')).toEqual([]);
    expect(await one(db, `select count(*)::int from public.dle_schedule where game_id like 'otakudle-%'`)).toBe(0);
    for (const g of GAMES) expect(await rpcAs(db, 'dle_pool', { p_game: g })).toMatchObject({ error: { message: expect.stringContaining('dle_unavailable') } });
    const before = await rows(db, `select game_id, key, kind, position from public.dle_attributes order by 1, 2`);
    await db.exec(readMigration(MIGRATION));
    expect(await rows(db, `select game_id, key, kind, position from public.dle_attributes order by 1, 2`)).toEqual(before);
  });

  it('the existing games are untouched: 019 is not changed, otakudle and kpopdle-idol keep their rows', async () => {
    const db = await afterG();
    await afterJ4With024(db);
    expect(await rows(db, `select id, hint_keys, hint_after from public.dle_games where id in ('kpopdle-idol', 'otakudle') order by id`)).toEqual([
      { id: 'kpopdle-idol', hint_keys: ['fandom', 'initial'], hint_after: [5, 10] }, { id: 'otakudle', hint_keys: ['voice_actor_ja', 'initial'], hint_after: [5, 10] },
    ]);
    expect(await one(db, `select count(*)::int from public.dle_attributes where game_id in ('kpopdle-idol', 'otakudle')`)).toBe(15);
  });

  it('the rollback: refused with L15 rows, then with a play; clean otherwise, twice', async () => {
    const db = await afterG();
    await afterJ4With024(db);
    await seedSeries(db, 'one-piece', 'One Piece', 'otakudle-one-piece', OP_CHARS);
    const undo = readMigration('024-dle-series-games.rollback.sql');
    expect(await failure(db, undo)).toMatch(/character_game_facts has rows/);
    await db.query(`update public.dle_games set min_pool = 2, no_repeat_days = 5 where id = 'otakudle-one-piece'`);
    await db.query(`select public.dle_activate('otakudle-one-piece', '${EPOCH}', 0.5)`);
    const e = await one<string>(db, `select entity_id from public.dle_entities where game_id = 'otakudle-one-piece' and can_be_target limit 1`);
    await rpcAs(db, 'dle_guess', { p_game: 'otakudle-one-piece', p_date: TODAY, p_token: 'tokentokentokentoken', p_entity: e });
    expect(await failure(db, undo)).toMatch(/series game has plays/);
    await db.exec(`delete from public.dle_plays; delete from public.character_game_facts`);
    expect(await failure(db, undo)).toBeNull();
    expect(await failure(db, undo)).toBeNull();
    expect(await one(db, `select to_regclass('public.character_game_facts')`)).toBeNull();
    expect(await rows(db, `select id from public.dle_games order by id`)).toEqual([{ id: 'kpopdle-idol' }, { id: 'otakudle' }]);
  });
});

describe('One Piece, on fixtures', () => {
  let db: PGlite;
  const game = 'otakudle-one-piece';
  const idOf = (name: string): Promise<string> => one<string>(db, `select entity_id from public.dle_entities where game_id = '${game}' and name = $1`, [name]);
  const target = async (name: string): Promise<boolean> => one<boolean>(db, `select can_be_target from public.dle_entities where game_id = '${game}' and name = $1`, [name]);
  const forceTarget = async (name: string): Promise<string> => {
    const id = await idOf(name);
    await db.query(`insert into public.dle_daily_stats (game_id, play_date, game_no, entity_id) values ('${game}', $1, 4, $2) on conflict (game_id, play_date) do update set entity_id = excluded.entity_id`, [TODAY, id]);
    return id;
  };
  const play = async (token: string, ids: readonly string[]) => {
    const c = dleClient((fn, args) => rpcAs(db, fn, args), store(token));
    let state = await c.day(game).then((d) => d.play);
    for (const id of ids) state = await c.guess(game, TODAY, id);
    return state!;
  };
  const cells = (cs: readonly DleCell[]): Record<string, string> => Object.fromEntries(cs.map((c) => [c.key, c.arrow ? `${c.status} ${c.arrow}` : c.status]));

  beforeAll(async () => {
    db = await afterG();
    await afterJ4With024(db);
    await seedSeries(db, 'one-piece', 'One Piece', game, OP_CHARS);
    await seedSeries(db, 'dragon-ball', 'Dragon Ball', 'otakudle-dragon-ball', [{ slug: 'goku-fx', name: 'Goku Fx', attrs: dbBase(), hints: { signature_technique: 'Kamehameha' } }]);
    await db.query(`update public.dle_games set min_pool = 2, no_repeat_days = 5 where id = '${game}'`);
    await db.query(`select public.dle_activate('${game}', '${EPOCH}', 0.5)`);
  });

  it('the pool: the series, published, the right game; never a draft, another game\'s facts or another series; a hidden identity or a spoiler level does not exclude (CR-023)', async () => {
    const names = (await rows<{ name: string }>(db, `select name from public.dle_src_otakudle_one_piece order by 1`)).map((r) => r.name);
    expect(names).toHaveLength(OP_CHARS.length - 2);
    for (const n of ['Draft Pirate', 'Facts Of Another Game', 'Goku Fx']) expect(names, n).not.toContain(n);
    // Neither spoiler_level nor identity_spoiler is read: every fixture character has spoiler_level 5, one has a hidden identity, all are in.
    expect(names).toContain('Target Pirate');
    expect(names).toContain('Identity Pirate');
    expect(await one(db, `select count(*)::int from public.dle_entities where game_id = '${game}' and in_pool`)).toBe(OP_CHARS.length - 2);
  });

  it('the targets: every column and the hint; no bounty known, a fruit with no name, or a flag off is not a target; no fruit is a target with no name', async () => {
    expect(await target('Target Pirate')).toBe(true);
    expect(await target('Plain Sailor')).toBe(true);
    expect(await target('Nameless Fruit')).toBe(false);
    expect(await target('Unknown Bounty')).toBe(false);
    expect(await one(db, `select count(*)::int from public.dle_entities where game_id = '${game}' and can_be_target and in_pool`)).toBe(2 + 12 + 1);
    expect(await target('Identity Pirate')).toBe(true);
  });

  it('dle_pool gives the 8 columns and the names, never the hints, the flag or a fruit name', async () => {
    const raw = (await rpcAs(db, 'dle_pool', { p_game: game })).data;
    const text = JSON.stringify(raw);
    for (const secret of ['can_be_target', 'hints', 'devil_fruit_name', 'Test-Test Fruit', 'Filler Fruit']) expect(text, secret).not.toContain(secret);
    expect(parsePool(raw)!.attributes.map((a) => `${a.key}:${a.kind}`)).toEqual([
      'gender:single', 'affiliation:multi', 'devil_fruit_type:single', 'haki:multi', 'bounty:number', 'height_cm:number', 'sea_of_origin:single', 'debut_arc:ordinal',
    ]);
    expect(parsePool(raw)!.universe).toBe('anime');
  });

  it('closed to the browser: the table, the view and the snapshot refuse anon; only dle_pool, dle_day, dle_guess and dle_give_up answer', async () => {
    for (const t of ['character_game_facts', 'dle_src_otakudle_one_piece', 'dle_entities']) {
      expect(await failure(db, `set role anon; select * from public.${t}; reset role`), t).toMatch(/permission denied/);
      await db.exec('reset role');
    }
    expect((await rpcAs(db, 'dle_pool', { p_game: game })).error).toBeNull();
  });

  it('a play: right, near and wrong cells, with the arrows of the numbers, against the target Target Pirate', async () => {
    await forceTarget('Target Pirate');
    // A pirate in one of the target's two crews (near), no haki (wrong), a lower bounty and height and an earlier arc (the arrows point up), another fruit type.
    const nearOne = await idOf('CREW 02');
    const first = (await play('series-play-aaaaaaaaaa', [nearOne])).guesses[0]!;
    expect(first.id).toBe(nearOne);
    expect(cells(first.result)).toEqual({
      gender: 'correct', affiliation: 'near', devil_fruit_type: 'wrong', haki: 'wrong', bounty: 'wrong up', height_cm: 'wrong up', sea_of_origin: 'correct', debut_arc: 'wrong up',
    });
    // A haki set that overlaps the target's (near), a higher bounty and a later arc (the arrows point down).
    await db.query(`update public.character_game_facts set attrs = jsonb_set(attrs, '{haki}', '{"v": ["armament", "conqueror"]}') where character_id = (select id from public.characters where slug = 'crew-3')`);
    await db.query(`update public.character_game_facts set attrs = jsonb_set(jsonb_set(attrs, '{bounty}', '{"v": 2500000000}'), '{debut_arc}', '{"v": 9, "l": "Later"}') where character_id = (select id from public.characters where slug = 'crew-3')`);
    await db.query(`select public.dle_refresh_entities('${game}')`);
    const second = (await play('series-play-bbbbbbbbbb', [await idOf('CREW 03')])).guesses[0]!;
    expect(cells(second.result)).toMatchObject({ haki: 'near', affiliation: 'near', bounty: 'wrong down', debut_arc: 'wrong down', height_cm: 'wrong up' });
    // The same data on the target: every cell right.
    const plain = (await play('series-play-cccccccccc', [await idOf('Plain Sailor')])).guesses[0]!;
    expect(cells(plain.result)).toMatchObject({ devil_fruit_type: 'wrong', bounty: 'wrong up', haki: 'wrong' });
    const won = await play('series-play-dddddddddd', [await idOf('Target Pirate')]);
    expect(won.status).toBe('won');
    expect(Object.values(cells(won.guesses[0]!.result)).every((c) => c === 'correct')).toBe(true);
    expect(won.target).toMatchObject({ name: 'Target Pirate' });
  });

  it('the columns compare: a crew in common is near, "no bounty" is 0 and gives its arrow, no haki is a value that equals itself, the haki sets that overlap are near', async () => {
    const cmp = async (a: string, b: string): Promise<Record<string, string>> => {
      const out = await one<DleCell[]>(db, `select public.dle_compare_all('${game}', (select attrs from public.dle_entities where game_id = '${game}' and name = $1), (select attrs from public.dle_entities where game_id = '${game}' and name = $2))`, [a, b]);
      return cells(out);
    };
    // Plain Sailor (Crew A, no haki, bounty 0) against the target (Crew A and B, observation and armament, 1 billion).
    expect(await cmp('Plain Sailor', 'Target Pirate')).toMatchObject({ affiliation: 'near', haki: 'wrong', bounty: 'wrong up', devil_fruit_type: 'wrong' });
    expect(await cmp('Target Pirate', 'Plain Sailor')).toMatchObject({ affiliation: 'near', bounty: 'wrong down' });
    expect(await cmp('Plain Sailor', 'Plain Sailor')).toMatchObject({ haki: 'correct', bounty: 'correct', affiliation: 'correct', devil_fruit_type: 'correct' });
    expect(await one(db, `select attrs -> 'bounty' ->> 'l' from public.dle_entities where game_id = '${game}' and name = 'Plain Sailor'`)).toBe('No bounty');
  });

  it('the hints: the Devil Fruit name opens after 5 errors, not 4; the initial after 10, not 9; a character with no fruit gives "No Devil Fruit"', async () => {
    const wrong = (await rows<{ entity_id: string }>(db, `select entity_id from public.dle_entities where game_id = '${game}' and in_pool and name like 'CREW %' order by entity_id`)).map((r) => r.entity_id);
    await forceTarget('Target Pirate');
    expect((await play('hint-op-aaaaaaaaaaaa', wrong.slice(0, 4))).hints).toEqual([]);
    expect((await play('hint-op-bbbbbbbbbbbb', wrong.slice(0, 5))).hints).toEqual([{ key: 'devil_fruit_name', value: 'Test-Test Fruit' }]);
    expect((await play('hint-op-cccccccccccc', wrong.slice(0, 9))).hints).toEqual([{ key: 'devil_fruit_name', value: 'Test-Test Fruit' }]);
    expect((await play('hint-op-dddddddddddd', wrong.slice(0, 10))).hints).toEqual([{ key: 'devil_fruit_name', value: 'Test-Test Fruit' }, { key: 'initial', value: 'T' }]);
    await forceTarget('Plain Sailor');
    expect((await play('hint-op-eeeeeeeeeeee', wrong.slice(0, 5))).hints).toEqual([{ key: 'devil_fruit_name', value: 'No Devil Fruit' }]);
    expect(await one(db, `select hints from public.dle_entities where game_id = '${game}' and name = 'Plain Sailor'`)).toEqual({ devil_fruit_name: 'No Devil Fruit', initial: 'P' });
  });
});

describe('Dragon Ball, on fixtures', () => {
  let db: PGlite;
  const game = 'otakudle-dragon-ball';
  const idOf = (name: string): Promise<string> => one<string>(db, `select entity_id from public.dle_entities where game_id = '${game}' and name = $1`, [name]);
  const forceTarget = async (name: string): Promise<void> => {
    await db.query(`insert into public.dle_daily_stats (game_id, play_date, game_no, entity_id) values ('${game}', $1, 4, $2) on conflict (game_id, play_date) do update set entity_id = excluded.entity_id`, [TODAY, await idOf(name)]);
  };
  const play = async (token: string, ids: readonly string[]) => {
    const c = dleClient((fn, args) => rpcAs(db, fn, args), store(token));
    let state = await c.day(game).then((d) => d.play);
    for (const id of ids) state = await c.guess(game, TODAY, id);
    return state!;
  };
  const cells = (cs: readonly DleCell[]): Record<string, string> => Object.fromEntries(cs.map((c) => [c.key, c.arrow ? `${c.status} ${c.arrow}` : c.status]));
  let wrong: string[];

  beforeAll(async () => {
    db = await afterG();
    await afterJ4With024(db);
    await seedSeries(db, 'dragon-ball', 'Dragon Ball', game, DB_CHARS);
    await db.query(`update public.dle_games set min_pool = 2, no_repeat_days = 5 where id = '${game}'`);
    await db.query(`select public.dle_activate('${game}', '${EPOCH}', 0.5)`);
    wrong = (await rows<{ entity_id: string }>(db, `select entity_id from public.dle_entities where game_id = '${game}' and in_pool and name like 'FIGHTER %' order by entity_id`)).map((r) => r.entity_id);
  });

  it('the pool and the targets: a character with a technique or a voice actor is a target; one with neither is not, even with its flag on; one with a missing column is not', async () => {
    const flags = Object.fromEntries((await rows<{ name: string; can_be_target: boolean }>(db, `select name, can_be_target from public.dle_entities where game_id = '${game}' and in_pool`)).map((r) => [r.name, r.can_be_target]));
    expect(flags['Hero Saiyan']).toBe(true);
    expect(flags['Voice Only']).toBe(true);
    expect(flags['Nothing To Say']).toBe(false);
    expect(flags['No Planet']).toBe(false);
    expect(Object.keys(flags)).toHaveLength(DB_CHARS.length);
    expect(await one(db, `select can_be_target from public.character_game_facts where game_id = '${game}' and character_id = (select id from public.characters where slug = 'nothing')`)).toBe(true);
  });

  it('the view puts exactly one of the technique and the voice actor in the hints', async () => {
    expect(await one(db, `select hints from public.dle_entities where game_id = '${game}' and name = 'Hero Saiyan'`)).toEqual({ signature_technique: 'Kamehameha', initial: 'H' });
    expect(await one(db, `select hints from public.dle_entities where game_id = '${game}' and name = 'Voice Only'`)).toEqual({ voice_actor_ja: 'Voice Only Actor', initial: 'V' });
    expect(await one(db, `select count(*)::int from public.dle_src_otakudle_dragon_ball where hints ? 'signature_technique' and hints ? 'voice_actor_ja'`)).toBe(0);
    expect(await one(db, `select hints from public.dle_entities where game_id = '${game}' and name = 'Nothing To Say'`)).toEqual({ initial: 'N' });
  });

  it('a play: arrows on the universe, the series and the saga, a partial affiliation, right and wrong words', async () => {
    await forceTarget('Hero Saiyan');
    // Rival: Saiyan like the target, affiliation shares Z Fighters, universe 6 (lower), series Super (4, higher than 1: the target is earlier), saga 25 (later).
    const state = await play('db-play-aaaaaaaaaaaa', [await idOf('Rival Warrior')]);
    expect(cells(state.guesses[0]!.result)).toEqual({
      gender: 'correct', race: 'correct', affiliation: 'near', home_planet: 'correct', universe: 'wrong up', debut_series: 'wrong down', debut_saga: 'wrong down', alignment_at_debut: 'correct',
    });
    const other = await play('db-play-bbbbbbbbbbbb', [await idOf('Voice Only')]);
    expect(cells(other.guesses[0]!.result)).toMatchObject({ race: 'wrong', affiliation: 'near', universe: 'correct', debut_series: 'wrong down', alignment_at_debut: 'wrong' });
    expect(Object.keys(cells(other.guesses[0]!.result))).not.toContain('height_cm');
  });

  it('the 5-error hint is the technique for a character with one: at 5, not 4; never the voice actor beside it; the initial at 10, not 9', async () => {
    await forceTarget('Hero Saiyan');
    expect((await play('db-hint-aaaaaaaaaaa', wrong.slice(0, 4))).hints).toEqual([]);
    expect((await play('db-hint-bbbbbbbbbbb', wrong.slice(0, 5))).hints).toEqual([{ key: 'signature_technique', value: 'Kamehameha' }]);
    expect((await play('db-hint-ccccccccccc', wrong.slice(0, 9))).hints).toEqual([{ key: 'signature_technique', value: 'Kamehameha' }]);
    expect((await play('db-hint-ddddddddddd', wrong.slice(0, 10))).hints).toEqual([{ key: 'signature_technique', value: 'Kamehameha' }, { key: 'initial', value: 'H' }]);
    expect(JSON.stringify(await play('db-hint-eeeeeeeeeee', wrong.slice(0, 12)))).not.toContain('Voice Both');
  });

  it('a character with no technique gives the Japanese voice actor at 5 errors, never both', async () => {
    await forceTarget('Voice Only');
    expect((await play('db-voice-aaaaaaaaaa', wrong.slice(0, 4))).hints).toEqual([]);
    expect((await play('db-voice-bbbbbbbbbb', wrong.slice(0, 5))).hints).toEqual([{ key: 'voice_actor_ja', value: 'Voice Only Actor' }]);
    expect((await play('db-voice-cccccccccc', wrong.slice(0, 10))).hints).toEqual([{ key: 'voice_actor_ja', value: 'Voice Only Actor' }, { key: 'initial', value: 'V' }]);
  });

  it('closed to anon, and dle_pool shows no hint, no flag and no technique', async () => {
    for (const t of ['character_game_facts', 'dle_src_otakudle_dragon_ball']) {
      expect(await failure(db, `set role anon; select * from public.${t}; reset role`), t).toMatch(/permission denied/);
      await db.exec('reset role');
    }
    const text = JSON.stringify((await rpcAs(db, 'dle_pool', { p_game: game })).data);
    for (const secret of ['can_be_target', 'hints', 'Kamehameha', 'Voice Only Actor', 'Big Bang']) expect(text, secret).not.toContain(secret);
    expect(parsePool((await rpcAs(db, 'dle_pool', { p_game: game })).data)!.attributes.map((a) => a.key)).toEqual([
      'gender', 'race', 'affiliation', 'home_planet', 'universe', 'debut_series', 'debut_saga', 'alignment_at_debut',
    ]);
  });
});

describe('the real launch files, L04 and L15', () => {
  let db: PGlite;
  const count = (sql: string): Promise<number> => one<number>(db, `select count(*)::int ${sql}`);

  beforeAll(async () => {
    db = await afterG();
    await afterJ4With024(db);
    await applyLaunchFiles(db);
    await db.exec(readLaunch('L15-A2-series-games.sql'));
  });

  it('the facts of the characters L04 has since its regeneration: 100 of 100 and 66 of 70 (the 4 of a GT saga wait), all in the views; 73 and 31 targets', async () => {
    expect(await count(`from public.character_game_facts where game_id = 'otakudle-one-piece'`)).toBe(100);
    expect(await count(`from public.character_game_facts where game_id = 'otakudle-dragon-ball'`)).toBe(66);
    expect(await count(`from public.dle_src_otakudle_one_piece`)).toBe(100);
    expect(await count(`from public.dle_src_otakudle_dragon_ball`)).toBe(66);
    expect(await count(`from public.dle_src_otakudle_one_piece where can_be_target`)).toBe(73);
    expect(await count(`from public.dle_src_otakudle_dragon_ball where can_be_target`)).toBe(31);
    // The 5-error hint is the technique or the voice actor, never neither for a target: 16 characters have neither and none of them is a target.
    expect(await count(`from public.dle_src_otakudle_dragon_ball where not (hints ? 'signature_technique' or hints ? 'voice_actor_ja')`)).toBe(16);
    expect(await count(`from public.dle_src_otakudle_dragon_ball where can_be_target and not (hints ? 'signature_technique' or hints ? 'voice_actor_ja')`)).toBe(0);
  });

  it('the header says what L04 has: all 100 of One Piece, 66 of 70 of Dragon Ball, the 4 of a GT saga waiting; the voice actors are read', () => {
    const sql = readLaunch('L15-A2-series-games.sql');
    expect(sql).toMatch(/otakudle-one-piece: 100 characters collected, 100 in L04 and loaded here .*0 waiting/);
    expect(sql).toMatch(/otakudle-dragon-ball: 70 characters collected, 66 in L04 and loaded here .*4 waiting/);
    expect(sql).toMatch(/waiting \(slug\): cooler, gogeta, baby, syn-shenron/);
    expect(sql).toMatch(/voice actors: read from data\/all-series\.json/);
  });

  it('every value has its source, from Wikidata, Wikipedia or a Fandom wiki; the check knows fandom; fields are namespaced by the series', async () => {
    expect(await count(`from public.entity_sources where source = 'fandom' and field ~ '^(one-piece|dragon-ball)[.]'`)).toBeGreaterThan(800);
    expect(await count(`from public.entity_sources where field ~ '^(one-piece|dragon-ball)[.]' and source not in ('wikidata', 'wikipedia', 'fandom')`)).toBe(0);
    expect(await failure(db, `insert into public.entity_sources (entity_type, entity_id, field, source, fetched_at) values ('character', 'x', 'f', 'myanimelist', now())`)).toMatch(/entity_sources_source_check/);
    expect((await runCheck(db, 'V-L15.sql')).filter((r) => r[0] !== 'ok')).toEqual([]);
    expect((await runCheck(db, 'V-011.sql')).filter((r) => r[0] !== 'ok' && r[1].includes('entity_sources_source_check'))).toEqual([]);
    // One Piece height has one Fandom source for most of the characters (owner exception).
    expect(await count(`from public.entity_sources where field = 'one-piece.height_cm' and source = 'fandom'`)).toBeGreaterThan(20);
  });

  it('the values the owner chose: no bounty is 0, no haki is none, a character without a fruit says "No Devil Fruit"', async () => {
    const get = (slug: string, key: string): Promise<unknown> => one(db, `select f.attrs -> $2 from public.character_game_facts f join public.characters c on c.id = f.character_id where c.slug = $1 and f.game_id = 'otakudle-one-piece'`, [slug, key]);
    expect(await get('smoker', 'bounty')).toEqual({ v: 0, l: 'No bounty' });
    expect(await count(`from public.entity_sources where field = 'dragon-ball.voice_actor_ja'`)).toBeGreaterThan(20);
    expect(await get('monkey-d-luffy', 'bounty')).toEqual({ v: 3_000_000_000 });
    expect(await get('monkey-d-luffy', 'haki')).toEqual({ v: ['observation', 'armament', 'conqueror'] });
    expect(await count(`from public.character_game_facts where game_id = 'otakudle-one-piece' and attrs -> 'haki' -> 'v' = '["none"]'::jsonb`)).toBeGreaterThan(0);
    expect(await one(db, `select hints ->> 'devil_fruit_name' from public.dle_src_otakudle_one_piece where name = 'Roronoa Zoro'`)).toBe('No Devil Fruit');
    expect(await one(db, `select hints ->> 'devil_fruit_name' from public.dle_src_otakudle_one_piece where name = 'Monkey D. Luffy'`)).toBe('Gum-Gum Fruit');
    expect(await count(`from public.character_game_facts where game_id = 'otakudle-dragon-ball' and attrs ? 'height_cm'`)).toBe(0);
  });

  it('a second run of L15 changes nothing; its rollback removes the rows and the sources, twice', async () => {
    const fingerprint = (): Promise<string> => one<string>(db, `select md5((select string_agg(row(t.character_id, t.game_id, t.attrs, t.hints, t.can_be_target)::text, '|' order by t.character_id, t.game_id) from public.character_game_facts t) || (select string_agg(row(s.entity_id, s.field, s.source, s.source_ref, s.source_url, s.fetched_at)::text, '|' order by s.entity_id, s.field, s.source) from public.entity_sources s where s.field ~ '^(one-piece|dragon-ball)[.]'))`);
    const before = await fingerprint();
    await db.exec(readLaunch('L15-A2-series-games.sql'));
    expect(await fingerprint()).toBe(before);
    await db.exec(readLaunch('L15-A2-series-games.rollback.sql'));
    await db.exec(readLaunch('L15-A2-series-games.rollback.sql'));
    expect(await count(`from public.character_game_facts`)).toBe(0);
    expect(await count(`from public.entity_sources where field ~ '^(one-piece|dragon-ball)[.]'`)).toBe(0);
    expect(await count(`from public.entity_sources where entity_type = 'character' and field = 'gender'`)).toBeGreaterThan(100);
    await db.exec(readLaunch('L15-A2-series-games.sql'));
    expect(await fingerprint()).toBe(before);
  });

  it('the file guards: without 024 it stops naming it; without L04 it stops', async () => {
    const bare = await afterSessionG();
    expect(await failure(bare, readLaunch('L15-A2-series-games.sql'))).toMatch(/character_game_facts is missing/);
  });

  it('L14 opens a series game only when its pool is enough: under the minimum both stay off with nothing changed and the other two games open; at the minimums both open; V-L14 and V-024 are ok', async () => {
    await seedIdols(db, 45);
    // Minimums above the pools (73 and 31 targets): both series games stay off, and neither stops the other two.
    await db.query(`update public.dle_games set min_pool = 80 where id = 'otakudle-one-piece'`);
    await db.query(`update public.dle_games set min_pool = 40 where id = 'otakudle-dragon-ball'`);
    await db.exec(readActivation());
    const games = `select id, active, epoch is not null as epoch, (select count(*)::int from public.dle_schedule s where s.game_id = g.id) as days from public.dle_games g order by id`;
    expect(await rows(db, games)).toEqual([
      { id: 'kpopdle-idol', active: true, epoch: true, days: 365 }, { id: 'otakudle', active: true, epoch: true, days: 365 },
      { id: 'otakudle-dragon-ball', active: false, epoch: false, days: 0 }, { id: 'otakudle-one-piece', active: false, epoch: false, days: 0 },
    ]);
    expect(await count(`from public.dle_entities where game_id like 'otakudle-%'`)).toBe(0);
    const v = await runCheck(db, 'V-L14.sql');
    expect(v).toHaveLength(14);
    expect(v.filter((r) => r[0] !== 'ok')).toEqual([]);
    const info = await runCheck(db, 'V-L15.sql');
    expect(info.find((r) => r[1].startsWith('One Piece : cibles'))![2]).toBe('73 cibles, minimum 80, éteint');
    expect(info.find((r) => r[1].startsWith('Dragon Ball : cibles'))![2]).toBe('31 cibles, minimum 40, éteint');
    expect(JSON.stringify(info)).not.toMatch(/Luffy|Goku|Zoro/);

    // The minimums of the launch (40 and 30): both open, with a 365 day bank each.
    await db.query(`update public.dle_games set min_pool = 40 where id = 'otakudle-one-piece'`);
    await db.query(`update public.dle_games set min_pool = 30 where id = 'otakudle-dragon-ball'`);
    await db.exec(readActivation());
    expect(await rows(db, games)).toEqual([
      { id: 'kpopdle-idol', active: true, epoch: true, days: 365 }, { id: 'otakudle', active: true, epoch: true, days: 365 },
      { id: 'otakudle-dragon-ball', active: true, epoch: true, days: 365 }, { id: 'otakudle-one-piece', active: true, epoch: true, days: 365 },
    ]);
    const v2 = await runCheck(db, 'V-L14.sql');
    expect(v2).toHaveLength(28);
    expect(v2.filter((r) => r[0] !== 'ok')).toEqual([]);
    expect((await runCheck(db, 'V-024.sql')).filter((r) => r[0] !== 'ok')).toEqual([]);
    expect((await runCheck(db, 'V-L15.sql')).filter((r) => r[0] !== 'ok')).toEqual([]);
    for (const g of GAMES) expect((await rpcAs(db, 'dle_day', { p_game: g })).data).toMatchObject({ game_no: 1, play: null });
    // A second run changes nothing; the rollback of L14 switches the four games off and keeps their banks.
    const bank = await rows(db, `select game_id, bank_day, entity_id from public.dle_schedule order by 1, 2`);
    await db.exec(readActivation());
    expect(await rows(db, `select game_id, bank_day, entity_id from public.dle_schedule order by 1, 2`)).toEqual(bank);
    await db.exec(readActivationUndo());
    expect((await rows<{ active: boolean }>(db, `select active from public.dle_games order by id`)).map((g) => g.active)).toEqual([false, false, false, false]);
    expect(await rows(db, `select game_id, bank_day, entity_id from public.dle_schedule order by 1, 2`)).toEqual(bank);
  });
});
