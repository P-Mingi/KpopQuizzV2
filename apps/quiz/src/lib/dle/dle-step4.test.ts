// Daily games step 4: the pages of the Terrier. The client and the reads on the real SQL (PGlite, lot K1's columns as a stand-in), the device's data, the SEO of section 11, the routing, the screens
// rendered to HTML, and what the flag closes.
import { readFileSync } from 'node:fs';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { REGISTRY } from '@/lib/site/registry';
import { rewritesFor } from '@/lib/site/routing';

import { DleError, dleClient, errorCode, shareParam } from './client';
import { HINT_LABELS, IDOL_COLUMNS, OTAKUDLE_COLUMNS, dleCopy, gameCopy, valueLabel } from './copy';
import { dleGame, livePaths, localePath, SHARE_R_PATTERN } from './games';
import { FIXTURE_POOL_SIZE, kpopdleDb, rpcAs } from './game-fixture';
import {
  eraseData, exportData, gameStats, gamesLeftToday, getToken, importData, languageTarget, readHistory, readSettings, recordPlay, resetToken, universeStreak, writeSettings,
} from './local';
import { parseDay, parsePool, readDay, readKpopGroupSlugs, readPool } from './read';
import { BURROW_SEO, DLE_FR_REVIEWED, GAME_SEO, breadcrumbJsonLd, dleAlternates, dleSitemapRows, gameAnswerBlock, gameJsonLd, itemListJsonLd } from './seo';
import { parseShareImage } from './share-image';
import { DLE_WORLDS, liveGame, liveModes, worldHref, worldOf } from './worlds';

import type { PGlite } from '@electric-sql/pglite';
import type { KeyStore } from './local';
import type { DlePlayState } from './types';

// PGlite on a loaded runner: one timeout for the whole file, tests and hooks.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));
vi.mock('@/components/hub/dle/dle-font', () => ({ dleMarquee: { variable: 'marquee-var' } }));

const TODAY = new Date().toISOString().slice(0, 10);
const EPOCH = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

function store(): KeyStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); }, removeItem: (k) => { map.delete(k); } };
}

