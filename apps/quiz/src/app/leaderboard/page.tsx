import {
  getTopCreatorsThisWeek,
  getTopCreatorsAllTime,
  getTopPlayersByXp,
} from '@/lib/db/queries/profiles';
import { LeaderboardTabs } from './leaderboard-tabs';
import { safeFetch } from '@/lib/error-handling';
import { padWeeklyLeaderboard } from '@/lib/weekly-leaderboard-padding';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic'; // build-time prerender skipped; runtime SSR keeps it crawlable

export const metadata: Metadata = {
  title: 'Leaderboard',
  description:
    'The top K-pop quiz creators and players on kpopquiz.org. See who is trending this week and who has reached Legend status.',
  openGraph: {
    title: 'Leaderboard | KpopQuiz',
    description: 'Top creators and players on kpopquiz.org.',
    url: '/leaderboard',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/leaderboard' },
};

export default async function LeaderboardPage(): Promise<React.ReactElement> {
  const [weeklyRaw, allTime, topPlayers] = await Promise.all([
    safeFetch(getTopCreatorsThisWeek(25), [], '[leaderboard] getTopCreatorsThisWeek'),
    safeFetch(getTopCreatorsAllTime(25), [], '[leaderboard] getTopCreatorsAllTime'),
    safeFetch(getTopPlayersByXp(25), [], '[leaderboard] getTopPlayersByXp'),
  ]);

  const weekly = padWeeklyLeaderboard(weeklyRaw, 6);

  return (
    <div style={{ paddingTop: 16, paddingBottom: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--txt3)', marginBottom: 6,
        }}>Leaderboard</div>
        <h1 className="font-display" style={{
          fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800,
          letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0,
        }}>Top fans this week</h1>
        <p style={{
          fontSize: 13, color: 'var(--txt2)', marginTop: 8, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
        }}>
          Earn XP by playing quizzes, maintaining streaks, and creating content.
        </p>
      </div>

      <LeaderboardTabs weekly={weekly} allTime={allTime} topPlayers={topPlayers} />
    </div>
  );
}
