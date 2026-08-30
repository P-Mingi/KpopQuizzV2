/**
 * SEO indexguard PART 1 - the sitemap x robots contradiction test.
 *
 * The recurring failure class: a page ends up in the sitemap (we tell Google
 * "index this") while the page itself emits robots noindex, or is missing a
 * <title> / self-canonical (we tell Google "do not / cannot index this"). The
 * 8-article noindex bug was exactly this - advertised in the sitemap, noindex on
 * the page. Nothing failed; the pages just silently never ranked. The inverse
 * also bites: a page that is indexable by design silently falls out of the
 * sitemap and stops being discovered.
 *
 * This resolves BOTH directions against the REAL rendered output (dynamic
 * metadata cannot be resolved statically), so it needs a running server - the
 * local dev/build server or a deployed one:
 *
 *   INDEXCHECK_BASE_URL=http://localhost:3021 pnpm --filter quiz check:indexability
 *
 * It is a smoke-style gate (server up), sibling to check:routes. Exit 1 on any
 * contradiction, with the URL + the contradiction named.
 */

import { readFileSync } from 'node:fs';

import { ARTICLES } from '../src/lib/articles/registry.ts';

const BASE = (process.env.INDEXCHECK_BASE_URL ?? 'http://localhost:3021').replace(/\/$/, '');
const SITE_URL = 'https://kpopquiz.org';
const FETCH_TIMEOUT_MS = 30000;

// Env for the inverse DB checks (a page indexable-by-design must be in the map).
// Prefer .env.local when it exists (local runs), fall back to the real process env.
// W7d: this used to REQUIRE the file, which made the gate impossible to run in CI at
// all, since .env.local is gitignored and never exists there. Falling back is not a
// stub: the same variables are read, just from wherever they actually live.
const env: Record<string, string | undefined> = (() => {
  try {
    return Object.fromEntries(
      readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
        .split('\n').filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; }),
    );
  } catch {
    return process.env;
  }
})();

const failures: string[] = [];

async function fetchText(url: string): Promise<{ status: number; html: string; xRobots: string } | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual' });
    clearTimeout(t);
    const html = await res.text();
    return { status: res.status, html, xRobots: res.headers.get('x-robots-tag') ?? '' };
  } catch (err) {
    return null;
  }
}

/** local path -> the fetchable URL on this server. */
const toLocal = (loc: string): string => loc.replace(SITE_URL, BASE);
const pathOf = (loc: string): string => { try { return new URL(loc).pathname.replace(/\/$/, '') || '/'; } catch { return loc; } };

