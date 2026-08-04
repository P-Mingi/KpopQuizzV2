import Link from 'next/link';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getMatchUpPairs } from '@/lib/db/queries/match-up';
import { MATCH_UP_PLAYLISTS } from '@/lib/games/match-up';
import { safeFetch } from '@/lib/error-handling';
import { gameOgImages } from '@/lib/games/game-seo';

import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'K-pop Match-Up: Fast Pair-Matching Games',
  description:
    'Match K-pop songs to groups, idols to groups, and song title halves against the clock. Free, no sign-up, tap to pair and beat your time.',
  openGraph: {
    title: 'K-pop Match-Up | KpopQuiz',
    description: 'Fast pair-matching games over real K-pop songs, groups, and idols.',
    url: '/games/match-up',
    images: gameOgImages('match-up'),
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/games/match-up' },
};

export default async function MatchUpIndexPage(): Promise<React.ReactElement> {
  const withCounts = await Promise.all(
    MATCH_UP_PLAYLISTS.map(async (p) => ({
      playlist: p,
      count: (await safeFetch(getMatchUpPairs(p.slug), [], `[match-up index] ${p.slug}`)).length,
    })),
  );
  const live = withCounts.filter((x) => x.count > 0);

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'K-pop Match-Up',
    url: 'https://kpopquiz.org/games/match-up',
    description:
      'Fast pair-matching games over real K-pop songs, groups, and idols: song to group, idol to group, and song title halves.',
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
  };

  return (
    <div className="mu-wrap">
      <Breadcrumbs items={[{ label: 'Games', href: '/games' }, { label: 'Match-Up' }]} />
      <header className="mu-idx-head">
        <span className="mu-eyebrow">Match-Up</span>
        <h1 className="mu-title">K-pop Matching Games</h1>
        <p className="mu-blurb">
          Two columns, one clock. Tap a tile on each side to pair them, and clear the board as fast as you
          can. Songs, groups, idols, and split titles.
        </p>
      </header>

      <ul className="mu-idx-grid">
        {live.map(({ playlist, count }, i) => (
          <li key={playlist.slug}>
            <Link href={`/games/match-up/${playlist.slug}`} className="mu-idx-card lmc-card">
              <span className={`lmc-cover lmc-g${(i % 6) + 1}`} aria-hidden="true" />
              <span className="lmc-body">
                <span className="mu-idx-q">{playlist.title}</span>
                <span className="mu-idx-pair">
                  <span className="si-chip">{playlist.leftLabel}</span>
                  <span className="si-vs">to</span>
                  <span className="si-chip">{playlist.rightLabel}</span>
                </span>
                <span className="mu-idx-foot">
                  <span className="mu-idx-stat">{count} pairs</span>
                  <span className="mu-idx-play">Play {'→'}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
