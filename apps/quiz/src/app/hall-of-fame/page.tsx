import {
  getTopCreatorsThisWeek,
  getTopCreatorsAllTime,
  getTopPlayersByXp,
} from '@/lib/db/queries/profiles';
import { HallOfFameTabs } from './hall-of-fame-tabs';
import { safeFetch } from '@/lib/error-handling';
import { padWeeklyLeaderboard } from '@/lib/weekly-leaderboard-padding';

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
  const [weeklyRaw, allTime, topPlayers] = await Promise.all([
    safeFetch(getTopCreatorsThisWeek(25), [], '[hall-of-fame] getTopCreatorsThisWeek'),
    safeFetch(getTopCreatorsAllTime(25), [], '[hall-of-fame] getTopCreatorsAllTime'),
    safeFetch(getTopPlayersByXp(25), [], '[hall-of-fame] getTopPlayersByXp'),
  ]);

  const weekly = padWeeklyLeaderboard(weeklyRaw, 6);

  return (
    <div style={{ paddingTop: 16, paddingBottom: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--text-tertiary)', marginBottom: 6,
        }}>Hall of Fame</div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800,
          letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0,
        }}>Top fans this week</h1>
        <p style={{
          fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
        }}>
          Earn byeol by playing quizzes, maintaining streaks, and creating content.
        </p>
      </div>

      <HallOfFameTabs weekly={weekly} allTime={allTime} topPlayers={topPlayers} />
    </div>
  );
}
