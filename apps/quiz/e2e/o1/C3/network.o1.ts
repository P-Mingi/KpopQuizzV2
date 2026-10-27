// Run O1, lane C3: the whole network on o1-dev, three real servers (apps/quiz/e2e/o1/C3/run-dev.sh builds and starts
// them; the specs only test the servers they are given).
//
//   O1_KPOP_URL O1_ANIME_URL O1_HUB_URL   the three servers (http://<site>.localhost:<port>); a missing one skips its tests.
//   O1_NET_ORIGINS                        the NEXT_PUBLIC_NET_ORIGINS the servers were built with (the origins the hub
//                                         cards must link to); unset = the registry origins.
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   o1-dev, from scripts/o1/env.sh dev.
//
// What it covers: otakuquiz (anime theme, series list, a series hub with its blocks, the spoiler interstitial and the
// leak of tagged questions, kpop paths answering 404), fanquiz (the network cards, the passport of a signed-in fan),
// the passport jump kpop -> anime with a fixture account, and kpopquiz (200 and no anime word).
//
// Writes: o1-dev is read by the servers. The only write a test causes is the sign-in of a fixture account (the fixtures of
// docs/o1/fixtures-dev.json have no password, so the test asks the admin API for a one-time sign-in link, no email is
// sent, and trades it for a session with @supabase/ssr, which writes the session cookies into the browser), and what the
// app itself does for a signed-in fan (the passport jump stamps the anime membership). Nothing is created or deleted
// with the service role. Tests print outcomes only: never a key, a link, a ticket, a code or a URL with a query.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Browser, type BrowserContext } from '@playwright/test';

import { analyzeHtml, checkForbidden, decodeEntities, httpGet } from '../../../scripts/o1/leak-lib.mjs';
import { REGISTRY, netOrigin } from '../../../src/lib/site/registry';

type Site = 'kpop' | 'anime' | 'hub';
const SITES: readonly Site[] = ['kpop', 'anime', 'hub'];
const trim = (v: string | undefined): string => (v ?? '').replace(/\/+$/, '');
const URLS: Record<Site, string> = { kpop: trim(process.env.O1_KPOP_URL), anime: trim(process.env.O1_ANIME_URL), hub: trim(process.env.O1_HUB_URL) };
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../../..');

/** A page address without its query and fragment (a ticket, a code and a state live there). */
function bare(u: string): string {
  const url = new URL(u);
  return `${url.origin}${url.pathname}`;
}

function origin(site: Site): string {
  return new URL(URLS[site]).origin;
}

/** Where a browser reaches a site on this run: the origins the servers were built with, else the registry's. */
function expectedOrigin(id: Site): string {
  return netOrigin(id, { NEXT_PUBLIC_NET_ORIGINS: process.env.O1_NET_ORIGINS || undefined, VERCEL_ENV: undefined });
}

// ---------------------------------------------------------------------------------------------------------------
// Anonymous reads (the same GET as the leak suite: no cookie, no redirect followed)

interface Got { status: number; location: string | null; contentType: string; body: string }
const cache = new Map<string, Promise<Got>>();
function get(site: Site, p: string): Promise<Got> {
  const url = `${URLS[site]}${p}`;
  let hit = cache.get(url);
  if (!hit) {
    hit = httpGet(url, { timeoutMs: 120_000 }) as Promise<Got>;
    cache.set(url, hit);
  }
  return hit;
}

