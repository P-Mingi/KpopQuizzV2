/**
 * SEO Mission 3, part B - the NIGHTLY PRODUCTION CRAWL.
 *
 * The other SEO gates grade a CI build. This one grades what Google, Bing and the AI
 * assistants actually receive: production, read-only, with plain GET requests, politely
 * (2 workers, a pause between requests, robots.txt respected, no cookies, no login).
 *
 *   npm run check:prod-seo                         # every sitemap URL (the nightly)
 *   npm run check:prod-seo -- --limit 30 --discover 15   # a quick local sample
 *
 * It fails (exit 1) on any of, per the rulebook (.claude/skills/kpopquiz-seo/SKILL.md):
 *   counts        a count in the title, description, body, FAQ or JSON-LD that differs from
 *                 the stats function (section 4; logic in src/lib/seo/prod-crawl-counts.ts)
 *   title         over 60 characters with the " | KpopQuiz" suffix (2.2)
 *   description   outside 120 to 160 characters, missing, or shared by two URLs (2.3)
 *   h1            zero or several H1 (2.4)
 *   img-alt       an <img> without an alt attribute (6.5)
 *   dash          an em or en dash in visible text, title, description or alt (0)
 *   noindex       a noindex page outside the allowlist of section 9.2
 *   redirect      a chain, a loop, or a dump on a generic page instead of the exact
 *                 successor, on internal links and on the legacy URLs the code answers (9.4)
 *   jsonld        JSON-LD that does not parse, or whose FAQ, breadcrumb, headline, names or
 *                 description numbers are not on the page (7)
 *   sitemap       a sitemap URL that is not 200, indexable and self-canonical (9.6)
 *   host          a second host (www) serving the site instead of redirecting (9.5)
 *   flags         production not running NEXT_PUBLIC_UX_V1=1 / NEXT_PUBLIC_UX_V12=1
 *
 * WHERE THE EXPECTED COUNTS COME FROM. The crawler calls readPublicStats() itself, the same
 * function production pages call, with the same anon key (createPublicReadClient) and the
 * same SONGS_IS_CURATED switch. That is the stats function, not a copy of it, so the two
 * cannot drift; and it is a fresh read, so a stale page cache is caught instead of being
 * agreed with. No production endpoint is needed: none exposes these counts today
 * (/api/stats/live is a different 60 second count), adding one would ship a new public
 * route only to serve the same numbers, and robots.txt disallows /api/ anyway.
 *
 * Env (CI sets them; locally .env.local is read when present):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY   read-only anon access
 *   SONGS_IS_CURATED   must equal production's value, or the song counts differ
 *
 * Flags: --base URL (default https://kpopquiz.org, the sitemap and canonical host)
 *        --limit N  --discover N (default 150)  --concurrency N (2)  --delay-ms N (750)
 *        --lag-hours N (48)  --out report.json  --alias-hosts www.kpopquiz.org
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

import { readPublicStats, type PublicStats } from '../src/lib/stats/site-stats.ts';
import {
  REDIRECT_SEEDS, altTexts, ariaLabels, classifyRedirect, countH1, dashSnippets, descriptionProblem,
  duplicates, extractCanonical, extractMetaDescription, extractMetaRobots, extractTitle, imagesWithoutAlt,
  internalLinks, isDisallowed, isNoindex, jsonLdDescriptions, jsonLdMismatches, jsonLdStrings,
  jsonLdVisibleClaims, noindexVerdict, parseJsonLd, robotsDisallows, sameUrl, samplePaths, sitemapLocs,
  titleProblem, visibleText, type Hop,
} from '../src/lib/seo/prod-crawl.ts';
import { extractCountClaims, judgeClaim, numbersMissingFrom, type Allowance } from '../src/lib/seo/prod-crawl-counts.ts';

// ---- args and env --------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const num = (name: string, dflt: number): number => {
  const v = flag(name);
  const n = v === undefined ? dflt : Number(v);
  if (!Number.isFinite(n) || n < 0) { console.error(`--${name} must be a number >= 0`); process.exit(2); }
  return n;
};

const BASE = (flag('base') ?? process.env.SEO_CRAWL_BASE ?? 'https://kpopquiz.org').replace(/\/+$/, '');
const ORIGIN = new URL(BASE).origin;
const LIMIT = flag('limit') === undefined ? Number.POSITIVE_INFINITY : num('limit', 0);
const DISCOVER = num('discover', 150);
const CONCURRENCY = Math.max(1, Math.min(4, num('concurrency', 2)));
const DELAY_MS = num('delay-ms', 750);
const LAG_HOURS = num('lag-hours', 48);
const OUT = flag('out');
const ALIAS_HOSTS = (flag('alias-hosts') ?? 'www.kpopquiz.org').split(',').map((s) => s.trim()).filter(Boolean);
// A generic browser user agent: no name, no contact, nothing personal (rules file).
const UA = 'Mozilla/5.0';
const TIMEOUT_MS = 30000;

try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const i = line.indexOf('=');
    if (i <= 0 || line.trimStart().startsWith('#')) continue;
    const k = line.slice(0, i).trim();
    if (process.env[k] === undefined) process.env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
} catch {
  // CI: no .env.local; the workflow provides the variables.
}

// ---- polite fetching ---------------------------------------------------------------------------

interface Res { url: string; status: number; location: string | null; xRobots: string; cache: string; type: string; body: string }

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
let requests = 0;

async function get(url: string, attempt = 0): Promise<Res | null> {
  requests++;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const res = await fetch(url, { redirect: 'manual', signal: ctrl.signal, headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' } });
    clearTimeout(t);
    const type = res.headers.get('content-type') ?? '';
    const body = /html|xml|text\/plain/.test(type) ? await res.text() : (await res.arrayBuffer(), '');
    if ((res.status === 429 || res.status >= 500) && attempt === 0) {
      const wait = Math.min(30, Number(res.headers.get('retry-after')) || 5) * 1000;
      await sleep(wait);
      return get(url, 1);
    }
    const loc = res.headers.get('location');
    return {
      url, status: res.status, location: loc ? new URL(loc, url).href : null,
      xRobots: res.headers.get('x-robots-tag') ?? '', cache: res.headers.get('x-vercel-cache') ?? '', type, body,
    };
  } catch {
    if (attempt === 0) { await sleep(5000); return get(url, 1); }
    return null;
  }
}

/** Bounded workers with a pause after every request, so production never feels the crawl. */
async function mapPolite<T, R>(items: readonly T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]!);
      await sleep(DELAY_MS);
    }
  }));
  return out;
}

