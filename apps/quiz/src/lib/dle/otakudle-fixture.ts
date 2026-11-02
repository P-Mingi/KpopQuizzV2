// Test code only (nothing in the app imports it): Otakudle on PGlite. The stand-ins of the production objects 011 needs, the real files 011, 018, 019 and 023, then either a small
// pool shaped like the launch files (`seedOtakudle`) or the real launch files L04 and L13 (`applyLaunchFiles`). The rules under test are always the real view of 023.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { MIGRATIONS, freshDb, readMigration } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');

/** A database as session G leaves it: no anime site yet, so the game row of 023 is not there. */
export async function afterSessionG(): Promise<PGlite> {
  const db = await freshDb(['018-entity-images.sql', '019-dle-core.sql', '020-dle-kpop-idol.sql']);
  await db.exec(`
    alter table public.groups add column site_id text not null default 'kpop' references public.sites(id), add column display_color text, add column text_color text;
    create table public.profiles (id uuid primary key);
    create table public.quizzes (id uuid primary key);
    create table public.trivia (id serial primary key, entity_kind text);
    create table public.entity_sources (
      id serial primary key, entity_type text not null, entity_id text not null, field text not null, source text not null, source_ref text,
      fetched_at timestamptz, unique (entity_type, entity_id, field, source)
    );
  `);
  await db.exec(readMigration('011-anime-series.sql'));
  await db.exec(readMigration('023-dle-otakudle.sql'));
  return db;
}

/** What L01 and J4 add: the anime site, then 023 again, which adds the game row. */
export async function afterJ4(db: PGlite): Promise<void> {
  await db.exec(`insert into public.sites values ('anime', 'bunnyverse.org/anime', 'OtakuQuiz', 'world', 'building', 2)`);
  await db.exec(readMigration('023-dle-otakudle.sql'));
}

export interface FixtureSeries { readonly slug: string; readonly title: string; readonly type?: string; readonly studios: unknown; readonly manga?: number | null; readonly anime?: number | null; readonly demographic?: string | null; readonly published?: boolean }
export interface FixtureCharacter {
  readonly series: string; readonly slug: string; readonly name: string; readonly gender?: string | null; readonly species?: string | null; readonly role?: string | null;
  readonly first?: string | null; readonly voice?: string | null; readonly status?: string; readonly spoiler?: number; readonly identity?: boolean; readonly arc?: number | null; readonly medium?: string | null;
  readonly aliases?: readonly string[]; readonly native?: string | null; readonly facts?: boolean;
}

// The shapes of L04: a season list (Attack on Titan), no seasons (One Piece, Bleach as 'Pierrot', Naruto as 'Studio Pierrot'), a mix (Fruits Basket), two studios and no seasons (Spy x Family),
// no studio at all (Kagurabachi), an anime original (Cowboy Bebop).
export const SERIES: readonly FixtureSeries[] = [
  { slug: 'attack-on-titan', title: 'Attack on Titan', studios: [{ name: 'Wit Studio', seasons: [1, 2, 3] }, { name: 'MAPPA', seasons: [4] }], manga: 2009, anime: 2013, demographic: 'shonen' },
  { slug: 'chainsaw-man', title: 'Chainsaw Man', studios: [{ name: 'MAPPA', seasons: [1] }], manga: 2018, anime: 2022, demographic: 'shonen' },
  { slug: 'one-piece', title: 'One Piece', studios: [{ name: 'Toei Animation' }], manga: 1997, anime: 1999, demographic: 'shonen' },
  { slug: 'naruto', title: 'Naruto', studios: [{ name: 'Studio Pierrot' }], manga: 1999, anime: 2002, demographic: 'shonen' },
  { slug: 'bleach', title: 'Bleach', studios: [{ name: 'Pierrot' }], manga: 2001, anime: 2004, demographic: 'shonen' },
  { slug: 'fruits-basket', title: 'Fruits Basket', studios: [{ name: 'TMS Entertainment', seasons: [1, 2, 3] }, { name: 'Studio Deen' }], manga: 1998, anime: 2001, demographic: 'shojo' },
  { slug: 'spy-x-family', title: 'Spy x Family', studios: [{ name: 'Wit Studio' }, { name: 'CloverWorks' }], manga: 2019, anime: 2022, demographic: 'shonen' },
  { slug: 'cowboy-bebop', title: 'Cowboy Bebop', type: 'anime_original', studios: [{ name: 'Sunrise', seasons: [1] }], manga: 1997, anime: 1998, demographic: 'none' },
  { slug: 'kagurabachi', title: 'Kagurabachi', type: 'manga', studios: [], manga: 2023, anime: null, demographic: 'shonen' },
  { slug: 'hidden-series', title: 'Hidden Series', studios: [{ name: 'Bones', seasons: [1] }], manga: 2000, anime: 2001, demographic: 'seinen', published: false },
];

