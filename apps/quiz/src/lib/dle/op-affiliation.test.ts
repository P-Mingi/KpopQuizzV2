// Lane opaff (owner 2026-11-08): One Piece Otakudle, one main affiliation per character. The real files 019, 024, L04, L15, then L17 and its rollback on PGlite.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { afterJ4, afterSessionG, applyLaunchFiles } from './otakudle-fixture';
import { MIGRATIONS, one, readMigration, rows } from './pglite-harness';
import { seriesValueLabel } from './value-i18n';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const DATA = JSON.parse(readFileSync(path.resolve(MIGRATIONS, '../../anime/data/dle/one-piece-affiliation.json'), 'utf8')) as {
  slug: string; name: string; affiliation: string | null; family: string | null; source: string | null; note: string;
}[];

const snapshot = (db: PGlite): Promise<{ slug: string; attrs: string; t: boolean }[]> =>
  rows(db, `select c.slug, f.attrs::text as attrs, f.can_be_target as t from public.character_game_facts f join public.characters c on c.id = f.character_id
            where f.game_id = 'otakudle-one-piece' order by c.slug`);

async function cell(db: PGlite, guess: string, target: string): Promise<string> {
  return one<string>(db, `select (x ->> 'status') from jsonb_array_elements(public.dle_compare_all('otakudle-one-piece',
    (select attrs from public.dle_src_otakudle_one_piece where name = $1), (select attrs from public.dle_src_otakudle_one_piece where name = $2))) x where x ->> 'key' = 'affiliation'`, [guess, target]);
}

