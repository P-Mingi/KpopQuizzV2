// Lane kpopdle (owner 2026-11-09): audit 05, L19 (data fixes) and L20 (view: whole-element roles, agency mother company) on PGlite.
// The real files 011, 018, 019, 020, 021a, 021c, 021b, 022, 021d, 021e, then L19 / L20 and their rollbacks. The K1 rows (ids and names of the audit) are seeded with the
// QIDs 021a / 021d list for them; the K2 rows come from 021d itself.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { IDOL_COLUMNS } from './copy';
import { afterSessionG } from './otakudle-fixture';
import { MIGRATIONS, failure, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L19 = readLaunch('L19-l1-kpopdle-data-fixes.sql');
const L19_RB = readLaunch('L19-l1-kpopdle-data-fixes.rollback.sql');
const L20 = readLaunch('L20-l1-kpopdle-view.sql');
const L20_RB = readLaunch('L20-l1-kpopdle-view.rollback.sql');
const V_MEMBERS = readFileSync(path.resolve(MIGRATIONS, '../../launch/o1/checks/V-kpopdle-members.sql'), 'utf8');

// idol id -> QID, as 021a lists them (so 021a really fills gender and debut for the seeded rows).
const QID_021A = new Map<number, string>([...readMigration('021a-k1-idol-gender-debut.sql').matchAll(/^\s*\((\d+), '(Q\d+)', '(?:female|male)', (?:\d{4}|null)\)/gm)].map((m) => [Number(m[1]), m[2]!]));
const QID_021D = new Map<number, string>([...readMigration('021d-k2-idols.sql').matchAll(/^\s*\((\d+), '(Q\d+)'\)[,;]?$/gm)].map((m) => [Number(m[1]), m[2]!]));
const ACTIVATION = [82, 89, 133, 143, 144, 145, 148, 151, 152, 153, 163];

// [slug, name, label, generation]: the K1 groups as production holds them on 2026-11-08 (labels read by the audit).
const K1_GROUPS: [string, string, string | null, string][] = [
  ['bts', 'BTS', 'Columbia Records', '3rd Gen'], ['blackpink', 'BLACKPINK', 'YG Entertainment', '3rd Gen'], ['twice', 'TWICE', 'JYP Entertainment', '3rd Gen'],
  ['aespa', 'aespa', 'Capitol Records', '4th Gen'], ['newjeans', 'NewJeans', 'Geffen Records', '4th Gen'], ['seventeen', 'SEVENTEEN', 'Pledis Entertainment', '3rd Gen'],
  ['gidle', '(G)I-DLE', 'Cube Entertainment', '4th Gen'], ['nct', 'NCT', 'SM Entertainment', '3rd Gen'], ['riize', 'RIIZE', 'RCA Records', '5th Gen'],
  ['exo', 'EXO', 'SM Entertainment', '3rd Gen'], ['shinee', 'SHINee', 'SM Entertainment', '2nd Gen'], ['txt', 'TXT', 'Republic Records', '4th Gen'],
  ['ive', 'IVE', 'Columbia Records', '4th Gen'], ['ateez', 'ATEEZ', 'RCA Records', '4th Gen'], ['kep1er', 'Kep1er', 'WakeOne', '4th Gen'],
  ['babymonster', 'BABYMONSTER', 'YG Entertainment', '5th Gen'], ['fifty-fifty', 'FIFTY FIFTY', null, '4th Gen'],
];
// The 18 K2 groups (empty, 021d fills them) and the two other groups of the LOONA members.
const K2_GROUPS: [string, string][] = [
  ['loona', 'LOONA'], ['got7', 'GOT7'], ['monsta-x', 'MONSTA X'], ['girls-generation', 'Girls\' Generation'], ['zerobaseone', 'ZEROBASEONE'], ['mamamoo', 'MAMAMOO'],
  ['bigbang', 'BIGBANG'], ['katseye', 'KATSEYE'], ['illit', 'ILLIT'], ['treasure', 'TREASURE'], ['dreamcatcher', 'Dreamcatcher'], ['tws', 'TWS'], ['p1harmony', 'P1Harmony'],
  ['cortis', 'CORTIS'], ['hearts2hearts', 'Hearts2Hearts'], ['team', '&TEAM'], ['akmu', 'AKMU'], ['astro', 'ASTRO'], ['artms', 'ARTMS'], ['loossemble', 'Loossemble'],
];
// [id, name, group slug, birth date, nationality, positions, active]: the K1 rows of the audit, at the values production holds (positions from the roster seed).
const K1_IDOLS: [number, string, string, string, string, string[], boolean][] = [
  [1, 'RM', 'bts', '1994-09-12', 'South Korea', ['Leader', 'Rapper'], true], [7, 'Jungkook', 'bts', '1997-09-01', 'South Korea', ['Main Vocalist', 'Center'], true],
  [11, 'Lisa', 'blackpink', '1997-03-27', 'Thailand', ['Main Dancer', 'Lead Rapper'], true], [29, 'Tzuyu', 'twice', '1999-06-14', 'Taiwan', ['Lead Dancer'], true],
  [30, 'Karina', 'aespa', '2000-04-11', 'South Korea', ['Leader', 'Dancer'], true], [33, 'Ningning', 'aespa', '2002-10-23', 'People\'s Republic of China', ['Vocalist'], true],
  [34, 'Minji', 'newjeans', '2004-05-07', 'South Korea', ['Leader', 'Vocalist'], true], [40, 'Jeonghan', 'seventeen', '1995-10-04', 'South Korea', ['Vocalist'], true],
  [42, 'Jun', 'seventeen', '1996-06-10', 'People\'s Republic of China', ['Performance Unit Main Dancer'], true],
  [43, 'Hoshi', 'seventeen', '1996-06-15', 'South Korea', ['Performance Unit Leader', 'Main Dancer'], true],
  [45, 'Woozi', 'seventeen', '1996-11-22', 'South Korea', ['Vocal Unit Leader', 'Lead Vocalist'], true],
  [58, 'Yuqi', 'gidle', '1999-09-23', 'People\'s Republic of China', ['Vocalist'], true],
  [61, 'Yujin', 'ive', '2003-09-01', 'South Korea', ['Leader'], true], [74, 'Taeil', 'nct', '1994-06-14', 'South Korea', ['Vocalist'], true],
  [80, 'Mark', 'nct', '1999-08-02', 'Canada', ['Rapper'], true], [107, 'Hongjoong', 'ateez', '1998-11-07', 'South Korea', ['Leader'], true],
  [122, 'Soobin', 'txt', '2000-12-05', 'South Korea', ['Leader'], true], [170, 'Lay', 'exo', '1991-10-07', 'People\'s Republic of China', ['Vocalist'], true],
  [176, 'Sehun', 'exo', '1994-04-12', 'South Korea', ['Rapper'], true], [196, 'Taemin', 'shinee', '1993-07-18', 'South Korea', ['Main Vocalist'], true],
  // The 11 rows 021d activates (inactive, waiting for review).
  [82, 'Ten', 'nct', '1996-02-27', 'Thailand', [], false], [89, 'Qian Kun', 'nct', '1996-01-01', 'People\'s Republic of China', [], false],
  [133, 'Kim Chae-hyun', 'kep1er', '2002-08-13', 'South Korea', [], false], [143, 'Pharita', 'babymonster', '2005-08-26', 'Thailand', [], false],
  [144, 'Asa', 'babymonster', '2006-04-17', 'Japan', [], false], [145, 'Rami', 'babymonster', '2007-10-17', 'South Korea', [], false],
  [148, 'Ahyeon', 'babymonster', '2007-04-29', 'South Korea', [], false], [151, 'Anton Lee', 'riize', '2004-03-21', 'South Korea', [], false],
  [152, 'Song Eun-seok', 'riize', '2001-03-19', 'South Korea', [], false], [153, 'Park Won-bin', 'riize', '2002-03-02', 'South Korea', [], false],
  [163, 'Keena', 'fifty-fifty', '2005-03-27', 'South Korea', [], false],
];
// The four rows 021e dates (no birth date until then).
const K1_UNDATED: [number, string, string, string][] = [[39, 'S.Coups', 'seventeen', 'Q21824968'], [46, 'DK', 'seventeen', 'Q21824862'], [48, 'The8', 'seventeen', 'Q21824868'], [175, 'Kai', 'exo', 'Q10775090']];

const today = (): Promise<string> => Promise.resolve(new Date().toISOString().slice(0, 10));

/** A fingerprint of everything L19 may touch, and of what it must not: the same text twice means nothing moved. */
async function fingerprint(db: PGlite): Promise<Record<string, string>> {
  const q = async (sql: string): Promise<string> => (await one<string>(db, `select coalesce(md5(string_agg(t, '|' order by t)), '') from (${sql}) x(t)`)) ?? '';
  return {
    idols: await q(`select row(id, group_id, name, birth_date, nationality, positions, wikidata_qid, active, needs_review, gender, debut_year)::text from public.idols`),
    groups: await q(`select row(id, name, slug, record_label, generation, inception_date)::text from public.groups`),
    sources: await q(`select row(entity_type, entity_id, field, source, source_ref, source_url, fetched_at)::text from public.entity_sources`),
    curation: await q(`select row(game_id, entity_id, excluded, weight, note)::text from public.dle_curation`),
    links: await q(`select row(idol_id, group_id)::text from public.idol_other_groups`),
    agencies: await q(`select row(slug, name, parent_id, sources, created_at)::text from public.agencies `),
    entities: await q(`select row(entity_id, name, attrs, can_be_target, in_pool)::text from public.dle_entities where game_id = 'kpopdle-idol'`),
    schedule: await q(`select row(bank_day, entity_id)::text from public.dle_schedule where game_id = 'kpopdle-idol'`),
  };
}

const grp = (db: PGlite, name: string) => one<string>(db, `select record_label from public.groups where name = $1 and site_id = 'kpop'`, [name]);
const pos = (db: PGlite, id: number) => one<string[]>(db, `select positions from public.idols where id = $1`, [id]);
const attr = (db: PGlite, id: number, key: string) => one<Record<string, unknown>>(db, `select attrs -> $2 from public.dle_src_kpop_idol where entity_id = $1`, [String(id), key]);
const verdict = async (db: PGlite, key: string, kind: string, guess: number, target: number): Promise<string> =>
  (await one<{ status: string }>(db, `select public.dle_compare('${kind}', null, g.attrs -> '${key}', t.attrs -> '${key}') from public.dle_src_kpop_idol g, public.dle_src_kpop_idol t where g.entity_id = '${guess}' and t.entity_id = '${target}'`)).status;

describe('L19 and L20: Kpopdle Idol data and view (audit 05)', () => {
  let db: PGlite;
  let before: Record<string, string>;
  let kidsBefore: { id: string; attrs: string }[];
  let viewBefore: string;
  let targetsBefore: number;

  beforeAll(async () => {
    db = await afterSessionG();
    // Production has this key (021d inserts on conflict (group_id, name)).
    await db.exec(`alter table public.idols add constraint idols_group_id_name_key unique (group_id, name)`);
    for (const [slug, name, label, gen] of K1_GROUPS) {
      await db.query(`insert into public.groups (name, slug, record_label, generation, fandom_name, inception_date) values ($1, $2, $3, $4, 'fan', null)`, [name, slug, label, gen]);
    }
    for (const [slug, name] of K2_GROUPS) await db.query(`insert into public.groups (name, slug) values ($1, $2)`, [name, slug]);
    for (const [id, name, slug, birth, nat, positions, active] of K1_IDOLS) {
      const qid = ACTIVATION.includes(id) ? QID_021D.get(id) : QID_021A.get(id);
      await db.query(
        `insert into public.idols (id, group_id, name, birth_date, nationality, positions, wikidata_qid, active, needs_review, ord)
         values ($1, (select id from public.groups where slug = $2), $3, $4, $5, $6, $7, $8, $9, $1)`,
        [id, slug, name, birth, nat, positions, qid ?? null, active, !active],
      );
    }
    for (const [id, name, slug, qid] of K1_UNDATED) {
      await db.query(`insert into public.idols (id, group_id, name, wikidata_qid, active, ord) values ($1, (select id from public.groups where slug = $2), $3, $4, true, $1)`, [id, slug, name, qid]);
    }
    await db.exec(`select setval(pg_get_serial_sequence('public.idols', 'id'), (select max(id) from public.idols))`);
    for (const f of ['021a-k1-idol-gender-debut.sql', '021c-k1-idol-corrections.sql', '021b-k1-idol-activate.sql', '022-photos-admin.sql', '021d-k2-idols.sql', '021e-k2-birth-dates.sql']) {
      await db.exec(readMigration(f));
    }
    // The state of the night before the file: a snapshot, an active game, a bank.
    await db.exec(`select public.dle_activate('kpopdle-idol', '${await today()}', 0.5)`);
    targetsBefore = await one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and can_be_target`);
  });

  it('the seeded production state: the audited wrong values, Taeil and Mark are targets, the game runs', async () => {
    expect(await grp(db, 'BTS')).toBe('Columbia Records');
    expect(await grp(db, 'aespa')).toBe('Capitol Records');
    expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and entity_id in ('74', '80') and can_be_target`)).toBe(2);
    expect(await one(db, `select active from public.dle_games where id = 'kpopdle-idol'`)).toBe(true);
    expect(targetsBefore).toBeGreaterThan(90);
    expect(await attr(db, 43, 'role')).toEqual({ v: 'leader' });
    expect(await attr(db, 45, 'role')).toEqual({ v: 'leader' });
    expect(await attr(db, 1, 'agency')).toEqual({ v: ['Columbia Records'] });
    expect(await one(db, `select positions from public.idols where wikidata_qid = 'Q233371'`)).toEqual([]);
    expect(await one(db, `select debut_year from public.idols where wikidata_qid = 'Q491048'`)).toBe(2014);
    expect(await one(db, `select inception_date::text from public.groups where slug = 'astro'`)).toBe('2016-01-01');
    // The audit's "Close can never fire", before L20: two labels of one group are Wrong.
    expect(await verdict(db, 'agency', 'single', 1, 122)).toBe('wrong');
  });

  it('step 0: Taeil or Mark as the answer of a day in the next 8 days aborts the file with nothing changed', async () => {
    const snap = await fingerprint(db);
    const day = await one<number>(db, `select public.dle_bank_day(epoch, public.dle_utc_date(now()) + 3) from public.dle_games where id = 'kpopdle-idol'`);
    for (const id of ['74', '80']) {
      await db.exec('begin');
      await db.query(`update public.dle_schedule set entity_id = $1 where game_id = 'kpopdle-idol' and bank_day = $2`, [id, day]);
      const msg = await failure(db, L19);
      await db.exec('rollback');
      expect(msg, id).toMatch(/L19: Taeil \(74\) or Mark \(80\) is the answer of a served or kept day in the next 8 days: \d{4}-\d{2}-\d{2} \(id \d+\)/);
      expect(msg).toContain(`(id ${id})`);
    }
    // A day already served keeps its row in dle_daily_stats: the guard reads that one first.
    await db.exec('begin');
    await db.query(`insert into public.dle_daily_stats (game_id, play_date, game_no, entity_id) values ('kpopdle-idol', public.dle_utc_date(now()), 1, '80') on conflict (game_id, play_date) do update set entity_id = '80'`);
    const served = await failure(db, L19);
    await db.exec('rollback');
    expect(served).toMatch(/Mark \(80\)/);
    expect(await fingerprint(db)).toEqual(snap);
  });

  it('a row someone already fixed, or renamed, is left alone and the rest is fixed', async () => {
    await db.exec('begin');
    await db.exec(`update public.groups set record_label = 'Somebody Else' where name = 'BTS'; update public.idols set name = 'Tzuyu Chou' where id = 29;`);
    const msg = await failure(db, L19);
    const out = { bts: await grp(db, 'BTS'), txt: await grp(db, 'TXT'), tzuyu: await pos(db, 29), lay: await one(db, `select nationality from public.idols where id = 170`) };
    await db.exec('rollback');
    expect(msg).toBeNull();
    expect(out).toEqual({ bts: 'Somebody Else', txt: 'BigHit Music', tzuyu: ['Lead Dancer'], lay: 'China' });
  });

  describe('L19', () => {
    let afterRun: Record<string, string>;

    beforeAll(async () => {
      // Taeil and Mark are not in the next 8 days today (as the owner's read of production says); make it so in the seed if the draw put them there.
      await db.exec(`update public.dle_schedule s set entity_id = (select e.entity_id from public.dle_entities e where e.game_id = s.game_id and e.can_be_target and e.entity_id not in ('74', '80') order by e.entity_id limit 1)
        where s.game_id = 'kpopdle-idol' and s.entity_id in ('74', '80') and s.bank_day in (select public.dle_bank_day(g.epoch, public.dle_utc_date(now()) + k) from public.dle_games g, generate_series(0, 7) k where g.id = 'kpopdle-idol')`);
      before = await fingerprint(db);
      kidsBefore = await rows(db, `select entity_id as id, attrs::text from public.dle_entities where game_id = 'kpopdle-idol'`);
      await db.exec(L19);
      afterRun = await fingerprint(db);
    });

    it('the seven agencies hold the corrected label and public.agencies has the same strings', async () => {
      const want: [string, string][] = [['BTS', 'BigHit Music'], ['TXT', 'BigHit Music'], ['IVE', 'Starship Entertainment'], ['ATEEZ', 'KQ Entertainment'], ['RIIZE', 'SM Entertainment'], ['NewJeans', 'ADOR'], ['aespa', 'SM Entertainment']];
      for (const [g, label] of want) {
        expect(await grp(db, g), g).toBe(label);
        expect(await one(db, `select count(*)::int from public.agencies where name = $1 and slug = left(btrim(regexp_replace(lower($1), '[^a-z0-9]+', '-', 'g'), '-'), 60)`, [label]), label).toBe(1);
      }
      // The ones the audit read as right, and the K2 labels, are not touched.
      expect(await grp(db, 'SEVENTEEN')).toBe('Pledis Entertainment');
      expect(await grp(db, 'BLACKPINK')).toBe('YG Entertainment');
      expect(await grp(db, 'CORTIS')).toBe('BigHit Music');
      expect(await grp(db, 'MONSTA X')).toBe('Starship Entertainment');
    });

    it('positions: Maknae and Leader added, Minji\'s Leader taken off, Hoshi and Woozi untouched by the data', async () => {
      for (const id of [7, 11, 29, 33, 151, 176, 196]) expect(await pos(db, id), String(id)).toContain('Maknae');
      for (const q of ['Q97352009', 'Q30006465', 'Q117818064']) expect(await one<string[]>(db, `select positions from public.idols where wikidata_qid = $1`, [q]), q).toContain('Maknae');
      for (const q of ['Q233371', 'Q97319986']) expect(await one<string[]>(db, `select positions from public.idols where wikidata_qid = $1`, [q]), q).toContain('Leader');
      expect(await pos(db, 34)).toEqual(['Vocalist']);
      expect(await pos(db, 7)).toEqual(['Main Vocalist', 'Center', 'Maknae']);
      expect(await pos(db, 43)).toEqual(['Performance Unit Leader', 'Main Dancer']);
      // The contested TREASURE leaders are not removed (Part B6).
      expect(await one(db, `select positions from public.idols where wikidata_qid = 'Q98136886'`)).toEqual(['Leader']);
      expect(await one(db, `select positions from public.idols where wikidata_qid = 'Q97352003'`)).toEqual(['Leader']);
    });

    it('Go Won is in LOONA and Loossemble; the seven debut years; the five nationalities; ASTRO', async () => {
      expect(await rows(db, `select g.slug from public.idol_other_groups og join public.idols i on i.id = og.idol_id join public.groups g on g.id = og.group_id where i.wikidata_qid = 'Q58825794'`)).toEqual([{ slug: 'loossemble' }]);
      const years = await rows<{ q: string; y: number }>(db, `select wikidata_qid as q, debut_year as y from public.idols where wikidata_qid in ('Q491048', 'Q492313', 'Q59313184', 'Q59313270', 'Q59313326', 'Q59313479', 'Q59313527') order by 1`);
      expect(years.map((r) => [r.q, r.y])).toEqual([['Q491048', 2012], ['Q492313', 2012], ['Q59313184', 2014], ['Q59313270', 2014], ['Q59313326', 2014], ['Q59313479', 2014], ['Q59313527', 2014]]);
      expect((await rows<{ nationality: string }>(db, `select nationality from public.idols where id in (33, 42, 58, 89, 170) order by id`)).map((r) => r.nationality)).toEqual(['China', 'China', 'China', 'China', 'China']);
      expect(await one(db, `select count(*)::int from public.idols where nationality like '%People''s Republic%'`)).toBe(0);
      expect(await one(db, `select inception_date::text from public.groups where slug = 'astro'`)).toBe('2016-02-23');
    });

    it('Taeil and Mark are excluded and no longer targets; every other target stays; no one under 18 is active', async () => {
      expect(await rows(db, `select entity_id, can_be_target, in_pool from public.dle_entities where game_id = 'kpopdle-idol' and entity_id in ('74', '80') order by 1`)).toEqual([
        { entity_id: '74', can_be_target: false, in_pool: false }, { entity_id: '80', can_be_target: false, in_pool: false },
      ]);
      expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and can_be_target`)).toBe(targetsBefore - 2);
      expect(await one(db, `select count(*)::int from public.idols where active and birth_date > (current_date - interval '18 years')::date`)).toBe(0);
      // They stay active in public.idols (Part B1 is the owner's).
      expect(await one(db, `select count(*)::int from public.idols where id in (74, 80) and active`)).toBe(2);
      expect(await one(db, `select count(*)::int from public.dle_curation where game_id = 'kpopdle-idol'`)).toBe(2);
    });

    it('the snapshot was refreshed: the new label and the Maknae role are what the players read; nothing but the audited rows moved', async () => {
      expect(await one(db, `select attrs -> 'agency' ->> 'v' from public.dle_entities where game_id = 'kpopdle-idol' and entity_id = '1'`)).toBe('["BigHit Music"]');
      expect(await one(db, `select attrs -> 'role' ->> 'v' from public.dle_entities where game_id = 'kpopdle-idol' and entity_id = '7'`)).toBe('maknae');
      const now = await rows<{ id: string; attrs: string }>(db, `select entity_id as id, attrs::text from public.dle_entities where game_id = 'kpopdle-idol'`);
      const changed = now.filter((r) => kidsBefore.find((b) => b.id === r.id)?.attrs !== r.attrs).map((r) => r.id);
      // Everything on a corrected group (agency), a tagged idol, a debut year, a nationality: the rows of the audit, not one more.
      const groupIds = await rows<{ id: string }>(db, `select i.id::text from public.idols i join public.groups g on g.id = i.group_id where g.name in ('BTS', 'TXT', 'IVE', 'ATEEZ', 'RIIZE', 'NewJeans', 'aespa')`);
      const named = await rows<{ id: string }>(db, `select id::text from public.idols where id in (7, 11, 29, 33, 34, 42, 58, 89, 151, 170, 176, 196) or wikidata_qid in ('Q97352009', 'Q30006465', 'Q117818064', 'Q233371', 'Q97319986', 'Q491048', 'Q492313', 'Q59313184', 'Q59313270', 'Q59313326', 'Q59313479', 'Q59313527', 'Q58825794')`);
      const allowed = new Set([...groupIds, ...named, { id: '74' }, { id: '80' }].map((r) => r.id));
      expect(changed.filter((id) => !allowed.has(id))).toEqual([]);
      expect(changed.length).toBeGreaterThan(30);
    });

    it('one entity_sources row per corrected value, source wikipedia, a Wikipedia URL, a revision, no dash', async () => {
      const r = await rows<{ entity_type: string; field: string; n: number; bad: number }>(db, `
        select entity_type, field, count(*)::int as n,
          count(*) filter (where source_url !~ '^https://en\\.wikipedia\\.org/wiki/[^ ]+$' or source_ref !~ '^rev [0-9]+' or source_ref ~ '[\u2013\u2014]' or source_url ~ '[\u2013\u2014]')::int as bad
        from public.entity_sources where source = 'wikipedia' and fetched_at = timestamptz '2026-11-09 00:00:00+00' group by 1, 2 order by 1, 2`);
      expect(r).toEqual([
        { entity_type: 'group', field: 'inception_date', n: 1, bad: 0 }, { entity_type: 'group', field: 'record_label', n: 7, bad: 0 },
        { entity_type: 'idol', field: 'debut_year', n: 7, bad: 0 }, { entity_type: 'idol', field: 'group', n: 1, bad: 0 }, { entity_type: 'idol', field: 'positions', n: 13, bad: 0 },
      ]);
      // One source row per stored year: the old wikidata / musicbrainz rows are gone.
      expect(await rows(db, `select source from public.entity_sources e join public.idols i on i.id::text = e.entity_id where e.entity_type = 'idol' and e.field = 'debut_year' and i.wikidata_qid in ('Q491048', 'Q59313184') order by 1`)).toEqual([{ source: 'wikipedia' }, { source: 'wikipedia' }]);
    });

    it('a second run changes nothing', async () => {
      await db.exec(L19);
      expect(await fingerprint(db)).toEqual(afterRun);
    });

    it('the rollback puts the exact previous values back, and a second rollback changes nothing', async () => {
      await db.exec(L19_RB);
      const back = await fingerprint(db);
      expect(back).toEqual(before);
      await db.exec(L19_RB);
      expect(await fingerprint(db)).toEqual(before);
      expect(await grp(db, 'BTS')).toBe('Columbia Records');
      expect(await pos(db, 34)).toEqual(['Leader', 'Vocalist']);
      expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and entity_id in ('74', '80') and can_be_target`)).toBe(2);
      await db.exec(L19);
      expect(await fingerprint(db)).toEqual(afterRun);
    });
  });

  it('the read-only check V-kpopdle-members: ok after L19, KO on Taeil, Mark and the foreign labels without it; it lists the pool by group', async () => {
    const run = async (): Promise<{ ok: string; what: string; got: string }[]> => {
      const res = await db.exec(V_MEMBERS);
      return (res.find((r) => r.fields.some((f) => f.name === 'ok')) as unknown as { rows: { ok: string; what: string; got: string }[] }).rows;
    };
    const after = await run();
    expect(after.slice(0, 4).map((r) => r.ok)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(after).toHaveLength(10);
    expect(V_MEMBERS).not.toMatch(/[\u2013\u2014]/);
    const lines = (await db.exec(V_MEMBERS)).flatMap((r) => r.rows as Record<string, string>[]).map((r) => Object.values(r)[0] as string).filter((l) => l.startsWith('{"group"'));
    expect(lines.length).toBeGreaterThan(15);
    expect(JSON.parse(lines.find((l) => l.includes('"BTS"'))!).idols.length).toBeGreaterThan(1);
    await db.exec(L19_RB);
    expect((await run()).slice(0, 4).map((r) => r.ok)).toEqual(['KO', 'ok', 'KO', 'KO']);
    await db.exec(L19);
  });

  it('the copy: the agency help is the one on main (true once L20 is applied); the role cell has no Close row (R13)', () => {
    for (const l of ['en', 'fr'] as const) expect(IDOL_COLUMNS[l].role!.near).toBeUndefined();
    expect(IDOL_COLUMNS.en.agency).toEqual({ label: 'Agency', help: 'Close if same parent company', near: 'same parent company', source: 'Wikidata, official site' });
    expect(IDOL_COLUMNS.fr.agency!.help).toBe('Proche si même maison mère');
    expect(IDOL_COLUMNS.fr.agency!.near).toBe('même maison mère');
  });

  it('exact rollback of agencies and links: rows that existed before stay, a link that was there before stays, rows L19 created go', async () => {
    const q = async (sql: string) => rows(db, sql);
    const agencies = `select slug, name, parent_id, sources, created_at::text from public.agencies order by slug`;
    const links = `select idol_id, group_id from public.idol_other_groups order by 1, 2`;
    await db.exec(L19_RB);
    const a0 = await q(agencies);
    const l0 = await q(links);
    expect(a0.some((r) => r.name === 'ADOR')).toBe(false);
    // Case 1: nothing existed. L19 creates ADOR, KQ, Starship, BigHit and the link; the rollback removes exactly those.
    await db.exec(L19);
    expect((await q(agencies)).length).toBeGreaterThan(a0.length);
    await db.exec(L19_RB);
    expect(await q(agencies)).toEqual(a0);
    expect(await q(links)).toEqual(l0);
    // Case 2: ADOR and the Go Won link existed before (other created_at, no L19 source row): both stay.
    await db.exec('begin');
    await db.exec(`insert into public.agencies (slug, name) values ('ador', 'ADOR');
      insert into public.idol_other_groups (idol_id, group_id) select i.id, g.id from public.idols i, public.groups g where i.wikidata_qid = 'Q58825794' and g.slug = 'loossemble'`);
    const a1 = await q(agencies);
    const l1 = await q(links);
    await db.exec(L19);
    await db.exec(L19_RB);
    expect(await q(agencies)).toEqual(a1);
    expect(await q(links)).toEqual(l1);
    await db.exec('rollback');
    await db.exec(L19);
  });

  describe('L20', () => {
    beforeAll(async () => {
      viewBefore = await one<string>(db, `select pg_get_viewdef('public.dle_src_kpop_idol'::regclass)`);
      before = await fingerprint(db);
      await db.exec(L20);
    });

    it('Hoshi and Woozi are no longer Leader; the real leaders and maknaes still are (whole elements)', async () => {
      expect(await attr(db, 43, 'role')).toEqual({ v: 'none' });
      expect(await attr(db, 45, 'role')).toEqual({ v: 'none' });
      expect(await attr(db, 1, 'role')).toEqual({ v: 'leader' });
      expect(await attr(db, 61, 'role')).toEqual({ v: 'leader' });
      expect(await attr(db, 7, 'role')).toEqual({ v: 'maknae' });
      expect(await attr(db, 34, 'role')).toEqual({ v: 'none' });
      expect(await one(db, `select positions from public.idols where id = 43`)).toEqual(['Performance Unit Leader', 'Main Dancer']);
    });

    it('agency: the mother company is p; Close fires for two HYBE labels and not for HYBE against SM', async () => {
      expect(await attr(db, 1, 'agency')).toEqual({ v: ['BigHit Music'], p: ['HYBE'] });
      expect(await attr(db, 40, 'agency')).toEqual({ v: ['Pledis Entertainment'], p: ['HYBE'] });
      expect(await attr(db, 30, 'agency')).toEqual({ v: ['SM Entertainment'], p: ['SM Entertainment'] });
      expect(await verdict(db, 'agency', 'single', 1, 40)).toBe('near');       // BigHit Music vs Pledis Entertainment
      expect(await verdict(db, 'agency', 'single', 40, 1)).toBe('near');
      expect(await verdict(db, 'agency', 'single', 1, 122)).toBe('correct');   // BigHit Music vs BigHit Music (BTS vs TXT)
      expect(await verdict(db, 'agency', 'single', 1, 30)).toBe('wrong');      // HYBE vs SM Entertainment
      expect(await verdict(db, 'agency', 'single', 30, 40)).toBe('wrong');
      expect(await verdict(db, 'agency', 'single', 30, 30)).toBe('correct');
      // Two labels of one group that is not mapped stay Wrong (YG Entertainment against Pledis).
      expect(await verdict(db, 'agency', 'single', 11, 40)).toBe('wrong');
      expect(await rows(db, `select a.name, p.name as parent from public.agencies a join public.agencies p on p.id = a.parent_id order by 1`)).toEqual([
        { name: 'BigHit Music', parent: 'HYBE' }, { name: 'Pledis Entertainment', parent: 'HYBE' },
      ].concat(
        (await rows<{ name: string }>(db, `select name from public.agencies where name in ('ADOR', 'Belift Lab', 'Source Music', 'YX LABELS') order by name`)).map((r) => ({ name: r.name, parent: 'HYBE' })),
      ).sort((a, b) => a.name.localeCompare(b.name)));
    });

    it('the pool is the same: same targets, same columns known, only agency p and unit-leader roles moved; the view stays closed to the browser roles', async () => {
      expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and can_be_target`)).toBe(targetsBefore - 2);
      const now = await fingerprint(db);
      expect(now.idols).toBe(before.idols);
      expect(now.groups).toBe(before.groups);
      expect(now.schedule).toBe(before.schedule);
      for (const role of ['anon', 'authenticated']) expect(await one(db, `select has_table_privilege('${role}', 'public.dle_src_kpop_idol', 'select')`)).toBe(false);
      expect(await one(db, `select has_table_privilege('service_role', 'public.dle_src_kpop_idol', 'select')`)).toBe(true);
      expect(await one(db, `select (pg_get_viewdef('public.dle_src_kpop_idol'::regclass) ~ '(height_cm|mbti|blood_type)')`)).toBe(false);
    });

    it('a second run changes nothing, and the rollback gives 020\'s view back byte for byte', async () => {
      const once = { ...(await fingerprint(db)) };
      await db.exec(L20);
      expect(await fingerprint(db)).toEqual(once);
      await db.exec(L20_RB);
      expect(await one(db, `select pg_get_viewdef('public.dle_src_kpop_idol'::regclass)`)).toBe(viewBefore);
      expect(await fingerprint(db)).toEqual(before);
      expect(await one(db, `select count(*)::int from public.agencies where parent_id is not null`)).toBe(0);
      expect(await one(db, `select count(*)::int from public.agencies where name = 'HYBE'`)).toBe(0);
      expect(await attr(db, 43, 'role')).toEqual({ v: 'leader' });
      await db.exec(L20_RB);
      expect(await fingerprint(db)).toEqual(before);
    });
  });
});
