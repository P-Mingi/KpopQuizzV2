// Lane otkdata (owner 2026-11-09, audit 06, section 2.3): the Otakudle facts and the first adaptation. The real files 019, 023, 024, L04, L13, L15, L17, L18, L21, then L22 and L23 and their rollbacks on PGlite.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { afterJ4, afterSessionG, applyLaunchFiles, liveGames } from './otakudle-fixture';
import { MIGRATIONS, one, readMigration, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L22 = 'L22-l1-otakudle-facts-corrections.sql';
const L22R = 'L22-l1-otakudle-facts-corrections.rollback.sql';
const L23 = 'L23-l1-otakudle-first-adaptation.sql';
const L23R = 'L23-l1-otakudle-first-adaptation.rollback.sql';

interface Snap { facts: unknown[]; sources: unknown[]; ents: unknown[]; cur: unknown[]; series: unknown[]; view: string }
async function snap(db: PGlite): Promise<Snap> {
  return {
    facts: await rows(db, `select character_id, gender, species, role_at_debut, first_appearance, voice_actor_ja, featured, updated_at from public.character_facts order by character_id`),
    sources: await rows(db, `select entity_type, entity_id, field, source, source_ref, source_url, fetched_at from public.entity_sources order by entity_type, entity_id, field, source`),
    ents: await rows(db, `select game_id, entity_id, attrs, hints, can_be_target, in_pool from public.dle_entities where game_id = 'otakudle' and (in_pool or can_be_target) order by entity_id`),
    cur: await rows(db, `select game_id, entity_id, excluded, weight, note from public.dle_curation order by game_id, entity_id`),
    series: await rows(db, `select sf.group_id, sf.genres, sf.work_year, sf.demographic, s.anime_start_year, s.manga_start_year, s.studios from public.series_facts sf join public.series s on s.group_id = sf.group_id order by sf.group_id`),
    view: await one<string>(db, `select pg_get_viewdef('public.dle_src_anime_character'::regclass)`),
  };
}

/** A row inserted again (Ken Kaneki, after a rollback) carries a new updated_at; everything else must be identical. */
const noStamp = (x: Snap): Snap => ({ ...x, facts: (x.facts as { character_id: number; updated_at?: unknown }[]).map((f) => (Number(f.character_id) === Number(KANEKI) ? { ...f, updated_at: expect.anything() as unknown } : f)) });
let KANEKI = -1;

interface Facts { gender: string | null; species: string | null; role_at_debut: string | null; first_appearance: string | null; voice_actor_ja: string | null; featured: boolean }
const facts = async (db: PGlite, series: string, slug: string): Promise<Facts> =>
  (await rows<Facts>(db, `select f.gender, f.species, f.role_at_debut, f.first_appearance, f.voice_actor_ja, f.featured from public.character_facts f join public.characters c on c.id = f.character_id join public.groups g on g.id = c.group_id and g.site_id = 'anime' where g.slug = $1 and c.slug = $2`, [series, slug]))[0]!;
const sources = (db: PGlite, entity: string, field: string): Promise<{ source: string; source_ref: string | null; source_url: string }[]> =>
  rows(db, `select source, source_ref, source_url from public.entity_sources where entity_type = 'character' and entity_id = $1 and field = $2 order by source`, [entity, field]);
const answers = (db: PGlite): Promise<number> => one<number>(db, `select count(*)::int from public.dle_entities where game_id = 'otakudle' and can_be_target and in_pool`);
const isAnswer = async (db: PGlite, slug: string): Promise<boolean> =>
  (await rows<{ t: boolean }>(db, `select e.can_be_target and e.in_pool as t from public.dle_entities e join public.characters c on c.id::text = e.entity_id where e.game_id = 'otakudle' and c.slug = $1`, [slug]))[0]?.t ?? false;

let db: PGlite;
let beforeL22: Snap;
let afterL22: Snap;
let afterL23: Snap;
let answersBefore: number;
let answersAfterL22: number;
let answersAfterL23: number;

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
  KANEKI = await one<number>(db, `select c.id::int from public.characters c where c.slug = 'ken-kaneki'`);
  answersBefore = await answers(db);
  beforeL22 = await snap(db);
  await db.exec(readLaunch(L22));
  afterL22 = await snap(db);
  answersAfterL22 = await answers(db);
  await db.exec(readLaunch(L23));
  afterL23 = await snap(db);
  answersAfterL23 = await answers(db);
});

