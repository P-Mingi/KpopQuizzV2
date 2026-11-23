// Lane DATA37 (integrator, LAUNCH-POLISH-2 task D, 2026-11-23): L37 on PGlite. One world holds the real files of the night before: Kpopdle (011 ... 022, 021d, 021e, L19, L20, L34) and the two
// series games (024, L04, L13, L15, L17, L18, L21, L36), then L37 and its rollback. L37 changes AKMU's agency, takes Heeseung out of the Kpopdle pool, and makes the three never revealed
// One Piece bounties "Unknown", compared by dle_compare with no arrow, never close, two of them equal.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { ONE_PIECE_COLUMNS, valueLabel } from './copy';
import { kpopdleWorld, productionCalendar } from './kpopdle-fixture';
import { afterJ4, applyLaunchFiles, liveGames } from './otakudle-fixture';
import { MIGRATIONS, one, readMigration, rows } from './pglite-harness';
import { BOUNTY_UNKNOWN, seriesValueLabel } from './value-i18n';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L37 = readLaunch('L37-l1-launch-polish-data.sql');
const L37R = readLaunch('L37-l1-launch-polish-data.rollback.sql');
const ADULT = `(current_date - interval '30 years')::date`;
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const OP = 'otakudle-one-piece';
const UNKNOWN_SLUGS = ['monkey-d-dragon', 'silvers-rayleigh', 'kozuki-oden'] as const;

interface Verify { query: string; expect: string }
function verifyOf(sql: string): Verify[] {
  const out: Verify[] = [];
  for (const line of sql.split('\n')) {
    if (!line.startsWith('-- Verify:')) continue;
    const m = /^-- Verify: (select .*;)   expect (.*)$/.exec(line);
    if (!m) throw new Error(`unreadable Verify line: ${line}`);
    out.push({ query: m[1]!, expect: m[2]! });
  }
  return out;
}
let db: PGlite;
async function check(sql: string): Promise<void> {
  const list = verifyOf(sql);
  expect(list.length).toBeGreaterThanOrEqual(3);
  expect(list.length).toBeLessThanOrEqual(12);
  for (const v of list) {
    const r = await rows<Record<string, unknown>>(db, v.query.replace(/;$/, ''));
    expect(r.length, v.query).toBe(1);
    const c = Object.values(r[0]!)[0];
    expect(c === null ? 'NULL' : String(c), v.query).toBe(v.expect);
  }
}

async function fingerprint(): Promise<Record<string, string>> {
  const q = async (sql: string): Promise<string> => (await one<string>(db, `select coalesce(md5(string_agg(t, '|' order by t)), '') from (${sql}) x(t)`)) ?? '';
  return {
    idols: await q(`select row(id, group_id, name, birth_date, nationality, positions, active, needs_review, detached_at, gender, debut_year)::text from public.idols`),
    groups: await q(`select row(id, slug, record_label, generation)::text from public.groups`),
    agencies: await q(`select row(slug, name, parent_id, sources, created_at)::text from public.agencies`),
    sources: await q(`select row(entity_type, entity_id, field, source, source_ref, source_url, fetched_at)::text from public.entity_sources`),
    curation: await q(`select row(game_id, entity_id, excluded, weight, note)::text from public.dle_curation`),
    facts: await q(`select row(character_id, game_id, attrs, hints, can_be_target, updated_at)::text from public.character_game_facts`),
    entities: await q(`select row(game_id, entity_id, attrs, hints, can_be_target, in_pool)::text from public.dle_entities`),
    schedule: await q(`select row(game_id, bank_day, entity_id)::text from public.dle_schedule`),
    compare: await q(`select md5(prosrc) from pg_proc where oid = 'public.dle_compare(text, numeric, jsonb, jsonb)'::regprocedure`),
  };
}

const label = (slug: string): Promise<string | null> => one(db, `select record_label from public.groups where site_id = 'kpop' and slug = $1`, [slug]);
const bounty = async (slug: string): Promise<unknown> =>
  one(db, `select f.attrs -> 'bounty' from public.character_game_facts f join public.characters c on c.id = f.character_id where f.game_id = $1 and c.slug = $2`, [OP, slug]);
const inPool = async (id: string): Promise<{ in_pool: boolean; can_be_target: boolean } | undefined> =>
  (await rows<{ in_pool: boolean; can_be_target: boolean }>(db, `select in_pool, can_be_target from public.dle_entities where game_id = 'kpopdle-idol' and entity_id = $1`, [id]))[0];
