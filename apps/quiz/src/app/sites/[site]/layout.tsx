// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/layout.tsx, rows 28, H-0: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { jsonLdString } from '@/lib/seo/json-ld';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import type { Metadata } from 'next';

import { SITE, SITE_ID } from '@/lib/site/registry';
import { robotsFor } from '@/lib/site/indexing';
import { isServedSite, siteStaticParams } from '@/lib/site/routing';

import { TopNav } from '@/components/layout/top-nav';
import { TopNavSkeleton } from '@/components/layout/top-nav-skeleton';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { Footer } from '@/components/layout/footer';
import { MobileTopBar, SiteFooter } from '@/components/layout/legacy-chrome-islands';
import { organizationJsonLdFor, siteNavigationJsonLd } from '@/lib/site/jsonld';
import { UX_V1 } from '@/lib/ux-v1';
// The v11 shell's client code is code-split inside UxShell (UxShellLoader), so
// flag-off pages never download it; only a tiny loader sits in this layout's bundle.
import { UxShell } from '@/components/layout/ux-v1/ux-shell';
// Run O1, lane O2: the series art. register-art fills the SERIES_ART slot of lib/ux-v1/a0/group-photos.ts in the server graph, ArtRegistry in the
// client graph (first node below, before the shell); no shared component imports the art. Anime-only modules: this layout is not kpop's.
import '@/components/anime/register-art';
import { ArtRegistry } from '@/components/anime/art-registry';
import { OwnerPictures } from '@/components/anime/owner-pictures';
// Run O1 (ADM): the owner's own pictures of the series (public.entity_images), read once per render from a cached read and handed to the server
// store and to the ArtRegistry island. Empty on every build but the anime one, and on any failure of the read.
import { primeOwnerSeriesPictures } from '@/lib/anime/entity-images-read';

// RENDER-FIX: the site chrome. Moved OUT of the root layout so the root can drop
// its one dynamic call (await headers() for the embed branch) and let every route
// under (site) keep its declared static/ISR render mode. This layout reads no
// cookies/headers - every chrome component here is cookie-free (auth/user state is
// client islands), so wrapping a route in this chrome does not opt it into dynamic.
//
// /embed lives OUTSIDE this group, under the bare root layout, so an iframe never
// receives this chrome tree - not in the served HTML and not in the RSC payload.
// This replaces the x-pathname header hack, which was the only reason the root
// layout was dynamic.
// Run O1 guard (F0's spike, routes.md): only the build's own site is generated, so nothing under /sites exists on the
// kpop build, and a direct /sites/... request is a 404 on every build.
export const dynamicParams = false;
const NAVIGATION_JSON_LD = siteNavigationJsonLd();
export function generateStaticParams(): { site: string }[] {
  return siteStaticParams();
}
// Closed to crawlers until the owner sets NET_INDEXING=1 (lib/site/indexing.ts); the root layout's kpop fields are reset.
export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { absolute: SITE.brand.name, template: SITE.seo.titleTemplate },
  description: null, keywords: null, authors: null, creator: null, publisher: null,
  openGraph: null, twitter: null, icons: null, manifest: null,
  other: { 'p:domain_verify': [] },
  robots: robotsFor(true),
};

export default async function SiteLayout({ children, params }: { children: React.ReactNode; params: Promise<{ site: string }> }): Promise<React.ReactElement> {
  const { site } = await params;
  if (!isServedSite(site)) notFound();
  const owner = SITE_ID === 'anime' ? await primeOwnerSeriesPictures() : undefined;
  return (
    <>
      <ArtRegistry />
      {owner ? <OwnerPictures owner={owner} /> : null}
      {/* Site-wide JSON-LD lives with the chrome (moved from the root layout), so
          /embed - which is outside this group - never carries these nav labels. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // The Organization of this site: its registry name, host and logo (lib/site/jsonld.ts). The founder and the
          // sameAs profiles of lib/seo/org.ts are kpopquiz.org's and stay on the kpop layout.
          __html: jsonLdString(organizationJsonLdFor()),
        }}
      />
      {(NAVIGATION_JSON_LD.hasPart as readonly unknown[]).length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // Main Navigation: the links of the features this site has (lib/site/jsonld.ts). The hub has none: no empty element.
            __html: jsonLdString(NAVIGATION_JSON_LD),
          }}
        />
      ) : null}
      {/* UX v1 shell behind NEXT_PUBLIC_UX_V1. Flag-off renders the EXISTING chrome
          byte-identical; the site-wide JSON-LD above is shared by both, so search
          engines read the same markup either way (contract rule 2). */}
      {UX_V1 ? (
        <UxShell>{children}</UxShell>
      ) : (
        <>
          <div className="flex flex-col min-h-screen">
            <Suspense fallback={<TopNavSkeleton />}>
              <TopNav />
            </Suspense>
            <MobileTopBar />
            <main className="flex-1 w-full max-w-[720px] mx-auto px-4 sm:px-0 pb-24 md:pb-8">
              {children}
            </main>
            <SiteFooter play={<Footer />} />
          </div>
          <MobileTabBar />
        </>
      )}
    </>
  );
}