const c = (series: string, slug: string, name: string, extra: Partial<FixtureCharacter> = {}): FixtureCharacter => ({
  series, slug, name, gender: 'male', species: 'human', role: 'main', first: 'Chapter 1', voice: `Voice of ${name}`, ...extra,
});

export const CHARACTERS: readonly FixtureCharacter[] = [
  c('attack-on-titan', 'eren', 'Eren Yeager'), c('attack-on-titan', 'mikasa', 'Mikasa Ackerman', { gender: 'female' }),
  c('attack-on-titan', 'hange', 'Hange Zoe', { gender: null, role: 'supporting' }),
  c('chainsaw-man', 'denji', 'Denji', { species: 'hybrid' }), c('chainsaw-man', 'power', 'Power', { gender: 'female', species: 'fiend', role: 'supporting' }),
  c('one-piece', 'luffy', 'Monkey D. Luffy', { native: 'モンキー・D・ルフィ', aliases: ['Straw Hat'] }), c('one-piece', 'zoro', 'Roronoa Zoro', { first: 'Chapter 3' }), c('one-piece', 'shanks', 'Shanks', { first: null }),
  c('naruto', 'naruto', 'Naruto Uzumaki'), c('naruto', 'sakura', 'Sakura Haruno', { gender: 'female' }),
  c('bleach', 'ichigo', 'Ichigo Kurosaki'), c('bleach', 'rukia', 'Rukia Kuchiki', { gender: 'female', species: 'shinigami', voice: null }),
  c('fruits-basket', 'tohru', 'Tohru Honda', { gender: 'female' }),
  c('spy-x-family', 'loid', 'Loid Forger'),
  c('cowboy-bebop', 'spike', 'Spike Spiegel'),
  // Never a target: no studio known; or a character arriving after a choice of "How far are you?".
  c('kagurabachi', 'chihiro', 'Chihiro Rokuhira'),
  c('one-piece', 'late-arc', 'Late Arc Rival', { arc: 5 }), c('one-piece', 'manga-only', 'Manga Only Rival', { medium: 'manga' }), c('one-piece', 'anime-only', 'Anime Only Rival', { medium: 'anime' }),
  // Never in the pool.
  c('one-piece', 'draft', 'Draft Rival', { status: 'draft' }), c('one-piece', 'spoiler', 'Spoiler Rival', { spoiler: 1 }), c('one-piece', 'identity', 'Identity Rival', { identity: true }),
  c('hidden-series', 'hidden', 'Hidden Rival'), c('one-piece', 'no-facts', 'No Facts Rival', { facts: false }),
];

/** The pool as the view must read it: every character above but the last five. */
export const FIXTURE_IN_POOL = CHARACTERS.length - 5;
/** The targets: in the pool, every column known, seen at every choice. */
export const FIXTURE_TARGETS = FIXTURE_IN_POOL - 5;

