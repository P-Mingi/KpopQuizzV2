// Lane DLE-OTAKU (owner 2026-11-22: no "?" in any Otakudle cell, every value correct). The real files 019, 023, 024, L04, L13, L15, L17, L18, L21, L22, L23, then L35 and its rollback on PGlite:
// after L35 no pool character has an empty shown value (the seven columns, read the way the game reads them: dle_pool, the day answer through dle_public_entity) and every answer has its two hints.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { afterJ4, afterSessionG, applyLaunchFiles, liveGames } from './otakudle-fixture';
import { MIGRATIONS, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L35 = 'L35-l1-otakudle-fill.sql';
const L35R = 'L35-l1-otakudle-fill.rollback.sql';
const COLUMNS = ['series', 'genres', 'year', 'studio', 'gender', 'species', 'role'];

/** What the client prints as "?": a null, an empty string or an empty list. */
const isEmpty = (v: unknown): boolean => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0);

interface Entity { id: string; name: string; attrs: Record<string, { v: unknown }> }
const emptyCells = (entities: Entity[]): string[] => entities.flatMap((e) => COLUMNS.filter((k) => isEmpty(e.attrs[k]?.v)).map((k) => `${e.name}:${k}`));
const pool = async (db: PGlite): Promise<Entity[]> => (await one<{ entities: Entity[] }>(db, `select public.dle_pool('otakudle')`)).entities;

async function snap(db: PGlite): Promise<unknown> {
  return {
    facts: await rows(db, `select character_id, gender, species, role_at_debut, first_appearance, voice_actor_ja, featured, updated_at from public.character_facts order by character_id`),
    studios: await rows(db, `select group_id, studios from public.series order by group_id`),
    ents: await rows(db, `select entity_id, attrs, hints, can_be_target, in_pool from public.dle_entities where game_id = 'otakudle' order by entity_id`),
    check: await rows(db, `select pg_get_constraintdef(oid) as d from pg_constraint where conrelid = 'public.character_facts'::regclass and contype = 'c' order by 1`),
  };
}

let db: PGlite;
let before: unknown;
let after: unknown;
let emptyBefore: string[];
let emptyAfter: string[];

beforeAll(async () => {
  db = await afterSessionG();
  await db.exec(readMigration('024-dle-series-games.sql'));
  await afterJ4(db);
  await db.exec(readMigration('024-dle-series-games.sql'));
  await applyLaunchFiles(db);
  await db.exec(readLaunch('L15-A2-series-games.sql'));
  await db.exec(readLaunch('L17-l1-op-affiliation.sql'));
  await db.exec(readLaunch('L18-l1-otakudle-genres.sql'));
  await liveGames(db, ['otakudle-one-piece', 'otakudle-dragon-ball']);
  await db.exec(readLaunch('L21-l1-series-games-corrections.sql'));
  await liveGames(db, ['otakudle']);
  await db.exec(readLaunch('L22-l1-otakudle-facts-corrections.sql'));
  await db.exec(readLaunch('L23-l1-otakudle-first-adaptation.sql'));
  before = await snap(db);
  emptyBefore = emptyCells(await pool(db));
  await db.exec(readLaunch(L35));
  after = await snap(db);
  emptyAfter = emptyCells(await pool(db));
});

