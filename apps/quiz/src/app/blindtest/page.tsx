import { BlindtestGame } from '@/components/blind-test/blindtest-game';
import { getBlindtestGroups } from '@/lib/db/queries/blindtest';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'K-pop Blind Test - Name the Song from a 10s Clip',
  description:
    'Play the K-pop blind test: 10 song clips, 10 seconds each. Guess the song or artist from BTS, BLACKPINK, NewJeans, aespa and 240+ acts. Pick All K-pop, a generation, or your group.',
  alternates: { canonical: '/blindtest' },
  openGraph: {
    title: 'K-pop Blind Test - Name the Song from a 10s Clip',
    description: 'Guess the K-pop song or artist from a 10-second clip. 10 rounds, every generation.',
    url: '/blindtest',
  },
};

// Re-derive the offerable group list from the live catalog hourly.
export const revalidate = 3600;

export default async function BlindtestPage(): Promise<React.ReactElement> {
  const groups = await safeFetch(getBlindtestGroups(), [], '[blindtest] getBlindtestGroups');
  return <BlindtestGame groups={groups} />;
}
