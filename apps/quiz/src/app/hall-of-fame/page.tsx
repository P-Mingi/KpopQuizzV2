import {
  getTopCreatorsThisWeek,
  getTopCreatorsAllTime,
  getTopPlayersByXp,
} from '@/lib/db/queries/profiles';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { HallOfFameTabs } from './hall-of-fame-tabs';
import { safeFetch } from '@/lib/error-handling';
import { getAvatarColors } from '@/lib/utils';

import type { Metadata } from 'next';
import type { TopCreator } from '@/lib/db/types';

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

// Pool of fake usernames that look like real K-pop fan accounts
const FAKE_USERS = [
  'moa_hana', 'stay_soojin', 'blink_yuna', 'once_mina', 'atiny_jisoo',
  'carat_yeji', 'engene_ryu', 'my_winter', 'orbit_hyein', 'nevie_soyeon',
  'midzy_lia', 'fearnot_yuna', 'kwangya_fan', 'dereve_minji', 'diver_hanni',
  'shawol_key', 'army_jin', 'exol_kai', 'reveal_juyeon', 'melody_btob',
  'inner_circle', 'moomoo_solar', 'nctzen_mark', 'universe_iu', 'luvity_wony',
];

/** Simple seeded PRNG to get deterministic numbers per week. */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function getIsoWeek(): number {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - jan1.getTime()) / 86400000);
  return Math.ceil((days + jan1.getDay() + 1) / 7) + now.getFullYear() * 100;
}

function padWeeklyLeaderboard(real: TopCreator[], minEntries: number): TopCreator[] {
  if (real.length >= minEntries) return real;

  const week = getIsoWeek();
  const rand = seededRand(week);

  // Shuffle fake pool deterministically, pick ones not colliding with real usernames
  const realUsernames = new Set(real.map((c) => c.username));
  const available = FAKE_USERS
    .map((u) => ({ u, sort: rand() }))
    .sort((a, b) => a.sort - b.sort)
    .map((x) => x.u)
    .filter((u) => !realUsernames.has(u));

  // Lowest real play count (or 46 if no real data)
  const lowestReal = real.length > 0
    ? Math.min(...real.map((c) => c.weekly_plays))
    : 46;

  const needed = minEntries - real.length;
  const fakes: TopCreator[] = [];

  for (let i = 0; i < needed && i < available.length; i++) {
    const username = available[i]!;
    const colors = getAvatarColors(username);
    // Play count between 2 and min(46, lowestReal), decreasing for lower ranks
    const maxPlays = Math.min(46, lowestReal);
    const plays = Math.max(2, Math.round(2 + rand() * (maxPlays - 2)));
    const quizzes = Math.max(1, Math.round(1 + rand() * 7));
    fakes.push({
      username,
      avatar_url: null,
      avatar_bg: colors.bg,
      avatar_text: colors.text,
      total_quizzes_created: quizzes,
      weekly_plays: plays,
    });
  }

  // Sort fakes by plays descending, then merge after real entries
  fakes.sort((a, b) => b.weekly_plays - a.weekly_plays);
  return [...real, ...fakes];
}

export default async function HallOfFamePage(): Promise<React.ReactElement> {
  const [weeklyRaw, allTime, topPlayers] = await Promise.all([
    safeFetch(getTopCreatorsThisWeek(25), [], '[hall-of-fame] getTopCreatorsThisWeek'),
    safeFetch(getTopCreatorsAllTime(25), [], '[hall-of-fame] getTopCreatorsAllTime'),
    safeFetch(getTopPlayersByXp(25), [], '[hall-of-fame] getTopPlayersByXp'),
  ]);

  const weekly = padWeeklyLeaderboard(weeklyRaw, 6);

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
