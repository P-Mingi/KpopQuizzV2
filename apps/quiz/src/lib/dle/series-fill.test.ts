// Lane DLE-SERIES (owner 2026-11-22): no "?" in Otakudle One Piece and Otakudle Dragon Ball. The real files 019, 024, L04, L13, L15, L17, L18, L21 on PGlite, then L36 and its rollback.
// "Shown" is what a player sees: the 8 columns of every character of the pool (dle_pool) and the hints of the answer of any day (the snapshot, the bank, a real play at 10 mistakes).
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { rpcAs } from './game-fixture';
import { afterJ4, afterSessionG, applyLaunchFiles, liveGames } from './otakudle-fixture';
import { MIGRATIONS, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L36 = 'L36-l1-series-fill.sql';
const L36R = 'L36-l1-series-fill.rollback.sql';
const GAMES = ['otakudle-one-piece', 'otakudle-dragon-ball'] as const;
const TODAY = new Date().toISOString().slice(0, 10);

interface PoolEntity { id: string; name: string; attrs: Record<string, { v: unknown; l?: string }> }
const isEmpty = (x: { v: unknown } | undefined): boolean => !x || x.v === null || x.v === undefined || x.v === '' || (Array.isArray(x.v) && x.v.length === 0);

/** What a player gets from dle_pool, as the anon role. */
async function pool(db: PGlite, game: string): Promise<{ attributes: { key: string }[]; entities: PoolEntity[] }> {
  const r = await rpcAs(db, 'dle_pool', { p_game: game });
  expect(r.error, game).toBeNull();
  return r.data as { attributes: { key: string }[]; entities: PoolEntity[] };
}

/** The empty cells of a pool: "<slug-or-id>.<column>" for every column with no value. */
async function emptyCells(db: PGlite, game: string): Promise<string[]> {
  const p = await pool(db, game);
  const out: string[] = [];
  for (const e of p.entities) for (const a of p.attributes) if (isEmpty(e.attrs[a.key])) out.push(`${e.name}.${a.key}`);
  return out;
}

/** The characters whose hint of the day would be empty: Devil Fruit name for One Piece, technique or voice actor for Dragon Ball. */
async function emptyHints(db: PGlite, game: string): Promise<string[]> {
  const q = game === 'otakudle-one-piece'
    ? `select name from public.dle_entities where game_id = $1 and in_pool and nullif(btrim(hints ->> 'devil_fruit_name'), '') is null order by name`
    : `select name from public.dle_entities where game_id = $1 and in_pool and nullif(btrim(hints ->> 'signature_technique'), '') is null and nullif(btrim(hints ->> 'voice_actor_ja'), '') is null order by name`;
  return (await rows<{ name: string }>(db, q, [game])).map((x) => x.name);
}

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
async function check(file: string): Promise<void> {
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

interface Snap { facts: string; curation: string; ents: string; schedule: string; sources: string }
async function snap(db: PGlite): Promise<Snap> {
  return {
    facts: JSON.stringify(await rows(db, `select character_id, game_id, attrs, hints, can_be_target, updated_at from public.character_game_facts order by game_id, character_id`)),
    curation: JSON.stringify(await rows(db, `select game_id, entity_id, excluded, weight, note from public.dle_curation order by game_id, entity_id`)),
    ents: JSON.stringify(await rows(db, `select game_id, entity_id, attrs, hints, can_be_target, in_pool from public.dle_entities order by game_id, entity_id`)),
    schedule: JSON.stringify(await rows(db, `select game_id, bank_day, entity_id from public.dle_schedule order by game_id, bank_day`)),
    sources: JSON.stringify(await rows(db, `select entity_type, entity_id, field, source, source_ref, source_url from public.entity_sources order by entity_type, entity_id, field, source`)),
  };
}

const fact = async (db: PGlite, game: string, slug: string): Promise<{ attrs: Record<string, { v: unknown; l?: string }>; hints: Record<string, string> }> =>
  (await rows<{ attrs: Record<string, { v: unknown; l?: string }>; hints: Record<string, string> }>(db,
    `select f.attrs, f.hints from public.character_game_facts f join public.characters c on c.id = f.character_id where f.game_id = $1 and c.slug = $2`, [game, slug]))[0]!;

let db: PGlite;
let before: Snap;
let after: Snap;
const emptiesBefore: Record<string, string[]> = {};
const hintsBefore: Record<string, string[]> = {};

beforeAll(async () => {
  db = await afterSessionG();
  await db.exec(readMigration('024-dle-series-games.sql'));
  await afterJ4(db);
  await db.exec(readMigration('024-dle-series-games.sql'));
  await applyLaunchFiles(db);
  for (const f of ['L15-A2-series-games.sql', 'L17-l1-op-affiliation.sql', 'L18-l1-otakudle-genres.sql', 'L21-l1-series-games-corrections.sql']) await db.exec(readLaunch(f));
  // The games are live as in production: a snapshot, an epoch ten days back, a bank of 365 days.
  await liveGames(db, [...GAMES]);
  for (const g of GAMES) { emptiesBefore[g] = await emptyCells(db, g); hintsBefore[g] = await emptyHints(db, g); }
  before = await snap(db);
  await db.exec(readLaunch(L36));
  after = await snap(db);
});

describe('before L36: the cells that showed a question mark', () => {
  it('the world holds empty cells, per column, in both games', () => {
    const col = (g: string, k: string): number => emptiesBefore[g]!.filter((x) => x.endsWith(`.${k}`)).length;
    expect(col('otakudle-one-piece', 'bounty')).toBe(20);
    expect(col('otakudle-one-piece', 'sea_of_origin')).toBe(9);
    expect(col('otakudle-one-piece', 'height_cm')).toBe(3);
    expect(col('otakudle-dragon-ball', 'home_planet')).toBe(16);
    expect(col('otakudle-dragon-ball', 'affiliation')).toBe(5);
    expect(col('otakudle-dragon-ball', 'race')).toBe(1);
    expect(hintsBefore['otakudle-dragon-ball']).toEqual(['Caulifla', 'Kale']);
    expect(hintsBefore['otakudle-one-piece']).toEqual([]);
  });
});

describe('L36: no empty value any more', () => {
  it('dle_pool: every character of both pools has every column filled', async () => {
    for (const g of GAMES) expect(await emptyCells(db, g), g).toEqual([]);
    expect((await pool(db, 'otakudle-one-piece')).entities).toHaveLength(98);
    expect((await pool(db, 'otakudle-dragon-ball')).entities).toHaveLength(70);
  });

  it('the hints of every character of the pool are filled, and the answer of every day of the bank has its columns and its hints', async () => {
    for (const g of GAMES) expect(await emptyHints(db, g), g).toEqual([]);
    for (const g of GAMES) {
      const days = await rows<{ entity_id: string; attrs: Record<string, { v: unknown }>; hints: Record<string, string>; can_be_target: boolean; in_pool: boolean }>(db,
        `select e.entity_id, e.attrs, e.hints, e.can_be_target, e.in_pool from public.dle_schedule s join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id where s.game_id = $1`, [g]);
      expect(days).toHaveLength(365);
      const keys = (await pool(db, g)).attributes.map((a) => a.key);
      for (const d of days) {
        expect(d.can_be_target && d.in_pool, `${g} ${d.entity_id}`).toBe(true);
        for (const k of keys) expect(isEmpty(d.attrs[k]), `${g} ${d.entity_id} ${k}`).toBe(false);
        expect(Object.values(d.hints).every((x) => String(x).trim() !== '')).toBe(true);
      }
    }
  });

  it('a real play at 10 mistakes shows the hint at 5 and the hint at 10 of the answer of the day', async () => {
    for (const g of GAMES) {
      const target = await one<string>(db, `select public.dle_target($1, $2::date)`, [g, TODAY]);
      const others = (await pool(db, g)).entities.map((e) => e.id).filter((id) => id !== target).slice(0, 11);
      let last: unknown = null;
      for (const id of others) last = (await rpcAs(db, 'dle_guess', { p_game: g, p_date: TODAY, p_token: `tokentokentoken${g.length}xx`, p_entity: id })).data;
      const hints = (last as { hints: { key: string; value: unknown }[] }).hints;
      expect(hints.length, g).toBe(2);
      for (const h of hints) expect(String(h.value).trim(), `${g} ${h.key}`).not.toBe('');
    }
  });

  it('the values: the fills, the Unknown convention, the voice actors of the first appearance', async () => {
    const op = (s: string): ReturnType<typeof fact> => fact(db, 'otakudle-one-piece', s);
    const dbf = (s: string): ReturnType<typeof fact> => fact(db, 'otakudle-dragon-ball', s);
    expect((await op('jesus-burgess')).attrs.bounty).toEqual({ v: 20_000_000 });
    expect((await op('monkey-d-dragon')).attrs.bounty).toEqual({ v: 0, l: 'No bounty' });
    expect((await op('vegapunk')).attrs.height_cm).toEqual({ v: 314 });
    for (const [s, sea] of [['helmeppo', 'East Blue'], ['bellamy', 'North Blue'], ['hatchan', 'Grand Line'], ['yamato', 'Grand Line'], ['dracule-mihawk', 'Unknown'], ['silvers-rayleigh', 'Unknown'], ['uta', 'Unknown']] as const) {
      expect((await op(s)).attrs.sea_of_origin, s).toEqual({ v: sea });
    }
    expect((await dbf('hit')).attrs.race).toEqual({ v: "Hit's race" });
    expect((await dbf('frieza')).attrs.home_planet).toEqual({ v: 'Unknown' });
    expect((await dbf('vegito')).attrs.home_planet).toEqual({ v: 'Planet Vegeta' });
    expect((await dbf('oolong')).attrs.affiliation).toEqual({ v: ['Dragon Team'] });
    expect((await dbf('caulifla')).hints).toEqual({ voice_actor_ja: 'Yuka Komatsu' });
    expect((await dbf('kale')).hints).toEqual({ voice_actor_ja: 'Yukana' });
    expect((await dbf('mercenary-tao')).hints.voice_actor_ja).toBe('Chikao Ōtsuka');
    expect((await dbf('korin')).hints.voice_actor_ja).toBe('Ichirō Nagai');
    expect((await dbf('uub')).hints.voice_actor_ja).toBe('Megumi Urawa');
    // The fixed hints keep their technique (the technique, not the voice actor, is what the player sees at 5 mistakes when there is one).
    expect((await dbf('porunga')).hints).toEqual({ voice_actor_ja: 'Jumpei Takiguchi' });
  });

  it('nothing else moved: the answers, the bank, the sources and every other fact', async () => {
    const a = JSON.parse(before.facts) as { character_id: number; game_id: string; attrs: Record<string, unknown>; hints: Record<string, unknown>; can_be_target: boolean; updated_at: string }[];
    const b = JSON.parse(after.facts) as typeof a;
    expect(b).toHaveLength(a.length);
    const moved = b.filter((x, i) => JSON.stringify(x) !== JSON.stringify(a[i]));
    expect(moved.length).toBeGreaterThan(40);
    for (let i = 0; i < a.length; i++) {
      expect(b[i]!.can_be_target).toBe(a[i]!.can_be_target);
      expect(b[i]!.updated_at).toBe(a[i]!.updated_at);
    }
    expect(after.schedule).toBe(before.schedule);
    expect(after.sources).toBe(before.sources);
    expect(await one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'otakudle-one-piece' and can_be_target and in_pool`)).toBe(72);
    expect(await one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'otakudle-dragon-ball' and can_be_target and in_pool`)).toBe(48);
    expect(await rows(db, `select c.slug, k.excluded, k.note from public.dle_curation k join public.characters c on c.id::text = k.entity_id order by c.slug`)).toEqual([
      { slug: 'nerona-imu', excluded: true, note: 'L36: no height stated in any allowed source' },
      { slug: 'shiki', excluded: true, note: 'L36: no height stated in any allowed source' },
    ]);
  });

  it('the Verify lines of the header hold, and the file is one DO block with no dash', async () => {
    await check(L36);
    const sql = readLaunch(L36);
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith('do $o1l36$\nbegin')).toBe(true);
    expect(code.endsWith('end $o1l36$;')).toBe(true);
    expect(code.split('$o1l36$').length).toBe(3);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    expect(sql).not.toMatch(/^set\s+(lock_timeout|client_min_messages|statement_timeout|search_path|role|session)\b/im);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    for (const f of [L36, L36R]) expect(readLaunch(f).includes(String.fromCharCode(0x2013)) || readLaunch(f).includes(String.fromCharCode(0x2014)), f).toBe(false);
  });

  it('a second run changes nothing', async () => {
    await db.exec(readLaunch(L36));
    expect(await snap(db)).toEqual(after);
  });
});

describe('the rollback', () => {
  it('puts the exact old values back, twice, and L36 applies again', async () => {
    await db.exec(readLaunch(L36R));
    await db.exec(readLaunch(L36R));
    expect(await snap(db)).toEqual(before);
    await check(L36R);
    for (const g of GAMES) expect(await emptyCells(db, g), g).toEqual(emptiesBefore[g]);
    await db.exec(readLaunch(L36));
    expect(await snap(db)).toEqual(after);
  });
});