/** Follow redirects by hand (each hop is one request), at most 5. */
async function walk(url: string): Promise<{ hops: Hop[]; last: Res | null }> {
  const hops: Hop[] = [];
  let current = url;
  let last: Res | null = null;
  for (let i = 0; i < 6; i++) {
    last = await get(current);
    if (!last) break;
    hops.push({ url: current, status: last.status, location: last.location });
    const next = last.status >= 300 && last.status < 400 ? last.location : null;
    if (!next) break;
    // A repeated URL is a loop: record it once so classifyRedirect() names it, then stop.
    if (hops.some((h) => h.url === next)) { hops.push({ url: next, status: 0, location: null }); break; }
    current = next;
    await sleep(DELAY_MS);
  }
  return { hops, last };
}

// ---- findings ------------------------------------------------------------------------------------

type Rule = 'counts' | 'title' | 'description' | 'h1' | 'img-alt' | 'dash' | 'noindex' | 'redirect' | 'jsonld' | 'sitemap' | 'host' | 'flags' | 'stats';
interface Finding { rule: Rule; url: string; message: string }
const failures: Finding[] = [];
const warnings: Finding[] = [];
const notes: string[] = [];
const fail = (rule: Rule, url: string, message: string): void => { failures.push({ rule, url, message }); };
const warn = (rule: Rule, url: string, message: string): void => { warnings.push({ rule, url, message }); };
const short = (u: string): string => (u.startsWith(ORIGIN) ? u.slice(ORIGIN.length) || '/' : u);

