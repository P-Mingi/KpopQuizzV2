// Daily games of one series, the pages (CR-024, P2): /otakudle/one-piece and /otakudle/dragon-ball with their French twins. Closed behind dailyGuess like /otakudle; 8 columns each in the two languages;
// the hint slot that follows the key the server served; the table of the values that change in French; the chain Otakudle, One Piece, Dragon Ball; the two tiles on /otakudle; the SEO rows.
// The SQL side (024 and L15 on PGlite) is series-games.test.ts; this file reads the same files for the shapes the pages receive.
import { readFileSync } from 'node:fs';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REGISTRY, hubRouteAllow } from '@/lib/site/registry';
import { isKnownRouteFor, rewritesFor } from '@/lib/site/routing';

import { dleCopy, gameCopy, hintValueLabel, valueLabel } from './copy';
import { DLE_GAMES, builtGames, dleGame, futurePaths, livePaths, localePath, seriesPath } from './games';
import { GAME_SEO, dleAlternates, dleRobots, gameAnswerBlock, gameJsonLd } from './seo';
import { parseShareImage } from './share-image';
import { shareText } from './share';
import { ALIGNMENT, HAKI, LABEL_FR, VALUE_FR, seriesValueLabel } from './value-i18n';
import { DLE_WORLDS, liveGame, liveModes, nextLiveMode, worldOf } from './worlds';

import type { DleGameId } from './games';
import type { DleDay, DleGuess, DleLocale, DlePool, DlePoolEntity, DleValue } from './types';

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));
vi.mock('@/components/hub/dle/dle-font', () => ({ dleMarquee: { variable: 'marquee-var' } }));

// The flag and the reads are the only things the pages take from outside: both are set by the test.
const gate = vi.hoisted(() => ({ open: false, day: null as unknown, pool: null as unknown }));
vi.mock('@/lib/site/hub/daily-guess', async (orig) => ({ ...(await orig<typeof import('@/lib/site/hub/daily-guess')>()), dleOpen: () => gate.open }));
vi.mock('@/lib/dle/read', async (orig) => ({
  ...(await orig<typeof import('@/lib/dle/read')>()),
  getDleDay: async () => gate.day,
  getDlePool: async () => gate.pool,
  getDleImages: async () => ({}),
  getDlePictures: async () => ({}),
  getAnimeSeriesSlugs: async () => ({}),
  getKpopGroupSlugs: async () => ({}),
}));

const ONE_PIECE: readonly string[] = ['gender', 'affiliation', 'devil_fruit_type', 'haki', 'bounty', 'height_cm', 'sea_of_origin', 'debut_arc'];
const DRAGON_BALL: readonly string[] = ['gender', 'race', 'affiliation', 'home_planet', 'universe', 'debut_series', 'debut_saga', 'alignment_at_debut'];
const SERIES_GAMES = ['otakudle-one-piece', 'otakudle-dragon-ball'] as const;
const COLUMNS: Readonly<Record<(typeof SERIES_GAMES)[number], readonly string[]>> = { 'otakudle-one-piece': ONE_PIECE, 'otakudle-dragon-ball': DRAGON_BALL };
const LOCALES: readonly DleLocale[] = ['en', 'fr'];

const repo = (rel: string): string => readFileSync(new URL(`../../../../../${rel}`, import.meta.url), 'utf8');
const app = (rel: string): string => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

// ---- the shapes of the data: values as L15 stores them (a few real rows)

const v = (value: DleValue['v'], l?: string): DleValue => ({ v: value, ...(l ? { l } : {}) });
const KID = 'Marines';

function entity(id: string, name: string, attrs: Record<string, DleValue>): DlePoolEntity {
  return { id, name, attrs, thumb: null, search: [name] };
}

const LUFFY = entity('1', 'Monkey D. Luffy', {
  gender: v('male'), affiliation: v(['Straw Hat Pirates', 'Straw Hat Grand Fleet', 'Four Emperors', 'Clan of D.']), devil_fruit_type: v('Zoan'), haki: v(['observation', 'armament', 'conqueror']),
  bounty: v(3000000000), height_cm: v(174), sea_of_origin: v('East Blue'), debut_arc: v(1, 'Romance Dawn'),
});
const ZORO = entity('2', 'Roronoa Zoro', {
  gender: v('male'), affiliation: v(['Straw Hat Pirates']), devil_fruit_type: v('none'), haki: v(['observation', 'armament', 'conqueror']),
  bounty: v(1111000000), height_cm: v(181), sea_of_origin: v('East Blue'), debut_arc: v(1, 'Romance Dawn'),
});
const MAKINO = entity('3', 'Makino', {
  gender: v('female'), affiliation: v([KID]), devil_fruit_type: v('none'), haki: v(['none']),
  bounty: v(0, 'No bounty'), height_cm: v(170), sea_of_origin: v('East Blue'), debut_arc: v(1, 'Romance Dawn'),
});
const OP_POOL: DlePool = {
  game: 'otakudle-one-piece', universe: 'anime',
  attributes: ONE_PIECE.map((key) => ({ key, kind: (['bounty', 'height_cm'].includes(key) ? 'number' : key === 'debut_arc' ? 'ordinal' : ['affiliation', 'haki'].includes(key) ? 'multi' : 'single') as 'single', near: null })),
  entities: [LUFFY, ZORO, MAKINO],
};

const GOKU = entity('10', 'Son Goku', {
  gender: v('male'), race: v('Saiyan'), affiliation: v(['Dragon Team']), home_planet: v('Planet Vegeta'), universe: v(7),
  debut_series: v(1, 'Dragon Ball'), debut_saga: v(1, 'Dragon Ball: Emperor Pilaf Saga'), alignment_at_debut: v('good'),
});
const FRIEZA = entity('11', 'Frieza', {
  gender: v('male'), race: v('Frieza Race'), affiliation: v(['Frieza Force']), home_planet: v(null), universe: v(7),
  debut_series: v(2, 'Dragon Ball Z'), debut_saga: v(11, 'Dragon Ball Z: Namek and Captain Ginyu Sagas'), alignment_at_debut: v('evil'),
});
const DB_POOL: DlePool = {
  game: 'otakudle-dragon-ball', universe: 'anime',
  attributes: DRAGON_BALL.map((key) => ({ key, kind: (['universe'].includes(key) ? 'number' : ['debut_series', 'debut_saga'].includes(key) ? 'ordinal' : key === 'affiliation' ? 'multi' : 'single') as 'single', near: null })),
  entities: [GOKU, FRIEZA],
};