export async function seedOtakudle(db: PGlite, series: readonly FixtureSeries[] = SERIES, characters: readonly FixtureCharacter[] = CHARACTERS): Promise<void> {
  for (const s of series) {
    await db.query(`insert into public.groups (name, slug, site_id) values ($1, $2, 'anime')`, [s.title, s.slug]);
    await db.query(
      `insert into public.series (group_id, type, title_en, studios, anime_start_year, manga_start_year, status, published)
       values ((select id from public.groups where slug = $1), $2, $3, $4::jsonb, $5, $6, 'finished', $7)`,
      [s.slug, s.type ?? 'anime_manga', s.title, JSON.stringify(s.studios), s.anime ?? null, s.manga ?? null, s.published ?? true],
    );
    if (s.demographic) await db.query(`insert into public.series_facts (group_id, demographic) values ((select id from public.groups where slug = $1), $2)`, [s.slug, s.demographic]);
  }
  for (const x of characters) {
    await db.query(
      `insert into public.characters (group_id, slug, name, name_native, aliases, role, debut_arc_ord, debut_medium, spoiler_level, identity_spoiler, status)
       values ((select id from public.groups where slug = $1), $2, $3, $4, $5, 'main', $6, $7, $8, $9, $10)`,
      [x.series, x.slug, x.name, x.native ?? null, x.aliases ?? [], x.arc === undefined ? 1 : x.arc, x.medium === undefined ? 'both' : x.medium, x.spoiler ?? 0, x.identity ?? false, x.status ?? 'published'],
    );
    if (x.facts === false) continue;
    await db.query(
      `insert into public.character_facts (character_id, gender, species, role_at_debut, first_appearance, voice_actor_ja)
       values ((select c.id from public.characters c join public.groups g on g.id = c.group_id where g.slug = $1 and c.slug = $2), $3, $4, $5, $6, $7)`,
      [x.series, x.slug, x.gender ?? null, x.species ?? null, x.role ?? null, x.first ?? null, x.voice ?? null],
    );
  }
}

/** The real launch files of the series and of the facts (the two that matter to the pool), on top of the anime site. */
export async function applyLaunchFiles(db: PGlite): Promise<void> {
  await db.exec(readLaunch('L04-K1-series.sql'));
  await db.exec(readLaunch('L13-A1-character-facts.sql'));
}

/** n made-up adult idols, complete, as lot K1's columns read them (kpopdle-idol's real pool is production data). */
export async function seedIdols(db: PGlite, n: number): Promise<void> {
  await db.exec(`alter table public.idols add column if not exists gender text, add column if not exists debut_year integer`);
  await db.query(`insert into public.groups (name, slug, fandom_name, generation, inception_date, record_label) values ('Fixture Band', 'fixture-band', 'fans', '4th', '2019-01-01', 'Fixture Label') on conflict (slug) do nothing`);
  await db.query(
    `insert into public.idols (group_id, name, birth_date, nationality, gender, debut_year)
     select (select id from public.groups where slug = 'fixture-band'), 'Fixture ' || i, make_date(1995 + i % 8, 3, 1), 'South Korea', 'female', 2019 from generate_series(1, $1::int) as i`,
    [n],
  );
}

export const readActivation = (): string => readLaunch('L14-O1-dle-on.sql');
export const readActivationUndo = (): string => readLaunch('L14-O1-dle-on.rollback.sql');
export const readCheck = (file: string): string => readFileSync(path.resolve(MIGRATIONS, '../../launch/o1/checks', file), 'utf8');

/** The rows of a check file: ok or KO, what, the number found. */
export async function runCheck(db: PGlite, file: string): Promise<readonly (readonly [string, string, string])[]> {
  const results = await db.exec(readCheck(file));
  const r = results.find((x) => x.rows.length > 0);
  return (r?.rows ?? []).map((row) => Object.values(row as Record<string, string>) as unknown as readonly [string, string, string]);
}
