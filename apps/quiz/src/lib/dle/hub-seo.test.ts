// Run O1, lane SEO (2026-11-05): the SEO of the pages of the daily games on bunnyverse.org, judged against the rulebook (.claude/skills/kpopquiz-seo) for both states of the hub's dailyGuess flag.
// Flag off (before launch day, or after a revert): every page and the share page answer 404, the sitemap lists none of them, the route map knows none. Flag on (launch day 2026-11-07,
// the registry since the K8c PR): the pages are drawn, and the sitemap, the metadata
// (robots, canonical, hreflang), the JSON-LD and the links agree with each other. The pieces are tested one by one in dle-step4.test.ts and series-pages.test.ts; this file holds the invariants
// between them, so that no page is listed while it says noindex, none says index while it is out of the sitemap, and no link or hreflang leads to a 404.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { REGISTRY, dleLivePaths, hubRouteAllow } from '@/lib/site/registry';
import { sitemapEntriesFor } from '@/lib/site/root-files';
import { compileRoutePattern } from '@/lib/site/routing';

import { gameCopy } from './copy';
import { DAILY_PATH, builtGames, dleGame, localePath } from './games';
import { BURROW_SEO, DLE_FR_REVIEWED, GAME_SEO, dleRobots, dleSitemapRows, gameAnswerBlock } from './seo';

import type { DleGameId } from './games';
import type { DleDay, DleLocale, DlePool } from './types';

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));
vi.mock('@/components/hub/dle/dle-font', () => ({ dleMarquee: { variable: 'marquee-var' } }));

// The flag and the reads are the only things the pages take from outside: both are set by the test. `live` is the set of games that answer dle_day and dle_pool.
const gate = vi.hoisted(() => ({ open: false, live: new Set<string>() }));
vi.mock('@/lib/site/hub/daily-guess', async (orig) => ({ ...(await orig<typeof import('@/lib/site/hub/daily-guess')>()), dleOpen: () => gate.open }));
vi.mock('@/lib/dle/read', async (orig) => ({
  ...(await orig<typeof import('@/lib/dle/read')>()),
  getDleDay: async (game: DleGameId) => (gate.live.has(game) ? dayOf(game) : null),
  getDlePool: async (game: DleGameId) => (gate.live.has(game) ? poolOf(game) : null),
  getDleImages: async () => ({}),
  getDlePictures: async () => ({}),
  getAnimeSeriesSlugs: async () => ({}),
  getKpopGroupSlugs: async () => ({}),
  getBlindtestSlugs: async () => ({}),
}));

const ORIGIN = REGISTRY.hub.url;
const DATE = '2026-11-03';
const LOCALES: readonly DleLocale[] = ['en', 'fr'];
const ALL_GAMES: readonly DleGameId[] = builtGames().map((g) => g.id);
const NAMES = ['Mina', 'Sana', 'Momo', 'Nayeon'];

function dayOf(game: string): DleDay {
  return { game, now: `${DATE}T10:00:00Z`, date: DATE, game_no: 4, seconds_left: 3600, stats: null, play: null, yesterday: null };
}

function poolOf(game: DleGameId): DlePool {
  const sub = gameCopy(game, 'en').subKey;
  return {
    game, universe: 'x', attributes: [{ key: sub, kind: 'single', near: null }],
    entities: NAMES.map((name, i) => ({ id: String(i + 1), name, attrs: { [sub]: { v: 'Group A' } }, thumb: null, search: [name] })),
  };
}

afterEach(() => { gate.open = false; gate.live = new Set(); vi.unstubAllEnvs(); });

// ---- the pages: the eight game pages and the Burrow in both languages

interface Meta {
  title: string; description: string;
  alternates: { canonical: string; languages: Record<string, string> };
  robots: { index: boolean; follow: boolean };
  openGraph: { url: string; title: string; images: { url: string }[] };
}
interface PageModule { default: (a?: unknown) => Promise<React.ReactElement>; generateMetadata: (a?: unknown) => Promise<Meta> }
interface Page { readonly rel: string; readonly path: string; readonly locale: DleLocale; readonly game: DleGameId | null }

