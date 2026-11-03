// Otakudle: 023 and the launch-day files on PGlite, with the fixtures and with the real L04 and L13: the pool, a bank that builds, the columns that compare, the studio fallback, one test per hint, the
// checks of session.sh, what the pages say.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { dleClient } from './client';
import { dleCopy, gameCopy, valueLabel } from './copy';
import { dleGame } from './games';
import { rpcAs } from './game-fixture';
import { eraseData } from './local';
import { FIXTURE_IN_POOL, FIXTURE_TARGETS, afterJ4, afterSessionG, applyLaunchFiles, readActivation, readActivationUndo, runCheck, seedIdols, seedOtakudle } from './otakudle-fixture';
import { bankBlocks, one, readMigration, rows, failure, wantBlocks } from './pglite-harness';
import { parsePool, readAnimeSeriesSlugs, readPool, quizLinksOf } from './read';
import { GAME_SEO, gameAnswerBlock, gameJsonLd } from './seo';

import type { PGlite } from '@electric-sql/pglite';
import type { KeyStore } from './local';
import type { DlePoolEntity } from './types';

// PGlite on a loaded runner: one timeout for the whole file, tests and hooks.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));
vi.mock('@/components/hub/dle/dle-font', () => ({ dleMarquee: { variable: 'marquee-var' } }));

const EPOCH = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);
const TODAY = new Date().toISOString().slice(0, 10);

function store(): KeyStore {
  const map = new Map<string, string>();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } };
}

const breaks = async (db: PGlite, win: number): Promise<number> => one<number>(db, `
  select count(*)::int from public.dle_schedule a join public.dle_schedule b on a.game_id = b.game_id and a.entity_id = b.entity_id and a.bank_day < b.bank_day
  where a.game_id = 'otakudle' and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < ${win}`);

describe('023 in session G and in J4', () => {
  it('session G: tables and view closed to the browser, no game while L01 has not added the anime site; J4: the game, off, 7 columns, its hints', async () => {
    const db = await afterSessionG();
    expect(await rows(db, `select id from public.dle_games where id = 'otakudle'`)).toEqual([]);
    for (const t of ['character_facts', 'series_facts']) {
      expect(await one(db, `select relrowsecurity from pg_class where oid = 'public.${t}'::regclass`)).toBe(true);
      expect(await one(db, `select count(*)::int from pg_policy where polrelid = 'public.${t}'::regclass`)).toBe(0);
      for (const role of ['anon', 'authenticated']) expect(await one(db, `select has_table_privilege('${role}', 'public.${t}', 'select')`), `${role} ${t}`).toBe(false);
      expect(await one(db, `select has_table_privilege('service_role', 'public.${t}', 'select')`)).toBe(true);
      expect(await failure(db, `set role anon; select * from public.${t}; reset role`)).toMatch(/permission denied/);
      await db.exec('reset role');
    }
    for (const role of ['anon', 'authenticated']) expect(await one(db, `select has_table_privilege('${role}', 'public.dle_src_anime_character', 'select')`)).toBe(false);
    expect(await one(db, `select 'security_invoker=true' = any (reloptions) from pg_class where oid = 'public.dle_src_anime_character'::regclass`)).toBe(true);
    expect((await runCheck(db, 'V-023.sql')).filter((r) => r[0] !== 'ok')).toEqual([]);

    await db.exec(readMigration('023-dle-otakudle.sql'));
    await afterJ4(db);
    expect(await rows(db, `select universe, entity_kind, source_view, min_pool, hint_keys, hint_after, active, epoch from public.dle_games where id = 'otakudle'`)).toEqual([
      { universe: 'anime', entity_kind: 'character', source_view: 'dle_src_anime_character', min_pool: 40, hint_keys: ['voice_actor_ja', 'initial'], hint_after: [5, 10], active: false, epoch: null },
    ]);
    expect(await rows(db, `select key, kind, near::int from public.dle_attributes where game_id = 'otakudle' order by position`)).toEqual([
      { key: 'series', kind: 'single', near: null }, { key: 'gender', kind: 'single', near: null }, { key: 'species', kind: 'single', near: null }, { key: 'role', kind: 'single', near: null },
      { key: 'demographic', kind: 'single', near: null }, { key: 'year', kind: 'number', near: 2 }, { key: 'studio', kind: 'multi', near: null },
    ]);
    expect((await runCheck(db, 'V-023.sql')).filter((r) => r[0] !== 'ok')).toEqual([]);
    expect(await rpcAs(db, 'dle_pool', { p_game: 'otakudle' })).toMatchObject({ error: { message: expect.stringContaining('dle_unavailable') } });
    expect(await one(db, `select count(*)::int from public.dle_schedule`)).toBe(0);
  });

  it('the rollback: refused with lot A1 rows, then with a play; clean otherwise, twice', async () => {
    const db = await afterSessionG();
    await afterJ4(db);
    await seedOtakudle(db);
    const undo = readMigration('023-dle-otakudle.rollback.sql');
    expect(await failure(db, undo)).toMatch(/character_facts has rows/);
    await db.query(`update public.dle_games set min_pool = 2, no_repeat_days = 5 where id = 'otakudle'`);
    await db.query(`select public.dle_activate('otakudle', '${EPOCH}', 0.5)`);
    const e = await one<string>(db, `select entity_id from public.dle_entities where game_id = 'otakudle' and can_be_target limit 1`);
    await rpcAs(db, 'dle_guess', { p_game: 'otakudle', p_date: TODAY, p_token: 'tokentokentokentoken', p_entity: e });
    expect(await failure(db, undo)).toMatch(/otakudle has plays/);
    await db.exec(`delete from public.dle_plays; delete from public.character_facts; delete from public.series_facts`);
    expect(await failure(db, undo)).toBeNull();
    expect(await failure(db, undo)).toBeNull();
    expect(await one(db, `select to_regclass('public.character_facts')`)).toBeNull();
    expect(await rows(db, `select id from public.dle_games`)).toEqual([{ id: 'kpopdle-idol' }]);
  });
});