// ---- the database side: stats, lag allowance, empty hubs --------------------------------------------

let stats: PublicStats | null = null;
const allowance: Allowance = {};
const sb = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  : null;

async function readStats(): Promise<void> {
  if (!sb) { fail('stats', '-', 'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set, so no count can be graded'); return; }
  try {
    stats = await readPublicStats();
    const since = new Date(Date.now() - LAG_HOURS * 3600e3).toISOString();
    const recent = (table: string) => sb!.from(table).select('id', { count: 'exact', head: true }).gte('created_at', since);
    const results = await Promise.all([
      recent('plays'),
      recent('quizzes').eq('status', 'published'),
      recent('songs').eq('status', 'active'),
      recent('groups'),
    ]);
    for (const r of results) if (r.error) throw new Error(r.error.message);
    const [plays, quizzes, songs, groups] = results.map((r) => r.count ?? 0) as [number, number, number, number];
    Object.assign(allowance, {
      plays, quizzes, songs, groupsListed: groups,
      groupsWithQuizzes: await groupsFirstReached('quizzes', 'published', since, quizzes),
      songGroups: await groupsFirstReached('songs', 'active', since, songs),
    });
  } catch (e) {
    stats = null;
    fail('stats', '-', `the stats function could not be read (${(e as Error).message}), so no count can be graded`);
  }
}

/**
 * Groups that got their FIRST row of `table` inside the lag window: only those can make a
 * page's group count trail the fresh read. Falls back to the row count (an upper bound) when
 * the window holds 1000 rows or more, past the PostgREST page.
 */
async function groupsFirstReached(table: 'quizzes' | 'songs', status: string, since: string, rowsInWindow: number): Promise<number> {
  if (rowsInWindow === 0) return 0;
  const recent = await sb!.from(table).select('group_id').eq('status', status).gte('created_at', since).not('group_id', 'is', null).limit(1000);
  if (recent.error) throw new Error(`${table}: ${recent.error.message}`);
  const rows = (recent.data ?? []) as Array<{ group_id: number }>;
  if (rows.length >= 1000) return rowsInWindow;
  let first = 0;
  for (const gid of new Set(rows.map((r) => r.group_id))) {
    const older = await sb!.from(table).select('id', { count: 'exact', head: true }).eq('status', status).eq('group_id', gid).lt('created_at', since);
    if (older.error) throw new Error(`${table}: ${older.error.message}`);
    if ((older.count ?? 0) === 0) first++;
  }
  return first;
}

/** A noindexed hub is allowed only when it is empty (rulebook 9.2), which only the data can tell. */
async function hubIsEmpty(kind: 'quiz' | 'blindtest', slug: string): Promise<boolean | null> {
  if (!sb) return null;
  const g = await sb.from('groups').select('id').eq('slug', slug).maybeSingle();
  if (g.error || !g.data) return null;
  const id = (g.data as { id: number }).id;
  const r = kind === 'quiz'
    ? await sb.from('quizzes').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('group_id', id)
    : await sb.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'active').eq('group_id', id);
  return r.error ? null : (r.count ?? 0) === 0;
}

// ---- the page checks -------------------------------------------------------------------------------

const descriptionByUrl = new Map<string, string>();
const linkCounts = new Map<string, number>();

