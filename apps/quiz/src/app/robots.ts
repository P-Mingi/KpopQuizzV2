import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // SEO Fix 5: only block non-content endpoints. Auth/account/admin PAGES
      // are intentionally crawlable so Google can read their `noindex` meta and
      // drop them from the index (a robots Disallow blocks crawling, not
      // indexing, which is why /login stayed indexed).
      disallow: ['/api/', '/auth/'],
    },
    sitemap: 'https://kpopquiz.org/sitemap.xml',
  };
}