/** The bounty cell of a guess against a target, as dle_guess computes it (dle_compare_all over the snapshot attrs). */
async function bountyCell(guess: string, target: string): Promise<{ status: string; arrow: string | null }> {
  const r = await one<{ status: string; arrow: string | null }>(db, `
    select c from jsonb_array_elements(public.dle_compare_all($1, (select attrs from public.dle_entities where game_id = $1 and name = $2), (select attrs from public.dle_entities where game_id = $1 and name = $3))) c
    where c ->> 'key' = 'bounty'`, [OP, guess, target]);
  return { status: r.status, arrow: r.arrow };
}
const nameOf = (slug: string): Promise<string> => one(db, `select c.name from public.characters c where c.slug = $1`, [slug]);

let before: Record<string, string>;
let after: Record<string, string>;
let afterAgain: Record<string, string>;
let afterRollback: Record<string, string>;
let pre: { heeseung: { in_pool: boolean; can_be_target: boolean } | undefined; akmu: string | null; bounties: unknown[] };

beforeAll(async () => {
  db = await kpopdleWorld();
  await productionCalendar(db);
  await db.exec(readLaunch('L19-l1-kpopdle-data-fixes.sql'));
  await db.exec(readLaunch('L20-l1-kpopdle-view.sql'));
  // ENHYPEN with Heeseung active and complete: the case L37 has to take out of the pool whatever his active flag says (production keeps him inactive).
  await db.exec(`
    insert into public.groups (name, slug, fandom_name, record_label, generation) values ('ENHYPEN', 'enhypen', 'ENGENE', 'Belift Lab', '4th generation');
    insert into public.idols (id, group_id, name, birth_date, nationality, positions, active, needs_review, gender, debut_year, ord)
      values (115, (select id from public.groups where slug = 'enhypen'), 'Heeseung', ${ADULT}, 'South Korea', '{}', true, false, 'male', extract(year from current_date)::int - 6, 115);
  `);
  await db.exec(`select setval(pg_get_serial_sequence('public.idols', 'id'), (select max(id) from public.idols))`);
  await db.exec(readLaunch('L34-l1-kpopdle-fill.sql'));
  // The series games on top, as the series test builds them.
  await db.exec(readMigration('024-dle-series-games.sql'));
  await afterJ4(db);
  await db.exec(readMigration('024-dle-series-games.sql'));
  await applyLaunchFiles(db);
  for (const f of ['L15-A2-series-games.sql', 'L17-l1-op-affiliation.sql', 'L18-l1-otakudle-genres.sql', 'L21-l1-series-games-corrections.sql']) await db.exec(readLaunch(f));
  await liveGames(db, [OP, 'otakudle-dragon-ball']);
  await db.exec(readLaunch('L36-l1-series-fill.sql'));
  await db.exec(`select public.dle_refresh_entities('kpopdle-idol')`);
  before = await fingerprint();
  pre = { heeseung: await inPool('115'), akmu: await label('akmu'), bounties: await Promise.all(UNKNOWN_SLUGS.map((x) => bounty(x))) };
  await db.exec(L37);
  after = await fingerprint();
  await db.exec(L37);
  afterAgain = await fingerprint();
});

describe('before L37', () => {
  it('AKMU is on YG, Heeseung is in the Kpopdle pool, the three bounties are 0 "No bounty"', async () => {
    expect(before.groups).not.toBe(after.groups);
    expect(pre.akmu).toBe('YG Entertainment');
    expect(pre.heeseung).toEqual({ in_pool: true, can_be_target: true });
    expect(pre.bounties).toEqual([{ v: 0, l: 'No bounty' }, { v: 0, l: 'No bounty' }, { v: 0, l: 'No bounty' }]);
  });
});

describe('L37: AKMU agency', () => {
  it('the group reads Cemter of Inspiration, the agency row and its official source exist, the two idols read it in the game', async () => {
    expect(await label('akmu')).toBe('Cemter of Inspiration');
    expect(await one(db, `select count(*)::int from public.agencies where name = 'Cemter of Inspiration' and slug = 'cemter-of-inspiration' and created_at = timestamptz '2026-11-23 00:00:00+00'`)).toBe(1);
    expect(await rows(db, `select source, source_url from public.entity_sources s join public.groups g on g.id::text = s.entity_id where s.entity_type = 'group' and g.slug = 'akmu' and s.field = 'record_label' and s.source = 'official'`))
      .toEqual([{ source: 'official', source_url: 'https://x.com/official_akmu/status/2018339122465976823' }]);
    const cells = await rows<{ name: string; v: string[]; p: string[] }>(db, `select name, attrs -> 'agency' -> 'v' as v, attrs -> 'agency' -> 'p' as p from public.dle_entities where game_id = 'kpopdle-idol' and name in ('Lee Chan-hyuk', 'Lee Su-hyun') order by name`);
    expect(cells.length).toBe(2);
    for (const c of cells) { expect(c.v).toEqual(['Cemter of Inspiration']); expect(c.p).toEqual(['Cemter of Inspiration']); }
  });

  it('only AKMU moved among the groups; the other labels are as L34 left them', () => {
    const idx = (b: Record<string, string>): string => b.groups!;
    expect(idx(after)).not.toBe(idx(before));
  });
});