/** Content checks of one 200 HTML page. Returns the findings without recording them. */
function pageFindings(url: string, res: Res, inSitemap: boolean): { findings: Finding[]; indexable: boolean; description: string; canonical: string } {
  const html = res.body;
  const out: Finding[] = [];
  const add = (rule: Rule, message: string): void => { out.push({ rule, url, message }); };
  const robots = extractMetaRobots(html);
  const indexable = !isNoindex(robots, res.xRobots);
  const canonical = extractCanonical(html);
  const title = extractTitle(html);
  const description = extractMetaDescription(html);
  const text = visibleText(html);
  const alts = altTexts(html);

  if (inSitemap) {
    if (!indexable) add('sitemap', `in the sitemap but noindex (${res.xRobots && /noindex|none/i.test(res.xRobots) ? 'X-Robots-Tag' : `meta robots "${robots}"`})`);
    if (!canonical) add('sitemap', 'in the sitemap but has no canonical');
    else if (!sameUrl(canonical, url)) add('sitemap', `in the sitemap but canonical points to ${canonical}`);
  }

  // Always: dashes and alt (UI copy rules hold on every page, indexable or not).
  for (const d of dashSnippets(text)) add('dash', `visible text: ${d}`);
  for (const d of dashSnippets(title)) add('dash', `title: ${d}`);
  for (const d of dashSnippets(description)) add('dash', `meta description: ${d}`);
  for (const a of alts) for (const d of dashSnippets(a)) add('dash', `alt: ${d}`);
  for (const src of imagesWithoutAlt(html)) add('img-alt', `<img> without alt: ${src.slice(0, 100)}`);

  if (indexable) {
    const t = titleProblem(title);
    if (t) add('title', t);
    const d = descriptionProblem(description);
    if (d) add('description', d);
    const h1 = countH1(html);
    if (h1 !== 1) add('h1', `${h1} H1 elements (exactly one expected)`);

    const ld = parseJsonLd(html);
    for (const e of ld.errors) add('jsonld', e);
    const corpus = [text, ...ariaLabels(html), ...alts].join(' \n ');
    // One line per kind and page: a template that names 27 list items differently from the
    // page is one fix, so it reads as one finding with examples, not 27.
    const byWhere = new Map<string, string[]>();
    for (const c of jsonLdMismatches(jsonLdVisibleClaims(ld.nodes), corpus)) byWhere.set(c.where, [...(byWhere.get(c.where) ?? []), c.text]);
    for (const [where, texts] of byWhere) {
      if (texts.length <= 3) for (const t of texts) add('jsonld', `${where} not on the page: "${t.slice(0, 140)}"`);
      else add('jsonld', `${texts.length} ${where} values not on the page, e.g. ${texts.slice(0, 3).map((t) => `"${t.slice(0, 60)}"`).join(', ')}`);
    }
    for (const desc of jsonLdDescriptions(ld.nodes)) {
      const missing = numbersMissingFrom(desc, text);
      if (missing.length) add('jsonld', `JSON-LD description states ${missing.join(', ')}, not shown on the page: "${desc.slice(0, 140)}"`);
    }

    if (stats) {
      const seen = new Set<string>();
      for (const [where, s] of [['title', title], ['meta description', description], ['body', text], ['JSON-LD', jsonLdStrings(ld.nodes)]] as const) {
        for (const claim of extractCountClaims(s)) {
          const v = judgeClaim(claim, stats, allowance);
          if (v.ok || v.ignored) continue;
          const key = `${where}|${claim.raw}`;
          if (seen.has(key)) continue;
          seen.add(key);
          add('counts', `${where}: ${v.reason}`);
        }
      }
    }
  }
  return { findings: out, indexable, description, canonical };
}

/** The noindex allowlist check of one non-sitemap page (rulebook 9.2). */
async function gradeNoindex(url: string): Promise<void> {
  const x = new URL(url);
  const v = noindexVerdict(x.pathname.replace(/\/+$/, '') || '/', x.search);
  if (v.allowed) return;
  const empty = v.hub ? await hubIsEmpty(v.hub.kind, v.hub.slug) : null;
  if (empty === true) return;
  const hub = v.hub ? ` and the ${v.hub.kind} hub is ${empty === false ? 'NOT empty' : 'not verifiable as empty'}` : '';
  fail('noindex', url, `noindex outside the rulebook allowlist (9.2)${hub}; make it indexable or add a written reason to DOCUMENTED_NOINDEX`);
}

