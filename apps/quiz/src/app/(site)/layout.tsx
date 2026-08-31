import { Suspense } from 'react';

import { TopNav } from '@/components/layout/top-nav';
import { TopNavSkeleton } from '@/components/layout/top-nav-skeleton';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { MobileTopBar } from '@/components/layout/mobile-top-bar';
import { Footer } from '@/components/layout/footer';
import { SiteFooter } from '@/components/layout/site-footer';
import { SOCIAL_LINKS } from '@kpopquiz/shared/social-links';

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
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'KpopQuiz',
            url: 'https://kpopquiz.org',
            logo: 'https://kpopquiz.org/logo-512.png',
            sameAs: [
              SOCIAL_LINKS.reddit.url,
              SOCIAL_LINKS.discord.invite,
              SOCIAL_LINKS.pinterest.url,
              SOCIAL_LINKS.tiktok.url,
              SOCIAL_LINKS.youtube.url,
              SOCIAL_LINKS.instagram.url,
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SiteNavigationElement',
            name: 'Main Navigation',
            hasPart: [
              { '@type': 'WebPage', name: 'Quizzes', url: 'https://kpopquiz.org/quizzes' },
              { '@type': 'WebPage', name: 'Games', url: 'https://kpopquiz.org/games' },
              { '@type': 'WebPage', name: 'Blind Test', url: 'https://kpopquiz.org/blindtest' },
              { '@type': 'WebPage', name: 'Leaderboard', url: 'https://kpopquiz.org/leaderboard' },
              { '@type': 'WebPage', name: 'Trivia', url: 'https://kpopquiz.org/trivia' },
              { '@type': 'WebPage', name: 'Rankings', url: 'https://kpopquiz.org/rankings' },
            ],
          }),
        }}
      />
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
  );
}
