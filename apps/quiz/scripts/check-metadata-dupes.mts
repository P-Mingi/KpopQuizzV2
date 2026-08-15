/**
 * W1 CTR SPRINT - the DUPLICATE-METADATA gate.
 *
 * The rule the SEO academy states most bluntly and the one rule we had no gate
 * for: two indexable URLs must never render the same <title> or the same
 * <meta name="description">. Duplicates make Google pick one and drop the other
 * from the snippet lottery, so the impressions we already earned never convert.
 *
 * Sibling to check-indexability.mts (same shape, same env knob):
 *
 *   METADUPE_BASE_URL=http://localhost:3021 pnpm --filter quiz check:metadata-dupes
 *
 * It resolves the REAL rendered output (dynamic metadata cannot be resolved
 * statically), so it needs a running server. Exit 1 on any duplicate, naming
 * both URLs and the colliding string.
 *
 * Scope honesty: it checks EVERY url in the sitemap (the indexable set we
 * advertise). Pages that do not return 200 are reported as skipped with their
 * status, never silently dropped - a shrinking checked-set must be visible.
 */

const BASE = (process.env.METADUPE_BASE_URL ?? 'http://localhost:3021').replace(/\/$/, '');
const SITE_URL = 'https://kpopquiz.org';
const FETCH_TIMEOUT_MS = 45000;
const CONCURRENCY = Number(process.env.METADUPE_CONCURRENCY ?? 8);

type Page = { path: string; status: number; title: string; description: string };

const pathOf = (loc: string): string => {
  try { return new URL(loc).pathname.replace(/\/$/, '') || '/'; } catch { return loc; }
};

/** Decode the handful of entities Next emits in title/meta so we compare real text. */
function decode(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchPage(path: string): Promise<Page> {
  const url = `${BASE}${path}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: ctrl.signal, redirect: 'manual' });
    clearTimeout(t);
    const html = await res.text();
    const title = decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '');
    const descTag = html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] ?? '';
    const description = decode(descTag.match(/content=["']([^"']*)["']/i)?.[1] ?? '');
    return { path, status: res.status, title, description };
  } catch {
    return { path, status: 0, title: '', description: '' };
  }
}

/** Bounded-concurrency map, so a 700-URL sitemap does not open 700 sockets. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

// ---- 1. the indexable set = the sitemap -------------------------------------
const smRes = await fetch(`${BASE}/sitemap.xml`).catch(() => null);
if (!smRes || smRes.status !== 200) {
  console.error(`\nDuplicate-metadata gate FAILED: could not fetch ${BASE}/sitemap.xml (status ${smRes?.status ?? 'no response'}).`);
  console.error(`Is the server running? Set METADUPE_BASE_URL or start the dev server on :3021.\n`);
  process.exit(1);
}
const xml = await smRes.text();
const paths = [...new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => pathOf(m[1]!.replace(SITE_URL, ''))))];
if (paths.length === 0) {
  console.error('\nDuplicate-metadata gate FAILED: the sitemap has zero <loc> entries.\n');
  process.exit(1);
}

console.log(`Duplicate-metadata gate: fetching ${paths.length} sitemap URLs from ${BASE} (concurrency ${CONCURRENCY})...`);
const pages = await mapLimit(paths, CONCURRENCY, fetchPage);

// ---- 2. split checked vs skipped, loudly ------------------------------------
const ok = pages.filter((p) => p.status === 200);
const skipped = pages.filter((p) => p.status !== 200);
if (skipped.length > 0) {
  console.warn(`\nSkipped ${skipped.length} URL(s) that did not return 200 (NOT checked for duplicates):`);
  for (const s of skipped) console.warn(`  ! ${s.path} - HTTP ${s.status === 0 ? 'no response/timeout' : s.status}`);
}

// ---- 3. the duplicate checks -------------------------------------------------
const failures: string[] = [];

function collide(field: 'title' | 'description'): void {
  const byValue = new Map<string, string[]>();
  for (const p of ok) {
    const v = p[field];
    if (!v) continue; // emptiness is check-indexability's job, not ours
    const arr = byValue.get(v) ?? [];
    arr.push(p.path);
    byValue.set(v, arr);
  }
  for (const [value, urls] of byValue) {
    if (urls.length < 2) continue;
    failures.push(
      `${urls.length} indexable URLs render an IDENTICAL ${field}:\n` +
      `      "${value}"\n` +
      urls.map((u) => `      - ${u}`).join('\n'),
    );
  }
}

collide('title');
collide('description');

// A missing description on an indexable URL is its own CTR loss: Google invents
// one from the page body, and it is usually the worst sentence available.
const noDesc = ok.filter((p) => !p.description).map((p) => p.path);
if (noDesc.length > 0) {
  failures.push(`${noDesc.length} indexable URL(s) render NO meta description:\n` + noDesc.map((u) => `      - ${u}`).join('\n'));
}

// ---- report ------------------------------------------------------------------
if (failures.length > 0) {
  console.error(`\nDuplicate-metadata gate FAILED (${failures.length} collision group(s)) across ${ok.length} checked URLs:\n`);
  for (const f of failures) console.error(`  x ${f}\n`);
  console.error(`Every indexable URL needs a unique title and a unique description.\n` +
    `Fix the template so it varies by construction, or stop advertising the duplicate URL in the sitemap.\n`);
  process.exit(1);
}
console.log(`Duplicate-metadata gate passed: ${ok.length} checked URLs all have a unique title, a unique description, and no blank description.`);
