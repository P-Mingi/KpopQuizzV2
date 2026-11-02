// CR-021: /credits of kpopquiz.org. The idol and group pictures that need a credit (CC BY, CC BY-SA), filled from the stored rows; a 404 like any
// unknown URL while there are none; noindex; its own class prefix and words; no word of the hub. The reads are stand-ins; no network.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const reads = vi.hoisted(() => ({ pictures: [] as unknown[] }));
vi.mock('@/lib/photos/public-read', () => ({ getPublicPictures: async () => reads.pictures }));
vi.mock('@/styles/kpop/credits.css', () => ({}));

import { KNOWN_ROUTES } from '@/lib/route-allowlist';

import * as page from './page';

const pic = (kind: string, slug: string, name: string, over: Record<string, unknown> = {}): Record<string, unknown> => ({
  site: 'kpop', kind, slug, url: `https://s/${slug}.webp`, thumb: `https://s/${slug}-96.webp`, position: '50% 40%', name, needsCredit: true,
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:A.jpg', author: 'Jane Doe', license: 'cc_by_sa', licenseNote: null, licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', updatedAt: '2026-11-02T00:00:00Z', ...over,
});

beforeEach(() => { reads.pictures = []; });

describe('/credits on kpopquiz.org', () => {
  it('is a 404 while no idol or group picture needs a credit, whatever else is stored', async () => {
    await expect(page.default()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
    // A picture that needs no credit, a series (OtakuQuiz's) and an agency (the hub's) are none of its business.
    reads.pictures = [pic('idol', '1', 'Ana', { needsCredit: false, author: null, license: null, sourceUrl: null }), pic('series', 'one-piece', 'One Piece'), pic('agency', '9', 'JYP')];
    await expect(page.default()).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/);
  });

  it('lists the idols and groups that need a credit: name, author, licence with its exact link, source page', async () => {
    reads.pictures = [pic('idol', '2', 'Zoe'), pic('idol', '1', 'Ana', { licenseUrl: null }), pic('group', '7', 'NCT WISH', { license: 'cc_by', licenseUrl: 'https://creativecommons.org/licenses/by/4.0' }), pic('series', 'one-piece', 'One Piece')];
    const html = renderToStaticMarkup(await page.default());
    expect(html).toContain('class="ux-page ux-col ux-pg kpop-credits"');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html.indexOf('Ana')).toBeLessThan(html.indexOf('Zoe'));
    expect(html).toContain('>Idols</h2>');
    expect(html).toContain('>Groups</h2>');
    expect(html).not.toContain('One Piece');
    expect(html).toContain('Photo: <a href="https://commons.wikimedia.org/wiki/File:A.jpg"');
    expect(html).toContain('href="https://creativecommons.org/licenses/by/4.0"');
    expect(html).toContain('href="https://creativecommons.org/licenses/by-sa/4.0"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('KpopQuiz');
    expect(html).not.toMatch(new RegExp(`Bunnyverse|[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`));
  });

  it('is noindex, canonical, and a known route of the kpop middleware', () => {
    expect(page.metadata.robots).toEqual({ index: false, follow: true });
    expect(page.metadata.alternates).toEqual({ canonical: '/credits' });
    expect(String(page.metadata.description).length).toBeGreaterThanOrEqual(120);
    expect(String(page.metadata.description).length).toBeLessThanOrEqual(200);
    expect(KNOWN_ROUTES).toContain('/credits');
  });
});
