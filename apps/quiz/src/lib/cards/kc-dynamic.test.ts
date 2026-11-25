// The [site] layout sets dynamicParams = false (O1 guard), and every child segment inherits it. Seen with a production server (next start, 2026-11-13):
// a dynamic page with dynamicParams = true and an EMPTY generateStaticParams answers every value with NoFallbackError (a 404), although a dev server
// answers 200. Two shapes work, and every dynamic page of the KpopCards tree (and the old /cards redirect) must be one of them:
// - open-ended values (a group, a card number, a nickname): rendered per request, dynamic = 'force-dynamic' and dynamicParams = true, no generateStaticParams
//   (the shape of u/[username], which a production server answers);
// - finite values (the five themes): a generateStaticParams that lists them with the build's site param (siteStaticParams), dynamicParams = true.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const HUB = join(__dirname, '../../app/sites/[site]/(hub)');
function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n === 'page.tsx') out.push(p);
  }
  return out;
}

describe('the dynamic KpopCards pages answer on a production server', () => {
  const pages = [...walk(join(HUB, 'kpopcards')), ...walk(join(HUB, 'cards'))].filter((f) => /\[[^\]]+\]/.test(f.slice(HUB.length)));
  it('finds the dynamic pages', () => { expect(pages.length).toBeGreaterThanOrEqual(6); }); // 6 since the focus pack page was deleted (owner request of 2026-11-25)
  it.each(pages.map((f) => [f.slice(HUB.length), f] as const))('%s is rendered per request, or lists its finite values with the site param', (_name, f) => {
    const src = readFileSync(f, 'utf8');
    expect(src).toMatch(/^export const dynamicParams = true;$/m);
    // the shape that fails on a production server: an empty list of static params
    expect(src).not.toMatch(/generateStaticParams\([^)]*\)[^{]*\{\s*return \[\];\s*\}/);
    const perRequest = /^export const dynamic = 'force-dynamic';$/m.test(src);
    const listed = /^export (async )?function generateStaticParams\(/m.test(src);
    expect(perRequest !== listed, 'exactly one of: dynamic = force-dynamic, or a generateStaticParams').toBe(true);
    if (listed) expect(src).toMatch(/siteStaticParams\(\)/);
  });
  it('the finite page is the themes page, the others are per request', () => {
    const listed = pages.filter((f) => /^export (async )?function generateStaticParams\(/m.test(readFileSync(f, 'utf8'))).map((f) => f.slice(HUB.length));
    expect(listed).toEqual(['/kpopcards/open/[theme]/page.tsx']);
  });
});