const LOADERS: Readonly<Record<string, () => Promise<PageModule>>> = {
  burrow: () => import('@/app/sites/[site]/(hub)/burrow/page') as unknown as Promise<PageModule>,
  'fr/daily': () => import('@/app/sites/[site]/(hub)/fr/daily/page') as unknown as Promise<PageModule>,
  kpopdle: () => import('@/app/sites/[site]/(hub)/kpopdle/page') as unknown as Promise<PageModule>,
  'fr/kpopdle': () => import('@/app/sites/[site]/(hub)/fr/kpopdle/page') as unknown as Promise<PageModule>,
  otakudle: () => import('@/app/sites/[site]/(hub)/otakudle/page') as unknown as Promise<PageModule>,
  'fr/otakudle': () => import('@/app/sites/[site]/(hub)/fr/otakudle/page') as unknown as Promise<PageModule>,
  'otakudle/one-piece': () => import('@/app/sites/[site]/(hub)/otakudle/one-piece/page') as unknown as Promise<PageModule>,
  'fr/otakudle/one-piece': () => import('@/app/sites/[site]/(hub)/fr/otakudle/one-piece/page') as unknown as Promise<PageModule>,
  'otakudle/dragon-ball': () => import('@/app/sites/[site]/(hub)/otakudle/dragon-ball/page') as unknown as Promise<PageModule>,
  'fr/otakudle/dragon-ball': () => import('@/app/sites/[site]/(hub)/fr/otakudle/dragon-ball/page') as unknown as Promise<PageModule>,
};

const GAME_PAGES: readonly Page[] = builtGames().flatMap((g) => LOCALES.map((locale): Page => ({
  rel: locale === 'fr' ? `fr${g.path}` : g.path.slice(1), path: localePath(g.path, locale), locale, game: g.id,
})));
const BURROW_PAGES: readonly Page[] = [
  { rel: 'burrow', path: DAILY_PATH, locale: 'en', game: null },
  { rel: 'fr/daily', path: localePath(DAILY_PATH, 'fr'), locale: 'fr', game: null },
];
const PAGES: readonly Page[] = [...GAME_PAGES, ...BURROW_PAGES];

const load = (p: Page): Promise<PageModule> => LOADERS[p.rel]!();
const meta = async (p: Page): Promise<Meta> => (await load(p)).generateMetadata();
const render = async (p: Page): Promise<string> => renderToStaticMarkup(await (await load(p)).default());

const hubRoutes = (on: boolean): readonly RegExp[] => hubRouteAllow({ dailyGuess: on }).map(compileRoutePattern);
const known = (on: boolean, path: string): boolean => hubRoutes(on).some((re) => re.test(path));
const absolute = (path: string): string => new URL(path, ORIGIN).href;
const hrefs = (html: string): string[] => [...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, '&'));
const internalPaths = (html: string): string[] => hrefs(html).filter((h) => h.startsWith('/') && !h.startsWith('//')).map((h) => h.split(/[?#]/)[0]!);
const jsonLd = (html: string): Record<string, unknown>[] => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]!) as Record<string, unknown>);

