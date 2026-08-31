import Link from 'next/link';

import { getPersonalityGroupTiles } from '@/lib/personality/data';
import { PersonalityHubSection } from '@/components/personality/personality-entry';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

// Workstream P: the personality-quiz index (the "Which member are you?" mode
// card on /games links here). Lists every group with a tile + member-face strip.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Which K-pop Member Are You? Personality Quizzes',
  description:
    'Free K-pop personality quizzes: 10 questions, 1 result. Find out which member of BTS, Stray Kids, SEVENTEEN, aespa, and more you match. Pick a group and go.',
  alternates: { canonical: '/personality' },
  openGraph: {
    title: 'Which K-pop Member Are You?',
    description: '10 questions, 1 result. Find your member match across 15 groups.',
    url: '/personality',
  },
};

export default async function PersonalityIndexPage(): Promise<React.ReactElement> {
  const tiles = await safeFetch(getPersonalityGroupTiles(), [], '[personality-index] tiles');

  return (
    <div className="pq" style={{ paddingTop: 8 }}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Games', href: '/games' }, { label: 'Which member are you?' }]} />
      <p className="pq-eyebrow" style={{ ['--pq-accent' as string]: 'var(--brand)', marginTop: 10 }}>Personality quiz</p>
      <h1 className="pq-title">Which K-pop member are you?</h1>
      <p className="pq-sub">Pick your group. 10 questions, 1 result. Then see how you compare with other fans.</p>
      {tiles.length > 0 ? (
        <PersonalityHubSection tiles={tiles} />
      ) : (
        <p className="pq-sub">No personality quizzes yet. Check back soon.</p>
      )}
      <div style={{ marginTop: 22 }}>
        <Link href="/games" className="pq-ghost">Back to all games</Link>
      </div>
    </div>
  );
}
