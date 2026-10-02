import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from '../ux-v1/helpers/a11y';
import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';
import { OWNER_DEVIATIONS } from '../ux-v1/helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, widthOf } from '../ux-v1/helpers/setup-page';

import type { Page, Route } from '@playwright/test';
import type { StubbedCall } from '../ux-v1/helpers/guard';
import type { Theme } from '../ux-v1/helpers/setup-page';

// G3 Blindtest acquisition (V12): the four landings, the themed playlist pages and
// what /blindtest gains (Playlists rail, live band, language row), at the project
// width (ux-1440 / ux-390), light and dark, against the pinned v12 prototype
// (run/checks/reference/styles.json, captured by docs/design/growth-v12/capture-v12.mjs).
//
// No write: every page is wrapped with guardWrites (the dev server reads the
// production database). The read-only generate call is answered from a fixture so a
// run is deterministic, the clip is a local silent file. Run it with
// NEXT_PUBLIC_BT_TRACKING unset (a beacon sent at page teardown can escape the guard).
//
// Flag states (the server decides, G3_EXPECT=v12 | v11 | off makes it an assertion):
//   both on    everything below.
//   v11 only   no landing, no themed page, the v11 hub without the three additions.
//   both off   the same, on today's site.

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES_JSON = path.resolve(here, '../../../../docs/design/growth-v12/run/checks/reference/styles.json');
type StyleMap = Record<string, string>;
const REFERENCE = JSON.parse(fs.readFileSync(STYLES_JSON, 'utf8')) as Record<string, Record<string, StyleMap>>;

const env = loadTestEnv();
const EXPECT = process.env.G3_EXPECT as 'v12' | 'v11' | 'off' | undefined;
const SHOTS = process.env.G3_SHOTS;

const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top',
  'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'] as const;

type Lang = 'en' | 'fr' | 'es' | 'id';
const LANGS: Lang[] = ['en', 'fr', 'es', 'id'];
const LAND: Record<Lang, { path: string; h1: string; title: string; start: string; question: RegExp; again: string; your: string }> = {
  en: { path: '/guess-the-kpop-song', h1: 'Guess the K-pop song', title: 'Guess the K-pop song: free K-pop blind test | KpopQuiz', start: 'Start guessing', question: /^(Which song is this\?|Who sings this\?)$/, again: 'Play again', your: 'Your songs' },
  fr: { path: '/fr/blind-test-kpop', h1: 'Blind test K-pop', title: 'Blind test K-pop gratuit | KpopQuiz', start: 'Lancer le blind test', question: /^(Quelle est cette chanson \?|Qui chante \?)$/, again: 'Rejouer', your: 'Tes chansons' },
  es: { path: '/es/adivina-la-cancion-kpop', h1: 'Adivina la canción K-pop', title: 'Adivina la canción K-pop gratis | KpopQuiz', start: 'Empezar a adivinar', question: /^(¿Qué canción es\?|¿Quién canta\?)$/, again: 'Jugar otra vez', your: 'Tus canciones' },
  id: { path: '/id/tebak-lagu-kpop', h1: 'Tebak lagu K-pop', title: 'Tebak lagu K-pop gratis | KpopQuiz', start: 'Mulai menebak', question: /^(Lagu apa ini\?|Siapa penyanyinya\?)$/, again: 'Main lagi', your: 'Lagu-lagumu' },
};
const CLUSTER: Record<string, string> = { en: '/guess-the-kpop-song', fr: '/fr/blind-test-kpop', es: '/es/adivina-la-cancion-kpop', id: '/id/tebak-lagu-kpop', 'x-default': '/guess-the-kpop-song' };

// The five themed playlists. Which of them is playable is DATA (at least 10 songs in the pool
// generate reads: G2's rule), so the spec asks the server (GET /api/blind-test/modes, which applies
// that rule) instead of hard-coding it. On the catalogue of 2026-10-02: 5th-gen, kpop-hits-2025 and
// tiktok-viral are playable; kpop-hits-2026 and kpop-demon-hunters are hidden until the owner
// applies G2's SQL files, and move to the full page checks by themselves once they are.
const KPDH = 'kpop-demon-hunters';
const THEMES_ALL = [
  { id: 'kpop-hits-2026', state: 'theme-hits26', h1: 'K-pop hits 2026 blind test' },
  { id: '5th-gen', state: 'theme-gen5', h1: '5th gen blind test' },
  { id: 'tiktok-viral', state: 'theme-viral', h1: 'Viral on TikTok blind test' },
  { id: KPDH, state: 'theme-kpdh', h1: 'KPop Demon Hunters songs blind test' },
  { id: 'kpop-hits-2025', state: 'theme-hits25', h1: 'K-pop hits 2025 blind test' },
];
/** Filled once per worker from the modes API (both flags on only). */
let PLAYABLE: typeof THEMES_ALL = [];
let HIDDEN: string[] = THEMES_ALL.map((t) => t.id);
async function readPlayable(page: Page): Promise<void> {
  const res = await page.request.get('/api/blind-test/modes');
  expect(res.status(), 'the modes API answers').toBe(200);
  const body = (await res.json()) as { modes: Record<string, Array<{ id: string }>> };
  const ids = new Set(Object.values(body.modes).flat().map((m) => m.id));
  PLAYABLE = THEMES_ALL.filter((t) => ids.has(t.id));
  HIDDEN = THEMES_ALL.filter((t) => !ids.has(t.id)).map((t) => t.id);
}

