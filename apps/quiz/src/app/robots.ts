import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // OG image endpoints (/api/og/*) stay crawlable so Google + social can
        // fetch link-preview images; the rest of /api is blocked. Longest-match
        // wins, so the /api/og/ allow overrides the /api/ disallow.
        userAgent: '*',
        allow: ['/', '/api/og/'],
        disallow: ['/api/', '/auth/'],
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'Bytespider',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'cohere-ai',
        allow: '/',
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
    ],
    sitemap: 'https://kpopquiz.org/sitemap.xml',
  };
}
