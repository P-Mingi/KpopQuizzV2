// Run O1, final check C1: visual and accessibility audit of the three sites on o1-dev (kpopquiz.org stays reference only).
//
//   O1_C1_ANIME_URL  the anime server  (http://anime.localhost:<port>, scripts/o1-tools/dev-up.sh)   unset skips the anime tests
//   O1_C1_HUB_URL    the hub server    (http://hub.localhost:<port>)                                  unset skips the hub tests
//   O1_C1_KPOP_URL   the kpop server   (http://kpop.localhost:<port>)                                 unset skips the kpop reference test
//   O1_C1_OUT        output folder, default docs/o1/reports/C1: shots/<site>-<page>-<phone|desktop>.png and results-<viewport>.json
//   O1_C1_SHOTS=0    no screenshots
//
// Rerun (owner):  scripts/o1-tools/dev-up.sh   then
//   O1_C1_ANIME_URL=http://anime.localhost:3191 O1_C1_HUB_URL=http://hub.localhost:3192 O1_C1_KPOP_URL=http://kpop.localhost:3190 \
//     pnpm -C apps/quiz exec playwright test -c playwright.o1.config.ts e2e/o1/C1/a11y.o1.ts --project=lanes
//
// Per page, at 375 px (phone) and 1280 px (desktop): axe serious and critical violations (axe-core of the repo, injected: the
// @axe-core/playwright package is not installed), horizontal scroll, images without alt, K-pop words and kpopquiz links (anime and hub
// only), missing styles or failed asset requests, the contrast of the site's own tokens, focus order and visible focus over the
// first 14 Tab stops. The test fails on any blocking finding of the anime and hub pages; the kpop pages are measured, never asserted.
// Sign-in uses scripts/o1-tools/signin-link.sh (fixtures dual, anime_new); a link is held in memory and never printed or stored.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

const ANIME = (process.env.O1_C1_ANIME_URL ?? '').replace(/\/+$/, '');
const HUB = (process.env.O1_C1_HUB_URL ?? '').replace(/\/+$/, '');
const KPOP = (process.env.O1_C1_KPOP_URL ?? '').replace(/\/+$/, '');
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const OUT = process.env.O1_C1_OUT ?? path.join(REPO, 'docs/o1/reports/C1');
const SHOTS = process.env.O1_C1_SHOTS !== '0';

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

/** The axe-core source: the repo's own copy (pnpm store), never a download. */
function axeSource(): string {
  const req = createRequire(import.meta.url);
  const tries: string[] = [];
  try { tries.push(req.resolve('axe-core/axe.min.js')); } catch { /* not hoisted */ }
  const store = path.join(REPO, 'node_modules/.pnpm');
  if (fs.existsSync(store)) {
    for (const d of fs.readdirSync(store).filter((n) => n.startsWith('axe-core@'))) tries.push(path.join(store, d, 'node_modules/axe-core/axe.min.js'));
  }
  const file = tries.find((f) => fs.existsSync(f));
  if (!file) throw new Error('axe-core not found in node_modules');
  return fs.readFileSync(file, 'utf8');
}
const AXE = axeSource();

/** A one-time sign-in link of a fixture account (scripts/o1-tools/signin-link.sh); kept in memory only. */
function mint(key: string, site: 'anime' | 'hub' | 'kpop'): string | null {
  try {
    const out = execFileSync('bash', [path.join(REPO, 'scripts/o1-tools/signin-link.sh'), key, site], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120_000 }).trim();
    return /^http/.test(out) ? out : null;
  } catch {
    return null;
  }
}

async function signIn(page: Page, base: string, key: string, site: 'anime' | 'hub' | 'kpop'): Promise<boolean> {
  const link = mint(key, site);
  if (!link) return false;
  await page.goto(link, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 40; i += 1) {
    if ((await page.context().cookies(base)).some((c) => /auth-token/.test(c.name))) return true;
    await page.waitForTimeout(250);
  }
  return false;
}