const textOf = (html: string): string => decodeEntities(html.replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ').replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const headings = (html: string): string[] => [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)].map((m) => textOf(m[2] ?? ''));

/** The series of the anime site: the cards of its /series list (`<a class="gdir-card" href="/<slug>-quiz">`). */
async function animeSeries(): Promise<{ status: number; slugs: string[] }> {
  const r = await get('anime', '/series');
  const slugs = new Set<string>();
  for (const a of analyzeHtml(r.body).anchors as Array<{ href: string; attrs: Record<string, string> }>) {
    if (!/\bgdir-card\b/.test(a.attrs.class ?? '')) continue;
    const m = /^\/([a-z0-9][a-z0-9-]*)-quiz$/.exec(a.href);
    if (m) slugs.add(m[1]!);
  }
  return { status: r.status, slugs: [...slugs] };
}
const NOT_LOADED = 'content not loaded';

// ---------------------------------------------------------------------------------------------------------------
// Fixture accounts

interface Fixture { key: string; username: string; email: string; id: string }
function fixture(key: string): Fixture {
  const list = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/o1/fixtures-dev.json'), 'utf8')).users as Fixture[];
  const f = list.find((u) => u.key === key);
  if (!f) throw new Error(`fixture ${key} is not in docs/o1/fixtures-dev.json`);
  return f;
}

const supabaseMissing = [!SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL', !ANON && 'NEXT_PUBLIC_SUPABASE_ANON_KEY', !SERVICE && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean) as string[];

function adminClient() {
  return createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * The session cookies of a fixture account, as @supabase/ssr writes them (chunked as it chunks them). The fixtures have
 * no password: the admin API makes a one-time sign-in link for the account (no email is sent), its hashed token is
 * traded for a session, the same way the app's own passport redeem signs a fan in (contracts/apis.md).
 */
async function sessionCookies(key: string): Promise<Array<{ name: string; value: string }>> {
  const f = fixture(key);
  const link = await adminClient().auth.admin.generateLink({ type: 'magiclink', email: f.email });
  expect(link.error, `sign-in link for ${key}`).toBeNull();
  const hashed = link.data.properties?.hashed_token;
  expect(hashed, `sign-in token for ${key}`).toBeTruthy();
  const jar = new Map<string, string>();
  const ssr = createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => { for (const c of list) { if (c.value) jar.set(c.name, c.value); else jar.delete(c.name); } },
    },
  });
  const signed = await ssr.auth.verifyOtp({ type: 'email', token_hash: hashed! });
  expect(signed.error, `session for ${key}`).toBeNull();
  expect(jar.size, `session cookies for ${key}`).toBeGreaterThan(0);
  return [...jar].map(([name, value]) => ({ name, value }));
}

async function signedInContext(browser: Browser, key: string, sites: readonly Site[]): Promise<BrowserContext> {
  const cookies = await sessionCookies(key);
  const context = await browser.newContext();
  for (const s of sites) await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: URLS[s], sameSite: 'Lax' as const })));
  return context;
}

/** The slugs of the quizzes of the three fixture series: the anime quizzes of o1-dev (docs/o1/contracts/fixtures/series). */
const ANIME_QUIZ_SLUGS: string[] = ['death-note', 'one-piece', 'spy-x-family'].flatMap((series) => {
  const file = path.join(REPO, 'docs/o1/contracts/fixtures/series', `${series}.json`);
  return fs.existsSync(file) ? ((JSON.parse(fs.readFileSync(file, 'utf8')).quizzes ?? []) as Array<{ slug: string }>).map((q) => q.slug) : [];
});

// ---------------------------------------------------------------------------------------------------------------
// otakuquiz

