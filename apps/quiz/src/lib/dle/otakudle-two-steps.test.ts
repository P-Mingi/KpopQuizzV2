// Lane OTK-E (owner request of 2026-11-26: Otakudle in two steps). The real files on PGlite with the repo's dle harness: 019, 024, L04, L13, L15 and the Otakudle files up to L40, then L42a (the sets of step 2),
// L42 (the new dle_play_state) and its rollbacks. Proof: step 1 then step 2 cells, One Piece and Dragon Ball through their own sets, a series of the new data, the counts of each step, a reload, the rollbacks,
// a second run that changes nothing.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { buildData } from '../../../../../scripts/o1/launch/dle-step2.mjs';
import { readInputs } from '../../../../../scripts/o1/launch/gen-two-steps.mjs';
import { rpcAs } from './game-fixture';
import { afterJ4, afterSessionG, applyLaunchFiles, liveGames } from './otakudle-fixture';
import { MIGRATIONS, failure, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const REPO = path.resolve(MIGRATIONS, '../../..');
const DATA = process.env.OTK2_DATA_DIR ?? path.join(REPO, 'docs/anime/data/dle/step2');
const SERIES = path.join(REPO, 'docs/anime/data/series');
const readLaunch = (f: string): string => readFileSync(path.join(MIGRATIONS, 'launch', f), 'utf8');
const UP = 'L42-l1-otakudle-two-steps.sql';
const DOWN = 'L42-l1-otakudle-two-steps.rollback.sql';
const GAME = 'otakudle';
const TODAY = new Date().toISOString().slice(0, 10);
const tok = (n: number): string => `l42-token-${String(n).padStart(4, '0')}-abcdefgh`;

interface Cell { key: string; status: string; arrow: string | null; value?: { v: unknown; l?: string; lf?: string } }
interface State {
  status: string; guesses: { id: string; result: Cell[]; step2?: Cell[] }[]; step?: number; series?: string; series_label?: string; step1_guesses?: number; step2_guesses?: number; step2_total?: number;
  step2_columns?: { key: string; kind: string; near?: number; label?: { en: string; fr: string }; help?: { en: string; fr: string } }[]; solve_rank?: number | null; players_today?: number; hints: { key: string }[]; target: { id: string; name: string } | null;
}

let db: PGlite;
const files = buildData(readInputs(DATA, SERIES));
const guess = async (n: number, id: string): Promise<State> => {
  const r = await rpcAs(db, 'dle_guess', { p_game: GAME, p_date: TODAY, p_token: tok(n), p_entity: id });
  expect(r.error).toBeNull();
  return r.data as State;
};
const day = async (n: number): Promise<State | null> => ((await rpcAs(db, 'dle_day', { p_game: GAME, p_token: tok(n) })).data as { play: State | null }).play;
const targetId = (): Promise<string> => one<string>(db, `select public.dle_target('${GAME}', $1::date)`, [TODAY]);
/** Entities of the pool by series slug (balance_key), never the target. */
const pool = (series: string): Promise<{ entity_id: string; name: string }[]> =>
  rows(db, `select entity_id, name from public.dle_entities where game_id = '${GAME}' and in_pool and balance_key = $1 order by name`, [series]);

async function verify(file: string): Promise<void> {
  const lines = readLaunch(file).split('\n').filter((l) => l.startsWith('-- Verify:'));
  expect(lines.length).toBeGreaterThanOrEqual(2);
  for (const line of lines) {
    const m = /^-- Verify: (select .*;)   expect (.*)$/.exec(line);
    expect(m, line).not.toBeNull();
    const r = await rows<Record<string, unknown>>(db, m![1]!.replace(/;$/, ''));
    expect(String(Object.values(r[0]!)[0]), m![1]).toBe(m![2]);
  }
}

beforeAll(async () => {
  db = await afterSessionG();
  await db.exec(readMigration('024-dle-series-games.sql'));
  await afterJ4(db);
  await db.exec(readMigration('024-dle-series-games.sql'));
  await applyLaunchFiles(db);
  for (const f of ['L15-A2-series-games.sql', 'L17-l1-op-affiliation.sql', 'L18-l1-otakudle-genres.sql', 'L21-l1-series-games-corrections.sql', 'L22-l1-otakudle-facts-corrections.sql',
    'L23-l1-otakudle-first-adaptation.sql', 'L35-l1-otakudle-fill.sql', 'L36-l1-series-fill.sql', 'L40-l1-dle-live-count-and-rank.sql']) {
    try { await db.exec(readLaunch(f)); } catch (e) { throw new Error(`${f}: ${(e as Error).message}`); }
  }
  await liveGames(db, [GAME]);
}, 600_000);

describe('before L42: one board, no step field', () => {
  it('the play state is the one of L40', async () => {
    const t = await targetId();
    const s = await guess(1, t);
    expect(s.status).toBe('won');
    expect(s.step).toBeUndefined();
    expect(s.guesses[0]!.step2).toBeUndefined();
    expect(s.guesses[0]!.result.map((c) => c.key)).toEqual(['series', 'genres', 'year', 'studio', 'gender', 'species', 'role']);
  });
});

describe('after L42a and L42', () => {
  it('the data files apply, a second run changes nothing', async () => {
    for (const f of files) await db.exec(f.sql);
    const snap = async (): Promise<string> => JSON.stringify([
      await rows(db, `select character_id, game_id, attrs, updated_at from public.character_game_facts where game_id like 'otakudle-s-%' order by 1, 2`),
      await rows(db, `select entity_id, field, source, source_url from public.entity_sources where field in (select split_part(game_id, 'otakudle-s-', 2) || '.' || key from public.dle_attributes where game_id like 'otakudle-s-%') order by 1, 2, 3`),
      await rows(db, `select * from public.dle_attributes where game_id like 'otakudle-s-%' order by 1, position`),
    ]);
    const first = await snap();
    for (const f of files) await db.exec(f.sql);
    expect(await snap()).toBe(first);
    expect(await one<number>(db, `select count(*)::int from public.character_game_facts where game_id like 'otakudle-s-%'`)).toBe(files.reduce((n, f) => n + f.rows.facts, 0));
  });

  it('L42 applies, its Verify lines hold and a second run changes nothing', async () => {
    await db.exec(readLaunch(UP));
    await verify(UP);
    const snap = async (): Promise<string> => JSON.stringify([
      await rows(db, `select proname, prosrc from pg_proc where proname like 'dle\\_%' order by 1`), await rows(db, `select * from public.dle_attributes order by 1, position`),
    ]);
    const s = await snap();
    await db.exec(readLaunch(UP));
    expect(await snap()).toBe(s);
  });
  it('the target of a day is the one of dle_daily_stats: the tests move it to the series under test', async () => {
    expect(await one<number>(db, `select count(*)::int from public.dle_daily_stats where game_id = '${GAME}' and play_date = $1::date`, [TODAY])).toBe(1);
  });
});

/** Puts the answer of today on a character (the rows of dle_daily_stats keep the answer of a played day) and gives the plays a new generation of tokens. */
let gen = 10;
async function aim(entity: string): Promise<number> {
  await db.query(`update public.dle_daily_stats set entity_id = $1 where game_id = '${GAME}' and play_date = $2::date`, [entity, TODAY]);
  gen += 100;
  return gen;
}
describe('the two steps on the real data', () => {
  it('step 1 then step 2: a wrong anime stays in step 1, the right anime opens step 2 with its banner fields, the counts of each step, the hints on the total of errors, a reload', async () => {
    const series = 'naruto';
    const chars = await pool(series);
    const target = chars[0]!.entity_id;
    const t = await aim(target);
    const other = (await rows<{ entity_id: string }>(db, `select entity_id from public.dle_entities where game_id = '${GAME}' and in_pool and balance_key <> $1 order by entity_id limit 6`, [series])).map((r) => r.entity_id);
    // Two guesses of another anime: step 1, one board, no step 2.
    let s = await guess(t, other[0]!);
    expect(s.step).toBe(1);
    expect(s.series).toBeUndefined();
    expect(s.step2_columns).toBeUndefined();
    expect(s.guesses[0]!.step2).toBeUndefined();
    expect(s.guesses[0]!.result.map((c) => c.key)).toEqual(['series', 'genres', 'year', 'studio']);
    s = await guess(t, other[1]!);
    // The first character of the right anime: step 2 opens, found in 3 guesses.
    s = await guess(t, chars[1]!.entity_id);
    expect(s.status).toBe('playing');
    expect(s.step).toBe(2);
    expect(s.series).toBe(series);
    expect(s.series_label).toBe('Naruto');
    expect(s.step1_guesses).toBe(3);
    expect(s.step2_guesses).toBe(1);
    expect(s.step2_total).toBe(chars.length);
    const own = JSON.parse(readFileSync(path.join(DATA, `${series}.json`), 'utf8')) as { columns: { key: string; label: { en: string; fr: string } }[] };
    expect(s.step2_columns!.map((c) => c.key)).toEqual(['gender', ...own.columns.map((c) => c.key)]);
    expect(s.step2_columns!.slice(1).map((c) => c.label)).toEqual(own.columns.map((c) => c.label));
    expect(s.step2_columns![0]!.label).toBeUndefined();
    expect(s.guesses[0]!.step2).toBeUndefined();
    const cells = s.guesses[2]!.step2!;
    expect(cells.map((c) => c.key)).toEqual(s.step2_columns!.map((c) => c.key));
    expect(cells.every((c) => ['correct', 'near', 'wrong'].includes(c.status))).toBe(true);
    expect(cells.every((c) => c.value !== undefined && c.value.v !== null)).toBe(true);
    // Step 1 cells of that guess are the ones of the work: same series, so the series cell is right.
    expect(s.guesses[2]!.result[0]).toMatchObject({ key: 'series', status: 'correct' });
    // Another character of the anime: the counts follow, the total of errors is 4, no hint yet (5 and 10).
    s = await guess(t, chars[2]!.entity_id);
    expect([s.step1_guesses, s.step2_guesses, s.guesses.length]).toEqual([3, 2, 4]);
    expect(s.hints).toEqual([]);
    s = await guess(t, chars[3]!.entity_id);
    expect(s.hints.map((h) => h.key)).toEqual(['voice_actor_ja']);
    expect([s.step1_guesses, s.step2_guesses, s.guesses.length]).toEqual([3, 3, 5]);
    // A reload gives the same state; the same guess again changes nothing.
    const again = (await day(t))!;
    expect(again.guesses).toEqual(s.guesses);
    expect([again.step, again.series, again.step1_guesses, again.step2_guesses, again.step2_total]).toEqual([2, series, 3, 3, chars.length]);
    expect((await guess(t, chars[3]!.entity_id)).guesses).toHaveLength(5);
    // The answer: every cell of step 2 is right, the play is won in 6 guesses (anime in 3, character in 4).
    const won = await guess(t, target);
    expect(won.status).toBe('won');
    expect([won.guesses.length, won.step1_guesses, won.step2_guesses]).toEqual([6, 3, 4]);
    expect(won.guesses[5]!.step2!.every((c) => c.status === 'correct')).toBe(true);
    expect(won.target!.id).toBe(target);
    expect(won.solve_rank).not.toBeNull();
    expect(won.players_today).toBeGreaterThan(0);
  });

  it('a guess of the right anime found at the first try: both steps are 1', async () => {
    const chars = await pool('bleach');
    const t = await aim(chars[0]!.entity_id);
    const s = await guess(t, chars[0]!.entity_id);
    expect([s.status, s.step, s.step1_guesses, s.step2_guesses]).toEqual(['won', 2, 1, 1]);
  });

  it('a give up before the anime is found keeps one board; after, it keeps both', async () => {
    const chars = await pool('bleach');
    const t = await aim(chars[0]!.entity_id);
    await guess(t, chars[1]!.entity_id);
    const r = (await rpcAs(db, 'dle_give_up', { p_game: GAME, p_date: TODAY, p_token: tok(t) })).data as State;
    expect(r.status).toBe('given_up');
    expect([r.step, r.step1_guesses, r.step2_guesses]).toEqual([2, 1, 1]);
    const t2 = await aim(chars[0]!.entity_id);
    const other = (await rows<{ entity_id: string }>(db, `select entity_id from public.dle_entities where game_id = '${GAME}' and in_pool and balance_key <> 'bleach' limit 1`))[0]!.entity_id;
    await guess(t2, other);
    const g = (await rpcAs(db, 'dle_give_up', { p_game: GAME, p_date: TODAY, p_token: tok(t2) })).data as State;
    expect([g.status, g.step, g.series]).toEqual(['given_up', 1, undefined]);
  });

  it('One Piece and Dragon Ball go through their own sets: the columns of their games, matched by character', async () => {
    const op = await pool('one-piece');
    const t = await aim(op[0]!.entity_id);
    const s = await guess(t, op[1]!.entity_id);
    expect([s.step, s.series, s.step2_total]).toEqual([2, 'one-piece', op.length]);
    expect(s.step2_columns!.map((c) => c.key)).toEqual(['gender', 'affiliation', 'devil_fruit_type', 'haki', 'bounty', 'height_cm', 'sea_of_origin', 'debut_arc']);
    // The columns of the games carry no label: the app has its own words for them.
    expect(s.step2_columns!.every((c) => c.label === undefined)).toBe(true);
    expect(s.guesses[0]!.step2!.map((c) => c.key)).toEqual(s.step2_columns!.map((c) => c.key));
    const db2 = await pool('dragon-ball');
    const t2 = await aim(db2[0]!.entity_id);
    const d = await guess(t2, db2[1]!.entity_id);
    expect([d.step, d.series, d.step2_total]).toEqual([2, 'dragon-ball', db2.length]);
    expect(d.step2_columns!.map((c) => c.key)).toEqual(['gender', 'race', 'affiliation', 'home_planet', 'universe', 'debut_series', 'debut_saga', 'alignment_at_debut']);
    // The same compare as the series games' own, on their own values.
    const direct = JSON.parse(await one<string>(db, `select public.dle_compare_all('otakudle-dragon-ball', public.dle_set_attrs('otakudle-dragon-ball', $1), public.dle_set_attrs('otakudle-dragon-ball', $2))::text`, [db2[1]!.entity_id, db2[0]!.entity_id])) as Cell[];
    expect(direct.map((c) => c.key)).toEqual(d.step2_columns!.map((c) => c.key));
    expect(d.guesses[0]!.step2!.map(({ key, status, arrow }) => ({ key, status, arrow }))).toEqual(direct.map(({ key, status, arrow }) => ({ key, status, arrow })));
  });

  it('every series: aimed at its first character, a second character gives the cells of its own columns with their values, names and arcs in the words of the data', async () => {
    const slugs = files.flatMap((f) => f.series);
    expect(slugs.length).toBeGreaterThan(0);
    for (const slug of slugs) {
      const data = JSON.parse(readFileSync(path.join(DATA, `${slug}.json`), 'utf8')) as { columns: { key: string; kind: string }[]; characters: { slug: string; values: Record<string, unknown> }[] };
      const inPool = await pool(slug);
      expect(inPool.length, slug).toBeGreaterThanOrEqual(2);
      const slugOf = new Map(await rows<{ id: string; slug: string }>(db, `select c.id::text as id, c.slug from public.characters c join public.groups g on g.id = c.group_id where g.slug = $1`, [slug]).then((r) => r.map((x) => [x.id, x.slug] as const)));
      const a = inPool[0]!.entity_id;
      const b = inPool[1]!.entity_id;
      const bData = data.characters.find((c) => c.slug === slugOf.get(b))!;
      const t = await aim(a);
      const s = await guess(t, b);
      expect(s.series, slug).toBe(slug);
      expect(s.step2_total, slug).toBe(inPool.length);
      expect(s.guesses[0]!.step2!.map((c) => c.key), slug).toEqual(['gender', ...data.columns.map((c) => c.key)]);
      for (const c of data.columns) {
        const cell = s.guesses[0]!.step2!.find((x) => x.key === c.key)!;
        expect(cell.value!.v, `${slug}.${c.key}`).toEqual(bData.values[c.key]);
        if (c.kind === 'ordinal') expect(typeof cell.value!.l, `${slug}.${c.key}`).toBe('string');
      }
    }
  });
});

describe('the coverage of the pool', () => {
  it('every character of the Otakudle pool (the ones left out through dle_curation excepted) has its values in the set of its series, and every set holds at least its pool', async () => {
    const lacking = await rows(db, `select v.balance_key, c.slug from public.dle_src_anime_character v join public.characters c on c.id = v.entity_id::integer
      where not exists (select 1 from public.dle_curation k where k.game_id = 'otakudle' and k.entity_id = v.entity_id and k.excluded)
        and not exists (select 1 from public.character_game_facts f where f.character_id = v.entity_id::integer and f.game_id = public.dle_otakudle_set_id(v.balance_key))`);
    expect(lacking).toEqual([]);
    const pools = await rows<{ balance_key: string; n: number }>(db, `select balance_key, count(*)::int as n from public.dle_entities where game_id = 'otakudle' and in_pool group by 1 order by 1`);
    expect(pools.length).toBe(50);
    expect(pools.every((x) => x.n >= 2)).toBe(true);
    if (process.env.OTK2_STATS) require('node:fs').writeFileSync(process.env.OTK2_STATS, JSON.stringify({ pools, targets: await rows(db, `select count(*)::int as n from public.dle_entities where game_id = 'otakudle' and in_pool and can_be_target`) }));
  });
});

describe('the rollbacks', () => {
  const snap = async (): Promise<unknown> => ([
    await rows(db, `select proname, md5(prosrc) as src from pg_proc where proname like 'dle\\_%' order by 1`),
    await rows(db, `select game_id, key, kind, position, near from public.dle_attributes order by 1, position`),
    await rows(db, `select id, active, epoch from public.dle_games order by 1`),
    await rows(db, `select count(*)::int as n from public.character_game_facts`),
    await rows(db, `select count(*)::int as n from public.entity_sources`),
  ]);

  it('L42 undone: the L40 play state, 7 columns, one board; its Verify lines hold, a second run changes nothing; applied again, the two steps are back', async () => {
    const plays = await one<number>(db, 'select count(*)::int from public.dle_plays');
    const up = await snap();
    await db.exec(readLaunch(DOWN));
    await verify(DOWN);
    expect(await one<number>(db, 'select count(*)::int from public.dle_plays')).toBe(plays);
    const chars = await pool('naruto');
    const t = await aim(chars[0]!.entity_id);
    const s = await guess(t, chars[1]!.entity_id);
    expect(s.step).toBeUndefined();
    expect(s.guesses[0]!.step2).toBeUndefined();
    expect(s.guesses[0]!.result).toHaveLength(7);
    expect(s.players_today).toBeGreaterThan(0);
    // The play state is the text of L40 byte for byte.
    const l40 = readLaunch('L40-l1-dle-live-count-and-rank.sql');
    const src = /create or replace function public\.dle_play_state[\s\S]*?end \$\$;/.exec(l40)![0];
    expect((await one<string>(db, `select prosrc from pg_proc where proname = 'dle_play_state'`)).trim()).toBe(src.slice(src.indexOf('$$') + 2, src.lastIndexOf('$$')).trim());
    const down = await snap();
    await db.exec(readLaunch(DOWN));
    expect(await snap()).toEqual(down);
    await db.exec(readLaunch(UP));
    expect(await snap()).toEqual(up);
    const t2 = await aim(chars[0]!.entity_id);
    expect((await guess(t2, chars[1]!.entity_id)).step).toBe(2);
  });

  it('L42a undone: refused while L42 is applied, then the facts, the sources, the sets and the meta column go; a second run changes nothing; applied again, the same rows', async () => {
    const full = await snap();
    const last = files[files.length - 1]!;
    expect(await failure(db, readLaunch(files[0]!.rollbackName))).toMatch(/L42 is applied/);
    await db.exec(readLaunch(DOWN));
    for (const f of [...files].reverse()) {
      await db.exec(readLaunch(f.rollbackName));
      await verify(f.rollbackName);
    }
    expect(last).toBeDefined();
    expect(await one<number>(db, `select count(*)::int from public.character_game_facts where game_id like 'otakudle-s-%'`)).toBe(0);
    expect(await one<number>(db, `select count(*)::int from public.dle_games where id like 'otakudle-s-%'`)).toBe(0);
    expect(await one<number>(db, `select count(*)::int from public.entity_sources where field like 'naruto.%'`)).toBe(0);
    // The facts of One Piece and Dragon Ball are not touched.
    expect(await one<number>(db, `select count(*)::int from public.character_game_facts where game_id in ('otakudle-one-piece', 'otakudle-dragon-ball')`)).toBeGreaterThan(100);
    const gone = await snap();
    for (const f of [...files].reverse()) await db.exec(readLaunch(f.rollbackName));
    expect(await snap()).toEqual(gone);
    // Without L42a, L42 refuses.
    expect(await failure(db, readLaunch(UP))).toMatch(/apply L42a first/);
    for (const f of files) await db.exec(readLaunch(f.name));
    await db.exec(readLaunch(UP));
    expect(await snap()).toEqual(full);
  });
});

describe('the files', () => {
  const all = [UP, DOWN, ...files.flatMap((f) => [f.name, f.rollbackName])];
  it('the data files in the repo are what the generator writes, in order, each under 1.5 MB', () => {
    for (const f of files) {
      expect(readLaunch(f.name)).toBe(f.sql);
      expect(readLaunch(f.rollbackName)).toBe(f.rollback);
      expect(Buffer.byteLength(f.sql)).toBeLessThan(1_500_000);
    }
  });
  it.each(all)('%s is one DO block with no temp table, no session statement, every UPDATE and DELETE with a WHERE and no dash', (file) => {
    const sql = readLaunch(file);
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    const tag = /^do (\$[a-z0-9]+\$)\n/.exec(code)![1]!;
    expect(code.startsWith(`do ${tag}\n`)).toBe(true);
    expect(code.endsWith(`end ${tag};`)).toBe(true);
    expect(code.split(tag).length).toBe(3);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    expect(sql).not.toMatch(/^set\s+(lock_timeout|client_min_messages|statement_timeout|role|session)\b/im);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    expect(sql).not.toMatch(/[\u2013\u2014\u2026]/);
    expect(sql).toMatch(/^-- Verify: select .*;   expect .+$/m);
        // Every delete and update names a where, in the same statement.
    for (const stmt of code.split(';')) {
      if (/^\s*(delete from|update )/i.test(stmt.replace(/--[^\n]*/g, '').trim())) expect(stmt, stmt.slice(0, 120)).toMatch(/\bwhere\b/i);
    }
  });
});