/** Grade one fetched page; a STALE cache hit with findings is graded again once regenerated. */
async function gradePage(url: string, first: Res, inSitemap: boolean): Promise<void> {
  let res = first;
  if (res.status >= 300 && res.status < 400) {
    if (inSitemap) fail('sitemap', url, `in the sitemap but answers ${res.status} to ${res.location ? short(res.location) : '?'} (the sitemap lists final URLs only)`);
    return;
  }
  if (res.status !== 200) {
    if (inSitemap) fail('sitemap', url, `in the sitemap but answers HTTP ${res.status}`);
    else warn('redirect', url, `internal link to a page answering HTTP ${res.status}`);
    return;
  }
  if (!/html/.test(res.type)) return;

  let graded = pageFindings(url, res, inSitemap);
  if (graded.findings.length && res.cache === 'STALE') {
    await sleep(8000);
    const again = await get(url);
    if (again && again.status === 200) {
      res = again;
      graded = pageFindings(url, res, inSitemap);
      notes.push(`${short(url)} was a STALE cache hit with findings; graded again after regeneration`);
    }
  }
  failures.push(...graded.findings);
  if (graded.indexable) descriptionByUrl.set(url, graded.description);
  if (!inSitemap) {
    if (!graded.indexable) await gradeNoindex(url);
    else if (sameUrl(graded.canonical || url, url)) warn('sitemap', url, 'indexable and self-canonical, but not in the sitemap');
  }
  for (const l of internalLinks(res.body, ORIGIN)) linkCounts.set(l, (linkCounts.get(l) ?? 0) + 1);
}

async function crawlSitemapUrl(url: string): Promise<void> {
  const res = await get(url);
  if (!res) { fail('sitemap', url, 'no response (timeout or network error, after one retry)'); return; }
  await gradePage(url, res, true);
}

// ---- main ------------------------------------------------------------------------------------------

const started = new Date();
console.log(`Production SEO crawl of ${BASE} (${UA}, ${CONCURRENCY} workers, ${DELAY_MS} ms pause, lag window ${LAG_HOURS} h)`);

const robotsRes = await get(`${ORIGIN}/robots.txt`);
const disallows = robotsRes?.status === 200 ? robotsDisallows(robotsRes.body) : [];

const smRes = await get(`${ORIGIN}/sitemap.xml`);
if (!smRes || smRes.status !== 200) {
  console.error(`Could not read ${ORIGIN}/sitemap.xml (HTTP ${smRes?.status ?? 'no response'}). Nothing was graded.`);
  process.exit(2);
}
let locs = sitemapLocs(smRes.body);
if (/<sitemapindex\b/i.test(smRes.body)) {
  const children = locs;
  locs = [];
  for (const child of children) {
    const c = await get(child);
    if (c?.status === 200) locs.push(...sitemapLocs(c.body));
    else fail('sitemap', child, `sitemap index child answers HTTP ${c?.status ?? 'no response'}`);
  }
}
for (const l of locs) if (!l.startsWith(`${ORIGIN}/`) && l !== ORIGIN) fail('sitemap', l, `sitemap URL is not on the canonical host ${ORIGIN}`);
const sitemapUrls = [...new Set(locs.filter((l) => l === ORIGIN || l.startsWith(`${ORIGIN}/`)).map((l) => l.replace(/\/+$/, '') || ORIGIN))];
const pathOf = (u: string): string => new URL(u).pathname.replace(/\/+$/, '') || '/';
const sitemapPathSet = new Set(sitemapUrls.map(pathOf));
const chosen = samplePaths(sitemapUrls.map(pathOf), LIMIT).map((p) => (p === '/' ? ORIGIN : `${ORIGIN}${p}`));
const complete = chosen.length === sitemapUrls.length;

