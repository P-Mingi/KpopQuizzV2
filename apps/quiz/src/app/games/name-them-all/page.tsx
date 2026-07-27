import Link from 'next/link';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getNameThemAllItems } from '@/lib/db/queries/name-them-all';
import { NAME_THEM_ALL_PLAYLISTS } from '@/lib/games/name-them-all';
import { safeFetch } from '@/lib/error-handling';
import { gameOgImages } from '@/lib/games/game-seo';

import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Name Them All: K-pop Type-Them-All Challenges',
  description:
    'Name every K-pop group, every 3rd gen group, every 4th gen group, and more before the timer runs out. Free type-them-all grid challenges, no sign-up.',
  openGraph: {
    title: 'Name Them All | KpopQuiz',
    description: 'Type-them-all grid challenges over real K-pop groups. Beat the clock.',
    url: '/games/name-them-all',
    images: gameOgImages('name-them-all'),
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/games/name-them-all' },
};

export default async function NameThemAllIndexPage(): Promise<React.ReactElement> {
  const withCounts = await Promise.all(
    NAME_THEM_ALL_PLAYLISTS.map(async (p) => ({
      playlist: p,
      count: (await safeFetch(getNameThemAllItems(p.slug), [], `[name-them-all index] ${p.slug}`)).length,
    })),
  );
  const live = withCounts.filter((x) => x.count > 0);

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Name Them All',
    url: 'https://kpopquiz.org/games/name-them-all',
    description:
      'Type-them-all grid challenges over real K-pop groups: name all groups, name all 3rd gen, name all 4th gen.',
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
  };

  return (
    <div className="nta-wrap">
      <Breadcrumbs items={[{ label: 'Games', href: '/games' }, { label: 'Name Them All' }]} />
      <header className="nta-idx-head">
        <span className="nta-eyebrow">Name Them All</span>
        <h1 className="nta-title">K-pop Type-Them-All Challenges</h1>
        <p className="nta-blurb">
          A blank grid, a timer, and your memory. Type as many as you can before the clock runs out.
          Looking for member rosters? Those live on <Link href="/games/name-all">Name All Members</Link>.
        </p>
      </header>

      <ul className="nta-idx-grid">
        {live.map(({ playlist, count }) => (
          <li key={playlist.slug}>
            <Link href={`/games/name-them-all/${playlist.slug}`} className="nta-idx-card">
              <span className="nta-idx-q">{playlist.title}</span>
              <span className="nta-idx-foot">
                <span className="nta-idx-stat">{count} {playlist.itemNoun}</span>
                <span className="nta-idx-play">Play {'→'}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
