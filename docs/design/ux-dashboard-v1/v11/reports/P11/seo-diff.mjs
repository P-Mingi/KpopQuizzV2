#!/usr/bin/env node
// P11 SEO + link-set diff (COMMON done-when 5): the same URLs from a flag-OFF server
// (A) and a flag-ON server (B), fetched back to back. GET only.
//
//   node seo-diff.mjs --a http://localhost:4112 --b http://localhost:4113 [--auth] /search /search?q=bts /notifications
//
// Compared: HTTP status and redirect target, <title>, meta description, robots,
// canonical, hreflang alternates, og:* / twitter:* metas, JSON-LD blocks (parsed,
// key order normalised), the H1 text, and the LINK SET: every internal <a href> of
// the served HTML (before any JS). Exit 1 when a head field or the H1 differ or when
// a link of A is missing from B (additions in B are listed, not failed: 16.10).
// --auth sends the Playwright setup's test-user cookies (apps/quiz/e2e/.auth/
// test-user.json) to both servers; the cookie values are never printed.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const AUTH = path.resolve(here, '../../../../../../apps/quiz/e2e/.auth/test-user.json');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const A = opt('--a', 'http://localhost:4112');
const B = opt('--b', 'http://localhost:4113');
const withAuth = args.includes('--auth');
if (withAuth) args.splice(args.indexOf('--auth'), 1);
const pages = args.length ? args : ['/search'];

const cookie = withAuth && fs.existsSync(AUTH)
  ? JSON.parse(fs.readFileSync(AUTH, 'utf8')).cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  : null;

const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag); return m ? dec(m[1]) : null; };
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;

function extract(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key, val) => metas.filter((t) => (attr(t, key) ?? '').toLowerCase() === val).map((t) => attr(t, 'content'));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const body = html.slice(Math.max(0, html.indexOf('<body')));
  return {
    title: (/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim() || null,
    description: meta('name', 'description')[0] ?? null,
    robots: meta('name', 'robots').join(' | ') || null,
    canonical: links.filter((t) => (attr(t, 'rel') ?? '') === 'canonical').map((t) => attr(t, 'href'))[0] ?? null,
    hreflang: links.filter((t) => attr(t, 'hreflang')).map((t) => `${attr(t, 'hreflang')}=${attr(t, 'href')}`).sort().join(' '),
    social: metas.filter((t) => /^(og|twitter):/i.test(attr(t, 'property') ?? attr(t, 'name') ?? '')).map((t) => `${attr(t, 'property') ?? attr(t, 'name')}=${attr(t, 'content')}`).sort().join(' '),
    jsonld: [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => { try { return JSON.stringify(sortKeys(JSON.parse(m[1]))); } catch { return m[1]; } }).sort().join('\n'),
    h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => dec(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()).join(' | '),
    hrefs: new Set([...body.matchAll(/<a\b[^>]*\shref="([^"]+)"/gi)].map((m) => dec(m[1])).filter((h) => h.startsWith('/') && !h.startsWith('//'))),
  };
}

let failed = false;
const headers = { 'user-agent': process.env.SEO_UA || 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', ...(cookie ? { cookie } : {}) };
for (const p of pages) {
  const [ra, rb] = await Promise.all([fetch(A + p, { redirect: 'manual', headers }), fetch(B + p, { redirect: 'manual', headers })]);
  const [ha, hb] = await Promise.all([ra.text(), rb.text()]);
  const a = extract(ha); const b = extract(hb);
  const lines = [`## ${p}${cookie ? ' (signed in: test user)' : ' (guest)'}`];
  const same = (k, x, y) => { const ok = x === y; if (!ok) failed = true; lines.push(`${ok ? 'same ' : 'DIFF '} ${k}: ${ok ? JSON.stringify(x) : `A=${JSON.stringify(x)}  B=${JSON.stringify(y)}`}`); };
  same('status', ra.status, rb.status);
  same('location', ra.headers.get('location'), rb.headers.get('location'));
  for (const k of ['title', 'description', 'robots', 'canonical', 'hreflang', 'social', 'jsonld', 'h1']) same(k, a[k], b[k]);
  const lost = [...a.hrefs].filter((h) => !b.hrefs.has(h)).sort();
  const added = [...b.hrefs].filter((h) => !a.hrefs.has(h)).sort();
  if (lost.length) failed = true;
  lines.push(`links: A (flag off) ${a.hrefs.size}, B (flag on) ${b.hrefs.size}, lost ${lost.length}, added ${added.length}`);
  if (lost.length) lines.push(`  LOST: ${lost.join(' ')}`);
  if (added.length) lines.push(`  added: ${added.join(' ')}`);
  lines.push(`  A set: ${[...a.hrefs].sort().join(' ')}`);
  lines.push(`  B set: ${[...b.hrefs].sort().join(' ')}`);
  console.log(lines.join('\n') + '\n');
}
console.log(failed ? 'RESULT: DIFFERENCES (see DIFF / LOST lines)' : 'RESULT: no SEO difference, no lost link');
process.exit(failed ? 1 : 0);
