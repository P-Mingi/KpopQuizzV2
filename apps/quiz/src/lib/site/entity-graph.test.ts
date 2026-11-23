// SEO-LAUNCH-1, lane C: the entity graph of the network (stable @ids, Bunnyverse as parent, one WebSite per site with its publisher, no sameAs between the sites) and the /about page of the hub.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { HUB_ABOUT_ANSWER, HUB_ABOUT_DESCRIPTION, HUB_ABOUT_TITLE } from './hub/about';

const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function onSite<T>(site: 'anime' | 'hub', load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return load();
}

describe('the entity graph', () => {
  it('Bunnyverse is the parent: stable @id, no child named in its own markup, no sameAs', async () => {
    const { organizationJsonLdFor, websiteJsonLdFor, HUB_ORGANIZATION_ID } = await onSite('hub', () => import('./jsonld'));
    expect(HUB_ORGANIZATION_ID).toBe('https://bunnyverse.org/#organization');
    const org = organizationJsonLdFor();
    expect(org['@id']).toBe(HUB_ORGANIZATION_ID);
    expect(org).not.toHaveProperty('parentOrganization');
    expect(org).not.toHaveProperty('sameAs');
    const site = websiteJsonLdFor('x');
    expect(site['@id']).toBe('https://bunnyverse.org/#website');
    expect(site.publisher).toEqual({ '@id': HUB_ORGANIZATION_ID });
  });

  it('OtakuQuiz has its own @id and names Bunnyverse as parent', async () => {
    const { organizationJsonLdFor, HUB_ORGANIZATION_ID } = await onSite('anime', () => import('./jsonld'));
    const org = organizationJsonLdFor();
    expect(org['@id']).toBe('https://bunnyverse.org/anime/#organization');
    // SEO-LAUNCH-1 review fix 10: the parent is an inline Organization (type, id, name, url), not a bare @id reference.
    expect(org.parentOrganization).toEqual({ '@type': 'Organization', '@id': HUB_ORGANIZATION_ID, name: 'Bunnyverse', url: 'https://bunnyverse.org' });
    expect(org).not.toHaveProperty('sameAs');
  });

  it('kpopquiz.org has its own @id, names Bunnyverse as parent and keeps its own profiles only', async () => {
    const { organizationJsonLd, ORGANIZATION_ID, WEBSITE_ID } = await import('@/lib/seo/org');
    const org = organizationJsonLd();
    expect(ORGANIZATION_ID).toBe('https://kpopquiz.org/#organization');
    expect(WEBSITE_ID).toBe('https://kpopquiz.org/#website');
    expect(org['@id']).toBe(ORGANIZATION_ID);
    expect(org.parentOrganization).toEqual({ '@type': 'Organization', '@id': 'https://bunnyverse.org/#organization', name: 'Bunnyverse', url: 'https://bunnyverse.org' });
    expect(JSON.stringify(org.sameAs)).not.toMatch(/bunnyverse|otakuquiz/i);
  });

  it('the daily games name the publisher by @id only', async () => {
    const { gameJsonLd } = await import('@/lib/dle/seo');
    for (const locale of ['en', 'fr'] as const) {
      expect(gameJsonLd('kpopdle-idol', locale).publisher).toEqual({ '@id': 'https://bunnyverse.org/#organization' });
    }
  });
});

describe('the /about page of the hub', () => {
  it('title 60 or fewer with the suffix, description 120 to 160, answer block 40 to 60 words, no dash, no digit', () => {
    expect(HUB_ABOUT_TITLE.length + ' | Bunnyverse'.length).toBeLessThanOrEqual(60);
    expect(HUB_ABOUT_DESCRIPTION.length).toBeGreaterThanOrEqual(120);
    expect(HUB_ABOUT_DESCRIPTION.length).toBeLessThanOrEqual(160);
    const words = HUB_ABOUT_ANSWER.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(40);
    expect(words).toBeLessThanOrEqual(60);
    for (const t of [HUB_ABOUT_TITLE, HUB_ABOUT_DESCRIPTION, HUB_ABOUT_ANSWER, read('../../components/hub/about/hub-about.tsx')]) {
      expect(t).not.toMatch(DASHES);
    }
    expect(`${HUB_ABOUT_TITLE}${HUB_ABOUT_DESCRIPTION}${HUB_ABOUT_ANSWER}`).not.toMatch(/\d/);
  });

  it('is served by the hub, linked from the footers, and carries its trust sections', async () => {
    const { hubRouteAllow } = await import('./registry');
    expect(hubRouteAllow({ dailyGuess: true }, false)).toContain('/about');
    expect(read('../../components/hub/home/home-footer.tsx')).toContain('href="/about"');
    expect(read('../../components/hub/dle/dle-chrome.tsx')).toContain("withBasePath('/about')");
    const html = read('../../components/hub/about/hub-about.tsx');
    for (const h of ['What is Bunnyverse for?', 'Who makes Bunnyverse?', 'How is the content made?', 'Who are the Team accounts?', 'How can I contact you?']) expect(html).toContain(h);
    expect(html).toContain('/editorial-policy');
  });

  it('is in the sitemap of the hub with its own date', async () => {
    const { HUB_ABOUT_UPDATED, HUB_ABOUT_PATH } = await import('./hub/about');
    expect(HUB_ABOUT_PATH).toBe('/about');
    expect(HUB_ABOUT_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(read('./root-files.ts')).toContain('path: HUB_ABOUT_PATH, lastModified: new Date(`${HUB_ABOUT_UPDATED}T00:00:00Z`)');
  });
});
