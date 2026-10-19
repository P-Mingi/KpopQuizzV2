// Run O1, lane B1. The root layout's metadata and viewport, by site.
//
// kpop keeps exactly the object app/layout.tsx holds today (passed in, returned as it is: the
// kpop build renders the same bytes). anime and hub get a root that carries their own brand only:
// no K-pop description, keywords, authors, Pinterest verification tag or kpop origin
// (F0 report, slice 13: the spike layout had to reset them; this removes the need).

import { KPOP_THEME_COLOR } from './kpop';
import { SITE } from './registry';

import type { Metadata, Viewport } from 'next';
import type { SiteConfig } from './types';

/**
 * The root metadata of `site`. `kpopMetadata` is the kpop object of app/layout.tsx, returned
 * untouched on the kpop build; every other site gets a root built from its registry entry.
 */
export function siteRootMetadata(kpopMetadata: Metadata, site: SiteConfig = SITE): Metadata {
  if (site.id === 'kpop') return kpopMetadata;
  const image = { url: site.brand.ogTemplate, width: 1200, height: 630, alt: site.brand.name };
  return {
    metadataBase: new URL(site.url),
    title: { default: site.brand.name, template: site.seo.titleTemplate },
    formatDetection: { telephone: false },
    openGraph: { type: 'website', siteName: site.brand.name, images: [image] },
    twitter: { card: 'summary_large_image', images: [site.brand.ogTemplate] },
    icons: { icon: [{ url: site.brand.favicon, type: 'image/svg+xml' }] },
    manifest: '/site.webmanifest',
  };
}

/** The root viewport: kpop keeps its two literals, the others use the `page` token of their theme. */
export function siteViewport(site: SiteConfig = SITE): Viewport {
  const light = site.id === 'kpop' ? KPOP_THEME_COLOR.light : site.theme.light.page ?? KPOP_THEME_COLOR.light;
  const dark = site.id === 'kpop' ? KPOP_THEME_COLOR.dark : site.theme.dark.page ?? KPOP_THEME_COLOR.dark;
  return {
    colorScheme: 'light dark',
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: light },
      { media: '(prefers-color-scheme: dark)', color: dark },
    ],
  };
}
