import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/copy/hub/h1';

// Lot H2a: the new Bunnyverse home of the hub build (docs/o1/design/fanquiz-hub/), block by block. Supabase is a fake; no network, no write.
// Lot H2c: the blocks read the modules of lib/site/hub/data/ (lot H2b), which are replaced here by the design's sample data in their own
// shapes (lib/site/hub/home-samples.test-support.ts, tests only); a test sets a block to null to see it leave the page.
// The registry reads the site of the build when it loads, so each test loads the modules after setting NEXT_PUBLIC_SITE_ID.
// next/font only runs inside the Next compiler, so the font module is replaced by its one field the page reads.

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' } }));

// The data modules: each answers what `blocks[name]` holds (the samples by default), `undefined` meaning the sample and null the missing block.
const blocks = vi.hoisted(() => ({ values: {} as Record<string, unknown>, calls: [] as Array<[string, unknown]> }));
vi.mock('@/lib/site/hub/data', async () => {
  const s = await import('@/lib/site/hub/home-samples.test-support');
  const samples: Record<string, () => unknown> = {
    getDoors: s.sampleDoors, getDailyQuizzes: s.sampleDaily, getBlindtest: s.sampleBlindtest, getDebate: s.sampleDebate, getRotation: s.sampleRotation,
    getSixtySeconds: s.sampleSixty, getDidYouKnow: s.sampleDyk, getHot: s.sampleHot, getStartEasy: s.sampleStartEasy, getForYou: s.sampleForYou,
    getCrossover: s.sampleCrossover, getTopFans: s.sampleTopFans, getSurprise: s.sampleSurprise,
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
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => {
    if (fake.throwOn === 'client') throw new Error('database unreachable');
    return {
      auth: { getUser: async () => { if (fake.throwOn === 'auth') throw new Error('fetch failed'); return { data: { user: fake.user }, error: null }; } },
      from: (t: string) => { if (fake.throwOn === 'from') throw new Error('boom'); return query(t); },
    };
  },
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
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('the top bar', () => {
  it('has the rabbit and the wordmark of the hub, the section links, the two site pills, search and sign in', async () => {
    const html = await renderHome();
    const nav = block(html, '<header class="hub-h2-head"', 'header');
    expect(nav).toContain(`<nav aria-label="${COPY['hp.nav.main']}"`);
    expect(nav).toContain('src="/_next/image?url=%2Fmascot%2Fmascot-default.png');
    expect(nav).toContain('>Bunnyverse</span>');
    expect(nav).not.toMatch(/>F</);
    for (const [href, label] of [['#today', 'Today'], ['#hot', 'Hot now'], ['#top', 'Top fans']] as const) expect(nav).toMatch(new RegExp(`<a href="${href}"[^>]*>${label}</a>`));
    expect(nav).toContain('href="https://kpopquiz.org/"');
    // Bunnyverse (lane 1): the OtakuQuiz home is https://bunnyverse.org/anime, without a trailing slash.
    expect(nav).toContain('href="https://bunnyverse.org/anime"');
    // the search button is a link to the search page of KpopQuiz (the filter of Hot now is All), no longer a button without action
    expect(nav).toMatch(/<a href="https:\/\/kpopquiz\.org\/search" aria-label="Search both sites" class="hub-h2-iconbtn hub-h2-btn">/);
    expect(nav).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Sign in<\/button>/);
  });

  it('is ink and cream: no pink or orange in the bar itself except the dots of the two sites', async () => {
    const css = (await import('node:fs')).readFileSync(new URL('../../../styles/sites/hub/h2.css', import.meta.url), 'utf8');
    for (const cls of ['hub-h2-head', 'hub-h2-nav', 'hub-h2-pill', 'hub-h2-solid', 'hub-h2-me']) {
      const rules = css.split('\n').filter((l) => new RegExp(`\\.${cls}[ ,{:]`).test(l) && !l.includes('@media'));
      expect(rules.length, cls).toBeGreaterThan(0);
      for (const r of rules) expect(r, cls).not.toMatch(/--hub-(k|a)\b|#D13A6E|#C2410C|--ux-pink/);
    }
  });

  it('signed in: the level chip links to the passport block, no sign in button', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    const { getLevelInfo } = await import('@/lib/constants');
    const nav = block(html, '<header class="hub-h2-head"', 'header');
    expect(nav).toMatch(/<a href="#passport" class="hub-h2-me">.*M<\/span>Lv \d+<\/a>/);
    expect(nav).toContain(`Lv ${getLevelInfo(90080, 'hub').level}`);
    expect(nav).not.toContain('>Sign in<');
  });
});

describe('the hero', () => {
  it('has one h1, the eyebrow and the lede of the design', async () => {
    const html = await renderHome();
    expect(count(html, /<h1\b/g)).toBe(1);
    expect(html).toContain('<h1 id="hero-h" class="hub-h2-h1">Quizzes for K-pop and anime fans</h1>');
    expect(html).toContain('>Two fandoms, one passport</p>');
    expect(html).toContain('Pick your side, or play both. One account keeps your level, streaks and badges on every site.');
  });

  it('has one door per site, in the network order, with the rabbit on the tile, never a letter', async () => {
    const html = await renderHome();
    const { registry } = await load();
    const doors = [...html.matchAll(/<article class="hub-h2-door hub-h2-s-([ka])">/g)].map((m) => m[1]);
    expect(doors).toEqual(['k', 'a']);
    expect(count(html, /<h2 class="hub-h2-name">/g)).toBe(2);
    for (const id of ['kpop', 'anime'] as const) {
      const s = registry.REGISTRY[id];
      expect(html).toContain(`<h2 class="hub-h2-name">${s.brand.name}</h2>`);
      // Bunnyverse (lane 1): the OtakuQuiz home has no trailing slash (https://bunnyverse.org/anime).
      expect(html).toContain(`href="${id === 'anime' ? s.url : `${s.url}/`}" class="hub-h2-enter hub-h2-btn"`);
    }
    expect(html).not.toMatch(/hub-h2-tile"[^>]*>(K|O)</);
    expect(count(html, /class="hub-h2-tile-mk"/g)).toBe(2);
    expect(html).toContain('Enter KpopQuiz');
    expect(html).toContain('Enter OtakuQuiz');
    expect(html).toContain('>Top now</span>');
    expect(html).toContain('>Just added</span>');
  });

  it('has Surprise me and its sentence', async () => {
    const html = await renderHome();
    expect(html).toMatch(/<button type="button" class="hub-h2-ghost hub-h2-btn">.*Surprise me<\/button>/);
    expect(html).toContain('A random quiz from both sites, one you have not played yet.');
    expect(html).not.toContain('role="status"');
  });
});

describe('Today', () => {
  it('has the quiz of the day of each site, the blindtest and the debate, linked to their own site', async () => {
    const html = await renderHome();
    const today = block(html, '<section id="today"', 'section');
    expect(today).toContain('aria-labelledby="today-h"');
    expect(count(today, /Quiz of the day/g)).toBe(2);
    expect(today).toContain('ZEROBASEONE: From Boys Planet to In Bloom');
    expect(today).toContain('Journey&#x27;s Beginning: Frieren Basics');
    // the real slug of each bank, entering the daily run (?daily=quiz), never the /daily redirect
    expect(today).toContain('href="https://kpopquiz.org/q/zerobaseone-from-boys-planet-to-in-bloom?daily=quiz"');
    expect(today).toContain('href="https://bunnyverse.org/anime/q/journeys-beginning-frieren-basics?daily=quiz"');
    expect(today).toContain('Blindtest of the day');
    // the real size of the set (10 songs), not the design's 5
    expect(today).toContain('10 songs, 10 seconds each');
    expect(today).toContain('aria-label="Play a 10 second preview"');
    expect(today).toContain('Song 1 of 10 · press play');
    expect(today).toContain('Guess all 10 songs');
    expect(today).toContain('href="https://kpopquiz.org/blindtest?daily=true"');
    expect(today).toContain('href="https://kpopquiz.org/community"');
    expect(today).toContain('Debate of the day');
    expect(today).toContain('Best title track of 2025 so far?');
    expect(today).toContain('KpopQuiz community · one vote, then see what fans think');
    // the rotation is 00:05 UTC: the Paris time printed is the real one (1:05 in winter, 2:05 in summer), from the data module
    expect(today).toContain('New picks in a few hours (1:05, Paris time)');
    expect(today).not.toContain('2:05');
  });

  it('shows the streaks only when signed in', async () => {
    expect(await renderHome()).not.toContain('Streak 6 days');
    fake.user = { id: 'u-1' };
    const today = block(await renderHome(), '<section id="today"', 'section');
    expect(today).toContain('Streak 6 days');
    expect(today).toContain('Streak 2 days');
  });
});

describe('60 seconds', () => {
  it('has the question with its four answers and the two sourced facts', async () => {
    const html = await renderHome();
    const quick = block(html, '<section aria-labelledby="quick-h"', 'section');
    expect(quick).toContain('ITZY&#x27;s 2022 single Cheshire borrows the concept of a famous cat from which story?');
    expect(count(quick, /<button type="button" class="hub-h2-opt"/g)).toBe(4);
    for (const a of ['Puss in Boots', 'The Jungle Book', 'Alice in Wonderland', 'The Wizard of Oz']) expect(quick).toContain(a);
    expect(quick).toContain('From K-pop Songs About Magic');
    expect(quick).not.toContain('role="status"');
    expect(quick).toContain('Source: Wikipedia · ');
    expect(quick).toContain('>More K-pop trivia</a>');
    expect(quick).toContain('>More anime trivia</a>');
    expect(quick).toContain('href="https://kpopquiz.org/trivia"');
    expect(quick).toContain('href="https://bunnyverse.org/anime/trivia"');
  });
});

describe('Hot right now', () => {
  it('lists six quizzes, three of each site alternating, each linked to its own site', async () => {
    const html = await renderHome();
    const hot = block(html, '<section id="hot"', 'section');
    const ol = block(hot, '<ol class="hub-h2-hot-list"', 'ol');
    const hrefs = [...ol.matchAll(/<a href="([^"]+)" class="hub-h2-hcard/g)].map((m) => m[1]!);
    expect(hrefs).toHaveLength(6);
    // OtakuQuiz lives in the folder /anime of bunnyverse.org (2026-10-28): the site of a link is its registry url, folder included.
    const siteOf = (h: string): string => (h.startsWith('https://kpopquiz.org/') ? 'kpop' : h.startsWith('https://bunnyverse.org/anime/') ? 'anime' : h);
    expect(hrefs.map(siteOf)).toEqual(['kpop', 'anime', 'kpop', 'anime', 'kpop', 'anime']);
    expect(hot).toContain('Ultimate BTS era quiz - only real ARMYs survive');
    expect(hot).toContain('Name and Face: Death Note True or False');
    expect(hot).toContain('KpopQuiz · BTS');
    expect(hot).toContain('OtakuQuiz · Death Note');
    expect(count(hot, /class="hub-h2-newpill"/g)).toBe(3);
    expect(hot).toContain('· 2.7k plays');
    expect(hot).toContain('>All K-pop quizzes on KpopQuiz</a>');
    expect(hot).toContain('>All anime quizzes on OtakuQuiz</a>');
  });

  it('has the filter group with three chips, All pressed', async () => {
    const hot = block(await renderHome(), '<section id="hot"', 'section');
    expect(hot).toContain('<div role="group" aria-label="Filter by site" class="hub-h2-seg">');
    const chips = [...hot.matchAll(/<button type="button" aria-pressed="(true|false)" class="hub-h2-segbtn">/g)].map((m) => m[1]);
    expect(chips).toEqual(['true', 'false', 'false']);
  });
});

describe('For you and Start easy', () => {
  it('signed out: the friendliest quiz of each site and the passport card', async () => {
    const html = await renderHome();
    expect(html).toContain('New here? Start easy');
    expect(html).toContain('First K-pop quiz · KpopQuiz');
    expect(html).toContain('First anime quiz · OtakuQuiz');
    expect(html).toContain('Easy · 1.7k plays');
    expect(html).toContain('Easy · New');
    expect(html).toContain('href="https://kpopquiz.org/q/kpop-company-quiz"');
    expect(html).toContain('Save your progress');
    expect(html).toMatch(/<button[^>]*>Create my passport<\/button>/);
    expect(html).not.toContain('For you, ');
  });

  it('signed in: For you with the username, the next quiz of the fandom and the bridge to the other site', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    expect(html).toContain('For you, mingi');
    expect(html).toContain('Next for a Stray Kids fan · KpopQuiz');
    expect(html).toContain('Stray Kids fans also play · OtakuQuiz');
    expect(html).toContain('href="https://bunnyverse.org/anime/q/first-steps-into-jujutsu-kaisen"');
    // no Continue card is invented: the run in progress lives in the browser of each site
    expect(html).not.toContain('Continue ·');
    expect(count(html, /hub-h2-fcard-bridge/g)).toBe(1);
    expect(html).not.toContain('New here? Start easy');
    // the fan's id, checked by the session, is what the data module is asked for
    expect(blocks.calls).toContainEqual(['getForYou', { userId: 'u-1' }]);
  });

  it('signed in with nothing played yet: Start easy, without the passport card the fan already has', async () => {
    fake.user = { id: 'u-1' };
    blocks.values.getForYou = null;
    const html = await renderHome();
    expect(html).toContain('New here? Start easy');
    expect(html).toContain('First K-pop quiz · KpopQuiz');
    expect(html).not.toContain('Save your progress');
    expect(html).not.toContain('For you, ');
  });
});

