/**
 * O1 audit 03 P0-4 - the SEARCH CONSOLE TRIAGE (not a gate).
 *
 *   npx tsx scripts/seo-gsc-triage.mts --in docs/seo/gsc-2026-11-20 [--out DIR] [--guard FILE] [--dupes FILE]
 *                                      [--bing FILE] [--no-fetch] [--limit N]
 *
 * Input folder: one CSV per "Why pages aren't indexed" reason (the reason is in the file name), plus the
 * Performance export of Pages, 3 months (its header has Clicks and Impressions), plus optional Bing Site
 * Explorer exports (--bing, a URL per row). Logic: src/lib/seo/gsc-triage.ts (decision rules, unit tested).
 *
 * It reads the public site politely (2 workers, 500 ms between requests, robots.txt respected, no redirect
 * followed by fetch, a manual walk of at most 5 hops, one generic User-Agent, no cookie, no login) and writes
 * ONLY triage.csv and triage.md into the output folder (default <in>/triage). Nothing else is written anywhere.
 *
 * --guard FILE  the linked-URL guard list (rulebook 13.5): one URL or path per line, # comments allowed.
 * --dupes FILE  the clusters file of the duplicates audit (docs/seo/strategy-2026-10-27/dupes.json).
 * --no-fetch    decide from the exports and the sitemap only (no page is fetched): used by the tests of the script.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { allSourcedTriviaFiles } from '../src/lib/trivia/sourced/store.ts';
import {
  decide, mergeTargets, normalizeUrl, parsePerformanceExport, parseReasonExport, parseUrlList, pathOf, queryOf, templateOf,
  triageCsv, triageMarkdown, type PageFacts, type PerfRow, type TriageRow,
} from '../src/lib/seo/gsc-triage.ts';
import {
  extractCanonical, extractMetaRobots, isDisallowed, robotsDisallows, sitemapLocs, visibleText, parseJsonLd, type Hop,
} from '../src/lib/seo/prod-crawl.ts';

const argv = process.argv.slice(2);
const flag = (name: string): string | undefined => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const has = (name: string): boolean => argv.includes(`--${name}`);

const IN = flag('in');
if (!IN) { console.error('usage: seo-gsc-triage.mts --in <folder of exports> [--out DIR] [--guard FILE] [--dupes FILE] [--bing FILE] [--no-fetch] [--limit N]'); process.exit(2); }
const IN_DIR = resolve(IN);
const OUT_DIR = resolve(flag('out') ?? join(IN_DIR, 'triage'));
const ORIGIN = 'https://kpopquiz.org';
const UA = 'kpopquiz-seo-triage/1 (+https://kpopquiz.org)';
const WORKERS = 2;
const DELAY_MS = 500;
const NO_FETCH = has('no-fetch');
const LIMIT = Number(flag('limit') ?? '0');

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ---- read the exports -------------------------------------------------------------------------
const files = existsSync(IN_DIR) ? readdirSync(IN_DIR).filter((f) => f.toLowerCase().endsWith('.csv')).sort() : [];
if (files.length === 0) { console.error(`No CSV in ${IN_DIR}. Export the reasons and the Performance Pages report there first.`); process.exit(2); }

const reasonsByUrl = new Map<string, Set<string>>();
const perf = new Map<string, PerfRow>();
for (const f of files) {
  const text = readFileSync(join(IN_DIR, f), 'utf8');
  const head = (text.split(/\r?\n/, 1)[0] ?? '').toLowerCase();
  if (/\bclicks\b/.test(head) && /\bimpressions\b/.test(head)) {
    for (const r of parsePerformanceExport(text)) perf.set(r.url, r);
  } else {
    for (const r of parseReasonExport(f, text)) reasonsByUrl.set(r.url, (reasonsByUrl.get(r.url) ?? new Set()).add(r.reason));
  }
}
const bingFile = flag('bing');
if (bingFile) for (const u of parseUrlList(readFileSync(resolve(bingFile), 'utf8'))) if (!reasonsByUrl.has(u)) reasonsByUrl.set(u, new Set(['bing-site-explorer']));

const guardFile = flag('guard');
const guard = new Set<string>();
if (guardFile) {
  for (const line of readFileSync(resolve(guardFile), 'utf8').split(/\r?\n/)) {
    const t = line.replace(/#.*/, '').trim();
    if (!t) continue;
    const u = normalizeUrl(t.startsWith('/') ? `${ORIGIN}${t}` : t);
    if (u) guard.add(u);
  }
}
let merges = new Map<string, { overlap: number; target: string }>();
const dupesFile = flag('dupes');
if (dupesFile) {
  const j = JSON.parse(readFileSync(resolve(dupesFile), 'utf8')) as { sites?: { kpop?: { clusters?: never[] } } };
  merges = mergeTargets(j.sites?.kpop?.clusters ?? []);
}