const DAY = (game: string): DleDay => ({
  game, now: '2026-11-03T10:00:00Z', date: '2026-11-03', game_no: 4, seconds_left: 3600, stats: null, play: null,
  yesterday: { date: '2026-11-02', game_no: 3, answer: game === 'otakudle-one-piece' ? LUFFY : GOKU },
});

const guess = (e: DlePoolEntity, statuses: readonly ('correct' | 'near' | 'wrong' | 'unknown')[], arrows: readonly ('up' | 'down' | null)[] = []): DleGuess => ({
  id: e.id, result: Object.keys(e.attrs).map((key, i) => ({ key, status: statuses[i] ?? 'wrong', arrow: arrows[i] ?? null })),
});

afterEach(() => { gate.open = false; gate.day = null; gate.pool = null; });

// ---------------------------------------------------------------------------------------------------------------------------------

describe('the two games as data', () => {
  it('ids, addresses, brand and the words of what the player guesses; never the name Onepiecedle', () => {
    expect(SERIES_GAMES.map((id) => dleGame(id).path)).toEqual(['/otakudle/one-piece', '/otakudle/dragon-ball']);
    expect(dleGame('otakudle-one-piece').guess).toEqual({ en: 'One Piece character of the day', fr: 'Le personnage One Piece du jour' });
    expect(dleGame('otakudle-dragon-ball').guess).toEqual({ en: 'Dragon Ball character of the day', fr: 'Le personnage Dragon Ball du jour' });
    for (const id of SERIES_GAMES) {
      const g = dleGame(id);
      expect(g.brand).toBe('Otakudle');
      expect(g.universe).toBe('anime');
      expect(g.built).toBe(true);
      expect(worldOf(id).id).toBe('otakudle');
    }
    expect(dleGame('otakudle').series).toBeUndefined();
    expect(dleGame('otakudle-one-piece').series).toEqual({ slug: 'one-piece', name: 'One Piece' });
    // Every file this lot adds or changes in the app: the word the owner banned is nowhere.
    const files = [
      'lib/dle/games.ts', 'lib/dle/copy.ts', 'lib/dle/seo.ts', 'lib/dle/worlds.ts', 'lib/dle/value-i18n.ts', 'components/hub/dle/dle-game.tsx', 'components/hub/dle/dle-game-page.tsx',
      'app/sites/[site]/(hub)/otakudle/one-piece/page.tsx', 'app/sites/[site]/(hub)/fr/otakudle/dragon-ball/page.tsx',
    ];
    for (const f of files) expect(app(f), f).not.toMatch(/onepiecedle|dragonballdle/i);
  });

  it('the hint slots: One Piece the Devil Fruit name at 5 then the initial at 10; Dragon Ball one slot at 5 that takes the technique or the voice actor, then the initial at 10', () => {
    expect(dleGame('otakudle-one-piece').hints).toEqual([{ key: 'devil_fruit_name', after: 5 }, { key: 'initial', after: 10 }]);
    expect(dleGame('otakudle-dragon-ball').hints).toEqual([{ key: 'signature_technique', or: ['signature_technique', 'voice_actor_ja'], after: 5 }, { key: 'initial', after: 10 }]);
  });

  it('the columns of the pages are the columns of 024, in its order, and its hint keys and thresholds', () => {
    const sql = repo('docs/pending-migrations/multisite/024-dle-series-games.sql');
    for (const id of SERIES_GAMES) {
      const keys = [...sql.matchAll(new RegExp(`\\('${id}', '([a-z_]+)', '(?:single|multi|number|ordinal)', (\\d+)::smallint`, 'g'))].sort((a, b) => Number(a[2]) - Number(b[2])).map((m) => m[1]);
      expect(keys, id).toEqual(COLUMNS[id]);
      for (const l of LOCALES) expect(Object.keys(gameCopy(id, l).columns), `${id} ${l}`).toEqual(COLUMNS[id]);
    }
    expect(sql).toContain("('otakudle-one-piece', 'dle_src_otakudle_one_piece', 120, 40, '{devil_fruit_name,initial}'::text[], '{5,10}'::integer[])");
    expect(sql).toContain("('otakudle-dragon-ball', 'dle_src_otakudle_dragon_ball', 120, 30, '{signature_technique,voice_actor_ja,initial}'::text[], '{5,5,10}'::integer[])");
  });

  it('they are built: the hub opens their four addresses with the flag, the sitemap and the share image know them, nothing else changes', () => {
    expect(builtGames().map((g) => g.id)).toEqual(['kpopdle-idol', 'otakudle', 'otakudle-one-piece', 'otakudle-dragon-ball']);
    for (const p of ['/otakudle/one-piece', '/otakudle/dragon-ball', '/fr/otakudle/one-piece', '/fr/otakudle/dragon-ball']) expect(livePaths()).toContain(p);
    expect(seriesPath('one-piece', 'fr')).toBe('/fr/otakudle/one-piece');
    expect(futurePaths()).toContain('/otakudle/{series}');
    expect(parseShareImage('otakudle-one-piece', 'fr', '2-3-8')).toMatchObject({ locale: 'fr', counts: [2, 3, 8] });
    expect(parseShareImage('otakudle-dragon-ball', 'en', '1')?.game.path).toBe('/otakudle/dragon-ball');
    expect(rewritesFor('hub').filter((r) => r.has).map((r) => r.destination)).toEqual(expect.arrayContaining([
      '/sites/hub/dle-share/en/otakudle-one-piece/:r', '/sites/hub/dle-share/fr/otakudle-dragon-ball/:r',
    ]));
    // Launch day (2026-11-07, RUNBOOK K8c): the hub's flag is on, so its route map carries the four addresses.
    expect(REGISTRY.hub.features.dailyGuess).toBe(true);
    for (const p of ['/otakudle/one-piece', '/otakudle/dragon-ball', '/fr/otakudle/one-piece', '/fr/otakudle/dragon-ball']) expect(REGISTRY.hub.routes.allow, p).toContain(p);
    expect(new Set(DLE_GAMES.map((g) => g.path)).size).toBe(DLE_GAMES.length);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------

describe('the words, in English and French', () => {
  it('every column has its label, help, close rule and source; every hint key of the game has its label; no dash of the banned kind', () => {
    for (const id of SERIES_GAMES) {
      for (const l of LOCALES) {
        const w = gameCopy(id, l);
        for (const k of COLUMNS[id]) {
          const c = w.columns[k]!;
          expect([k, c.label, c.help, c.near, c.source].every(Boolean), `${id} ${l} ${k}`).toBe(true);
        }
        for (const h of dleGame(id).hints) for (const key of h.or ?? [h.key]) expect(w.hints[key], `${id} ${l} ${key}`).toBeTruthy();
        expect(w, `${id} ${l}: no "How far are you?" (Otakudle has none either since CR-026)`).not.toHaveProperty('progress');
        expect(w.h1).toContain(dleGame(id).series!.name);
        expect(w.how1).toMatch(/5 (and|et) 10/);
        expect(w.dlgHow3).toMatch(/5 (and|et) 10/);
        expect(JSON.stringify({ ...w, marquee: w.marquee(4) })).not.toMatch(/[\u2013\u2014]/);
      }
    }
  });

  it('the column labels are the eight of the owner, in French too', () => {
    const labels = (id: DleGameId, l: DleLocale): string[] => Object.values(gameCopy(id, l).columns).map((c) => c.label);
    expect(labels('otakudle-one-piece', 'en')).toEqual(['Gender', 'Affiliation', 'Devil Fruit', 'Haki', 'Bounty', 'Height', 'Sea of origin', 'Debut arc']);
    expect(labels('otakudle-one-piece', 'fr')).toEqual(['Genre', 'Affiliation', 'Fruit du démon', 'Haki', 'Prime', 'Taille', 'Mer d’origine', 'Arc de début']);
    expect(labels('otakudle-dragon-ball', 'en')).toEqual(['Gender', 'Race', 'Affiliation', 'Home planet', 'Universe', 'Debut series', 'Debut saga', 'Good or evil']);
    expect(labels('otakudle-dragon-ball', 'fr')).toEqual(['Genre', 'Race', 'Affiliation', 'Planète d’origine', 'Univers', 'Série de début', 'Saga de début', 'Gentil ou méchant']);
  });

  it('the title, the description and the answer block follow the rules of section 11 (title with the suffix at 60 or fewer, description 120 to 160, answer 40 to 60 words with the date)', () => {
    for (const id of SERIES_GAMES) {
      const seo = GAME_SEO[id]!;
      for (const l of LOCALES) {
        expect(`${seo.title[l]} | Bunnyverse`.length, `${id} ${l} title`).toBeLessThanOrEqual(60);
        expect(seo.description[l].length, `${id} ${l} description`).toBeGreaterThanOrEqual(120);
        expect(seo.description[l].length, `${id} ${l} description`).toBeLessThanOrEqual(160);
        expect(`${seo.title[l]} ${seo.description[l]}`).not.toMatch(/Bunnyverse|onepiecedle|[\u2013\u2014]/i);
        const block = gameAnswerBlock(id, l, 28, '2026-11-03');
        const words = block.split(/\s+/).length;
        expect(words, `${id} ${l} answer block`).toBeGreaterThanOrEqual(40);
        expect(words, `${id} ${l} answer block`).toBeLessThanOrEqual(60);
        expect(block).toContain('28');
        expect(block).toMatch(/2026/);
      }
    }
    expect(new Set(SERIES_GAMES.flatMap((id) => LOCALES.map((l) => GAME_SEO[id]!.description[l]))).size).toBe(4);
    const j = gameJsonLd('otakudle-one-piece', 'fr');
    expect(j.url).toBe('https://bunnyverse.org/fr/otakudle/one-piece');
    expect(j.name).toBe('Otakudle Le personnage One Piece du jour');
    expect(JSON.stringify(j)).not.toMatch(/aggregateRating|numberOfPlayers/);
  });

  it('the share text names the game and the series, never the answer', () => {
    const g = [guess(ZORO, ['correct', 'correct', 'wrong', 'correct', 'wrong', 'wrong', 'correct', 'correct']), guess(LUFFY, Array(8).fill('correct'))];
    expect(shareText(dleGame('otakudle-one-piece'), 4, g, true, 'bunnyverse.org/otakudle/one-piece', 'en')).toBe(
      'Otakudle #4 · One Piece character of the day · found in 2 guesses\n5/8 · 8/8\nbunnyverse.org/otakudle/one-piece',
    );
    expect(shareText(dleGame('otakudle-dragon-ball'), 4, g, false, 'bunnyverse.org/fr/otakudle/dragon-ball', 'fr')).toBe(
      'Otakudle #4 · Le personnage Dragon Ball du jour · abandon\n5/8 · 8/8\nbunnyverse.org/fr/otakudle/dragon-ball',
    );
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------

describe('the table of the values that change in French', () => {
  it('the ones of the owner: crews, Marines, series, good and evil, no Devil Fruit, no bounty, male and female', () => {
    expect(seriesValueLabel('affiliation', 'Straw Hat Pirates', 'fr')).toBe('Équipage du Chapeau de paille');
    expect(seriesValueLabel('affiliation', 'Marines', 'fr')).toBe('Marine');
    expect(seriesValueLabel('alignment_at_debut', 'good', 'fr')).toBe('Gentil');
    expect(seriesValueLabel('alignment_at_debut', 'evil', 'fr')).toBe('Méchant');
    expect(seriesValueLabel('alignment_at_debut', 'good', 'en')).toBe('Good');
    expect(seriesValueLabel('bounty', 0, 'fr', 'No bounty')).toBe('Pas de prime');
    expect(seriesValueLabel('bounty', 0, 'en', 'No bounty')).toBe('No bounty');
    expect(hintValueLabel('No Devil Fruit', 'fr')).toBe('Pas de fruit du démon');
    expect(hintValueLabel('No Devil Fruit', 'en')).toBe('No Devil Fruit');
    expect(hintValueLabel('Gum-Gum Fruit', 'fr')).toBe('Gum-Gum Fruit');
    expect(valueLabel('gender', 'male', 'en', { series: true })).toBe('Male');
    expect(valueLabel('gender', 'female', 'fr', { series: true })).toBe('Féminin');
    expect(valueLabel('gender', 'male', 'fr', { series: true })).toBe('Masculin');
    // The games across all series keep their words: a series name changes in French only when it is shown, and a role of Kpopdle is unchanged.
    expect(valueLabel('series', 'Attack on Titan', 'fr')).toBe('L’Attaque des Titans');
    expect(valueLabel('series', 'Attack on Titan', 'en')).toBe('Attack on Titan');
    expect(valueLabel('series', 'Naruto', 'fr')).toBe('Naruto');
    expect(valueLabel('gender', 'male', 'en')).toBe('Male');
    expect(valueLabel('gender', 'female', 'en')).toBe('Female');
    expect(valueLabel('gender', 'male', 'fr')).toBe('Masculin');
    expect(valueLabel('role', 'supporting', 'fr')).toBe('Secondaire');
  });

  it('most values stay identical; a character, a Devil Fruit or a technique is never translated; a French word is never an English word in disguise', () => {
    for (const same of ['Saiyan', 'East Blue', 'Grand Line', 'Zoan', 'Logia', 'Paramecia', 'Namek', 'Majin']) {
      expect(seriesValueLabel('race', same, 'fr'), same).toBe(same);
      expect(seriesValueLabel('sea_of_origin', same, 'fr'), same).toBe(same);
    }
    expect(seriesValueLabel('devil_fruit_type', 'Zoan', 'fr')).toBe('Zoan');
    expect(seriesValueLabel('devil_fruit_type', 'none', 'fr')).toBe('Aucun');
    expect(seriesValueLabel('devil_fruit_type', 'none', 'en')).toBe('None');
    expect(hintValueLabel('Kamehameha', 'fr')).toBe('Kamehameha');
    expect(valueLabel('affiliation', ['Straw Hat Pirates', 'Marines'], 'en', { series: true })).toBe('Straw Hat Pirates, Marines');
    expect(valueLabel('affiliation', ['Straw Hat Pirates', 'Marines'], 'fr', { series: true })).toBe('Équipage du Chapeau de paille, Marine');
    for (const [en, fr] of Object.entries(VALUE_FR)) {
      expect(fr, en).not.toBe(en);
      expect(`${en}${fr}`, en).not.toMatch(/[\u2013\u2014]/);
    }
    for (const [en, fr] of Object.entries(LABEL_FR)) expect(fr, en).not.toBe(en);
    expect(Object.keys(ALIGNMENT.fr)).toEqual(Object.keys(ALIGNMENT.en));
    expect(Object.keys(HAKI.fr)).toEqual(Object.keys(HAKI.en));
  });

  it('numbers: a bounty and a height in the number format of the language; a stored label (an arc, a saga) is the cell, the saga without its series', () => {
    expect(seriesValueLabel('bounty', 3000000000, 'en')).toBe('3 billion\u00A0\u0E3F');
    expect(seriesValueLabel('bounty', 3000000000, 'fr')).toBe('3 milliards\u00A0\u0E3F');
    expect(seriesValueLabel('height_cm', 174, 'en')).toBe('174 cm');
    expect(seriesValueLabel('universe', 7, 'fr')).toBe('Univers 7');
    expect(seriesValueLabel('universe', 7, 'en')).toBe('Universe 7');
    expect(seriesValueLabel('debut_arc', 22, 'en', 'Water 7')).toBe('Water 7');
    expect(seriesValueLabel('debut_series', 4, 'fr', 'Dragon Ball Super')).toBe('Dragon Ball Super');
    expect(seriesValueLabel('debut_saga', 10, 'en', 'Dragon Ball Z: Saiyan Saga')).toBe('Saiyan Saga');
    expect(seriesValueLabel('debut_saga', 28, 'en', 'Dragon Ball Daima')).toBe('Dragon Ball Daima');
    expect(seriesValueLabel('whatever', 1, 'en')).toBeNull();
  });

  it('every value of the real file L15 reads in both languages: no empty cell, no raw token', () => {
    const file = repo('docs/pending-migrations/multisite/launch/L15-A2-series-games.sql');
    const rows = [...file.matchAll(/, '(otakudle-[a-z-]+)', '(\{.*?\})'::jsonb, '(\{.*?\})'::jsonb, (?:true|false)\)/g)];
    expect(rows.length).toBeGreaterThan(50);
    const seen = new Set<string>();
    for (const [, game, attrs, hints] of rows) {
      const a = JSON.parse(attrs!.replace(/''/g, "'")) as Record<string, DleValue>;
      expect(Object.keys(a), game).toEqual(COLUMNS[game as (typeof SERIES_GAMES)[number]]);
      for (const [key, value] of Object.entries(a)) {
        if (value.v === null) continue;
        for (const l of LOCALES) {
          const text = valueLabel(key, value.v, l, { series: true, ...(value.l ? { label: value.l } : {}) });
          expect(text, `${game} ${key} ${l}`).not.toBe('');
          if (['gender', 'haki', 'alignment_at_debut', 'devil_fruit_type'].includes(key)) expect(text, `${game} ${key} ${l} ${JSON.stringify(value.v)}`).not.toMatch(/^(male|female|none|good|evil|observation|armament|conqueror)$/);
          // The longest saga of the data is 54 characters once its series is cut off: it wraps on four lines of a cell (the 12 px text of a long value), it never overflows it.
          if (key === 'debut_saga') expect(text.length, text).toBeLessThanOrEqual(56);
          seen.add(`${key}:${text}`);
        }
      }
      const h = JSON.parse(hints!.replace(/''/g, "'")) as Record<string, string>;
      for (const value of Object.values(h)) expect(hintValueLabel(value, 'fr')).not.toBe('');
    }
    expect(seen.has('bounty:No bounty')).toBe(true);
    expect(seen.has('bounty:Pas de prime')).toBe(true);
    expect(seen.has('alignment_at_debut:Gentil')).toBe(true);
    expect([...seen].some((x) => x.startsWith('affiliation:Équipage du Chapeau de paille'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------

describe('the hint slot follows the key the server served', () => {
  it('Dragon Ball: pending words before it opens, then the label of the technique or of the voice actor, and the value of the one served', async () => {
    const { hintLabel, servedHint } = await import('@/components/hub/dle/dle-game');
    const slot = dleGame('otakudle-dragon-ball').hints[0]!;
    const initial = dleGame('otakudle-dragon-ball').hints[1]!;
    for (const l of LOCALES) {
      const w = gameCopy('otakudle-dragon-ball', l);
      expect(servedHint(slot, [], l)).toBeNull();
      expect(hintLabel(w, slot, null)).toBe(w.hintsPending!.signature_technique);
      const technique = servedHint(slot, [{ key: 'signature_technique', value: 'Kamehameha' }], l)!;
      expect(technique).toEqual({ key: 'signature_technique', value: 'Kamehameha' });
      expect(hintLabel(w, slot, technique.key)).toBe(w.hints.signature_technique);
      const actor = servedHint(slot, [{ key: 'voice_actor_ja', value: 'Masako Nozawa' }], l)!;
      expect(actor).toEqual({ key: 'voice_actor_ja', value: 'Masako Nozawa' });
      expect(hintLabel(w, slot, actor.key)).toBe(w.hints.voice_actor_ja);
      expect(w.hints.signature_technique).not.toBe(w.hints.voice_actor_ja);
      // The initial is another slot: it does not take the technique's value, nor the technique its.
      expect(servedHint(initial, [{ key: 'signature_technique', value: 'x' }], l)).toBeNull();
      expect(servedHint(slot, [{ key: 'initial', value: 'G' }], l)).toBeNull();
    }
    expect(gameCopy('otakudle-dragon-ball', 'en').hints.voice_actor_ja).toBe('Japanese voice actor');
    expect(gameCopy('otakudle-dragon-ball', 'fr').hints.voice_actor_ja).toBe('Doubleur japonais');
  });

  it('One Piece: the Devil Fruit name, "No Devil Fruit" said in French for a character who has none', async () => {
    const { hintLabel, servedHint } = await import('@/components/hub/dle/dle-game');
    const slot = dleGame('otakudle-one-piece').hints[0]!;
    expect(servedHint(slot, [{ key: 'devil_fruit_name', value: 'No Devil Fruit' }], 'en')).toEqual({ key: 'devil_fruit_name', value: 'No Devil Fruit' });
    expect(servedHint(slot, [{ key: 'devil_fruit_name', value: 'No Devil Fruit' }], 'fr')).toEqual({ key: 'devil_fruit_name', value: 'Pas de fruit du démon' });
    expect(hintLabel(gameCopy('otakudle-one-piece', 'en'), slot, null)).toBe('Devil Fruit name');
    expect(hintLabel(gameCopy('otakudle-one-piece', 'fr'), slot, null)).toBe('Nom du fruit du démon');
  });

  it('the page draws two slots for each game, locked, with the thresholds 5 and 10 in the HTML', async () => {
    const { DleGame } = await import('@/components/hub/dle/dle-game');
    for (const id of SERIES_GAMES) {
      for (const l of LOCALES) {
        const html = renderToStaticMarkup(createElement(DleGame, { locale: l, game: id, gameNo: 4, stats: null, pool: id === 'otakudle-one-piece' ? OP_POOL : DB_POOL, pictures: {}, quizLinks: {}, kpopName: 'OtakuQuiz' }));
        expect(html.match(/class="hub-dle-hint"/g), `${id} ${l}`).toHaveLength(2);
        expect(html).toContain('hub-dle-hintgrid-2');
        expect(html).toContain(dleCopy(l).hintIn(5));
        expect(html).toContain(dleCopy(l).hintIn(10));
        expect(html).toContain(l === 'fr' ? 'après 5 et 10 erreurs' : 'after 5 and 10 mistakes');
      }
    }
    const db = renderToStaticMarkup(createElement(DleGame, { locale: 'en', game: 'otakudle-dragon-ball', gameNo: 4, stats: null, pool: DB_POOL, pictures: {}, quizLinks: {}, kpopName: 'OtakuQuiz' }));
    expect(db).toContain('Technique or voice actor');
    expect(db).not.toContain('Signature technique');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------

describe('the grid: 8 columns, the cells, the arrows', () => {
  it('8 column headers (and the name) in English and French, for each game', async () => {
    const { DleGrid } = await import('@/components/hub/dle/dle-game');
    const words = { right: 'Right', near: 'Close', wrong: 'Wrong', unknown: 'Not comparable', up: 'the answer is higher', down: 'the answer is lower' };
    const cases = [
      { id: 'otakudle-one-piece' as const, pool: OP_POOL, rows: [guess(ZORO, ['correct', 'near', 'wrong', 'correct', 'wrong', 'wrong', 'correct', 'correct'], [null, null, null, null, 'up', 'down', null, null])] },
      { id: 'otakudle-dragon-ball' as const, pool: DB_POOL, rows: [guess(FRIEZA, ['correct', 'wrong', 'wrong', 'unknown', 'correct', 'wrong', 'wrong', 'wrong'], [null, null, null, null, null, 'up', 'down', null])] },
    ];
    for (const c of cases) {
      for (const l of LOCALES) {
        const w = gameCopy(c.id, l);
        const html = renderToStaticMarkup(createElement(DleGrid, {
          locale: l, game: c.id, pool: c.pool, guesses: c.rows, byId: new Map(c.pool.entities.map((e) => [e.id, e])), wonId: null, fresh: null, words,
        }));
        const heads = [...html.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]!.replace(/&#x27;/g, '’').replace(/&amp;/g, '&'));
        expect(heads, `${c.id} ${l}`).toEqual([w.rowHead, ...Object.values(w.columns).map((x) => x.label.replace(/'/g, '’'))]);
        expect(html.match(/role="img"/g), `${c.id} ${l} cells`).toHaveLength(8);
        expect(html).toContain('hub-dle-grid-wide');
      }
    }
  });

  it('the cells read in the words of the language: a bounty with its separators, "No bounty", a crew, an arc, a saga, an arrow', async () => {
    const { DleGrid } = await import('@/components/hub/dle/dle-game');
    const words = { right: 'Right', near: 'Close', wrong: 'Wrong', unknown: 'Not comparable', up: 'the answer is higher', down: 'the answer is lower' };
    const render = (id: DleGameId, l: DleLocale, pool: DlePool, e: DlePoolEntity, arrows: readonly ('up' | 'down' | null)[]): string => renderToStaticMarkup(createElement(DleGrid, {
      locale: l, game: id, pool, guesses: [guess(e, [], arrows)], byId: new Map(pool.entities.map((x) => [x.id, x])), wonId: null, fresh: null, words,
    }));
    const en = render('otakudle-one-piece', 'en', OP_POOL, LUFFY, [null, null, null, null, 'down', 'up']);
    expect(en).toContain('Straw Hat Pirates, Straw Hat Grand Fleet, Four Emperors, Clan of D.');
    expect(en).toContain('Observation, Armament, Conqueror');
    expect(en).toContain('3 billion\u00A0\u0E3F');
    expect(en).toContain('174 cm');
    expect(en).toContain('Romance Dawn');
    expect(en).toContain('Male');
    expect(en).toContain('the answer is lower');
    expect(en).toContain('the answer is higher');
    expect(en.match(/<svg/g)!.length).toBeGreaterThanOrEqual(2);
    const fr = render('otakudle-one-piece', 'fr', OP_POOL, MAKINO, []);
    expect(fr).toContain('Marine');
    expect(fr).not.toContain('Marines');
    expect(fr).toContain('Pas de prime');
    expect(fr).toContain('Aucun');
    expect(fr).toContain('Féminin');
    const none = render('otakudle-one-piece', 'en', OP_POOL, ZORO, []);
    expect(none).toContain('None');
    const dbEn = render('otakudle-dragon-ball', 'en', DB_POOL, GOKU, []);
    expect(dbEn).toContain('Emperor Pilaf Saga');
    expect(dbEn).not.toContain('Dragon Ball: Emperor');
    expect(dbEn).toContain('Universe 7');
    expect(dbEn).toContain('Good');
    const dbFr = render('otakudle-dragon-ball', 'fr', DB_POOL, FRIEZA, []);
    expect(dbFr).toContain('Armée de Freezer');
    expect(dbFr).toContain('Race de Freezer');
    expect(dbFr).toContain('Méchant');
    expect(dbFr).toContain('Namek and Captain Ginyu Sagas');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------

describe('the chain: Otakudle, then One Piece, then Dragon Ball; Dragon Ball is the last', () => {
  it('the next game of each', () => {
    expect(nextLiveMode('otakudle')?.game).toBe('otakudle-one-piece');
    expect(nextLiveMode('otakudle-one-piece')?.game).toBe('otakudle-dragon-ball');
    expect(nextLiveMode('otakudle-dragon-ball')).toBeNull();
    expect(nextLiveMode('kpopdle-idol')).toBeNull();
    const a = DLE_WORLDS.find((w) => w.id === 'otakudle')!;
    expect(liveModes(a).map((m) => liveGame(m)!.path)).toEqual(['/otakudle', '/otakudle/one-piece', '/otakudle/dragon-ball']);
  });

  it('the result of Otakudle and of One Piece offer the next game and no "all done"; the end offers the Burrow, the day done and the quiz of the series', async () => {
    const { DleAfter } = await import('@/components/hub/dle/dle-game');
    const render = (game: DleGameId, l: DleLocale, allDone: boolean, parent: string, href?: string): string => renderToStaticMarkup(createElement(DleAfter, {
      locale: l, game, quizHref: href, parentLabel: parent, kpopName: 'OtakuQuiz', allDone, clockText: '03:12:44',
    }));
    const t = dleCopy('en');
    const fromOtakudle = render('otakudle', 'en', false, 'Attack on Titan');
    expect(fromOtakudle).toContain('href="/otakudle/one-piece"');
    expect(fromOtakudle).toContain('One Piece character');
    expect(fromOtakudle).not.toContain(t.allDone);
    const fromOnePiece = render('otakudle-one-piece', 'en', true, 'One Piece', 'https://bunnyverse.org/anime/one-piece-quiz');
    expect(fromOnePiece).toContain('href="/otakudle/dragon-ball"');
    expect(fromOnePiece).toContain('Dragon Ball character');
    expect(fromOnePiece).not.toContain(t.allDone);
    expect(fromOnePiece).not.toContain('href="/daily"');
    expect(fromOnePiece).toContain('One Piece quiz');
    expect(fromOnePiece).toContain('href="https://bunnyverse.org/anime/one-piece-quiz"');
    for (const l of LOCALES) {
      const c = dleCopy(l);
      const last = render('otakudle-dragon-ball', l, true, 'Dragon Ball', 'https://bunnyverse.org/anime/dragon-ball-quiz');
      expect(last, l).toContain(c.allDone);
      expect(last, l).toContain(c.allDoneLine);
      expect(last, l).toContain(`href="${localePath('/daily', l)}"`);
      expect(last, l).toContain(c.backToBurrow);
      expect(last, l).toContain(c.quizOf('Dragon Ball'));
      expect(last, l).toContain('href="https://bunnyverse.org/anime/dragon-ball-quiz"');
      expect(last, l).not.toContain('href="/otakudle/');
      // Not every game finished on this device: the way back to the Burrow, no claim that the day is done.
      expect(render('otakudle-dragon-ball', l, false, 'Dragon Ball'), l).not.toContain(c.allDone);
    }
    expect(dleCopy('en').allDone).toBe('All done today');
    expect(dleCopy('en').allDoneLine).toBe('New puzzles at midnight UTC.');
    expect(dleCopy('fr').allDone).toBe('Tout est fait aujourd’hui');
    // Kpopdle has no such line: its result keeps the way back it always had.
    expect(render('kpopdle-idol', 'en', true, 'TWICE')).not.toContain(t.allDone);
  });

  it('the steps of each page: four, the current one marked, the series of the day still "soon"', async () => {
    const { DleGame } = await import('@/components/hub/dle/dle-game');
    for (const id of SERIES_GAMES) {
      for (const l of LOCALES) {
        const html = renderToStaticMarkup(createElement(DleGame, { locale: l, game: id, gameNo: 4, stats: null, pool: id === 'otakudle-one-piece' ? OP_POOL : DB_POOL, pictures: {}, quizLinks: {}, kpopName: 'OtakuQuiz' }));
        expect(html.match(/class="hub-dle-step"/g), `${id} ${l}`).toHaveLength(4);
        expect(html.match(/hub-dle-stepstate-soon/g)).toHaveLength(1);
        expect(html.match(/aria-current="step"/g)).toHaveLength(1);
        for (const href of ['/otakudle', '/otakudle/one-piece', '/otakudle/dragon-ball']) expect(html).toContain(`href="${localePath(href, l)}"`);
        expect(html.match(/<h1/g)).toHaveLength(1);
        expect(html).toContain(gameCopy(id, l).h1);
        expect(html).toContain(l === 'fr' ? `Otakudle ${dleGame(id).series!.name} n° 4` : `Otakudle ${dleGame(id).series!.name} no. 4`);
        expect(html).not.toContain('type="radio"');
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------

describe('the pages behind the flag', () => {
  const PAGES: readonly (readonly [string, DleGameId, DleLocale])[] = [
    ['otakudle/one-piece', 'otakudle-one-piece', 'en'], ['fr/otakudle/one-piece', 'otakudle-one-piece', 'fr'],
    ['otakudle/dragon-ball', 'otakudle-dragon-ball', 'en'], ['fr/otakudle/dragon-ball', 'otakudle-dragon-ball', 'fr'],
  ];
  type PageModule = { default: () => Promise<React.ReactElement>; generateMetadata: () => Promise<unknown> };
  const LOADERS: Readonly<Record<string, () => Promise<PageModule>>> = {
    otakudle: () => import('@/app/sites/[site]/(hub)/otakudle/page') as unknown as Promise<PageModule>,
    'fr/otakudle': () => import('@/app/sites/[site]/(hub)/fr/otakudle/page') as unknown as Promise<PageModule>,
    'otakudle/one-piece': () => import('@/app/sites/[site]/(hub)/otakudle/one-piece/page') as unknown as Promise<PageModule>,
    'fr/otakudle/one-piece': () => import('@/app/sites/[site]/(hub)/fr/otakudle/one-piece/page') as unknown as Promise<PageModule>,
    'otakudle/dragon-ball': () => import('@/app/sites/[site]/(hub)/otakudle/dragon-ball/page') as unknown as Promise<PageModule>,
    'fr/otakudle/dragon-ball': () => import('@/app/sites/[site]/(hub)/fr/otakudle/dragon-ball/page') as unknown as Promise<PageModule>,
  };
  const load = (rel: string): Promise<PageModule> => LOADERS[rel]!();

  it('each page file answers notFound() behind dleOpen in its metadata and in its body', () => {
    for (const [rel] of PAGES) expect(app(`app/sites/[site]/(hub)/${rel}/page.tsx`).match(/if \(!dleOpen\(\)[^)]*\) notFound\(\);/g)?.length, rel).toBe(2);
  });

  it('flag off: the four pages answer as any unknown URL, in the metadata and in the body', async () => {
    gate.open = false;
    for (const [rel] of PAGES) {
      const m = await load(rel);
      await expect((async () => m.generateMetadata())()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
      await expect((async () => m.default())()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    }
  });

  it('flag on: the page is drawn with one H1, the eight columns in the guide, the guide of the game, yesterday and the quiz of the series, in English and French', async () => {
    for (const [rel, id, l] of PAGES) {
      gate.open = true;
      gate.day = DAY(id);
      gate.pool = id === 'otakudle-one-piece' ? OP_POOL : DB_POOL;
      const m = await load(rel);
      const html = renderToStaticMarkup(await m.default());
      const w = gameCopy(id, l);
      const name = dleGame(id).series!.name;
      expect(html.match(/<h1/g), rel).toHaveLength(1);
      expect(html).toContain(w.h1);
      expect(html).toContain(w.howTitle);
      // the how-to table lists the eight columns, each with its rule and its source
      const rows = html.slice(html.indexOf('<tbody>', html.indexOf('hub-dle-howto')));
      for (const c of Object.values(w.columns)) expect(rows.replace(/&#x27;/g, '’'), `${rel} ${c.label}`).toContain(`<strong>${c.label.replace(/'/g, '’')}</strong>`);
      expect(html).toContain(gameAnswerBlock(id, l, (gate.pool as DlePool).entities.length, '2026-11-03'));
      // yesterday's answer, behind a native fold, with the name of the series and the link to its quiz
      expect(html).toContain('<details class="hub-dle-yfold">');
      expect(html).toContain(id === 'otakudle-one-piece' ? 'Monkey D. Luffy' : 'Son Goku');
      expect(html).toContain(`(${name})`);
      expect(html).toContain(`href="https://bunnyverse.org/anime/${dleGame(id).series!.slug}-quiz"`);
      expect(html).toContain(dleCopy(l).quizOf(name));
      // the pool in clear, in the words of the language
      expect(html).toContain(w.poolTitle);
      expect(html).toContain(id === 'otakudle-one-piece' ? (l === 'fr' ? 'Équipage du Chapeau de paille' : 'Straw Hat Pirates') : (l === 'fr' ? 'Armée de Freezer' : 'Frieza Force'));
      // the breadcrumb goes Burrow, Otakudle, the game; the hop to the other world
      expect(html).toContain(`href="${localePath('/daily', l)}"`);
      expect(html).toContain(`href="${localePath('/kpopdle', l)}"`);
      expect(html).toContain('application/ld+json');
      expect(html).not.toContain('hub-dle-seriesnav');
      expect(html).not.toMatch(/onepiecedle/i);
    }
  });

  it('flag on: the metadata is the page\'s own: title, canonical, hreflang both ways, index in English, noindex in French until the owner reviewed it', async () => {
    for (const [rel, id, l] of PAGES) {
      gate.open = true;
      gate.day = DAY(id);
      gate.pool = id === 'otakudle-one-piece' ? OP_POOL : DB_POOL;
      const m = await load(rel);
      const meta = await m.generateMetadata() as { title: string; description: string; alternates: { canonical: string; languages: Record<string, string> }; robots: { index: boolean } };
      const enPath = dleGame(id).path;
      expect(meta.title).toBe(GAME_SEO[id]!.title[l]);
      expect(meta.description).toBe(GAME_SEO[id]!.description[l]);
      expect(meta.alternates).toEqual(dleAlternates(enPath, l));
      expect(meta.alternates.canonical).toBe(l === 'fr' ? `/fr${enPath}` : enPath);
      expect(meta.alternates.languages).toEqual({ en: enPath, fr: `/fr${enPath}`, 'x-default': enPath });
      expect(meta.robots.index, `${rel} index`).toBe(l === 'en');
      expect(meta.robots).toEqual(dleRobots(l, true));
    }
    // a game with no pool says noindex, in English too
    gate.open = true;
    gate.day = null;
    gate.pool = null;
    const m = await load('otakudle/one-piece');
    expect((await m.generateMetadata() as { robots: { index: boolean } }).robots.index).toBe(false);
  });

  it('/otakudle shows two clear tiles to One Piece and Dragon Ball, in both languages; the pages of one series do not', async () => {
    gate.open = true;
    for (const l of LOCALES) {
      gate.day = DAY('otakudle');
      gate.pool = { game: 'otakudle', universe: 'anime', attributes: [{ key: 'series', kind: 'single', near: null }], entities: [entity('1', 'Eren Yeager', { series: v('Attack on Titan') })] };
      const m = await load(l === 'fr' ? 'fr/otakudle' : 'otakudle');
      const html = renderToStaticMarkup(await m.default());
      expect(html.match(/<h1/g)).toHaveLength(1);
      expect(html).toContain('hub-dle-seriesnav');
      expect(html.match(/class="hub-dle-seriestile"/g)).toHaveLength(2);
      expect(html).toContain(`href="${localePath('/otakudle/one-piece', l)}" class="hub-dle-seriestile"`);
      expect(html).toContain(`href="${localePath('/otakudle/dragon-ball', l)}" class="hub-dle-seriestile"`);
      expect(html).toContain(dleGame('otakudle-one-piece').guess[l]);
      expect(html).toContain(dleGame('otakudle-dragon-ball').guess[l]);
      expect(html).toContain(dleCopy(l).seriesTilesTitle);
      // the series name in French on /fr/otakudle, from the table
      expect(html).toContain(l === 'fr' ? 'L’Attaque des Titans' : 'Attack on Titan');
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------

describe('what the lot does not touch', () => {
  it('no kpop file and no kpopquiz.org page: the only shared file is the registry line that lists the built games', () => {
    const files = [
      'lib/dle/games.ts', 'lib/dle/copy.ts', 'lib/dle/value-i18n.ts', 'lib/dle/seo.ts', 'lib/dle/worlds.ts', 'lib/dle/types.ts', 'components/hub/dle/dle-game.tsx', 'components/hub/dle/dle-game-page.tsx',
      'components/hub/dle/dle-avatar.tsx', 'components/hub/dle/burrow-board.tsx', 'components/hub/dle/burrow-page.tsx', 'components/hub/dle/dle-tools.tsx', 'styles/sites/hub/dle.css',
    ];
    for (const f of files) {
      const text = app(f);
      expect(text, f).not.toMatch(/[\u2013\u2014]/);
      expect(text, f).not.toMatch(/from '@\/components\/(kpop|ux-v1\/kpop)/);
    }
    // The route map stays the one it always was with the flag off; since launch day (RUNBOOK K8c) the hub's is the one with the flag on, and kpop keeps its flag off.
    expect(hubRouteAllow({ dailyGuess: false })).not.toContain('/otakudle/one-piece');
    expect(REGISTRY.hub.routes.allow).toEqual(hubRouteAllow({ dailyGuess: true }));
    expect(REGISTRY.hub.routes.allow).toContain('/otakudle/one-piece');
    expect(REGISTRY.kpop.features.dailyGuess).toBe(false);
    for (const site of ['kpop', 'anime'] as const) expect(isKnownRouteFor(site, '/otakudle/one-piece', { v1: true, v12: true }), site).toBe(false);
  });
});
