/**
 * SEO indexguard PART 4 - the sitemap HYGIENE gate (allow-list integrity).
 *
 * sitemap.ts is an allow-list: it is built from the live DB + hardcoded live
 * pages, so a killed route cannot appear unless someone hardcodes it back in.
 * This gate is the tripwire for exactly that regression, and for the inverse -
 * a priority group hub silently falling out of the advertised set.
 *
 * It asserts three structural properties the sibling gates do NOT:
 *   1. NO advertised URL matches a KILLED pattern (games, tier-list, coer-quiz,
 *      rankings, battle, personality, avatar, pinterest, the /blind-test/ 301
 *      source). These routes were removed; re-advertising one tells Google to
 *      crawl a 301/404 and wastes crawl budget on the under-indexed domain.
 *   2. Every PRIORITY (Tier A/B) group hub `/{slug}-quiz` is present. These are
 *      the head-term targets (W1); a hub dropping out of the sitemap is a silent
 *      loss of the biggest ranking pages.
 *   3. The sitemap is a single file under Google's 50,000-URL limit; past that it
 *      must be split into a sitemap index.
 *
 * It is a smoke-style gate (server up), sibling to check:indexability /
 * check:orphans / check:metadata-dupes, and runs in the same nightly workflow:
 *
 *   SITEMAP_BASE_URL=http://localhost:3021 pnpm --filter quiz check:sitemap-hygiene
 *
 * Exit 1 on any violation, naming the offending URL(s) or the missing hub(s).
 * Liveness (each URL returns 200 / is indexable) is already covered by
 * check:indexability, so this gate does not re-fetch every URL.
 */

const BASE = (process.env.SITEMAP_BASE_URL ?? 'http://localhost:3021').replace(/\/$/, '');
const SITE_URL = 'https://kpopquiz.org';
const FETCH_TIMEOUT_MS = 30000;
const SITEMAP_MAX_URLS = 50000; // Google's per-file limit.

// Routes removed by the REFONTE P1 kill + the SEO 301 consolidations. A path
// segment match on any of these in an advertised URL is a regression.
const KILLED_PATTERNS: ReadonlyArray<string> = [
  '/games',
  '/coer-quiz',
  '/tier-list',
  '/rankings',
  '/battle',
  '/personality',
  '/avatar',
  '/pinterest',
  '/blind-test/', // 301 source, consolidated to /blindtest
];

// Tier A + Tier B group hubs (the W1 head-term targets). Each must be advertised
// as `/{slug}-quiz`. Kept in sync with docs/seo/CONTENT-BACKLOG.md + the market
// analysis top-20; a hub only leaves this list if the group is deliberately dropped.
const PRIORITY_HUBS: ReadonlyArray<string> = [
  'cortis', 'illit', 'seventeen', 'babymonster', 'aespa', 'stray-kids',
  'blackpink', 'twice', 'bts', 'newjeans', 'le-sserafim', 'ive', 'enhypen',
  'txt', 'itzy',
];

async function fetchSitemap(): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}/sitemap.xml`, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`GET /sitemap.xml -> HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function parseLocs(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(m[1].trim());
  return out;
}

async function main(): Promise<void> {
  let xml: string;
  try {
    xml = await fetchSitemap();
  } catch (err) {
    console.error(
      `Sitemap-hygiene gate FAILED: could not fetch ${BASE}/sitemap.xml (${(err as Error).message}).`,
    );
    console.error('Is the server running? Set SITEMAP_BASE_URL or start the dev/built server on :3021.');
    process.exit(1);
  }

  // A sitemap index (many <sitemap> children) means the URLs live in sub-files;
  // this gate expects the single-file form the app emits today. If that changes,
  // point BASE at each sub-sitemap. Fail loudly rather than pass on zero URLs.
  const isIndex = /<sitemap>/.test(xml) && !/<url>/.test(xml);
  const locs = parseLocs(xml);
  const urls = isIndex ? [] : locs;

  const problems: string[] = [];

  if (isIndex) {
    problems.push(
      'Sitemap is now an index (<sitemap> children). Update this gate to walk each sub-sitemap.',
    );
  }

  if (!isIndex && urls.length === 0) {
    problems.push('Sitemap returned zero <loc> URLs - the DB batch likely failed at build time.');
  }

  // 1. No killed / dead route may be advertised.
  const killed = urls.filter((u) => KILLED_PATTERNS.some((p) => u.includes(p)));
  for (const u of killed) problems.push(`KILLED route advertised in sitemap: ${u}`);

  // 2. Every priority hub must be present.
  const present = new Set(urls);
  const missingHubs = PRIORITY_HUBS.filter((slug) => !present.has(`${SITE_URL}/${slug}-quiz`));
  for (const slug of missingHubs) {
    problems.push(`Priority hub missing from sitemap: /${slug}-quiz (a W1 head-term target)`);
  }

  // 3. Single-file size guard.
  if (urls.length > SITEMAP_MAX_URLS) {
    problems.push(
      `Sitemap has ${urls.length} URLs, over Google's ${SITEMAP_MAX_URLS} per-file limit. Split into a sitemap index.`,
    );
  }

  if (problems.length > 0) {
    console.error('Sitemap-hygiene gate FAILED:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  console.log(
    `Sitemap-hygiene gate passed: ${urls.length} URLs, 0 killed routes, all ${PRIORITY_HUBS.length} priority hubs present, single file under ${SITEMAP_MAX_URLS}.`,
  );
}

main().catch((err) => {
  console.error('Sitemap-hygiene gate crashed:', err);
  process.exit(1);
});
