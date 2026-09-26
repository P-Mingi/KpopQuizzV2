#!/usr/bin/env node
// P5 SEO lock proof for /create (brief: "/create keeps its title, meta, H1, intro and
// robots"; COMMON done-when 5 incl. the LINK SET). Compares two captures of the same
// URLs, flag off (A) and flag on (B), each either a server base URL or a folder of
// saved HTML (see capture below). GET only, as a guest, before any JS runs.
//
//   node seo-diff.mjs capture <baseUrl> <outDir>            # saves create.html, create-group.html, pt-create.status
//   node seo-diff.mjs diff <dirA-flag-off> <dirB-flag-on>   # prints the comparison, exit 1 on a lock break
//
// Compared: HTTP status, <title>, meta description, robots, canonical, hreflang,
// og:* / twitter:*, JSON-LD blocks (parsed, key order normalised), every H1, the
// intro paragraph under the H1, and the set of internal <a href> of the served
// HTML (every flag-off link must be served flag on; additions are listed).

import fs from 'node:fs';
import path from 'node:path';

const [mode, x, y] = process.argv.slice(2);
const PAGES = { 'create.html': '/create', 'create-group.html': '/create?group=bts' };
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' };

if (mode === 'capture') {
  fs.mkdirSync(y, { recursive: true });
  for (const [file, p] of Object.entries(PAGES)) {
    const r = await fetch(x + p, { redirect: 'manual', headers: UA });
    fs.writeFileSync(path.join(y, file), await r.text());
    fs.writeFileSync(path.join(y, `${file}.status`), String(r.status));
  }
  const pt = await fetch(`${x}/pt/create`, { redirect: 'manual', headers: UA });
  fs.writeFileSync(path.join(y, 'pt-create.status'), `${pt.status} ${pt.headers.get('location') ?? ''}`.trim());
  console.log('captured', y);
  process.exit(0);
}

const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag); return m ? dec(m[1]) : null; };
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;

function extract(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key, val) => metas.filter((t) => (attr(t, key) ?? '').toLowerCase() === val).map((t) => attr(t, 'content'));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const body = html.slice(html.indexOf('<body'));
  const h1m = /<h1\b[^>]*>([\s\S]*?)<\/h1>\s*<p[^>]*>([\s\S]*?)<\/p>/i.exec(body);
  return {
    title: (/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim(),
    description: meta('name', 'description')[0] ?? null,
    robots: meta('name', 'robots')[0] ?? null,
    canonical: links.filter((t) => attr(t, 'rel') === 'canonical').map((t) => attr(t, 'href'))[0] ?? null,
    hreflang: links.filter((t) => attr(t, 'hreflang')).map((t) => `${attr(t, 'hreflang')}=${attr(t, 'href')}`).sort().join(' | '),
    og: metas.filter((t) => /^(og|twitter):/i.test(attr(t, 'property') ?? attr(t, 'name') ?? '')).map((t) => `${attr(t, 'property') ?? attr(t, 'name')}=${attr(t, 'content')}`).sort().join(' | '),
    jsonld: [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => { try { return JSON.stringify(sortKeys(JSON.parse(m[1]))); } catch { return m[1]; } }).sort(),
    h1: [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => dec(m[1].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()),
    intro: h1m ? dec(h1m[2].replace(/<[^>]+>/g, '')).trim() : null,
    hrefs: [...new Set([...body.matchAll(/<a\b[^>]*\shref="([^"]+)"/gi)].map((m) => dec(m[1])))].sort(),
    aTags: [...body.matchAll(/<a\b[^>]*\shref="([^"]+)"/gi)].length,
  };
}

let broken = false;
const out = [];
for (const file of Object.keys(PAGES)) {
  const a = extract(fs.readFileSync(path.join(x, file), 'utf8'));
  const b = extract(fs.readFileSync(path.join(y, file), 'utf8'));
  const sa = fs.readFileSync(path.join(x, `${file}.status`), 'utf8');
  const sb = fs.readFileSync(path.join(y, `${file}.status`), 'utf8');
  out.push(`== ${PAGES[file]}`);
  const row = (k, va, vb) => { const same = JSON.stringify(va) === JSON.stringify(vb); if (!same) broken = true; out.push(`  ${same ? 'SAME' : 'DIFF'} ${k}: ${same ? JSON.stringify(va) : `${JSON.stringify(va)} -> ${JSON.stringify(vb)}`}`); };
  row('status', sa, sb);
  for (const k of ['title', 'description', 'robots', 'canonical', 'hreflang', 'og', 'h1', 'intro']) row(k, a[k], b[k]);
  row(`json-ld (${a.jsonld.length} blocks)`, a.jsonld, b.jsonld);
  const missing = a.hrefs.filter((h) => !b.hrefs.includes(h));
  const added = b.hrefs.filter((h) => !a.hrefs.includes(h));
  if (missing.length) broken = true;
  out.push(`  ${missing.length ? 'DIFF' : 'SAME'} link set: flag off ${a.hrefs.length} unique hrefs (${a.aTags} <a>), flag on ${b.hrefs.length} unique (${b.aTags} <a>); missing flag on: ${missing.length ? missing.join(' ') : 'none'}`);
  out.push(`    flag off: ${a.hrefs.join(' ')}`);
  out.push(`    added flag on (16.10 additions allowed): ${added.length ? added.join(' ') : 'none'}`);
}
const pa = fs.readFileSync(path.join(x, 'pt-create.status'), 'utf8');
const pb = fs.readFileSync(path.join(y, 'pt-create.status'), 'utf8');
if (pa !== pb) broken = true;
out.push(`== /pt/create (mirror): ${pa === pb ? 'SAME' : 'DIFF'} ${pa} -> ${pb}`);
out.push(broken ? 'SEO LOCK BROKEN' : 'no SEO difference (title, meta, robots, canonical, hreflang, og, JSON-LD, H1, intro, link set)');
console.log(out.join('\n'));
process.exit(broken ? 1 : 0);
