// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/leaderboard/page.tsx, rows 35: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { CommunityContent } from '@/components/community/community-content';
import { LeaderboardV11 } from '@/components/leaderboard/ux-v1/leaderboard';
import { UX_V1 } from '@/lib/ux-v1';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';
import { siteAddress } from '@/lib/site/brand';
import { SITE } from '@/lib/site/registry';

import type { Metadata } from 'next';

// ISR: the community hub serves cached HTML between hits. Public sections are
// baked here; personal bits (Your standing, follow buttons) are client islands,
// so the page stays static/ISR + crawlable.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Anime Leaderboard: Who Wins This Week',
  description: 'See the top players of the week, watch what fans are playing right now, and follow the top quiz creators.',
  openGraph: { title: 'Community | OtakuQuiz', description: `The top players, a live feed of what fans are playing, and the top creators on ${siteAddress(SITE)}.`, url: '/leaderboard', images: [DEFAULT_OG_IMAGE] },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/leaderboard' },
};

// V-UPGRADE-1 Phase B: the Play-world Community route. Content lives in the
// world-agnostic <CommunityContent> so the Verse route renders the identical
// community under Verse chrome. This route stays the SEO canonical (/leaderboard).
export default function CommunityPage(): React.ReactElement {
  // UX v11 (NEXT_PUBLIC_UX_V1, default off): the leaderboard redesign. Same
  // metadata, canonical, H1 and intro; flag off renders CommunityContent as before.
  if (UX_V1) return <LeaderboardV11 />;
  return <CommunityContent />;
}