describe('L37: Heeseung', () => {
  it('is out of the Kpopdle pool and of the possible answers, by curation, and his row is untouched', async () => {
    expect(await inPool('115')).toEqual({ in_pool: false, can_be_target: false });
    expect(await rows(db, `select excluded, weight, note from public.dle_curation where game_id = 'kpopdle-idol' and entity_id = '115'`)).toEqual([{ excluded: true, weight: '1', note: expect.stringMatching(/^L37: left ENHYPEN/) }]);
    expect(after.idols).toBe(before.idols);
    expect(await one(db, `select count(*)::int from public.idols where id = 115 and active and detached_at is null`)).toBe(1);
    expect(await one(db, `select count(*)::int from public.dle_src_kpop_idol where entity_id = '115'`)).toBe(1);
  });

  it('no birth date or year is written by the file', () => {
    const code = [L37, L37R].flatMap((f) => f.split('\n').filter((l) => !l.trimStart().startsWith('--'))).join('\n');
    expect(code).not.toMatch(/birth|debut_year/i);
  });
});

describe('L37: One Piece bounty Unknown', () => {
  it('the three characters hold {"v": "Unknown"}, the other bounties keep their value', async () => {
    for (const s of UNKNOWN_SLUGS) expect(await bounty(s), s).toEqual({ v: 'Unknown' });
    expect(await bounty('monkey-d-luffy')).toEqual({ v: 3_000_000_000 });
    expect(await bounty('yamato')).toEqual({ v: 0, l: 'No bounty' });
    expect(await bounty('monkey-d-garp')).toEqual({ v: 0, l: 'No bounty' });
  });

  it('dle_compare: two Unknown match; Unknown against a number, 0 or the other way gives no arrow and never close', async () => {
    const dragon = await nameOf('monkey-d-dragon');
    const rayleigh = await nameOf('silvers-rayleigh');
    const luffy = await nameOf('monkey-d-luffy');
    const yamato = await nameOf('yamato');
    expect(await bountyCell(dragon, rayleigh)).toEqual({ status: 'correct', arrow: null });
    expect(await bountyCell(dragon, dragon)).toEqual({ status: 'correct', arrow: null });
    expect(await bountyCell(luffy, dragon)).toEqual({ status: 'wrong', arrow: null });
    expect(await bountyCell(dragon, luffy)).toEqual({ status: 'wrong', arrow: null });
    expect(await bountyCell(yamato, dragon)).toEqual({ status: 'wrong', arrow: null });
    expect(await bountyCell(dragon, yamato)).toEqual({ status: 'wrong', arrow: null });
    // The numbers are as before: an arrow, 0 equals 0.
    expect(await bountyCell(yamato, luffy)).toEqual({ status: 'wrong', arrow: 'up' });
    expect(await bountyCell(luffy, yamato)).toEqual({ status: 'wrong', arrow: 'down' });
    expect(await bountyCell(yamato, await nameOf('monkey-d-garp'))).toEqual({ status: 'correct', arrow: null });
  });

  it('the near distance never makes Unknown close, even a huge one', async () => {
    const r = await rows<{ c: { status: string; arrow: string | null } }>(db, `select public.dle_compare('number', 1e12, '{"v": "Unknown"}'::jsonb, '{"v": 5}'::jsonb) as c`);
    expect(r[0]!.c).toEqual({ status: 'wrong', arrow: null });
    expect((await rows<{ c: unknown }>(db, `select public.dle_compare('number', null, '{"v": null}'::jsonb, '{"v": "Unknown"}'::jsonb) as c`))[0]!.c).toEqual({ status: 'unknown', arrow: null });
    expect((await rows<{ c: unknown }>(db, `select public.dle_compare('single', null, '{"v": "Unknown"}'::jsonb, '{"v": "Unknown"}'::jsonb) as c`))[0]!.c).toEqual({ status: 'correct', arrow: null });
  });

  it('the pool still serves a value for every column, the answers and the bank are unchanged', async () => {
    expect(await one(db, `select count(*)::int from public.dle_entities where game_id = $1 and in_pool and attrs -> 'bounty' ->> 'v' = 'Unknown'`, [OP])).toBe(3);
    const ents = (s: Record<string, string>): string => s.schedule!;
    expect(ents(after)).toBe(ents(before));
  });
});

