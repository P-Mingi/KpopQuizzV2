import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/copy/hub/h1';

// Lot H2a: the new Bunnyverse home of the hub build (docs/o1/design/fanquiz-hub/), block by block. Supabase is a fake; no network, no write.
// Lot H2c: the blocks read the modules of lib/site/hub/data/ (lot H2b), which are replaced here by the design's sample data in their own
// shapes (lib/site/hub/home-samples.test-support.ts, tests only); a test sets a block to null to see it leave the page.
// The registry reads the site of the build when it loads, so each test loads the modules after setting NEXT_PUBLIC_SITE_ID.
// next/font only runs inside the Next compiler, so the font module is replaced by the one field of each face the page reads.
// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): two columns, images first, rows everywhere; the tabs; Today with the
// progress of the day; Hot right now with Start easy; Top fans per site; the SEO block; the Burrow hidden while the dailyGuess flag is off.
// Launch day (2026-11-07, RUNBOOK K8c): the hub's flag is on in the registry, so the page as served has the Burrow; the closed page is the one a
// revert of that PR brings back, rendered here with the feature set to false.

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));

// The data modules: each answers what `blocks[name]` holds (the samples by default), `undefined` meaning the sample and null the missing block.
const blocks = vi.hoisted(() => ({ values: {} as Record<string, unknown>, calls: [] as Array<[string, unknown]> }));
vi.mock('@/lib/site/hub/data', async () => {
  const s = await import('@/lib/site/hub/home-samples.test-support');
  const samples: Record<string, () => unknown> = {
    getDoors: s.sampleDoors, getDailyQuizzes: s.sampleDaily, getBlindtest: s.sampleBlindtest, getDebate: s.sampleDebate, getRotation: s.sampleRotation,
    getSixtySeconds: s.sampleSixty, getDidYouKnow: s.sampleDyk, getHot: s.sampleHot, getCrossover: s.sampleCrossover, getTopFans: s.sampleTopFans,
    getSurprise: s.sampleSurprise,
  };
  const out: Record<string, unknown> = {};
  for (const [name, sample] of Object.entries(samples)) {
    out[name] = async (opts: unknown) => {
      blocks.calls.push([name, opts]);
      const v = blocks.values[name];
      if (v instanceof Error) throw v;
      return v === undefined ? sample() : v;
    };
  }
  return out;
});

// The Burrow switch: the real one (the registry feature dailyGuess AND the hub's pages), unless a test opens it to see the rows it draws.
// `features` is the hub's features a test sets (renderHomeWithDailyGuess), handed to the real switch: the module that holds the switch keeps the
// registry it was first loaded with, so a change to the registry a test loads later would not reach it.
const burrowSwitch = vi.hoisted(() => ({ open: false, features: null as null | Record<string, unknown>, noHubPages: false }));
// The hub's route map as it is, unless a test takes the pages of the Burrow out of it (the map before launch day, or after a revert).
vi.mock('@/lib/site/routing', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/site/routing')>();
  return {
    ...real,
    isKnownRouteFor: (...args: Parameters<typeof real.isKnownRouteFor>) => !(burrowSwitch.noHubPages && args[0] === 'hub' && /^\/(fr\/)?(daily|kpopdle|otakudle)(\/|$)/.test(args[1]))
      && real.isKnownRouteFor(...args),
  };
});
vi.mock('@/lib/site/hub/daily-guess', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/site/hub/daily-guess')>();
  type Features = Parameters<typeof real.burrowOpen>[0];
  return {
    ...real,
    burrowOpen: (...args: Parameters<typeof real.burrowOpen>) => burrowSwitch.open
      || real.burrowOpen(...(args.length > 0 || burrowSwitch.features === null ? args : [burrowSwitch.features as unknown as Features])),
  };
});

// Home v4: the live rows of site_assets_public (the image slots and the icon slots of the admin), empty by default (no slot filled).
const assetRows = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock('@/lib/photos/public-read', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/photos/public-read')>();
  return { ...real, getLiveAssets: async () => assetRows.rows };
});
/** A live image of an image slot (its three sizes under https://img.test), and a live icon of an icon slot. */
const imageRow = (key: string): Record<string, unknown> => ({
  key, type: 'card_image', page: 'home', settings: { focal: { x: 50, y: 50 } },
  large: `https://img.test/${key.replace(':', '-')}-1920.webp`, mid: `https://img.test/${key.replace(':', '-')}-400.webp`, thumb: `https://img.test/${key.replace(':', '-')}-96.webp`,
  width: 1920, height: 1080, sourceUrl: null, author: null, license: null, licenseNote: null, publishedAt: null,
});
const iconRow = (id: string): Record<string, unknown> => ({
  key: `icon:${id}`, type: 'icon', page: 'home', settings: { mode: 'icon', icon: 'star', circle: false, color: 'ink' },
  large: null, mid: null, thumb: null, width: null, height: null, sourceUrl: null, author: null, license: null, licenseNote: null, publishedAt: null,
});

const TODAY = new Date().toISOString().slice(0, 10);

const fake = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: { data: { username: 'mingi', xp: 90000, daily_streak: 6, last_daily_date: new Date().toISOString().slice(0, 10) }, error: null } as { data: unknown; error: unknown },
  memberships: { data: [] as unknown[], error: null } as { data: unknown; error: unknown },
  throwOn: null as null | 'client' | 'auth' | 'from',
  // The fan's plays of today (home v3: the quizzes of the day done), and what the page asked for.
  playsToday: [] as Array<{ quiz_id: string }>,
  playsAsked: [] as Array<Record<string, unknown>>,
}));

function query(table: string): unknown {
  const result = table === 'profiles' ? fake.profile : fake.memberships;
  const q = {
    select: () => q,
    eq: () => q,
    maybeSingle: () => Promise.resolve(result),
    then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
  };
  return q;
}
function playsQuery(): unknown {
  const asked: Record<string, unknown> = {};
  fake.playsAsked.push(asked);
  const q = {
    select: (cols: string) => { asked.select = cols; return q; },
    eq: (col: string, v: unknown) => { asked[`eq:${col}`] = v; return q; },
    in: (col: string, v: unknown) => { asked[`in:${col}`] = v; return q; },
    gte: (col: string, v: unknown) => { asked[`gte:${col}`] = v; return q; },
    limit: () => Promise.resolve({ data: fake.playsToday, error: null }),
  };
  return q;
}
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => {
    if (fake.throwOn === 'client') throw new Error('database unreachable');
    return {
      auth: { getUser: async () => { if (fake.throwOn === 'auth') throw new Error('fetch failed'); return { data: { user: fake.user }, error: null }; } },
      from: (t: string) => { if (fake.throwOn === 'from') throw new Error('boom'); return query(t); },
    };
  },
  createPublicReadClient: () => ({ from: (t: string) => { if (t !== 'plays') throw new Error(`unexpected read of ${t}`); return playsQuery(); } }),
}));

// Built from code points so this file holds neither dash.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

const MEMBERSHIPS = [
  { site_id: 'kpop', xp: null, activated_at: '2026-01-01T00:00:00Z', banned_at: null },
  { site_id: 'anime', xp: 80, activated_at: '2026-10-01T00:00:00Z', banned_at: null, daily_streak: 2, last_daily_date: TODAY },
];

async function load(site: 'hub' | 'anime' = 'hub', indexing: '1' | '' = '1') {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('NET_INDEXING', indexing);
  const [home, privacy, registry] = await Promise.all([import('./home-hub'), import('./privacy/page'), import('@/lib/site/registry')]);
  return { home, privacy, registry };
}

async function renderHome(): Promise<string> {
  const { home } = await load();
  return renderToStaticMarkup(await home.default());
}

/** The page with the hub's registry feature dailyGuess set as given (undefined: no key, as on main before daily games step 1). */
async function renderHomeWithDailyGuess(dailyGuess: boolean | undefined): Promise<string> {
  const { home, registry } = await load();
  const features = { ...registry.REGISTRY.hub.features } as unknown as Record<string, unknown>;
  if (dailyGuess === undefined) delete features.dailyGuess;
  else features.dailyGuess = dailyGuess;
  burrowSwitch.features = features;
  try {
    return renderToStaticMarkup(await home.default());
  } finally {
    burrowSwitch.features = null;
  }
}

const lines = (html: string): string[] => html.replace(/<[^>]+>/g, '\n').split('\n').map((s) => s.trim()).filter(Boolean);
const count = (html: string, re: RegExp): number => (html.match(re) ?? []).length;
/** The markup of the first element of `html` that starts with `open`, nested elements of the same tag counted. */
function block(html: string, open: string, tag: string): string {
  const start = html.indexOf(open);
  expect(start, `no ${open}`).toBeGreaterThan(-1);
  let depth = 0;
  for (const m of html.slice(start).matchAll(new RegExp(`<(/?)${tag}\\b`, 'g'))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, start + m.index! + `</${tag}>`.length);
  }
  throw new Error(`unclosed ${open}`);
}