await readStats();
if (stats) {
  const s = stats as PublicStats;
  console.log(`Stats function (fresh read, SONGS_IS_CURATED=${process.env.SONGS_IS_CURATED ?? 'unset'}): quizzes ${s.quizzes}, groupsWithQuizzes ${s.groupsWithQuizzes}, groupsListed ${s.groupsListed}, songs ${s.songs}, songGroups ${s.songGroups}, plays ${s.plays}`);
  console.log(`Lag allowance (rows added in ${LAG_HOURS} h): ${JSON.stringify(allowance)}`);
}

console.log(`Sitemap: ${sitemapUrls.length} URLs; grading ${complete ? 'ALL of them' : `a SAMPLE of ${chosen.length} (one per template, then spread)`}.`);
await mapPolite(chosen, crawlSitemapUrl);

// Flags: the flags-on build links the v1 stylesheet from every page (app/layout.tsx).
const home = await get(ORIGIN);
if (!home || !home.body.includes('/api/ux-v1/a0/styles')) fail('flags', ORIGIN, 'the home page does not load the NEXT_PUBLIC_UX_V1 stylesheet: production is not the flags-on site this crawl expects');

// Discovery: internal links that are not sitemap URLs (noindex pages, redirects, missing pages).
const discovered = [...linkCounts.entries()]
  .filter(([u]) => { const x = new URL(u); return !x.search && !sitemapPathSet.has(pathOf(u)) && !isDisallowed(x.pathname, disallows); })
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, DISCOVER)
  .map(([u]) => u);
console.log(`Discovery: ${linkCounts.size} distinct internal links seen; following ${discovered.length} that are not in the sitemap.`);
await mapPolite(discovered, async (u) => {
  const { hops, last } = await walk(u);
  if (hops.length > 1 || (last && last.status >= 300 && last.status < 400)) {
    const v = classifyRedirect(hops);
    const trail = hops.map((h) => `${short(h.url)} (${h.status})`).join(' -> ');
    if (v.kind === 'chain') fail('redirect', u, `internal link starts a redirect chain of ${v.hops} hops: ${trail}`);
    else if (v.kind === 'generic') fail('redirect', u, `internal link redirects to a generic page instead of an exact successor: ${trail}`);
    else if (v.kind === 'loop' || v.kind === 'unfinished') fail('redirect', u, `redirect ${v.kind}: ${trail}`);
    else warn('redirect', u, `internal link points at a redirect; link the target directly: ${trail}`);
    return;
  }
  if (last) await gradePage(u, last, false);
  else fail('redirect', u, 'no response');
});

// Legacy URLs the code answers: each must be one hop to its exact successor, or a 410/404.
console.log(`Legacy URLs: checking ${REDIRECT_SEEDS.length} answers the code defines.`);
await mapPolite(REDIRECT_SEEDS, async (seed) => {
  const url = `${ORIGIN}${seed.path}`;
  const { hops, last } = await walk(url);
  const trail = hops.map((h) => `${short(h.url)} (${h.status})`).join(' -> ') || 'no response';
  const first = hops[0];
  if (!first) { fail('redirect', url, `no response (${seed.why})`); return; }
  if (seed.status) {
    if (first.status !== seed.status) fail(seed.flagsProbe ? 'flags' : 'redirect', url, `expected HTTP ${seed.status} (${seed.why}), got ${trail}`);
    return;
  }
  const v = classifyRedirect(hops);
  if (seed.probe) {
    if (v.kind === 'chain' || v.kind === 'generic' || v.kind === 'loop' || v.kind === 'unfinished') fail('redirect', url, `${v.kind === 'generic' ? 'dumped on a generic page instead of an exact successor or a 410' : `redirect ${v.kind}`} (${seed.why}): ${trail}`);
    return;
  }
  if (v.kind !== 'ok') { fail('redirect', url, `expected one permanent redirect to ${seed.to} (${seed.why}), got ${v.kind}: ${trail}`); return; }
  const got = new URL(v.to);
  if (`${got.pathname}${got.search}` !== seed.to) fail('redirect', url, `redirects to ${short(v.to)}, not the exact successor ${seed.to} (${seed.why})`);
  else if (first.status !== 301 && first.status !== 308) fail('redirect', url, `temporary ${first.status} to ${seed.to}; a removed URL needs a permanent 301/308 (${seed.why})`);
  else if (last && last.status !== 200) fail('redirect', url, `the successor ${seed.to} answers HTTP ${last.status} (${seed.why})`);
});

