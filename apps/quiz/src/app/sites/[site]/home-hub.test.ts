import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/copy/hub/h1';

// Lot H2a: the new FanQuiz home of the hub build (docs/o1/design/fanquiz-hub/), block by block. Supabase is a fake; no network, no write.
// The registry reads the site of the build when it loads, so each test loads the modules after setting NEXT_PUBLIC_SITE_ID.
// next/font only runs inside the Next compiler, so the font module is replaced by its one field the page reads.

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' } }));

const fake = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: { data: { username: 'mingi', xp: 90000 }, error: null } as { data: unknown; error: unknown },
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
  { site_id: 'anime', xp: 80, activated_at: '2026-10-01T00:00:00Z', banned_at: null },
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
  fake.user = null;
  fake.profile = { data: { username: 'mingi', xp: 90000 }, error: null };
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
    expect(nav).toContain('>FanQuiz</span>');
    expect(nav).not.toMatch(/>F</);
    for (const [href, label] of [['#today', 'Today'], ['#hot', 'Hot now'], ['#top', 'Top fans']] as const) expect(nav).toMatch(new RegExp(`<a href="${href}"[^>]*>${label}</a>`));
    expect(nav).toContain('href="https://kpopquiz.org/"');
    expect(nav).toContain('href="https://otakuquiz.org/"');
    expect(nav).toContain('aria-label="Search both sites"');
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
      expect(html).toContain(`href="${s.url}/" class="hub-h2-enter hub-h2-btn"`);
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
    expect(today).toContain('href="https://kpopquiz.org/daily"');
    expect(today).toContain('href="https://otakuquiz.org/daily"');
    expect(today).toContain('Blindtest of the day');
    expect(today).toContain('5 songs, 10 seconds each');
    expect(today).toContain('aria-label="Play a 10 second preview"');
    expect(today).toContain('Song 1 of 5 · press play');
    expect(today).toContain('Guess all 5 songs');
    expect(today).toContain('Debate of the day');
    expect(today).toContain('Best title track of 2025 so far?');
    expect(today).toContain('KpopQuiz community · one vote, then see what fans think');
    expect(today).toContain('New picks in a few hours (2:05, Paris time)');
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
    expect(quick).toContain('href="https://otakuquiz.org/trivia"');
  });
});

describe('Hot right now', () => {
  it('lists six quizzes, three of each site alternating, each linked to its own site', async () => {
    const html = await renderHome();
    const hot = block(html, '<section id="hot"', 'section');
    const ol = block(hot, '<ol class="hub-h2-hot-list"', 'ol');
    const hrefs = [...ol.matchAll(/<a href="([^"]+)" class="hub-h2-hcard/g)].map((m) => m[1]!);
    expect(hrefs).toHaveLength(6);
    expect(hrefs.map((h) => new URL(h).origin)).toEqual(['https://kpopquiz.org', 'https://otakuquiz.org', 'https://kpopquiz.org', 'https://otakuquiz.org', 'https://kpopquiz.org', 'https://otakuquiz.org']);
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
    expect(html).toContain('Save your progress');
    expect(html).toMatch(/<button[^>]*>Create my passport<\/button>/);
    expect(html).not.toContain('For you, ');
  });

  it('signed in: For you with the username, and the bridge to the other site', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    expect(html).toContain('For you, mingi');
    expect(html).toContain('Continue · KpopQuiz');
    expect(html).toContain('Stray Kids fans also play · OtakuQuiz');
    expect(count(html, /hub-h2-fcard-bridge/g)).toBe(1);
    expect(html).not.toContain('New here? Start easy');
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
    expect(foot).toContain('href="https://otakuquiz.org/"');
    expect(foot).toContain('href="/privacy"');
    expect(foot).toContain('href="/legal"');
    expect(foot).toContain('>hello@kpopquiz.org</span>');
    expect(foot).toContain('mascot-default.png');
  });
});

describe('every link is the canonical page of its own site', () => {
  it('has no link to a quiz path on the hub, and every quiz link is on kpopquiz.org or otakuquiz.org', async () => {
    const html = await renderHome();
    const { registry } = await load();
    const hrefs = [...html.matchAll(/ href="([^"]+)"/g)].map((m) => m[1]!);
    const own = new Set(['/', '/privacy', '/legal', '/passport', '#today', '#hot', '#top', '#passport', '#main']);
    for (const h of hrefs) {
      if (h.startsWith('/_next') || own.has(h)) continue;
      const origin = new URL(h).origin;
      expect([registry.REGISTRY.kpop.url, registry.REGISTRY.anime.url], h).toContain(origin);
    }
    expect(hrefs.filter((h) => h.startsWith(registry.REGISTRY.hub.url))).toEqual([]);
  });

  it('follows the dev origins outside production', async () => {
    vi.stubEnv('NEXT_PUBLIC_NET_ORIGINS', 'kpop=http://kpop.localhost:3000,anime=http://anime.localhost:3001');
    const html = await renderHome();
    expect(html).toContain('href="http://kpop.localhost:3000/daily"');
    expect(html).toContain('href="http://anime.localhost:3001/daily"');
    vi.unstubAllEnvs();
  });
});

describe('the structured data', () => {
  function blocks(html: string): Record<string, unknown>[] {
    return [...html.matchAll(/<script type="application\/ld\+json">([^<]*)<\/script>/g)].map((m) => JSON.parse(m[1]!.replace(/&quot;/g, '"')) as Record<string, unknown>);
  }

  it('carries the WebSite of the hub, without a search action', async () => {
    const [site] = blocks(await renderHome());
    expect(site).toMatchObject({ '@type': 'WebSite', name: 'FanQuiz', url: 'https://fanquiz.org' });
    expect(site).not.toHaveProperty('potentialAction');
  });

  it('carries the ItemList of Hot now: six items, each the canonical URL of the quiz on its own site', async () => {
    const list = blocks(await renderHome())[1]!;
    expect(list).toMatchObject({ '@type': 'ItemList', name: 'Hot right now' });
    const items = list.itemListElement as { position: number; name: string; url: string }[];
    expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(items[0]).toMatchObject({ name: 'Ultimate BTS era quiz - only real ARMYs survive', url: 'https://kpopquiz.org/q/ultimate-bts-era-quiz' });
    expect(items[1]!.url).toMatch(/^https:\/\/otakuquiz\.org\/q\//);
    expect(items.some((i) => i.url.startsWith('https://fanquiz.org'))).toBe(false);
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
      fake.profile = { data: { username: 'mingi', xp: 1 }, error: null };
      fake.memberships = { data: MEMBERSHIPS, error: null };
      fake.throwOn = null;
      fail();
      expect(await renderHome(), `failure ${i}`).toBe(signedOut);
    }
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
    expect(title).toBe('FanQuiz: K-pop and anime quizzes, one account');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(m.description).length).toBeGreaterThanOrEqual(120);
    expect(String(m.description).length).toBeLessThanOrEqual(160);
    expect(m.openGraph).toMatchObject({ url: `${registry.NETWORK.url}/`, title, siteName: 'FanQuiz' });
    expect(JSON.stringify(m)).not.toMatch(DASHES);
  });
});