describe('L35: no "?" in Otakudle', () => {
  it('the world before L35 has the holes the owner saw', () => {
    expect(emptyBefore.length).toBeGreaterThan(100);
    expect(emptyBefore.some((x) => x.endsWith(':species'))).toBe(true);
    expect(emptyBefore.some((x) => x.endsWith(':studio'))).toBe(true);
  });

  it('after L35 the pool (dle_pool, 750 characters) has no empty cell in any of the seven columns', async () => {
    const entities = await pool(db);
    expect(entities.length).toBe(750);
    expect(emptyAfter).toEqual([]);
  });

  it('every character of the bank (the answers of the 365 days) has its seven cells, a voice actor and an initial', async () => {
    const days = await rows<{ entity_id: string }>(db, `select distinct entity_id from public.dle_schedule where game_id = 'otakudle'`);
    expect(days.length).toBeGreaterThan(100);
    for (const d of days) {
      const e = await one<Entity>(db, `select public.dle_public_entity('otakudle', $1)`, [d.entity_id]);
      expect(emptyCells([e]), e.name).toEqual([]);
    }
    const hints = await rows<{ n: number }>(db, `select count(*)::int as n from public.dle_entities e join public.dle_schedule s on s.game_id = e.game_id and s.entity_id = e.entity_id
      where e.game_id = 'otakudle' and (nullif(e.hints ->> 'voice_actor_ja', '') is null or nullif(e.hints ->> 'initial', '') is null)`);
    expect(hints[0]!.n).toBe(0);
  });

  it('every character that has a Japanese voice actor in the data keeps the hint, and the ones left without are known', async () => {
    const left = await rows<{ slug: string }>(db, `select c.slug from public.character_facts f join public.characters c on c.id = f.character_id where f.voice_actor_ja is null order by c.slug`);
    expect(left.length).toBe(30);
    const answers = await rows<{ n: number }>(db, `select count(*)::int as n from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool and nullif(hints ->> 'voice_actor_ja', '') is null`);
    expect(answers[0]!.n).toBe(0);
  });

  it('the values written: gender, species, role, voice, and the two studios', async () => {
    const one1 = (slug: string, col: string): Promise<string | null> => one<string | null>(db, `select f.${col}::text from public.character_facts f join public.characters c on c.id = f.character_id where c.slug = '${slug}'`);
    expect(await one1('hange-zoe', 'gender')).toBe('unspecified');
    expect(await one1('rimuru-tempest', 'gender')).toBe('male');
    expect(await one1('jack', 'species')).toBe('fish-man');
    expect(await one1('mr-popo', 'species')).toBe('genie');
    expect(await one1('silvers-rayleigh', 'role_at_debut')).toBe('supporting');
    expect(await one1('zeke-yeager', 'voice_actor_ja')).toBe('Takehito Koyasu');
    expect(await one<string>(db, `select s.studios -> 0 ->> 'name' from public.series s join public.groups g on g.id = s.group_id where g.slug = 'kagurabachi'`)).toBe('Cypic');
    expect(await one<string>(db, `select s.studios -> 0 ->> 'name' from public.series s join public.groups g on g.id = s.group_id where g.slug = 'omniscient-readers-viewpoint'`)).toBe('Aniplex');
  });

  it('no value L35 did not own changed: only empty values moved, and the check accepts unspecified', async () => {
    const a = after as { facts: Record<string, unknown>[] };
    const b = before as { facts: Record<string, unknown>[] };
    expect(a.facts.length).toBe(b.facts.length);
    let moved = 0;
    for (const [i, f] of a.facts.entries()) {
      const o = b.facts[i]!;
      for (const k of ['gender', 'species', 'role_at_debut', 'voice_actor_ja']) {
        if (f[k] !== o[k]) {
          expect(o[k], `${String(f.character_id)} ${k}`).toBeNull();
          moved += 1;
        }
      }
      expect(f.featured).toBe(o.featured);
      expect(f.first_appearance).toBe(o.first_appearance);
      expect(f.updated_at).toEqual(o.updated_at);
    }
    expect(moved).toBe(140);
  });

  it('a second apply changes nothing', async () => {
    await db.exec(readLaunch(L35));
    expect(await snap(db)).toEqual(after);
  });

  it('the Verify lines of the file hold, then the rollback restores every value, the studios and the check', async () => {
    const verify = (file: string): { query: string; expect: string }[] =>
      readLaunch(file).split('\n').filter((l) => l.startsWith('-- Verify:')).map((l) => {
        const m = /^-- Verify: (select .*;)   expect (.*)$/.exec(l);
        if (!m) throw new Error(`unreadable Verify line: ${l}`);
        return { query: m[1]!, expect: m[2]! };
      });
    const lines = verify(L35);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const v of lines) {
      const r = await rows<Record<string, unknown>>(db, v.query.replace(/;$/, ''));
      expect(r.length, v.query).toBe(1);
      expect(String(Object.values(r[0]!)[0]), v.query).toBe(v.expect);
    }
    await db.exec(readLaunch(L35R));
    expect(await snap(db)).toEqual(before);
    for (const v of verify(L35R)) {
      const r = await rows<Record<string, unknown>>(db, v.query.replace(/;$/, ''));
      expect(String(Object.values(r[0]!)[0]), v.query).toBe(v.expect);
    }
    await db.exec(readLaunch(L35R));
    expect(await snap(db)).toEqual(before);
    await db.exec(readLaunch(L35));
    expect(await snap(db)).toEqual(after);
  });
});
