import {
  getTopCreatorsThisWeek,
  getTopCreatorsAllTime,
  getTopPlayersByXp,
} from '@/lib/db/queries/profiles';
import { LeaderboardTabs } from '@/app/(site)/leaderboard/leaderboard-tabs';
import { safeFetch } from '@/lib/error-handling';
import { padWeeklyLeaderboard } from '@/lib/weekly-leaderboard-padding';

import type { Metadata } from 'next';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Ranking de K-pop - Top Fas e Criadores',
  description:
    'Os melhores criadores e jogadores de quiz de K-pop do kpopquiz.org. Veja quem esta em alta esta semana e quem chegou ao nivel Lenda.',
  alternates: {
    canonical: '/pt/leaderboard',
    languages: {
      en: '/leaderboard',
      'pt-BR': '/pt/leaderboard',
      'x-default': '/leaderboard',
    },
  },
  openGraph: {
    title: 'Ranking de K-pop | KpopQuiz',
    description: 'Top criadores e jogadores de K-pop no kpopquiz.org.',
    url: '/pt/leaderboard',
    locale: 'pt_BR',
  },
};

export default async function PtLeaderboardPage(): Promise<React.ReactElement> {
  const [weeklyRaw, allTime, topPlayers] = await Promise.all([
    safeFetch(getTopCreatorsThisWeek(25), [], '[pt/leaderboard] getTopCreatorsThisWeek'),
    safeFetch(getTopCreatorsAllTime(25), [], '[pt/leaderboard] getTopCreatorsAllTime'),
    safeFetch(getTopPlayersByXp(25), [], '[pt/leaderboard] getTopPlayersByXp'),
  ]);

  const weekly = padWeeklyLeaderboard(weeklyRaw, 6);

  return (
    <div style={{ paddingTop: 16, paddingBottom: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 18 }}>
        <div style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.12em', color: 'var(--txt3)', marginBottom: 6,
        }}>Ranking</div>
        <h1 className="font-display" style={{
          fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 800,
          letterSpacing: '-0.025em', lineHeight: 1.05, margin: 0,
        }}>Top fas esta semana</h1>
        <p style={{
          fontSize: 13, color: 'var(--txt2)', marginTop: 8, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto',
        }}>
          Ganhe XP jogando quizzes, mantendo sequencias e criando conteudo.
        </p>
      </div>

      <LeaderboardTabs weekly={weekly} allTime={allTime} topPlayers={topPlayers} />
    </div>
  );
}