interface Landmark {
  /** Prototype selector, as captured in styles.json. */
  proto: string;
  /** Implementation selector (first match). */
  impl: string;
  /** Reference state that shows it. */
  state: string;
  /** Properties not compared here, with the reason in the comment next to the entry. */
  skip?: string[];
}

interface Deviation { prefix: string[]; proto: string; prop: string; from: string; to: string; why: string }
// Expected values that differ from the capture: each exact, each with its reason.
const G3_DEVIATIONS: Deviation[] = [
  // A1's deviation 1 (reports/A1.md): the prototype's switch is 11px wider than its phone
  // column and scrolls the page sideways; under 420px the pills are 3px tighter on each side.
  { prefix: ['m', 'mk'], proto: '.langsw', prop: 'width', from: '360.828px', to: '336.828px', why: 'no sideways scroll at 390 (A1 deviation 1)' },
];

function refKey(width: number, theme: Theme, state: string): string {
  return `${width > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}-${state}`;
}
function expected(width: number, theme: Theme, l: Landmark): StyleMap | null {
  const key = refKey(width, theme, l.state);
  const raw = REFERENCE[key]?.[l.proto];
  if (!raw) return null;
  const out: StyleMap = { ...raw };
  const prefix = key.split('-')[0] ?? '';
  for (const d of G3_DEVIATIONS) if (d.prefix.includes(prefix) && d.proto === l.proto && out[d.prop] === d.from) out[d.prop] = d.to;
  for (const d of OWNER_DEVIATIONS) if (d.theme === theme && (d.proto === '*' || d.proto === l.proto) && out[d.prop] === d.from) out[d.prop] = d.to;
  return out;
}
const norm = (v: string): string => v.replace(/\s+/g, ' ').trim();
function close(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  return /^-?[\d.]+px$/.test(a.trim()) && /^-?[\d.]+px$/.test(b.trim()) && Math.abs(parseFloat(a) - parseFloat(b)) <= 2;
}
async function computed(page: Page, selectors: string[]): Promise<Record<string, StyleMap | null>> {
  return page.evaluate(({ sels, props }) => {
    const out: Record<string, Record<string, string> | null> = {};
    for (const s of sels) {
      const el = document.querySelector<HTMLElement>(s);
      if (!el || el.offsetParent === null) { out[s] = null; continue; }
      const cs = getComputedStyle(el);
      out[s] = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    }
    return out;
  }, { sels: selectors, props: [...PROPS] });
}

interface Mismatch { landmark: string; key: string; prop: string; expected: string; actual: string }
async function compare(page: Page, theme: Theme, landmarks: Landmark[]): Promise<{ checked: string[]; missing: string[]; mismatches: Mismatch[] }> {
  const w = widthOf(page);
  const got = await computed(page, [...new Set(landmarks.map((l) => l.impl))]);
  const checked: string[] = [];
  const missing: string[] = [];
  const mismatches: Mismatch[] = [];
  for (const l of landmarks) {
    const key = refKey(w, theme, l.state);
    const exp = expected(w, theme, l);
    expect(exp, `reference has ${l.proto} in ${key}`).not.toBeNull();
    const act = got[l.impl];
    if (!exp) continue;
    if (!act) { missing.push(`${l.impl} (${key})`); continue; }
    checked.push(`${l.proto} @ ${key}`);
    for (const p of PROPS) {
      if (l.skip?.includes(p)) continue;
      const e = exp[p]; const a = act[p];
      if (e === undefined || a === undefined) continue;
      if (!close(e, a)) mismatches.push({ landmark: l.proto, key, prop: p, expected: e, actual: a });
    }
  }
  return { checked, missing, mismatches };
}

async function shot(page: Page, theme: Theme, state: string, scrollTo?: string): Promise<void> {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  const t = `${widthOf(page) > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}`;
  // the same framing as capture-v12.mjs: the element at the top, 80px of air above it
  await page.evaluate((s) => {
    const e = s ? document.querySelector(s) : null;
    if (e) { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); } else window.scrollTo(0, 0);
  }, scrollTo ?? null);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(SHOTS, `${t}-${state}.png`) });
  await page.evaluate(() => window.scrollTo(0, 0));
}

// ---- fixtures ---------------------------------------------------------------------