describe('the flag off (before launch day, or after a revert of the K8c PR): the pages are a 404 and nothing leads to them', () => {
  it('every game page, the Burrow and the share page answer as an unknown URL, in the metadata and in the body', async () => {
    gate.open = false;
    gate.live = new Set(ALL_GAMES);
    const share = await import('@/app/sites/[site]/(hub)/dle-share/[locale]/[game]/[r]/page') as unknown as PageModule;
    const params = Promise.resolve({ locale: 'en', game: 'kpopdle-idol', r: '2-1-3' });
    for (const p of PAGES) {
      const m = await load(p);
      await expect((async () => m.generateMetadata())(), p.path).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
      await expect((async () => m.default())(), p.path).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    }
    await expect((async () => share.generateMetadata({ params }))()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    await expect((async () => share.default({ params }))()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it('the route map of the hub knows none of the pages, the sitemap lists none of them, with the network open', async () => {
    for (const path of dleLivePaths()) expect(known(false, path), path).toBe(false);
    // Launch day (2026-11-07, RUNBOOK K8c): the registry has the flag on and its route map carries every page; the off state is the one a revert brings back.
    expect(REGISTRY.hub.features.dailyGuess).toBe(true);
    for (const path of dleLivePaths()) expect(REGISTRY.hub.routes.allow, path).toContain(path);
    const hubOff = { ...REGISTRY.hub, features: { ...REGISTRY.hub.features, dailyGuess: false }, routes: { allow: hubRouteAllow({ dailyGuess: false }) } };
    for (const path of dleLivePaths()) expect(hubOff.routes.allow, path).not.toContain(path);
    vi.stubEnv('NET_INDEXING', '1');
    const rpc = vi.fn(async () => ({ data: dayOf('kpopdle-idol'), error: null }));
    const paths = (await sitemapEntriesFor(hubOff, { rpc } as never)).map((e) => e.path);
    for (const path of dleLivePaths()) expect(paths, path).not.toContain(path);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('the sitemap of the hub, the flag on', () => {
  const hubOn = { ...REGISTRY.hub, features: { ...REGISTRY.hub.features, dailyGuess: true } };
  const dbOf = (answers: Readonly<Record<string, string | Error | null>>): { rpc: ReturnType<typeof vi.fn> } => ({
    rpc: vi.fn(async (_fn: string, args: { p_game: string }) => {
      const a = answers[args.p_game] ?? null;
      if (typeof a === 'string') return { data: { ...dayOf(args.p_game), date: a }, error: null };
      return { data: null, error: { message: a instanceof Error ? a.message : 'dle_unavailable' } };
    }),
  });
  const everyGame = (date: string): Record<string, string> => Object.fromEntries(ALL_GAMES.map((id) => [id, date]));
  const pathsOf = async (answers: Readonly<Record<string, string | Error | null>>): Promise<string[]> => (await sitemapEntriesFor(hubOn, dbOf(answers) as never)).map((e) => e.path);

  it('the network closed: the home alone, and no read', async () => {
    vi.stubEnv('NET_INDEXING', '');
    const db = dbOf(everyGame(DATE));
    expect((await sitemapEntriesFor(hubOn, db as never)).map((e) => e.path)).toEqual(['/']);
    expect(db.rpc).not.toHaveBeenCalled();
  });

  it('the network open and every game answering: the Burrow and the four English pages, a real date, nothing else of the Terrier', async () => {
    vi.stubEnv('NET_INDEXING', '1');
    const entries = await sitemapEntriesFor(hubOn, dbOf(everyGame(DATE)) as never);
    // Launch day (RUNBOOK K8c): the registry's own hub is this one, so the sitemap bunnyverse.org serves is the same list.
    expect(await sitemapEntriesFor(REGISTRY.hub, dbOf(everyGame(DATE)) as never)).toEqual(entries);
    const en = [DAILY_PATH, ...builtGames().map((g) => g.path)];
    expect(entries.map((e) => e.path)).toEqual(['/', ...en, ...(DLE_FR_REVIEWED ? en.map((p) => localePath(p, 'fr')) : []), '/privacy', '/legal']);
    for (const e of entries.filter((x) => en.includes(x.path))) expect(e.lastModified?.toISOString(), e.path).toBe(`${DATE}T00:05:00.000Z`);
    for (const e of entries) {
      expect(e.path, e.path).not.toMatch(/dle-share|burrow|credits|[?#]/);
      if (!DLE_FR_REVIEWED) expect(e.path, e.path).not.toMatch(/^\/fr(\/|$)/);
    }
  });

  it('a game that does not answer is not listed (its page says noindex): switched off, a pool under its minimum, a failed read; the Burrow needs one game', async () => {
    vi.stubEnv('NET_INDEXING', '1');
    const dle = (paths: readonly string[]): string[] => paths.filter((p) => dleLivePaths().includes(p));
    // Dragon Ball left off by L14 (its pool is under min_pool): the other three games and the Burrow stay.
    expect(dle(await pathsOf({ ...everyGame(DATE), 'otakudle-dragon-ball': null }))).toEqual([DAILY_PATH, '/kpopdle', '/otakudle', '/otakudle/one-piece', ...(DLE_FR_REVIEWED ? ['/fr/daily', '/fr/kpopdle', '/fr/otakudle', '/fr/otakudle/one-piece'] : [])]);
    // A read that fails is the same as a game that is off: closed for this answer, never listed.
    expect(dle(await pathsOf({ ...everyGame(DATE), 'kpopdle-idol': new Error('fetch failed') }))).not.toContain('/kpopdle');
    // One game answering keeps the Burrow, with the date of the game that answers.
    const one = await sitemapEntriesFor(hubOn, dbOf({ otakudle: DATE }) as never);
    expect(one.map((e) => e.path).filter((p) => dleLivePaths().includes(p))).toEqual([DAILY_PATH, '/otakudle', ...(DLE_FR_REVIEWED ? ['/fr/daily', '/fr/otakudle'] : [])]);
    expect(one.find((e) => e.path === '/otakudle')?.lastModified?.toISOString()).toBe(`${DATE}T00:05:00.000Z`);
    // No game answering: no row of the Terrier at all (the Burrow says noindex then), the home and the legal pages stay.
    expect(dle(await pathsOf({}))).toEqual([]);
    expect(await pathsOf({})).toEqual(['/', '/privacy', '/legal']);
  });

  it('every row is a page the hub serves with the flag on, and none is served with it off', () => {
    for (const reviewed of [false, true]) {
      for (const row of dleSitemapRows(true, DATE, reviewed, true)) {
        expect(dleLivePaths(), row.path).toContain(row.path);
        expect(known(true, row.path), `${row.path} on`).toBe(true);
        expect(known(false, row.path), `${row.path} off`).toBe(false);
      }
    }
    // the live paths of the route map are the Burrow, the game pages and /fr/credits, in both languages: nothing else a sitemap row could name
    expect(dleLivePaths().filter((p) => !dleSitemapRows(true, DATE, true, true).some((r) => r.path === p))).toEqual(['/fr/credits']);
  });

  it('the pure rows: all built games by default, only the live ones when told, none when none is', () => {
    expect(dleSitemapRows(true, DATE, false, true).map((r) => r.path)).toEqual([DAILY_PATH, '/kpopdle', '/otakudle', '/otakudle/one-piece', '/otakudle/dragon-ball']);
    expect(dleSitemapRows(true, DATE, false, true, ['otakudle-one-piece']).map((r) => r.path)).toEqual([DAILY_PATH, '/otakudle/one-piece']);
    expect(dleSitemapRows(true, DATE, true, true, ['kpopdle-idol']).map((r) => r.path)).toEqual([DAILY_PATH, '/kpopdle', '/fr/daily', '/fr/kpopdle']);
    expect(dleSitemapRows(true, DATE, true, true, [])).toEqual([]);
    expect(dleSitemapRows(false, DATE, true, true, ALL_GAMES)).toEqual([]);
    expect(dleSitemapRows(true, DATE, true, false, ALL_GAMES)).toEqual([]);
  });
});

describe('the pages, the flag on: titles, headings, canonical, hreflang, robots', () => {
  it('title (60 or fewer with the layout suffix), description (120 to 160), no dash, no brand typed in, all unique', async () => {
    const suffix = REGISTRY.hub.seo.titleTemplate.replace('%s', '');
    const seen = new Set<string>();
    gate.open = true;
    gate.live = new Set(ALL_GAMES);
    for (const p of PAGES) {
      const m = await meta(p);
      expect((m.title + suffix).length, `${p.path} title`).toBeLessThanOrEqual(60);
      expect(m.description.length, `${p.path} description`).toBeGreaterThanOrEqual(120);
      expect(m.description.length, `${p.path} description`).toBeLessThanOrEqual(160);
      expect(`${m.title} ${m.description}`, p.path).not.toMatch(/[–—]|Bunnyverse/);
      expect(m.openGraph.title, p.path).toBe(`${m.title}${suffix}`);
      for (const text of [m.title, m.description]) {
        expect(seen.has(text), `${p.path}: duplicate "${text}"`).toBe(false);
        seen.add(text);
      }
    }
    expect(seen.size).toBe(PAGES.length * 2);
  });

  it('each page says its own words: the table of the SEO file, in its language', async () => {
    gate.open = true;
    gate.live = new Set(ALL_GAMES);
    for (const p of GAME_PAGES) {
      const m = await meta(p);
      expect(m.title, p.path).toBe(GAME_SEO[p.game!]!.title[p.locale]);
      expect(m.description, p.path).toBe(GAME_SEO[p.game!]!.description[p.locale]);
    }
    for (const p of BURROW_PAGES) {
      const m = await meta(p);
      expect([m.title, m.description], p.path).toEqual([BURROW_SEO.title[p.locale], BURROW_SEO.description[p.locale]]);
    }
  });

  it('the canonical is the page itself, on the hub origin; hreflang is reciprocal with x-default on English, and every address is a page the hub serves', async () => {
    gate.open = true;
    gate.live = new Set(ALL_GAMES);
    const byPath = new Map<string, Meta>();
    for (const p of PAGES) byPath.set(p.path, await meta(p));
    for (const p of PAGES) {
      const m = byPath.get(p.path)!;
      const en = p.locale === 'en' ? p.path : p.path.replace(/^\/fr/, '') || '/';
      const fr = localePath(en, 'fr');
      expect(m.alternates.canonical, `${p.path} canonical`).toBe(p.path);
      expect(absolute(m.alternates.canonical), `${p.path} absolute`).toBe(`${ORIGIN}${p.path}`);
      expect(m.openGraph.url, `${p.path} og:url`).toBe(`${ORIGIN}${p.path}`);
      expect(m.alternates.languages, `${p.path} hreflang`).toEqual({ en, fr, 'x-default': en });
      // both ways: the twin names this page back
      const twin = byPath.get(p.locale === 'en' ? fr : en)!;
      expect(twin.alternates.languages, `${p.path} twin`).toEqual(m.alternates.languages);
      for (const url of Object.values(m.alternates.languages)) {
        expect(byPath.has(url), `${p.path}: hreflang ${url} is a page of this audit`).toBe(true);
        expect(known(true, url), `${p.path}: hreflang ${url} is served with the flag on`).toBe(true);
      }
      expect(JSON.stringify(m), `${p.path} no query, no internal folder`).not.toMatch(/dle-share|\/burrow|\?r=/);
    }
  });

  it('robots: English indexed, French noindex until the owner reviewed it; the sitemap lists exactly the pages that say index', async () => {
    gate.open = true;
    const scenarios: readonly (readonly DleGameId[])[] = [ALL_GAMES, ['kpopdle-idol', 'otakudle'], ['otakudle-one-piece'], []];
    for (const live of scenarios) {
      gate.live = new Set(live);
      const listed = dleSitemapRows(true, DATE, DLE_FR_REVIEWED, true, live).map((r) => r.path);
      for (const p of PAGES) {
        const m = await meta(p);
        const answers = p.game ? live.includes(p.game) : live.length > 0;
        expect(m.robots.index, `${p.path} with ${live.length} games`).toBe(answers && (p.locale === 'en' || DLE_FR_REVIEWED));
        expect(m.robots.follow, p.path).toBe(true);
        expect(listed.includes(p.path), `${p.path} listed with ${live.length} games`).toBe(m.robots.index);
        expect(m.robots, p.path).toEqual(dleRobots(p.locale, answers));
      }
    }
  });
});

describe('the pages, the flag on: one H1, the answer block, the JSON-LD, the links', () => {
  it('one H1 on every page, and its language is the page\'s', async () => {
    gate.open = true;
    gate.live = new Set(ALL_GAMES);
    for (const p of PAGES) {
      const html = await render(p);
      expect(html.match(/<h1\b/g), p.path).toHaveLength(1);
      expect(html, p.path).toContain(`lang="${p.locale}"`);
      expect(html, p.path).not.toMatch(/dle-share|href="\/burrow/);
    }
  });

  it('a page with no data keeps its one H1 and its guide, and says so (the metadata says noindex)', async () => {
    gate.open = true;
    gate.live = new Set();
    for (const p of PAGES) {
      expect((await render(p)).match(/<h1\b/g), p.path).toHaveLength(1);
      expect((await meta(p)).robots.index, p.path).toBe(false);
    }
  });

  it('the answer block of every game, in both languages: 40 to 60 words, the real size of the pool, a dated sentence, and it is on the page', async () => {
    gate.open = true;
    gate.live = new Set(ALL_GAMES);
    for (const p of GAME_PAGES) {
      for (const size of [4, 116, 1234]) {
        const block = gameAnswerBlock(p.game!, p.locale, size, DATE);
        const words = block.split(/\s+/).length;
        expect(words, `${p.path} ${size}: ${block}`).toBeGreaterThanOrEqual(40);
        expect(words, `${p.path} ${size}: ${block}`).toBeLessThanOrEqual(60);
        expect(block, p.path).toContain(String(size));
        expect(block, p.path).toMatch(/2026/);
        expect(block, p.path).not.toMatch(/[–—]/);
      }
      expect(await render(p), p.path).toContain(gameAnswerBlock(p.game!, p.locale, NAMES.length, DATE));
    }
  });

  it('the JSON-LD parses, says what the page shows, and never claims a rating, an FAQ or a Flashcard', async () => {
    gate.open = true;
    gate.live = new Set(ALL_GAMES);
    for (const p of PAGES) {
      const html = await render(p);
      const blocks = jsonLd(html);
      expect(blocks.length, p.path).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(blocks), p.path).not.toMatch(/aggregateRating|interactionStatistic|numberOfPlayers|FAQPage|Flashcard|eduQuestionType|"Review"/);
      for (const b of blocks) expect(b['@context'], p.path).toBe('https://schema.org');
      const crumbs = blocks.find((b) => b['@type'] === 'BreadcrumbList') as { itemListElement: { position: number; item: string }[] };
      expect(crumbs.itemListElement.map((x) => x.position), p.path).toEqual(crumbs.itemListElement.map((_, i) => i + 1));
      expect(crumbs.itemListElement.at(-1)!.item, `${p.path} last crumb is the page`).toBe(`${ORIGIN}${p.path}`);
      for (const c of crumbs.itemListElement) expect(known(true, new URL(c.item).pathname), `${p.path} crumb ${c.item}`).toBe(true);
      if (p.game) {
        const app = blocks.find((b) => Array.isArray(b['@type'])) as Record<string, unknown>;
        expect(app['@type'], p.path).toEqual(['WebApplication', 'VideoGame']);
        expect(app.url, p.path).toBe(`${ORIGIN}${p.path}`);
        expect(app.inLanguage, p.path).toBe(p.locale);
        expect(app.isAccessibleForFree, p.path).toBe(true);
        // the pool: every name of the list is in the table the page shows, and the count is the table's
        const pool = blocks.find((b) => b['@type'] === 'ItemList') as { numberOfItems: number; itemListElement: { name: string }[] };
        expect(pool.numberOfItems, p.path).toBe(NAMES.length);
        expect(pool.itemListElement, p.path).toHaveLength(NAMES.length);
        for (const item of pool.itemListElement) expect(html, `${p.path} ${item.name}`).toContain(item.name);
      } else {
        // the Burrow: its list holds the built games, each at the address of its page in the language of the page
        const list = blocks.find((b) => b['@type'] === 'ItemList') as { numberOfItems: number; itemListElement: { url: string }[] };
        expect(list.itemListElement.map((x) => x.url), p.path).toEqual(builtGames().map((g) => `${ORIGIN}${localePath(g.path, p.locale)}`));
        expect(list.numberOfItems, p.path).toBe(builtGames().length);
      }
    }
  });

  it('the links: the Burrow reaches every game page, every page reaches the Burrow and its twin, and no link leads to a page the hub does not serve', async () => {
    gate.open = true;
    gate.live = new Set(ALL_GAMES);
    for (const locale of LOCALES) {
      const burrow = BURROW_PAGES.find((p) => p.locale === locale)!;
      const fromBurrow = internalPaths(await render(burrow));
      for (const g of builtGames()) expect(fromBurrow, `${burrow.path} -> ${g.path}`).toContain(localePath(g.path, locale));
    }
    for (const p of PAGES) {
      const links = internalPaths(await render(p));
      if (p.game) {
        expect(links, `${p.path} -> the Burrow`).toContain(localePath(DAILY_PATH, p.locale));
        expect(links, `${p.path} -> its twin`).toContain(localePath(dleGame(p.game).path, p.locale === 'en' ? 'fr' : 'en'));
      }
      for (const path of links) expect(known(true, path), `${p.path} links to ${path}`).toBe(true);
    }
    // Otakudle opens the two series games from its own page, so they have an inbound link from the games' own page as well as from the Burrow
    const otakudle = await render(GAME_PAGES.find((p) => p.path === '/otakudle')!);
    expect(internalPaths(otakudle)).toEqual(expect.arrayContaining(['/otakudle/one-piece', '/otakudle/dragon-ball']));
  });
});

describe('the shared result (/kpopdle?r=2-1-3, served by the internal page dle-share)', () => {
  type Share = { default: (a: unknown) => Promise<React.ReactElement>; generateMetadata: (a: unknown) => Promise<Meta> };
  const share = (): Promise<Share> => import('@/app/sites/[site]/(hub)/dle-share/[locale]/[game]/[r]/page') as unknown as Promise<Share>;
  const params = (locale: string, game: string, r: string): { params: Promise<{ locale: string; game: string; r: string }> } => ({ params: Promise.resolve({ locale, game, r }) });

  it('is the clean page with its own share image: the canonical, the hreflang and the robots are the clean address\'s, no internal folder shows', async () => {
    gate.open = true;
    gate.live = new Set(ALL_GAMES);
    const m = await share();
    for (const g of builtGames()) for (const locale of LOCALES) {
      const clean = GAME_PAGES.find((p) => p.game === g.id && p.locale === locale)!;
      const cleanMeta = await meta(clean);
      const shared = await m.generateMetadata(params(locale, g.id, '2-1-3'));
      expect(shared.title).toBe(cleanMeta.title);
      expect(shared.description).toBe(cleanMeta.description);
      expect(shared.alternates).toEqual(cleanMeta.alternates);
      expect(shared.robots).toEqual(cleanMeta.robots);
      expect(shared.openGraph.url).toBe(`${ORIGIN}${clean.path}`);
      expect(shared.openGraph.images[0]!.url).toBe(`/api/og/dle?game=${g.id}&locale=${locale}&r=2-1-3`);
      expect(cleanMeta.openGraph.images[0]!.url).toBe(`/api/og/dle?game=${g.id}&locale=${locale}`);
      expect(JSON.stringify({ ...shared, openGraph: { ...shared.openGraph, images: [] }, twitter: null })).not.toMatch(/dle-share|r=2-1-3/);
      const html = renderToStaticMarkup(await m.default(params(locale, g.id, '2-1-3')));
      expect(html.match(/<h1\b/g)).toHaveLength(1);
      expect(html).not.toMatch(/dle-share|r=2-1-3/);
      expect(JSON.stringify(jsonLd(html))).toContain(`${ORIGIN}${clean.path}`);
    }
  });

  it('answers 404 for a result that is not one: a bad code, a game with no page, a language the site does not have', async () => {
    gate.open = true;
    gate.live = new Set(ALL_GAMES);
    const m = await share();
    const bad: readonly { readonly locale: string; readonly game: string; readonly r: string }[] = [
      { locale: 'en', game: 'kpopdle-idol', r: '1-2-' }, { locale: 'en', game: 'kpopdle-idol', r: 'abc' }, { locale: 'en', game: 'kpopdle-idol', r: '123' },
      { locale: 'en', game: 'kpopdle-group', r: '1-2' }, { locale: 'en', game: 'nope', r: '1-2' }, { locale: 'de', game: 'kpopdle-idol', r: '1-2' },
    ];
    for (const b of bad) {
      await expect((async () => m.generateMetadata(params(b.locale, b.game, b.r)))(), JSON.stringify(b)).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
      await expect((async () => m.default(params(b.locale, b.game, b.r)))(), JSON.stringify(b)).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
    }
  });

  it('is never listed: no address of the sitemap carries a query, and the internal folder is no public address', async () => {
    const rows = dleSitemapRows(true, DATE, true, true).map((r) => r.path);
    for (const path of rows) expect(path).not.toMatch(/[?=]|dle-share/);
    const { rewritesFor } = await import('@/lib/site/routing');
    const rules = rewritesFor('hub');
    expect(rules.some((r) => r.source === '/sites/hub/dle-share/:rest*' && r.destination === '/sites/hub/gone')).toBe(true);
  });
});