/** Coarse route type so we sample ONE representative per shape (+ every article). */
function routeType(path: string): string {
  if (path === '/' || path === '') return 'home';
  if (/^\/articles\//.test(path)) return 'article';
  if (/^\/q\//.test(path)) return 'quiz';
  if (/^\/blindtest\/group-/.test(path)) return 'blindtest-group';
  if (/^\/blindtest\//.test(path)) return 'blindtest-mode';
  if (/^\/games\/sort-it\//.test(path)) return 'game-sort-it';
  if (/^\/games\/match-up\//.test(path)) return 'game-match-up';
  if (/^\/games\/name-them-all\//.test(path)) return 'game-name-them-all';
  if (/^\/games\/name-all\//.test(path)) return 'game-name-all';
  if (/^\/games\/this-or-that\//.test(path)) return 'game-this-or-that';
  if (/^\/games\//.test(path)) return 'game-static';
  if (/^\/rankings\//.test(path)) return 'ranking';
  if (/^\/data\/pulse\//.test(path)) return 'pulse';
  if (/^\/which-.+-are-you$/.test(path)) return 'personality';
  if (/^\/verse\/[^/]+\/members\//.test(path)) return 'verse-member';
  if (/^\/verse\/[^/]+\/albums\//.test(path)) return 'verse-album';
  if (/^\/verse\/[^/]+\/songs\//.test(path)) return 'verse-song';
  if (/^\/verse\/[^/]+\/(wiki|essays|photocards|collectibles)\//.test(path)) return 'verse-leaf';
  if (/^\/verse\/[^/]+\/[^/]+/.test(path)) return 'verse-tab';
  if (/^\/verse\/[^/]+$/.test(path)) return 'verse-space';
  if (/^\/verse/.test(path)) return 'verse-root';
  if (/-trivia$/.test(path)) return 'group-trivia';
  if (/-quiz$/.test(path)) return 'group-quiz';
  if (/^\/pt\//.test(path) || path === '/pt') return 'pt';
  return 'static';
}

// ---- 1. Pull the sitemap ----------------------------------------------------
const sm = await fetchText(`${BASE}/sitemap.xml`);
if (!sm || sm.status !== 200) {
  console.error(`\nIndexability guard FAILED: could not fetch ${BASE}/sitemap.xml (status ${sm?.status ?? 'no response'}).`);
  console.error(`Is the server running? Set INDEXCHECK_BASE_URL or start the dev server on :3021.\n`);
  process.exit(1);
}
const locs = [...sm.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.trim());
if (locs.length === 0) {
  console.error('\nIndexability guard FAILED: the sitemap has zero <loc> entries.\n');
  process.exit(1);
}
const sitemapPaths = new Set(locs.map(pathOf));

// ---- 2. Build the crawl set: COMPLETE by default ----------------------------
// W7c orphan-gate pattern: check EVERY sitemap URL by default. The old behaviour
// (one URL per route type + all articles, ~37 of 708) is now an opt-in FLOOR for a
// fast local smoke, behind INDEXCHECK_SAMPLE. That 37-of-708 floor is exactly how a
// noindexed quiz page sat in the sitemap unnoticed, so a partial run must announce
// itself as partial rather than read like full coverage.
const FLOOR = process.env.INDEXCHECK_SAMPLE !== undefined && process.env.INDEXCHECK_SAMPLE !== '';
let sample: string[];
if (FLOOR) {
  const perType = new Map<string, string>();
  sample = [];
  for (const loc of locs) {
    const type = routeType(pathOf(loc));
    if (type === 'article') { sample.push(loc); continue; } // all articles
    if (!perType.has(type)) { perType.set(type, loc); sample.push(loc); }
  }
} else {
  sample = [...locs];
}
// INDEXCHECK_EXTRA force-checks paths that are NOT (yet) in the sitemap: it proves
// the contradiction detector actually bites (point it at a known-noindex page like
// /battle and the run must go red), and lets you spot-check a page before you
// advertise it. Comma-separated paths or full URLs.
const EXTRA = (process.env.INDEXCHECK_EXTRA ?? '')
  .split(',').map((s) => s.trim()).filter(Boolean)
  .map((p) => (p.startsWith('http') ? p : `${SITE_URL}${p.startsWith('/') ? p : `/${p}`}`));
for (const e of EXTRA) sample.push(e);
const coverage = FLOOR
  ? `FLOOR sample (${sample.length - EXTRA.length} of ${locs.length}, 1 per type + all articles)`
  : `COMPLETE crawl (all ${locs.length})`;
console.log(`Indexability guard: ${locs.length} sitemap URLs -> ${coverage}${EXTRA.length ? ` + ${EXTRA.length} injected` : ''}, against ${BASE}`);

// Types whose pages are DEEP on-demand ISR: hitting them cold on a local dev
// server triggers the documented ISR cold-404 trap (a timed-out first hit caches
// a 404 for an hour), so a non-200 here is a local-environment artifact, not a
// contradiction. The PART 2 prod monitor checks their live HTTP status against a
// warm production build - that is the right place for it. We still hard-fail on
// noindex / missing title / non-self-canonical whenever one of them DOES render.
const SOFT_STATUS_TYPES = new Set(['verse-root', 'verse-space', 'verse-tab', 'verse-member', 'verse-album', 'verse-song', 'verse-leaf', 'ranking', 'pulse', 'game-name-all']);
const warnings: string[] = [];

// ---- 3. Forward check: no crawled URL may contradict "index me" -------------
// Concurrency-limited so a COMPLETE 708-URL crawl finishes in reasonable time
// without hammering the server. Pushes to failures/warnings are safe under the
// single-threaded event loop.
async function checkOne(loc: string): Promise<void> {
  const local = toLocal(loc);
  const page = await fetchText(local);
  const p = pathOf(loc);
  const type = routeType(p);
  if (!page) { failures.push(`${p} - request failed (no response).`); return; }
  if (page.status !== 200) {
    const msg = `${p} - in the sitemap but returned HTTP ${page.status} (should be 200).`;
    if (SOFT_STATUS_TYPES.has(type)) warnings.push(`${msg} [${type}: deep ISR - verify via the prod monitor]`);
    else failures.push(msg);
    return;
  }

  // robots noindex (header OR meta) - the article-bug class.
  const metaRobots = page.html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] ?? '';
  if (/noindex/i.test(page.xRobots) || /noindex/i.test(metaRobots)) {
    failures.push(`${p} - in the sitemap but emits robots NOINDEX (${/noindex/i.test(page.xRobots) ? 'X-Robots-Tag header' : 'meta robots'}). Sitemap says index, page says do-not.`);
  }
  // <title>
  const title = page.html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
  if (!title) failures.push(`${p} - in the sitemap but has no <title>.`);
  // self-canonical
  const canon = page.html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] ?? '';
  const canonHref = canon.match(/href=["']([^"']+)["']/i)?.[1] ?? '';
  if (!canonHref) {
    failures.push(`${p} - in the sitemap but has no <link rel="canonical">.`);
  } else if (pathOf(canonHref) !== p) {
    failures.push(`${p} - in the sitemap but canonicals to ${pathOf(canonHref)} (not self). Sitemap advertises a non-canonical URL.`);
  }
}

const CONCURRENCY = Number(process.env.INDEXCHECK_CONCURRENCY ?? '10');
let cursor = 0;
async function worker(): Promise<void> {
  while (cursor < sample.length) {
    const i = cursor++;
    await checkOne(sample[i]!);
  }
}
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, sample.length) }, () => worker()));

// ---- 4. Inverse check: indexable-by-design pages must BE in the sitemap ------
// (a) articles: every non-noindex article.
for (const a of ARTICLES) {
  if (a.noindex) continue;
  const p = `/articles/${a.slug}`;
  if (!sitemapPaths.has(p)) failures.push(`${p} - a non-noindex article, but ABSENT from the sitemap (it will not be discovered).`);
}

// (b) live catalogue: a sample of published quizzes and groups with quizzes.
try {
  const { createClient } = await import('@supabase/supabase-js');
  // W7-CLOSE: anon, not service role. This reads only `quizzes` (published) and
  // `groups`, and anon was measured to return identical counts on both (400 = 400,
  // 88 = 88). Dropping the service role here is what lets this gate run in CI on the
  // two secrets the repo already has, instead of shipping an RLS bypass to a runner.
  const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data: quizzes } = await db.from('quizzes').select('slug').eq('status', 'published').order('play_count', { ascending: false }).limit(25);
  for (const q of (quizzes ?? []) as { slug: string }[]) {
    const p = `/q/${q.slug}`;
    if (!sitemapPaths.has(p)) failures.push(`${p} - a published quiz, but ABSENT from the sitemap.`);
  }
  const { data: groups } = await db.from('groups').select('slug, quiz_count').gt('quiz_count', 0).order('quiz_count', { ascending: false }).limit(25);
  for (const g of (groups ?? []) as { slug: string; quiz_count: number }[]) {
    const p = `/${g.slug}-quiz`;
    if (!sitemapPaths.has(p)) failures.push(`${p} - a group with ${g.quiz_count} quizzes, but its -quiz page is ABSENT from the sitemap.`);
  }
} catch (err) {
  failures.push(`inverse DB check could not run: ${(err as Error).message}`);
}

// ---- report -----------------------------------------------------------------
if (warnings.length > 0) {
  console.warn(`\nIndexability guard warnings (${warnings.length}) - deep on-demand ISR, not gating locally (PART 2 prod monitor covers these):`);
  for (const w of warnings) console.warn(`  ! ${w}`);
}
if (failures.length > 0) {
  console.error(`\nIndexability guard FAILED (${failures.length}):\n`);
  for (const f of failures) console.error(`  x ${f}`);
  console.error(`\nEither the sitemap advertises a page it should not (noindex / missing title / non-self-canonical),\n` +
    `or an indexable page fell out of the sitemap. Fix the page's metadata OR the sitemap inclusion in src/app/sitemap.ts.\n`);
  process.exit(1);
}
console.log(`Indexability guard passed: ${coverage} - ${sample.length} pages index-consistent, and every article + sampled quiz/group is in the sitemap.`);
