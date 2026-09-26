#!/usr/bin/env node
// P3 SEO diff, flag OFF (A) vs flag ON (B), GET only, as a guest (COMMON.md done-when
// 5 + the link-set rule of f054cd3). For every URL:
//   - HTTP status, <title>, meta description, robots, canonical, hreflang, og:* and
//     twitter:* metas, every JSON-LD block (parsed, key order normalised), H1 text;
//   - the SEO-locked texts of the page: the intro (hub: the paragraph under the H1;
//     /groups: the intro + generation line), the hub FAQ pairs (every flag-off
//     question and answer must be visible flag on), the W8 answer-first lead and
//     questions, the "Updated <month>" line, member photo alt texts, every dated
//     <time> (freshness: the newest-quizzes rows);
//   - the LINK SET: every <a href> of the served HTML (scripts off, so <noscript>
//     links count), A must be a subset of B. Lost links fail; additions are listed.
// Exit 1 on any difference that is not an addition.
//
//   UX11_CHROMIUM=... node seo-diff.mjs --a http://localhost:4332 --b http://localhost:3033 \
//     --out <dir> /groups /blackpink-quiz /ateez-quiz /chungha-quiz /blackpink-trivia

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.resolve(here, '../../../../../../apps/quiz/package.json'))('@playwright/test');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : d; };
const A = opt('--a', 'http://localhost:4332');
const B = opt('--b', 'http://localhost:3033');
const OUT = opt('--out', null);
const pages = args.length ? args : ['/groups'];

const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const attr = (tag, name) => { const m = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag); return m ? dec(m[1]) : null; };
const sortKeys = (v) => Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;

function head(html) {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const meta = (key, val) => metas.filter((t) => (attr(t, key) ?? '').toLowerCase() === val).map((t) => attr(t, 'content'));
  const links = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  return {
    title: (/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? null)?.trim() ?? null,
    description: meta('name', 'description')[0] ?? null,
    robots: meta('name', 'robots')[0] ?? null,
    canonical: links.filter((t) => (attr(t, 'rel') ?? '') === 'canonical').map((t) => attr(t, 'href'))[0] ?? null,
    hreflang: links.filter((t) => attr(t, 'hreflang')).map((t) => `${attr(t, 'hreflang')}=${attr(t, 'href')}`).sort(),
    og: metas.filter((t) => /^(og|twitter):/i.test(attr(t, 'property') ?? attr(t, 'name') ?? '')).map((t) => `${attr(t, 'property') ?? attr(t, 'name')}=${attr(t, 'content')}`).sort(),
    jsonld: [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => { try { return JSON.stringify(sortKeys(JSON.parse(m[1]))); } catch { return m[1]; } }).sort(),
  };
}

const browser = await chromium.launch(process.env.UX11_CHROMIUM ? { executablePath: process.env.UX11_CHROMIUM } : {});
const ctx = await browser.newContext({ javaScriptEnabled: false });

/** DOM facts of the SERVED HTML (scripts off: <noscript> content is parsed). */
async function dom(html) {
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  const out = await page.evaluate(() => {
    const t = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
    const all = (sel) => [...document.querySelectorAll(sel)];
    const h1 = all('h1').map(t);
    const hub = Boolean(document.querySelector('.p3-hub'));
    const v11Groups = Boolean(document.querySelector('.p3-groups'));
    // intro
    let intro = null;
    if (hub) intro = t(document.querySelector('.p3-lead'));
    else if (v11Groups) intro = t(document.querySelector('.ux-ph > p'));
    else if (document.querySelector('.gdir-intro')) intro = t(document.querySelector('.gdir-intro'));
    else { const h = document.querySelector('h1'); const p = h?.nextElementSibling; intro = p && p.tagName === 'P' ? t(p) : null; }
    const genline = t(document.querySelector('.p3-genline') ?? document.querySelector('.gdir-genline')) || null;
    // FAQ pairs (flag off: the <dl> of #group-faq; flag on: the <details>)
    const faq = hub
      ? all('.p3-acc').map((d) => [t(d.querySelector('summary')), t(d.querySelector('.p3-acc-a'))])
      : all('section[aria-labelledby="group-faq"] dl > div').map((d) => [t(d.querySelector('dt')), t(d.querySelector('dd'))]);
    // W8 answer-first
    const afLead = hub ? all('.p3-prose p').map(t) : [t(document.querySelector('.af-lead')), t(document.querySelector('.af-intro'))].filter(Boolean);
    const afPairs = hub ? [] : all('.af-item').map((d) => [t(d.querySelector('.af-q')), t(d.querySelector('.af-a'))]);
    const updated = t(document.querySelector('.p3-updated') ?? document.querySelector('.group-updated')) || null;
    const alts = all('img[alt]').map((i) => i.getAttribute('alt')).filter((a) => a && / of /.test(a)).sort();
    const hrefs = all('a[href]').map((a) => a.getAttribute('href'));
    // dated content (freshness): "Updated <month>" and the newest quizzes rows
    const times = all('time[datetime]').map((x) => `${x.getAttribute('datetime')} ${t(x)}`).sort();
    return { h1, intro, genline, faq, afLead, afPairs, updated, alts, hrefs, times };
  });
  await page.close();
  return out;
}

let failed = false;
const report = [];
const log = (s) => { report.push(s); process.stdout.write(`${s}\n`); };