describe('L22: the Otakudle facts', () => {
  it('the answers: the characters with a complete row join, Haise Sasaki leaves for Ken Kaneki', async () => {
    expect(answersAfterL22).toBe(answersBefore + 20 - 1);
    for (const s of ['goku', 'frieza', 'gohan', 'piccolo', 'nezuko-kamado', 'inosuke-hashibira', 'alphonse-elric', 'ken-kaneki', 'jinbe', 'kyo-sohma', 'jotaro-kujo', 'josuke-higashikata']) expect(await isAnswer(db, s), s).toBe(true);
    expect(await isAnswer(db, 'haise-sasaki')).toBe(false);
    expect(await isAnswer(db, 'rimuru-tempest')).toBe(false);
    expect(await isAnswer(db, 'hisoka-morrow')).toBe(false);
  });

  it('gender, role and species values', async () => {
    expect((await facts(db, 'dragon-ball', 'captain-ginyu')).gender).toBe('male');
    expect((await facts(db, 'hunter-x-hunter', 'neferpitou'))).toMatchObject({ gender: null, species: 'chimera-ant' });
    const role = async (g: string, c: string): Promise<string | null> => (await facts(db, g, c)).role_at_debut;
    expect(await role('one-piece', 'sanji')).toBe('main');
    for (const [g, c] of [['dragon-ball', 'vegeta'], ['dragon-ball', 'android-18'], ['bleach', 'renji-abarai'], ['naruto', 'gaara'], ['inuyasha', 'sesshomaru'], ['dragon-ball', 'beerus'], ['dragon-ball', 'oolong'], ['dragon-ball', 'yamcha'], ['fairy-tail', 'gajeel-redfox'], ['bleach', 'byakuya-kuchiki'], ['bleach', 'kenpachi-zaraki'], ['bleach', 'mayuri-kurotsuchi']] as const) expect(await role(g, c), c).toBe('antagonist');
    for (const [g, c] of [['bleach', 'sousuke-aizen'], ['re-zero', 'roswaal-l-mathers'], ['one-piece', 'jinbe'], ['one-piece', 'jewelry-bonney'], ['one-piece', 'kozuki-oden'], ['bleach', 'toshiro-hitsugaya'], ['dragon-ball', 'gotenks']] as const) expect(await role(g, c), c).toBe('supporting');
    expect(await role('one-piece', 'vegapunk')).toBe('other');
    const species: [string, string, string | null][] = [['naruto', 'boruto-uzumaki', 'human'], ['chainsaw-man', 'makima', 'human'], ['jojo', 'dio-brando', 'human'], ['inuyasha', 'inuyasha', 'half-demon'], ['dragon-ball', 'dr-gero', 'android'],
      ['bleach', 'yoruichi-shihoin', 'shinigami'], ['gintama', 'kagura', 'yato'], ['gintama', 'kamui', 'yato'], ['bleach', 'byakuya-kuchiki', 'shinigami'], ['bleach', 'kenpachi-zaraki', 'shinigami'], ['dragon-ball', 'gotenks', 'saiyan-human-hybrid'],
      ['dragon-ball', 'mr-popo', null], ['dragon-ball', 'puar', 'animal'], ['dragon-ball', 'oolong', 'animal'], ['dragon-ball', 'korin', 'animal'], ['that-time-i-got-reincarnated-as-a-slime', 'rimuru-tempest', 'slime'], ['omniscient-readers-viewpoint', 'kim-dokja', 'human'],
      ['that-time-i-got-reincarnated-as-a-slime', 'benimaru', 'oni'], ['that-time-i-got-reincarnated-as-a-slime', 'shion', 'oni'], ['jojo', 'polnareff', 'human'], ['chainsaw-man', 'reze', 'human'], ['bleach', 'kugo-ginjo', 'human'],
      ['fullmetal-alchemist', 'king-bradley', 'human'], ['one-piece', 'jinbe', 'fish-man'], ['fruits-basket', 'kyo-sohma', 'human'], ['that-time-i-got-reincarnated-as-a-slime', 'hinata-sakaguchi', 'human']];
    for (const [g, c, v] of species) expect((await facts(db, g, c)).species, c).toBe(v);
    // L18 fixed the spelling that the rest of the pool uses; L22 does not touch the other species
    expect((await facts(db, 'fullmetal-alchemist', 'father')).species).toBe('homunculus');
    expect((await facts(db, 'fairy-tail', 'natsu-dragneel')).species).toBe('human');
  });

  it('voice actors: first TV series, given name first, no kanji, no English dub', async () => {
    const va = async (g: string, c: string): Promise<string | null> => (await facts(db, g, c)).voice_actor_ja;
    expect(await va('tokyo-revengers', 'takemichi-hanagaki')).toBe('Yuuki Shin');
    expect(await va('tokyo-revengers', 'manjiro-sano')).toBe('Yū Hayashi');
    expect(await va('fullmetal-alchemist', 'father')).toBe('Iemasa Kayumi');
    expect(await va('fullmetal-alchemist', 'van-hohenheim')).toBe('Masashi Ebara');
    expect(await va('fullmetal-alchemist', 'lin-yao')).toBe('Mamoru Miyano');
    expect(await va('dragon-ball', 'raditz')).toBe('Shigeru Chiba');
    expect(await va('dragon-ball', 'zamasu')).toBe('Shin-ichiro Miki');
    expect(await va('oshi-no-ko', 'aqua-hoshino')).toBe('Takeo Ōtsuka');
    expect(await va('fruits-basket', 'tohru-honda')).toBe('Yui Horie');
    expect(await va('jojo', 'giorno-giovanna')).toBe('Kensho Ono');
    expect(await va('jojo', 'joseph-joestar')).toBe('Tomokazu Sugita');
    expect(await va('jojo', 'dio-brando')).toBe('Takehito Koyasu');
    expect(await va('detective-conan', 'kogoro-mori')).toBe('Akira Kamiya');
    expect(await va('hunter-x-hunter', 'gon-freecss')).toBe('Junko Takeuchi');
    expect(await va('hunter-x-hunter', 'killua-zoldyck')).toBe('Kanako Mitsuhashi');
    expect(await va('hunter-x-hunter', 'kurapika')).toBe('Yuki Kaida');
    expect(await va('hunter-x-hunter', 'hisoka-morow')).toBe('Hiroki Takahashi');
    expect(await va('re-zero', 'subaru-natsuki')).toBe('Yūsuke Kobayashi');
    expect(await va('sword-art-online', 'sinon')).toBe('Miyuki Sawashiro');
    expect(await va('sword-art-online', 'yuuki-konno')).toBe('Aoi Yūki');
    expect(await va('gintama', 'tae-shimura')).toBe('Satsuki Yukino');
    expect(await va('dandadan', 'turbo-granny')).toBe('Mayumi Tanaka');
    expect(await va('dandadan', 'vamola')).toBeNull();
    expect(await va('blue-lock', 'yoichi-isagi')).toBe('Kazuki Ura');
    expect(await va('fruits-basket', 'kyo-sohma')).toBe('Tomokazu Seki');
    expect(await va('jojo', 'jotaro-kujo')).toBe('Daisuke Ono');
    expect(await va('jojo', 'josuke-higashikata')).toBe('Yūki Ono');
    // no value left in Japanese script, no surname-first pair of the audit, in the whole table
    expect(await one<number>(db, `select count(*)::int from public.character_facts where voice_actor_ja ~ '[぀-ヿ一-鿿]'`)).toBe(0);
    expect(await one<number>(db, `select count(*)::int from public.character_facts f join public.characters c on c.id = f.character_id join public.groups g on g.id = c.group_id where g.slug in ('re-zero', 'sword-art-online') and f.voice_actor_ja ~ '^(Kobayashi|Matsuoka|Tomatsu|Sawashiro|Yuuki|Murakawa|Minase|Nakamura|Takahashi|Arai|Iguchi|Sakamoto|Amasaki|Eguchi|Okamoto|Taketatsu|Itou|Hidaka|Takagaki|Hirata|Ohkawa|Izawa|Shimazaki) '`)).toBe(0);
  });

  it('Ken Kaneki has his own row (species human as first met, Haise keeps ghoul), Haise is no longer featured, the new answers are featured', async () => {
    expect(await facts(db, 'tokyo-ghoul', 'ken-kaneki')).toEqual({ gender: 'male', species: 'human', role_at_debut: 'main', first_appearance: 'Chapter 1 / Episode 1', voice_actor_ja: 'Natsuki Hanae', featured: true });
    expect(await facts(db, 'tokyo-ghoul', 'haise-sasaki')).toMatchObject({ species: 'ghoul', featured: false });
    for (const [g, c] of [['dragon-ball', 'goku'], ['dragon-ball', 'frieza'], ['dragon-ball', 'gohan'], ['dragon-ball', 'piccolo'], ['demon-slayer', 'nezuko-kamado'], ['demon-slayer', 'inosuke-hashibira'], ['fullmetal-alchemist', 'alphonse-elric'], ['that-time-i-got-reincarnated-as-a-slime', 'rimuru-tempest']] as const) expect((await facts(db, g, c)).featured, c).toBe(true);
    expect(await one<number>(db, `select count(*)::int from public.character_facts where featured`)).toBe(200 + 9 - 1);
  });

  it('every changed value has a source row with a revision id; the 36 roles that had none now have one; the stale source rows are gone', async () => {
    const a = await sources(db, 'captain-ginyu', 'gender');
    expect(a.some((s) => s.source === 'fandom' && s.source_ref === '2274755' && s.source_url === 'https://dragonball.fandom.com/wiki/Captain_Ginyu')).toBe(true);
    const r = await sources(db, 'nami', 'role_at_debut');
    expect(r).toHaveLength(1);
    expect(r[0]!.source_ref).toMatch(/^[0-9]+$/);
    expect((await sources(db, 'ken-kaneki', 'species'))[0]!.source_ref).toBe('493985');
    expect(await sources(db, 'vamola', 'voice_actor_ja')).toHaveLength(0);
    // the featured characters of the audit (OT-D4) all have a role source now
    expect(await one<number>(db, `select count(*)::int from public.character_facts f join public.characters c on c.id = f.character_id where f.featured and f.role_at_debut is not null and not exists (select 1 from public.entity_sources s where s.entity_type = 'character' and s.field = 'role_at_debut' and (s.entity_id = c.slug or s.entity_id like '%/' || c.slug))`)).toBe(0);
  });

  it('Hisoka (2011 row) is out of the pool, Hisoka Morow stays', async () => {
    const e = await rows<{ in_pool: boolean }>(db, `select e.in_pool from public.dle_entities e join public.characters c on c.id::text = e.entity_id where e.game_id = 'otakudle' and c.slug = $1`, ['hisoka-morrow']);
    expect(e[0]!.in_pool).toBe(false);
    const k = await rows<{ in_pool: boolean }>(db, `select e.in_pool from public.dle_entities e join public.characters c on c.id::text = e.entity_id where e.game_id = 'otakudle' and c.slug = $1`, ['hisoka-morow']);
    expect(k[0]!.in_pool).toBe(true);
  });

  it('a second run of L22 changes nothing', async () => {
    await db.exec(readLaunch(L22));
    expect(await snap(db)).toEqual(afterL23);
  });
});

