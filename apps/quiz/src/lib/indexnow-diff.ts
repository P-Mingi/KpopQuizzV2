// O1 audit 03 P1-8 (rulebook 11.2): IndexNow gets the URLs that were added, removed or whose lastmod changed since the last
// submission, never the whole sitemap again. Pure: two sitemap texts in, the URLs to submit out.

export interface SitemapEntry { loc: string; lastmod: string | null }

const decode = (s: string): string => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** The <url> entries of a urlset (loc and lastmod). A sitemap index has none. */
export function parseSitemapEntries(xml: string): SitemapEntry[] {
  const out: SitemapEntry[] = [];
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = m[1]!;
    const loc = /<loc>\s*([^<]+?)\s*<\/loc>/.exec(block)?.[1];
    if (!loc) continue;
    const lastmod = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/.exec(block)?.[1] ?? null;
    out.push({ loc: decode(loc), lastmod: lastmod ? decode(lastmod) : null });
  }
  return out;
}

export interface SitemapDiff { added: string[]; removed: string[]; changed: string[] }

const sameInstant = (a: string, b: string): boolean => {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  return Number.isNaN(ta) || Number.isNaN(tb) ? a === b : ta === tb;
};

/**
 * What changed between two sitemaps: `added` (in current only), `removed` (in previous only: IndexNow takes a gone URL as a
 * notice to recrawl it), `changed` (in both, lastmod moved to a different date). A lastmod that appeared or disappeared is not a
 * content change. An unchanged sitemap gives three empty lists, so nothing is submitted.
 */
export function diffSitemaps(previous: readonly SitemapEntry[], current: readonly SitemapEntry[]): SitemapDiff {
  const prev = new Map(previous.map((e) => [e.loc, e.lastmod]));
  const curr = new Map(current.map((e) => [e.loc, e.lastmod]));
  const added: string[] = [];
  const changed: string[] = [];
  for (const [loc, lastmod] of curr) {
    if (!prev.has(loc)) { added.push(loc); continue; }
    const before = prev.get(loc) ?? null;
    if (lastmod && before && !sameInstant(before, lastmod)) changed.push(loc);
  }
  const removed = [...prev.keys()].filter((loc) => !curr.has(loc));
  return { added, removed, changed };
}

/** The URLs to submit, once each, in a stable order. */
export function urlsToSubmit(d: SitemapDiff): string[] {
  return [...new Set([...d.added, ...d.changed, ...d.removed])];
}