export interface Finding {
  page: string;
  viewport: string;
  kind: string;
  detail: string;
  blocking: boolean;
}

const notes: Record<string, string[]> = {};
const linkCache = new Map<string, number>();

function parseRgb(c: string): number[] | null {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m && m[1]) {
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return p.length >= 3 ? p : null;
  }
  const h = c.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!h || !h[1]) return null;
  const x = h[1].length === 3 ? h[1].split('').map((d) => d + d).join('') : h[1];
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)];
}
function lum(c: number[]): number {
  const f = (v: number | undefined): number => { const s = (v ?? 0) / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
export function ratio(a: string, b: string): number | null {
  const x = parseRgb(a), y = parseRgb(b);
  if (!x || !y) return null;
  const l1 = lum(x), l2 = lum(y);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

interface AuditOpts {
  /** page label for files and the report */
  label: string;
  site: 'anime' | 'hub' | 'kpop';
  /** words of the member's own data to ignore in the K-pop word scan */
  ownWords?: string[];
  /** the kpop reference pages are measured, never blocking */
  reference?: boolean;
  shot?: boolean;
  /** also run axe in dark mode */
  dark?: boolean;
}

async function audit(page: Page, vp: string, o: AuditOpts): Promise<Finding[]> {
  const out: Finding[] = [];
  const add = (kind: string, detail: string, blocking = true): void => { out.push({ page: o.label, viewport: vp, kind, detail, blocking: blocking && !o.reference }); };
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);

  // axe (light), and a second pass in dark mode on the pages that ask for it (o.dark)
  await page.addScriptTag({ content: AXE });
  for (const scheme of o.dark ? (['light', 'dark'] as const) : (['light'] as const)) {
    if (scheme === 'dark') {
      // C3: the shell fades its background in 250 ms (a0.css .ux-app); under load axe sampled colours in mid-fade (a different
      // node count every run). Transitions off for the sample, then a beat for the paint.
      await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForTimeout(400);
    }
    const axe = await page.evaluate(async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = await (window as any).axe.run(document, { resultTypes: ['violations'] });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return r.violations.map((v: any) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes.slice(0, 3).map((n: any) => ({ target: n.target.join(' '), summary: String(n.failureSummary ?? '').split('\n').slice(0, 3).join(' | ').slice(0, 220) })) }));
    });
    for (const v of axe as Array<{ id: string; impact: string | null; help: string; nodes: number; sample: Array<{ target: string; summary: string }> }>) {
      const serious = v.impact === 'serious' || v.impact === 'critical';
      add(`axe${scheme === 'dark' ? '-dark' : ''}:${v.id}`, `${v.impact} x${v.nodes} ${v.help} :: ${v.sample.map((x) => `${x.target} ${x.summary}`).join(' // ')}`, serious);
    }
    if (scheme === 'dark') await page.emulateMedia({ colorScheme: 'light' });
  }

  // horizontal scroll
  const hs = await page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const sw = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const wide: string[] = [];
    if (sw > w + 1) {
      for (const el of Array.from(document.body.querySelectorAll('*'))) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > w + 1 && wide.length < 5) wide.push(`${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''} right=${Math.round(r.right)}`);
      }
    }
    return { w, sw, wide };
  });
  if (hs.sw > hs.w + 1) add('hscroll', `scrollWidth ${hs.sw} > ${hs.w}: ${hs.wide.join(', ')}`, vp === 'phone');

  // images without alt
  const imgs = await page.evaluate(() => Array.from(document.images).filter((i) => !i.hasAttribute('alt')).map((i) => (i.currentSrc || i.src).slice(0, 90)).slice(0, 5));
  if (imgs.length) add('img-no-alt', imgs.join(' ; '));
  const svgNoName = await page.evaluate(() => Array.from(document.querySelectorAll('[role="img"]')).filter((e) => !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !(e.querySelector('title'))).length);
  if (svgNoName) add('role-img-no-name', `${svgNoName} role=img without a name`);

  // K-pop words and links on anime and hub. The hub is the network directory: its "The sites" list names KpopQuiz and links to it by
  // design, so the name KpopQuiz and the link to the kpop origin are allowed there; any other K-pop word or kpop link is a finding.
  if (o.site !== 'kpop') {
    const s = await page.evaluate(() => ({ text: document.body.innerText, hrefs: Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? ''), title: document.title, desc: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '' }));
    const own = [...(o.ownWords ?? []), ...(o.site === 'hub' ? ['KpopQuiz'] : [])];
    const text = own.reduce((t, w) => t.split(w).join(''), `${s.text}\n${s.title}\n${s.desc}`);
    const hits = text.match(/[^]{0,30}(?:k-?pop|kpopquiz|korean pop|hallyu)[^]{0,30}/gi) ?? [];
    if (hits.length) add('kpop-word', hits.slice(0, 4).map((h) => JSON.stringify(h)).join(' ; '));
    const kpopOrigin = KPOP ? new URL(KPOP).host : '';
    const links = s.hrefs.filter((h) => /kpopquiz|kpop/i.test(h) && !(o.site === 'hub' && (h.startsWith(KPOP) || /^https:\/\/(www\.)?kpopquiz\.org\/?$/.test(h) || (kpopOrigin && h.includes(kpopOrigin)))));
    if (links.length) add('kpop-link', links.slice(0, 4).join(' ; '));
  }

  // K-pop art on anime and hub: the rabbit mascot, idol photos, the kpop logo or favicon (img sources, decoded)
  if (o.site !== 'kpop') {
    const art = await page.evaluate(() => Array.from(document.images).map((i) => decodeURIComponent(i.currentSrc || i.src)).filter((u) => /\/mascot\/|\/idols\/|\/logo-512|kpop/i.test(u)).slice(0, 4));
    if (art.length) add('kpop-art', art.map((u) => u.slice(0, 90)).join(' ; '));
  }

  // dead links of the chrome and the page (same origin, GET, redirects followed): a nav entry that answers 404 or 5xx
  {
    const origin = new URL(page.url()).origin;
    const hrefs = await page.evaluate(() => Array.from(new Set(Array.from(document.querySelectorAll('header a[href], nav a[href], footer a[href], main a[href]')).map((a) => (a as HTMLAnchorElement).href))).slice(0, 60));
    const dead: string[] = [];
    for (const h of hrefs) {
      if (!h.startsWith(origin) || /\/_next\/|\/api\//.test(h)) continue;
      const key = new URL(h).pathname;
      let st = linkCache.get(`${origin}${key}`);
      if (st === undefined) {
        st = (await page.request.get(h, { timeout: 60_000, maxRedirects: 5 }).then((r) => r.status()).catch(() => 0));
        linkCache.set(`${origin}${key}`, st);
      }
      if (st >= 400 || st === 0) dead.push(`${key} ${st}`);
    }
    if (dead.length) add('dead-link', dead.slice(0, 12).join(' ; '));
  }

  // missing styles
  const st = await page.evaluate(() => {
    const cs = getComputedStyle(document.body);
    return { sheets: document.styleSheets.length, font: cs.fontFamily.slice(0, 60), bg: cs.backgroundColor, h1: document.querySelectorAll('h1').length, main: document.querySelectorAll('main,[role="main"]').length };
  });
  if (st.sheets === 0 || /^(Times|serif)/i.test(st.font)) add('no-styles', JSON.stringify(st));
  if (st.h1 !== 1) add('h1-count', `${st.h1} h1`, false);
  if (st.main !== 1) add('main-count', `${st.main} main landmarks`, false);

  // focus order and visible focus
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur?.(); window.scrollTo(0, 0); });
  const stops: Array<{ id: string; top: number; left: number; visible: boolean; kind: string }> = [];
  for (let i = 0; i < 14; i += 1) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const id = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}:${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24)}`;
      const r = el.getBoundingClientRect();
      const props = ['outlineStyle', 'outlineWidth', 'outlineColor', 'boxShadow', 'borderTopColor', 'backgroundColor', 'color', 'textDecorationLine', 'transform'] as const;
      const snap = (): Record<string, string> => { const c = getComputedStyle(el); const o: Record<string, string> = {}; for (const p of props) o[p] = c[p]; return o; };
      const on = snap();
      const outline = on.outlineStyle !== 'none' && parseFloat(on.outlineWidth ?? '0') > 0 && on.outlineColor !== 'rgba(0, 0, 0, 0)';
      const shadow = on.boxShadow !== 'none';
      let changed = false;
      if (!outline && !shadow) {
        el.blur();
        const off = snap();
        changed = props.some((p) => off[p] !== on[p]);
        el.focus();
      }
      return { id, top: Math.round(r.top + window.scrollY), left: Math.round(r.left), visible: outline || shadow || changed, w: r.width, h: r.height };
    });
    if (!s) break;
    stops.push({ id: s.id, top: s.top, left: s.left, visible: s.visible, kind: s.w < 1 || s.h < 1 ? 'zero-size' : 'ok' });
  }
  const noFocus = stops.filter((s) => !s.visible);
  if (noFocus.length) add('focus-not-visible', noFocus.map((s) => s.id).slice(0, 5).join(' ; '));
  const zero = stops.filter((s) => s.kind === 'zero-size');
  if (zero.length) add('focus-on-hidden', zero.map((s) => s.id).slice(0, 5).join(' ; '), false);
  const back = stops.filter((s, i) => i > 0 && s.top < (stops[i - 1]?.top ?? 0) - 250);
  if (back.length) add('focus-order-jump-up', back.map((s) => s.id).slice(0, 5).join(' ; '), false);
  const posTab = await page.evaluate(() => document.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').length);
  if (posTab) add('positive-tabindex', `${posTab} elements`);
  notes[`${o.label}|${vp}`] = [`tab stops: ${stops.map((s) => s.id).join(' > ')}`];

  if (SHOTS && o.shot !== false) {
    fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
    await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur?.(); window.scrollTo(0, 0); });
    await page.screenshot({ path: path.join(OUT, 'shots', `${o.site}-${o.label}-${vp}.png`), fullPage: false });
  }
  save(vp, o.site, o.label, out, notes[`${o.label}|${vp}`] ?? []);
  return out;
}

/** Contrast of the site's own tokens (CSS custom properties --ux-*), light and dark. */
async function tokenContrast(page: Page, vp: string, label: string, site: string): Promise<Finding[]> {
  const out: Finding[] = [];
  const pairs: Array<[string, string, number]> = [
    ['ink', 'page', 4.5], ['ink', 'surface', 4.5], ['muted', 'page', 4.5], ['muted', 'surface', 4.5], ['muted', 'raised', 4.5],
    ['pink-ink', 'page', 4.5], ['pink-ink', 'raised', 4.5], ['pink-soft-ink', 'pink-soft', 4.5], ['on-accent', 'pink-fill', 4.5], ['on-accent', 'pink-fill-h', 4.5],
    ['ok', 'page', 4.5], ['no', 'page', 4.5], ['warn', 'page', 4.5], ['ok', 'ok-soft', 4.5], ['no', 'no-soft', 4.5], ['on-ok', 'ok', 4.5], ['input', 'page', 3],
  ];
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    const vars = await page.evaluate((names) => {
      const probe = document.createElement('span'); document.body.appendChild(probe);
      const cs = getComputedStyle(document.documentElement);
      const o: Record<string, string> = {};
      for (const n of names) {
        const raw = cs.getPropertyValue(`--ux-${n}`).trim();
        probe.style.color = raw || 'rgba(0,0,0,0)'; o[n] = raw ? getComputedStyle(probe).color : '';
      }
      probe.remove();
      return o;
    }, Array.from(new Set(pairs.flatMap((p) => [p[0], p[1]]))));
    for (const [fg, bg, min] of pairs) {
      if (!vars[fg] || !vars[bg]) continue;
      const r = ratio(vars[fg], vars[bg]);
      if (r !== null && r < min) out.push({ page: label, viewport: vp, kind: 'token-contrast', detail: `${site} ${scheme}: --ux-${fg} on --ux-${bg} = ${r.toFixed(2)} (min ${min})`, blocking: true });
    }
    notes[`${label}|${vp}`] = [...(notes[`${label}|${vp}`] ?? []), `tokens ${scheme}: ${Object.keys(vars).filter((k) => vars[k]).length}/${Object.keys(vars).length} read`];
  }
  await page.emulateMedia({ colorScheme: 'light' });
  save(vp, site, `${label}-${site}`, out, notes[`${label}|${vp}`] ?? []);
  return out;
}

async function visit(page: Page, url: string): Promise<number> {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  return res?.status() ?? 0;
}

/** Failed asset requests (css, js, font, image) seen while a page loaded. */
function watchAssets(page: Page, sink: string[]): void {
  page.on('response', (r) => {
    const t = r.request().resourceType();
    if (r.status() >= 400 && !r.url().includes('/_vercel/') && ['stylesheet', 'script', 'font', 'image'].includes(t) && sink.length < 20) sink.push(`${r.status()} ${t} ${new URL(r.url()).pathname.slice(0, 80)}`);
  });
}

/** One JSON file per audited page, so a failed test (the worker restarts) loses nothing: <out>/results/<site>-<page>-<viewport>.json */
function save(vp: string, site: string, label: string, findings: Finding[], note: string[]): void {
  const dir = path.join(OUT, 'results');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${site}-${label}-${vp}.json`), JSON.stringify({ findings, note }, null, 1));
}