const TITLES = ["God's Menu", 'How You Like That', 'Supernova', 'Hype Boy', 'Dynamite', 'FANCY', 'HOT', 'SHEESH', 'LOVE DIVE', 'Guerrilla'];
const ARTISTS = ['Stray Kids', 'BLACKPINK', 'aespa', 'NewJeans', 'BTS', 'TWICE', 'SEVENTEEN', 'BABYMONSTER', 'IVE', 'ATEEZ'];
function question(i: number): Record<string, unknown> {
  const artist = i % 3 === 1;
  const pool = artist ? ARTISTS : TITLES;
  const correct = pool[i]!;
  const choices = [1, 2, 3].map((k) => pool[(i + k) % pool.length]!);
  choices.splice(i % 4, 0, correct);
  return {
    song_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    question_type: artist ? 'artist' : 'title',
    question_text: artist ? 'Which group is this?' : 'Name the song',
    preview_url: `https://cdnt-preview.dzcdn.net/api/g3-test/${i}.mp3`,
    album_cover_medium: '/mascot/mascot-default.png',
    album_cover_big: '/mascot/mascot-default.png',
    correct_answer: correct,
    choices,
    reveal: { title: TITLES[i]!, artist: ARTISTS[i]!, album: `Album ${i + 1}`, cover: '/mascot/mascot-default.png' },
  };
}
const QUESTIONS = Array.from({ length: 10 }, (_, i) => question(i));
const RIGHT = (i: number): number => i % 4;

function silentWav(seconds = 12): Buffer {
  const rate = 8000; const n = rate * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}
const WAV = silentWav();

interface Harness { writes: StubbedCall[]; generate: unknown[]; created: unknown[] }
async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}
/** guardWrites first, then the fixtures (later routes win in Playwright). */
async function harness(page: Page, theme: Theme): Promise<Harness> {
  await preparePage(page, theme);
  const writes = await guardWrites(page, env.supabaseUrl);
  const h: Harness = { writes, generate: [], created: [] };
  await page.route(/cdnt-preview\.dzcdn\.net/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: WAV }));
  await page.route((u) => u.pathname === '/api/blind-test/generate', async (r) => { h.generate.push(r.request().postDataJSON()); await json(r, { questions: QUESTIONS }); });
  await page.route((u) => u.pathname === '/api/ranked/me', (r) => json(r, { ranked: 'not_live' }, 503));
  await page.route((u) => u.pathname === '/api/ux-v1/p6/challenge', async (r) => {
    if (r.request().method() !== 'POST') { await r.fallback(); return; }
    h.created.push(r.request().postDataJSON());
    await json(r, { code: 'KQ7P2X', path: '/blindtest?c=KQ7P2X', expiresAt: new Date(Date.now() + 48 * 3600e3).toISOString() });
  });
  return h;
}
/** The writes a run may attempt: the stubbed generate read (a POST) and nothing else. */
const realWrites = (h: Harness): StubbedCall[] => h.writes.filter((c) => !/\/api\/(blind-test\/generate|ux-v1\/p6\/challenge)$/.test(new URL(c.url).pathname));

type FlagState = 'v12' | 'v11' | 'off';
/** The flag state of the server, read from pages every state serves or refuses. */
async function flagState(page: Page): Promise<FlagState> {
  const res = await page.goto(LAND.en.path);
  const served = Boolean(res) && res!.status() === 200 && new URL(page.url()).pathname === LAND.en.path && (await page.locator('.g3-landhero').count()) > 0;
  if (served) return 'v12';
  await page.goto('/blindtest');
  return (await hasShell(page)) ? 'v11' : 'off';
}

async function open(page: Page, url: string, ready: string): Promise<number> {
  const res = await page.goto(url);
  const status = res?.status() ?? 0;
  if (status !== 200) return status;
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.locator(ready).first().waitFor({ timeout: 45_000 });
  return status;
}

async function playAll(page: Page): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4);
    // seven right, three wrong
    await page.locator('.p6-ans').nth(i < 7 ? RIGHT(i) : (RIGHT(i) + 1) % 4).click();
    await expect(page.locator('.p6-next')).toBeVisible();
    await page.locator('.p6-next').click();
  }
  await expect(page.locator('.p6-btcard')).toBeVisible();
}

let STATE: FlagState | null = null;
test.beforeEach(async ({ page }) => {
  if (STATE) return;
  await preparePage(page, 'light');
  await guardWrites(page, env.supabaseUrl);
  const state = await flagState(page);
  if (EXPECT) expect(state, 'the flag state asked for').toBe(EXPECT);
  if (state === 'v12') await readPlayable(page);
  STATE = state;
});

test.describe.configure({ timeout: 150_000 });

// ---- both flags on ------------------------------------------------------------------

const LANDING_LANDMARKS = (state: string): Landmark[] => [
  // height: the prototype hero carries the sample "1,204 fans playing today" eyebrow. The real
  // line comes from bt_runs and is hidden until that count exists, so the hero is one line shorter.
  { proto: '.landhero', impl: '.g3-landhero', state, skip: ['height'] },
  // height: at 390 the French and Indonesian H1 wrap on a different word count than the sample only
  // when the eyebrow is absent; the type itself (size, weight, tracking, leading) is compared.
  { proto: '.landhero h1', impl: '.g3-landhero h1', state },
  { proto: '.langsw', impl: '.g3-landtop .ux-langsw', state },
  { proto: '.btn-primary', impl: '.g3-landhero .ux-btn-primary', state, skip: ['width'] },
  // width: the heading is as wide as its words.
  { proto: '.sec-h h2', impl: '.g3-land .ux-sec-h h2', state, skip: ['width'] },
];

