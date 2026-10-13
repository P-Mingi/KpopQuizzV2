import { UX_STYLESHEET_PATH } from '@/lib/ux-v1/a0/stylesheet-href';

import type { MetadataRoute } from 'next';

// SEO (owner, 2026-10-13): the site-wide v1/v12 stylesheet is served from
// /api/ux-v1/a0/styles. A crawler that renders pages (Googlebot, Bingbot) must be able to
// fetch it, or it sees every page unstyled: the /api/ block below would hide it. Longest
// match wins, so these allows override the /api/ disallow.
const API_RENDER_ALLOW = ['/api/og/', UX_STYLESHEET_PATH];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // OG image endpoints (/api/og/*) stay crawlable so Google + social can
        // fetch link-preview images; the rest of /api is blocked. Longest-match
        // wins, so the /api/og/ allow overrides the /api/ disallow.
        userAgent: '*',
        allow: ['/', ...API_RENDER_ALLOW],
        // SEO P2.2: /admin /settings /onboarding are already noindex, but the
        // generic crawler was still free to crawl them (only the AI-bot rules below
        // blocked them). Disallow them for * too so Googlebot does not spend crawl
        // budget on gated, non-indexable pages.
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/', ...API_RENDER_ALLOW],
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', ...API_RENDER_ALLOW],
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', ...API_RENDER_ALLOW],
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', ...API_RENDER_ALLOW],
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', ...API_RENDER_ALLOW],
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'Bytespider',
        allow: ['/', ...API_RENDER_ALLOW],
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
      {
        userAgent: 'cohere-ai',
        allow: ['/', ...API_RENDER_ALLOW],
        disallow: ['/api/', '/auth/', '/admin/', '/settings/', '/onboarding/'],
      },
    ],
    sitemap: 'https://kpopquiz.org/sitemap.xml',
  };
}
