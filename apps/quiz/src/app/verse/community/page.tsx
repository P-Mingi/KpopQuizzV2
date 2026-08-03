import { CommunityContent } from '@/components/community/community-content';

import type { Metadata } from 'next';

// V-UPGRADE-1 Phase B: the Verse mirror of Community. Renders the exact same
// <CommunityContent> as /leaderboard, but its /verse path makes the chrome resolve
// to Verse (violet nav/footer/toggle) - so reaching Community from Verse never
// bounces you to Play. SEO: the canonical points back to the Play original
// (/leaderboard) so Google consolidates the two URLs to one; the mirror is kept
// OUT of the sitemap (sitemap.ts is an allow-list; this path is simply not added).
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Community',
  description: 'See which K-pop fandom is winning the week on the fandom war map, watch the live feed of what fans are playing right now, and follow the top creators on kpopquiz.org.',
  alternates: { canonical: '/leaderboard' },
};

export default function VerseCommunityPage(): React.ReactElement {
  return <CommunityContent />;
}
