// The [site] layout sets dynamicParams = false (O1 guard), and every child segment inherits it: a dynamic page without generateStaticParams would never match (the catch-all
// answers 404), and dynamicParams = true alone is not enough under the layout's own generateStaticParams: each page also exports one (the finite values, else an empty list). Every dynamic page of the KpopCards tree (and the old /cards redirect) must say dynamicParams = true.
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

describe('the dynamic KpopCards pages allow params the build does not list', () => {
  const pages = [...walk(join(HUB, 'kpopcards')), ...walk(join(HUB, 'cards'))].filter((f) => /\[[^\]]+\]/.test(f.slice(HUB.length)));
  it('finds the dynamic pages', () => { expect(pages.length).toBeGreaterThanOrEqual(7); });
  it.each(pages.map((f) => [f.slice(HUB.length), f] as const))('%s exports dynamicParams = true and a generateStaticParams', (_name, f) => {
    const src = readFileSync(f, 'utf8');
    expect(src).toMatch(/^export const dynamicParams = true;$/m);
    expect(src).toMatch(/^export (async )?function generateStaticParams\(/m);
  });
});