for (const theme of THEMES) {
  test.describe(`G3 landings ${theme}`, () => {
    for (const lang of LANGS) {
      test(`${lang}: the page, the reference landmarks, no sideways scroll, a11y`, async ({ page }, info) => {
        test.skip(STATE !== 'v12', `landings are not served here (state: ${STATE})`);
        const h = await harness(page, theme);
        expect(await open(page, LAND[lang].path, '.g3-land[data-live]')).toBe(200);

        await expect(page.locator('h1')).toHaveCount(1);
        expect(norm(await page.locator('h1').innerText())).toBe(LAND[lang].h1);
        expect(await page.evaluate(() => document.documentElement.lang)).toBe(lang);
        await expect(page.locator('.g3-landhero [data-g3="start"]')).toHaveText(LAND[lang].start);
        await expect(page.locator('.g3-landtop .ux-langsw a')).toHaveCount(4);
        await expect(page.locator('.g3-landtop .ux-langsw a[aria-current="page"]')).toHaveAttribute('hreflang', lang);
        await expect(page.locator('.g3-landtop .ux-urlchip')).toHaveText(`kpopquiz.org${LAND[lang].path}`);
        await expect(page.locator('#g3-steps > li')).toHaveCount(3);
        await expect(page.locator('.g3-trust li')).toHaveCount(3);
        // every theme card is a real link to a page that exists
        const cards = await page.locator('#g3-th a.ux-thm').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
        expect(cards.length).toBeGreaterThanOrEqual(1);
        for (const hidden of HIDDEN) expect(cards, 'a hidden themed playlist has no card').not.toContain(`/blindtest/${hidden}`);
        // "fans playing today": only from bt_runs. Shown = a number above zero, never the prototype's sample.
        const eyebrow = page.locator('.g3-landhero .p6-eyebrow');
        if ((await eyebrow.count()) > 0) {
          const n = Number((await eyebrow.innerText()).replace(/[^\d]/g, ''));
          expect(n).toBeGreaterThan(0);
        }
        await expect(page.locator('.g3-landhero')).not.toContainText('1,204');
        expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);

        const marks = [
          ...LANDING_LANDMARKS(`land-${lang}`),
          ...(lang === 'en' ? [
            // height: a card is as tall as its copy (the rail shows the playable themes, with real counts).
            { proto: '.thrail .thm', impl: '#g3-th .ux-thm', state: 'land-en', skip: ['height'] },
            { proto: '.steps3', impl: '#g3-steps', state: 'land-en' },
          ] : []),
        ];
        const r = await compare(page, theme, marks);
        await info.attach(`g3-land-${lang}.json`, { body: JSON.stringify(r, null, 1), contentType: 'application/json' });
        expect(r.missing).toEqual([]);
        expect(r.mismatches, 'boxes within 2px, styles equal to styles.json').toEqual([]);

        expect(await basicA11y(page)).toEqual([]);
        const axe = await runAxe(page, { include: '.g3-land' });
        if (axe) expect(axe, 'axe serious / critical').toEqual([]);

        await shot(page, theme, `land-${lang}`);
        if (lang === 'en') {
          await shot(page, theme, 'land-en-steps', '#g3-steps');
          await shot(page, theme, 'land-en-faq', '#g3-faq');
        }
        expect(h.writes, 'no mutating request was attempted').toEqual([]);
      });
    }
  });
}

test.describe('G3 landings SEO', () => {
  for (const lang of LANGS) {
    test(`${lang}: title, description, canonical, hreflang cluster, FAQ + FAQPage, BreadcrumbList, indexable`, async ({ page }) => {
      test.skip(STATE !== 'v12', `landings are not served here (state: ${STATE})`);
      await harness(page, 'light');
      // The served HTML, before any script runs: what a crawler reads.
      const res = await page.request.get(LAND[lang].path);
      expect(res.status()).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<title>${LAND[lang].title.replace(/&/g, '&amp;')}</title>`);
      expect((html.match(/<h1[ >]/g) ?? []).length).toBe(1);

      expect(await open(page, LAND[lang].path, '.g3-land[data-live]')).toBe(200);
      await expect(page).toHaveTitle(LAND[lang].title);
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc && desc.length).toBeGreaterThan(50);
      expect(/\d/.test(desc ?? ''), 'no number in the description').toBe(false);
      expect(new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!).pathname).toBe(LAND[lang].path);
      const robots = page.locator('meta[name="robots"]');
      if ((await robots.count()) > 0) expect(await robots.getAttribute('content')).not.toMatch(/noindex/);

      const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.getAttribute('hreflang'), new URL((e as HTMLLinkElement).href).pathname])));
      expect(alternates, 'the four-page cluster, x-default English, and nothing else').toEqual(CLUSTER);

      const lds = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t) as Record<string, unknown>);
      const faq = lds.find((l) => l['@type'] === 'FAQPage') as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> } | undefined;
      const crumbs = lds.find((l) => l['@type'] === 'BreadcrumbList') as { itemListElement: Array<{ name: string; item: string }> } | undefined;
      expect(faq, 'FAQPage JSON-LD').toBeTruthy();
      expect(crumbs?.itemListElement.map((i) => i.item)).toEqual(['https://kpopquiz.org/', `https://kpopquiz.org${LAND[lang].path}`]);
      expect(crumbs?.itemListElement[1]?.name).toBe(LAND[lang].h1);
      // the JSON-LD is the visible FAQ, question by question (a closed <details> still holds its text)
      const visible = await page.locator('#g3-faq details').evaluateAll((els) => els.map((e) => ({ q: (e.querySelector('summary')?.textContent ?? '').trim(), a: (e.querySelector('.p6-ab')?.textContent ?? '').trim() })));
      expect(visible.length).toBeGreaterThanOrEqual(2);
      expect(faq!.mainEntity.map((q) => ({ q: q.name, a: q.acceptedAnswer.text }))).toEqual(visible);
      // real numbers only: the prototype's sample counts are not on the page unless they are the real ones
      const lead = await page.locator('.g3-landhero .g3-lead').innerText();
      const nums = lead.match(/\d[\d.,  ]*\d|\d/g) ?? [];
      expect([0, 2]).toContain(nums.length);

      // in the sitemap
      const sm = await (await page.request.get('/sitemap.xml')).text();
      expect(sm).toContain(`<loc>https://kpopquiz.org${LAND[lang].path}</loc>`);
    });
  }
});