describe('the client and the reads on the real SQL', () => {
  let db: PGlite;
  let pool: Awaited<ReturnType<typeof readPool>>;
  let targetId: string;
  const anon = (fn: string, args: Record<string, unknown>) => rpcAs(db, fn, args);
  const serverDb = { rpc: anon };

  beforeAll(async () => {
    db = await kpopdleDb(EPOCH);
    pool = await readPool(serverDb, 'kpopdle-idol');
    const rows = await db.query<{ t: string }>(`select public.dle_target('kpopdle-idol', $1::date) as t`, [TODAY]);
    targetId = rows.rows[0]!.t;
  });

  it('dle_pool: 8 columns, the pool, never the target flag; a thumb path becomes a public URL, a bad one nothing', () => {
    expect(pool!.attributes.map((a) => a.key)).toEqual(['gender', 'group', 'agency', 'nationality', 'birth', 'debut', 'generation', 'role']);
    expect(pool!.entities).toHaveLength(FIXTURE_POOL_SIZE);
    const text = JSON.stringify(pool);
    expect(text).not.toContain('can_be_target');
    expect(text).not.toContain('hints');
    expect(parsePool({ attributes: [], entities: [{ id: '1', name: 'A', search: [], attrs: {}, thumb: 'kpop/idol/1/thumb.webp' }] })!.entities[0]!.thumb).toMatch(/\/storage\/v1\/object\/public\/.*kpop\/idol\/1\/thumb\.webp$/);
    expect(parsePool({ attributes: [], entities: [{ id: '1', name: 'A', search: [], attrs: {}, thumb: '../evil.webp' }] })!.entities[0]!.thumb).toBeNull();
    expect(parsePool(null)).toBeNull();
    expect(parseDay({ nope: 1 })).toBeNull();
  });

  it('the server read of dle_day has no play and no target of today', async () => {
    const day = await readDay(serverDb, 'kpopdle-idol');
    expect(day!.game_no).toBe(4);
    expect(day!.play).toBeNull();
    expect(JSON.stringify(day)).not.toContain(`"id":"${targetId}"`.replace('"id":', '"entity_id":'));
  });

  it('a whole play: the statuses come back, no target until it ends, hints by the server, the win recorded on the device', async () => {
    const s = store();
    const c = dleClient(anon, s);
    const day = await c.day('kpopdle-idol');
    expect(day.play).toBeNull();
    const wrong = pool!.entities.find((e) => e.id !== targetId)!;
    const p1 = await c.guess('kpopdle-idol', day.date, wrong.id);
    expect(p1.status).toBe('playing');
    expect(p1.target).toBeNull();
    expect(p1.guesses[0]!.result).toHaveLength(8);
    expect(p1.hints).toEqual([]);
    const resumed = await c.day('kpopdle-idol');
    expect(resumed.play!.guesses).toHaveLength(1);
    const p2: DlePlayState = await c.guess('kpopdle-idol', day.date, targetId);
    expect(p2.status).toBe('won');
    expect(p2.target!.id).toBe(targetId);
    expect(p2.guesses[1]!.result.every((x) => x.status === 'correct')).toBe(true);
  });

  it('give up: refused before a guess, then the answer', async () => {
    const c = dleClient(anon, store());
    const day = await c.day('kpopdle-idol');
    await expect(c.giveUp('kpopdle-idol', day.date)).rejects.toMatchObject({ code: 'dle_no_guess' });
    await c.guess('kpopdle-idol', day.date, pool!.entities.find((e) => e.id !== targetId)!.id);
    const over = await c.giveUp('kpopdle-idol', day.date);
    expect(over.status).toBe('given_up');
    expect(over.target!.id).toBe(targetId);
  });

  it('dle_token_taken: a new token, one more try, never the other account\'s play', async () => {
    const s = store();
    const first = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    s.setItem('dle:v1:token', first);
    await db.exec(`insert into auth.users (id) values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002') on conflict do nothing`);
    const asA = (fn: string, args: Record<string, unknown>) => rpcAs(db, fn, args, { sub: '00000000-0000-4000-8000-000000000001' });
    const asB = (fn: string, args: Record<string, unknown>) => rpcAs(db, fn, args, { sub: '00000000-0000-4000-8000-000000000002' });
    const a = dleClient(asA, s);
    const day = await a.day('kpopdle-idol');
    await a.guess('kpopdle-idol', day.date, pool!.entities.find((e) => e.id !== targetId)!.id);
    const b = dleClient(asB, s);
    const dayB = await b.day('kpopdle-idol');
    expect(dayB.play).toBeNull();
    expect(s.getItem('dle:v1:token')).not.toBe(first);
  });

  it('errors: unknown entity, unavailable game, the rate limit, a network failure', async () => {
    const c = dleClient(anon, store());
    const day = await c.day('kpopdle-idol');
    await expect(c.guess('kpopdle-idol', day.date, '999999')).rejects.toMatchObject({ code: 'dle_unknown_entity' });
    await expect(c.day('no-such-game')).rejects.toMatchObject({ code: 'dle_unavailable' });
    await expect(dleClient(() => Promise.reject(new Error('boom')), store()).day('x')).rejects.toBeInstanceOf(DleError);
    expect(errorCode('ERROR: dle_rate_limited')).toBe('dle_rate_limited');
    expect(errorCode('fetch failed')).toBe('dle_network');
    const limited = (fn: string, args: Record<string, unknown>) => rpcAs(db, fn, args, { ip: '203.0.113.9' });
    const r = dleClient(limited, store());
    let code: string | null = null;
    for (let i = 0; i < 45 && !code; i++) {
      try { await r.day('kpopdle-idol'); } catch (e) { code = (e as DleError).code; }
    }
    expect(code).toBe('dle_rate_limited');
  });

  it('a game that is off: the server read throws and the page wrapper reads it as null', async () => {
    await db.exec(`update public.dle_games set active = false where id = 'kpopdle-idol'`);
    await expect(readPool(serverDb, 'kpopdle-idol')).rejects.toThrow(/dle_unavailable/);
    await db.exec(`update public.dle_games set active = true where id = 'kpopdle-idol'`);
  });

  it('group slugs read with the site scope', async () => {
    const rows = [{ name: 'TWICE', slug: 'twice' }];
    const q = { select: () => q, eq: (c: string, v: string) => { expect([c, v]).toEqual(['site_id', 'kpop']); return q; }, order: () => q, range: async () => ({ data: rows, error: null }) };
    expect(await readKpopGroupSlugs({ from: () => q })).toEqual({ TWICE: 'twice' });
  });
});