describe('L17: one main affiliation per One Piece character', () => {
  let db: PGlite;
  let before: { slug: string; attrs: string; t: boolean }[];
  let srcBefore: number;

  beforeAll(async () => {
    db = await afterSessionG();
    await db.exec(readMigration('024-dle-series-games.sql'));
    await afterJ4(db);
    await db.exec(readMigration('024-dle-series-games.sql'));
    await applyLaunchFiles(db);
    await db.exec(readLaunch('L15-A2-series-games.sql'));
    before = await snapshot(db);
    srcBefore = await one<number>(db, `select count(*)::int from public.entity_sources where field = 'one-piece.affiliation'`);
    // A game that already has a snapshot (the branch of L17 that refreshes it).
    await db.exec(`select public.dle_refresh_entities('otakudle-one-piece')`);
    await db.exec(readLaunch('L17-l1-op-affiliation.sql'));
  });

  it('the data: 100 characters, a source for each value, 4 families, none unsourced', () => {
    expect(DATA).toHaveLength(100);
    expect(DATA.filter((d) => d.affiliation && !d.source?.startsWith('https://onepiece.fandom.com/wiki/'))).toEqual([]);
    expect(DATA.filter((d) => !d.affiliation).map((d) => d.slug)).toEqual([]);
    expect([...new Set(DATA.map((d) => d.family).filter(Boolean))].sort()).toEqual(['marines', 'pirates', 'revolutionary-army', 'world-government']);
    expect(JSON.stringify(DATA)).not.toMatch(/[–—]/);
  });

  it('the column is single and every value is {v, p} from the data', async () => {
    expect(await one(db, `select kind from public.dle_attributes where game_id = 'otakudle-one-piece' and key = 'affiliation'`)).toBe('single');
    const now = await snapshot(db);
    for (const d of DATA.filter((x) => x.affiliation)) {
      const a = JSON.parse(now.find((r) => r.slug === d.slug)!.attrs).affiliation;
      expect(a).toEqual(d.family ? { v: d.affiliation, p: [d.family] } : { v: d.affiliation });
    }
    // The snapshot the players read was refreshed.
    expect(await one(db, `select attrs -> 'affiliation' ->> 'v' from public.dle_entities where game_id = 'otakudle-one-piece' and name = 'Monkey D. Luffy'`)).toBe('Straw Hat Pirates');
  });

  it('nothing else moved: same other columns, same targets (73), same Dragon Ball', async () => {
    const now = await snapshot(db);
    for (const r of now) {
      const o = before.find((b) => b.slug === r.slug)!;
      const strip = (s: string): unknown => { const j = JSON.parse(s); delete j.affiliation; return j; };
      expect(strip(r.attrs)).toEqual(strip(o.attrs));
      expect(r.t).toBe(o.t);
    }
    expect(now.filter((r) => r.t)).toHaveLength(73);
    expect(await one<number>(db, `select count(*)::int from public.character_game_facts where game_id = 'otakudle-dragon-ball'`)).toBe(70);
    expect(await one(db, `select kind from public.dle_attributes where game_id = 'otakudle-dragon-ball' and key = 'affiliation'`)).toBe('multi');
  });

  it('Right, Close and Wrong on real pairs', async () => {
    expect(await cell(db, 'Monkey D. Luffy', 'Roronoa Zoro')).toBe('correct');
    expect(await cell(db, 'Monkey D. Luffy', 'Shanks')).toBe('near');
    expect(await cell(db, 'Monkey D. Luffy', 'Monkey D. Garp')).toBe('wrong');
    expect(await cell(db, 'Monkey D. Garp', 'Sakazuki')).toBe('correct');
    expect(await cell(db, 'Monkey D. Garp', 'Sabo')).toBe('wrong');
    expect(await cell(db, 'Sabo', 'Monkey D. Dragon')).toBe('wrong');
    expect(await cell(db, 'Monkey D. Dragon', 'Monkey D. Dragon')).toBe('correct');
    expect(await cell(db, 'Monkey D. Dragon', 'Sakazuki')).toBe('wrong');
    expect(await cell(db, 'Nerona Imu', 'Magellan')).toBe('near');
    expect(await cell(db, 'Nerona Imu', 'Sakazuki')).toBe('wrong');
    expect(await cell(db, 'Carrot', 'Nefertari Vivi')).toBe('wrong');
    expect(await cell(db, 'Carrot', 'Carrot')).toBe('correct');
    expect(await cell(db, 'Carrot', 'Monkey D. Luffy')).toBe('wrong');
    expect(await cell(db, 'Monkey D. Luffy', 'Vegapunk')).toBe('wrong');
    expect(await cell(db, 'Vegapunk', 'Caesar Clown')).toBe('wrong');
    expect(await cell(db, 'Vegapunk', 'Vegapunk')).toBe('correct');
  });

  it('the debut-arc rule (owner 2026-11-08): the affiliation of the arc the game lists, for the named cases', async () => {
    const want: Record<string, [string, string | null]> = {
      buggy: ['Buggy Pirates', 'pirates'], crocodile: ['Baroque Works', null], galdino: ['Baroque Works', null], alvida: ['Alvida Pirates', 'pirates'],
      'daz-bonez': ['Baroque Works', null], 'dracule-mihawk': ['Seven Warlords of the Sea', 'pirates'], kuzan: ['Marines', 'marines'],
      'x-drake': ['Drake Pirates', 'pirates'], 'caesar-clown': ['Donquixote Pirates', 'pirates'],
    };
    for (const [slug, [aff, fam]] of Object.entries(want)) {
      const d = DATA.find((x) => x.slug === slug)!;
      expect([slug, d.affiliation, d.family]).toEqual([slug, aff, fam]);
    }
    expect(DATA.filter((d) => d.affiliation === 'Cross Guild')).toEqual([]);
    // Right, Close, Wrong between them.
    expect(await cell(db, 'Crocodile', 'Galdino')).toBe('correct');
    expect(await cell(db, 'Crocodile', 'Daz Bonez')).toBe('correct');
    expect(await cell(db, 'Crocodile', 'Buggy')).toBe('wrong');
    expect(await cell(db, 'Buggy', 'Alvida')).toBe('near');
    expect(await cell(db, 'Buggy', 'Dracule Mihawk')).toBe('near');
    expect(await cell(db, 'X Drake', 'Buggy')).toBe('near');
    expect(await cell(db, 'Caesar Clown', 'Donquixote Doflamingo')).toBe('correct');
    expect(await cell(db, 'Kuzan', 'Monkey D. Garp')).toBe('correct');
    expect(await cell(db, 'Kuzan', 'Buggy')).toBe('wrong');
  });

  it('rule A (owner 2026-11-09): the group at the end of the debut arc; the nine characters it changes from PR #215', async () => {
    const f = JSON.parse(readFileSync(path.resolve(MIGRATIONS, '../../anime/data/dle/one-piece-affiliation-rule-diffs.json'), 'utf8')) as {
      diffs: { slug: string; in_215: string | null; rule_a: string; family: string | null }[];
    };
    expect(f.diffs.map((d) => d.slug).sort()).toEqual(['bartholomew-kuma', 'franky', 'jinbe', 'kaku', 'nefertari-vivi', 'nico-robin', 'rob-lucci', 'sabo', 'vegapunk']);
    for (const d of f.diffs) {
      const x = DATA.find((y) => y.slug === d.slug)!;
      expect([d.slug, d.rule_a, d.family]).toEqual([d.slug, x.affiliation, x.family]);
      expect(d.rule_a, d.slug).not.toBe(d.in_215);
    }
    // Crew members who join inside their debut arc stay Straw Hats; Ace is a Whitebeard when he is met.
    for (const s of ['roronoa-zoro', 'usopp', 'sanji', 'tony-tony-chopper', 'brook', 'nami']) expect(DATA.find((x) => x.slug === s)!.affiliation, s).toBe('Straw Hat Pirates');
    expect(DATA.find((x) => x.slug === 'portgas-d-ace')!.affiliation).toBe('Whitebeard Pirates');
    const want: Record<string, [string, string | null]> = {
      'nico-robin': ['Baroque Works', null], franky: ['Franky Family', null], jinbe: ['Seven Warlords of the Sea', 'pirates'], 'bartholomew-kuma': ['Seven Warlords of the Sea', 'pirates'],
      'nefertari-vivi': ['Baroque Works', null], sabo: ['Dadan Family', null], 'rob-lucci': ['CP9', 'world-government'], kaku: ['CP9', 'world-government'], vegapunk: ['MADS', null],
    };
    for (const [slug, [aff, fam]] of Object.entries(want)) {
      const d = DATA.find((x) => x.slug === slug)!;
      expect([slug, d.affiliation, d.family]).toEqual([slug, aff, fam]);
    }
    // Right, Close, Wrong between them.
    expect(await cell(db, 'Nico Robin', 'Crocodile')).toBe('correct');
    expect(await cell(db, 'Nico Robin', 'Nefertari Vivi')).toBe('correct');
    expect(await cell(db, 'Nico Robin', 'Franky')).toBe('wrong');
    expect(await cell(db, 'Jinbe', 'Bartholomew Kuma')).toBe('correct');
    expect(await cell(db, 'Jinbe', 'Monkey D. Luffy')).toBe('near');
    expect(await cell(db, 'Jinbe', 'Sakazuki')).toBe('wrong');
    expect(await cell(db, 'Rob Lucci', 'Kaku')).toBe('correct');
    expect(await cell(db, 'Rob Lucci', 'Nerona Imu')).toBe('near');
    expect(await cell(db, 'Rob Lucci', 'Smoker')).toBe('wrong');
    expect(seriesValueLabel('affiliation', 'Dadan Family', 'fr')).toBe('Famille Dadan');
  });

  it('a second run changes nothing; the French words exist for every affiliation', async () => {
    const a = await snapshot(db);
    await db.exec(readLaunch('L17-l1-op-affiliation.sql'));
    expect(await snapshot(db)).toEqual(a);
    for (const d of DATA.filter((x) => x.affiliation)) {
      const fr = seriesValueLabel('affiliation', d.affiliation!, 'fr');
      expect(fr).toBeTruthy();
    }
    expect(seriesValueLabel('affiliation', 'Straw Hat Pirates', 'fr')).toBe('Équipage du Chapeau de paille');
    expect(seriesValueLabel('affiliation', 'Marines', 'fr')).toBe('Marine');
    expect(seriesValueLabel('affiliation', 'World Government', 'fr')).toBe('Gouvernement mondial');
    expect(seriesValueLabel('affiliation', 'Revolutionary Army', 'fr')).toBe('Armée révolutionnaire');
  });

  it('the rollback restores L15 byte for byte (attrs, kind, sources), twice, and L17 applies again', async () => {
    await db.exec(readLaunch('L17-l1-op-affiliation.rollback.sql'));
    await db.exec(readLaunch('L17-l1-op-affiliation.rollback.sql'));
    const back = await snapshot(db);
    expect(back.map((r) => r.attrs)).toEqual(before.map((r) => r.attrs));
    expect(back.map((r) => r.t)).toEqual(before.map((r) => r.t));
    expect(await one(db, `select kind from public.dle_attributes where game_id = 'otakudle-one-piece' and key = 'affiliation'`)).toBe('multi');
    expect(await one<number>(db, `select count(*)::int from public.entity_sources where field = 'one-piece.affiliation'`)).toBe(srcBefore);
    await db.exec(readLaunch('L17-l1-op-affiliation.sql'));
    expect(await one(db, `select kind from public.dle_attributes where game_id = 'otakudle-one-piece' and key = 'affiliation'`)).toBe('single');
  });

  it('the files carry no em or en dash and say when to apply them', () => {
    for (const f of ['L17-l1-op-affiliation.sql', 'L17-l1-op-affiliation.rollback.sql']) expect(readLaunch(f)).not.toMatch(/[–—]/);
    expect(readLaunch('L17-l1-op-affiliation.sql')).toMatch(/after 00:30 UTC and never between 23:50 and 00:30/);
  });
});
