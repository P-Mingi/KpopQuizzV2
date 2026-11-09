// Lane kpopdle (owner 2026-11-09): audit 05, L19 (data fixes) and L20 (view: whole-element roles, agency mother company) on PGlite.
// The real files 011, 018, 019, 020, 021a, 021c, 021b, 022, 021d, 021e, then L19 / L20 and their rollbacks. The K1 rows (ids and names of the audit) are seeded with the
// QIDs 021a / 021d list for them; the K2 rows come from 021d itself.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { IDOL_COLUMNS } from './copy';
import { PROD_TARGETS, kpopdleWorld, productionCalendar } from './kpopdle-fixture';
import { MIGRATIONS, failure, one, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L19 = readLaunch('L19-l1-kpopdle-data-fixes.sql');
const L19_RB = readLaunch('L19-l1-kpopdle-data-fixes.rollback.sql');
const L20 = readLaunch('L20-l1-kpopdle-view.sql');
const L20_RB = readLaunch('L20-l1-kpopdle-view.rollback.sql');
const V_MEMBERS = readFileSync(path.resolve(MIGRATIONS, '../../launch/o1/checks/V-kpopdle-members.sql'), 'utf8');

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
    db = await kpopdleWorld();
    targetsBefore = await one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and can_be_target`);
  });

  it('the seeded production state: the audited wrong values, Taeil and Mark are targets, the game runs', async () => {
    expect(await grp(db, 'BTS')).toBe('Columbia Records');
    expect(await grp(db, 'aespa')).toBe('Capitol Records');
    expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and entity_id in ('74', '80') and can_be_target`)).toBe(2);
    expect(await one(db, `select active from public.dle_games where id = 'kpopdle-idol'`)).toBe(true);
    expect(targetsBefore).toBe(PROD_TARGETS);
    expect(await attr(db, 43, 'role')).toEqual({ v: 'leader' });
    expect(await attr(db, 45, 'role')).toEqual({ v: 'leader' });
    expect(await attr(db, 1, 'agency')).toEqual({ v: ['Columbia Records'] });
    expect(await one(db, `select positions from public.idols where wikidata_qid = 'Q233371'`)).toEqual([]);
    expect(await one(db, `select debut_year from public.idols where wikidata_qid = 'Q491048'`)).toBe(2014);
    expect(await one(db, `select inception_date::text from public.groups where slug = 'astro'`)).toBe('2016-01-01');
    // The audit's "Close can never fire", before L20: two labels of one group are Wrong.
    expect(await verdict(db, 'agency', 'single', 1, 122)).toBe('wrong');
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
      await productionCalendar(db);
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
