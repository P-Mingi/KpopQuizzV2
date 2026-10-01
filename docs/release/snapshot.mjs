#!/usr/bin/env node
// R1 release: read-only snapshot of what visitors and crawlers get on 40 URLs.
//
//   node docs/release/snapshot.mjs --base https://kpopquiz.org --out docs/release/snapshots/before.json
//   node docs/release/snapshot.mjs --compare a.json b.json
//
// Per page: status, redirect target, title, meta description, canonical, hreflang,
// robots, H1, parsed JSON-LD and the set of internal links. sitemap.xml: the sorted
// list of URLs (lastmod left out: it follows quiz updated_at, which moves with every
// play). robots.txt: the body. GET only, one request at a time, no cookies.

import { readFileSync, writeFileSync } from 'node:fs';

export const URLS = [
  '/', '/quizzes', '/groups',
  '/bts-quiz', '/blackpink-quiz', '/stray-kids-quiz', '/seventeen-quiz', '/cortis-quiz', '/red-velvet-quiz',
  '/q/are-you-a-real-coer', '/q/are-you-a-real-eyekon', '/q/illit-fans-here', '/q/babymonster-quiz',
  '/q/le-sserafim-members-and-music-quiz', '/q/enhypen-guess-the-mv-from-the-screenshot',
  '/blindtest',
  '/blindtest/classic', '/blindtest/intro-challenge', '/blindtest/girl-groups', '/blindtest/4th-gen',
  '/blindtest/title-tracks',
  '/leaderboard', '/pt', '/pt/leaderboard', '/new', '/most-liked', '/stats',
  '/articles', '/articles/who-is-cortis', '/faq',
  '/sitemap.xml', '/robots.txt', '/u/testtest',
  '/trending', '/bts-trivia', '/easy-kpop-quizzes', '/about', '/news', '/create', '/pt/blindtest',
];

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attrs = (tag) => {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g)) out[m[1].toLowerCase()] = decode(m[2]);
  return out;
};

function parseHtml(html, origin) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/g)].map((m) => attrs(m[0]));
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => attrs(m[0]));
  const meta = (k) => metas.find((a) => a.name === k || a.property === k)?.content ?? null;
  const jsonLd = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => {
    try { return JSON.parse(m[1]); } catch { return { __unparsed: m[1].slice(0, 200) }; }
  });
  const hrefs = new Set();
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    let h = decode(m[1]);
    if (h.startsWith(origin)) h = h.slice(origin.length) || '/';
    if (h.startsWith('/') && !h.startsWith('//')) hrefs.add(h.split('#')[0] || '/');
  }
  return {
    title: (html.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] ? decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/)[1]) : null,
    description: meta('description'),
    robots: meta('robots'),
    canonical: links.find((l) => l.rel === 'canonical')?.href ?? null,
    hreflang: links.filter((l) => l.rel === 'alternate' && l.hreflang).map((l) => `${l.hreflang} ${l.href}`).sort(),
    ogTitle: meta('og:title'),
    ogUrl: meta('og:url'),
    h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => text(m[1])),
    jsonLd,
    links: [...hrefs].sort(),
  };
}

async function snapshot(base, out) {
  const origin = 'https://kpopquiz.org';
  const pages = {};
  for (const path of URLS) {
    let entry;
    try {
      const res = await fetch(base + path, { redirect: 'manual', headers: { 'user-agent': 'kpopquiz-r1-snapshot/1.0' } });
      const body = await res.text();
      entry = { status: res.status, location: res.headers.get('location'), xRobots: res.headers.get('x-robots-tag') };
      if (path === '/sitemap.xml') {
        const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();
        entry.urlCount = locs.length;
        entry.urls = locs;
        entry.alternates = [...body.matchAll(/<xhtml:link\b[^>]*>/g)].length;
      } else if (path === '/robots.txt') {
        entry.body = body;
      } else if (res.status === 200) {
        Object.assign(entry, parseHtml(body, origin));
      }
    } catch (e) {
      entry = { error: String(e) };
    }
    pages[path] = entry;
    process.stderr.write(`${entry.status ?? 'ERR'} ${path}\n`);
  }
  writeFileSync(out, JSON.stringify({ base, takenAt: new Date().toISOString(), pages }, null, 1) + '\n');
}

function compare(aFile, bFile) {
  const a = JSON.parse(readFileSync(aFile, 'utf8')).pages;
  const b = JSON.parse(readFileSync(bFile, 'utf8')).pages;
  let diffs = 0;
  const show = (v) => { const s = JSON.stringify(v); return s && s.length > 160 ? s.slice(0, 160) + '...' : s; };
  for (const path of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[path] ?? {}, y = b[path] ?? {};
    for (const key of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (JSON.stringify(x[key]) === JSON.stringify(y[key])) continue;
      diffs++;
      if (Array.isArray(x[key]) && Array.isArray(y[key]) && key !== 'jsonLd') {
        const xs = new Set(x[key].map((v) => JSON.stringify(v))), ys = new Set(y[key].map((v) => JSON.stringify(v)));
        const gone = [...xs].filter((v) => !ys.has(v)), added = [...ys].filter((v) => !xs.has(v));
        console.log(`${path} ${key}: -${gone.length} +${added.length}${gone.length ? ' gone ' + show(gone.slice(0, 6)) : ''}${added.length ? ' added ' + show(added.slice(0, 6)) : ''}`);
      } else {
        console.log(`${path} ${key}:\n  a ${show(x[key])}\n  b ${show(y[key])}`);
      }
    }
  }
  console.log(diffs === 0 ? 'identical' : `${diffs} field(s) differ`);
}

const argv = process.argv.slice(2);
if (argv[0] === '--compare') compare(argv[1], argv[2]);
else {
  const base = argv[argv.indexOf('--base') + 1], out = argv[argv.indexOf('--out') + 1];
  if (!argv.includes('--base') || !argv.includes('--out')) { console.error('usage: --base URL --out FILE | --compare A B'); process.exit(2); }
  await snapshot(base.replace(/\/$/, ''), out);
}