describe('Crossover', () => {
  it('is the one dark block, with three cards and the fact', async () => {
    const html = await renderHome();
    const cross = block(html, '<section aria-labelledby="cross-h"', 'section');
    expect(cross).toContain('When K-pop meets anime');
    expect(count(cross, /class="hub-h2-xcard/g)).toBe(3);
    expect(cross).toContain('IVE sang Will, the opening theme of Pok');
    expect(cross).toContain('href="https://kpopquiz.org/kpop-demon-hunters-quiz"');
    expect(cross).toContain('Six questions · The animated film and its songs');
    expect(cross).toContain('href="https://bunnyverse.org/anime/q/one-opening-many-endings-chainsaw-man-theme-songs"');
  });
});

describe('Top fans and the passport', () => {
  it('top fans: five rows, with the sites each fan plays', async () => {
    const html = await renderHome();
    const top = block(html, '<article id="top"', 'article');
    expect(count(top, /<li class="hub-h2-fan/g)).toBe(5);
    expect(top).toContain('@sunbae_mira');
    expect(top).toContain('aria-label="Plays on both sites"');
    expect(top).toContain('aria-label="Plays on OtakuQuiz"');
    expect(top).not.toContain('hub-h2-fan-me');
    expect(top).toContain('>Full leaderboard</a>');
  });

  it('signed in: the fan is marked in the list', async () => {
    fake.user = { id: 'u-1' };
    const top = block(await renderHome(), '<article id="top"', 'article');
    expect(top).toMatch(/hub-h2-fan hub-h2-fan-me"><span class="hub-h2-fan-rank">3<\/span>.*@mingi/);
  });

  it('signed out: the passport says what other sites see and never see, the same words as the privacy page, and offers sign in', async () => {
    const { home, privacy } = await load();
    const homeHtml = renderToStaticMarkup(await home.default());
    const passport = block(homeHtml, '<article id="passport"', 'article');
    expect(passport).toContain('One passport for both sites');
    expect(passport).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Sign in or create a passport<\/button>/);
    const shares = lines(block(passport, '<div class="hub-h2-shares-cols"', 'div'));
    const policy = renderToStaticMarkup(privacy.default());
    const policyShares = lines(block(policy, '<div class="hub-h1-shares"', 'div'));
    // the same keys, in the same order: the titles and the six or seven lines of the block
    expect(policyShares.slice(1)).toEqual(shares);
    expect(shares).toEqual([
      COPY['shares.seesTitle'], COPY['shares.seesUsername'], COPY['shares.seesAvatar'], COPY['shares.seesLevel'], COPY['shares.seesSites'],
      COPY['shares.hidesTitle'], COPY['shares.hidesEmail'], COPY['shares.hidesSignIn'], COPY['shares.hidesHistory'],
    ]);
    expect(passport).not.toContain('href="/passport"');
  });

  it('signed in: the username, the level, the sites joined, the progress and a link to /passport', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    const passport = block(html, '<article id="passport"', 'article');
    const { getLevelInfo } = await import('@/lib/constants');
    const level = getLevelInfo(90080, 'hub').level;
    expect(passport).toContain('@mingi');
    expect(passport).toContain(`Level ${level} · 2 sites joined`);
    expect(passport).toContain(`% to level ${level + 1}`);
    expect(passport).toMatch(/<a href="\/passport" class="hub-h2-plink hub-h2-lnk">Open my passport<\/a>/);
    expect(passport).not.toContain('Sign in or create a passport');
  });

  it('signed in with one site joined', async () => {
    fake.user = { id: 'u-1' };
    fake.memberships = { data: [MEMBERSHIPS[0]], error: null };
    expect(await renderHome()).toContain('· 1 site joined');
  });
});

describe('the footer', () => {
  it('has the wordmark, the two sites, privacy, the legal notice and the mailbox', async () => {
    const html = await renderHome();
    const foot = block(html, '<footer class="hub-h2-foot"', 'footer');
    expect(foot).toContain('The home of one account shared by KpopQuiz and OtakuQuiz. Fan-made quizzes, every fact sourced.');
    expect(foot).toContain('href="https://kpopquiz.org/"');
    expect(foot).toContain('href="https://bunnyverse.org/anime"');
    expect(foot).toContain('href="/privacy"');
    expect(foot).toContain('href="/legal"');
    expect(foot).toContain('>hello@kpopquiz.org</span>');
    expect(foot).toContain('mascot-default.png');
  });
});

describe('every link is the canonical page of its own site', () => {
  it('has no link to a quiz path on the hub, and every quiz link is on kpopquiz.org or bunnyverse.org/anime', async () => {
    const html = await renderHome();
    const { registry } = await load();
    const hrefs = [...html.matchAll(/ href="([^"]+)"/g)].map((m) => m[1]!);
    const own = new Set(['/', '/privacy', '/legal', '/passport', '#today', '#hot', '#top', '#passport', '#main']);
    expect(hrefs).toContain('https://kpopquiz.org/search');
    for (const h of hrefs) {
      if (h.startsWith('/_next') || own.has(h)) continue;
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

  it('every module null: the page still renders the title, the footer and the passport', async () => {
    const html = await none('getDoors', 'getDailyQuizzes', 'getBlindtest', 'getDebate', 'getSixtySeconds', 'getDidYouKnow', 'getHot', 'getStartEasy', 'getForYou', 'getCrossover', 'getTopFans', 'getSurprise');
    expect(count(html, /<h1\b/g)).toBe(1);
    expect(html).toContain('<article id="passport"');
    expect(html).toContain('<footer class="hub-h2-foot"');
    for (const gone of ['<section id="today"', '<section id="hot"', 'hub-h2-door ', 'hub-h2-surprise', 'aria-labelledby="quick-h"', 'aria-labelledby="cross-h"', '<article id="top"', 'aria-labelledby="start-h"']) {
      expect(html, gone).not.toContain(gone);
    }
    // the links of the bar to blocks that are not there go with them
    const nav = block(html, '<header class="hub-h2-head"', 'header');
    for (const a of ['#today', '#hot', '#top']) expect(nav).not.toContain(`href="${a}"`);
    expect(count(html, /application\/ld\+json/g)).toBe(1);
  });

  it('an error in a module is a missing block, never a 500', async () => {
    blocks.values.getHot = new Error('db down');
    blocks.values.getDoors = new Error('db down');
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    const html = await renderHome();
    quiet.mockRestore();
    expect(html).not.toContain('<section id="hot"');
    expect(html).not.toContain('hub-h2-door ');
    expect(html).toContain('<section id="today"');
  });

  it('Today: a card goes when its data goes, and with all three the section goes', async () => {
    const noBt = block(await none('getBlindtest'), '<section id="today"', 'section');
    expect(noBt).not.toContain('Blindtest of the day');
    expect(noBt).toContain('Debate of the day');
    expect(count(noBt, /Quiz of the day/g)).toBe(2);
    blocks.values = {};
    const noDebate = block(await none('getDebate'), '<section id="today"', 'section');
    expect(noDebate).not.toContain('Debate of the day');
    expect(noDebate).toContain('Blindtest of the day');
    blocks.values = { getDailyQuizzes: { kpop: null, anime: (await import('@/lib/site/hub/home-samples.test-support')).sampleDaily().anime } };
    const oneQuiz = block(await renderHome(), '<section id="today"', 'section');
    expect(count(oneQuiz, /Quiz of the day/g)).toBe(1);
    expect(oneQuiz).toContain('Frieren');
    blocks.values = {};
    expect(await none('getDailyQuizzes', 'getBlindtest', 'getDebate')).not.toContain('<section id="today"');
  });

  it('60 seconds: the question and the facts are independent, and with none the section goes', async () => {
    const noQuestion = block(await none('getSixtySeconds'), '<section aria-labelledby="quick-h"', 'section');
    expect(noQuestion).not.toContain('Quick question');
    expect(noQuestion).toContain('Did you know');
    blocks.values = {};
    const noFacts = block(await none('getDidYouKnow'), '<section aria-labelledby="quick-h"', 'section');
    expect(noFacts).toContain('Quick question');
    expect(noFacts).not.toContain('Did you know');
    blocks.values = {};
    expect(await none('getSixtySeconds', 'getDidYouKnow')).not.toContain('aria-labelledby="quick-h"');
  });

  it('Crossover: without the sourced fact the line goes, the cards stay', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    blocks.values.getCrossover = { ...s.sampleCrossover(), fact: null };
    const cross = block(await renderHome(), '<section aria-labelledby="cross-h"', 'section');
    expect(cross).not.toContain('hub-h2-x-fact');
    expect(count(cross, /class="hub-h2-xcard/g)).toBe(3);
  });

  it('Top fans: no public fan, no card; the passport stays', async () => {
    const html = await none('getTopFans');
    expect(html).not.toContain('<article id="top"');
    expect(html).toContain('<article id="passport"');
  });

  it('a fan who keeps the level private shows no level', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const top = s.sampleTopFans();
    blocks.values.getTopFans = { ...top, fans: top.fans.map((f, i) => (i === 0 ? { ...f, level: null } : f)) };
    const html = block(await renderHome(), '<article id="top"', 'article');
    expect(count(html, /class="hub-h2-fan-lv"/g)).toBe(4);
  });

  it('a door with no featured quiz has no Top now box', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const doors = s.sampleDoors();
    blocks.values.getDoors = { ...doors, anime: { ...doors.anime, featured: null } };
    const html = await renderHome();
    expect(count(html, /class="hub-h2-spot"/g)).toBe(1);
    expect(html).not.toContain('>Just added</span>');
  });
});

describe('the doors tell the real counts', () => {
  it('prints the counts of the module, in the pills and on the phone line', async () => {
    const s = await import('@/lib/site/hub/home-samples.test-support');
    const doors = s.sampleDoors();
    blocks.values.getDoors = { kpop: { ...doors.kpop, quizCount: 474, topicCount: 48 }, anime: { ...doors.anime, quizCount: 234, topicCount: 50, featuredLabel: 'Top now' } };
    const html = await renderHome();
    expect(html).toContain('>474 quizzes</span>');
    expect(html).toContain('>234 quizzes</span>');
    expect(html).toContain('>50 series</span>');
    expect(html).toContain('>234 quizzes · 50 series</span>');
    expect(html).not.toContain('New site');
    expect(html).toContain('>Top now</span>');
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

  it('is left out with no pool', async () => {
    blocks.values.getSurprise = null;
    expect(await renderHome()).not.toContain('Surprise me');
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

  it('is indexable once NET_INDEXING is on, canonical on the network origin, with the title of the design', async () => {
    const { home, registry } = await load();
    const m = home.metadata;
    expect(m.robots).toEqual({ index: true, follow: true });
    expect(m.alternates?.canonical).toBe(`${registry.NETWORK.url}/`);
    const title = (m.title as { absolute: string }).absolute;
    expect(title).toBe('Bunnyverse: K-pop and anime quizzes, one account');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(m.description).length).toBeGreaterThanOrEqual(120);
    expect(String(m.description).length).toBeLessThanOrEqual(160);
    expect(m.openGraph).toMatchObject({ url: `${registry.NETWORK.url}/`, title, siteName: 'Bunnyverse' });
    expect(JSON.stringify(m)).not.toMatch(DASHES);
  });
});