beforeEach(() => {
  blocks.values = {};
  blocks.calls = [];
  fake.user = null;
  fake.profile = { data: { username: 'mingi', xp: 90000, daily_streak: 6, last_daily_date: TODAY }, error: null };
  fake.memberships = { data: MEMBERSHIPS, error: null };
  fake.throwOn = null;
  fake.playsToday = [];
  fake.playsAsked = [];
  burrowSwitch.open = false;
  burrowSwitch.features = null;
  burrowSwitch.noHubPages = false;
  assetRows.rows = [];
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('the top bar', () => {
  it('has the rabbit and the wordmark, the tabs Home, Quizzes and Community (no Blind test tab, owner 2026-11-07), search and sign in', async () => {
    const html = await renderHome();
    const nav = block(html, '<header class="hub-h2-head"', 'header');
    expect(nav).toContain(`<nav aria-label="${COPY['hp.nav.main']}"`);
    expect(nav).toContain('src="/_next/image?url=%2Fmascot%2Fmascot-default.png');
    // the board's wordmark: "Bunny" in ink, "verse" in the accent, split from the registry name
    expect(nav).toContain('<span class="hub-h2-brand-name">Bunny<span class="hub-h2-brand-tail">verse</span></span>');
    expect(nav).toContain('<a href="/" class="hub-h2-tab hub-h2-tab-on" aria-current="page">Home</a>');
    for (const [href, label] of [['#hot', 'Quizzes'], ['#community', 'Community']] as const) {
      expect(nav).toContain(`<a href="${href}" class="hub-h2-tab">${label}</a>`);
    }
    // owner, 2026-11-07: no Blind test tab, even with the blind test of the day on the page (it stays in Today)
    expect(nav).not.toContain('href="#today"');
    expect(nav).not.toContain('>Blind test<');
    // launch day: the Burrow is open (dailyGuess on, its pages in the map), its tab leads to /daily; no language switch yet.
    // Home v4: the tab is "Daily games" (the copy key hp.nav.burrow); its badge is the count of the dle games left on THIS device, so the server
    // draws none (the browser reads it, home-day.tsx HomeNavBadge, the same count as the badge of every other hub page).
    expect(nav).toContain('<a href="/daily" class="hub-h2-tab">Daily games</a>');
    expect(nav).not.toContain('hub-h2-badge');
    expect(nav).not.toContain('lang="fr"');
    // the search button is a link to the search page of KpopQuiz (the filter of Hot now is All), named after that site (review fix)
    expect(nav).toMatch(/<a href="https:\/\/kpopquiz\.org\/search" aria-label="Search KpopQuiz" class="hub-h2-iconbtn hub-h2-btn">/);
    expect(nav).not.toContain('both sites');
    expect(nav).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Sign in<\/button>/);
  });

  it('is ink and cream: no pink or orange in the bar itself (the wordmark tail and the Burrow badge are the board\'s pink)', async () => {
    const css = (await import('node:fs')).readFileSync(new URL('../../../styles/sites/hub/h2.css', import.meta.url), 'utf8');
    for (const cls of ['hub-h2-head', 'hub-h2-nav', 'hub-h2-tab', 'hub-h2-solid', 'hub-h2-me', 'hub-h2-iconbtn']) {
      const rules = css.split('\n').filter((l) => new RegExp(`\\.${cls}[ ,{:]`).test(l) && !l.includes('@media'));
      expect(rules.length, cls).toBeGreaterThan(0);
      for (const r of rules) expect(r, cls).not.toMatch(/--hub-(k|a)\b|#D13A6E|#C2410C|--ux-pink/);
    }
  });

  it('signed in: the level chip links to the fan\'s passport page, no sign in button', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    const { getLevelInfo } = await import('@/lib/constants');
    const nav = block(html, '<header class="hub-h2-head"', 'header');
    // review fix: a signed-in fan keeps a real way to /passport (a route of the hub) from the home
    // home v4: the chip keeps "Lv N" and is named after the passport, a level per site (HOME-AUDIT.md P2-5)
    expect(nav).toMatch(/<a href="\/passport" aria-label="Your passport, KpopQuiz level \d+, OtakuQuiz level \d+" class="hub-h2-me">.*M<\/span>Lv \d+<\/a>/);
    expect(nav).not.toContain('href="#community" class="hub-h2-me"');
    expect(nav).toContain(`Lv ${getLevelInfo(90080, 'hub').level}`);
    expect(nav).not.toContain('>Sign in<');
  });
});

describe('the bands', () => {
  it('are in the order of the audit, one column of full-width bands, in reading order: hero, Today\'s games, Pick your side, Popular beside the Quick question, Crossover, Community, About', async () => {
    const html = await renderHome();
    const order = ['aria-labelledby="hero-h"', '<section id="today"', 'aria-labelledby="sides-h"', '<section id="hot"', 'aria-labelledby="quick-h"', 'aria-labelledby="cross-h"', '<section id="community"', 'aria-labelledby="what-h"']
      .map((m) => html.indexOf(m));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // the old two-column rows are gone; every band is a section (Today is no longer an aside, audit P1-9)
    expect(html).not.toContain('hub-h2-cols');
    expect(html).not.toContain('<aside id="today"');
    // the page ends: About (the SEO block), then the footer
    expect(html.indexOf('aria-labelledby="what-h"')).toBeLessThan(html.indexOf('<footer class="hub-h2-foot"'));
  });

  it('the headings: one h1, then h2 bands (Today\'s games, Pick your side, Popular this week, When K-pop meets anime, Community, What is Bunnyverse?), h3 inside', async () => {
    const html = await renderHome();
    const h2 = [...html.matchAll(/<h2 [^>]*>([^<]*)<\/h2>/g)].map((m) => m[1]);
    expect(h2).toEqual(['One account for both sites', 'Today&#x27;s games', 'Pick your side', 'Popular this week', 'When K-pop meets anime', 'Community', 'What is Bunnyverse?']);
    const h3 = [...html.matchAll(/<h3 [^>]*>(?:<a [^>]*>)?([^<]*)/g)].map((m) => m[1]);
    for (const name of ['Kpop', 'Otaku', 'Quick question', 'Did you know?', 'Debate of the day', 'Top fans this week', 'How do the daily games work?']) expect(h3.some((t) => t!.startsWith(name)), name).toBe(true);
  });

  it('has one primary (solid) action per band: the hero\'s ink button, a game card each in Today, a site button each, none in Popular and Quick question', async () => {
    const html = await renderHome();
    const solid = (b: string): number => count(b, /class="hub-h2-cta hub-h2-cta-(?:ink|site)[ "]/g);
    expect(solid(block(html, '<section aria-labelledby="hero-h"', 'section'))).toBe(1);
    expect(solid(block(html, '<section id="today"', 'section'))).toBe(2);
    expect(solid(block(html, '<section aria-labelledby="sides-h"', 'section'))).toBe(2);
    expect(solid(block(html, '<section id="hot"', 'section'))).toBe(0);
    expect(solid(block(html, '<section aria-labelledby="cross-h"', 'section'))).toBe(0);
    expect(solid(block(html, '<section id="community"', 'section'))).toBe(0);
  });
});

