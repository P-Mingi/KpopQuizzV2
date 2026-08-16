/**
 * W7b - the ORPHAN GATE.
 *
 * The failure class: a URL is in the sitemap (we tell Google "index this") but no page
 * on the site links to it. It is discoverable but carries no internal depth signal, and
 * nothing fails, so it stays that way forever. The W7 audit found 11 group hubs in
 * exactly that state, and the cause was structural: the only global surfaces listing
 * groups are capped (home rail slice(0,10), pills slice(0,13)) against 37 groups, so
 * every group past the cap depended on hand-curated links. Group 38 would have been
 * born an orphan too.
 *
 * This gate makes that permanent to catch rather than permanent to repeat.
 *
 * Sibling to check:indexability: it grades the SERVED HTML of a running server, so it
 * needs one up (a production build, ideally):
 *
 *   ORPHANCHECK_BASE_URL=http://localhost:3021 npm run check:orphans
 *
 * HONESTY ABOUT THE BOUNDARY: crawling every sitemap URL is too slow for CI, so the
 * crawl SAMPLES. That means a "zero inbound links" result is a FLOOR on inbound links,
 * not a proof of zero: a page reported here could still be linked from a page outside
 * the sample. The output states the sample size every time, and the failure message
 * says so in words. Never report a bare count.
 *
 * Env:
 *   ORPHANCHECK_BASE_URL   default http://localhost:3021
 *   ORPHANCHECK_SAMPLE     max pages to crawl (default 200)
 *   ORPHANCHECK_INJECT     a path to treat as if it were in the sitemap, used to prove
 *                          the gate RED without having to un-fix a real orphan.
 *   ORPHANCHECK_SCOPE      regex; assert only on paths matching it. This exists so the
 *                          gate can RATCHET: a class you have fixed can be gated green
 *                          today while the classes you have not fixed are still being
 *                          worked. It is not an excuse. The unscoped run is the truth,
 *                          the scoped run is what you are willing to block CI on, and
 *                          the scope must only ever shrink.
 */

const BASE = (process.env.ORPHANCHECK_BASE_URL ?? 'http://localhost:3021').replace(/\/$/, '');
const SITE_URL = 'https://kpopquiz.org';
const SAMPLE = Number(process.env.ORPHANCHECK_SAMPLE ?? 200);
const INJECT = process.env.ORPHANCHECK_INJECT ?? '';
const SCOPE = process.env.ORPHANCHECK_SCOPE ? new RegExp(process.env.ORPHANCHECK_SCOPE) : null;
const FETCH_TIMEOUT_MS = 30000;

// Verse is PAUSED and out of scope for this gate.
const isVerse = (p: string): boolean => p.startsWith('/verse');

async function get(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const pathOf = (loc: string): string => {
  try { return new URL(loc, SITE_URL).pathname.replace(/\/+$/, '') || '/'; } catch { return ''; }
};

/** Every <loc> in the sitemap index and its children. */
async function sitemapPaths(): Promise<string[]> {
  const root = await get(`${BASE}/sitemap.xml`);
  if (!root) throw new Error(`could not read ${BASE}/sitemap.xml - is the server up?`);

  const locs = [...root.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  const children = locs.filter(l => l.includes('sitemap'));
  const out = new Set<string>();

  for (const l of locs) if (!l.includes('sitemap')) out.add(pathOf(l));
  for (const child of children) {
    const xml = await get(child.replace(SITE_URL, BASE));
    if (!xml) continue;
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) out.add(pathOf(m[1]));
  }
  return [...out].filter(p => p && !isVerse(p));
}

/** Internal link targets in one page's served HTML. */
function linksIn(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
    const href = m[1];
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (/^https?:\/\//i.test(href) && !href.startsWith(SITE_URL)) continue;
    const p = pathOf(href);
    if (p) out.push(p);
  }
  return out;
}

async function main(): Promise<void> {
  const all = await sitemapPaths();
  if (INJECT) all.push(pathOf(INJECT));

  // Deterministic, spread sample: always include the short "hub-shaped" paths (they are
  // the ones that matter for depth signal) and then stride through the rest, so the
  // sample is not just the first N of one type.
  const hubs = all.filter(p => p.split('/').length === 2);
  const rest = all.filter(p => !hubs.includes(p));
  const room = Math.max(0, SAMPLE - hubs.length);
  const stride = rest.length > room && room > 0 ? Math.ceil(rest.length / room) : 1;
  const sampled = [...hubs, ...rest.filter((_, i) => i % stride === 0).slice(0, room)];

  const inbound = new Map<string, number>();
  for (const p of all) inbound.set(p, 0);

  let crawled = 0;
  for (const p of sampled) {
    const html = await get(`${BASE}${p}`);
    if (html === null) continue;
    crawled++;
    for (const target of new Set(linksIn(html))) {
      // A page linking to itself is not an inbound link.
      if (target === p) continue;
      if (inbound.has(target)) inbound.set(target, inbound.get(target)! + 1);
    }
  }

  // Links are always counted from the FULL crawl; SCOPE only narrows what we assert on,
  // so a scoped run can never manufacture a pass by ignoring inbound links.
  const orphans = [...inbound.entries()]
    .filter(([, n]) => n === 0)
    .map(([p]) => p)
    .filter(p => !SCOPE || SCOPE.test(p))
    .sort();

  console.log(
    `Orphan gate: ${all.length} non-verse sitemap URLs, crawled ${crawled} of ${sampled.length} sampled pages against ${BASE}` +
      (SCOPE ? `\n  asserting only on paths matching ${SCOPE} (scoped run: the unscoped run is the full truth)` : ''),
  );

  if (orphans.length > 0) {
    console.error(
      `\nOrphan gate FAILED: ${orphans.length} sitemap URL(s) have ZERO inbound internal links ` +
      `from the ${crawled} crawled pages. Because the crawl SAMPLES (${crawled} of ${all.length} ` +
      `URLs), this is a FLOOR on inbound links, not a proof of zero: a page listed here could ` +
      `still be linked from a page outside the sample. Each offender by URL:`,
    );
    for (const p of orphans) console.error(`  x ${p}`);
    console.error(
      `\nFix by linking them from a real surface people use (e.g. /groups, the A-Z directory), ` +
      `not by minting a page to hold the link.`,
    );
    process.exit(1);
  }

  console.log(
    `Orphan gate passed: every ${SCOPE ? 'IN-SCOPE' : ''} sitemap URL of the ${all.length} non-verse ones has at least one ` +
    `inbound internal link from the ${crawled} crawled pages. (Sampled crawl, so this proves ` +
    `inbound links exist, not that the count is complete.)`,
  );
}

main().catch((err) => {
  console.error(`Orphan gate error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