function blocking(list: Finding[]): string[] {
  return list.filter((f) => f.blocking).map((f) => `${f.page}@${f.viewport} ${f.kind}: ${f.detail}`);
}


/** Plays the quiz on the page to its result: the first answer each time, "Next question", then "See your result". True when the result screen showed. */
async function playToResult(page: Page): Promise<boolean> {
  await page.getByRole('button', { name: /start quiz/i }).first().click({ timeout: 20_000 });
  for (let i = 0; i < 60; i += 1) {
    const answer = page.locator('button.p4-ans:not([disabled])').first();
    try { await answer.waitFor({ timeout: 4_000 }); } catch { break; }
    await answer.click().catch(() => undefined);
    const next = page.locator('button.ux-btn-primary').filter({ hasText: /next question|see your result|result|finish/i }).first();
    await next.click({ timeout: 8_000 }).catch(() => undefined);
    await page.waitForTimeout(250);
  }
  return page.locator('[data-testid="p4-photocard"]').first().isVisible({ timeout: 8_000 }).catch(() => false);
}

for (const vp of VIEWPORTS) {
  test.describe(`${vp.name} ${vp.width}px`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, ignoreHTTPSErrors: true });

    test('otakuquiz signed out: /, /series, series hubs, quiz with the spoiler gate, played quiz, /daily, /login, 404', async ({ page }) => {
      test.skip(!ANIME, 'O1_C1_ANIME_URL is not set');
      test.setTimeout(900_000);
      const failed: string[] = [];
      watchAssets(page, failed);
      const all: Finding[] = [];
      const run = async (label: string, url: string, expectStatus = 200, dark = false): Promise<void> => {
        const status = await visit(page, url);
        if (status !== expectStatus) all.push({ page: label, viewport: vp.name, kind: 'status', detail: `${url.replace(ANIME, '')} answered ${status}, expected ${expectStatus}`, blocking: true });
        all.push(...(await audit(page, vp.name, { label, site: 'anime', dark })));
      };

      await run('home', `${ANIME}/`, 200, true);
      all.push(...(await tokenContrast(page, vp.name, 'tokens', 'anime')));
      await run('series', `${ANIME}/series`);
      // 3 series hubs, one per tier (docs/anime/data/series/*.json "tier"): A attack-on-titan, B bleach, C vinland-saga (O1_C1_HUBS overrides)
      const pick = (process.env.O1_C1_HUBS ?? '/attack-on-titan-quiz,/bleach-quiz,/vinland-saga-quiz').split(',');
      const tierOf = ['A', 'B', 'C'];
      const quizzes: string[] = [];
      for (const [i, h] of pick.entries()) {
        await run(`series-hub-tier-${tierOf[i] ?? i + 1}-${h.replace(/-quiz$/, '').replace('/', '')}`, `${ANIME}${h}`);
        quizzes.push(...(await page.$$eval('a[href^="/q/"]', (as) => Array.from(new Set(as.map((a) => a.getAttribute('href') ?? ''))).slice(0, 8))));
      }
      notes['quizzes'] = [`found ${quizzes.length}`];
      // a quiz page with the spoiler gate (data-testid=spoiler-gate), and a quiz played to the result
      let gated: string | null = null;
      let plain: string | null = null;
      for (const q of quizzes) {
        await visit(page, `${ANIME}${q}`);
        const has = (await page.getByTestId('spoiler-gate').count()) > 0;
        if (has && !gated) gated = q;
        if (!has && !plain) plain = q;
        if (gated && plain) break;
      }
      if (gated) {
        await visit(page, `${ANIME}${gated}`);
        await page.getByTestId('spoiler-gate').scrollIntoViewIfNeeded().catch(() => undefined);
        all.push(...(await audit(page, vp.name, { label: 'quiz-spoiler-gate', site: 'anime' })));
        if (SHOTS) await page.screenshot({ path: path.join(OUT, 'shots', `anime-quiz-spoiler-gate-full-${vp.name}.png`), fullPage: true });
      } else all.push({ page: 'quiz-spoiler-gate', viewport: vp.name, kind: 'no-gated-quiz', detail: 'no quiz of the three hubs shows the spoiler gate', blocking: false });
      const target = plain ?? gated ?? quizzes[0];
      if (target) {
        await visit(page, `${ANIME}${target}`);
        await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
        all.push(...(await audit(page, vp.name, { label: 'quiz-intro', site: 'anime' })));
        const dismiss = page.getByRole('button', { name: /show anyway/i });
        if (await dismiss.count()) await dismiss.click().catch(() => undefined);
        const done = await playToResult(page).catch(() => false);
        if (done) all.push(...(await audit(page, vp.name, { label: 'quiz-result', site: 'anime' })));
        else all.push({ page: 'quiz-result', viewport: vp.name, kind: 'not-played', detail: `the quiz ${target} did not reach its result screen`, blocking: true });
      }

      // /daily redirects to today's quiz (or /quizzes)
      const daily = await page.goto(`${ANIME}/daily`, { waitUntil: 'domcontentloaded' });
      notes['daily'] = [`/daily -> ${new URL(page.url()).pathname} (${daily?.status()})`];
      all.push(...(await audit(page, vp.name, { label: 'daily', site: 'anime' })));
      await run('login', `${ANIME}/login`, 200, true);
      // a real 404 (a path no route knows answers 500 under next start -H 127.0.0.1, see docs/o1/reports/Q0b/tools.md)
      await run('404', `${ANIME}/bts-quiz`, 404);
      if (failed.length) all.push({ page: 'all', viewport: vp.name, kind: 'asset-4xx', detail: failed.join(' ; '), blocking: true });
      expect(blocking(all), 'blocking findings on otakuquiz signed out').toEqual([]);
    });

    test('otakuquiz signed in: /me, /settings, /u/<member>', async ({ page }) => {
      test.skip(!ANIME, 'O1_C1_ANIME_URL is not set');
      test.setTimeout(300_000);
      const ok = await signIn(page, ANIME, 'dual', 'anime');
      test.skip(!ok, 'no sign-in link for dual (is scripts/o1-tools/dev-up.sh running?)');
      const all: Finding[] = [];
      await visit(page, `${ANIME}/me`);
      all.push(...(await audit(page, vp.name, { label: 'me', site: 'anime', ownWords: ['o1_dual', 'Fixture Dual'] })));
      await visit(page, `${ANIME}/settings`);
      all.push(...(await audit(page, vp.name, { label: 'settings', site: 'anime', ownWords: ['o1_dual', 'Fixture Dual'] })));
      await visit(page, `${ANIME}/u/o1_dual`);
      all.push(...(await audit(page, vp.name, { label: 'u-member', site: 'anime', ownWords: ['o1_dual', 'Fixture Dual'] })));
      expect(blocking(all), 'blocking findings on otakuquiz signed in').toEqual([]);
    });

    test('otakuquiz signed in as the anime-only newcomer: /me, /u/<member>', async ({ page }) => {
      test.skip(!ANIME, 'O1_C1_ANIME_URL is not set');
      test.setTimeout(300_000);
      const ok = await signIn(page, ANIME, 'anime_new', 'anime');
      test.skip(!ok, 'no sign-in link for anime_new (is scripts/o1-tools/dev-up.sh running?)');
      const all: Finding[] = [];
      const own = ['o1_anime_new', 'Fixture Anime New'];
      await visit(page, `${ANIME}/me`);
      all.push(...(await audit(page, vp.name, { label: 'me-anime-new', site: 'anime', ownWords: own })));
      await visit(page, `${ANIME}/u/o1_anime_new`);
      all.push(...(await audit(page, vp.name, { label: 'u-anime-new', site: 'anime', ownWords: own })));
      expect(blocking(all), 'blocking findings on the newcomer pages').toEqual([]);
    });

    test('bunnyverse: /, /privacy, /login', async ({ page }) => {
      test.skip(!HUB, 'O1_C1_HUB_URL is not set');
      test.setTimeout(300_000);
      const failed: string[] = [];
      watchAssets(page, failed);
      const all: Finding[] = [];
      for (const [label, p] of [['home', '/'], ['privacy', '/privacy'], ['login', '/login']] as const) {
        const status = await visit(page, `${HUB}${p}`);
        if (status !== 200) all.push({ page: label, viewport: vp.name, kind: 'status', detail: `${p} answered ${status}`, blocking: true });
        all.push(...(await audit(page, vp.name, { label, site: 'hub', dark: label !== 'privacy' })));
        if (label === 'home') all.push(...(await tokenContrast(page, vp.name, 'tokens', 'hub')));
      }
      if (failed.length) all.push({ page: 'all', viewport: vp.name, kind: 'asset-4xx', detail: failed.join(' ; '), blocking: true });
      expect(blocking(all), 'blocking findings on bunnyverse').toEqual([]);
    });

    test('kpopquiz reference: / and one quiz page (measured, never asserted)', async ({ page }) => {
      test.skip(!KPOP, 'O1_C1_KPOP_URL is not set');
      test.setTimeout(300_000);
      await visit(page, `${KPOP}/`);
      await audit(page, vp.name, { label: 'home', site: 'kpop', reference: true });
      // o1-dev holds no kpop quiz: give one with O1_C1_KPOP_QUIZ (a /q/<slug> path), else the first /q/ link of the home
      const q = process.env.O1_C1_KPOP_QUIZ ?? (await page.$$eval('a[href^="/q/"]', (as) => as.map((a) => a.getAttribute('href') ?? '')[0] ?? ''));
      if (q) {
        await visit(page, `${KPOP}${q}`);
        await audit(page, vp.name, { label: 'quiz', site: 'kpop', reference: true });
      } else save(vp.name, 'kpop', 'quiz-none', [], ['no kpop quiz on this database: set O1_C1_KPOP_QUIZ']);
    });
  });
}

