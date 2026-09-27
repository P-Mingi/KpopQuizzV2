#!/usr/bin/env node
// C3 SEO diff (v11 briefs/C3.md step 3). Read only (GET, no JS executed): the
// server HTML of every public URL type from three servers, back to back:
//   ON   = the shared flag-on production build of feat/ux-v1-v11 (ORCH, :3021)
//   OFF  = a flag-off production build of the same head (C3, :4203)
//   LIVE = https://kpopquiz.org (main)
// Compared: status + redirect, title, meta description, robots, canonical,
// hreflang, og:title/og:url, H1 (count + text), prose paragraphs and FAQ text of
// OFF present in ON, JSON-LD (parsed, per @type), and the LINK SET (every <a href>
// of OFF, and of LIVE, present in ON). Plus robots.txt and the sitemap(s): ON vs OFF.
//
//   node seo-diff.mjs --on http://localhost:3021 --off http://localhost:4203 \
//        --live https://kpopquiz.org --out <dir>
//
// Output: <dir>/seo-diff.json (every field of every page), <dir>/seo-summary.md.

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ON = opt('--on', 'http://localhost:3021');
const OFF = opt('--off', 'http://localhost:4203');
const LIVE = opt('--live', 'https://kpopquiz.org');
const OUT = opt('--out', '.');
const ONLY = opt('--only', null);

export const PAGES = [
  '/', '/pt', '/quizzes', '/quizzes?page=2', '/quizzes?group=bts',
  '/q/ultimate-bts-era-quiz-only-real-armys-survive', '/q/skz-true-or-false-only-real-stays-pass', '/q/real-coers-cortis-fans-can-take-this-quiz',
  '/blackpink-quiz', '/ateez-quiz', '/chungha-quiz', '/bts-trivia', '/groups',
  '/blindtest', '/blindtest/classic', '/blindtest/girl-groups', '/pt/blindtest', '/blindtest/ranked',
  '/leaderboard', '/pt/leaderboard', '/u/testtest', '/create', '/search',
  '/articles', '/articles/best-kpop-quiz-sites-2026', '/trending', '/new', '/most-liked', '/stats', '/data/pulse',
  '/community', '/community/thread/1', '/community/blog/2', '/community/debate/2026-09-22',
];

const UA = 'Mozilla/5.0 (compatible; ux11-c3-seo-diff; read-only)';