test.describe('G3 landings play', () => {
  for (const lang of LANGS) {
    test(`${lang}: Start plays a full run in the page language, nothing is written`, async ({ page }) => {
      test.skip(STATE !== 'v12', `landings are not served here (state: ${STATE})`);
      const h = await harness(page, 'light');
      expect(await open(page, LAND[lang].path, '.g3-land[data-live]')).toBe(200);
      await page.locator('.g3-landhero [data-g3="start"]').click();
      await expect(page.locator('.p6-play')).toBeVisible();
      await expect(page.locator('.p6-ans').first()).toBeVisible();
      // the run the hub starts for All K-pop: the same generate body
      expect(h.generate).toEqual([{ playlist: 'all', count: 10, mode: 'challenge' }]);
      expect(norm(await page.locator('.p6-btq').innerText())).toMatch(LAND[lang].question);
      expect(await page.locator('.p6-play').getAttribute('lang')).toBe(lang === 'en' ? null : lang);
      // song titles and artist names stay as released
      expect(await page.locator('.p6-at').allInnerTexts()).toEqual((QUESTIONS[0] as { choices: string[] }).choices);

      await playAll(page);
      await expect(page.locator('.p6-s')).toHaveText('7/10');
      await expect(page.locator('.p6-resact .ux-btn').first()).toHaveText(LAND[lang].again);
      await expect(page.locator('#p6-songs-h')).toHaveText(LAND[lang].your);
      await expect(page.locator('.p6-songrow')).toHaveCount(10);
      await expect(page.locator('.p6-songrow .ux-rt').first()).toHaveText(TITLES[0]!);
      if (lang === 'en') {
        // English output is the v11 game's, word for word
        await expect(page.locator('h1')).toHaveText('7/10 on the All K-pop blindtest');
        await expect(page.locator('.p6-l')).toContainText('Solid fan');
        await expect(page.locator('.p6-mine')).toContainText('Challenge a friend with these exact songs');
      }
      // Play again starts the same run again; Quit ends it before the page closes
      await page.locator('.p6-resact .ux-btn').first().click();
      await expect(page.locator('.p6-ans').first()).toBeVisible();
      expect(h.generate).toHaveLength(2);
      await page.locator('.p6-gbar .ux-ib, .p6-gbar button').first().click();
      await expect(page.locator('.g3-landhero')).toBeVisible();
      expect(realWrites(h), 'a free run saves nothing').toEqual([]);
    });
  }
});

