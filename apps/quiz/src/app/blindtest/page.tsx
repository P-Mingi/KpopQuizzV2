import { BlindtestGame } from '@/components/blind-test/blindtest-game';

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

export default function BlindtestPage(): React.ReactElement {
  return <BlindtestGame />;
}
