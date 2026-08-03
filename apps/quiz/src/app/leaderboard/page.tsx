import { CommunityContent } from '@/components/community/community-content';

import type { Metadata } from 'next';

// ISR: the community hub serves cached HTML between hits. Public sections are
// baked here; personal bits (Your standing, follow buttons) are client islands,
// so the page stays static/ISR + crawlable.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Community',
  description: 'See which K-pop fandom is winning the week on the fandom war map, watch the live feed of what fans are playing right now, and follow the top creators on kpopquiz.org.',
  openGraph: { title: 'Community | KpopQuiz', description: 'The fandom war map, a live feed of what fans are playing, and the top creators on kpopquiz.org.', url: '/leaderboard' },
  twitter: { card: 'summary_large_image' },
  alternates: {
    canonical: '/leaderboard',
    languages: { en: '/leaderboard', 'pt-BR': '/pt/leaderboard', 'x-default': '/leaderboard' },
  },
};

// V-UPGRADE-1 Phase B: the Play-world Community route. Content lives in the
// world-agnostic <CommunityContent> so the Verse route renders the identical
// community under Verse chrome. This route stays the SEO canonical (/leaderboard).
export default function CommunityPage(): React.ReactElement {
  return <CommunityContent />;
}
