// Run O1, lane O1: the parts of the chrome that named kpopquiz.org whatever the site: the Organization JSON-LD of the anime
// and hub layout, the default origin of the breadcrumb JSON-LD, the alt of the default OG image, the hub directory's
// Open Graph tags, and the /daily handler of the anime group. kpop keeps the values it had.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/queries/quizzes', () => ({ getQuizOfTheDay: async () => ({ slug: 'dn-1' }) }));
vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('next/link', () => ({ default: (p: Record<string, unknown>) => h('a', { href: p.href as string }, p.children as string) }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}), createServerClient: async () => ({}) }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function onSite<T>(site: 'kpop' | 'anime' | 'hub', load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return load();
}

describe('organizationJsonLdFor', () => {
  for (const [site, name, origin, email] of [['anime', 'OtakuQuiz', 'https://bunnyverse.org/anime', 'hello@kpopquiz.org'], ['hub', 'Bunnyverse', 'https://bunnyverse.org', 'hello@kpopquiz.org']] as const) {
    it(`${site}: its own name, host, origin, logo and organization mailbox; no founder, no profile links, no kpop`, async () => {
      const { organizationJsonLdFor } = await onSite(site, () => import('./jsonld'));
      const org = organizationJsonLdFor();
      expect(org).toMatchObject({ '@type': 'Organization', name, url: origin });
      expect(String(org.logo)).toMatch(new RegExp(`^${origin.replace(/[.]/g, '\\.')}/brand/${site}/`));
      expect(org).not.toHaveProperty('founder');
      expect(org).not.toHaveProperty('sameAs');
      // The organization mailbox is the one network mailbox (owner, 2026-10-25), the same on every site.
      expect(org).toHaveProperty('email', email);
      // the one network mailbox (owner, 2026-10-25) is the only kpopquiz.org text allowed
      expect(JSON.stringify(org).replaceAll('hello@kpopquiz.org', '')).not.toMatch(/kpopquiz|discord|reddit/i);
    });
  }
});

describe('Breadcrumbs', () => {
  const ld = (html: string): string => html.slice(html.indexOf('{'), html.lastIndexOf('}') + 1);
  for (const [site, origin] of [['kpop', 'https://kpopquiz.org'], ['anime', 'https://bunnyverse.org/anime']] as const) {
    it(`${site}: the item URLs default to the origin of the site of the build`, async () => {
      const { Breadcrumbs } = await onSite(site, () => import('@/components/ui/breadcrumbs'));
      const html = renderToStaticMarkup(h(Breadcrumbs, { items: [{ label: 'Home', href: '/' }, { label: 'All series' }] }));
      // Bunnyverse (lane 1): the anime home is https://bunnyverse.org/anime, without a trailing slash.
      expect(JSON.parse(ld(html).replace(/&quot;/g, '"')).itemListElement[0].item).toBe(site === 'anime' ? origin : `${origin}/`);
    });
  }
});

describe('DEFAULT_OG_IMAGE', () => {
  it('kpop: today\'s alt', async () => {
    const { DEFAULT_OG_IMAGE } = await onSite('kpop', () => import('@/lib/seo/og'));
    expect(DEFAULT_OG_IMAGE.alt).toBe('KpopQuiz: K-pop quizzes made by fans');
  });
  it('anime: its brand and no genre word', async () => {
    const { DEFAULT_OG_IMAGE } = await onSite('anime', () => import('@/lib/seo/og'));
    expect(DEFAULT_OG_IMAGE.alt).toBe('OtakuQuiz: quizzes made by fans');
  });
});

describe('the hub /directory metadata', () => {
  it('names the hub: Open Graph site name, URL and title, canonical /directory, noindex', async () => {
    const { metadata } = await onSite('hub', () => import('@/app/sites/[site]/(hub)/directory/page'));
    expect(metadata.openGraph).toMatchObject({ siteName: 'Bunnyverse', url: 'https://bunnyverse.org/directory' });
    expect(String((metadata.openGraph as { title: string }).title)).toContain('Bunnyverse');
    expect(metadata.alternates?.canonical).toBe('/directory');
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(JSON.stringify(metadata)).not.toMatch(/kpop/i);
  });
});

describe('the /daily handler of the anime group', () => {
  it('anime: redirects to today\'s quiz', async () => {
    const { GET } = await onSite('anime', () => import('@/app/sites/[site]/(anime)/daily/route'));
    await expect(GET()).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_REDIRECT') });
  });

  it('hub: 404 (a route handler has no layout to guard it)', async () => {
    const { GET } = await onSite('hub', () => import('@/app/sites/[site]/(anime)/daily/route'));
    await expect(GET()).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404') });
  });
});