const sourced = new Set(allSourcedTriviaFiles().map((f) => f.group));
let urls = [...reasonsByUrl.keys()].sort();
if (LIMIT > 0) urls = urls.slice(0, LIMIT);
console.log(`${files.length} export files, ${urls.length} URLs, ${perf.size} with performance rows, guard ${guard.size}, merge proposals ${merges.size}`);

// ---- fetch ------------------------------------------------------------------------------------
interface Got { status: number; headers: Headers; body: string }
async function get(url: string): Promise<Got | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { 'user-agent': UA } });
    clearTimeout(t);
    const body = res.status >= 300 && res.status < 400 ? '' : await res.text();
    return { status: res.status, headers: res.headers, body };
  } catch { return null; }
}

let disallows: string[] = [];
let sitemapPaths = new Set<string>();
if (!NO_FETCH) {
  const robots = await get(`${ORIGIN}/robots.txt`);
  if (robots?.status === 200) disallows = robotsDisallows(robots.body);
  await sleep(DELAY_MS);
}
{
  const sm = NO_FETCH ? null : await get(`${ORIGIN}/sitemap.xml`);
  if (sm?.status === 200) sitemapPaths = new Set(sitemapLocs(sm.body).map((l) => normalizeUrl(l) ?? l));
  else if (!NO_FETCH) console.warn('Could not read the sitemap: in_sitemap is false for every URL.');
}

function wordsInMain(html: string): number {
  const main = /<main\b[\s\S]*?<\/main>/i.exec(html)?.[0] ?? html;
  const t = visibleText(main);
  return t ? t.split(/\s+/).length : 0;
}

async function factsFor(url: string): Promise<PageFacts> {
  const perfRow = perf.get(url);
  const base: PageFacts = {
    url, reason: [...(reasonsByUrl.get(url) ?? [])].join('+'), template: templateOf(url, sourced), status: null, xRobotsTag: '',
    metaRobots: '', canonical: null, inSitemap: sitemapPaths.has(url), words: null, questions: null, plays: null,
    clicks: perfRow?.clicks ?? 0, impressions: perfRow?.impressions ?? 0, inbound: null, guarded: guard.has(url),
    duplicate: merges.get(url) ?? null,
  };
  if (NO_FETCH || isDisallowed(pathOf(url) + queryOf(url), disallows)) return base;

  const hops: Hop[] = [];
  let cur = url;
  let got: Got | null = null;
  for (let i = 0; i < 6; i++) {
    got = await get(cur);
    await sleep(DELAY_MS);
    if (!got) break;
    const loc = got.headers.get('location');
    hops.push({ url: cur, status: got.status, location: loc });
    if (got.status >= 300 && got.status < 400 && loc) { cur = new URL(loc, cur).href; continue; }
    break;
  }
  if (!got || hops.length === 0) return base;
  const first = hops[0]!;
  const f: PageFacts = { ...base, status: first.status, hops: first.status >= 300 && first.status < 400 ? hops : undefined };
  if (first.status === 200) {
    f.xRobotsTag = got.headers.get('x-robots-tag') ?? '';
    f.metaRobots = extractMetaRobots(got.body);
    const canon = extractCanonical(got.body);
    f.canonical = canon || null;
    f.words = wordsInMain(got.body);
    if (f.template === 'q') {
      for (const n of parseJsonLd(got.body).nodes) {
        if (typeof n.numberOfQuestions === 'number') f.questions = n.numberOfQuestions;
      }
    }
    if (canon) {
      const c = normalizeUrl(canon);
      if (c && c !== url) {
        const t = await get(c);
        await sleep(DELAY_MS);
        const tr = t ? extractMetaRobots(t.body) : '';
        f.canonicalTargetOk = !!t && t.status === 200 && !/noindex|none/i.test(`${tr} ${t.headers.get('x-robots-tag') ?? ''}`) && normalizeUrl(extractCanonical(t.body)) === c;
      }
    }
  }
  return f;
}

const rows: TriageRow[] = [];
let next = 0;
async function worker(): Promise<void> {
  while (next < urls.length) {
    const url = urls[next++]!;
    const f = await factsFor(url);
    rows.push({ ...f, ...decide(f) });
  }
}
await Promise.all(Array.from({ length: WORKERS }, () => worker()));
rows.sort((a, b) => a.url.localeCompare(b.url));

// ---- write: only inside the output folder ----------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, 'triage.csv'), triageCsv(rows));
writeFileSync(join(OUT_DIR, 'triage.md'), triageMarkdown(rows, new Date().toISOString().slice(0, 10)));
console.log(`Wrote ${join(OUT_DIR, 'triage.csv')} and triage.md (${rows.length} URLs).`);
