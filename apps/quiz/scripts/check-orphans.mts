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
 * HONESTY ABOUT THE BOUNDARY: by default this crawls EVERY non-verse sitemap URL, so a
 * "zero inbound links" result is a proof, not an estimate. When ORPHANCHECK_SAMPLE caps
 * the crawl, the result becomes a FLOOR on inbound links instead: a page reported could
 * still be linked from a page outside the sample. The output states which of the two it
 * was, every run. Never report a bare count; always list offenders by URL.
 *
 * Env:
 *   ORPHANCHECK_BASE_URL   default http://localhost:3021
 *   ORPHANCHECK_SAMPLE     cap the crawl for a fast local pass (default: no cap)
 *   ORPHANCHECK_INJECT     a path to treat as if it were in the sitemap, used to prove
 *                          the gate RED without having to un-fix a real orphan.
 *
 * There is deliberately NO scope flag. W7b shipped one as a ratchet while the blindtest
 * and landing-page classes were still open; W7c closed them, so it was deleted rather
 * than narrowed. A gate that can be pointed away from a failure is a gate that will be.
 */

const BASE = (process.env.ORPHANCHECK_BASE_URL ?? 'http://localhost:3021').replace(/\/$/, '');
const SITE_URL = 'https://kpopquiz.org';
// Default: crawl EVERYTHING. W7c: a sampled crawl invents phantom orphans (pages whose
// only inbound link lives on a page that did not make the sample) and the set churns run
// to run, which is worse than slow. A complete crawl turns the result from a floor into a
// proof. ORPHANCHECK_SAMPLE still caps it for a fast local pass.
const SAMPLE = Number(process.env.ORPHANCHECK_SAMPLE ?? Number.POSITIVE_INFINITY);
const INJECT = process.env.ORPHANCHECK_INJECT ?? '';
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

  // Deterministic, spread sample. Two kinds of page are ALWAYS crawled:
  //   1. short "hub-shaped" paths (/bts-quiz, /groups, /blindtest)
  //   2. INDEX pages: any sitemap path that is a path-prefix of other sitemap paths.
  //      /games/name-all is a prefix of /games/name-all/*, so by definition it indexes
  //      them and is exactly where their inbound links live.
  // W7c found this the hard way: five name-all games were reported as orphans purely
  // because /games/name-all (3 segments, so not "hub-shaped") never made the sample,
  // while it links all five. Missing an index page manufactures phantom orphans, which
  // is the failure mode most likely to make someone "fix" a non-problem by adding a
  // link that was never needed.
  const isIndex = (p: string): boolean =>
    all.some(other => other !== p && other.startsWith(p + '/'));
  const hubSet = new Set(all.filter(p => p.split('/').length === 2 || isIndex(p)));
  const hubs = [...hubSet];
  const rest = all.filter(p => !hubSet.has(p));
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

  const orphans = [...inbound.entries()]
    .filter(([, n]) => n === 0)
    .map(([p]) => p)
    .sort();

  console.log(
    `Orphan gate: ${all.length} non-verse sitemap URLs, crawled ${crawled} of ${sampled.length} pages against ${BASE}`,
  );

  const partial = sampled.length < all.length;
  if (orphans.length > 0) {
    console.error(
      `\nOrphan gate FAILED: ${orphans.length} sitemap URL(s) have ZERO inbound internal links ` +
      `from the ${crawled} crawled pages.` +
      (partial
        ? ` Because this run SAMPLED (${sampled.length} of ${all.length} URLs), the result is a ` +
          `FLOOR on inbound links, not a proof of zero: a page listed here could still be linked ` +
          `from a page outside the sample.`
        : ` This run crawled EVERY non-verse sitemap URL, so these have no internal inbound link ` +
          `from anywhere in the sitemap.`) +
      ` Each offender by URL:`,
    );
    for (const p of orphans) console.error(`  x ${p}`);
    console.error(
      `\nFix by linking them from a real surface people use (e.g. /groups, the A-Z directory), ` +
      `not by minting a page to hold the link.`,
    );
    process.exit(1);
  }

  console.log(
    `Orphan gate passed: every one of the ${all.length} non-verse sitemap URLs has at least one ` +
    `inbound internal link from the ${crawled} crawled pages.` +
    (sampled.length < all.length
      ? ' (SAMPLED crawl, so this proves inbound links exist, not that the count is complete.)'
      : ' (Complete crawl of every non-verse sitemap URL.)'),
  );
}

main().catch((err) => {
  console.error(`Orphan gate error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