// Second hosts: www (and any --alias-hosts) must redirect to the canonical host, path kept.
for (const host of ALIAS_HOSTS) {
  for (const p of ['/', '/bts-quiz']) {
    const url = `https://${host}${p}`;
    const r = await get(url);
    await sleep(DELAY_MS);
    if (!r) { warn('host', url, 'no response'); continue; }
    const expected = `${ORIGIN}${p === '/' ? '' : p}`;
    if (r.status === 200) fail('host', url, `serves the site itself (HTTP 200) instead of a 308 to ${expected}: two hosts, one site`);
    else if (r.status >= 300 && r.status < 400 && r.location && !sameUrl(r.location, expected)) fail('host', url, `redirects to ${r.location}, not ${expected}`);
  }
}

// Descriptions shared by two URLs (graded across every page this run saw).
for (const [value, urls] of duplicates(descriptionByUrl)) {
  fail('description', urls[0]!, `meta description shared by ${urls.length} URLs (${urls.map(short).join(', ')}): "${value.slice(0, 120)}"`);
}

// ---- report ------------------------------------------------------------------------------------------

const ORDER: Rule[] = ['flags', 'stats', 'sitemap', 'counts', 'title', 'description', 'h1', 'img-alt', 'dash', 'noindex', 'redirect', 'jsonld', 'host'];
const finished = new Date();
console.log(`\nCoverage: ${complete ? 'COMPLETE' : 'SAMPLE'} - ${chosen.length} of ${sitemapUrls.length} sitemap URLs, ${discovered.length} discovered links, ${REDIRECT_SEEDS.length} legacy URLs, ${ALIAS_HOSTS.length} alias host(s); ${requests} requests in ${Math.round((finished.getTime() - started.getTime()) / 1000)} s.`);
if (!complete) console.log('A SAMPLE run proves the checks run; only the complete nightly run covers every URL (and every duplicate description).');
for (const n of notes) console.log(`  note: ${n}`);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}, not failing):`);
  for (const w of warnings) console.log(`  ! [${w.rule}] ${short(w.url)}: ${w.message}`);
}

const byRule = new Map<Rule, Finding[]>();
for (const f of failures) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
if (failures.length) {
  console.log(`\nFAILED: ${failures.length} finding(s) - ${ORDER.filter((r) => byRule.has(r)).map((r) => `${r} ${byRule.get(r)!.length}`).join(', ')}`);
  for (const r of ORDER) {
    const list = byRule.get(r);
    if (!list) continue;
    console.log(`\n[${r}] ${list.length}`);
    for (const f of list) console.log(`  x ${short(f.url)}: ${f.message}`);
  }
} else {
  console.log('\nPASSED: every graded page meets the rulebook checks.');
}

if (OUT) {
  writeFileSync(OUT, `${JSON.stringify({
    base: BASE, startedAt: started.toISOString(), finishedAt: finished.toISOString(), complete,
    graded: chosen.length, sitemapUrls: sitemapUrls.length, discovered: discovered.length, requests,
    stats, allowance, failures, warnings, notes,
  }, null, 2)}\n`);
  console.log(`\nReport written to ${OUT}.`);
}
process.exit(failures.length ? 1 : 0);