describe('the hero and Pick your side', () => {
  it('has one h1 (unchanged), no eyebrow, the line, and for a guest the main button then Surprise me', async () => {
    const html = await renderHome();
    expect(count(html, /<h1\b/g)).toBe(1);
    expect(html).toContain('<h1 id="hero-h" class="hub-h2-h1">Quizzes and daily games for K-pop and anime fans</h1>');
    expect(html).not.toContain('Two fandoms, one passport, every day');
    expect(html).not.toContain('hub-h2-eyebrow">Two');
    // flipped: the line is "Start with today's puzzles, or pick any quiz." and the row holds the main button (down to Today) and Surprise me
    expect(html).toMatch(/<p class="hub-h2-lede">Start with today&#x27;s puzzles, or pick any quiz\.<\/p><div class="hub-h2-actions-row"><a href="#today" class="hub-h2-cta hub-h2-cta-ink hub-h2-btn">Play today&#x27;s games<svg[^>]*>.*<\/svg><\/a><button type="button" class="hub-h2-ghost hub-h2-btn">.*Surprise me<\/button><\/div>/);
    expect(html).not.toContain('role="status"');
  });

  it('signed in: the line welcomes the fan and Surprise me stays; the main button is the one of the Your day card (no second one in the row)', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    const hero = block(html, '<section aria-labelledby="hero-h"', 'section');
    expect(hero).toMatch(/<p class="hub-h2-lede">Welcome back, @mingi\.<\/p><button type="button" class="hub-h2-ghost hub-h2-btn">/);
    expect(hero).not.toContain('hub-h2-actions-row');
    expect(hero).not.toContain('Play today&#x27;s games</a><button');
  });

  it('says what Bunnyverse is and who it is for, in one sentence right under the H1, in the server HTML (owner, 2026-10-29: rule 3.1)', async () => {
    const html = await renderHome();
    const { registry } = await load();
    const h1 = '<h1 id="hero-h" class="hub-h2-h1">Quizzes and daily games for K-pop and anime fans</h1>';
    // the element right after the H1, before the line and Surprise me (DOM order = reading order)
    const m = /<\/h1><p class="hub-h2-def">([^<]*)<\/p><div class="hub-h2-lede-row hub-h2-lede-col"><p class="hub-h2-lede">/.exec(html);
    expect(m, 'the definition right under the H1').not.toBeNull();
    const at = { h1: html.indexOf(h1), def: html.indexOf('<p class="hub-h2-def">'), lede: html.indexOf('<p class="hub-h2-lede">') };
    expect(at.h1).toBeGreaterThan(-1);
    expect(at.h1 < at.def && at.def < at.lede).toBe(true);
    const def = m![1]!;
    expect(def).toBe('Bunnyverse is a free website where K-pop and anime fans play quizzes and daily games, with one account for every site.');
    // what the site is (its name from the registry) and who it is for
    expect(def.startsWith(`${registry.REGISTRY.hub.brand.name} is a `)).toBe(true);
    expect(def).toContain('K-pop and anime fans');
    // one sentence: one end mark, the last character
    expect(def.match(/[.!?]/g)).toEqual(['.']);
    expect(def.endsWith('.')).toBe(true);
    // no typed number, no superlative, no dash; plain words
    expect(def).not.toMatch(/\d/);
    expect(def).not.toMatch(/\b(best|most|top|greatest|ultimate|biggest|largest|leading|number one|favou?rite)\b/i);
    expect(def).not.toMatch(DASHES);
    expect(def.split(/\s+/).length).toBeLessThanOrEqual(30);
    // one place only: the detailed answer at the bottom keeps its own words
    expect(html.split(def).length - 1).toBe(1);
  });

  it('has the two sites side by side, in the network order, each name the link to its site and its quiz of the moment its own link', async () => {
    const html = await renderHome();
    const { registry } = await load();
    const sites = block(html, '<section aria-labelledby="sides-h"', 'section');
    expect(sites).toContain('<h2 id="sides-h" class="hub-h2-h2">Pick your side</h2>');
    expect(sites).toContain('Two quiz sites. One account for both.');
    const cards = [...sites.matchAll(/<article class="hub-h2-card hub-h2-site hub-h2-s-([ka])">/g)].map((m) => m[1]);
    expect(cards).toEqual(['k', 'a']);
    // the card is no longer one big link: the H3 name and the button are the links to the site, the quiz line is a link to the quiz
    expect([...sites.matchAll(/<h3 class="hub-h2-h3"><a href="([^"]+)" class="hub-h2-site-link">/g)].map((m) => m[1])).toEqual([`${registry.REGISTRY.kpop.url}/`, registry.REGISTRY.anime.url]);
    expect(sites).toContain('<a href="https://kpopquiz.org/" class="hub-h2-site-link">Kpop<span class="hub-h2-tail">Quiz</span></a>');
    expect(sites).toContain('class="hub-h2-site-link">Otaku<span class="hub-h2-tail">Quiz</span></a>');
    // the real counts, rounded down by the shared helper of the public counts (482 and 138 in the module)
    expect(sites).toContain('<span class="hub-h2-meta hub-h2-num">480+ quizzes</span>');
    expect(sites).toContain('<span class="hub-h2-meta hub-h2-num">130+ quizzes</span>');
    expect(sites).toContain('Groups, eras, members, songs');
    expect(sites).toContain('Series, arcs, characters, openings');
    // flipped words: "Top now" is "Popular now", "Just added" is "New"; each quiz of the moment is a link to its canonical page
    expect(sites).toContain('>Popular now</span>');
    expect(sites).toContain('>New</span>');
    expect(sites).not.toContain('Top now');
    expect(sites).not.toContain('Just added');
    expect(count(sites, /class="hub-h2-ql"/g)).toBe(2);
    // flipped: "Enter {name}" is a descriptive button, with the address it opens (SEO rule 8.1, rule 16: a contextual link)
    expect(sites).toContain('>Browse K-pop quizzes<svg');
    expect(sites).toContain('>Browse anime quizzes<svg');
    expect(sites).not.toContain('Enter KpopQuiz');
    expect(sites).toContain('>kpopquiz.org</span>');
    expect(sites).toContain('>bunnyverse.org/anime</span>');
  });

  it('draws an image area for a site ONLY when its admin slot is filled; empty, a flat tile with the name down the side, no placeholder panel', async () => {
    const html = await renderHome();
    expect(html).toContain('<span lang="ko" class="hub-h2-vt">케이팝 퀴즈</span>');
    expect(html).toContain('<span lang="ja" class="hub-h2-vt">オタククイズ</span>');
    const sites = block(html, '<section aria-labelledby="sides-h"', 'section');
    expect(sites).not.toContain('<img');
    expect(sites).not.toContain('hub-h2-ph ');
    expect(sites).not.toContain('hub-h2-site-media-img');
    expect(html.toLowerCase()).not.toContain('admin');
  });

  it('a filled site slot draws the owner\'s image in place of the tile (home:site-k only here), the other site keeps its flat tile', async () => {
    assetRows.rows = [imageRow('home:site-k')];
    const sites = block(await renderHome(), '<section aria-labelledby="sides-h"', 'section');
    expect(count(sites, /<img /g)).toBe(1);
    expect(sites).toContain('<img src="https://img.test/home-site-k-1920.webp" alt="" width="120" height="216" loading="lazy" decoding="async" class="hub-h2-ph-img" style="object-position:50% 50%"/>');
    expect(sites).toContain('hub-h2-site-media hub-h2-site-media-img');
    expect(sites).not.toContain('케이팝 퀴즈');
    expect(sites).toContain('オタククイズ');
  });
});

describe('Today\'s games', () => {
  it('is a section with the ribbon, the header, the two games, then "Also today" with the quizzes of the day and the blind test playable in its tile', async () => {
    const html = await renderHome();
    const today = block(html, '<section id="today"', 'section');
    expect(today).toContain('aria-labelledby="today-h"');
    expect(today).toContain('<h2 id="today-h" class="hub-h2-h2">Today&#x27;s games</h2>');
    expect(today).toContain('Same puzzles for everyone. Each clue tells you how close you are.');
    expect(today).toContain('<span class="hub-h2-countdown">New puzzles in a few hours</span>');
    expect(today).toContain('<a href="/daily" class="hub-h2-tl">All daily games<svg');
    // tier 1: the two games, each an article with an H3, its state, one call to action in the colour of its site
    expect(count(today, /<article class="hub-h2-game /g)).toBe(2);
    expect(today).toContain('<h3 id="game-kpopdle" class="hub-h2-h3">Kpop<span class="hub-h2-tail">dle</span></h3>');
    expect(today).toContain('<h3 id="game-otakudle" class="hub-h2-h3">Otaku<span class="hub-h2-tail">dle</span></h3>');
    expect(today).toContain('Guess today&#x27;s K-pop idol');
    expect(today).toContain('Guess today&#x27;s anime character');
    expect(count(today, />Not started</g)).toBe(2);
    expect(count(today, />Unlimited tries</g)).toBe(2);
    expect(today).toMatch(/<a href="\/kpopdle" class="hub-h2-cta hub-h2-cta-site hub-h2-btn">Play Kpopdle<svg/);
    expect(today).toMatch(/<a href="\/otakudle" class="hub-h2-cta hub-h2-cta-site hub-h2-btn">Play Otakudle<svg/);
    // tier 2: "Also today", the quizzes of the day as tiles (the title is the link), the blind test
    expect(today).toContain('<h3 class="hub-h2-rt hub-h2-also">Also today</h3>');
    expect(today).toContain('>K-pop quiz of the day</a>');
    expect(today).toContain('>Anime quiz of the day</a>');
    expect(today).toContain('ZEROBASEONE: From Boys Planet to In Bloom');
    expect(today).toContain('Journey&#x27;s Beginning: Frieren Basics');
    // the real slug of each bank, entering the daily run (?daily=quiz), never the /daily redirect
    expect(today).toContain('href="https://kpopquiz.org/q/zerobaseone-from-boys-planet-to-in-bloom?daily=quiz"');
    expect(today).toContain('href="https://bunnyverse.org/anime/q/journeys-beginning-frieren-basics?daily=quiz"');
    expect(count(today, /<span class="hub-h2-verb">Play quiz<svg/g)).toBe(2);
    // the debate left Today for the Community band
    expect(today).not.toContain('Debate of the day');
    expect(today).not.toContain('>Vote<');
    // the blind test: the real size of the set (10 songs), the 10 second preview, the way to the whole set
    expect(today).toContain('Blind test of the day');
    expect(today).toContain('aria-label="Play a 10 second preview"');
    expect(today).toContain('10 songs, 10 seconds each · KpopQuiz');
    expect(today).toMatch(/<a href="https:\/\/kpopquiz\.org\/blindtest\?daily=true" class="hub-h2-tl">Play all 10 songs<svg/);
    // no label "Dle games · daily puzzles", no "Quizzes" micro-label, no Open the Dle games
    expect(today).not.toContain('daily puzzles');
    expect(today).not.toContain('Open the Dle games');
  });

  it('draws the icon slot of each row (a row always has an icon) and the owner\'s image of its slot when it is filled, never both', async () => {
    let today = block(await renderHome(), '<section id="today"', 'section');
    for (const id of ['today-kpopdle', 'today-otakudle', 'today-qotd-k', 'today-qotd-a', 'today-blindtest']) expect(today, id).toContain(`data-slot-icon="${id}"`);
    expect(today).not.toContain('<img');
    assetRows.rows = [imageRow('home:kpopdle'), imageRow('home:qotd-k'), iconRow('today-otakudle')];
    today = block(await renderHome(), '<section id="today"', 'section');
    // filled: the image (the 96 px file) and no icon of that slot
    expect(today).toContain('<img src="https://img.test/home-kpopdle-96.webp" alt="" width="64" height="64"');
    expect(today).toContain('<img src="https://img.test/home-qotd-k-96.webp" alt="" width="48" height="48"');
    expect(today).not.toContain('data-slot-icon="today-kpopdle"');
    expect(today).not.toContain('data-slot-icon="today-qotd-k"');
    // not filled, an icon row of the slot saved by the owner (the library's star, not the default)
    expect(today).toContain('data-slot-icon="today-otakudle"');
    expect(today).toContain('data-slot-icon="today-qotd-a"');
    expect(count(today, /<img /g)).toBe(2);
  });

  it('hides the Burrow (Kpopdle and Otakudle) while the registry feature dailyGuess is off or missing, and while the hub has no page for it even with it on; shows it with it on (launch day)', async () => {
    const WORDS = ['Kpopdle', 'Otakudle', 'Dle games', 'All daily games', 'href="/daily"', 'href="/kpopdle"'];
    for (const feature of [undefined, false]) {
      const html = await renderHomeWithDailyGuess(feature);
      for (const word of WORDS) expect(html, `${String(feature)} ${word}`).not.toContain(word);
    }
    // launch day (RUNBOOK K8c): the feature on and the pages in the hub's map, the Burrow is drawn; the page as served is that one
    const on = await renderHomeWithDailyGuess(true);
    for (const word of WORDS) expect(on, `true ${word}`).toContain(word);
    expect(await renderHome()).toBe(on);
    // the feature on, the hub's map without the pages (before launch day, or after a revert): no door to a 404
    burrowSwitch.noHubPages = true;
    const noPages = await renderHomeWithDailyGuess(true);
    burrowSwitch.noHubPages = false;
    for (const word of WORDS) expect(noPages, `no pages ${word}`).not.toContain(word);
    // the old environment flag is not the switch: it neither opens a closed Burrow nor closes the open one
    for (const v of ['1', '0']) {
      vi.stubEnv('DAILY_GUESS', v);
      expect(await renderHomeWithDailyGuess(false), `DAILY_GUESS ${v}`).not.toContain('Kpopdle');
      vi.stubEnv('DAILY_GUESS', v);
      expect(await renderHome(), `DAILY_GUESS ${v}`).toContain('Kpopdle');
    }
  });

  it('closed, the band still has the quizzes of the day and no game card; the tab and the hero button follow what is there', async () => {
    const closed = await renderHomeWithDailyGuess(false);
    const today = block(closed, '<section id="today"', 'section');
    expect(count(today, /<article class="hub-h2-game /g)).toBe(0);
    expect(today).toContain('>K-pop quiz of the day</a>');
    expect(block(closed, '<header class="hub-h2-head"', 'header')).not.toContain('Daily games');
  });

  it('the counter is honest: "x of y played today" counts the two games (finished on this device) and the quizzes of the day (finished on their sites), so it can reach y of y', async () => {
    fake.user = { id: 'u-1' };
    // the server draws the games not started (their state is this device's, read in the browser); the quizzes it knows
    fake.playsToday = [{ quiz_id: 'kpop:zerobaseone-from-boys-planet-to-in-bloom' }];
    let yd = block(await renderHome(), '<aside aria-labelledby="yd-h"', 'aside');
    expect(yd).toContain('1 of 4 played today');
    // the Burrow closed: only what the server knows, and both quizzes finished is 2 of 2
    fake.playsToday = [{ quiz_id: 'kpop:zerobaseone-from-boys-planet-to-in-bloom' }, { quiz_id: 'anime:journeys-beginning-frieren-basics' }];
    yd = block(await renderHomeWithDailyGuess(false), '<aside aria-labelledby="yd-h"', 'aside');
    expect(yd).toContain('2 of 2 played today');
    // the debate is a vote: it counts in neither
    blocks.values.getDebate = null;
    yd = block(await renderHomeWithDailyGuess(false), '<aside aria-labelledby="yd-h"', 'aside');
    expect(yd).toContain('2 of 2 played today');
    // and the badge of the tab is the device's, not the server's: no number drawn by the server
    expect(block(await renderHome(), '<header class="hub-h2-head"', 'header')).not.toContain('hub-h2-badge');
  });

  it('signed out: a line says playing is free and offers sign in, no counter, no Your day card', async () => {
    const html = await renderHome();
    const today = block(html, '<section id="today"', 'section');
    expect(today).toMatch(/Playing is free\. <button[^>]*aria-haspopup="dialog"[^>]*>Sign in<\/button> to keep your streak on both sites\./);
    expect(html).not.toContain('played today');
    expect(html).not.toContain('Your day');
    expect(html).not.toContain('aria-labelledby="yd-h"');
  });

  it('signed in: the Your day card (streak of each site joined, the counter, the main button, the passport), a quiz done is marked Played', async () => {
    fake.user = { id: 'u-1' };
    let html = await renderHome();
    let yd = block(html, '<aside aria-labelledby="yd-h"', 'aside');
    expect(yd).toContain('<h2 id="yd-h" class="hub-h2-h3">Your day, @mingi</h2>');
    expect(yd).toContain('>Streak</span>');
    expect(yd).toContain('>K-pop 6 days</span>');
    expect(yd).toContain('>Anime 2 days</span>');
    expect(yd).toContain('0 of 4 played today');
    // before the browser has read the device, the main button leads to the games; after, it names the next one (home-day-logic.ts)
    expect(yd).toMatch(/<a href="#today" class="hub-h2-cta hub-h2-cta-ink hub-h2-btn">Play today&#x27;s games<svg/);
    expect(yd).toMatch(/<a href="\/passport" aria-label="Open your passport: KpopQuiz level \d+, OtakuQuiz level \d+"[^>]*>Open your passport<svg/);
    expect(yd).toMatch(/>KpopQuiz Lv \d+ · OtakuQuiz Lv \d+<\/span>/);
    expect(html).not.toContain('Playing is free');
    // the page asks for the fan's plays of today on the two quizzes of the day, and nothing else
    expect(fake.playsAsked.at(-1)).toMatchObject({
      select: 'quiz_id', 'eq:player_id': 'u-1', 'in:quiz_id': ['kpop:zerobaseone-from-boys-planet-to-in-bloom', 'anime:journeys-beginning-frieren-basics'], 'gte:created_at': `${TODAY}T00:00:00Z`,
    });
    fake.playsToday = [{ quiz_id: 'kpop:zerobaseone-from-boys-planet-to-in-bloom' }];
    html = await renderHome();
    yd = block(html, '<aside aria-labelledby="yd-h"', 'aside');
    expect(yd).toContain('1 of 4 played today');
    const today = block(html, '<section id="today"', 'section');
    expect(today).toMatch(/<span class="hub-h2-chip hub-h2-chip-done"><svg[^>]*>.*<\/svg>Played<\/span>/);
    expect(count(today, /<span class="hub-h2-verb">Play quiz<svg/g)).toBe(1);
    // the line of the hero says the same, from the same count, once the browser knows; the server draws the first sentence alone
    expect(block(html, '<section aria-labelledby="hero-h"', 'section')).toContain('Welcome back, @mingi.</p>');
  });

  it('signed out: the plays are never read', async () => {
    await renderHome();
    expect(fake.playsAsked).toEqual([]);
  });
});

describe('Quick question and Did you know', () => {
  it('has the question with its four answers as rows A to D, and the two sourced facts, under H3 headings of the Popular band', async () => {
    const html = await renderHome();
    const quick = block(html, '<aside aria-labelledby="quick-h"', 'aside');
    expect(quick).toContain('<h3 id="quick-h" class="hub-h2-h3">Quick question</h3>');
    expect(quick).toContain('Tap an answer. No sign-in needed.');
    expect(quick).not.toContain('60 seconds');
    expect(quick).toContain('ITZY&#x27;s 2022 single Cheshire borrows the concept of a famous cat from which story?');
    expect(count(quick, /<button type="button" class="hub-h2-opt">/g)).toBe(4);
    for (const a of ['Puss in Boots', 'The Jungle Book', 'Alice in Wonderland', 'The Wizard of Oz']) expect(quick).toContain(a);
    expect(quick).toContain('From K-pop Songs About Magic');
    expect(quick).not.toContain('role="status"');
    expect(quick).toContain('>Did you know?</h3>');
    // each source is a visible link beside its fact (SEO rules 3.8 and 5.5), https only, nofollow noopener (review fix)
    expect(count(quick, /<span class="hub-h2-fsrc">Source: <a href="https:\/\/en\.wikipedia\.org\/wiki\/[A-Za-z_]+" rel="nofollow noopener" class="hub-h2-srclink">Wikipedia<\/a><\/span>/g)).toBe(2);
    expect(quick).toContain('href="https://en.wikipedia.org/wiki/In_Bloom"');
    expect(quick).toContain('href="https://en.wikipedia.org/wiki/Frieren"');
    // each fact names its subject, the group or series it is about (review fix)
    expect(quick).toContain('<span class="hub-h2-meta hub-h2-fact-subj"><span aria-hidden="true" class="hub-h2-sdot hub-h2-sdot-s"></span>ZEROBASEONE</span>');
    expect(quick).toContain('<span class="hub-h2-meta hub-h2-fact-subj"><span aria-hidden="true" class="hub-h2-sdot hub-h2-sdot-s"></span>Frieren: Beyond Journey&#x27;s End</span>');
    expect(quick).toContain('Sōsō no Furīren');
  });
});

describe('the sources of the facts (review fix: SEO rules 3.8 and 5.5)', () => {
  it('leaves out a fact whose source has no https page, and one with no subject; the other fact stays', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const d = s.sampleDyk();
    for (const kpop of [{ ...d.kpop!, sourceUrl: 'http://en.wikipedia.org/wiki/In_Bloom' }, { ...d.kpop!, sourceUrl: 'javascript:alert(1)' }, { ...d.kpop!, sourceUrl: null }, { ...d.kpop!, subject: null }]) {
      blocks.values.getDidYouKnow = { ...d, kpop };
      const quick = block(await renderHome(), '<aside aria-labelledby="quick-h"', 'aside');
      expect(quick).not.toContain('In Bloom samples');
      expect(quick).not.toContain('javascript:');
      expect(quick).toContain('Sōsō no Furīren');
    }
  });

  it('a Crossover fact whose source has no https page leaves with its source; the tiles stay', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const x = s.sampleCrossover();
    blocks.values.getCrossover = { ...x, fact: { ...x.fact!, sourceUrl: '//en.wikipedia.org/wiki/IVE' } };
    const cross = block(await renderHome(), '<section aria-labelledby="cross-h"', 'section');
    expect(cross).not.toContain('IVE sang');
    expect(cross).not.toContain('hub-h2-srclink');
    expect(count(cross, /class="hub-h2-card hub-h2-xt /g)).toBe(3);
  });

  it('escapes the source at the sink: a name or an address with markup in it stays text', async () => {
    await load();
    const { FactSource } = await import('@/components/hub/home/home-ui');
    const { createElement } = await import('react');
    const html = renderToStaticMarkup(createElement(FactSource, { name: '<b>Wiki</b>', url: 'https://x.test/a"onmouseover="y', className: 'hub-h2-fsrc' }));
    expect(html).toBe('<span class="hub-h2-fsrc">Source: <a href="https://x.test/a&quot;onmouseover=&quot;y" rel="nofollow noopener" class="hub-h2-srclink">&lt;b&gt;Wiki&lt;/b&gt;</a></span>');
  });
});

describe('Popular this week', () => {
  const popular = (html: string): string => block(html, '<div class="hub-h2-hot"', 'div');

  it('is the band of the ranked list: the heading, its line, the filter by site, no Start easy chip (one dimension, audit P2-4)', async () => {
    const html = await renderHome();
    const band = block(html, '<section id="hot"', 'section');
    expect(band).toContain('aria-labelledby="hot-h"');
    const hot = popular(html);
    expect(hot).toContain('<h2 id="hot-h" class="hub-h2-h2">Popular this week</h2>');
    expect(hot).toContain('Ranked by plays this week on KpopQuiz and OtakuQuiz.');
    expect(hot).not.toContain('Hot right now');
    expect(hot).toContain('<div role="group" aria-label="Filter" class="hub-h2-fchips">');
    const chips = (h: string): string[] => [...h.matchAll(/<button type="button" aria-pressed="(true|false)" class="hub-h2-fchip">(?:<span aria-hidden="true" class="[^"]+"><\/span>)?([^<]+)<\/button>/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(chips(hot)).toEqual(['true All', 'false KpopQuiz', 'false OtakuQuiz']);
    expect(hot).not.toContain('Start easy');
  });

  it('leaves a site chip out when that site has no hot quiz (review fix)', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const h = s.sampleHot();
    blocks.values.getHot = { ...h, anime: [], all: h.kpop, easy: h.easy!.filter((c) => c.site === 'kpop') };
    const hot = popular(await renderHome());
    const chips = [...hot.matchAll(/class="hub-h2-fchip">(?:<span aria-hidden="true" class="[^"]+"><\/span>)?([^<]+)<\/button>/g)].map((m) => m[1]);
    expect(chips).toEqual(['All', 'KpopQuiz']);
  });

  it('lists six quizzes, three of each site alternating, each linked to its own site', async () => {
    const html = await renderHome();
    const hot = popular(html);
    const ol = block(hot, '<ol class="hub-h2-rows"', 'ol');
    const hrefs = [...ol.matchAll(/<a href="([^"]+)" class="hub-h2-rr/g)].map((m) => m[1]!);
    expect(hrefs).toHaveLength(6);
    // OtakuQuiz lives in the folder /anime of bunnyverse.org (2026-10-28): the site of a link is its registry url, folder included.
    const siteOf = (h: string): string => (h.startsWith('https://kpopquiz.org/') ? 'kpop' : h.startsWith('https://bunnyverse.org/anime/') ? 'anime' : h);
    expect(hrefs.map(siteOf)).toEqual(['kpop', 'anime', 'kpop', 'anime', 'kpop', 'anime']);
    expect(hot).toContain('Ultimate BTS era quiz - only real ARMYs survive');
    expect(hot).toContain('Name and Face: Death Note True or False');
    expect(hot).toContain('KpopQuiz · BTS · Medium');
    expect(hot).toContain('OtakuQuiz · Death Note · Medium · True or false');
    expect(count(hot, /class="hub-h2-chip hub-h2-chip-s hub-h2-hplays"/g)).toBe(3);
    expect(hot).toContain('<span class="hub-h2-meta hub-h2-num hub-h2-hplays">2.7k plays</span>');
    expect(hot).toMatch(/>All K-pop quizzes on KpopQuiz<svg/);
    expect(hot).toMatch(/>All anime quizzes on OtakuQuiz<svg/);
  });

  it('shows the quiz\'s own cover when it has one, else its group\'s photo as its own site shows it (owner, 2026-10-30), else the initials of its group on the colour of its site', async () => {
    const hot = popular(await renderHome());
    const { SAMPLE_COVER } = await import('@/lib/site/hub/home-samples.test-support');
    expect(hot).toContain(`<img src="${SAMPLE_COVER}" alt="" width="48" height="48" loading="lazy" decoding="async" class="hub-h2-th-img"/>`);
    // Owner decision 2026-10-30 (was: one image, the cover): BLACKPINK has no cover of its own and shows the group photo kpopquiz.org
    // shows (public/idols, groupPhotoUrl), with no credit, as there. Exactly these two images, in the order of the rows.
    expect(hot).toContain('<img src="/idols/BLACKPINK.jpg" alt="" width="48" height="48" loading="lazy" decoding="async" class="hub-h2-th-img"/>');
    expect([...hot.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1])).toEqual([SAMPLE_COVER, '/idols/BLACKPINK.jpg']);
    expect(count(hot, /<img /g)).toBe(2);
    // No photo under the group or series of the others: the initials, as before.
    for (const tile of ['DN', 'SK', 'OP', 'CM']) expect(hot).toContain(`<span aria-hidden="true" class="hub-h2-th hub-h2-th-48">${tile}</span>`);
  });

  it('shows the photo OtakuQuiz shows for a series (its free photo), never the initials over it (owner, 2026-10-30)', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const h = s.sampleHot();
    const frieren = h.anime.find((c) => c.group === 'Frieren')!;
    blocks.values.getHot = { ...h, all: [h.kpop[1]!, frieren] };
    const hot = popular(await renderHome());
    expect(hot).toContain('<span aria-hidden="true" class="hub-h2-th hub-h2-th-48"><img src="/series/frieren.webp" alt="" width="48" height="48" loading="lazy" decoding="async" class="hub-h2-th-img"/></span>');
    expect(hot).not.toContain('class="hub-h2-th hub-h2-th-48">Fr</span>');
    expect(hot).toContain('class="hub-h2-th hub-h2-th-48">SK</span>');
  });

  it('the structured data keeps its own name: the ItemList is "Hot right now" though the heading is "Popular this week" (a point for the owner)', async () => {
    const html = await renderHome();
    expect(html).toContain('Popular this week');
    const list = [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => JSON.parse(m[1]!.replace(/&quot;/g, '"')) as Record<string, unknown>)[1]!;
    expect(list.name).toBe('Hot right now');
    expect(COPY['hp.hot.listName']).toBe('Hot right now');
  });
});

describe('When K-pop meets anime', () => {
  it('is a band of three tiles of one pattern, with the fact as its line; no image area while the slots are empty', async () => {
    const html = await renderHome();
    const cross = block(html, '<section aria-labelledby="cross-h"', 'section');
    expect(cross).toContain('When K-pop meets anime');
    expect(count(cross, /class="hub-h2-card hub-h2-xt /g)).toBe(3);
    expect(cross).not.toContain('<img');
    expect(cross).not.toContain('hub-h2-xph');
    expect(cross).toContain('IVE sang Will, the opening theme of Pok');
    // the fact names its source beside it (SEO rule 3.8), the name a link to the source (rule 5.5, review fix)
    expect(cross).toContain('<span class="hub-h2-meta">Source: <a href="https://en.wikipedia.org/wiki/IVE" rel="nofollow noopener" class="hub-h2-srclink">Wikipedia</a></span>');
    // each tile: the title is the link (an H3), then "Play quiz"
    expect(cross).toContain('<h3 class="hub-h2-h3"><a href="https://kpopquiz.org/kpop-demon-hunters-quiz" class="hub-h2-stretch">');
    expect(cross).toContain('Six questions · The animated film and its songs');
    expect(cross).toContain('href="https://bunnyverse.org/anime/q/one-opening-many-endings-chainsaw-man-theme-songs"');
    expect(count(cross, /<span class="hub-h2-verb">Play quiz<svg/g)).toBe(3);
  });

  it('draws a 3:2 image on a tile ONLY when its slot is filled (home:cross-2 here); the other two stay compact', async () => {
    assetRows.rows = [imageRow('home:cross-2')];
    const cross = block(await renderHome(), '<section aria-labelledby="cross-h"', 'section');
    expect(count(cross, /<img /g)).toBe(1);
    expect(count(cross, /class="hub-h2-xph"/g)).toBe(1);
    expect(cross).toContain('src="https://img.test/home-cross-2-400.webp"');
    // the filled tile is the second one
    expect(cross.indexOf('hub-h2-xph')).toBeGreaterThan(cross.indexOf('kpop-demon-hunters-quiz'));
  });
});

describe('Community: the debate of the day and Top fans', () => {
  const community = (html: string): string => block(html, '<section id="community"', 'section');

  it('is a band with the debate (an article, its question, Vote) and Top fans, each a card; the debate left Today', async () => {
    const comm = community(await renderHome());
    expect(comm).toContain('<h2 id="community-h" class="hub-h2-h2">Community</h2>');
    expect(comm).toContain('Vote on the debate of the day and see this week&#x27;s top fans.');
    expect(comm).toContain('<h3 id="debate-h" class="hub-h2-h3">Debate of the day</h3>');
    expect(comm).toContain('Best title track of 2025 so far?');
    expect(comm).toMatch(/<a href="https:\/\/kpopquiz\.org\/community" class="hub-h2-cta hub-h2-cta-line hub-h2-btn">Vote<svg/);
    // the debate row draws its icon slot, or the owner's image of home:debate when it is filled
    expect(comm).toContain('data-slot-icon="today-debate"');
  });

  it('draws the image of home:debate in the debate card when its slot is filled, in place of the icon', async () => {
    assetRows.rows = [imageRow('home:debate')];
    const comm = community(await renderHome());
    expect(comm).toContain('<img src="https://img.test/home-debate-96.webp" alt="" width="48" height="48"');
    expect(comm).not.toContain('data-slot-icon="today-debate"');
  });

  it('top fans: the K-pop board first, five rows linked to each fan\'s page on the hub, with the K-pop and Anime tabs', async () => {
    const fans = block(community(await renderHome()), '<article aria-labelledby="top-h"', 'article');
    expect(fans).toContain('<h3 id="top-h" class="hub-h2-h3">Top fans this week</h3>');
    expect(fans).toContain('<div role="group" aria-label="Leaderboard site" class="hub-h2-seg">');
    expect(count(fans, /class="hub-h2-frow/g)).toBe(5);
    expect([...fans.matchAll(/<a href="(\/u\/[^"]+)"/g)].map((m) => m[1])).toEqual(['/u/sunbae_mira', '/u/tteok_rider', '/u/mingi', '/u/hallyu_bean', '/u/dalgona_pop']);
    expect(fans).toContain('>Lv 42<');
    expect(fans).not.toContain('kenjiro_k');
    expect(fans).not.toContain('hub-h2-frow-me');
    // real data only: a handle and a level, no invented play counts
    expect(fans).not.toContain('plays');
  });

  it('signed in: the fan is marked on the board ("You") and the card leads to the passport', async () => {
    fake.user = { id: 'u-1' };
    const fans = block(community(await renderHome()), '<article aria-labelledby="top-h"', 'article');
    expect(fans).toMatch(/hub-h2-frow hub-h2-frow-me"><span class="hub-h2-fan-rank hub-h2-num">3<\/span>.*@mingi.*<span class="hub-h2-chip hub-h2-chip-ink">You<\/span>/);
    expect(fans).toContain('<a href="/passport" class="hub-h2-tl">Open your passport<svg');
  });
});

describe('the account card of a guest and Your day of a fan', () => {
  it('signed out: the promise and sign in, and what other sites see and never see, the same words as the privacy page, one click away', async () => {
    const { home, privacy } = await load();
    const homeHtml = renderToStaticMarkup(await home.default());
    const card = block(homeHtml, '<aside aria-labelledby="acc-h"', 'aside');
    expect(card).toContain('<h2 id="acc-h" class="hub-h2-h3">One account for both sites</h2>');
    expect(card).toContain('Your level and streaks follow you. Your email never does.');
    expect(card).toContain('Keep your daily streak');
    expect(card).toContain('Level up on KpopQuiz and OtakuQuiz');
    expect(card).toContain('No password needed');
    expect(card).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Sign in<\/button>/);
    expect(card).toContain('<details id="passport" class="hub-h2-pass-shares"><summary class="hub-h2-pass-sum">What other sites see, and never see</summary>');
    const shares = lines(block(card, '<div class="hub-h2-shares-cols"', 'div'));
    const policy = renderToStaticMarkup(privacy.default());
    const policyShares = lines(block(policy, '<div class="hub-h1-shares"', 'div'));
    // the same keys, in the same order: the titles and the lines of the block
    expect(policyShares.slice(1)).toEqual(shares);
    expect(shares).toEqual([
      COPY['shares.seesTitle'], COPY['shares.seesUsername'], COPY['shares.seesAvatar'], COPY['shares.seesLevel'], COPY['shares.seesSites'],
      COPY['shares.hidesTitle'], COPY['shares.hidesEmail'], COPY['shares.hidesSignIn'], COPY['shares.hidesHistory'],
    ]);
    // a guest and a fan differ only in this card, the line, the main button of the row and the counters (structure identical)
    expect(card).not.toContain('Your day');
  });

  it('signed in: the level of each site joined, the streak of each, and the way to the passport', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    const yd = block(html, '<aside aria-labelledby="yd-h"', 'aside');
    const { getLevelInfo } = await import('@/lib/constants');
    const k = getLevelInfo(90000, 'kpop');
    const a = getLevelInfo(80, 'anime');
    expect(yd).toContain(`KpopQuiz Lv ${k.level} · OtakuQuiz Lv ${a.level}`);
    expect(yd).toContain('Your day, @mingi');
    expect(yd).not.toContain('>Sign in<');
    expect(html).not.toContain('One account for both sites');
  });

  it('signed in with one site joined: that site only', async () => {
    fake.user = { id: 'u-1' };
    fake.memberships = { data: [MEMBERSHIPS[0]], error: null };
    const yd = block(await renderHome(), '<aside aria-labelledby="yd-h"', 'aside');
    expect(yd).toContain('KpopQuiz Lv');
    expect(yd).not.toContain('OtakuQuiz');
    expect(yd).not.toContain('Anime ');
  });
});

describe('the SEO block', () => {
  it('answers what Bunnyverse is in the server HTML, with only what is true today', async () => {
    const html = await renderHome();
    const seo = block(html, '<section aria-labelledby="what-h"', 'section');
    expect(seo).toContain('<h2 id="what-h" class="hub-h2-h2">What is Bunnyverse?</h2>');
    const answer = lines(block(seo, '<p class="hub-h2-seo-p"', 'p'))[0]!;
    // launch day (RUNBOOK K8c): the Burrow is open, so the answer names its games
    expect(answer).toBe('Bunnyverse is a free website of daily games and quizzes for K-pop and anime fans. It hosts OtakuQuiz and our Dle games, Kpopdle and Otakudle, and links to KpopQuiz on kpopquiz.org. Each day brings a new quiz on each site, a K-pop blind test and a debate. One passport keeps your levels and streaks on every site.');
    // SEO rule 3.1: an answer block of 40 to 60 words
    const words = answer.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
    // the Burrow is open: its games and how they work are described
    expect(seo).toContain('Kpopdle');
    expect(seo).toContain('How do the daily games work?');
    // closed (a revert of the PR), the answer of before, and neither its games nor how they work
    const closed = block(await renderHomeWithDailyGuess(false), '<section aria-labelledby="what-h"', 'section');
    expect(lines(block(closed, '<p class="hub-h2-seo-p"', 'p'))[0]).toBe('Bunnyverse is a free website of quizzes and daily games for K-pop and anime fans. It hosts OtakuQuiz and links to KpopQuiz on kpopquiz.org. Each day brings a new quiz on each site, a K-pop blind test and a debate. One passport keeps your levels and streaks on every site.');
    expect(closed).not.toContain('Kpopdle');
    expect(closed).not.toContain('How do the daily games work?');
  });

  it('builds the answer from today\'s data: the blind test and the debate are named only when today has them, always 40 to 60 words', async () => {
    await load();
    const { whatIsText } = await import('@/components/hub/home/home-seo');
    const { loadHomeToday } = await import('@/lib/site/hub/home-today');
    const full = (await loadHomeToday())!;
    const kpopQuiz = full.quizzes.find((q) => q.site === 'kpop')!;
    const animeQuiz = full.quizzes.find((q) => q.site === 'anime')!;
    const wordsOf = (t: string): number => t.split(/\s+/).length;
    for (const quizzes of [[kpopQuiz, animeQuiz], [animeQuiz], []]) {
      for (const blindtest of [full.blindtest, null]) {
        for (const debate of [full.debate, null]) {
          for (const burrow of [false, true]) {
            const today = quizzes.length === 0 && !blindtest && !debate ? null : { ...full, quizzes, blindtest, debate };
            const text = whatIsText(today, burrow);
            const label = `${quizzes.length} quizzes, bt ${!!blindtest}, debate ${!!debate}, burrow ${burrow}`;
            expect(wordsOf(text), label).toBeGreaterThanOrEqual(40);
            expect(wordsOf(text), label).toBeLessThanOrEqual(60);
            expect(text.includes('blind test'), label).toBe(!!blindtest);
            expect(text.includes('debate'), label).toBe(!!debate);
            expect(text.includes('a new quiz on each site'), label).toBe(quizzes.length === 2);
            expect(text.includes('a new quiz on OtakuQuiz'), label).toBe(quizzes.length === 1);
            expect(text.includes('Kpopdle'), label).toBe(burrow);
            expect(text, label).not.toMatch(DASHES);
          }
        }
      }
    }
    expect(whatIsText({ ...full, blindtest: null }, false)).toBe('Bunnyverse is a free website of quizzes and daily games for K-pop and anime fans. It hosts OtakuQuiz and links to KpopQuiz on kpopquiz.org. Each day brings a new quiz on each site and a debate. One passport keeps your levels and streaks on every site.');
    expect(whatIsText(null, false)).toBe('Bunnyverse is a free website of quizzes and daily games for K-pop and anime fans. It hosts OtakuQuiz and links to KpopQuiz on kpopquiz.org. Every quiz link opens the quiz on its own site. One passport keeps your levels and streaks on every site.');
  });

  it('on the page: without the blind test and the debate of the day, the answer names neither', async () => {
    const seo = block(await (async () => { blocks.values.getBlindtest = null; blocks.values.getDebate = null; return renderHome(); })(), '<section aria-labelledby="what-h"', 'section');
    const answer = lines(block(seo, '<p class="hub-h2-seo-p"', 'p'))[0]!;
    // launch day: the answer with the Burrow
    expect(answer).toBe('Bunnyverse is a free website of daily games and quizzes for K-pop and anime fans. It hosts OtakuQuiz and our Dle games, Kpopdle and Otakudle, and links to KpopQuiz on kpopquiz.org. Each day brings a new quiz on each site. One passport keeps your levels and streaks on every site.');
    expect(answer.split(/\s+/).length).toBeGreaterThanOrEqual(40);
    expect(seo).not.toContain('Blind test of the day');
  });

  it('says "N questions on each site" only when both sites have a quiz of the day with that count, else each site\'s own', async () => {
    await load();
    const { qotdText } = await import('@/components/hub/home/home-seo');
    const { loadHomeToday } = await import('@/lib/site/hub/home-today');
    const full = (await loadHomeToday())!;
    const [k, a] = [full.quizzes.find((q) => q.site === 'kpop')!, full.quizzes.find((q) => q.site === 'anime')!];
    expect(qotdText(full)).toBe('10 questions on each site');
    expect(qotdText({ ...full, quizzes: [a] })).toBe('10 questions on OtakuQuiz');
    expect(qotdText({ ...full, quizzes: [k] })).toBe('10 questions on KpopQuiz');
    expect(qotdText({ ...full, quizzes: [k, { ...a, questions: 12 }] })).toBe('10 questions on KpopQuiz and 12 questions on OtakuQuiz');
    expect(qotdText({ ...full, quizzes: [k, { ...a, questions: 0 }] })).toBe('10 questions on KpopQuiz');
    expect(qotdText({ ...full, quizzes: [{ ...k, questions: 0 }, { ...a, questions: 0 }] })).toBe('A new quiz on each site, every day');
    expect(qotdText({ ...full, quizzes: [{ ...a, questions: 0 }] })).toBe('A new quiz on OtakuQuiz, every day');
    expect(qotdText({ ...full, quizzes: [] })).toBeNull();
    expect(qotdText(null)).toBeNull();
    // on the page, with the anime quiz of the day only
    const s = await import('@/lib/site/hub/home-samples.test-support');
    blocks.values.getDailyQuizzes = { kpop: null, anime: s.sampleDaily().anime };
    const seo = block(await renderHome(), '<section aria-labelledby="what-h"', 'section');
    expect(seo).toContain('<td class="hub-h2-seo-game">Quiz of the day</td><td>10 questions on OtakuQuiz</td>');
    expect(seo).not.toContain('on each site');
  });

  it('has the table of the daily games, with the numbers of today\'s data', async () => {
    const seo = block(await renderHome(), '<section aria-labelledby="what-h"', 'section');
    expect(seo).toContain('<caption class="hub-h2-sr">Daily games on Bunnyverse</caption>');
    expect(seo).toContain('<td class="hub-h2-seo-game">Quiz of the day</td><td>10 questions on each site</td>');
    expect(seo).toContain('<td class="hub-h2-seo-game">Blind test of the day</td><td>10 songs, 10 seconds each</td>');
  });
});

describe('the footer', () => {
  it('has the wordmark, what the hub is, OtakuQuiz, privacy, the legal notice and the mailbox, and no link to kpopquiz.org (rule 16)', async () => {
    const html = await renderHome();
    const foot = block(html, '<footer class="hub-h2-foot"', 'footer');
    expect(foot).toContain('Daily games and quizzes for K-pop and anime fans. One passport shared by KpopQuiz and OtakuQuiz. Every fact sourced.');
    expect(foot).toContain('<span class="hub-h2-foot-word">Bunny<span class="hub-h2-brand-tail">verse</span></span>');
    expect(foot).toContain('href="https://bunnyverse.org/anime"');
    expect(foot).not.toContain('kpopquiz.org/');
    expect(foot).not.toMatch(/href="https:\/\/kpopquiz\.org/);
    expect(foot).toContain('href="/privacy"');
    expect(foot).toContain('href="/legal"');
    expect(foot).toContain('>hello@kpopquiz.org</span>');
    expect(foot).toContain('mascot-default.png');
    // launch day (RUNBOOK K8c): the Burrow's line, to the hub's own /daily
    // home v4: the line says "Daily games" (the copy key hp.foot.burrow)
    expect(foot).toContain('<a href="/daily" class="hub-h2-foot-a">Daily games</a>');
  });
});

describe('every link is the canonical page of its own site', () => {
  it('has no link to a quiz path on the hub, and every quiz link is on kpopquiz.org or bunnyverse.org/anime', async () => {
    const page = await renderHome();
    const { registry } = await load();
    // The sources of the facts (review fix, SEO rules 3.8 and 5.5) are the only links off the network: exactly the three of the samples,
    // https and nofollow noopener. Every other link is checked below, as before.
    const SOURCE = /<a href="([^"]+)" rel="nofollow noopener" class="hub-h2-srclink">/g;
    expect([...page.matchAll(SOURCE)].map((m) => m[1])).toEqual(['https://en.wikipedia.org/wiki/In_Bloom', 'https://en.wikipedia.org/wiki/Frieren', 'https://en.wikipedia.org/wiki/IVE']);
    const html = page.replace(SOURCE, '<a>');
    expect(html).not.toContain('nofollow');
    const hrefs = [...html.matchAll(/ href="([^"]+)"/g)].map((m) => m[1]!);
    // launch day (RUNBOOK K8c): the pages of the Burrow are the hub's own, each a route of its map, never a 404
    const burrow = ['/daily', '/kpopdle', '/otakudle'];
    const { isKnownRouteFor } = await import('@/lib/site/routing');
    for (const b of burrow) {
      expect(hrefs, b).toContain(b);
      expect(isKnownRouteFor('hub', b, { v1: true, v12: true }), b).toBe(true);
    }
    const own = new Set(['/', '/privacy', '/legal', '#hot', '#today', '#community', '#main', ...burrow]);
    expect(hrefs).toContain('https://kpopquiz.org/search');
    for (const h of hrefs) {
      if (h.startsWith('/_next') || own.has(h) || /^\/u\/[a-z0-9_]+$/.test(h)) continue;
      const onSite = h === registry.REGISTRY.anime.url || [registry.REGISTRY.kpop.url, registry.REGISTRY.anime.url].some((base) => h.startsWith(`${base}/`));
      expect(onSite, h).toBe(true);
    }
    // The hub and OtakuQuiz share bunnyverse.org: a link to the hub is one on bunnyverse.org outside the /anime folder.
    expect(hrefs.filter((h) => h.startsWith(registry.REGISTRY.hub.url) && h !== registry.REGISTRY.anime.url && !h.startsWith(`${registry.REGISTRY.anime.url}/`))).toEqual([]);
  });

  it('follows the dev origins outside production', async () => {
    vi.stubEnv('NEXT_PUBLIC_NET_ORIGINS', 'kpop=http://kpop.localhost:3000,anime=http://anime.localhost:3001');
    const html = await renderHome();
    expect(html).toContain('href="http://kpop.localhost:3000/q/zerobaseone-from-boys-planet-to-in-bloom?daily=quiz"');
    // Bunnyverse (lane 1): a dev origin stays bare and the anime base path /anime comes from the registry.
    expect(html).toContain('href="http://anime.localhost:3001/anime/q/journeys-beginning-frieren-basics?daily=quiz"');
    expect(html).toContain('href="http://kpop.localhost:3000/search"');
    vi.unstubAllEnvs();
  });
});

describe('the structured data', () => {
  function blocks(html: string): Record<string, unknown>[] {
    return [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => JSON.parse(m[1]!.replace(/&quot;/g, '"')) as Record<string, unknown>);
  }

  it('carries the WebSite of the hub, without a search action', async () => {
    const [site] = blocks(await renderHome());
    expect(site).toMatchObject({ '@type': 'WebSite', name: 'Bunnyverse', url: 'https://bunnyverse.org' });
    expect(site).not.toHaveProperty('potentialAction');
  });

  it('carries the ItemList of Hot now: six items, each the canonical URL of the quiz on its own site', async () => {
    const list = blocks(await renderHome())[1]!;
    expect(list).toMatchObject({ '@type': 'ItemList', name: 'Hot right now' });
    const items = list.itemListElement as { position: number; name: string; url: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(items[0]).toMatchObject({ name: 'Ultimate BTS era quiz - only real ARMYs survive', url: 'https://kpopquiz.org/q/ultimate-bts-era-quiz' });
    expect(items[1]!.url).toMatch(/^https:\/\/bunnyverse\.org\/anime\/q\//);
    expect(items.some((i) => i.url.startsWith('https://bunnyverse.org') && !i.url.startsWith('https://bunnyverse.org/anime/'))).toBe(false);
  });
});

describe('the account state', () => {
  it('falls back to the signed out view on any error', async () => {
    const signedOut = await renderHome();
    fake.user = { id: 'u-1' };
    const failures: Array<() => void> = [
      () => { fake.throwOn = 'client'; },
      () => { fake.throwOn = 'auth'; },
      () => { fake.throwOn = 'from'; },
      () => { fake.profile = { data: null, error: { message: 'rls' } }; },
      () => { fake.memberships = { data: null, error: { message: 'no such table' } }; },
    ];
    for (const [i, fail] of failures.entries()) {
      fake.profile = { data: { username: 'mingi', xp: 1, daily_streak: 0, last_daily_date: null }, error: null };
      fake.memberships = { data: MEMBERSHIPS, error: null };
      fake.throwOn = null;
      fail();
      expect(await renderHome(), `failure ${i}`).toBe(signedOut);
    }
  });
});

describe('a block with no data leaves the page, and the bands around it keep their place', () => {
  const none = async (...names: string[]): Promise<string> => {
    for (const n of names) blocks.values[n] = null;
    return renderHome();
  };

  it('every module null: the page still renders the title, the account card, the games, the SEO block and the footer', async () => {
    const html = await none('getDoors', 'getDailyQuizzes', 'getBlindtest', 'getDebate', 'getSixtySeconds', 'getDidYouKnow', 'getHot', 'getCrossover', 'getTopFans', 'getSurprise');
    expect(count(html, /<h1\b/g)).toBe(1);
    expect(html).toContain('<aside aria-labelledby="acc-h"');
    expect(html).toContain('<footer class="hub-h2-foot"');
    expect(html).toContain('aria-labelledby="what-h"');
    for (const gone of ['<section id="hot"', 'hub-h2-site ', 'hub-h2-ghost', 'aria-labelledby="quick-h"', 'aria-labelledby="cross-h"', 'id="top-h"', '<section id="community"', 'hub-h2-ribbon', 'Also today', 'Play today&#x27;s games</a>']) {
      expect(html, gone).not.toContain(gone);
    }
    // launch day (RUNBOOK K8c): the two games of the Burrow read no module, so Today keeps them (no ribbon: no rotation instant)
    const today = block(html, '<section id="today"', 'section');
    expect(count(today, /<article class="hub-h2-game /g)).toBe(2);
    // and the table of the daily games keeps the two games of the Burrow; nothing of the modules is left in it
    const table = block(html, '<table class="hub-h2-seo-table"', 'table');
    expect(table).toContain('<td class="hub-h2-seo-game">Kpopdle</td>');
    expect(table).toContain('<td class="hub-h2-seo-game">Otakudle</td>');
    expect(table).not.toContain('Quiz of the day');
    expect(table).not.toContain('Blind test of the day');
    // closed (a revert), no table at all, and no Today band: nothing to show in it
    const closed = await renderHomeWithDailyGuess(false);
    expect(closed).not.toContain('<table');
    expect(closed).not.toContain('<section id="today"');
    // the tabs to blocks that are not there go with them
    const nav = block(html, '<header class="hub-h2-head"', 'header');
    for (const a of ['#hot', '#today', '#community']) expect(nav).not.toContain(`href="${a}"`);
    expect(count(html, /application\/ld\+json/g)).toBe(1);
  });

  it('an error in a module is a missing block, never a 500', async () => {
    blocks.values.getHot = new Error('db down');
    blocks.values.getDoors = new Error('db down');
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = await renderHome();
    quiet.mockRestore();
    expect(html).not.toContain('<section id="hot"');
    expect(html).not.toContain('hub-h2-site ');
    expect(html).toContain('<section id="today"');
  });

  it('Today: a tile goes when its data goes; the debate lives in Community, not in Today', async () => {
    const noBt = await none('getBlindtest');
    expect(block(noBt, '<section id="today"', 'section')).not.toContain('Blind test of the day');
    expect(count(block(noBt, '<section id="today"', 'section'), /quiz of the day</g)).toBe(2);
    expect(block(noBt, '<section id="community"', 'section')).toContain('Debate of the day');
    blocks.values = {};
    const noDebate = await none('getDebate');
    expect(block(noDebate, '<section id="today"', 'section')).toContain('Blind test of the day');
    expect(noDebate).not.toContain('Debate of the day');
    // the Community band stays for the fans, and its line follows what it has
    expect(block(noDebate, '<section id="community"', 'section')).toContain('See this week&#x27;s top fans.');
    blocks.values = { getDailyQuizzes: { kpop: null, anime: (await import('@/lib/site/hub/home-samples.test-support')).sampleDaily().anime } };
    const oneQuiz = block(await renderHome(), '<section id="today"', 'section');
    expect(count(oneQuiz, /quiz of the day</g)).toBe(1);
    expect(oneQuiz).toContain('Frieren');
    blocks.values = {};
    const html = await none('getDailyQuizzes', 'getBlindtest', 'getDebate');
    const today = block(html, '<section id="today"', 'section');
    expect(today).not.toContain('Also today');
    expect(today).not.toContain('hub-h2-ribbon');
    expect(count(today, /<article class="hub-h2-game /g)).toBe(2);
  });

  it('Quick question: the question and the facts are independent, and with none the band keeps Popular, alone', async () => {
    const noQuestion = block(await none('getSixtySeconds'), '<aside aria-labelledby="quick-h"', 'aside');
    expect(noQuestion).toContain('<h3 id="quick-h" class="hub-h2-h3">Did you know?</h3>');
    expect(noQuestion).not.toContain('Quick question');
    blocks.values = {};
    const noFacts = block(await none('getDidYouKnow'), '<aside aria-labelledby="quick-h"', 'aside');
    expect(noFacts).toContain('Quick question');
    expect(noFacts).not.toContain('Did you know');
    blocks.values = {};
    const html = await none('getSixtySeconds', 'getDidYouKnow');
    expect(html).not.toContain('aria-labelledby="quick-h"');
    expect(html).toContain('<div class="hub-h2-split hub-h2-split-one"><div class="hub-h2-hot">');
    // Popular missing: the Quick question takes the band alone and its heading is the band's H2
    blocks.values = {};
    const noHot = await none('getHot');
    expect(noHot).toContain('<section aria-labelledby="quick-h" class="hub-h2-band hub-h2-wrap">');
    expect(noHot).toContain('<h2 id="quick-h" class="hub-h2-h3">Quick question</h2>');
    expect(noHot).not.toContain('<section id="hot"');
  });

  it('Crossover: without the sourced fact the line goes, the tiles stay; without picks the band goes', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    blocks.values.getCrossover = { ...s.sampleCrossover(), fact: null };
    const cross = block(await renderHome(), '<section aria-labelledby="cross-h"', 'section');
    expect(cross).not.toContain('IVE sang');
    expect(cross).not.toContain('hub-h2-srclink');
    expect(count(cross, /class="hub-h2-card hub-h2-xt /g)).toBe(3);
    blocks.values = {};
    expect(await none('getCrossover')).not.toContain('aria-labelledby="cross-h"');
  });

  it('Community: no public fan, no board (the debate stays); no debate and no fan, no band and no tab; a site with no public fan has no tab', async () => {
    const html = await none('getTopFans');
    expect(html).not.toContain('id="top-h"');
    expect(block(html, '<section id="community"', 'section')).toContain('Vote on the debate of the day.');
    blocks.values = {};
    const bare = await none('getTopFans', 'getDebate');
    expect(bare).not.toContain('<section id="community"');
    expect(block(bare, '<header class="hub-h2-head"', 'header')).not.toContain('Community');
    blocks.values = {};
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const top = s.sampleTopFans();
    blocks.values.getTopFans = { ...top, bySite: { kpop: top.bySite!.kpop, anime: [] } };
    const fans = block(await renderHome(), '<article aria-labelledby="top-h"', 'article');
    expect(fans).toContain('Top fans this week');
    expect(fans).not.toContain('role="group"');
  });

  it('a fan who keeps the level private shows no level', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const top = s.sampleTopFans();
    blocks.values.getTopFans = { ...top, bySite: { ...top.bySite!, kpop: top.bySite!.kpop.map((f, i) => (i === 0 ? { ...f, level: null } : f)) } };
    const fans = block(await renderHome(), '<article aria-labelledby="top-h"', 'article');
    expect(count(fans, /class="hub-h2-meta hub-h2-num">Lv /g)).toBe(4);
  });

  it('a site with no featured quiz has no quiz line', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const doors = s.sampleDoors();
    blocks.values.getDoors = { ...doors, anime: { ...doors.anime, featured: null } };
    const sites = block(await renderHome(), '<section aria-labelledby="sides-h"', 'section');
    expect(count(sites, /class="hub-h2-spot"/g)).toBe(1);
    expect(sites).not.toContain('>New</span>');
  });
});

describe('the sites tell the real counts', () => {
  it('prints the counts of the module through the shared rounding', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const doors = s.sampleDoors();
    blocks.values.getDoors = { kpop: { ...doors.kpop, quizCount: 474 }, anime: { ...doors.anime, quizCount: 47, featuredLabel: 'Top now' } };
    const html = await renderHome();
    expect(html).toContain('>470+ quizzes</span>');
    expect(html).toContain('>47 quizzes</span>');
    // both sites are "Popular now" once OtakuQuiz has its days of data
    expect(count(block(html, '<section aria-labelledby="sides-h"', 'section'), />Popular now<\/span>/g)).toBe(2);
  });
});

describe('Surprise me', () => {
  it('draws from the pool of the data module, with the played quizzes of the fan', async () => {
    fake.user = { id: 'u-1' };
    const s = await import('@/lib/site/hub/home-samples.test-support');
    blocks.values.getSurprise = { ...s.sampleSurprise(), playedIds: ['kpop:kpop-company-quiz'] };
    const html = await renderHome();
    expect(blocks.calls).toContainEqual(['getSurprise', { userId: 'u-1' }]);
    expect(html).toContain('Surprise me');
  });

  it('is left out with no pool, the line stays', async () => {
    blocks.values.getSurprise = null;
    const html = await renderHome();
    expect(html).not.toContain('Surprise me');
    expect(html).toContain('Start with today&#x27;s puzzles, or pick any quiz.');
  });
});

describe('the words', () => {
  it('has no dash and no emoji in what the page prints', async () => {
    fake.user = { id: 'u-1' };
    for (const html of [await renderHome(), await (async () => { fake.user = null; return renderHome(); })()]) {
      const text = lines(html).join('\n');
      expect(text).not.toMatch(DASHES);
      expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});

describe('the metadata', () => {
  it('is closed (noindex, nofollow) while NET_INDEXING is off, the default', async () => {
    const { home } = await load('hub', '');
    expect(home.metadata.robots).toEqual({ index: false, follow: false });
  });

  it('is indexable once NET_INDEXING is on, canonical on the network origin, with the title and the primary phrase of the page', async () => {
    const { home, registry } = await load();
    const m = home.metadata;
    expect(m.robots).toEqual({ index: true, follow: true });
    expect(m.alternates?.canonical).toBe(`${registry.NETWORK.url}/`);
    const title = (m.title as { absolute: string }).absolute;
    // the title of RAPPORT-JEUX-DU-JOUR-v2 section 11.2, with the suffix of the hub
    expect(title).toBe('K-pop and Anime Daily Games and Quizzes | Bunnyverse');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(m.description).length).toBeGreaterThanOrEqual(120);
    expect(String(m.description).length).toBeLessThanOrEqual(160);
    // SEO rule 2.1: the title, the H1 and the description share the primary phrase
    expect(String(m.description)).toMatch(/^Quizzes and daily games for K-pop and anime fans/);
    expect(m.openGraph).toMatchObject({ url: `${registry.NETWORK.url}/`, title, siteName: 'Bunnyverse' });
    expect(JSON.stringify(m)).not.toMatch(DASHES);
  });
});
