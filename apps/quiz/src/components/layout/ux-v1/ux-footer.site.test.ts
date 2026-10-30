// Run O1, lane O1: the v11 footer follows the site's registry. kpop renders the markup it rendered before this change (the
// files of __o1_kpop_footer__/, written ONCE from the base commit da33e52, never from the head: a plain run compares); anime
// and hub show no kpop top groups, no /stats, no Discord, no Reddit, no locale switch and no kpop brand or genre word.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/quizzes' }));

const SNAPSHOT = './__o1_kpop_footer__/footer.html';
// The copy gate counts the copyright sign as a pictograph: snapshots store it as an entity (the render is unchanged).
const noPicto = (html: string): string => html.replace(/\u00A9/g, '&#169;');

async function footer(site: 'kpop' | 'anime' | 'hub', showFandoms = true): Promise<string> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const { UxFooter } = await import('./ux-footer');
  return renderToString(h(UxFooter, { showFandoms, year: 2026 }));
}

/** The href of every <a> of the markup (not the preload <link> of the brand image). */
const anchorHrefs = (html: string): string[] => [...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1]!);

const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('UxFooter', () => {
  it('kpop: the markup of the base commit, with and without the Fandoms link', async () => {
    const withFandoms = await footer('kpop', true);
    const without = await footer('kpop', false);
    await expect(noPicto(withFandoms)).toMatchFileSnapshot(SNAPSHOT);
    await expect(noPicto(without)).toMatchFileSnapshot('./__o1_kpop_footer__/footer-no-fandoms.html');
  });

  for (const site of ['anime', 'hub'] as const) {
    it(`${site}: no kpop top groups, stats, Discord, Reddit, locale switch, brand or genre word`, async () => {
      const html = await footer(site, true);
      expect(html).toContain('<footer');
      expect(html).not.toMatch(/Top groups|-quiz"|\/stats|discord|reddit|Kpop_Verse|\/pt|Portugu/i);
      expect(html).not.toMatch(/KpopQuiz|kpopquiz|K-?pop/i);
      expect(html).not.toMatch(DASHES);
    });
  }

  it('anime: its own brand in the copyright line and links only to its own routes', async () => {
    const html = await footer('anime', true);
    expect(html).toContain('OtakuQuiz');
    const hrefs = anchorHrefs(html);
    for (const bad of ['/blindtest/ranked', '/data/pulse', '/data/knowledge-report-2026', '/articles', '/news', '/verse', '/groups']) {
      expect(hrefs, bad).not.toContain(bad);
    }
    for (const good of ['/quizzes', '/series', '/trivia', '/leaderboard', '/community', '/create', '/privacy', '/terms', '/about']) {
      expect(hrefs, good).toContain(good);
    }
  });

  it('hub: only the links of its route map', async () => {
    const html = await footer('hub', true);
    const hrefs = anchorHrefs(html).filter((x) => x.startsWith('/'));
    // Daily games step 2: /credits joined the hub's route map (twins row H-11), so its footer link (shown where the route exists) appears.
    for (const x of hrefs) expect(['/', '/privacy', '/legal', '/passport', '/login', '/directory', '/credits'], x).toContain(x);
    expect(hrefs).toContain('/privacy');
    expect(hrefs).toContain('/legal');
    expect(hrefs).toContain('/credits');
  });
});