describe('L37: the file itself', () => {
  it('its Verify lines pass after it', async () => {
    await check(L37);
  });

  it('a second run changes nothing', () => {
    expect(afterAgain).toEqual(after);
  });

  it('nothing else moved: the facts of the other characters, the other pool, the sources of others', async () => {
    const changed = (k: keyof typeof before): boolean => before[k] !== after[k];
    expect(changed('idols')).toBe(false);
    expect(changed('facts')).toBe(true);
    expect(changed('curation')).toBe(true);
    expect(changed('agencies')).toBe(true);
    expect(changed('sources')).toBe(true);
    expect(changed('compare')).toBe(true);
    const n = await one<number>(db, `select count(*)::int from public.character_game_facts f where f.attrs -> 'bounty' ->> 'v' = 'Unknown'`);
    expect(n).toBe(3);
  });

  it('the rollback restores everything, byte for byte, and its Verify lines pass; it is idempotent', async () => {
    await db.exec(L37R);
    afterRollback = await fingerprint();
    expect(afterRollback).toEqual(before);
    await check(L37R);
    await db.exec(L37R);
    expect(await fingerprint()).toEqual(before);
    // and L37 applies again on top of the rolled back world
    await db.exec(L37);
    expect(await fingerprint()).toEqual(after);
  });

  it('the rollback keeps the new comparator when another value is still Unknown (019 would fail on it)', async () => {
    await db.exec(`update public.character_game_facts f set attrs = jsonb_set(attrs, '{bounty}', '{"v": "Unknown"}') from public.characters c where c.id = f.character_id and f.game_id = '${OP}' and c.slug = 'carrot'`);
    await db.exec(L37R);
    expect(await bounty('monkey-d-dragon')).toEqual({ v: 0, l: 'No bounty' });
    expect((await rows<{ c: unknown }>(db, `select public.dle_compare('number', null, '{"v": "Unknown"}'::jsonb, '{"v": 3}'::jsonb) as c`))[0]!.c).toEqual({ status: 'wrong', arrow: null });
    await db.exec(`update public.character_game_facts f set attrs = jsonb_set(attrs, '{bounty}', '{"v": 0, "l": "No bounty"}') from public.characters c where c.id = f.character_id and f.game_id = '${OP}' and c.slug = 'carrot'`);
    await db.exec(L37R);
    expect(await fingerprint()).toEqual(before);
  });
});

describe('re-reading the earlier files does not undo L37, except L34 on AKMU (documented)', () => {
  it('L36 again leaves the three Unknown alone', async () => {
    await db.exec(L37);
    await db.exec(readLaunch('L36-l1-series-fill.sql'));
    for (const s of UNKNOWN_SLUGS) expect(await bounty(s), s).toEqual({ v: 'Unknown' });
  });

  it('L34 again would put YG back on AKMU: the header of L37 says so', () => {
    expect(L37).toMatch(/Re-reading L34 later WOULD put "YG Entertainment" back on AKMU/);
    expect(L37).toMatch(/Applied AFTER L34, L35 and L36/);
  });
});

describe('the game words: Unknown / Inconnue, distinct from No bounty', () => {
  it('the cell and the label', () => {
    expect(BOUNTY_UNKNOWN).toBe('Unknown');
    expect(valueLabel('bounty', 'Unknown', 'en', { series: true })).toBe('Unknown');
    expect(valueLabel('bounty', 'Unknown', 'fr', { series: true })).toBe('Inconnue');
    expect(valueLabel('bounty', 0, 'en', { series: true, label: 'No bounty' })).toBe('No bounty');
    expect(valueLabel('bounty', 0, 'fr', { series: true, label: 'No bounty' })).toBe('Pas de prime');
    expect(seriesValueLabel('bounty', 'Unknown', 'fr')).toBe('Inconnue');
    // another column keeps its own word for Unknown
    expect(valueLabel('home_planet', 'Unknown', 'fr', { series: true })).toBe('Inconnu');
  });

  it('the bounty help says it, in both languages, with no dash', () => {
    expect(ONE_PIECE_COLUMNS.en.bounty!.help).toMatch(/Unknown when it was never revealed/);
    expect(ONE_PIECE_COLUMNS.fr.bounty!.help).toMatch(/Inconnue quand elle n’a jamais été révélée/);
    for (const l of ['en', 'fr'] as const) expect(ONE_PIECE_COLUMNS[l].bounty!.help).not.toMatch(DASHES);
  });

  it('the files hold no en dash or em dash', () => {
    for (const s of [L37, L37R]) expect(s).not.toMatch(DASHES);
  });
});
