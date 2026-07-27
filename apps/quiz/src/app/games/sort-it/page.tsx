import Link from 'next/link';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getSortItItems } from '@/lib/db/queries/sort-it';
import { SORT_IT_PLAYLISTS } from '@/lib/games/sort-it';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'K-pop Sort It: Fast Group Sorting Quizzes',
  description:
    'Sort real K-pop groups into two buckets against the clock. Boy group or girl group, 3rd gen or 4th gen, and more. Free, no sign-up, tap or swipe.',
  openGraph: {
    title: 'K-pop Sort It | KpopQuiz',
    description: 'Fast binary sorting quizzes over real K-pop groups. Tap or swipe, beat your time.',
    url: '/games/sort-it',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/games/sort-it' },
};

export default async function SortItIndexPage(): Promise<React.ReactElement> {
  // Real counts per playlist, baked at ISR. A playlist below the gate returns
  // [] from getSortItItems and is simply omitted from the index.
  const withCounts = await Promise.all(
    SORT_IT_PLAYLISTS.map(async (p) => ({
      playlist: p,
      count: (await safeFetch(getSortItItems(p.slug), [], `[sort-it index] ${p.slug}`)).length,
    })),
  );
  const live = withCounts.filter((x) => x.count > 0);

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'K-pop Sort It',
    url: 'https://kpopquiz.org/games/sort-it',
    description:
      'Fast binary sorting quizzes over real K-pop groups: boy group or girl group, 3rd gen or 4th gen, and more.',
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
  };

  return (
    <div className="si-wrap">
      <Breadcrumbs items={[{ label: 'Games', href: '/games' }, { label: 'Sort It' }]} />
      <header className="si-idx-head">
        <span className="si-eyebrow">Sort It</span>
        <h1 className="si-title">K-pop Sorting Quizzes</h1>
        <p className="si-blurb">
          Two buckets, one stack of real K-pop groups, and a running clock. Tap a side, swipe, or use the
          arrow keys. How fast can you sort them all?
        </p>
      </header>

      <ul className="si-idx-grid">
        {live.map(({ playlist, count }) => (
          <li key={playlist.slug}>
            <Link href={`/games/sort-it/${playlist.slug}`} className="si-idx-card">
              <span className="si-idx-q">{playlist.question}</span>
              <span className="si-idx-buckets">
                <span className="si-chip">{playlist.buckets[0]}</span>
                <span className="si-vs">vs</span>
                <span className="si-chip">{playlist.buckets[1]}</span>
              </span>
              <span className="si-idx-foot">
                <span className="si-idx-stat">{count} to sort</span>
                <span className="si-idx-play">Play {'→'}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