for (const theme of THEMES) {
  test.describe(`G3 hub ${theme}`, () => {
    test('/blindtest: Playlists rail, live band, language row; the SEO fields are untouched', async ({ page }, info) => {
      test.skip(STATE !== 'v12', `the v12 hub is not served here (state: ${STATE})`);
      const h = await harness(page, theme);
      expect(await open(page, '/blindtest', '.p6-hub[data-live]')).toBe(200);

      // SEO lock: the same assertions as e2e/ux-v1/p6.spec.ts (unchanged file), with the flag on.
      await expect(page).toHaveTitle(/K-pop Blind Test - Guess the Song from a Clip/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Play the free K-pop blind test: hear a 10-second clip and guess the song\./);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/blindtest$/);
      const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((els) => Object.fromEntries(els.map((e) => [e.getAttribute('hreflang'), new URL((e as HTMLLinkElement).href).pathname])));
      expect(alternates, 'the en / pt-BR pair, nothing added').toEqual({ en: '/blindtest', 'pt-BR': '/pt/blindtest', 'x-default': '/blindtest' });
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await page.locator('h1').evaluate((e) => e.textContent)).toBe('Name thatK-pop song');
      await expect(page.locator('.p6-lead')).toHaveText('10 songs. 10 seconds each. Guess the song or the artist from a clip.');
      expect((await page.locator('.p6-acc summary').allTextContents()).map((q) => q.trim())).toEqual([
        'What is a K-pop blind test?', 'How many songs are available?', 'Can I play for just one group?', 'How does a round work?',
        'Is the blind test free?', 'What generations are covered?', 'Can I play on mobile?',
      ]);
      const types = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => (JSON.parse(t) as { '@type': string })['@type']);
      expect(types).toEqual(expect.arrayContaining(['FAQPage', 'WebApplication', 'BreadcrumbList']));
      expect(types.filter((t) => t === 'FAQPage' || t === 'WebApplication' || t === 'BreadcrumbList')).toHaveLength(3);

      // Playlists rail: real links, playable themes only, a real count or no count
      const rail = page.locator('#bt-th a.ux-thm');
      const hrefs = await rail.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      expect(hrefs).toEqual(expect.arrayContaining(['/blindtest/4th-gen', ...PLAYABLE.map((p) => `/blindtest/${p.id}`)]));
      for (const hidden of HIDDEN) expect(hrefs).not.toContain(`/blindtest/${hidden}`);
      await expect(page.locator('#g3-pl-h')).toHaveText('Playlists');
      await expect(page.locator('#g3-pl-h + a, .ux-sec-h:has(#g3-pl-h) a')).toHaveAttribute('href', '/guess-the-kpop-song');
      // the theme links of the v11 hub: every v11 mode kept, hidden themes absent
      const themeLinks = await page.locator('.p6-themes a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
      for (const id of ['classic', 'intro-challenge', '2nd-gen', '3rd-gen', '4th-gen', 'girl-groups', 'boy-groups', 'random-all']) expect(themeLinks).toContain(`/blindtest/${id}`);
      for (const hidden of HIDDEN) expect(themeLinks).not.toContain(`/blindtest/${hidden}`);

      // live band and language row
      await expect(page.locator('.g3-liveband h2')).toHaveText('Play live with friends');
      await expect(page.locator('.g3-liveband .ux-btn-primary')).toHaveAttribute('href', '/live');
      await expect(page.locator('.g3-liveband .ux-btn-ghost')).toHaveAttribute('href', '/join');
      const row = await page.locator('.g3-langrow a').evaluateAll((els) => els.map((e) => [e.getAttribute('hreflang'), e.getAttribute('href'), e.textContent]));
      expect(row).toEqual(LANGS.map((l) => [l, LAND[l].path, LAND[l].h1]));
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);

      const r = await compare(page, theme, [
        // height: a card is as tall as its copy (playable themes, real counts).
        { proto: '.thrail .thm', impl: '#bt-th .ux-thm', state: 'bthub-playlists', skip: ['height'] },
        { proto: '.sec-h h2', impl: '.ux-sec-h:has(#g3-pl-h) h2', state: 'bthub-playlists', skip: ['width'] },
        { proto: '.liveband', impl: '.g3-liveband', state: 'bthub-live-band' },
      ]);
      await info.attach('g3-hub.json', { body: JSON.stringify(r, null, 1), contentType: 'application/json' });
      expect(r.missing).toEqual([]);
      expect(r.mismatches, 'boxes within 2px, styles equal to styles.json').toEqual([]);

      const axe = await runAxe(page, { include: '.g3-liveband' });
      if (axe) expect(axe, 'axe serious / critical in the live band').toEqual([]);
      const axe2 = await runAxe(page, { include: '#bt-th' });
      if (axe2) expect(axe2, 'axe serious / critical in the rail').toEqual([]);

      await shot(page, theme, 'bthub-playlists', '#bt-th');
      await shot(page, theme, 'bthub-live-band', '.g3-liveband');
      expect(h.writes, 'no mutating request was attempted').toEqual([]);
    });

    for (const p of THEMES_ALL) {
      test(`/blindtest/${p.id}: hero, songs, more playlists, landmarks, a11y`, async ({ page }, info) => {
        test.skip(STATE !== 'v12', `theme pages are not served here (state: ${STATE})`);
        test.skip(HIDDEN.includes(p.id), `${p.id} has under 10 playable songs today: hidden (404, asserted in "rules"); its HTML is proven in src/lib/growth/render.test.ts`);
        const h = await harness(page, theme);
        expect(await open(page, `/blindtest/${p.id}`, '.g3-theme[data-live]')).toBe(200);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveText(p.h1);
        await expect(page).toHaveTitle(`${p.h1} | KpopQuiz`);
        expect(new URL((await page.locator('link[rel="canonical"]').getAttribute('href'))!).pathname).toBe(`/blindtest/${p.id}`);
        await expect(page.locator('.ux-crumb a')).toHaveAttribute('href', '/blindtest');
        await expect(page.locator('[data-g3="play"]')).toHaveText('Play this playlist');
        await expect(page.locator('.g3-plhero .ux-btn-ghost')).toHaveAttribute('href', '/live');
        // the songs are real rows: at least a full round, numbered, title and artist
        const rows = page.locator('#g3-tracks .g3-tr');
        expect(await rows.count()).toBe(10);
        for (const cell of await rows.locator('b').allInnerTexts()) expect(cell.trim().length).toBeGreaterThan(0);
        // the count next to the heading is a real count of at least one round
        const n = Number((await page.locator('.ux-sec-h:has(#g3-tracks-h) p').innerText()).replace(/[^\d]/g, ''));
        expect(n).toBeGreaterThanOrEqual(10);
        // the bridge card to the girl group quiz: on the KPop Demon Hunters page only
        await expect(page.locator('.g3-bridge')).toHaveCount(p.id === KPDH ? 1 : 0);
        if (p.id === KPDH) {
          await expect(page.locator('.g3-bridge a')).toHaveAttribute('href', '/kpop-demon-hunters-quiz');
          // text and audio only: no picture from the film (or any picture) on the page
          await expect(page.locator('.g3-theme img, .g3-theme picture')).toHaveCount(0);
        }
        const more = await page.locator('#g3-more a.ux-thm').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
        expect(more).not.toContain(`/blindtest/${p.id}`);
        for (const hidden of HIDDEN) expect(more).not.toContain(`/blindtest/${hidden}`);
        expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);

        const r = await compare(page, theme, [
          // height: the hero is as tall as its lead (one or two lines by theme and by width).
          { proto: '.plhero', impl: '.g3-plhero', state: p.state, skip: ['height'] },
          // the prototype's K-pop hits 2026 state has no song yet ("Opening soon"): its rows are compared with the 5th gen state's
          { proto: '.tracks .tr', impl: '.g3-tr', state: p.state === 'theme-hits26' ? 'theme-gen5' : p.state },
          ...(p.id === KPDH ? [{ proto: '.bridge', impl: '.g3-bridge', state: 'theme-kpdh' }] : []),
          { proto: '.btn-primary', impl: '[data-g3="play"]', state: p.state, skip: ['width'] },
        ]);
        await info.attach(`g3-${p.state}.json`, { body: JSON.stringify(r, null, 1), contentType: 'application/json' });
        expect(r.missing).toEqual([]);
        expect(r.mismatches, 'boxes within 2px, styles equal to styles.json').toEqual([]);

        expect(await basicA11y(page)).toEqual([]);
        const axe = await runAxe(page, { include: '.g3-theme' });
        if (axe) expect(axe, 'axe serious / critical').toEqual([]);
        await shot(page, theme, p.state);
        if (p.id === KPDH) await shot(page, theme, 'theme-kpdh-tracks', '#g3-tracks');
        expect(h.writes, 'no mutating request was attempted').toEqual([]);
      });
    }

    test('the KPop Demon Hunters bridge card (its markup placed on a playable theme page)', async ({ page }, info) => {
      // The KPDH page is hidden on today's catalogue (2 songs, 10 needed), so the server answers 404
      // and the bridge card cannot be opened in a browser. Its HTML is proven by the render test
      // (src/lib/growth/render.test.ts); here the same markup is placed on a playable theme page to
      // measure the card's CSS against the reference. Not a proof of the real page: see reports/G3.md.
      test.skip(STATE !== 'v12', `theme pages are not served here (state: ${STATE})`);
      test.skip(!HIDDEN.includes(KPDH), 'the real KPop Demon Hunters page is served: measured there');
      test.skip(PLAYABLE.length === 0, 'no themed playlist is playable');
      const h = await harness(page, theme);
      expect(await open(page, `/blindtest/${PLAYABLE[0]!.id}`, '.g3-theme[data-live]')).toBe(200);
      await page.evaluate(() => {
        const hero = document.querySelector('.g3-plhero');
        const sec = document.createElement('section');
        sec.className = 'ux-sec';
        sec.innerHTML = '<div class="g3-bridge" data-ux="bridge"><span class="g3-bridge-ic" aria-hidden="true"></span><div class="g3-grow"><h2 id="g3-bridge-h">Loved HUNTR/X? Find your real K-pop girl group</h2><p>Six questions, no pictures, a real group at the end with the three songs to start with.</p></div><a class="ux-btn ux-btn-primary" href="/kpop-demon-hunters-quiz">Take the quiz</a></div>';
        hero?.after(sec);
      });
      const r = await compare(page, theme, [{ proto: '.bridge', impl: '.g3-bridge', state: 'theme-kpdh' }]);
      await info.attach('g3-bridge.json', { body: JSON.stringify(r, null, 1), contentType: 'application/json' });
      expect(r.missing).toEqual([]);
      expect(r.mismatches).toEqual([]);
      await shot(page, theme, 'theme-kpdh-bridge-injected', '.g3-bridge');
      expect(h.writes).toEqual([]);
    });
  });
}