describe('the rules of the view, on the fixtures', () => {
  let db: PGlite;
  let pool: DlePoolEntity[];
  const byName = (n: string): DlePoolEntity => pool.find((e) => e.name === n)!;
  const target = async (id: string): Promise<boolean> => one<boolean>(db, `select can_be_target from public.dle_entities where game_id = 'otakudle' and entity_id = '${id}'`);
  const compare = async (a: string, b: string): Promise<Record<string, unknown>> => {
    const out = await one<{ key: string; status: string; arrow: string | null }[]>(db, `select public.dle_compare_all('otakudle', (select attrs from public.dle_entities where game_id = 'otakudle' and entity_id = '${byName(a).id}'), (select attrs from public.dle_entities where game_id = 'otakudle' and entity_id = '${byName(b).id}'))`);
    return Object.fromEntries(out.map((c) => [c.key, c.arrow ? `${c.status} ${c.arrow}` : c.status]));
  };

  beforeAll(async () => {
    db = await afterSessionG();
    await afterJ4(db);
    await seedOtakudle(db);
    await db.query(`update public.dle_games set min_pool = 2, no_repeat_days = 5 where id = 'otakudle'`);
    await db.query(`select public.dle_activate('otakudle', '${EPOCH}', 0.5)`);
    pool = (await readPool({ rpc: (fn: string, args: Record<string, unknown>) => rpcAs(db, fn, args) }, 'otakudle'))!.entities as DlePoolEntity[];
  });

  it('the pool: facts, published, a published series; never a draft, a hidden series or a character without facts; a spoiler level or a hidden identity does not exclude (CR-023)', () => {
    expect(pool).toHaveLength(FIXTURE_IN_POOL);
    for (const name of ['Draft Rival', 'Hidden Rival', 'No Facts Rival']) expect(pool.map((e) => e.name), name).not.toContain(name);
    for (const name of ['Spoiler Rival', 'Identity Rival']) expect(pool.map((e) => e.name), name).toContain(name);
  });

  it('the targets: featured, every column known and a voice actor, whatever the debut arc or medium; a null gender, no studio, no voice actor or not featured stays guessable, never a target', async () => {
    expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool`)).toBe(FIXTURE_TARGETS);
    expect(await target(byName('Hange Zoe').id)).toBe(false);
    expect(await target(byName('Chihiro Rokuhira').id)).toBe(false);
    expect(await target(byName('Eren Yeager').id)).toBe(true);
    expect(await target(byName('Rukia Kuchiki').id)).toBe(false);
    expect(await target(byName('Unfeatured Rival').id)).toBe(false);
    expect(await target(byName('Spoiler Rival').id)).toBe(true);
    expect(await target(byName('Identity Rival').id)).toBe(true);
    // CR-026 (owner, 2026-11-03: no "How far are you?"): a character who debuts late or on one medium only is a target like the others.
    for (const name of ['Late Arc Rival', 'Manga Only Rival', 'Anime Only Rival']) expect(await target(byName(name).id), name).toBe(true);
  });

  it('the view has no progress rule: no seen_at in the attrs of the pool, none in the definition of the view, and the pool carries the same attrs for everyone', async () => {
    expect(await one(db, `select count(*)::int from public.dle_src_anime_character where attrs ? 'seen_at'`)).toBe(0);
    expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'otakudle' and attrs ? 'seen_at'`)).toBe(0);
    expect(await one(db, `select pg_get_viewdef('public.dle_src_anime_character'::regclass) ~ 'seen_'`)).toBe(false);
    expect(JSON.stringify((await rpcAs(db, 'dle_pool', { p_game: 'otakudle' })).data)).not.toContain('seen_at');
  });

  it('dle_pool gives the columns and the names, never the hints or the target flag', async () => {
    const raw = (await rpcAs(db, 'dle_pool', { p_game: 'otakudle' })).data;
    const text = JSON.stringify(raw);
    expect(text).not.toContain('can_be_target');
    expect(text).not.toContain('hints');
    expect(text).not.toContain('Voice of');
    expect(text).not.toContain('Chapter 1');
    expect(parsePool(raw)!.attributes.map((a) => a.key)).toEqual(['series', 'gender', 'species', 'role', 'demographic', 'year', 'studio']);
  });

  it('the search holds the name, the native name, the aliases and the series', () => {
    expect(byName('Monkey D. Luffy').search).toEqual(expect.arrayContaining(['Monkey D. Luffy', 'モンキー・D・ルフィ', 'Straw Hat', 'One Piece']));
  });

  it('the bank builds: 365 days on targets only, within the window, around the cycle', async () => {
    expect(await one(db, `select count(*)::int from public.dle_schedule where game_id = 'otakudle'`)).toBe(365);
    expect(await one(db, `select count(*)::int from public.dle_schedule s join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id where s.game_id = 'otakudle' and not e.can_be_target`)).toBe(0);
    expect(await breaks(db, await one<number>(db, `select public.dle_window('otakudle')`))).toBe(0);
    // CR-027: every target once per block of N days from day 1 before any comes back, the last block with the 365 mod N targets that come once more.
    const n = await one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool`);
    expect(await bankBlocks(db, 'otakudle', n)).toEqual(wantBlocks(n));
  });

  describe('the columns compare', () => {
    it('everything equal is right', async () => {
      expect(await compare('Eren Yeager', 'Eren Yeager')).toEqual({ series: 'correct', gender: 'correct', species: 'correct', role: 'correct', demographic: 'correct', year: 'correct', studio: 'correct' });
    });
    it('gender, species and role single: right or wrong, never near', async () => {
      expect(await compare('Eren Yeager', 'Power')).toMatchObject({ gender: 'wrong', species: 'wrong', role: 'wrong' });
    });
    it('the year: 2 apart at most is near with its arrow; further is wrong with its arrow', async () => {
      expect((await compare('Naruto Uzumaki', 'Ichigo Kurosaki')).year).toBe('near up');
      expect((await compare('Ichigo Kurosaki', 'Naruto Uzumaki')).year).toBe('near down');
      expect((await compare('Eren Yeager', 'Monkey D. Luffy')).year).toBe('wrong down');
    });
    it('the year of an anime original is its anime year, of anything else its manga year', async () => {
      expect(byName('Spike Spiegel').attrs.year!.v).toBe(1998);
      expect(byName('Monkey D. Luffy').attrs.year!.v).toBe(1997);
    });
    it('the demographic: none is a value', async () => {
      expect(byName('Spike Spiegel').attrs.demographic!.v).toBe('none');
      expect((await compare('Spike Spiegel', 'Eren Yeager')).demographic).toBe('wrong');
    });
    it('the studio: one in common is near', async () => {
      expect((await compare('Eren Yeager', 'Loid Forger')).studio).toBe('near');
      expect((await compare('Eren Yeager', 'Denji')).studio).toBe('wrong');
    });
    it('the series: another series is wrong; the same franchise is near, once series has one', async () => {
      expect((await compare('Eren Yeager', 'Denji')).series).toBe('wrong');
      await db.exec(`alter table public.series add column franchise text; update public.series set franchise = 'Same Universe' where title_en in ('Attack on Titan', 'Chainsaw Man')`);
      await db.query(`select public.dle_refresh_entities('otakudle')`);
      expect((await compare('Eren Yeager', 'Denji')).series).toBe('near');
    });
  });
});

describe('the studio, on the fixtures', () => {
  let view: Record<string, string[] | null>;
  beforeAll(async () => {
    const db = await afterSessionG();
    await afterJ4(db);
    await seedOtakudle(db);
    const out = await rows<{ name: string; studio: string[] | null }>(db, `select name, attrs -> 'studio' -> 'v' as studio from public.dle_src_anime_character`);
    view = Object.fromEntries(out.map((r) => [r.name, r.studio]));
  });

  it('the entries whose seasons contain 1, never a later season', () => {
    expect(view['Eren Yeager']).toEqual(['Wit Studio']);
  });
  it('no seasons: the series studio (One Piece, Naruto, Dragon Ball, Bleach)', () => {
    expect(view['Monkey D. Luffy']).toEqual(['Toei Animation']);
  });
  it('no seasons and two studios: both, so one in common is near', () => {
    expect(view['Loid Forger']).toEqual(['CloverWorks', 'Wit Studio']);
  });
  it('a mix: the season 1 entry wins over an entry without seasons', () => {
    expect(view['Tohru Honda']).toEqual(['TMS Entertainment']);
  });
  it('no studio at all: null, so never a target', () => {
    expect(view['Chihiro Rokuhira']).toBeNull();
  });
  it('"Studio Pierrot" and "Pierrot" of L04 are one studio', () => {
    expect(view['Naruto Uzumaki']).toEqual(['Pierrot']);
    expect(view['Ichigo Kurosaki']).toEqual(['Pierrot']);
  });
});

describe('the hints, one by one, on a real play', () => {
  let db: PGlite;
  let targetId: string;
  let wrong: string[];
  beforeAll(async () => {
    db = await afterSessionG();
    await afterJ4(db);
    await seedOtakudle(db);
    await db.query(`update public.dle_games set min_pool = 2, no_repeat_days = 5 where id = 'otakudle'`);
    await db.query(`select public.dle_activate('otakudle', '${EPOCH}', 0.5)`);
    // The target of today is forced to the one with every fact (first appearance included), so the test does not depend on the draw.
    targetId = await one<string>(db, `select e.entity_id from public.dle_entities e where e.game_id = 'otakudle' and e.name = 'Eren Yeager'`);
    await db.query(`insert into public.dle_daily_stats (game_id, play_date, game_no, entity_id) values ('otakudle', $1, 4, $2) on conflict (game_id, play_date) do update set entity_id = excluded.entity_id`, [TODAY, targetId]);
    wrong = (await rows<{ entity_id: string }>(db, `select entity_id from public.dle_entities where game_id = 'otakudle' and in_pool and entity_id <> $1 order by entity_id`, [targetId])).map((r) => r.entity_id);
  });

  const play = async (token: string, n: number): Promise<{ key: string; value: string }[]> => {
    const c = dleClient((fn, args) => rpcAs(db, fn, args), { ...store(), getItem: () => token });
    let hints: { key: string; value: unknown }[] = [];
    for (const id of wrong.slice(0, n)) hints = [...(await c.guess('otakudle', TODAY, id)).hints];
    return hints as { key: string; value: string }[];
  };

  it('the Japanese voice actor is the first hint: it opens after 5 errors, not after 4', async () => {
    expect(await play('hint-token-aaaaaaaaaa', 4)).toEqual([]);
    expect(await play('hint-token-bbbbbbbbbb', 5)).toEqual([{ key: 'voice_actor_ja', value: 'Voice of Eren Yeager' }]);
  });
  it('the initial opens after 10 errors, not after 9, from the name', async () => {
    expect(await play('hint-token-cccccccccc', 9)).toEqual([{ key: 'voice_actor_ja', value: 'Voice of Eren Yeager' }]);
    expect(await play('hint-token-dddddddddd', 10)).toEqual([{ key: 'voice_actor_ja', value: 'Voice of Eren Yeager' }, { key: 'initial', value: 'E' }]);
  });
  it('no first appearance hint is served, even when the fact exists (owner, for launch, CR-020)', async () => {
    expect(await one<string>(db, `select first_appearance from public.character_facts where character_id::text = $1`, [targetId])).toBe('Chapter 1');
    const all = await play('hint-token-eeeeeeeeee', 12);
    expect(all.map((h) => h.key)).toEqual(['voice_actor_ja', 'initial']);
    expect(JSON.stringify(all)).not.toMatch(/first_appearance|Chapter 1/);
    expect(await one<unknown>(db, `select hints from public.dle_entities where game_id = 'otakudle' and entity_id = $1`, [targetId])).toEqual({ voice_actor_ja: 'Voice of Eren Yeager', initial: 'E' });
    expect(await one(db, `select count(*)::int from public.dle_src_anime_character where hints ? 'first_appearance'`)).toBe(0);
  });
  it('a hint with no value stays out of the play: the column is null, the page says none', async () => {
    const shanks = await one<unknown>(db, `select hints from public.dle_entities where game_id = 'otakudle' and name = 'Shanks'`);
    expect(shanks).toEqual({ voice_actor_ja: 'Voice of Shanks', initial: 'S' });
    expect(await one<unknown>(db, `select hints ->> 'voice_actor_ja' from public.dle_entities where game_id = 'otakudle' and name = 'Rukia Kuchiki'`)).toBeNull();
  });
});

describe('the real launch files, L04 and L13', () => {
  let db: PGlite;
  const attr = async (slug: string, key: string): Promise<unknown> => one(db, `
    select s.attrs -> $2 -> 'v' from public.dle_src_anime_character s join public.characters c on c.id::text = s.entity_id where c.slug = $1`, [slug, key]);

  beforeAll(async () => {
    db = await afterSessionG();
    await afterJ4(db);
    await applyLaunchFiles(db);
  });

  it('750 characters in the pool of the 50 series, 584 with the 7 columns, 178 targets (the TOP200 with the 7 columns and a voice actor, whatever the debut arc; 197 have a voice actor, 19 of them lack a column, among them 7 with no year: Sword Art Online, Re:Zero, Steins;Gate, Mob Psycho 100); the 3 without a gender', async () => {
    expect(await one(db, `select count(*)::int from public.dle_src_anime_character`)).toBe(750);
    const complete = `from public.dle_src_anime_character s where not exists (select 1 from public.dle_attributes a where a.game_id = 'otakudle' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0)`;
    expect(await one(db, `select count(*)::int ${complete}`)).toBe(584);
    expect(await one(db, `select count(*)::int ${complete} and s.can_be_target`)).toBe(178);
    expect(await one(db, `select count(distinct balance_key)::int from public.dle_src_anime_character`)).toBe(50);
    expect(await one(db, `select count(*)::int from public.character_facts where featured`)).toBe(200);
    // A target is featured and has a voice actor; nobody else is one.
    expect(await one(db, `select count(*)::int from public.dle_src_anime_character v join public.characters c on c.id::text = v.entity_id join public.character_facts f on f.character_id = c.id where v.can_be_target and (not f.featured or f.voice_actor_ja is null)`)).toBe(0);
    expect(await rows(db, `select c.slug from public.dle_src_anime_character v join public.characters c on c.id::text = v.entity_id where v.attrs -> 'gender' ->> 'v' is null order by 1`)).toEqual([{ slug: 'hange-zoe' }, { slug: 'kaiju-no-9' }, { slug: 'rimuru-tempest' }]);
  });

  it('the studio fallback: the series with no season 1 studio entry (One Piece, Naruto, Dragon Ball, Bleach and others) keep their characters in the game; without it only 348 characters would have the columns', async () => {
    const without = await one<number>(db, `
      select count(*)::int from public.dle_src_anime_character v
      join public.characters c on c.id::text = v.entity_id join public.series s on s.group_id = c.group_id
      where v.attrs -> 'gender' ->> 'v' is not null and v.attrs -> 'species' ->> 'v' is not null and v.attrs -> 'role' ->> 'v' is not null
        and exists (select 1 from jsonb_array_elements(s.studios) e where (e -> 'seasons') @> '[1]'::jsonb)`);
    expect(without).toBe(348);
    const series = await rows<{ slug: string }>(db, `
      select distinct g.slug from public.dle_src_anime_character v join public.characters c on c.id::text = v.entity_id join public.series s on s.group_id = c.group_id join public.groups g on g.id = s.group_id
      where not exists (select 1 from jsonb_array_elements(s.studios) e where (e -> 'seasons') @> '[1]'::jsonb) order by 1`);
    expect(series.map((x) => x.slug)).toEqual(expect.arrayContaining(['bleach', 'dragon-ball', 'naruto', 'one-piece']));
  });

  it('the owner\'s departure from the contract, in the data: Goku saiyan, Nezuko demon, Denji a devil-human-hybrid (the ruling of 2026-11-03)', async () => {
    expect(await attr('goku', 'species')).toBe('saiyan');
    expect(await attr('nezuko-kamado', 'species')).toBe('demon');
    expect(await attr('denji', 'species')).toBe('devil-human-hybrid');
  });

  it('the studio of the 4 series without seasons, and Pierrot as one studio', async () => {
    expect(await attr('monkey-d-luffy', 'studio')).toEqual(['Toei Animation']);
    expect(await attr('naruto-uzumaki', 'studio')).toEqual(['Pierrot']);
    expect(await attr('goku', 'studio')).toEqual(['Toei Animation']);
    expect(await attr('ichigo-kurosaki', 'studio')).toEqual(['Pierrot']);
    expect(await attr('eren-yeager', 'studio')).toEqual(['Wit Studio']);
  });

  it('the debut arc and medium are data, not a rule: no character of the pool carries a seen_at, and every featured character with every column and a voice actor is a target (CR-026)', async () => {
    expect(await one(db, `select count(*)::int from public.dle_src_anime_character where attrs ? 'seen_at'`)).toBe(0);
    expect(await one(db, `select count(*)::int from public.dle_src_anime_character v join public.characters c on c.id::text = v.entity_id join public.character_facts f on f.character_id = c.id
      where f.featured and f.voice_actor_ja is not null and not v.can_be_target`)).toBe(0);
  });

  it('V-L13 is ok on every row and says 584 with the 7 columns, 178 targets', async () => {
    const out = await runCheck(db, 'V-L13.sql');
    expect(out.filter((r) => r[0] !== 'ok')).toEqual([]);
    expect(out.find((r) => r[1].includes('7 colonnes'))![2]).toBe('584');
    expect(out.find((r) => r[1].startsWith('cibles de otakudle'))![2]).toBe('178');
    expect(out.find((r) => r[1].startsWith('TOP200'))![2]).toBe('200');
    expect(JSON.stringify(out)).not.toMatch(/Luffy|Goku|Tanjiro/);
  });

  it('L14 stops with no idol: it names the game and neither game changes', async () => {
    expect(await failure(db, readActivation())).toMatch(/L14 kpopdle-idol: dle_pool_too_small: 0 targets, 40 needed/);
    expect(await rows(db, `select id, active, epoch from public.dle_games order by id`)).toEqual([{ id: 'kpopdle-idol', active: false, epoch: null }, { id: 'otakudle', active: false, epoch: null }]);
    expect(await one(db, `select count(*)::int from public.dle_schedule`)).toBe(0);
  });

  it('L14: both games on with today as epoch, 365 days each, a second run changes nothing, V-L14, V-023 and V-DLE-KEPT ok; off keeps the banks; on again keeps the epochs', async () => {
    await seedIdols(db, 45);
    await db.exec(readActivation());
    const banks = `select game_id, bank_day, entity_id from public.dle_schedule order by 1, 2`;
    const games = `select id, active, epoch from public.dle_games order by id`;
    const bank = await rows(db, banks);
    expect(bank).toHaveLength(730);
    const on = await rows<{ id: string; active: boolean; epoch: Date }>(db, games);
    expect(on.map((g) => [g.id, g.active])).toEqual([['kpopdle-idol', true], ['otakudle', true]]);
    for (const g of on) expect(g.epoch.toISOString().slice(0, 10)).toBe(TODAY);
    await db.exec(readActivation());
    expect(await rows(db, banks)).toEqual(bank);
    expect(await rows(db, games)).toEqual(on);
    expect(await one(db, `select public.dle_window('otakudle')`)).toBe(120);
    expect(await breaks(db, 120)).toBe(0);
    expect(await bankBlocks(db, 'otakudle', 178)).toEqual(wantBlocks(178));
    expect(await bankBlocks(db, 'kpopdle-idol', 45)).toEqual(wantBlocks(45));
    const v = await runCheck(db, 'V-L14.sql');
    expect(v.filter((r) => r[0] !== 'ok')).toEqual([]);
    expect(v).toHaveLength(16);
    expect(v.filter((r) => r[1].includes('par bloc')).map((r) => r[2])).toEqual(['1', '1']);
    expect(v.find((r) => r[1] === 'otakudle : cibles possibles, au moins le minimum du jeu')![2]).toBe('178');
    expect(v.find((r) => r[1] === 'kpopdle-idol : cibles possibles, au moins le minimum du jeu')![2]).toBe('45');
    expect(JSON.stringify(v)).not.toMatch(/Luffy|Goku|Tanjiro|Fixture/);
    expect((await runCheck(db, 'V-023.sql')).filter((r) => r[0] !== 'ok')).toEqual([]);
    expect((await runCheck(db, 'V-DLE-KEPT.sql')).map((r) => [r[0], r[2]])).toEqual([['ok', '0'], ['ok', '0']]);
    for (const g of ['kpopdle-idol', 'otakudle']) expect((await rpcAs(db, 'dle_day', { p_game: g })).data).toMatchObject({ game_no: 1, play: null });
    await db.exec(readActivationUndo());
    expect((await rows<{ active: boolean }>(db, games)).map((g) => g.active)).toEqual([false, false]);
    expect(await rows(db, banks)).toEqual(bank);
    await db.exec(readActivationUndo());
    await db.exec(readActivation());
    expect(await rows(db, games)).toEqual(on);
  });

  it('V-DLE-KEPT: a target that leaves the pool on a kept day says KO with a count, never a name; the rebuild keeps that day, the name is refused, give up still works', async () => {
    const target = await one<string>(db, `select public.dle_target('otakudle', '${TODAY}')`);
    await db.query(`update public.characters set status = 'hidden' where id = $1::int`, [target]);
    expect(await one(db, `select public.dle_daily_maintenance(now())`)).toMatchObject([{ game: 'kpopdle-idol' }, { game: 'otakudle', rebuilt_days: 357 }]);
    expect(await one(db, `select public.dle_target('otakudle', '${TODAY}')`)).toBe(target);
    const out = await runCheck(db, 'V-DLE-KEPT.sql');
    expect(out.map((r) => r[0])).toEqual(['ok', 'KO']);
    expect(Number(out[1]![2])).toBeGreaterThanOrEqual(1);
    expect(JSON.stringify(out)).not.toContain(target);
    const token = 'kept-day-token-aaaaaa';
    expect((await rpcAs(db, 'dle_guess', { p_game: 'otakudle', p_date: TODAY, p_token: token, p_entity: target })).error!.message).toMatch(/dle_unknown_entity/);
    await db.query(`update public.characters set status = 'published' where id = $1::int`, [target]);
    await db.query(`select public.dle_daily_maintenance(now())`);
    expect((await runCheck(db, 'V-DLE-KEPT.sql')).map((r) => r[0])).toEqual(['ok', 'ok']);
    expect(await one(db, `select in_pool from public.dle_entities where game_id = 'otakudle' and entity_id = $1`, [target])).toBe(true);
  });

  it('L14 refuses under the minimum, naming the game, with nothing changed', async () => {
    const small = await afterSessionG();
    await afterJ4(small);
    await seedOtakudle(small);
    await seedIdols(small, 45);
    expect(await failure(small, readActivation())).toMatch(/L14 otakudle: dle_pool_too_small/);
    expect(await rows(small, `select id, active from public.dle_games order by id`)).toEqual([{ id: 'kpopdle-idol', active: false }, { id: 'otakudle', active: false }]);
  });
});

describe('the choice of "How far are you?" is gone from this device (CR-026)', () => {
  it('the old key is erased with the rest, and a storage that throws is survived', () => {
    const s = store();
    s.setItem('dle:v1:progress', 'manga');
    eraseData(s);
    expect(s.getItem('dle:v1:progress')).toBeNull();
    const bad: KeyStore = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => { throw new Error('blocked'); } };
    expect(() => eraseData(bad)).not.toThrow();
  });
});

describe('Kpopdle Idol has no debut song hint (owner, for launch)', () => {
  it('the debut_song hint is absent from the game definition, the labels, the how-to, in both languages; the migration has fandom after 5 and initial after 10', async () => {
    expect(dleGame('kpopdle-idol').hints).toEqual([{ key: 'fandom', after: 5 }, { key: 'initial', after: 10 }]);
    for (const l of ['en', 'fr'] as const) {
      const w = gameCopy('kpopdle-idol', l);
      expect(Object.keys(w.hints).sort()).toEqual(['fandom', 'initial']);
      expect(w.how1).not.toMatch(/5, 8|12/);
      expect(w.dlgHow3).not.toMatch(/5, 8|12/);
      expect(w.how1).toMatch(/5 (and|et) 10/);
      expect(w.dlgHow3).toMatch(/5 (and|et) 10/);
      expect(JSON.stringify(w)).not.toMatch(/debut_song|debut title|Titre de début/);
    }
    const db = await afterSessionG();
    expect(await rows(db, `select hint_keys, hint_after from public.dle_games where id = 'kpopdle-idol'`)).toEqual([{ hint_keys: ['fandom', 'initial'], hint_after: [5, 10] }]);
  });
});

describe('the words and the SEO of /otakudle', () => {
  it('section 11: the titles of v2, 60 or fewer with the suffix, descriptions of 120 to 160, the brand never typed, no competitor', () => {
    const seo = GAME_SEO.otakudle!;
    expect(seo.title.en).toBe('Otakudle: Guess the Anime Character Daily');
    expect(seo.title.fr).toBe('Otakudle : devine le perso d’anime du jour');
    for (const l of ['en', 'fr'] as const) {
      expect(`${seo.title[l]} | Bunnyverse`.length, l).toBeLessThanOrEqual(60);
      expect(seo.description[l].length, l).toBeGreaterThanOrEqual(120);
      expect(seo.description[l].length, l).toBeLessThanOrEqual(160);
      expect(`${seo.title[l]} ${seo.description[l]}`).not.toMatch(/animedle|loldle|Bunnyverse/i);
    }
  });

  it('the answer block: 40 to 60 words, the number with its date; JSON-LD has no rating and no answer', () => {
    for (const l of ['en', 'fr'] as const) {
      const b = gameAnswerBlock('otakudle', l, 120, '2026-11-01');
      const words = b.split(/\s+/).length;
      expect(words, l).toBeGreaterThanOrEqual(40);
      expect(words, l).toBeLessThanOrEqual(60);
      expect(b).toContain('120');
      expect(b).toMatch(/2026/);
    }
    const j = gameJsonLd('otakudle', 'fr');
    expect(j.url).toBe('https://bunnyverse.org/fr/otakudle');
    expect(JSON.stringify(j)).not.toMatch(/aggregateRating|numberOfPlayers/);
  });

  it('the values read in each language; a role of Kpopdle is unchanged', () => {
    expect(valueLabel('role', 'supporting', 'fr')).toBe('Secondaire');
    expect(valueLabel('role', 'supporting', 'en')).toBe('Supporting');
    expect(valueLabel('role', 'leader', 'fr')).toBe('Leader');
    expect(valueLabel('species', 'human', 'fr')).toBe('Humain');
    expect(valueLabel('species', 'mod-soul', 'en')).toBe('Mod soul');
    expect(valueLabel('species', 'unseen-word', 'fr')).toBe('Unseen word');
    expect(valueLabel('demographic', 'shonen', 'fr')).toBe('Shōnen');
    expect(valueLabel('demographic', 'none', 'fr')).toBe('Aucune');
    expect(valueLabel('studio', ['MAPPA', 'Bones'], 'fr')).toBe('MAPPA, Bones');
  });

  it('every column and every hint of the game has its words, in both languages', () => {
    for (const l of ['en', 'fr'] as const) {
      const w = gameCopy('otakudle', l);
      expect(Object.keys(w.columns)).toEqual(['series', 'gender', 'species', 'role', 'demographic', 'year', 'studio']);
      for (const h of dleGame('otakudle').hints) expect(w.hints[h.key], h.key).toBeTruthy();
      expect(w, l).not.toHaveProperty('progress');
    }
    expect(dleGame('otakudle').hints).toEqual([{ key: 'voice_actor_ja', after: 5 }, { key: 'initial', after: 10 }]);
    for (const l of ['en', 'fr'] as const) {
      const w = gameCopy('otakudle', l);
      expect(Object.keys(w.hints).sort()).toEqual(['initial', 'voice_actor_ja']);
      expect(w.how1).toMatch(/5 (and|et) 10/);
      expect(w.dlgHow3).toMatch(/5 (and|et) 10/);
      expect(`${w.how1} ${w.dlgHow3}`).not.toMatch(/5, 8|12/);
    }
  });

  it('the quiz links: on the site of the game, only for a name it knows', () => {
    expect(quizLinksOf('anime', ['One Piece', 'Unknown'], { 'One Piece': 'one-piece' })).toEqual({ 'One Piece': 'https://bunnyverse.org/anime/one-piece-quiz' });
    expect(quizLinksOf('kpop', ['TWICE'], { TWICE: 'twice' })).toEqual({ TWICE: 'https://kpopquiz.org/twice-quiz' });
  });

  it('the series titles are read with the site scope', async () => {
    const calls: [string, string][] = [];
    const db = { from: () => ({ select: () => ({ eq: (k: string, v: string) => { calls.push([k, v]); return { order: () => ({ range: () => Promise.resolve({ data: [{ name: 'One Piece', slug: 'one-piece' }], error: null }) }) }; } }) }) };
    expect(await readAnimeSeriesSlugs(db)).toEqual({ 'One Piece': 'one-piece' });
    expect(calls).toEqual([['site_id', 'anime']]);
  });
});

describe('the screen drawn on the server', () => {
  const POOL = {
    game: 'otakudle', universe: 'anime',
    attributes: ['series', 'gender', 'species', 'role', 'demographic', 'year', 'studio'].map((key) => ({ key, kind: 'single' as const, near: null })),
    entities: [{ id: '1', name: 'Eren Yeager', search: ['Eren Yeager', 'エレン'], attrs: { series: { v: 'Attack on Titan' }, studio: { v: ['Wit Studio'] } }, thumb: null }],
  };

  it('one H1, no "How far are you?" (no selector, no radio, no legend), the steps that have no page say soon, no target; Kpopdle has none either', async () => {
    const { DleGame } = await import('@/components/hub/dle/dle-game');
    for (const locale of ['en', 'fr'] as const) {
      const w = gameCopy('otakudle', locale);
      const html = renderToStaticMarkup(createElement(DleGame, { locale, game: 'otakudle', gameNo: 4, stats: null, pool: POOL, pictures: {}, quizLinks: {}, kpopName: 'OtakuQuiz' }));
      expect(html.match(/<h1/g)).toHaveLength(1);
      expect(html).toContain(w.h1);
      expect(html).not.toMatch(/How far are you|Où en es-tu|<fieldset|<legend|type="radio"|hub-dle-seg|hub-dle-progress/);
      // CR-024: "One Otakudle per series" became the two games of One Piece and Dragon Ball, both built: only "Series of the day" is still soon.
      expect(html.match(/hub-dle-stepstate-soon/g)).toHaveLength(1);
      expect(html).toContain(dleCopy(locale).soon);
      expect(html).not.toContain('Eren Yeager');
      expect(html).toContain(locale === 'fr' ? 'Otakudle n° 4' : 'Otakudle no. 4');
      expect(html.match(/class="hub-dle-hint"/g)).toHaveLength(2);
      expect(html).not.toContain(locale === 'fr' ? 'Première apparition' : 'First appearance');
    }
    const idol = renderToStaticMarkup(createElement(DleGame, { locale: 'en', game: 'kpopdle-idol', gameNo: 4, stats: null, pool: { ...POOL, game: 'kpopdle-idol' }, pictures: {}, quizLinks: {}, kpopName: 'KpopQuiz' }));
    expect(idol).not.toContain('type="radio"');
  });
});