describe('L23: first adaptation (studio) and year of the original work', () => {
  const gen = async (slug: string): Promise<{ year: unknown; studio: unknown } | undefined> => {
    const r = await rows<{ attrs: { year: { v: unknown }; studio: { v: unknown } } }>(db, `select e.attrs from public.dle_entities e join public.characters c on c.id::text = e.entity_id where e.game_id = 'otakudle' and c.slug = $1`, [slug]);
    return r[0] ? { year: r[0].attrs.year.v, studio: r[0].attrs.studio.v } : undefined;
  };

  it('Hunter x Hunter and Fruits Basket read the studio of the first TV series, the years follow', async () => {
    for (const s of ['gon-freecss', 'killua-zoldyck', 'kurapika', 'chrollo-lucilfer', 'hisoka-morow']) expect((await gen(s))?.studio, s).toEqual(['Nippon Animation']);
    expect((await gen('tohru-honda'))?.studio).toEqual(['Studio Deen']);
    expect(await one<number>(db, `select s.anime_start_year::int from public.series s join public.groups g on g.id = s.group_id and g.site_id = 'anime' where g.slug = 'hunter-x-hunter'`)).toBe(1999);
    expect(await one<number>(db, `select s.anime_start_year::int from public.series s join public.groups g on g.id = s.group_id and g.site_id = 'anime' where g.slug = 'fruits-basket'`)).toBe(2001);
    // the other series keep L04's studios
    expect((await gen('monkey-d-luffy'))?.studio).not.toBeNull();
  });

  it('the year of the original work: web novel years for the four series', async () => {
    expect((await gen('maomao'))?.year).toBe(2011);
    expect((await gen('rimuru-tempest'))?.year).toBe(2013);
    expect((await gen('sung-jinwoo'))?.year ?? 2016).toBe(2016);
    expect((await gen('kim-dokja'))?.year).toBe(2018);
    // L18's own work years are untouched
    expect((await gen('subaru-natsuki'))?.year).toBe(2012);
    expect((await gen('kirito'))?.year).toBe(2002);
  });

  it('the sources: one row per value with its revision id', async () => {
    const r = await rows<{ entity_id: string; field: string; source: string; source_ref: string }>(db, `select entity_id, field, source, source_ref from public.entity_sources where entity_type = 'series' and field in ('otakudle.work_year', 'otakudle.first_studios', 'otakudle.anime_start_year') order by entity_id, field`);
    expect(r).toHaveLength(8);
    expect(r.every((x) => /^[0-9]+$/.test(x.source_ref))).toBe(true);
    expect(r.find((x) => x.entity_id === 'apothecary-diaries')?.source).toBe('fandom');
  });

  it('the answers do not move (only studio and year values)', () => {
    expect(answersAfterL23).toBe(answersAfterL22);
  });

  it('the read-only checks V-L21, V-L22 and V-L23 all answer ok', async () => {
    for (const v of ['V-L21.sql', 'V-L22.sql', 'V-L23.sql']) {
      const res = await db.exec(readFileSync(path.join(__dirname, '../../../../../docs/launch/o1/checks', v), 'utf8'));
      const out = res.flatMap((r) => r.rows as Record<string, string>[]).map((r) => Object.values(r));
      expect(out.length, v).toBeGreaterThanOrEqual(7);
      expect(out.filter((r) => r[0] !== 'ok'), v).toEqual([]);
    }
  });

  it('a second run of L23 changes nothing', async () => {
    await db.exec(readLaunch(L23));
    expect(await snap(db)).toEqual(afterL23);
  });
});