describe('this device', () => {
  it('the token: the shape of dle_check, kept, replaced; garbage replaced; a storage that throws is survived', () => {
    const s = store();
    const t = getToken(s);
    expect(t).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(getToken(s)).toBe(t);
    expect(resetToken(s)).not.toBe(t);
    s.setItem('dle:v1:token', 'bad token');
    expect(getToken(s)).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    const broken: KeyStore = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); }, removeItem: () => { throw new Error('denied'); } };
    expect(getToken(broken)).toMatch(/^[A-Za-z0-9_-]{16,64}$/);
    expect(readHistory(broken)).toEqual({});
    expect(readSettings(broken).lang).toBe('auto');
    expect(() => eraseData(broken)).not.toThrow();
  });

  it('stats: plays, wins, average, first try, streaks, histogram with its last bucket', () => {
    const s = store();
    recordPlay(s, 'kpopdle-idol', '2026-11-01', { won: true, guesses: 1 });
    recordPlay(s, 'kpopdle-idol', '2026-11-02', { won: true, guesses: 3 });
    recordPlay(s, 'kpopdle-idol', '2026-11-03', { won: false, guesses: 2 });
    recordPlay(s, 'kpopdle-idol', '2026-11-05', { won: true, guesses: 12 });
    const g = gameStats(readHistory(s), 'kpopdle-idol', '2026-11-06');
    expect(g).toEqual({ plays: 4, wins: 3, average: 16 / 3, firstTry: 1, streak: 1, bestStreak: 3, histogram: [1, 0, 1, 0, 0, 0, 0, 1] });
    expect(gameStats(readHistory(s), 'kpopdle-idol', '2026-11-20').streak).toBe(0);
    expect(gameStats({}, 'kpopdle-idol', '2026-11-06').average).toBeNull();
    expect(universeStreak(readHistory(s), ['kpopdle-idol', 'kpopdle-group'], '2026-11-05')).toBe(1);
    // The built games are four since CR-024: Kpopdle Idol, Otakudle, Otakudle One Piece and Otakudle Dragon Ball.
    expect(gamesLeftToday(readHistory(s), '2026-11-05')).toBe(3);
    expect(gamesLeftToday(readHistory(s), '2026-11-06')).toBe(4);
    recordPlay(s, 'otakudle', '2026-11-05', { won: true, guesses: 2 });
    expect(gamesLeftToday(readHistory(s), '2026-11-05')).toBe(2);
    recordPlay(s, 'otakudle-one-piece', '2026-11-05', { won: true, guesses: 6 });
    recordPlay(s, 'otakudle-dragon-ball', '2026-11-05', { won: false, guesses: 9 });
    expect(gamesLeftToday(readHistory(s), '2026-11-05')).toBe(0);
  });

  it('the language rule: a choice is kept; a browser in French reads French; any other language English', () => {
    expect(languageTarget('auto', 'fr-FR', 'en')).toBe('fr');
    expect(languageTarget('auto', 'fr', 'fr')).toBeNull();
    expect(languageTarget('auto', 'ko-KR', 'en')).toBeNull();
    expect(languageTarget('auto', 'ko-KR', 'fr')).toBe('en');
    expect(languageTarget('auto', undefined, 'en')).toBeNull();
    expect(languageTarget('en', 'fr-FR', 'en')).toBeNull();
    expect(languageTarget('en', 'fr-FR', 'fr')).toBe('en');
    expect(languageTarget('fr', 'en-US', 'en')).toBe('fr');
  });

  it('settings, transfer, erase', () => {
    const a = store();
    writeSettings(a, { lang: 'fr', colorblind: true, reducedMotion: false });
    expect(readSettings(a)).toEqual({ lang: 'fr', colorblind: true, reducedMotion: false });
    recordPlay(a, 'kpopdle-idol', '2026-11-01', { won: true, guesses: 2 });
    const b = store();
    recordPlay(b, 'kpopdle-idol', '2026-11-01', { won: false, guesses: 9 });
    recordPlay(b, 'kpopdle-idol', '2026-11-02', { won: true, guesses: 4 });
    expect(importData(b, exportData(a))).toBe(true);
    // a day this device has stays
    expect(readHistory(b)['kpopdle-idol']).toEqual({ '2026-11-01': { won: false, guesses: 9 }, '2026-11-02': { won: true, guesses: 4 } });
    expect(importData(b, 'not an export')).toBe(false);
    expect(importData(b, '{"v":2}')).toBe(false);
    eraseData(b);
    expect(b.map.size).toBe(0);
  });
});