for (const p of pages) {
  const ua = { 'user-agent': process.env.SEO_UA || 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' };
  const [ra, rb] = await Promise.all([fetch(A + p, { redirect: 'manual', headers: ua }), fetch(B + p, { redirect: 'manual', headers: ua })]);
  const [ha, hb] = await Promise.all([ra.text(), rb.text()]);
  const [a, b] = [{ ...head(ha), ...(await dom(ha)) }, { ...head(hb), ...(await dom(hb)) }];
  log(`\n== ${p}  (A flag off ${A}  |  B flag on ${B})`);
  const row = (k, x, y) => {
    const same = JSON.stringify(x) === JSON.stringify(y);
    if (!same) failed = true;
    log(`${same ? 'SAME' : 'DIFF'}  ${k}${same ? `  ${JSON.stringify(x).slice(0, 180)}` : `\n   A: ${JSON.stringify(x).slice(0, 600)}\n   B: ${JSON.stringify(y).slice(0, 600)}`}`);
  };
  row('status', ra.status, rb.status);
  for (const k of ['title', 'description', 'robots', 'canonical', 'hreflang', 'og', 'jsonld', 'h1', 'intro', 'genline', 'updated']) row(k, a[k], b[k]);

  // FAQ: every flag-off pair visible flag on, word for word. (A page that keeps
  // today's layout flag on, like -trivia, keeps its W8 block: its pairs count too.)
  const bFaq = new Map([...b.afPairs, ...b.faq].map(([q, ans]) => [q, ans]));
  const lostFaq = a.faq.filter(([q, ans]) => bFaq.get(q) !== ans);
  if (lostFaq.length) failed = true;
  log(`${lostFaq.length ? 'DIFF' : 'SAME'}  FAQ pairs: A ${a.faq.length}, B ${b.faq.length} (flag on shows the FAQ and the W8 questions as one list); flag-off pairs missing ${lostFaq.length}${lostFaq.length ? `: ${JSON.stringify(lostFaq)}` : ''}`);

  // W8 answer-first: the lead and the intro paragraphs, and every question (the
  // answer is either the same, or the FAQ answer of the same question: de-duplicated).
  const lostLead = a.afLead.filter((x) => !b.afLead.includes(x));
  const dedupe = [];
  const lostQ = a.afPairs.filter(([q, ans]) => {
    const got = bFaq.get(q);
    if (got === ans) return false;
    if (got !== undefined && a.faq.some(([fq]) => fq === q)) { dedupe.push([q, ans, got]); return false; }
    return true;
  });
  if (lostLead.length || lostQ.length) failed = true;
  log(`${lostLead.length || lostQ.length ? 'DIFF' : 'SAME'}  answer-first: lead ${a.afLead.length} kept ${a.afLead.length - lostLead.length}; questions ${a.afPairs.length}, lost ${lostQ.length}${lostQ.length ? `: ${JSON.stringify(lostQ)}` : ''}`);
  for (const [q, ans, got] of dedupe) log(`INFO  same question on the FAQ and the W8 block, shown once with the FAQ answer (JSON-LD): "${q}" W8 "${ans}" / FAQ "${got}"`);

  const lostAlt = a.alts.filter((x) => !b.alts.includes(x));
  if (lostAlt.length) failed = true;
  log(`${lostAlt.length ? 'DIFF' : 'SAME'}  member photo alt texts: A ${a.alts.length}, B ${b.alts.length}${lostAlt.length ? `; lost: ${lostAlt.join(' | ')}` : ''}`);

  const lostTimes = a.times.filter((x) => !b.times.includes(x));
  if (lostTimes.length) failed = true;
  log(`${lostTimes.length ? 'DIFF' : 'SAME'}  dated content (<time>): A ${a.times.length}, B ${b.times.length}${lostTimes.length ? `; lost: ${lostTimes.join(' | ')}` : ''}`);

  // LINK SET (every <a href>, whole served document).
  const sa = new Set(a.hrefs); const sb = new Set(b.hrefs);
  const lost = [...sa].filter((h) => !sb.has(h)).sort();
  const added = [...sb].filter((h) => !sa.has(h)).sort();
  if (lost.length) failed = true;
  log(`${lost.length ? 'DIFF' : 'SAME'}  link set: A ${sa.size} unique hrefs (${a.hrefs.length} anchors), B ${sb.size} unique hrefs (${b.hrefs.length} anchors); lost ${lost.length}${lost.length ? `: ${lost.join(' ')}` : ''}; added ${added.length}${added.length ? `: ${added.join(' ')}` : ''}`);
  if (OUT) {
    fs.mkdirSync(OUT, { recursive: true });
    const slug = p.replace(/^\//, '').replace(/\//g, '_') || 'home';
    fs.writeFileSync(path.join(OUT, `links-${slug}.txt`), `# ${p}\n# A (flag off) ${sa.size} unique\n${[...sa].sort().join('\n')}\n\n# B (flag on) ${sb.size} unique\n${[...sb].sort().join('\n')}\n`);
  }
}
await browser.close();
log(failed ? '\nSEO DIFF: differences found' : '\nSEO DIFF: empty (only additions, if any)');
if (OUT) fs.writeFileSync(path.join(OUT, 'seo-diff.txt'), `${report.join('\n')}\n`);
process.exit(failed ? 1 : 0);
