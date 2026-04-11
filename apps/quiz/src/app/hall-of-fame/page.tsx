import {
  getTopCreatorsThisWeek,
  getTopCreatorsAllTime,
  getTopPlayersByXp,
} from '@/lib/db/queries/profiles';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { HallOfFameTabs } from './hall-of-fame-tabs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hall of Fame',
  description:
    'The top K-pop quiz creators and players on kpopquiz.org. See who is trending this week and who has reached Legend status.',
  openGraph: {
    title: 'Hall of Fame | KpopQuiz',
    description: 'Top creators and players on kpopquiz.org.',
    url: '/hall-of-fame',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/hall-of-fame' },
};

export default async function HallOfFamePage(): Promise<React.ReactElement> {
  const [weekly, allTime, topPlayers] = await Promise.all([
    safeFetch(getTopCreatorsThisWeek(25), [], '[hall-of-fame] getTopCreatorsThisWeek'),
    safeFetch(getTopCreatorsAllTime(25), [], '[hall-of-fame] getTopCreatorsAllTime'),
    safeFetch(getTopPlayersByXp(25), [], '[hall-of-fame] getTopPlayersByXp'),
  ]);

  return (
    <div className="pt-4 md:pt-6 pb-8">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Hall of Fame' },
        ]}
      />

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="var(--combo)" aria-hidden="true">
            <polygon points="10,1 13,7 19,7.8 14.5,12.2 15.8,19 10,15.8 4.2,19 5.5,12.2 1,7.8 7,7" />
          </svg>
          <h1 className="text-[22px] font-bold text-primary">Hall of fame</h1>
        </div>
        <p className="text-xs text-ghost mt-0.5">
          The best creators and players in the fandom.
        </p>
      </div>

      <HallOfFameTabs weekly={weekly} allTime={allTime} topPlayers={topPlayers} />
    </div>
  );
}