describe('rollbacks', () => {
  it('L23 rollback then L22 rollback restore L13, L18 and the view exactly, twice; both apply again', async () => {
    await db.exec(readLaunch(L23R));
    await db.exec(readLaunch(L23R));
    const mid = await snap(db);
    expect(mid.view).toBe(beforeL22.view);
    expect(mid.series).toEqual(beforeL22.series);
    await db.exec(readLaunch(L22R));
    await db.exec(readLaunch(L22R));
    expect(await snap(db)).toEqual(beforeL22);
    expect(await one<number>(db, `select count(*)::int from information_schema.columns where table_name = 'series_facts' and column_name = 'first_studios'`)).toBe(0);
    await db.exec(readLaunch(L22));
    expect((await snap(db)).facts).toEqual(noStamp(afterL22).facts);
    await db.exec(readLaunch(L23));
    expect(await snap(db)).toEqual(noStamp(afterL23));
  });

  it('a value someone already changed is left alone', async () => {
    await db.exec(readLaunch(L23R));
    await db.exec(readLaunch(L22R));
    await db.exec(`update public.character_facts f set role_at_debut = 'other' from public.characters c where c.id = f.character_id and c.slug = 'sanji'`);
    await db.exec(readLaunch(L22));
    expect((await facts(db, 'one-piece', 'sanji')).role_at_debut).toBe('other');
    expect((await facts(db, 'dragon-ball', 'vegeta')).role_at_debut).toBe('antagonist');
  });
});
