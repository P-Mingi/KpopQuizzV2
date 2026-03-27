import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/login', '/onboarding', '/settings', '/admin', '/auth/'],
    },
    sitemap: 'https://kpopquiz.org/sitemap.xml',
  };
}