test.describe('otakuquiz (anime)', () => {
  test.skip(!URLS.anime, 'no anime server (O1_ANIME_URL)');

  test('/ answers 200 in the anime theme', async ({ page }) => {
    const r = await get('anime', '/');
    expect(r.status, 'anime /').toBe(200);
    expect(r.body, 'data-site on <html>').toMatch(/<html\b[^>]*\bdata-site="anime"/);
    expect(r.body, 'the ux-v1 class on <html>').toMatch(/<html\b[^>]*\bclass="[^"]*\bux-v1\b/);
    await page.goto(`${URLS.anime}/`);
    const gap = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--anime-o2-gap').trim());
    expect(gap, 'the anime stylesheet applies (its token is set on <html>)').not.toBe('');
  });

  test('a kpop-only path answers 404', async () => {
    const wrong: string[] = [];
    for (const p of ['/guess-the-kpop-idol', '/kpop-quiz-2026', '/verse', '/groups', '/idols-in-kdramas', '/stats']) {
      const r = await get('anime', p);
      if (r.status !== 404) wrong.push(`${p} answered ${r.status}`);
    }
    expect(wrong, 'kpop paths reachable on anime').toEqual([]);
  });

  test('/series lists the anime series', async () => {
    const s = await animeSeries();
    test.skip(s.status === 200 && s.slugs.length === 0, NOT_LOADED);
    expect(s.status, 'anime /series').toBe(200);
    expect(s.slugs, 'the fixture series are listed').toEqual(expect.arrayContaining(['death-note', 'one-piece', 'spy-x-family']));
    for (const kpop of ['bts', 'blackpink', 'twice', 'stray-kids', 'newjeans']) expect(s.slugs, `a kpop group (${kpop}) is not an anime series`).not.toContain(kpop);
  });

  test('/death-note-quiz shows the facts, arcs, characters and openings blocks', async () => {
    const s = await animeSeries();
    test.skip(s.status === 200 && s.slugs.length === 0, NOT_LOADED);
    const r = await get('anime', '/death-note-quiz');
    expect(r.status, 'anime /death-note-quiz').toBe(200);
    for (const id of ['series-facts', 'story-map', 'characters', 'openings']) {
      expect(r.body, `the ${id} block`).toContain(`data-testid="${id}"`);
    }
    const h = headings(r.body).join(' | ');
    expect(h, 'the arcs heading').toMatch(/Quizzes by arc/i);
    expect(h, 'a characters heading').toMatch(/characters/i);
    expect(h, 'an openings heading').toMatch(/openings/i);
    expect(textOf(r.body), 'the series name').toContain('Death Note');
  });

  // The fixture quizzes above arc 0 (docs/o1/contracts/fixtures/series): the interstitial shows, and no question tagged
  // above arc 0 reaches the HTML (visible text, attributes, page data) or the JSON-LD.
  interface FxQuestion { question: string; fun_fact?: string; spoiler?: { arc: number } }
  interface FxQuiz { slug: string; title: string; expected_level?: { arc_ord: number }; questions: FxQuestion[] }
  const fxDir = path.join(REPO, 'docs/o1/contracts/fixtures/series');
  const above: Array<{ series: string; slug: string; forbidden: string[] }> = [];
  for (const series of ['death-note', 'one-piece', 'spy-x-family']) {
    const file = path.join(fxDir, `${series}.json`);
    if (!fs.existsSync(file)) continue;
    for (const q of (JSON.parse(fs.readFileSync(file, 'utf8')).quizzes ?? []) as FxQuiz[]) {
      if ((q.expected_level?.arc_ord ?? 0) <= 0) continue;
      // the longest run of a text without a quote, so JSON escaping and entities cannot hide it
      const run = (s: string): string => s.split(/["'\\‘’“”&<>]/).sort((a, b) => b.length - a.length)[0]!.trim();
      const forbidden = q.questions.filter((x) => (x.spoiler?.arc ?? 0) > 0).flatMap((x) => [run(x.question), x.fun_fact ? run(x.fun_fact) : '']).filter((s) => s.length >= 20);
      above.push({ series, slug: q.slug, forbidden });
    }
  }
  test('the fixture files hold quizzes above arc 0', () => {
    expect(above.length, 'fixture quizzes above arc 0').toBeGreaterThan(0);
    for (const q of above) expect(q.forbidden.length, `${q.slug} has tagged questions to look for`).toBeGreaterThan(0);
  });
  for (const q of above) {
    test(`/q/${q.slug}: the interstitial shows, no tagged question in the HTML or JSON-LD`, async ({ page }) => {
      const s = await animeSeries();
      test.skip(s.status === 200 && s.slugs.length === 0, NOT_LOADED);
      const r = await get('anime', `/q/${q.slug}`);
      expect(r.status, `anime /q/${q.slug}`).toBe(200);
      expect(r.body, 'the gate is in the server HTML').toContain('data-testid="spoiler-gate"');
      expect(textOf(r.body), 'the interstitial title').toMatch(/This quiz can spoil/);
      const an = analyzeHtml(r.body);
      expect((checkForbidden({ an, forbidden: q.forbidden, layer: 'text' }) as Array<{ detail: string }>).map((v) => v.detail), 'tagged questions in the HTML').toEqual([]);
      expect((checkForbidden({ an, forbidden: q.forbidden, layer: 'jsonld' }) as Array<{ detail: string }>).map((v) => v.detail), 'tagged questions in the JSON-LD').toEqual([]);
      await page.goto(`${URLS.anime}/q/${q.slug}`);
      await expect(page.getByTestId('spoiler-gate'), 'the gate in the browser').toBeVisible();
      await expect(page.getByRole('heading', { name: /This quiz can spoil/ }), 'the interstitial in the browser').toBeVisible();
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------
// fanquiz

test.describe('fanquiz (hub)', () => {
  test.skip(!URLS.hub, 'no hub server (O1_HUB_URL)');
  const networkIds = (['kpop', 'anime'] as const).filter((id) => REGISTRY[id].kind !== 'hub');

  test('/ answers 200 signed out with one card per network site, linking to the registry origins', async ({ page }) => {
    const r = await get('hub', '/');
    expect(r.status, 'hub /').toBe(200);
    expect(r.body, 'data-site on <html>').toMatch(/<html\b[^>]*\bdata-site="hub"/);
    const res = await page.goto(`${URLS.hub}/`);
    expect(res?.status(), 'hub / in the browser').toBe(200);
    const cards = page.locator('li.hub-h1-card');
    await expect(cards, 'one card per site of the network').toHaveCount(networkIds.length);
    const hrefs: string[] = [];
    for (let i = 0; i < networkIds.length; i++) hrefs.push(trim((await cards.nth(i).locator('a[href]').first().getAttribute('href')) ?? ''));
    expect(hrefs.sort(), 'the cards link to the origins of the network').toEqual(networkIds.map((id) => expectedOrigin(id)).sort());
    for (const id of networkIds) await expect(page.locator('li.hub-h1-card', { hasText: REGISTRY[id].brand.name }), `the ${id} card names ${REGISTRY[id].brand.name}`).toHaveCount(1);
    await expect(page.getByText('@o1_', { exact: false }), 'signed out: no passport of a person').toHaveCount(0);
  });

  test('signed in (a fixture account) it shows the passport with the sites joined', async ({ browser }) => {
    test.skip(supabaseMissing.length > 0, `needs ${supabaseMissing.join(', ')}`);
    const f = fixture('dual');
    const admin = adminClient();
    const rows = await admin.from('world_memberships').select('site_id, activated_at, banned_at').eq('user_id', f.id);
    expect(rows.error, 'membership read').toBeNull();
    const joined = (rows.data ?? []).filter((m) => m.activated_at !== null && m.banned_at === null && REGISTRY[m.site_id as Site]?.kind === 'world').map((m) => m.site_id as Site);
    const expectedNames = SITES.filter((s) => joined.includes(s)).map((s) => REGISTRY[s].brand.name);

    const context = await signedInContext(browser, 'dual', ['hub']);
    const page = await context.newPage();
    const res = await page.goto(`${URLS.hub}/`);
    expect(res?.status(), 'hub / signed in').toBe(200);
    await expect(page.getByText(`@${f.username}`), 'the passport names the fan').toBeVisible();
    const sitesRow = page.locator('.hub-h1-home dl div', { has: page.locator('dt', { hasText: /sites/i }) }).first();
    const shown = (await sitesRow.locator('dd').innerText()).trim();
    test.info().annotations.push({ type: 'passport', description: `@${f.username} shows: ${shown}` });
    if (expectedNames.length > 0) expect(shown, 'the sites joined, in the order of the network').toBe(expectedNames.join(', '));
    else expect(shown, 'no site joined yet: the page says so').not.toBe('');
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------
// passport

test.describe('passport', () => {
  test.skip(!(URLS.kpop && URLS.anime), 'needs the kpop and anime servers (O1_KPOP_URL, O1_ANIME_URL)');

  /** The entry of the jump: signed out, /auth/passport/out sends the visitor to the anime origin (a 404 is a missing route). */
  async function expectJumpEntry(): Promise<void> {
    const r = await httpGet(`${URLS.kpop}/auth/passport/out?to=anime&next=/&via=k.menu`, { timeoutMs: 60_000 }) as Got;
    expect(r.status, '/auth/passport/out on kpop answers a redirect').toBeGreaterThanOrEqual(300);
    expect(r.status, '/auth/passport/out on kpop answers a redirect').toBeLessThan(400);
    expect(r.location ? new URL(r.location, URLS.kpop).origin : null, 'it redirects to the anime origin').toBe(origin('anime'));
  }

  test('/auth/passport/out on kpop redirects to the anime origin', async () => {
    await expectJumpEntry();
  });

  test('a fixture account signed in on kpop follows /auth/passport/out and lands signed in on anime', async ({ browser }) => {
    test.skip(supabaseMissing.length > 0, `needs ${supabaseMissing.join(', ')}`);
    test.setTimeout(300_000);
    await expectJumpEntry();
    const f = fixture('dual');
    const context = await signedInContext(browser, 'dual', ['kpop']);
    const page = await context.newPage();
    const requests: string[] = [];
    page.on('request', (r) => {
      if (r.url().startsWith(URLS.kpop) || r.url().startsWith(URLS.anime)) requests.push(`${r.method()} ${bare(r.url())}`);
    });
    await page.goto(`${URLS.kpop}/auth/passport/out?to=anime&next=/&via=k.menu`, { waitUntil: 'commit' });
    await page.waitForURL((u) => u.origin === origin('anime') && u.pathname === '/', { timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    const chain = requests.filter((r) => /\/auth\/(passport\/out|arrive|authorize|land)$|\/api\/passport\//.test(r));
    expect(chain, 'the chain of the jump').toEqual([
      `GET ${URLS.kpop}/auth/passport/out`,
      `GET ${URLS.anime}/auth/arrive`,
      `GET ${URLS.kpop}/auth/authorize`,
      `GET ${URLS.anime}/auth/land`,
      `POST ${URLS.anime}/api/passport/redeem`,
    ]);
    const me = await page.evaluate(async () => (await fetch('/api/auth/me', { credentials: 'same-origin' })).json());
    expect(me.profile?.username, 'signed in on anime as the fixture account').toBe(f.username);
    expect((await context.cookies(URLS.anime)).some((c) => /^sb-.*-auth-token/.test(c.name)), 'the anime session cookie is on the anime host').toBe(true);
    const stamp = await adminClient().from('world_memberships').select('site_id, activated_at').eq('user_id', f.id).eq('site_id', 'anime');
    expect(stamp.error, 'membership read').toBeNull();
    expect(stamp.data?.length, 'one anime membership').toBe(1);
    expect(stamp.data?.[0]?.activated_at, 'the anime membership is active').not.toBeNull();
    test.info().annotations.push({ type: 'jump', description: `${f.username}: chain of 5 requests, anime membership active` });
    await context.close();
  });

  test('signed out on kpop: the same link lands signed out on anime', async ({ browser }) => {
    test.setTimeout(300_000);
    await expectJumpEntry();
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${URLS.kpop}/auth/passport/out?to=anime&next=/&via=k.menu`, { waitUntil: 'commit' });
    await page.waitForURL((u) => u.origin === origin('anime') && u.pathname === '/', { timeout: 90_000 });
    await page.waitForLoadState('domcontentloaded');
    const me = await page.evaluate(async () => (await fetch('/api/auth/me', { credentials: 'same-origin' })).json());
    expect(me.profile, 'nobody is signed in on anime').toBeNull();
    await context.close();
  });
});

// ---------------------------------------------------------------------------------------------------------------
// kpopquiz

test.describe('kpopquiz (kpop)', () => {
  test.skip(!URLS.kpop, 'no kpop server (O1_KPOP_URL)');

  const quizLinks = (html: string): string[] =>
    (analyzeHtml(html).anchors as Array<{ href: string }>).map((a) => a.href).filter((h) => /^\/q\/[^/?#]+$/.test(h));
  const isAnimeQuiz = (href: string): boolean => ANIME_QUIZ_SLUGS.includes(href.replace(/^\/q\//, ''));

  const animeWord = (name: string, body: string): string[] =>
    [...body.matchAll(/anime/gi)].map((m) => `${name}: ...${body.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + 30).replace(/\s+/g, ' ')}...`);

  test('/ answers 200 with no anime word in the HTML', async () => {
    const home = await get('kpop', '/');
    expect(home.status, 'kpop /').toBe(200);
    expect(animeWord('/', home.body), 'the word anime in the HTML of /').toEqual([]);
  });

  test('one quiz page answers 200 with no anime word in the HTML', async () => {
    // one kpop quiz page: the first /q/<slug> link of the home or the lists that is not a quiz of the anime fixtures
    let quiz = '';
    for (const p of ['/', '/new', '/trending', '/most-liked']) {
      const hit = quizLinks((await get('kpop', p)).body).find((h) => !isAnimeQuiz(h));
      if (hit) { quiz = hit; break; }
    }
    test.skip(quiz === '', 'no kpop quiz on o1-dev (content not loaded: its quizzes are the anime fixtures)');
    const page = await get('kpop', quiz);
    expect(page.status, `kpop ${quiz}`).toBe(200);
    expect(animeWord(quiz, page.body), `the word anime in the HTML of ${quiz}`).toEqual([]);
  });

  // The anime quizzes live in the same tables as the kpop ones (SITE_SCOPE is on for the run): a kpop page lists none
  // of them and a kpop quiz address does not serve one.
  test('no quiz of the anime site on kpop: not listed on / or the lists, /q/<anime slug> answers 404', async () => {
    test.skip(ANIME_QUIZ_SLUGS.length === 0, NOT_LOADED);
    const listed: string[] = [];
    for (const p of ['/', '/new', '/trending', '/most-liked']) {
      const r = await get('kpop', p);
      for (const h of new Set(quizLinks(r.body).filter(isAnimeQuiz))) listed.push(`${p} links ${h}`);
    }
    expect(listed, 'anime quizzes listed on kpop').toEqual([]);
    const served: string[] = [];
    for (const slug of ANIME_QUIZ_SLUGS.slice(0, 3)) {
      const r = await get('kpop', `/q/${slug}`);
      if (r.status !== 404) served.push(`/q/${slug} answered ${r.status}`);
    }
    expect(served, 'anime quizzes served by kpop').toEqual([]);
  });
});