describe('the copy', () => {
  it('is the same in both languages, in every key, with no em or en dash', () => {
    const fr = dleCopy('fr') as unknown as Record<string, unknown>;
    const en = dleCopy('en') as unknown as Record<string, unknown>;
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort());
    const src = readFileSync(new URL('./copy.ts', import.meta.url), 'utf8') + readFileSync(new URL('./seo.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/[\u2013\u2014]/);
    expect(Object.keys(IDOL_COLUMNS.fr).sort()).toEqual(Object.keys(IDOL_COLUMNS.en).sort());
    expect(Object.keys(HINT_LABELS.fr).sort()).toEqual(dleGame('kpopdle-idol').hints.map((h) => h.key).sort());
    expect(() => gameCopy('kpopdle-group', 'fr')).toThrow(/no words/);
    expect(Object.keys(OTAKUDLE_COLUMNS.fr).sort()).toEqual(Object.keys(OTAKUDLE_COLUMNS.en).sort());
  });

  it('values are translated, names are not', () => {
    expect(valueLabel('gender', 'female', 'fr')).toBe('Femme');
    expect(valueLabel('gender', 'male', 'en')).toBe('Man');
    expect(valueLabel('role', 'none', 'fr')).toBe('Aucun');
    expect(valueLabel('generation', 3, 'fr')).toBe('3e');
    expect(valueLabel('generation', 3, 'en')).toBe('3rd');
    expect(valueLabel('nationality', ['South Korea', 'Japan'], 'fr')).toBe('Corée du Sud, Japon');
    expect(valueLabel('group', ['TWICE'], 'fr')).toBe('TWICE');
    expect(valueLabel('debut', null, 'fr')).toBe('');
  });
});

describe('SEO, section 11', () => {
  const suffix = ' | Bunnyverse';
  const pages = [BURROW_SEO, GAME_SEO['kpopdle-idol']!];

  it('titles of 60 or fewer with the suffix, descriptions of 120 to 160, no competitor name', () => {
    expect(REGISTRY.hub.seo.titleTemplate).toBe(`%s${suffix}`);
    for (const p of pages) for (const l of ['en', 'fr'] as const) {
      expect((p.title[l] + suffix).length, p.title[l]).toBeLessThanOrEqual(60);
      expect(p.description[l].length, p.description[l]).toBeGreaterThanOrEqual(120);
      expect(p.description[l].length, p.description[l]).toBeLessThanOrEqual(160);
      expect(`${p.title[l]} ${p.description[l]}`).not.toMatch(/loldle|animedle|onepiecedle|kpople/i);
    }
    expect(GAME_SEO['kpopdle-idol']!.title.en).toBe('Kpopdle: Guess the K-pop Idol of the Day');
  });

  it('the answer block holds 40 to 60 words, one number with its date', () => {
    for (const l of ['en', 'fr'] as const) {
      const b = gameAnswerBlock('kpopdle-idol', l, 116, '2026-11-01');
      const words = b.split(/\s+/).length;
      expect(words, b).toBeGreaterThanOrEqual(40);
      expect(words, b).toBeLessThanOrEqual(60);
      expect(b).toContain('116');
      expect(b).toContain('2026');
    }
  });

  it('hreflang reciprocal, x-default on English, canonical on itself', () => {
    expect(dleAlternates('/kpopdle', 'en')).toEqual({ canonical: '/kpopdle', languages: { en: '/kpopdle', fr: '/fr/kpopdle', 'x-default': '/kpopdle' } });
    expect(dleAlternates('/kpopdle', 'fr')).toEqual({ canonical: '/fr/kpopdle', languages: { en: '/kpopdle', fr: '/fr/kpopdle', 'x-default': '/kpopdle' } });
  });

  it('the sitemap: nothing with the flag off or the site closed; French only once reviewed; never /credits; real date', () => {
    expect(dleSitemapRows(false, TODAY, true, true)).toEqual([]);
    expect(dleSitemapRows(true, TODAY, true, false)).toEqual([]);
    expect(DLE_FR_REVIEWED).toBe(false);
    expect(dleSitemapRows(true, null, false, true).map((r) => r.path)).toEqual(['/daily', '/kpopdle', '/otakudle', '/otakudle/one-piece', '/otakudle/dragon-ball']);
    const all = dleSitemapRows(true, '2026-11-02', true, true);
    expect(all.map((r) => r.path)).toEqual([
      '/daily', '/kpopdle', '/otakudle', '/otakudle/one-piece', '/otakudle/dragon-ball',
      '/fr/daily', '/fr/kpopdle', '/fr/otakudle', '/fr/otakudle/one-piece', '/fr/otakudle/dragon-ball',
    ]);
    expect(all[0]!.lastModified!.toISOString()).toBe('2026-11-02T00:05:00.000Z');
  });

  it('JSON-LD: WebApplication and VideoGame, no rating, no number of players, never Flashcard or FAQ', () => {
    const j = gameJsonLd('kpopdle-idol', 'fr');
    expect(j['@type']).toEqual(['WebApplication', 'VideoGame']);
    expect(j.url).toBe('https://bunnyverse.org/fr/kpopdle');
    const text = JSON.stringify(j);
    expect(text).not.toMatch(/aggregateRating|Flashcard|FAQPage|interactionStatistic/);
    expect(breadcrumbJsonLd([{ name: 'The Burrow', path: '/daily' }]).itemListElement).toEqual([{ '@type': 'ListItem', position: 1, name: 'The Burrow', item: 'https://bunnyverse.org/daily' }]);
    expect(itemListJsonLd('x', [{ name: 'a' }]).numberOfItems).toBe(1);
  });

  it('the share image: built games only, digits only', () => {
    expect(parseShareImage('kpopdle-idol', 'fr', '2-1-8')).toMatchObject({ locale: 'fr', counts: [2, 1, 8], max: 8 });
    expect(parseShareImage('kpopdle-idol', null, 'mina')).toMatchObject({ locale: 'en', counts: [] });
    expect(parseShareImage('kpopdle-group', 'en', '1')).toBeNull();
    expect(parseShareImage('otakudle', 'en', '1')).toMatchObject({ counts: [1] });
    expect(parseShareImage('nope', 'en', '1')).toBeNull();
    expect(shareParam(Array.from({ length: 30 }, () => 3)).split('-')).toHaveLength(20);
    expect(new RegExp(`^${SHARE_R_PATTERN}$`).test(shareParam(Array.from({ length: 30 }, () => 8)))).toBe(true);
  });
});

describe('routing', () => {
  const hub = rewritesFor('hub');

  it('/daily of the hub goes to the Burrow folder; the internal folders are the site\'s 404, before the pretty rule', () => {
    const at = (src: string, dest: string): number => hub.findIndex((r) => r.source === src && r.destination === dest);
    expect(at('/sites/hub/daily', '/sites/hub/burrow')).toBeGreaterThan(-1);
    expect(at('/sites/hub/burrow', '/sites/hub/gone')).toBeGreaterThan(-1);
    expect(at('/sites/hub/burrow', '/sites/hub/gone')).toBeLessThan(at('/sites/hub/daily', '/sites/hub/burrow'));
    expect(at('/sites/hub/dle-share/:rest*', '/sites/hub/gone')).toBeGreaterThan(-1);
  });

  it('a shared result goes to its page on the query parameter alone, one rule per locale of each built game', () => {
    const shares = hub.filter((r) => r.has);
    expect(shares.map((r) => [r.source, r.destination])).toEqual([
      ['/sites/hub/kpopdle', '/sites/hub/dle-share/en/kpopdle-idol/:r'],
      ['/sites/hub/fr/kpopdle', '/sites/hub/dle-share/fr/kpopdle-idol/:r'],
      ['/sites/hub/otakudle', '/sites/hub/dle-share/en/otakudle/:r'],
      ['/sites/hub/fr/otakudle', '/sites/hub/dle-share/fr/otakudle/:r'],
      ['/sites/hub/otakudle/one-piece', '/sites/hub/dle-share/en/otakudle-one-piece/:r'],
      ['/sites/hub/fr/otakudle/one-piece', '/sites/hub/dle-share/fr/otakudle-one-piece/:r'],
      ['/sites/hub/otakudle/dragon-ball', '/sites/hub/dle-share/en/otakudle-dragon-ball/:r'],
      ['/sites/hub/fr/otakudle/dragon-ball', '/sites/hub/dle-share/fr/otakudle-dragon-ball/:r'],
    ]);
    expect(shares[0]!.has![0]).toMatchObject({ type: 'query', key: 'r' });
  });

  it('no other site gets any of it', () => {
    expect(rewritesFor('kpop')).toEqual([]);
    expect(JSON.stringify(rewritesFor('anime'))).not.toMatch(/burrow|dle-share|kpopdle/);
  });
});

describe('the games as data', () => {
  it('Kpopdle and Otakudle have their pages; a mode with no game keeps its tile and says soon', () => {
    expect(DLE_WORLDS.map((w) => w.brand)).toEqual(['Kpopdle', 'Otakudle']);
    const [k, a] = DLE_WORLDS;
    expect(liveModes(k!).map((m) => m.id)).toEqual(['idol']);
    expect(worldHref(k!, 'fr')).toBe('/fr/kpopdle');
    // CR-024: the two games of one series take the place of "One Otakudle per series", after Otakudle, in the order of the chain.
    expect(liveModes(a!).map((m) => m.id)).toEqual(['char', 'one-piece', 'dragon-ball']);
    expect(a!.modes.map((m) => m.id)).toEqual(['char', 'series', 'one-piece', 'dragon-ball']);
    expect(worldHref(a!, 'en')).toBe('/otakudle');
    expect(worldHref(a!, 'fr')).toBe('/fr/otakudle');
    expect(liveGame(a!.modes[1]!)).toBeNull();
    expect(liveGame(a!.modes[2]!)?.path).toBe('/otakudle/one-piece');
    expect(liveGame(a!.modes[3]!)?.path).toBe('/otakudle/dragon-ball');
    expect(worldOf('otakudle-one-piece').id).toBe('otakudle');
    expect(worldOf('otakudle-dragon-ball').id).toBe('otakudle');
    expect(a!.spoiler).toBe(true);
    expect(worldOf('otakudle').id).toBe('otakudle');
    expect(liveGame(k!.modes[1]!)).toBeNull();
  });

  it('every slot of a world is a slot of the admin', async () => {
    const { IMAGE_SLOTS } = await import('@/lib/photos/slots');
    const keys = IMAGE_SLOTS.map((s) => s.key);
    for (const w of DLE_WORLDS) for (const k of [w.coverSlot, w.bannerSlot, ...w.modes.map((m) => m.slot)]) expect(keys, k).toContain(k);
    const css = readFileSync(new URL('../../styles/sites/hub/dle.css', import.meta.url), 'utf8');
    expect(css).not.toMatch(/[\u2013\u2014]/);
    for (const rule of css.split('\n').filter((l) => /\{.*\}\s*$/.test(l) && !l.startsWith('@') && !/^\s*(from|to|\d)/.test(l))) {
      if (/^\s*(html|@)/.test(rule)) expect(rule, rule).toMatch(/^\s*html\.ux-v1(\.dark)?\[data-site="hub"\]/);
    }
  });
});

describe('the screens', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  const POOL = {
    game: 'kpopdle-idol', universe: 'kpop',
    attributes: [{ key: 'group', kind: 'multi' as const, near: null }],
    entities: [{ id: '1', name: 'Mina', search: ['Mina', '미나'], attrs: { group: { v: ['TWICE'] } }, thumb: null }],
  };

  it('the game drawn on the server: one H1, the steps, the box, locked hints, soon for what has no page; no result, no answer', async () => {
    const { DleGame } = await import('@/components/hub/dle/dle-game');
    for (const locale of ['en', 'fr'] as const) {
      const html = renderToStaticMarkup(createElement(DleGame, { locale, game: 'kpopdle-idol', gameNo: 4, stats: null, pool: POOL, pictures: {}, quizLinks: {}, kpopName: 'KpopQuiz' }));
      expect(html.match(/<h1/g)).toHaveLength(1);
      expect(html).toContain(gameCopy('kpopdle-idol', locale).h1.replace('’', '’'));
      expect(html).toContain('id="dle-guess"');
      expect(html).toContain(dleCopy(locale).hintIn(5));
      expect(html).toContain(dleCopy(locale).soon);
      expect(html).toContain(`href="${localePath('/kpopdle', locale)}"`);
      expect(html).not.toContain('hub-dle-result');
      // no number of fans under the floor of 100 plays: the server's stats are null
      expect(html).not.toContain(dleCopy(locale).fansLine('').trim());
    }
  });

  it('a game that is off says so and has no box', async () => {
    const { DleGame } = await import('@/components/hub/dle/dle-game');
    const html = renderToStaticMarkup(createElement(DleGame, { locale: 'en', game: 'kpopdle-idol', gameNo: null, stats: null, pool: null, pictures: {}, quizLinks: {}, kpopName: 'KpopQuiz' }));
    expect(html).toContain(dleCopy('en').unavailable);
    expect(html).not.toContain('id="dle-guess"');
  });

  it('the Terrier: two blocks, rows, the closed about in the HTML, Otakudle a real tile with no image, its modes without a page say soon; a spoiler stays hidden', async () => {
    const { BurrowBoard } = await import('@/components/hub/dle/burrow-board');
    const answer = { id: '1', name: 'Mina', attrs: { group: { v: ['TWICE'] } }, thumb: null };
    const html = renderToStaticMarkup(createElement(BurrowBoard, {
      locale: 'en', dateLabel: 'Saturday 31 October', images: {}, quizLinks: { TWICE: 'https://kpopquiz.org/twice-quiz' },
      facts: { 'kpopdle-idol': { gameNo: 4, stats: { plays: 100, wins: 40, give_ups: 2, guess_hist: [] }, yesterday: { gameNo: 3, answer } } },
    }));
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.match(/<article/g)).toHaveLength(2);
    expect(html).toContain('href="/kpopdle"');
    expect(html).toContain('href="/otakudle"');
    // The two games of one series have their rows and are links (CR-024); "Series of the day" still says soon.
    expect(html).toContain('href="/otakudle/one-piece"');
    expect(html).toContain('href="/otakudle/dragon-ball"');
    expect(html).toContain('hub-dle-row-soon');
    expect(html).toContain('오늘의 아이돌');
    expect(html).toContain('オタクドル');
    expect(html).toContain('40 fans found it today');
    expect(html).toContain('<details class="hub-dle-about">');
    expect(html).toContain(dleCopy('en').about1.replace(/’/g, '’'));
    expect(html).toContain('href="https://kpopquiz.org/twice-quiz"');
    expect(html).toContain('Mina');
    expect(html).not.toMatch(/<img[^>]+src="https?:/);
  });

  it('with an image in a slot the block draws it; the initials otherwise; the avatar keeps the initials', async () => {
    const { BurrowBoard } = await import('@/components/hub/dle/burrow-board');
    const image = { src: 'https://x.test/a.webp', small: 'https://x.test/s.webp', mid: null, position: '50% 50%', credit: 'A, CC BY 4.0' };
    const html = renderToStaticMarkup(createElement(BurrowBoard, { locale: 'fr', dateLabel: 'd', facts: {}, quizLinks: {}, images: { 'home:kpopdle': image, 'daily:mode-idol': image } }));
    expect(html).toContain('src="https://x.test/a.webp"');
    expect(html).toContain('src="https://x.test/s.webp"');
    const { initialsOf, tintOf } = await import('@/components/hub/dle/dle-avatar');
    expect(initialsOf('J-Hope')).toBe('JH');
    expect(initialsOf('I.N')).toBe('IN');
    expect(tintOf('TWICE')).toEqual(tintOf('TWICE'));
  });

  it('the French credits share the page and its rules', async () => {
    const { creditSections, HubCreditsPage } = await import('@/components/hub/credits/hub-credits');
    expect(renderToStaticMarkup(createElement(HubCreditsPage, { sections: [], locale: 'fr' }))).toContain('Crédits photos');
    expect(renderToStaticMarkup(createElement(HubCreditsPage, { sections: [] }))).toContain('Photo credits');
    expect(creditSections([], [], {}, {}, 'fr')).toEqual([]);
  });

  it('flag off, on the hub\'s build: every page and the share image answer as an unknown URL', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    vi.stubEnv('SITE_ID', 'hub');
    vi.resetModules();
    const loaders = [
      () => import('@/app/sites/[site]/(hub)/burrow/page'), () => import('@/app/sites/[site]/(hub)/fr/daily/page'),
      () => import('@/app/sites/[site]/(hub)/kpopdle/page'), () => import('@/app/sites/[site]/(hub)/fr/kpopdle/page'),
      () => import('@/app/sites/[site]/(hub)/otakudle/page'), () => import('@/app/sites/[site]/(hub)/fr/otakudle/page'),
      () => import('@/app/sites/[site]/(hub)/fr/credits/page'), () => import('@/app/sites/[site]/(hub)/dle-share/[locale]/[game]/[r]/page'),
    ];
    const params = Promise.resolve({ locale: 'en', game: 'kpopdle-idol', r: '1-2' });
    for (const load of loaders) {
      const m = await load() as unknown as { default: (a: unknown) => unknown; generateMetadata: (a: unknown) => unknown };
      await expect((async () => m.generateMetadata({ params }))()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
      await expect((async () => m.default({ params }))()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    }
    const og = await import('@/app/api/og/dle/route');
    const res = await og.GET(new Request('https://x.test/api/og/dle?game=kpopdle-idol') as never);
    expect(res.status).toBe(404);
    const { sitemapEntriesFor } = await import('@/lib/site/root-files');
    const { SITE } = await import('@/lib/site/registry');
    vi.stubEnv('NET_INDEXING', '1');
    const entries = await sitemapEntriesFor(SITE, {} as never);
    for (const p of livePaths()) expect(entries.map((e) => e.path), p).not.toContain(p);
  });

  it('the shell asks for the bare frame on these pages only with the flag on', () => {
    const src = readFileSync(new URL('../../components/layout/ux-v1/ux-shell.tsx', import.meta.url), 'utf8');
    expect(src).toContain('SITE.features.dailyGuess ? { barePaths: dleLivePaths() } : {}');
    expect(src).toContain("SITE_ID === 'hub' ?");
  });
});
