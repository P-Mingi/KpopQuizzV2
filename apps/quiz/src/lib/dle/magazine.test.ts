// Lane magazine (owner 2026-11-08): Otakudle, the Magazine column replaces Demographic. The real files 019, 024, L04, L13, L15, L17, then L18 and its rollback on PGlite.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { OTAKUDLE_COLUMNS, valueLabel } from './copy';
import { afterJ4, afterSessionG, applyLaunchFiles } from './otakudle-fixture';
import { MIGRATIONS, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const DLE = path.resolve(MIGRATIONS, '../../anime/data/dle');
const DATA = JSON.parse(readFileSync(path.join(DLE, 'otakudle-magazine.json'), 'utf8')) as {
  series: string; magazine: string; publisher: string | null; wikipedia_magazine: string | null; source: string; revision: string; note: string; work_year?: number;
}[];
const FIXES = JSON.parse(readFileSync(path.join(DLE, 'otakudle-species-fixes.json'), 'utf8')) as { series: string; character: string; from: string; to: string; source: string }[];

interface Snap { facts: string; chars: string; series: string; attrs: string; view: string; sources: number; ents: string }
async function snap(db: PGlite): Promise<Snap> {
  return {
    facts: JSON.stringify(await rows(db, `select group_id, demographic, updated_at from public.series_facts order by group_id`)),
    chars: JSON.stringify(await rows(db, `select * from public.character_facts order by character_id`)),
    series: JSON.stringify(await rows(db, `select group_id, magazine from public.series order by group_id`)),
    attrs: JSON.stringify(await rows(db, `select game_id, key, kind, position, near from public.dle_attributes order by game_id, position`)),
    view: await one<string>(db, `select pg_get_viewdef('public.dle_src_anime_character'::regclass)`),
    sources: await one<number>(db, `select count(*)::int from public.entity_sources`),
    ents: JSON.stringify(await rows(db, `select entity_id, attrs, can_be_target, in_pool from public.dle_entities where game_id = 'otakudle' order by entity_id`)),
  };
}

async function cell(db: PGlite, key: string, guess: string, target: string): Promise<string> {
  return one<string>(db, `select (x ->> 'status') from jsonb_array_elements(public.dle_compare_all('otakudle',
    (select attrs from public.dle_src_anime_character where name = $1), (select attrs from public.dle_src_anime_character where name = $2))) x where x ->> 'key' = $3`, [guess, target, key]);
}

const FOUR = ['re-zero', 'sword-art-online', 'mob-psycho-100', 'steins-gate'];

describe('L18: the Magazine column of Otakudle', () => {
  let db: PGlite;
  let before: Snap;
  let targetsBefore: { balance_key: string; n: number }[];
  let after: Snap;
  let before_wsj = 0;

  const targets = (): Promise<{ balance_key: string; n: number }[]> =>
    rows(db, `select balance_key, count(*)::int as n from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool group by balance_key order by balance_key`);

  beforeAll(async () => {
    db = await afterSessionG();
    await db.exec(readMigration('024-dle-series-games.sql'));
    await afterJ4(db);
    await db.exec(readMigration('024-dle-series-games.sql'));
    await applyLaunchFiles(db);
    await db.exec(readLaunch('L15-A2-series-games.sql'));
    await db.exec(readLaunch('L17-l1-op-affiliation.sql'));
    // A game that already has a snapshot (the branch of L18 that refreshes it).
    // The database as the L13 of before this lot left it: the 16 broken species values, and the Wikipedia row of Natsu's old value (the regenerated L13 of this lot already has the fixed ones).
    for (const f of FIXES) {
      await db.query(`update public.character_facts cf set species = $3 from public.characters c join public.groups g on g.id = c.group_id where cf.character_id = c.id and g.slug = $1 and c.slug = $2`, [f.series, f.character, f.from]);
    }
    await db.exec(`insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
      values ('character', 'natsu-dragneel', 'species', 'wikipedia', null, 'https://en.wikipedia.org/wiki/Natsu_Dragneel', '2026-11-02T00:00:00Z') on conflict do nothing`);
    await db.exec(`select public.dle_refresh_entities('otakudle')`);
    before_wsj = await one<number>(db, `select count(*)::int from public.series where magazine = 'Weekly Shōnen Jump'`);
    before = await snap(db);
    targetsBefore = await targets();
    await db.exec(readLaunch('L18-l1-otakudle-magazine.sql'));
    after = await snap(db);
  });

  it('the data: 50 series, each with a Wikipedia page and revision, 38 publishers, no dash', () => {
    expect(DATA).toHaveLength(50);
    expect(new Set(DATA.map((d) => d.series)).size).toBe(50);
    expect(DATA.filter((d) => !/^https:\/\/en\.wikipedia\.org\/wiki\//.test(d.source) || !/^[0-9]+$/.test(d.revision))).toEqual([]);
    expect(DATA.filter((d) => d.publisher)).toHaveLength(38);
    const nonManga = ['Light novel', 'Webtoon', 'Original anime', 'Visual novel'];
    expect(DATA.filter((d) => nonManga.includes(d.magazine)).every((d) => d.publisher === null)).toBe(true);
    expect(DATA.filter((d) => nonManga.includes(d.magazine)).length).toBe(12);
    expect(DATA.filter((d) => d.magazine === 'Shōnen Jump')).toHaveLength(18);
    expect(DATA.filter((d) => d.work_year !== undefined).map((d) => [d.series, d.work_year])).toEqual([['mob-psycho-100', 2012], ['re-zero', 2012], ['steins-gate', 2009], ['sword-art-online', 2002]]);
    expect(JSON.stringify(DATA) + JSON.stringify(FIXES)).not.toMatch(/[–—]/);
  });

  it('the game has 7 compared columns, in order: series, magazine, year, studio, gender, species, role', async () => {
    const a = await rows<{ key: string; kind: string; position: number; near: string | null }>(db, `select key, kind, position, near from public.dle_attributes where game_id = 'otakudle' order by position`);
    expect(a.map((x) => x.key)).toEqual(['series', 'magazine', 'year', 'studio', 'gender', 'species', 'role']);
    expect(a.map((x) => x.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(a.find((x) => x.key === 'magazine')).toMatchObject({ kind: 'single', near: null });
    expect(a.find((x) => x.key === 'year')).toMatchObject({ kind: 'number', near: '2' });
    const pool = JSON.parse(await one<string>(db, `select attrs::text from public.dle_src_anime_character where name = 'Satoru Gojo'`)) as Record<string, unknown>;
    expect(Object.keys(pool).sort()).toEqual(['gender', 'magazine', 'role', 'series', 'species', 'studio', 'year']);
    const cells = await one<number>(db, `select jsonb_array_length(public.dle_compare_all('otakudle',
      (select attrs from public.dle_src_anime_character where name = 'Satoru Gojo'), (select attrs from public.dle_src_anime_character where name = 'Conan Edogawa')))`);
    expect(cells).toBe(7);
    // The columns of the other games did not move.
    expect(JSON.parse(after.attrs).filter((x: { game_id: string }) => x.game_id !== 'otakudle')).toEqual(JSON.parse(before.attrs).filter((x: { game_id: string }) => x.game_id !== 'otakudle'));
  });

  it('every character reads its series magazine {v, p}, and the year of the four series that had none', async () => {
    const r = await rows<{ series: string; m: { v: string; p?: string[] }; y: number | null }>(db,
      `select balance_key as series, attrs -> 'magazine' as m, (attrs -> 'year' ->> 'v')::int as y from public.dle_src_anime_character`);
    expect(r.length).toBe(750);
    for (const d of DATA) {
      const mine = r.filter((x) => x.series === d.series);
      expect(mine.length, d.series).toBeGreaterThan(0);
      for (const x of mine) expect(x.m, d.series).toEqual(d.publisher ? { v: d.magazine, p: [d.publisher] } : { v: d.magazine, p: null });
      if (d.work_year !== undefined) for (const x of mine) expect(x.y, d.series).toBe(d.work_year);
    }
    expect(r.filter((x) => x.y === null)).toEqual([]);
    expect(r.find((x) => x.series === 'one-punch-man')!.y).toBe(2009);
  });

  it('Right, Close and Wrong on real pairs', async () => {
    expect(await cell(db, 'magazine', 'Tanjiro Kamado', 'Satoru Gojo')).toBe('correct');
    expect(await cell(db, 'magazine', 'Momo Ayase', 'Satoru Gojo')).toBe('near');
    expect(await cell(db, 'magazine', 'Conan Edogawa', 'Satoru Gojo')).toBe('wrong');
    expect(await cell(db, 'magazine', 'Satoru Gojo', 'Conan Edogawa')).toBe('wrong');
    // Jump, Jump+ and Young Jump are all Shueisha; Sunday is Shogakukan.
    expect(await cell(db, 'magazine', 'Light Yagami', 'Momo Ayase')).toBe('near');
    // A light novel has no publisher: only the same value is Right.
    expect(await cell(db, 'magazine', 'Subaru Natsuki', 'Kirito')).toBe('correct');
    expect(await cell(db, 'magazine', 'Subaru Natsuki', 'Satoru Gojo')).toBe('wrong');
    expect(await cell(db, 'magazine', 'Rintaro Okabe', 'Lelouch Lamperouge')).toBe('wrong');
    expect(await cell(db, 'magazine', 'Spike Spiegel', 'Lelouch Lamperouge')).toBe('correct');
  });

  it('the characters of Re:Zero, SAO, Mob Psycho 100 and Steins;Gate can now be the answer', async () => {
    const was = (k: string): number => targetsBefore.find((t) => t.balance_key === k)?.n ?? 0;
    const is = async (k: string): Promise<number> => (await targets()).find((t) => t.balance_key === k)?.n ?? 0;
    let gained = 0;
    for (const k of FOUR) {
      expect(was(k), k).toBe(0);
      expect(await is(k), k).toBeGreaterThan(0);
      gained += await is(k);
    }
    expect(gained).toBe(7);
    // Nothing else moved as a target.
    const now = await targets();
    for (const t of targetsBefore) expect(now.find((x) => x.balance_key === t.balance_key)?.n, t.balance_key).toBe(t.n);
    expect(now.reduce((s, x) => s + x.n, 0)).toBe(targetsBefore.reduce((s, x) => s + x.n, 0) + 7);
  });

  it('the spelling of Weekly Shōnen Jump is one in series.magazine', async () => {
    expect(await one<number>(db, `select count(*)::int from public.series where magazine = 'Weekly Shonen Jump'`)).toBe(0);
    expect(await one<number>(db, `select count(*)::int from public.series where magazine = 'Weekly Shōnen Jump'`)).toBe(18);
    expect(before_wsj).toBe(15);
  });

  it('the species: the 16 values are fixed and no broken word is left', async () => {
    const sp = async (series: string, ch: string): Promise<string> => one<string>(db, `select f.species from public.character_facts f join public.characters c on c.id = f.character_id join public.groups g on g.id = c.group_id where g.slug = $1 and c.slug = $2`, [series, ch]);
    expect(FIXES).toHaveLength(16);
    for (const f of FIXES) expect(await sp(f.series, f.character), `${f.series}/${f.character}`).toBe(f.to);
    expect(await sp('fairy-tail', 'natsu-dragneel')).toBe('human');
    expect(await sp('fullmetal-alchemist', 'father')).toBe('homunculus');
    expect(await sp('inuyasha', 'sesshomaru')).toBe('dog-daiyokai');
    expect(await sp('inuyasha', 'naraku')).toBe('spider-hanyo');
    const all = (await rows<{ species: string }>(db, `select distinct species from public.character_facts where species is not null`)).map((x) => x.species);
    expect(all.filter((s) => /(^|-)(y-kai|s)(-|$)|homunculu$|witche$|dwarve$|hany-|daiy-/.test(s))).toEqual([]);
    expect(all.filter((s) => /-s-race/.test(s))).toEqual([]);
    expect(await one<number>(db, `select count(*)::int from public.entity_sources where entity_type = 'character' and entity_id = 'natsu-dragneel' and field = 'species' and source = 'wikipedia'`)).toBe(0);
    expect(valueLabel('species', 'dodoria-race', 'en')).toBe('Dodoria race');
  });

  it('every magazine and publisher has a Wikipedia source row; the sources of the old fields are untouched', async () => {
    expect(await one<number>(db, `select count(*)::int from public.entity_sources where entity_type = 'series' and field = 'otakudle.magazine' and source = 'wikipedia'`)).toBe(50);
    expect(await one<number>(db, `select count(*)::int from public.entity_sources where entity_type = 'series' and field = 'otakudle.publisher'`)).toBe(38);
    expect(await one<number>(db, `select count(*)::int from public.entity_sources where entity_type = 'series' and field = 'otakudle.year'`)).toBe(4);
    expect(after.sources).toBe(before.sources + 92 - 1);
  });

  it('the French and English words: Magazine, Series year, no Demographic', () => {
    expect(OTAKUDLE_COLUMNS.en.magazine!.label).toBe('Magazine');
    expect(OTAKUDLE_COLUMNS.fr.magazine!.label).toBe('Magazine');
    expect(OTAKUDLE_COLUMNS.en.year!.label).toBe('Series year');
    expect(OTAKUDLE_COLUMNS.fr.year!.label).toBe('Année de la série');
    expect(OTAKUDLE_COLUMNS.en.demographic).toBeUndefined();
    expect(OTAKUDLE_COLUMNS.fr.demographic).toBeUndefined();
  });

  it('a second run changes nothing', async () => {
    await db.exec(readLaunch('L18-l1-otakudle-magazine.sql'));
    expect(await snap(db)).toEqual(after);
  });

  it('the rollback restores the state before L18 exactly, twice, and L18 applies again', async () => {
    await db.exec(readLaunch('L18-l1-otakudle-magazine.rollback.sql'));
    await db.exec(readLaunch('L18-l1-otakudle-magazine.rollback.sql'));
    expect(await snap(db)).toEqual(before);
    expect(await one<number>(db, `select count(*)::int from information_schema.columns where table_name = 'series_facts' and column_name in ('magazine', 'publisher', 'work_year')`)).toBe(0);
    await db.exec(readLaunch('L18-l1-otakudle-magazine.sql'));
    expect(await snap(db)).toEqual(after);
  });

  it('One-Punch Man: one marked line switches the year to 2012', async () => {
    const sql = readLaunch('L18-l1-otakudle-magazine.sql');
    const line = sql.split('\n').filter((l) => l.includes("('one-punch-man'") && l.includes('-- OWNER'));
    expect(line).toHaveLength(1);
    await db.exec(sql.replace(line[0]!, line[0]!.replace('2009)', '2012)')));
    expect(await one<number>(db, `select (attrs -> 'year' ->> 'v')::int from public.dle_src_anime_character where name = 'Saitama'`)).toBe(2012);
    await db.exec(sql);
    expect(await one<number>(db, `select (attrs -> 'year' ->> 'v')::int from public.dle_src_anime_character where name = 'Saitama'`)).toBe(2009);
  });

  it('the files carry no em or en dash, say when to apply them and how a played game is affected, and are the generator output', () => {
    for (const f of ['L18-l1-otakudle-magazine.sql', 'L18-l1-otakudle-magazine.rollback.sql']) expect(readLaunch(f)).not.toMatch(/[–—]/);
    const s = readLaunch('L18-l1-otakudle-magazine.sql');
    expect(s).toMatch(/after 00:30 UTC and never between 23:50 and 00:30/);
    expect(s).toMatch(/stored as the entity id/);
    expect(s).toMatch(/-- OWNER/);
    expect(s).toMatch(/o1-transaction: single/);
    expect(execFileSync('node', [path.join(DLE, 'gen-l18.mjs'), '--check'], { encoding: 'utf8' }).trim()).toBe('same');
  });
});