test.describe('G3 themed playlists: rules', () => {
  test('a themed playlist under 10 songs answers like an unknown mode, and is in no list', async ({ page }) => {
    test.skip(STATE !== 'v12', `theme pages are not served here (state: ${STATE})`);
    await harness(page, 'light');
    const unknown = await page.request.get('/blindtest/not-a-mode');
    const sm = await (await page.request.get('/sitemap.xml')).text();
    for (const id of HIDDEN) {
      const res = await page.request.get(`/blindtest/${id}`);
      expect(res.status(), id).toBe(unknown.status());
      expect(res.status(), id).toBe(404);
      expect(sm).not.toContain(`/blindtest/${id}<`);
    }
    for (const p of PLAYABLE) expect(sm).toContain(`<loc>https://kpopquiz.org/blindtest/${p.id}</loc>`);
    // every v11 mode is still listed
    for (const id of ['classic', '4th-gen', 'girl-groups', 'random-all']) expect(sm).toContain(`<loc>https://kpopquiz.org/blindtest/${id}</loc>`);
  });

  test('Play on a theme page starts its own playlist (generate answered locally) and saves nothing', async ({ page }) => {
    test.skip(STATE !== 'v12', `theme pages are not served here (state: ${STATE})`);
    test.skip(PLAYABLE.length === 0, 'no themed playlist is playable');
    const h = await harness(page, 'light');
    for (const p of PLAYABLE) {
      h.generate.length = 0;
      expect(await open(page, `/blindtest/${p.id}`, '.g3-theme[data-live]')).toBe(200);
      await page.locator('[data-g3="play"]').click();
      await expect(page.locator('.p6-ans').first()).toBeVisible();
      expect(h.generate, p.id).toEqual([{ playlist: p.id, count: 10, mode: 'challenge' }]);
      await playAll(page);
      await expect(page.locator('.p6-s')).toHaveText('7/10');
      // Challenge: on every themed playlist but KPop Demon Hunters (its soundtrack rows are refused by
      // the challenge route, so the row and the Share sheet block are not offered: G2 request R2)
      await expect(page.locator('.p6-mine'), p.id).toHaveCount(p.id === KPDH ? 0 : 1);
      await page.locator('.p6-resact .ux-btn').first().click();
      await expect(page.locator('.p6-ans').first()).toBeVisible();
      // Quit ends the run before the page goes away
      await page.locator('.p6-gbar button').first().click();
      await expect(page.locator('.g3-plhero')).toBeVisible();
    }
    expect(realWrites(h), 'a free run saves nothing').toEqual([]);
  });

  test('the hub menu lists the playable themes and starts them', async ({ page }) => {
    test.skip(STATE !== 'v12', `the v12 hub is not served here (state: ${STATE})`);
    const h = await harness(page, 'light');
    expect(await open(page, '/blindtest', '.p6-setup[data-live]')).toBe(200);
    test.skip(PLAYABLE.length === 0, 'no themed playlist is playable');
    await page.locator('.p6-pl').click();
    const items = page.locator('.p6-plmenu .p6-mi');
    const NAME: Record<string, string> = { 'kpop-hits-2026': 'K-pop hits 2026', '5th-gen': '5th gen', 'tiktok-viral': 'Viral on TikTok', [KPDH]: 'KPop Demon Hunters', 'kpop-hits-2025': 'K-pop hits 2025' };
    for (const t of THEMES_ALL) {
      // '5th gen' is also a generation of the menu: count the exact label under Themes or By generation
      const n = await items.filter({ hasText: new RegExp(`^${NAME[t.id]}$`) }).count();
      if (HIDDEN.includes(t.id)) expect(n, `${t.id} is hidden`).toBe(0);
      else expect(n, `${t.id} is listed`).toBeGreaterThanOrEqual(1);
    }
    const pick = PLAYABLE.find((p) => p.id !== '5th-gen') ?? PLAYABLE[0]!;
    await items.filter({ hasText: new RegExp(`^${NAME[pick.id]}$`) }).first().click();
    await page.locator('.p6-setup .ux-btn-primary').click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    expect(h.generate).toEqual([{ playlist: pick.id, count: 10, mode: 'challenge' }]);
    await page.locator('.p6-gbar button').first().click();
    await expect(page.locator('.p6-hero')).toBeVisible();
    expect(realWrites(h)).toEqual([]);
  });
});

