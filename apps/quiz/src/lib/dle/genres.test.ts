// Lane magazine, round 2 (owner 2026-11-08): Otakudle, the Genres column replaces Demographic. The real files 019, 024, L04, L13, L15, L17, then L18 and its rollback on PGlite.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { OTAKUDLE_COLUMNS, valueLabel } from './copy';
import { afterJ4, afterSessionG, applyLaunchFiles } from './otakudle-fixture';
import { MIGRATIONS, one, readMigration, rows } from './pglite-harness';
import { GENRE } from './value-i18n';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const SQL = 'L18-l1-otakudle-genres.sql';
const ROLLBACK = 'L18-l1-otakudle-genres.rollback.sql';
const DLE = path.resolve(MIGRATIONS, '../../anime/data/dle');
const GENRES = JSON.parse(readFileSync(path.join(DLE, 'otakudle-genres.json'), 'utf8')) as {
  series: string; wikipedia_title: string; revid: string; infobox: string; raw_genres: { link: string; text: string }[]; genres: string[]; note: string; targets: number;
}[];
const MAGAZINE = JSON.parse(readFileSync(path.join(DLE, 'otakudle-magazine.json'), 'utf8')) as { series: string; work_year?: number }[];
const FIXES = JSON.parse(readFileSync(path.join(DLE, 'otakudle-species-fixes.json'), 'utf8')) as { series: string; character: string; from: string; to: string; source: string }[];
const WORDS = ['action', 'adventure', 'fantasy', 'dark-fantasy', 'supernatural', 'martial-arts', 'science-fiction', 'comedy', 'mystery-thriller', 'romance', 'drama', 'slice-of-life', 'sports', 'post-apocalyptic', 'historical'];

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


