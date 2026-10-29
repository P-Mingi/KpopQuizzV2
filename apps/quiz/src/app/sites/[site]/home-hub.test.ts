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
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('the top bar', () => {
  it('has the rabbit and the wordmark, the tabs Home, Quizzes, Blind test and Community, search and sign in', async () => {
    const html = await renderHome();
    const nav = block(html, '<header class="hub-h2-head"', 'header');
    expect(nav).toContain(`<nav aria-label="${COPY['hp.nav.main']}"`);
    expect(nav).toContain('src="/_next/image?url=%2Fmascot%2Fmascot-default.png');
    // the board's wordmark: "Bunny" in ink, "verse" in the accent, split from the registry name
    expect(nav).toContain('<span class="hub-h2-brand-name">Bunny<span class="hub-h2-brand-tail">verse</span></span>');
    expect(nav).toContain('<a href="/" class="hub-h2-tab hub-h2-tab-on" aria-current="page">Home</a>');
    for (const [href, label] of [['#hot', 'Quizzes'], ['#today', 'Blind test'], ['#fans', 'Community']] as const) {
      expect(nav).toContain(`<a href="${href}" class="hub-h2-tab">${label}</a>`);
    }
    // the Burrow is closed (no dailyGuess, no page) and the hub has no French page yet: no tab, no switch to nowhere
    expect(nav).not.toContain('The Burrow');
    expect(nav).not.toContain('lang="fr"');
    // the search button is a link to the search page of KpopQuiz (the filter of Hot now is All)
    expect(nav).toMatch(/<a href="https:\/\/kpopquiz\.org\/search" aria-label="Search both sites" class="hub-h2-iconbtn hub-h2-btn">/);
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

  it('signed in: the level chip links to the passport column, no sign in button', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    const { getLevelInfo } = await import('@/lib/constants');
    const nav = block(html, '<header class="hub-h2-head"', 'header');
    expect(nav).toMatch(/<a href="#fans" class="hub-h2-me">.*M<\/span>Lv \d+<\/a>/);
    expect(nav).toContain(`Lv ${getLevelInfo(90080, 'hub').level}`);
    expect(nav).not.toContain('>Sign in<');
  });
});

describe('the grid', () => {
  it('has three rows of two columns, in reading order: the title and the sites, then Today; Hot, then 60 seconds; Crossover, then Top fans', async () => {
    const html = await renderHome();
    const rows = [...html.matchAll(/<div class="(hub-h2-cols[^"]*)">/g)].map((m) => m[1]);
    expect(rows).toEqual(['hub-h2-cols hub-h2-row1', 'hub-h2-cols hub-h2-row', 'hub-h2-cols hub-h2-row']);
    const order = ['aria-labelledby="hero-h"', '<aside id="today"', '<section id="hot"', 'aria-labelledby="quick-h"', 'aria-labelledby="cross-h"', '<aside id="fans"', 'aria-labelledby="what-h"']
      .map((m) => html.indexOf(m));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('row 1: the title and the two sites', () => {
  it('has one h1, the eyebrow, the line and Surprise me beside it', async () => {
    const html = await renderHome();
    expect(count(html, /<h1\b/g)).toBe(1);
    expect(html).toContain('<h1 id="hero-h" class="hub-h2-h1">Quizzes and daily games for K-pop and anime fans</h1>');
    expect(html).toContain('>Two fandoms, one passport, every day</p>');
    expect(html).toMatch(/<p class="hub-h2-lede">Pick your side, or play both\.<\/p><button type="button" class="hub-h2-ghost hub-h2-btn">.*Surprise me<\/button>/);
    expect(html).not.toContain('role="status"');
  });

  it('has the two sites side by side, in the network order, each card the link to its site', async () => {
    const html = await renderHome();
    const { registry } = await load();
    const cards = [...html.matchAll(/<a href="([^"]+)" class="hub-h2-site hub-h2-rise hub-h2-s-([ka])">/g)].map((m) => [m[1], m[2]]);
    expect(cards).toEqual([[`${registry.REGISTRY.kpop.url}/`, 'k'], [registry.REGISTRY.anime.url, 'a']]);
    expect(html).toContain('<span class="hub-h2-site-name">Kpop<span class="hub-h2-site-tail">Quiz</span></span>');
    expect(html).toContain('<span class="hub-h2-site-name">Otaku<span class="hub-h2-site-tail">Quiz</span></span>');
    // the real counts, rounded down by the shared helper of the public counts (482 and 138 in the module)
    expect(html).toContain('<span class="hub-h2-site-count hub-h2-num">480+ quizzes</span>');
    expect(html).toContain('<span class="hub-h2-site-count hub-h2-num">130+ quizzes</span>');
    expect(html).toContain('Groups, eras, members, songs');
    expect(html).toContain('Series, arcs, characters, openings');
    expect(html).toContain('>Top now</span>');
    expect(html).toContain('>Just added</span>');
    expect(html).toContain('Enter KpopQuiz');
    expect(html).toContain('Enter OtakuQuiz');
  });

  it('keeps each image slot in the colours of its site while site_assets has no image: the name written down the side, no image, no placeholder text', async () => {
    const html = await renderHome();
    expect(html).toContain('<span aria-hidden="true" lang="ko" class="hub-h2-vt">케이팝 퀴즈</span>');
    expect(html).toContain('<span aria-hidden="true" lang="ja" class="hub-h2-vt">オタククイズ</span>');
    for (const ph of html.match(/<span class="hub-h2-ph hub-h2-ph-site">[\s\S]*?<\/span><\/span>/g) ?? []) expect(ph).not.toContain('<img');
    expect(html.toLowerCase()).not.toContain('admin');
  });
});

describe('Today', () => {
  it('has the countdown, the quizzes of the day and the debate as rows, and the blind test playable in its row', async () => {
    const html = await renderHome();
    const today = block(html, '<aside id="today"', 'aside');
    expect(today).toContain('aria-labelledby="today-h"');
    expect(today).toContain('<span class="hub-h2-countdown">New picks in a few hours</span>');
    expect(today).toContain('>Quizzes</p>');
    expect(today).toContain('>K-pop quiz of the day</span>');
    expect(today).toContain('>Anime quiz of the day</span>');
    expect(today).toContain('ZEROBASEONE: From Boys Planet to In Bloom');
    expect(today).toContain('Journey&#x27;s Beginning: Frieren Basics');
    // the real slug of each bank, entering the daily run (?daily=quiz), never the /daily redirect
    expect(today).toContain('href="https://kpopquiz.org/q/zerobaseone-from-boys-planet-to-in-bloom?daily=quiz"');
    expect(today).toContain('href="https://bunnyverse.org/anime/q/journeys-beginning-frieren-basics?daily=quiz"');
    expect(today).toContain('<a href="https://kpopquiz.org/community" class="hub-h2-line hub-h2-s-n">');
    expect(today).toContain('Debate of the day');
    expect(today).toContain('Best title track of 2025 so far?');
    expect(count(today, />Play<\/span>/g)).toBe(2);
    expect(count(today, />Vote<\/span>/g)).toBe(1);
    // the blind test: the real size of the set (10 songs), the 10 second preview, the way to the whole set
    expect(today).toContain('Blind test of the day');
    expect(today).toContain('aria-label="Play a 10 second preview"');
    expect(today).toContain('KpopQuiz · 10 songs, 10 s each');
    expect(today).toContain('<a href="https://kpopquiz.org/blindtest?daily=true" class="hub-h2-btall">All 10 songs</a>');
    // a row with no image from the admin shows its icon on the colour of its site
    expect(count(today, /<span class="hub-h2-th hub-h2-th-row"><svg/g)).toBe(3);
  });

  it('hides the Burrow (Kpopdle and Otakudle) while the dailyGuess flag is off, and while the hub has no page for it even with the flag on', async () => {
    for (const flag of ['', '1']) {
      vi.stubEnv('DAILY_GUESS', flag);
      const html = await renderHome();
      for (const word of ['Kpopdle', 'Otakudle', 'The Burrow', 'Open the Burrow', 'href="/daily"', 'href="/kpopdle"']) expect(html, `${flag} ${word}`).not.toContain(word);
    }
  });

  it('signed out: one line offers sign in to keep the streaks, no progress', async () => {
    const today = block(await renderHome(), '<aside id="today"', 'aside');
    expect(today).toMatch(/Same puzzles for everyone\. <button[^>]*aria-haspopup="dialog"[^>]*>Sign in<\/button> to keep your streaks\./);
    expect(today).not.toContain('hub-h2-progress');
  });

  it('signed in: the progress of the day from the fan\'s plays of today, and the streak of each site joined', async () => {
    fake.user = { id: 'u-1' };
    let today = block(await renderHome(), '<aside id="today"', 'aside');
    expect(today).toContain('0 of 2 done</span> · streaks K-pop 6 days, anime 2 days');
    expect(today).not.toContain('Same puzzles for everyone');
    // the page asks for the fan's plays of today on the two quizzes of the day, and nothing else
    expect(fake.playsAsked.at(-1)).toMatchObject({
      select: 'quiz_id', 'eq:player_id': 'u-1', 'in:quiz_id': ['kpop:zerobaseone-from-boys-planet-to-in-bloom', 'anime:journeys-beginning-frieren-basics'], 'gte:created_at': `${TODAY}T00:00:00Z`,
    });
    fake.playsToday = [{ quiz_id: 'kpop:zerobaseone-from-boys-planet-to-in-bloom' }];
    today = block(await renderHome(), '<aside id="today"', 'aside');
    expect(today).toContain('1 of 2 done');
    expect(today).toMatch(/<span class="hub-h2-tstate hub-h2-tstate-done"><svg[^>]*>.*<\/svg>Done<\/span>/);
    expect(count(today, />Play<\/span>/g)).toBe(1);
  });

  it('signed out: the plays are never read', async () => {
    await renderHome();
    expect(fake.playsAsked).toEqual([]);
  });
});

describe('60 seconds and Did you know', () => {
  it('has the question with its four answers as rows A to D, and the two sourced facts', async () => {
    const html = await renderHome();
    const quick = block(html, '<aside aria-labelledby="quick-h"', 'aside');
    expect(quick).toContain('<h2 id="quick-h" class="hub-h2-h2">60 seconds</h2>');
    expect(quick).toContain('ITZY&#x27;s 2022 single Cheshire borrows the concept of a famous cat from which story?');
    expect(count(quick, /<button type="button" class="hub-h2-line hub-h2-opt">/g)).toBe(4);
    for (const a of ['Puss in Boots', 'The Jungle Book', 'Alice in Wonderland', 'The Wizard of Oz']) expect(quick).toContain(a);
    expect(quick).toContain('From K-pop Songs About Magic');
    expect(quick).not.toContain('role="status"');
    expect(quick).toContain('>Did you know</p>');
    expect(count(quick, /<span class="hub-h2-fsrc">Source: Wikipedia<\/span>/g)).toBe(2);
    expect(quick).toContain('Sōsō no Furīren');
  });
});

describe('Hot right now', () => {
  it('lists six quizzes, three of each site alternating, each linked to its own site', async () => {
    const html = await renderHome();
    const hot = block(html, '<section id="hot"', 'section');
    const ol = block(hot, '<ol class="hub-h2-lines hub-h2-hot-list"', 'ol');
    const hrefs = [...ol.matchAll(/<a href="([^"]+)" class="hub-h2-line hub-h2-hrow/g)].map((m) => m[1]!);
    expect(hrefs).toHaveLength(6);
    // OtakuQuiz lives in the folder /anime of bunnyverse.org (2026-10-28): the site of a link is its registry url, folder included.
    const siteOf = (h: string): string => (h.startsWith('https://kpopquiz.org/') ? 'kpop' : h.startsWith('https://bunnyverse.org/anime/') ? 'anime' : h);
    expect(hrefs.map(siteOf)).toEqual(['kpop', 'anime', 'kpop', 'anime', 'kpop', 'anime']);
    expect(hot).toContain('Ultimate BTS era quiz - only real ARMYs survive');
    expect(hot).toContain('Name and Face: Death Note True or False');
    expect(hot).toContain('KpopQuiz · BTS · Medium');
    expect(hot).toContain('OtakuQuiz · Death Note · Medium · True or false');
    expect(count(hot, /class="hub-h2-newpill"/g)).toBe(3);
    expect(hot).toContain('<span class="hub-h2-hplays hub-h2-num">2.7k plays</span>');
    expect(hot).toMatch(/>All K-pop quizzes on KpopQuiz<svg/);
    expect(hot).toMatch(/>All anime quizzes on OtakuQuiz<svg/);
  });

  it('shows the quiz\'s own cover when it has one, else the initials of its group on the colour of its site', async () => {
    const hot = block(await renderHome(), '<section id="hot"', 'section');
    const { SAMPLE_COVER } = await import('@/lib/site/hub/home-samples.test-support');
    expect(hot).toContain(`<img src="${SAMPLE_COVER}" alt="" width="52" height="52" loading="lazy" decoding="async" class="hub-h2-th-img"/>`);
    expect(count(hot, /<img /g)).toBe(1);
    expect(hot).toContain('<span aria-hidden="true" class="hub-h2-th hub-h2-hthumb">DN</span>');
  });

  it('has the filter group with four chips, All pressed and Start easy last; no Start easy chip without an easy list', async () => {
    let hot = block(await renderHome(), '<section id="hot"', 'section');
    expect(hot).toContain('<div role="group" aria-label="Filter" class="hub-h2-seg">');
    const chips = (h: string): string[] => [...h.matchAll(/<button type="button" aria-pressed="(true|false)" class="hub-h2-segbtn"><span aria-hidden="true" class="[^"]+"><\/span>([^<]+)<\/button>/g)].map((m) => `${m[1]} ${m[2]}`);
    expect(chips(hot)).toEqual(['true All', 'false KpopQuiz', 'false OtakuQuiz', 'false Start easy']);
    const s = await import('@/lib/site/hub/home-samples.test-support');
    blocks.values.getHot = { ...s.sampleHot(), easy: [] };
    hot = block(await renderHome(), '<section id="hot"', 'section');
    expect(chips(hot)).toEqual(['true All', 'false KpopQuiz', 'false OtakuQuiz']);
  });
});

describe('When K-pop meets anime', () => {
  it('is a light row of three tiles, image first, with the fact', async () => {
    const html = await renderHome();
    const cross = block(html, '<section aria-labelledby="cross-h"', 'section');
    expect(cross).toContain('When K-pop meets anime');
    expect(count(cross, /class="hub-h2-xt /g)).toBe(3);
    expect([...cross.matchAll(/class="hub-h2-ph hub-h2-xph (hub-h2-xph-\d)"/g)].map((m) => m[1])).toEqual(['hub-h2-xph-1', 'hub-h2-xph-2', 'hub-h2-xph-3']);
    expect(cross).not.toContain('<img');
    expect(cross).toContain('IVE sang Will, the opening theme of Pok');
    expect(cross).toContain('href="https://kpopquiz.org/kpop-demon-hunters-quiz"');
    expect(cross).toContain('Six questions · The animated film and its songs');
    expect(cross).toContain('href="https://bunnyverse.org/anime/q/one-opening-many-endings-chainsaw-man-theme-songs"');
  });
});

describe('Top fans and the passport', () => {
  it('top fans: the K-pop board first, five rows linked to each fan\'s page on the hub, with the K-pop and Anime tabs', async () => {
    const html = await renderHome();
    const fans = block(html, '<aside id="fans"', 'aside');
    expect(fans).toContain('<h2 id="top-h" class="hub-h2-h2">Top fans this week</h2>');
    expect(fans).toContain('<div role="group" aria-label="Leaderboard site" class="hub-h2-seg">');
    expect(count(fans, /class="hub-h2-line hub-h2-fan/g)).toBe(5);
    expect([...fans.matchAll(/<a href="(\/u\/[^"]+)"/g)].map((m) => m[1])).toEqual(['/u/sunbae_mira', '/u/tteok_rider', '/u/mingi', '/u/hallyu_bean', '/u/dalgona_pop']);
    expect(fans).toContain('>Lv 42<');
    expect(fans).not.toContain('kenjiro_k');
    expect(fans).not.toContain('hub-h2-fan-me');
  });

  it('signed in: the fan is marked on the board', async () => {
    fake.user = { id: 'u-1' };
    const fans = block(await renderHome(), '<aside id="fans"', 'aside');
    expect(fans).toMatch(/hub-h2-fan hub-h2-fan-me"><span class="hub-h2-fan-rank hub-h2-num">3<\/span>.*@mingi/);
  });

  it('signed out: the promise and sign in, and what other sites see and never see, the same words as the privacy page, one click away', async () => {
    const { home, privacy } = await load();
    const homeHtml = renderToStaticMarkup(await home.default());
    const passport = block(homeHtml, '<div id="passport"', 'div');
    expect(passport).toContain('<h3 class="hub-h2-pass-h">One passport for both sites</h3>');
    expect(passport).toContain('Your level and streaks follow you. Your email never does.');
    expect(passport).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Sign in<\/button>/);
    expect(passport).toContain('<details class="hub-h2-pass-shares"><summary class="hub-h2-pass-sum">What other sites see, and never see</summary>');
    const shares = lines(block(passport, '<div class="hub-h2-shares-cols"', 'div'));
    const policy = renderToStaticMarkup(privacy.default());
    const policyShares = lines(block(policy, '<div class="hub-h1-shares"', 'div'));
    // the same keys, in the same order: the titles and the lines of the block
    expect(policyShares.slice(1)).toEqual(shares);
    expect(shares).toEqual([
      COPY['shares.seesTitle'], COPY['shares.seesUsername'], COPY['shares.seesAvatar'], COPY['shares.seesLevel'], COPY['shares.seesSites'],
      COPY['shares.hidesTitle'], COPY['shares.hidesEmail'], COPY['shares.hidesSignIn'], COPY['shares.hidesHistory'],
    ]);
  });

  it('signed in: the passport of the fan, with the level of each site joined and the way to the next one', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    const passport = block(html, '<div id="passport"', 'div');
    const { getLevelInfo } = await import('@/lib/constants');
    const k = getLevelInfo(90000, 'kpop');
    const a = getLevelInfo(80, 'anime');
    expect(passport).toContain('Your passport, @mingi');
    expect(passport).toContain(`KpopQuiz · Lv ${k.level}`);
    expect(passport).toContain(`${k.progress}% to ${k.level + 1}`);
    expect(passport).toContain(`OtakuQuiz · Lv ${a.level}`);
    expect(passport).not.toContain('>Sign in<');
  });

  it('signed in with one site joined: that site only', async () => {
    fake.user = { id: 'u-1' };
    fake.memberships = { data: [MEMBERSHIPS[0]], error: null };
    const passport = block(await renderHome(), '<div id="passport"', 'div');
    expect(passport).toContain('KpopQuiz · Lv');
    expect(passport).not.toContain('OtakuQuiz');
  });
});

describe('the SEO block', () => {
  it('answers what Bunnyverse is in the server HTML, with only what is true today', async () => {
    const html = await renderHome();
    const seo = block(html, '<section aria-labelledby="what-h"', 'section');
    expect(seo).toContain('<h2 id="what-h" class="hub-h2-h2">What is Bunnyverse?</h2>');
    const answer = lines(block(seo, '<p class="hub-h2-seo-p"', 'p'))[0]!;
    expect(answer).toBe('Bunnyverse is a free website of quizzes and daily games for K-pop and anime fans. It hosts OtakuQuiz and links to KpopQuiz on kpopquiz.org. Each day brings a new quiz on each site, a K-pop blind test and a debate. One passport keeps your levels and streaks on every site.');
    // SEO rule 3.1: an answer block of 40 to 60 words
    const words = answer.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
    // the Burrow is closed: its games and how they work are not described
    expect(seo).not.toContain('Kpopdle');
    expect(seo).not.toContain('How do the daily games work?');
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
    expect(foot).not.toContain('The Burrow');
  });
});

describe('every link is the canonical page of its own site', () => {
  it('has no link to a quiz path on the hub, and every quiz link is on kpopquiz.org or bunnyverse.org/anime', async () => {
    const html = await renderHome();
    const { registry } = await load();
    const hrefs = [...html.matchAll(/ href="([^"]+)"/g)].map((m) => m[1]!);
    const own = new Set(['/', '/privacy', '/legal', '#hot', '#today', '#fans', '#main']);
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

describe('a block with no data leaves the page, and its grid adapts', () => {
  const none = async (...names: string[]): Promise<string> => {
    for (const n of names) blocks.values[n] = null;
    return renderHome();
  };

  it('every module null: the page still renders the title, the passport, the SEO block and the footer, in one column', async () => {
    const html = await none('getDoors', 'getDailyQuizzes', 'getBlindtest', 'getDebate', 'getSixtySeconds', 'getDidYouKnow', 'getHot', 'getCrossover', 'getTopFans', 'getSurprise');
    expect(count(html, /<h1\b/g)).toBe(1);
    expect(html).toContain('<div id="passport"');
    expect(html).toContain('<footer class="hub-h2-foot"');
    expect(html).toContain('aria-labelledby="what-h"');
    for (const gone of ['<aside id="today"', '<section id="hot"', 'hub-h2-site ', 'hub-h2-ghost', 'aria-labelledby="quick-h"', 'aria-labelledby="cross-h"', 'id="top-h"', '<table']) {
      expect(html, gone).not.toContain(gone);
    }
    // the rows that are left take the whole width
    expect([...html.matchAll(/<div class="(hub-h2-cols[^"]*)">/g)].map((m) => m[1])).toEqual(['hub-h2-cols hub-h2-row1 hub-h2-cols-one', 'hub-h2-cols hub-h2-row hub-h2-cols-one']);
    // the tabs to blocks that are not there go with them; Community stays (the passport is always there)
    const nav = block(html, '<header class="hub-h2-head"', 'header');
    for (const a of ['#hot', '#today']) expect(nav).not.toContain(`href="${a}"`);
    expect(nav).toContain('href="#fans"');
    // with no board the passport is the heading of its column
    expect(html).toContain('<h2 class="hub-h2-pass-h">One passport for both sites</h2>');
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
    expect(html).toContain('<aside id="today"');
  });

  it('Today: a row goes when its data goes, and with all three the column goes', async () => {
    const noBt = block(await none('getBlindtest'), '<aside id="today"', 'aside');
    expect(noBt).not.toContain('Blind test of the day');
    expect(noBt).toContain('Debate of the day');
    expect(count(noBt, /quiz of the day</g)).toBe(2);
    blocks.values = {};
    expect(block(await none('getBlindtest'), '<header class="hub-h2-head"', 'header')).not.toContain('href="#today"');
    blocks.values = {};
    const noDebate = block(await none('getDebate'), '<aside id="today"', 'aside');
    expect(noDebate).not.toContain('Debate of the day');
    expect(noDebate).toContain('Blind test of the day');
    blocks.values = { getDailyQuizzes: { kpop: null, anime: (await import('@/lib/site/hub/home-samples.test-support')).sampleDaily().anime } };
    const oneQuiz = block(await renderHome(), '<aside id="today"', 'aside');
    expect(count(oneQuiz, /quiz of the day</g)).toBe(1);
    expect(oneQuiz).toContain('Frieren');
    blocks.values = {};
    const html = await none('getDailyQuizzes', 'getBlindtest', 'getDebate');
    expect(html).not.toContain('<aside id="today"');
    expect(html).toContain('hub-h2-cols hub-h2-row1 hub-h2-cols-one');
  });

  it('60 seconds: the question and the facts are independent, and with none the column goes', async () => {
    const noQuestion = block(await none('getSixtySeconds'), '<aside aria-labelledby="quick-h"', 'aside');
    expect(noQuestion).toContain('<h2 id="quick-h" class="hub-h2-h2">Did you know</h2>');
    expect(noQuestion).not.toContain('60 seconds');
    blocks.values = {};
    const noFacts = block(await none('getDidYouKnow'), '<aside aria-labelledby="quick-h"', 'aside');
    expect(noFacts).toContain('60 seconds');
    expect(noFacts).not.toContain('Did you know');
    blocks.values = {};
    const html = await none('getSixtySeconds', 'getDidYouKnow');
    expect(html).not.toContain('aria-labelledby="quick-h"');
    expect(html).toContain('<div class="hub-h2-cols hub-h2-row hub-h2-cols-one"><section id="hot"');
  });

  it('Crossover: without the sourced fact the line goes, the tiles stay; without picks Top fans takes the row', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    blocks.values.getCrossover = { ...s.sampleCrossover(), fact: null };
    const cross = block(await renderHome(), '<section aria-labelledby="cross-h"', 'section');
    expect(cross).not.toContain('IVE sang');
    expect(count(cross, /class="hub-h2-xt /g)).toBe(3);
    blocks.values = {};
    expect(await none('getCrossover')).toContain('<div class="hub-h2-cols hub-h2-row hub-h2-cols-one"><aside id="fans"');
  });

  it('Top fans: no public fan, no board; the passport stays; a site with no public fan has no tab', async () => {
    const html = await none('getTopFans');
    expect(html).not.toContain('id="top-h"');
    expect(html).toContain('<div id="passport"');
    blocks.values = {};
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const top = s.sampleTopFans();
    blocks.values.getTopFans = { ...top, bySite: { kpop: top.bySite!.kpop, anime: [] } };
    const fans = block(await renderHome(), '<aside id="fans"', 'aside');
    expect(fans).toContain('Top fans this week');
    expect(fans).not.toContain('role="group"');
  });

  it('a fan who keeps the level private shows no level', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const top = s.sampleTopFans();
    blocks.values.getTopFans = { ...top, bySite: { ...top.bySite!, kpop: top.bySite!.kpop.map((f, i) => (i === 0 ? { ...f, level: null } : f)) } };
    const fans = block(await renderHome(), '<aside id="fans"', 'aside');
    expect(count(fans, /class="hub-h2-fan-lv hub-h2-num"/g)).toBe(4);
  });

  it('a site with no featured quiz has no Top now line', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const doors = s.sampleDoors();
    blocks.values.getDoors = { ...doors, anime: { ...doors.anime, featured: null } };
    const html = await renderHome();
    expect(count(html, /class="hub-h2-site-spot"/g)).toBe(1);
    expect(html).not.toContain('>Just added</span>');
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
    expect(html).not.toContain('>Just added</span>');
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
    expect(html).toContain('Pick your side, or play both.');
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
