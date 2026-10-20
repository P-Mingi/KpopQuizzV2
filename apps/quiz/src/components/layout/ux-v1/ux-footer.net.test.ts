// Run O1, lot (c), lane B6: the network line of the shared footer (link-allowlist.json "footer": kpop and anime to the hub
// home, followed, no query, at most one per page). Off by default: the markup of the base commit is pinned by
// ux-footer.site.test.ts (kpop) and, here, by comparing flag off to a footer without the line.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/quizzes' }));

async function footer(site: 'kpop' | 'anime' | 'hub', flag: string | null): Promise<string> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  if (flag !== null) vi.stubEnv('NEXT_PUBLIC_NET_FOOTER', flag);
  const { UxFooter } = await import('./ux-footer');
  return renderToString(h(UxFooter, { showFandoms: true, year: 2026 }));
}

const hubLinks = (html: string): string[] => [...html.matchAll(/<a\b[^>]*?\bhref="(https?:\/\/fanquiz\.org[^"]*)"[^>]*>/g)].map((m) => m[0]);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('UxFooter network line', () => {
  for (const site of ['kpop', 'anime', 'hub'] as const) {
    it(`${site}: flag off or any value but 1 or true: no link to the network, same markup`, async () => {
      const off = await footer(site, null);
      expect(hubLinks(off)).toEqual([]);
      expect(await footer(site, '0')).toBe(off);
      expect(await footer(site, 'yes')).toBe(off);
    });
  }
  for (const site of ['kpop', 'anime'] as const) {
    it(`${site}: flag on: exactly one followed link to the hub home, no query`, async () => {
      const html = await footer(site, '1');
      const links = hubLinks(html);
      expect(links).toHaveLength(1);
      expect(links[0]).toMatch(/^<a href="https:\/\/fanquiz\.org\/">$/);
      expect(html).not.toMatch(/[–—]/);
      expect(await footer(site, 'true')).toBe(html);
    });
  }
  it('hub: flag on adds nothing', async () => {
    expect(await footer('hub', '1')).toBe(await footer('hub', null));
  });
  it('kpop with the flag on only adds the line to the markup of the flag off', async () => {
    const on = await footer('kpop', '1');
    const off = await footer('kpop', null);
    expect(on.length).toBeGreaterThan(off.length);
    expect(on.replace(/<div class="ux-ftop"><b>[^<]*<\/b><a href="https:\/\/fanquiz\.org\/">[^<]*<\/a><\/div>/, '')).toBe(off);
  });
});