describe('L18: the Genres column of Otakudle', () => {
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
    // The database as the L13 of before this lot left it: the 16 broken species values, and the Wikipedia row of Natsu's old value.
    for (const f of FIXES) {
      await db.query(`update public.character_facts cf set species = $3 from public.characters c join public.groups g on g.id = c.group_id where cf.character_id = c.id and g.slug = $1 and c.slug = $2`, [f.series, f.character, f.from]);
    }
    await db.exec(`insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
      values ('character', 'natsu-dragneel', 'species', 'wikipedia', null, 'https://en.wikipedia.org/wiki/Natsu_Dragneel', '2026-11-02T00:00:00Z') on conflict do nothing`);
    // A game that already has a snapshot (the branch of L18 that refreshes it).
    await db.exec(`select public.dle_refresh_entities('otakudle')`);
    before_wsj = await one<number>(db, `select count(*)::int from public.series where magazine = 'Weekly Shōnen Jump'`);
    before = await snap(db);
    targetsBefore = await targets();
    await db.exec(readLaunch(SQL));
    after = await snap(db);
  });

  it('the data: 50 series, each with its Wikipedia page, revision id and infobox genres, 1 to 3 words of the closed list of 15 (Visual novel dropped), no dash', () => {
    expect(GENRES).toHaveLength(50);
    expect(new Set(GENRES.map((d) => d.series)).size).toBe(50);
    expect(GENRES.filter((d) => !/^[0-9]+$/.test(d.revid) || !d.wikipedia_title || !d.infobox || d.raw_genres.length === 0)).toEqual([]);
    expect(GENRES.filter((d) => d.genres.length < 1 || d.genres.length > 3 || d.genres.some((g) => !WORDS.includes(g)))).toEqual([]);
    expect(GENRES.filter((d) => JSON.stringify(d.genres) !== JSON.stringify([...d.genres].sort((a, b) => WORDS.indexOf(a) - WORDS.indexOf(b))))).toEqual([]);
    expect(JSON.stringify(GENRES)).not.toMatch(/[–—]/);
    // Sourced: the words of a series come from its infobox only, and the series with one raw genre keep it.
    expect(GENRES.filter((d) => d.raw_genres.length === 1).map((d) => d.series)).toEqual(['sailor-moon', 'sakamoto-days', 'that-time-i-got-reincarnated-as-a-slime']);
    expect(execFileSync('node', [path.join(DLE, 'gen-genres.mjs'), '--check'], { encoding: 'utf8' }).trim()).toBe('same');
  });

  it('the objective: no exact set of genres is shared by more than 5 series (the largest is 3), and the 185 targets are all counted', () => {
    const bySet = new Map<string, string[]>();
    for (const d of GENRES) bySet.set(d.genres.join('+'), [...(bySet.get(d.genres.join('+')) ?? []), d.series]);
    expect(Math.max(...[...bySet.values()].map((v) => v.length))).toBe(3);
    expect(bySet.size).toBe(40);
    expect(GENRES.reduce((n, d) => n + d.targets, 0)).toBe(185);
  });

  it('the closed list has its words in both languages, and the French header is Thèmes', () => {
    expect(Object.keys(GENRE.en)).toEqual(WORDS);
    expect(Object.keys(GENRE.fr)).toEqual(WORDS);
    expect(valueLabel('genres', ['dark-fantasy', 'martial-arts'], 'fr')).toBe('Dark fantasy, Arts martiaux');
    expect(valueLabel('genres', ['mystery-thriller', 'slice-of-life'], 'en')).toBe('Mystery and thriller, Slice of life');
    expect(OTAKUDLE_COLUMNS.en.genres).toMatchObject({ label: 'Genres', help: 'Genres of the work. Striped: one genre in common.' });
    expect(OTAKUDLE_COLUMNS.fr.genres!.label).toBe('Thèmes');
    expect(OTAKUDLE_COLUMNS.fr.genres!.help.startsWith('Genres de l’œuvre')).toBe(true);
    expect(OTAKUDLE_COLUMNS.fr.gender!.label).toBe('Genre');
    expect(OTAKUDLE_COLUMNS.en.year!.label).toBe('Series year');
    expect(OTAKUDLE_COLUMNS.fr.year!.label).toBe('Année de la série');
    expect(OTAKUDLE_COLUMNS.en.demographic).toBeUndefined();
    expect(OTAKUDLE_COLUMNS.fr.demographic).toBeUndefined();
    expect(OTAKUDLE_COLUMNS.en.magazine).toBeUndefined();
  });

  it('the game has 7 compared columns, in order: series, genres, year, studio, gender, species, role', async () => {
    const a = await rows<{ key: string; kind: string; position: number; near: string | null }>(db, `select key, kind, position, near from public.dle_attributes where game_id = 'otakudle' order by position`);
    expect(a.map((x) => x.key)).toEqual(['series', 'genres', 'year', 'studio', 'gender', 'species', 'role']);
    expect(a.map((x) => x.position)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(a.find((x) => x.key === 'genres')).toMatchObject({ kind: 'multi', near: null });
    expect(a.find((x) => x.key === 'year')).toMatchObject({ kind: 'number', near: '2' });
    const pool = JSON.parse(await one<string>(db, `select attrs::text from public.dle_src_anime_character where name = 'Satoru Gojo'`)) as Record<string, unknown>;
    expect(Object.keys(pool).sort()).toEqual(['gender', 'genres', 'role', 'series', 'species', 'studio', 'year']);
    const cells = await one<number>(db, `select jsonb_array_length(public.dle_compare_all('otakudle',
      (select attrs from public.dle_src_anime_character where name = 'Satoru Gojo'), (select attrs from public.dle_src_anime_character where name = 'Conan Edogawa')))`);
    expect(cells).toBe(7);
    // The columns of the other games did not move.
    expect(JSON.parse(after.attrs).filter((x: { game_id: string }) => x.game_id !== 'otakudle')).toEqual(JSON.parse(before.attrs).filter((x: { game_id: string }) => x.game_id !== 'otakudle'));
  });

  it('every character reads the genres of its series, and the year of the four series that had none', async () => {
    const r = await rows<{ series: string; g: { v: string[] }; y: number | null }>(db,
      `select balance_key as series, attrs -> 'genres' as g, (attrs -> 'year' ->> 'v')::int as y from public.dle_src_anime_character`);
    expect(r.length).toBe(750);
    for (const d of GENRES) {
      const mine = r.filter((x) => x.series === d.series);
      expect(mine.length, d.series).toBeGreaterThan(0);
      for (const x of mine) expect(x.g, d.series).toEqual({ v: d.genres });
    }
    const years = Object.fromEntries(MAGAZINE.filter((d) => d.work_year !== undefined).map((d) => [d.series, d.work_year]));
    expect(years).toEqual({ 'mob-psycho-100': 2012, 'one-punch-man': 2009, 're-zero': 2012, 'steins-gate': 2009, 'sword-art-online': 2002 });
    for (const [k, y] of Object.entries(years)) for (const x of r.filter((q) => q.series === k)) expect(x.y, k).toBe(y);
    expect(r.filter((x) => x.y === null)).toEqual([]);
    expect(r.find((x) => x.series === 'one-punch-man')!.y).toBe(2009);
  });

  it('Right, Close and Wrong on real pairs', async () => {
    // Right: the same set.
    expect(await cell(db, 'genres', 'Naruto Uzumaki', 'Gon Freecss')).toBe('correct'); // Adventure, Fantasy, Martial arts
    expect(await cell(db, 'genres', 'Naruto Uzumaki', 'Goku')).toBe('correct');
    expect(await cell(db, 'genres', 'Usagi Tsukino', 'Rimuru Tempest')).toBe('correct'); // Fantasy alone
    // Close: one genre in common, in both directions.
    expect(await cell(db, 'genres', 'Tanjiro Kamado', 'Satoru Gojo')).toBe('near'); // Adventure + Dark fantasy shared, Martial arts against Supernatural
    expect(await cell(db, 'genres', 'Satoru Gojo', 'Tanjiro Kamado')).toBe('near');
    expect(await cell(db, 'genres', 'Light Yagami', 'Conan Edogawa')).toBe('near'); // Supernatural + Mystery and thriller against Mystery and thriller
    expect(await cell(db, 'genres', 'Naruto Uzumaki', 'Usagi Tsukino')).toBe('near'); // Fantasy
    // Wrong: nothing in common.
    expect(await cell(db, 'genres', 'Conan Edogawa', 'Satoru Gojo')).toBe('wrong');
    expect(await cell(db, 'genres', 'Rintaro Okabe', 'Satoru Gojo')).toBe('wrong'); // Mystery and thriller + Science fiction (the anime infobox) against Adventure, Dark fantasy, Supernatural
    expect(await cell(db, 'genres', 'Rintaro Okabe', 'Conan Edogawa')).toBe('near'); // Mystery and thriller shared
    expect(await cell(db, 'genres', 'Shigeo Kageyama', 'Rimuru Tempest')).toBe('wrong'); // Action, Supernatural, Comedy against Fantasy
  });

  it('the characters of Re:Zero, SAO, Mob Psycho 100 and Steins;Gate can now be the answer', async () => {
    const was = (k: string): number => targetsBefore.find((t) => t.balance_key === k)?.n ?? 0;
    const now = await targets();
    const is = (k: string): number => now.find((t) => t.balance_key === k)?.n ?? 0;
    let gained = 0;
    for (const k of ['re-zero', 'sword-art-online', 'mob-psycho-100', 'steins-gate']) {
      expect(was(k), k).toBe(0);
      expect(is(k), k).toBeGreaterThan(0);
      gained += is(k);
    }
    expect(gained).toBe(7);
    // Nothing else moved as a target, and the 185 are the targets of the JSON.
    for (const t of targetsBefore) expect(is(t.balance_key), t.balance_key).toBe(t.n);
    expect(now.reduce((s, x) => s + x.n, 0)).toBe(targetsBefore.reduce((s, x) => s + x.n, 0) + 7);
    expect(now.reduce((s, x) => s + x.n, 0)).toBe(185);
    for (const d of GENRES) expect(is(d.series), d.series).toBe(d.targets);
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

  it('every series has a Wikipedia source row with its revision id; the magazine columns are not in the database', async () => {
    expect(await one<number>(db, `select count(*)::int from public.entity_sources where entity_type = 'series' and field = 'otakudle.genres' and source = 'wikipedia' and source_ref ~ '^[0-9]+$'`)).toBe(50);
    expect(await one<number>(db, `select count(*)::int from public.entity_sources where entity_type = 'series' and field = 'otakudle.year'`)).toBe(5);
    expect(await one<number>(db, `select count(*)::int from public.entity_sources where entity_type = 'series' and field in ('otakudle.magazine', 'otakudle.publisher')`)).toBe(0);
    expect(after.sources).toBe(before.sources + 55 - 1);
    expect(await one<number>(db, `select count(*)::int from information_schema.columns where table_name = 'series_facts' and column_name in ('magazine', 'publisher')`)).toBe(0);
  });

  it('the closed list is enforced by the database', async () => {
    await expect(db.exec(`update public.series_facts set genres = array['invented'] where group_id = (select id from public.groups where slug = 'naruto')`)).rejects.toThrow();
    await expect(db.exec(`update public.series_facts set genres = array['action','adventure','fantasy','comedy'] where group_id = (select id from public.groups where slug = 'naruto')`)).rejects.toThrow();
    expect(await snap(db)).toEqual(after);
  });

  it('a second run changes nothing', async () => {
    await db.exec(readLaunch(SQL));
    expect(await snap(db)).toEqual(after);
  });

  it('the rollback restores the state before L18 exactly, twice, and L18 applies again', async () => {
    await db.exec(readLaunch(ROLLBACK));
    await db.exec(readLaunch(ROLLBACK));
    expect(await snap(db)).toEqual(before);
    expect(await one<number>(db, `select count(*)::int from information_schema.columns where table_name = 'series_facts' and column_name in ('genres', 'work_year')`)).toBe(0);
    await db.exec(readLaunch(SQL));
    expect(await snap(db)).toEqual(after);
  });

  it('One-Punch Man is 2009 and there is no OWNER switch left', () => {
    const sql = readLaunch(SQL);
    expect(sql).not.toMatch(/-- OWNER/);
    expect(sql).toMatch(/\('one-punch-man', array\['action', 'comedy'\]::text\[\], 2009\)/);
    expect(sql).toMatch(/Tonari no Young Jump remake \(2012\)/);
  });

  it('the files carry no em or en dash, say when to apply them and how a played game is affected, and are the generator output', () => {
    for (const f of [SQL, ROLLBACK]) expect(readLaunch(f)).not.toMatch(/[–—]/);
    const s = readLaunch(SQL);
    expect(s).toMatch(/after 00:30 UTC and never between 23:50 and 00:30/);
    expect(s).toMatch(/stored as the entity id/);
    expect(s).toMatch(/never during a build/);
    expect(s).toMatch(/o1-transaction: single/);
    expect(s).toMatch(/after a backup/);
    expect(s).not.toMatch(/add column[^;]*(magazine|publisher)/);
    expect(execFileSync('node', [path.join(DLE, 'gen-l18.mjs'), '--check'], { encoding: 'utf8' }).trim()).toBe('same');
  });
});
