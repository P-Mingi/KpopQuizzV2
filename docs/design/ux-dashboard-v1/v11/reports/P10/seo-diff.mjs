#!/usr/bin/env node
// SEO diff of one or more public URLs between two servers (worker brief P10 item 5:
// "SEO diff of /u/testtest flag on vs flag off: title, meta description, H1,
// canonical, JSON-LD, robots, server-rendered HTML"). GET only, as a guest.
//
//   node seo-diff.mjs --a http://localhost:4102 --b http://localhost:3040 /u/testtest [...]
//
// Compared: HTTP status, <title>, meta description, robots, canonical, hreflang
// alternates, every og:* / twitter:* meta, every JSON-LD block (parsed, key order
// normalised), the H1 text, and the set of internal <a href> in the SERVED HTML
// (before any JS runs). Exit 1 when title / description / robots / canonical /
// hreflang / og / twitter / JSON-LD / H1 differ or when an internal link of A is
// missing from B. Links only in B (additions) are listed, not failed (16.10).

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.resolve(here, '../../../../../../apps/quiz/package.json'))('@playwright/test');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const A = opt('--a', 'http://localhost:4102');
const B = opt('--b', 'http://localhost:3040');
const pages = args.length ? args : ['/u/testtest'];

const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag); return m ? dec(m[1]) : null; };
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;

function extract(html) {
  // Next streams metadata for some user agents: read the tags wherever they are.
  const head = html;
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key, val) => metas.filter((t) => (attr(t, key) ?? '').toLowerCase() === val).map((t) => attr(t, 'content'));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const og = metas.filter((t) => /^(og|twitter):/i.test(attr(t, 'property') ?? attr(t, 'name') ?? '')).map((t) => `${attr(t, 'property') ?? attr(t, 'name')}=${attr(t, 'content')}`).sort();
  const jsonld = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => { try { return JSON.stringify(sortKeys(JSON.parse(m[1]))); } catch { return m[1]; } }).sort();
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => dec(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim());
  const body = html.slice(html.indexOf('<body'));
  const linkSet = (s) => new Set([...s.matchAll(/<a\b[^>]*\shref="([^"]+)"/gi)].map((m) => dec(m[1])).filter((h) => h.startsWith('/') && !h.startsWith('//')));
  const hrefs = linkSet(body);
  const mainHrefs = new Set(); // filled from the DOM below (contentLinks)
  return {
    title: (/<title>([\s\S]*?)<\/title>/i.exec(head)?.[1] ?? null)?.trim() ?? null,
    description: meta('name', 'description')[0] ?? null,
    robots: meta('name', 'robots')[0] ?? null,
    canonical: links.filter((t) => (attr(t, 'rel') ?? '') === 'canonical').map((t) => attr(t, 'href'))[0] ?? null,
    hreflang: links.filter((t) => attr(t, 'hreflang')).map((t) => `${attr(t, 'hreflang')}=${attr(t, 'href')}`).sort(),
    og, jsonld, h1, hrefs, mainHrefs,
  };
}

// The page's own content, parsed from the SERVED HTML with scripts off (streamed
// segments stay in the DOM, hidden): the v11 passport root (.p10-passport) or the
// legacy passport column (the parent of .pp-wrap). The shell (nav, tab bar,
// footer) is A0's scope and is listed separately.
const browser = await chromium.launch(process.env.UX11_CHROMIUM ? { executablePath: process.env.UX11_CHROMIUM } : {});
const ctx = await browser.newContext({ javaScriptEnabled: false });
async function contentLinks(html) {
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const out = await page.evaluate(() => {
    const root = document.querySelector('.p10-passport') ?? document.querySelector('.pp-wrap')?.parentElement ?? null;
    if (!root) return null;
    return [...root.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && h.startsWith('/') && !h.startsWith('//'));
  });
  await page.close();
  return out ? new Set(out) : null;
}

let failed = false;
for (const p of pages) {
  const ua = { 'user-agent': process.env.SEO_UA || 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' };
  const [ra, rb] = await Promise.all([fetch(A + p, { redirect: 'manual', headers: ua }), fetch(B + p, { redirect: 'manual', headers: ua })]);
  const [ha, hb] = await Promise.all([ra.text(), rb.text()]);
  const a = extract(ha); const b = extract(hb);
  const ca = await contentLinks(ha); const cb = await contentLinks(hb);
  if (ca) a.mainHrefs = ca; if (cb) b.mainHrefs = cb;
  const rows = [['status', ra.status, rb.status]];
  for (const k of ['title', 'description', 'robots', 'canonical']) rows.push([k, a[k], b[k]]);
  for (const k of ['hreflang', 'og', 'jsonld', 'h1']) rows.push([k, JSON.stringify(a[k]), JSON.stringify(b[k])]);
  process.stdout.write(`\n== ${p}  (A ${A}  |  B ${B})\n`);
  for (const [k, x, y] of rows) {
    const same = String(x) === String(y);
    if (!same) failed = true;
    process.stdout.write(`${same ? 'SAME' : 'DIFF'}  ${k}${same ? `  ${String(x).slice(0, 160)}` : `\n   A: ${String(x).slice(0, 400)}\n   B: ${String(y).slice(0, 400)}`}\n`);
  }
  const cmp = (x, y) => ({ missing: [...x].filter((h) => !y.has(h)).sort(), added: [...y].filter((h) => !x.has(h)).sort() });
  const m = cmp(a.mainHrefs, b.mainHrefs);
  const d = cmp(a.hrefs, b.hrefs);
  if (m.missing.length) failed = true;
  process.stdout.write(`${m.missing.length ? 'DIFF' : 'SAME'}  internal links of the page content (served HTML): A ${a.mainHrefs.size}, B ${b.mainHrefs.size}; missing in B ${m.missing.length}${m.missing.length ? `: ${m.missing.join(' ')}` : ''}; only in B ${m.added.length}${m.added.length ? `: ${m.added.join(' ')}` : ''}\n`);
  process.stdout.write(`INFO  internal links in the whole document (shell = A0): A ${a.hrefs.size}, B ${b.hrefs.size}; only in A ${d.missing.length}${d.missing.length ? `: ${d.missing.join(' ')}` : ''}; only in B ${d.added.length}${d.added.length ? `: ${d.added.join(' ')}` : ''}\n`);
}
await browser.close();
process.stdout.write(failed ? '\nSEO DIFF: differences found\n' : '\nSEO DIFF: empty (only link additions, if any)\n');
process.exit(failed ? 1 : 0);
