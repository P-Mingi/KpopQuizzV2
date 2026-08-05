import Link from 'next/link';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getNameThemAllItems } from '@/lib/db/queries/name-them-all';
import { getNameAllGames } from '@/lib/db/queries/games';
import { NAME_THEM_ALL_PLAYLISTS } from '@/lib/games/name-them-all';
import { safeFetch } from '@/lib/error-handling';
import { gameOgImages } from '@/lib/games/game-seo';

import type { Metadata } from 'next';
import type { NameAllMembersContent, GameType } from '@/lib/db/types';

export const revalidate = 3600;

function itemNoun(type: GameType, count: number): string {
  if (type === 'name_all_members') return count === 1 ? 'member' : 'members';
  if (type === 'name_all_idols') return count === 1 ? 'idol' : 'idols';
  if (type === 'name_all_songs' || type === 'name_top_songs') return count === 1 ? 'song' : 'songs';
  if (type === 'name_all_groups') return count === 1 ? 'group' : 'groups';
  return 'items';
}

export const metadata: Metadata = {
  title: 'Name Them All: K-pop Type-Them-All Challenges',
  description:
    'Name every K-pop group, every member of BTS, BLACKPINK, SEVENTEEN, and more before the timer runs out. Free type-them-all grid challenges, no sign-up.',
  openGraph: {
    title: 'Name Them All | KpopQuiz',
    description: 'Type-them-all grid challenges: name all K-pop groups, or every member of your favourite group.',
    url: '/games/name-them-all',
    images: gameOgImages('name-them-all'),
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/games/name-them-all' },
};

export default async function NameThemAllIndexPage(): Promise<React.ReactElement> {
  const [withCounts, memberGames] = await Promise.all([
    Promise.all(
      NAME_THEM_ALL_PLAYLISTS.map(async (p) => ({
        playlist: p,
        count: (await safeFetch(getNameThemAllItems(p.slug), [], `[name-them-all index] ${p.slug}`)).length,
      })),
    ),
    safeFetch(getNameAllGames(0, 50), [], '[name-them-all index] member games'),
  ]);

  const live = withCounts.filter((x) => x.count > 0);

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Name Them All',
    url: 'https://kpopquiz.org/games/name-them-all',
    description:
      'Type-them-all grid challenges over real K-pop groups and member rosters.',
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
        </p>
      </header>

      {/* Group playlists */}
      <ul className="nta-idx-grid">
        {live.map(({ playlist, count }, i) => (
          <li key={playlist.slug}>
            <Link href={`/games/name-them-all/${playlist.slug}`} className="nta-idx-card lmc-card">
              <span className={`lmc-cover lmc-g${(i % 6) + 1}`} aria-hidden="true" />
              <span className="lmc-body">
                <span className="nta-idx-q">{playlist.title}</span>
                <span className="nta-idx-foot">
                  <span className="nta-idx-stat">{count} {playlist.itemNoun}</span>
                  <span className="nta-idx-play">Play {'→'}</span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Individual challenges */}
      {memberGames.length > 0 && (
        <>
          <p className="nta-idx-sec">All Challenges</p>
          <ul className="nta-idx-grid">
            {memberGames.map((g, i) => {
              const content = g.content as NameAllMembersContent;
              const items = content?.members ?? content?.items ?? [];
              const count = Array.isArray(items) ? items.length : 0;
              return (
                <li key={g.id}>
                  <Link href={`/games/name-all/${g.slug}`} className="nta-idx-card lmc-card">
                    <span className={`lmc-cover lmc-g${((i + live.length) % 6) + 1}`} aria-hidden="true" />
                    <span className="lmc-body">
                      <span className="nta-idx-q">{g.title}</span>
                      <span className="nta-idx-foot">
                        <span className="nta-idx-stat">{count} {itemNoun(g.game_type, count)}</span>
                        <span className="nta-idx-play">Play {'→'}</span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
