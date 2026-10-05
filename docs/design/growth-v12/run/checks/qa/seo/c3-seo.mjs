#!/usr/bin/env node
// C3 SEO of the new v12 URLs on a flag-on build (V12 prompt 0.6, SYSTEM.md 4 and 5).
//   node c3-seo.mjs --base http://localhost:3071 --out <file.json>
// Raw server HTML (GET, no cookies, no JS): status, title, description, robots, canonical, hreflang, H1,
// JSON-LD. Then the same URL in Chromium (JS on) for the visible text: every FAQPage question and answer and
// every BreadcrumbList name must be in the visible text. Sitemap membership from /sitemap.xml.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(here, '../../../../../../../apps/quiz');
const { chromium } = createRequire(path.join(APP, 'package.json'))('@playwright/test');
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = (arg('--base') || 'http://localhost:3071').replace(/\/$/, ''), OUT = arg('--out');
const O = 'https://kpopquiz.org';
const NA = ['bts', 'blackpink', 'stray-kids', 'twice', 'aespa', 'newjeans', 'seventeen', 'exo', 'g-i-dle', 'ive', 'le-sserafim', 'red-velvet', 'ateez', 'enhypen', 'txt', 'itzy', 'shinee'];
const WM = ['aespa', 'ateez', 'blackpink', 'bts', 'enhypen', 'g-i-dle', 'itzy', 'ive', 'le-sserafim', 'newjeans', 'nmixx', 'seventeen', 'stray-kids', 'twice', 'txt'];
const LAND = ['/guess-the-kpop-song', '/fr/blind-test-kpop', '/es/adivina-la-cancion-kpop', '/id/tebak-lagu-kpop'];
const INDEX = [...LAND, '/blindtest/kpop-hits-2025', '/blindtest/5th-gen', '/blindtest/tiktok-viral', '/kpop-demon-hunters-quiz',
  ...NA.map((g) => `/${g}-name-all-members`), ...WM.map((g) => `/which-${g}-member-are-you`)];
const HIDDEN = ['/blindtest/kpop-hits-2026', '/blindtest/kpop-demon-hunters']; // 404 until G2's SQL
const NOINDEX = ['/live', '/join', '/creators', '/admin/editorial', '/admin/blind-tests/runs'];
const CLUSTER = ['en https://kpopquiz.org/guess-the-kpop-song', 'es https://kpopquiz.org/es/adivina-la-cancion-kpop',
  'fr https://kpopquiz.org/fr/blind-test-kpop', 'id https://kpopquiz.org/id/tebak-lagu-kpop', 'x-default https://kpopquiz.org/guess-the-kpop-song'];

const dec = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const txt = (s) => dec(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attrs = (t) => Object.fromEntries([...t.matchAll(/([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g)].map((m) => [m[1].toLowerCase(), dec(m[2])]));
function parse(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => attrs(m[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => attrs(m[0]));
  const meta = (k) => metas.find((a) => a.name === k || a.property === k)?.content ?? null;
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/);
  return {
    title: t ? dec(t[1]) : null, description: meta('description'), robots: meta('robots'),
    canonical: links.find((l) => l.rel === 'canonical')?.href ?? null,
    hreflang: links.filter((l) => l.rel === 'alternate' && l.hreflang).map((l) => `${l.hreflang} ${l.href}`).sort(),
    h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => txt(m[1])),
    jsonLd: [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return { __unparsed: true }; } }),
  };
}
const flat = (ld) => ld.flatMap((x) => (Array.isArray(x) ? x : x['@graph'] ? x['@graph'] : [x]));
const norm = (s) => String(s).replace(/\s+/g, ' ').trim().toLowerCase();

const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
const locs = new Set([...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.route((u) => true, (r) => (['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.continue() : r.fulfill({ status: 200, body: '{}' })));
const rows = [];
for (const [kind, list] of [['index', INDEX], ['hidden', HIDDEN], ['noindex', NOINDEX]]) {
  for (const u of list) {
    const res = await fetch(BASE + u, { redirect: 'manual' });
    const html = await res.text();
    const row = { url: u, kind, status: res.status, location: res.headers.get('location'), xRobots: res.headers.get('x-robots-tag'), inSitemap: locs.has(O + u), fails: [] };
    if (res.status === 200) Object.assign(row, parse(html));
    const f = (c, m) => { if (!c) row.fails.push(m); };
    if (kind === 'index') {
      f(res.status === 200, `status ${res.status}`); f(row.title, 'no title'); f(row.description, 'no description');
      f(row.h1?.length === 1, `h1 x${row.h1?.length}`); f(row.canonical === O + u, `canonical ${row.canonical}`);
      f(!/noindex/.test(`${row.robots} ${row.xRobots}`), `robots ${row.robots} ${row.xRobots}`); f(row.inSitemap, 'not in sitemap');
      if (LAND.includes(u)) f(JSON.stringify(row.hreflang) === JSON.stringify(CLUSTER), `hreflang ${JSON.stringify(row.hreflang)}`);
      await page.goto(BASE + u, { waitUntil: 'domcontentloaded' });
      // Page text without scripts (the JSON-LD itself) and styles. Not innerText: the FAQ answers sit in
      // closed <details> (crawlable collapse), which innerText leaves out although they are in the DOM.
      const vis = norm(await page.evaluate(() => { const b = document.body.cloneNode(true); b.querySelectorAll('script,style,noscript,template').forEach((e) => e.remove()); return b.textContent; }));
      for (const n of flat(row.jsonLd || [])) {
        if (n['@type'] === 'FAQPage') for (const q of n.mainEntity || []) {
          f(vis.includes(norm(q.name)), `FAQ question not visible: ${q.name}`);
          f(vis.includes(norm(txt(q.acceptedAnswer?.text || ''))), `FAQ answer not visible: ${String(q.acceptedAnswer?.text).slice(0, 60)}`);
        }
        if (n['@type'] === 'BreadcrumbList') for (const it of n.itemListElement || []) f(vis.includes(norm(it.name ?? it.item?.name)), `breadcrumb not visible: ${it.name}`);
      }
      row.ldTypes = flat(row.jsonLd || []).map((n) => n['@type']);
    } else if (kind === 'hidden') {
      f(res.status === 404, `status ${res.status}`); f(!row.inSitemap, 'in sitemap');
    } else {
      f(!row.inSitemap, 'in sitemap');
      if (res.status === 200) f(/noindex/.test(`${row.robots} ${row.xRobots}`), `robots ${row.robots} ${row.xRobots}`);
      else f(/^30[1278]$/.test(String(res.status)) || res.status === 404, `status ${res.status}`);
    }
    delete row.jsonLd;
    rows.push(row);
    console.log(`${row.fails.length ? 'FAIL' : 'ok  '} ${res.status} ${u}${row.fails.length ? ' :: ' + row.fails.join(' | ') : ''}`);
  }
}
await browser.close();
const fails = rows.filter((r) => r.fails.length).length;
console.log(`${rows.length} URLs, ${rows.length - fails} pass, ${fails} fail; sitemap ${locs.size} URLs`);
if (OUT) writeFileSync(OUT, JSON.stringify({ base: BASE, takenAt: new Date().toISOString(), sitemapCount: locs.size, rows }, null, 1) + '\n');