// ---- v11 only, both off: nothing of G3 is served --------------------------------------

test.describe('G3 with the v12 flag off', () => {
  test('no landing, no themed page, no v12 addition on the hub, nothing in the sitemap', async ({ page }) => {
    test.skip(STATE === 'v12', 'both flags are on here');
    await preparePage(page, 'light');
    const writes = await guardWrites(page, env.supabaseUrl);
    for (const lang of LANGS) {
      const res = await page.request.get(LAND[lang].path, { maxRedirects: 0 });
      expect([301, 302, 307, 308, 404], `${LAND[lang].path} is not a page`).toContain(res.status());
    }
    const unknown = await page.request.get('/blindtest/not-a-mode');
    for (const id of THEMES_ALL.map((t) => t.id)) {
      expect((await page.request.get(`/blindtest/${id}`)).status(), id).toBe(unknown.status());
    }
    const hub = await (await page.request.get('/blindtest')).text();
    for (const mark of ['g3-liveband', 'g3-langrow', 'bt-th', 'ux-thm', '/guess-the-kpop-song', '/fr/blind-test-kpop', '/live"']) expect(hub, mark).not.toContain(mark);
    const sm = await (await page.request.get('/sitemap.xml')).text();
    for (const lang of LANGS) expect(sm).not.toContain(LAND[lang].path);
    for (const id of THEMES_ALL.map((t) => t.id)) expect(sm).not.toContain(`/blindtest/${id}<`);
    if (STATE === 'v11') {
      const css = await page.request.get('/api/ux-v1/a0/styles');
      expect(await css.text()).not.toContain('g3-');
    }
    expect(writes).toEqual([]);
  });
});