async function get(base, p) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(base + p, { redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,*/*' }, signal: AbortSignal.timeout(90_000) });
      return { status: r.status, location: r.headers.get('location'), xrobots: r.headers.get('x-robots-tag'), body: await r.text() };
    } catch (e) {
      if (attempt === 3) return { status: 0, location: null, xrobots: null, body: '', error: String(e) };
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;|&#160;/g, ' ');
const text = (h) => decode(h.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag); return m ? decode(m[1]) : null; };

/** The served document without scripts, styles, templates (what a crawler reads without JS). */
function visibleHtml(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ');
}

function normHref(h, base) {
  if (!h) return null;
  let v = decode(h).trim();
  if (/^(mailto:|tel:|javascript:|#)/i.test(v)) return v.startsWith('#') ? null : v;
  for (const origin of ['https://kpopquiz.org', 'https://www.kpopquiz.org', base]) {
    if (v.startsWith(origin + '/') || v === origin) v = v.slice(origin.length) || '/';
  }
  return v;
}

function extract(html, base) {
  const head = (/<head[^>]*>([\s\S]*?)<\/head>/i.exec(html) ?? [])[1] ?? html;
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key, val) => metas.filter((t) => (attr(t, key) ?? '').toLowerCase() === val).map((t) => attr(t, 'content'));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  const title = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map((m) => text(m[1]));
  const vis = visibleHtml(html);
  const h1 = [...vis.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => text(m[1]));
  const h2 = [...vis.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => text(m[1]));
  const paras = [...vis.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => text(m[1])).filter((t) => t.length >= 60);
  const summaries = [...vis.matchAll(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi)].map((m) => text(m[1])).filter((t) => t.length >= 12);
  const hrefs = [...vis.matchAll(/<a\b[^>]*\shref="([^"]*)"[^>]*>/gi)].map((m) => normHref(m[1], base)).filter(Boolean);
  const jsonld = [];
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { jsonld.push(JSON.parse(m[1])); } catch (e) { jsonld.push({ __parseError: String(e), raw: m[1].slice(0, 200) }); }
  }
  return {
    title,
    description: meta('name', 'description'),
    robots: meta('name', 'robots'),
    googlebot: meta('name', 'googlebot'),
    canonical: links.filter((t) => /rel="canonical"/i.test(t)).map((t) => normHref(attr(t, 'href'), base)),
    hreflang: links.filter((t) => /hreflang=/i.test(t)).map((t) => `${attr(t, 'hreflang')} ${normHref(attr(t, 'href'), base)}`).sort(),
    ogTitle: meta('property', 'og:title'),
    ogUrl: meta('property', 'og:url').map((u) => normHref(u, base)),
    h1, h2Count: h2.length, paras, summaries,
    hrefs: [...new Set(hrefs)].sort(),
    jsonld,
    headBytes: head.length,
    visibleTextBytes: text(vis).length,
  };
}

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}
function flattenLd(list) {
  const out = [];
  const walk = (n) => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n && typeof n === 'object') {
      if (n['@graph']) { walk(n['@graph']); return; }
      out.push(n);
    }
  };
  walk(list);
  return out;
}
const ldKey = (n) => `${[].concat(n['@type'] ?? '?').join('+')}`;
/** Replace live counters (play counts, ratings, dates of now) so a back-to-back fetch compares shape + fixed text. */
function ldStable(n) {
  return JSON.stringify(sortKeys(n))
    .replace(/"(interactionCount|userInteractionCount|ratingCount|reviewCount|ratingValue|commentCount|dateModified|numberOfItems|playCount|position)":\s*("[^"]*"|[0-9.]+)/g, '"$1":"<n>"');
}

function compare(a, b, label) {
  // a = reference (OFF or LIVE), b = ON
  const d = {};
  const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  if (a.status !== b.status || (a.location ?? null) !== (b.location ?? null)) d.status = { [label]: `${a.status} ${a.location ?? ''}`.trim(), on: `${b.status} ${b.location ?? ''}`.trim() };
  if (!a.x || !b.x) return d;
  for (const k of ['title', 'description', 'robots', 'googlebot', 'canonical', 'hreflang', 'ogTitle', 'ogUrl', 'h1']) {
    if (!eq(a.x[k], b.x[k])) d[k] = { [label]: a.x[k], on: b.x[k] };
  }
  if ((a.xrobots ?? null) !== (b.xrobots ?? null)) d.xRobotsTag = { [label]: a.xrobots, on: b.xrobots };
  const onText = text(visibleHtml(b.body));
  const lostParas = a.x.paras.filter((p) => !onText.includes(p));
  if (lostParas.length) d.lostProse = lostParas;
  const lostSummaries = a.x.summaries.filter((p) => !onText.includes(p));
  if (lostSummaries.length) d.lostSummaries = lostSummaries;
  const ldA = flattenLd(a.x.jsonld); const ldB = flattenLd(b.x.jsonld);
  const ka = ldA.map(ldKey).sort(); const kb = ldB.map(ldKey).sort();
  if (!eq(ka, kb)) d.jsonldTypes = { [label]: ka, on: kb };
  const sa = new Set(ldA.map(ldStable)); const sb = new Set(ldB.map(ldStable));
  const ldLost = [...sa].filter((s) => !sb.has(s)); const ldAdded = [...sb].filter((s) => !sa.has(s));
  if (ldLost.length || ldAdded.length) d.jsonld = { [`only_${label}`]: ldLost.map((s) => s.slice(0, 1500)), only_on: ldAdded.map((s) => s.slice(0, 1500)) };
  const setB = new Set(b.x.hrefs);
  const lost = a.x.hrefs.filter((h) => !setB.has(h));
  const setA = new Set(a.x.hrefs);
  const added = b.x.hrefs.filter((h) => !setA.has(h));
  d.links = { [label]: a.x.hrefs.length, on: b.x.hrefs.length, lost, addedCount: added.length, added: added.slice(0, 60) };
  if (!lost.length) delete d.links.lost;
  return d;
}

const pages = ONLY ? ONLY.split(',') : PAGES;
const rows = [];
for (const p of pages) {
  const [on, off, live] = await Promise.all([get(ON, p), get(OFF, p), get(LIVE, p)]);
  for (const [r, base] of [[on, ON], [off, OFF], [live, LIVE]]) {
    if (r.status === 200) r.x = extract(r.body, base);
  }
  const row = {
    page: p,
    status: { on: on.status, off: off.status, live: live.status },
    location: { on: on.location, off: off.location, live: live.location },
    on: on.x ? { title: on.x.title, description: on.x.description, robots: on.x.robots, canonical: on.x.canonical, hreflang: on.x.hreflang, h1: on.x.h1, jsonldTypes: flattenLd(on.x.jsonld).map(ldKey), links: on.x.hrefs.length, ssrTextBytes: on.x.visibleTextBytes } : null,
    onVsOff: compare(off, on, 'off'),
    onVsLive: compare(live, on, 'live'),
    offVsLive: compare(live, off, 'live'),
  };
  rows.push(row);
  process.stdout.write(`${p}  on ${on.status} off ${off.status}${off.location ? ' -> ' + off.location : ''} live ${live.status}  links on ${on.x?.hrefs.length ?? '-'} off ${off.x?.hrefs.length ?? '-'} live ${live.x?.hrefs.length ?? '-'}  lost(off->on) ${row.onVsOff.links?.lost?.length ?? 0} lost(live->on) ${row.onVsLive.links?.lost?.length ?? 0}  diffs ${Object.keys(row.onVsOff).filter((k) => k !== 'links').join(',') || '-'}\n`);
}

// robots.txt + sitemaps: ON vs OFF (new pages must stay out)
async function sitemapUrls(base) {
  const seen = new Set(); const urls = new Set(); const files = {};
  const queue = ['/sitemap.xml'];
  while (queue.length) {
    const p = queue.shift();
    if (seen.has(p)) continue; seen.add(p);
    const r = await get(base, p);
    files[p] = { status: r.status, bytes: r.body.length };
    for (const m of r.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = normHref(m[1].trim(), base);
      if (/<sitemapindex/i.test(r.body)) queue.push(u.startsWith('/') ? u : new URL(u).pathname); else urls.add(u);
    }
  }
  return { files, urls: [...urls].sort() };
}
const [robotsOn, robotsOff] = await Promise.all([get(ON, '/robots.txt'), get(OFF, '/robots.txt')]);
const [smOn, smOff] = await Promise.all([sitemapUrls(ON), sitemapUrls(OFF)]);
const smOffSet = new Set(smOff.urls); const smOnSet = new Set(smOn.urls);
const site = {
  robotsIdentical: robotsOn.body === robotsOff.body && robotsOn.status === robotsOff.status,
  robotsOn: robotsOn.body, robotsOff: robotsOff.body,
  sitemapFiles: { on: smOn.files, off: smOff.files },
  sitemapCount: { on: smOn.urls.length, off: smOff.urls.length },
  sitemapOnlyOn: smOn.urls.filter((u) => !smOffSet.has(u)),
  sitemapOnlyOff: smOff.urls.filter((u) => !smOnSet.has(u)),
  sitemapHasNewPages: smOn.urls.filter((u) => /^\/(community|blindtest\/ranked|ux-v1)/.test(u)),
};
process.stdout.write(`robots.txt identical on/off: ${site.robotsIdentical}; sitemap urls on ${site.sitemapCount.on} off ${site.sitemapCount.off}; only on ${site.sitemapOnlyOn.length}; only off ${site.sitemapOnlyOff.length}; new pages in sitemap: ${site.sitemapHasNewPages.length}\n`);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'seo-diff.json'), JSON.stringify({ at: new Date().toISOString(), servers: { ON, OFF, LIVE }, rows, site }, null, 1));
