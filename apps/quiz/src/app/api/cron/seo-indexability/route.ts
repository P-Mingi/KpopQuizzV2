import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

/**
 * SEO indexguard PART 2 - weekly PROD indexability monitor.
 *
 * The build-time guard (scripts/check-indexability.mts) protects each deploy;
 * this catches drift that only appears live (a page that starts noindex-ing in
 * prod, a URL that starts 404-ing, a canonical that flips). It fetches the
 * production sitemap, samples N URLs stratified by route type (every article +
 * quizzes + groups + verse + hubs), fetches each, and reports any that are not
 * HTTP 200 / carry robots noindex / lack a self-canonical.
 *
 * Auth + runtime + response shape mirror duel-reconcile exactly (Vercel Cron
 * header OR Bearer CRON_SECRET). Read-only: it never writes, just logs + returns
 * a JSON report so a failed check is visible in the cron logs.
 */
export const dynamic = 'force-dynamic';

const SITE_URL = 'https://kpopquiz.org';
const SAMPLE_SIZE = 40;
const FETCH_TIMEOUT_MS = 15000;

function routeType(path: string): string {
  if (path === '/' || path === '') return 'home';
  if (/^\/articles\//.test(path)) return 'article';
  if (/^\/q\//.test(path)) return 'quiz';
  if (/^\/blindtest\/group-/.test(path)) return 'blindtest-group';
  if (/^\/blindtest\//.test(path)) return 'blindtest-mode';
  if (/^\/games\/[^/]+\//.test(path)) return 'game-leaf';
  if (/^\/games\//.test(path)) return 'game-hub';
  if (/^\/rankings\//.test(path)) return 'ranking';
  if (/^\/data\/pulse\//.test(path)) return 'pulse';
  if (/^\/which-.+-are-you$/.test(path)) return 'personality';
  if (/^\/verse\/[^/]+\/[^/]+\//.test(path)) return 'verse-leaf';
  if (/^\/verse\/[^/]+\/[^/]+$/.test(path)) return 'verse-tab';
  if (/^\/verse\/[^/]+$/.test(path)) return 'verse-space';
  if (/^\/verse/.test(path)) return 'verse-root';
  if (/-trivia$/.test(path)) return 'group-trivia';
  if (/-quiz$/.test(path)) return 'group-quiz';
  if (/^\/pt(\/|$)/.test(path)) return 'pt';
  return 'static';
}

const pathOf = (loc: string): string => { try { return new URL(loc).pathname.replace(/\/$/, '') || '/'; } catch { return loc; } };

async function fetchWithTimeout(url: string): Promise<{ status: number; html: string; xRobots: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual', headers: { 'user-agent': 'kpopquiz-indexguard/1.0' } });
    const html = await res.text();
    return { status: res.status, html, xRobots: res.headers.get('x-robots-tag') ?? '' };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Returns a failure reason for this URL, or null if it is index-consistent. */
function checkPage(path: string, page: { status: number; html: string; xRobots: string } | null): string | null {
  if (!page) return 'request failed (no response / timeout)';
  if (page.status !== 200) return `HTTP ${page.status} (expected 200)`;
  const metaRobots = page.html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] ?? '';
  if (/noindex/i.test(page.xRobots) || /noindex/i.test(metaRobots)) return `emits robots NOINDEX while in the sitemap (${/noindex/i.test(page.xRobots) ? 'header' : 'meta'})`;
  const title = page.html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? '';
  if (!title) return 'no <title>';
  const canonHref = page.html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0]?.match(/href=["']([^"']+)["']/i)?.[1] ?? '';
  if (!canonHref) return 'no self-canonical';
  if (pathOf(canonHref) !== path) return `canonicals to ${pathOf(canonHref)} (not self)`;
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const isVercelCron = req.headers.get('x-vercel-cron') === '1';
  const authHeader = req.headers.get('authorization');
  const isManualAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !isManualAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Pull the prod sitemap.
  const sm = await fetchWithTimeout(`${SITE_URL}/sitemap.xml`);
  if (!sm || sm.status !== 200) {
    const report = { ok: false, error: `sitemap fetch failed (status ${sm?.status ?? 'none'})`, checked: 0, failures: [] as unknown[] };
    console.error('[seo-indexability]', JSON.stringify(report));
    return NextResponse.json(report, { status: 502 });
  }
  const locs = [...sm.html.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.trim());

  // 2. Stratified sample: EVERY article first, then round-robin one-per-type to N.
  const byType = new Map<string, string[]>();
  for (const loc of locs) {
    const t = routeType(pathOf(loc));
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(loc);
  }
  const sample: string[] = [...(byType.get('article') ?? [])];
  const cursors = new Map<string, number>();
  const types = [...byType.keys()].filter((t) => t !== 'article');
  while (sample.length < SAMPLE_SIZE) {
    let added = false;
    for (const t of types) {
      if (sample.length >= SAMPLE_SIZE) break;
      const arr = byType.get(t)!;
      const i = cursors.get(t) ?? 0;
      if (i < arr.length) { sample.push(arr[i]!); cursors.set(t, i + 1); added = true; }
    }
    if (!added) break;
  }

  // 3. Fetch + check each sampled URL.
  const failures: Array<{ url: string; type: string; reason: string }> = [];
  for (const loc of sample) {
    const p = pathOf(loc);
    const reason = checkPage(p, await fetchWithTimeout(loc));
    if (reason) failures.push({ url: p, type: routeType(p), reason });
  }

  const report = { ok: failures.length === 0, checked: sample.length, sitemapUrls: locs.length, failures };
  if (failures.length > 0) console.error('[seo-indexability] FAILURES', JSON.stringify(report));
  else console.log('[seo-indexability]', JSON.stringify(report));
  return NextResponse.json(report);
}
