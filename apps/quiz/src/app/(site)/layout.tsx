import { jsonLdString } from '@/lib/seo/json-ld';
import { Suspense } from 'react';

import { TopNav } from '@/components/layout/top-nav';
import { TopNavSkeleton } from '@/components/layout/top-nav-skeleton';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { Footer } from '@/components/layout/footer';
import { MobileTopBar, SiteFooter } from '@/components/layout/legacy-chrome-islands';
import { organizationJsonLd } from '@/lib/seo/org';
import { siteNavigationJsonLd } from '@/lib/site/jsonld';
import { UX_V1 } from '@/lib/ux-v1';
// The v11 shell's client code is code-split inside UxShell (UxShellLoader), so
// flag-off pages never download it; only a tiny loader sits in this layout's bundle.
import { UxShell } from '@/components/layout/ux-v1/ux-shell';

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
export default function SiteLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      {/* Site-wide JSON-LD lives with the chrome (moved from the root layout), so
          /embed - which is outside this group - never carries these nav labels. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Owner, 2026-10-14 (SEO Mission 1): alternateName, contact, the named founder, and
          // sameAs only to the profiles the owner confirmed are live (lib/seo/org.ts).
          __html: jsonLdString(organizationJsonLd()),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Main Navigation: the links of the features this site has (lib/site/jsonld.ts).
          __html: jsonLdString(siteNavigationJsonLd()),
        }}
      />
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
