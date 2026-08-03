import Link from 'next/link';

import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getNameThemAllItems } from '@/lib/db/queries/name-them-all';
import { getNameAllGames } from '@/lib/db/queries/games';
import { NAME_THEM_ALL_PLAYLISTS } from '@/lib/games/name-them-all';
import { safeFetch } from '@/lib/error-handling';
import { gameOgImages } from '@/lib/games/game-seo';

import type { Metadata } from 'next';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Name Them All: K-pop Type-Them-All Challenges',
  description:
    'Name every member of BTS, BLACKPINK, SEVENTEEN and more, or type every K-pop group and generation before the timer runs out. Free type-them-all challenges, no sign-up.',
  openGraph: {
    title: 'Name Them All | KpopQuiz',
    description: 'Type-them-all challenges over real K-pop groups, generations, and member rosters. Beat the clock.',
    url: '/games/name-them-all',
    images: gameOgImages('name-them-all'),
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/games/name-them-all' },
};

/** Item count from a name-all game's content JSONB (handles `members` and `items`). */
function rosterCount(content: unknown): number {
  const c = content as { members?: unknown[]; items?: unknown[] } | null;
  return c?.members?.length ?? c?.items?.length ?? 0;
}

export default async function NameThemAllIndexPage(): Promise<React.ReactElement> {
  // Two flavours of the same "type them all" game, now on one page:
  // - member rosters (name all BTS/BLACKPINK members), from the games table
  // - group/generation lists (name all groups, all 3rd gen, all 4th gen)
  // Both reads are safeFetch-wrapped so a DB hiccup drops a section, never the page.
  const [withCounts, rosters] = await Promise.all([
    Promise.all(
      NAME_THEM_ALL_PLAYLISTS.map(async (p) => ({
        playlist: p,
        count: (await safeFetch(getNameThemAllItems(p.slug), [], `[name-them-all index] ${p.slug}`)).length,
      })),
    ),
    safeFetch(getNameAllGames(0, 80), [], '[name-them-all index] rosters'),
  ]);
  const live = withCounts.filter((x) => x.count > 0);

  // Keep the members section clean: real-group rosters only (BTS, BLACKPINK, ...),
  // one card per group. The catch-all "General K-pop" bucket and the song/idol/
  // group name-all variants stay on the dedicated /games/name-all page.
  const seenGroup = new Set<string>();
  const rosterGames = rosters.filter((g) => {
    if (g.game_type !== 'name_all_members') return false;
    if (!g.group_name || g.group_name === 'General K-pop') return false;
    const key = g.group_slug ?? g.group_name;
    if (seenGroup.has(key)) return false;
    seenGroup.add(key);
    return true;
  });

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Name Them All',
    url: 'https://kpopquiz.org/games/name-them-all',
    description:
      'Type-them-all challenges over real K-pop: name every member of a group, name all groups, name all 3rd gen, name all 4th gen.',
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
  };

  return (
    <div className="nta-wrap">
      <Breadcrumbs items={[{ label: 'Games', href: '/games' }, { label: 'Name Them All' }]} />
      <header className="nta-idx-head">
        <span className="nta-eyebrow">Name Them All</span>
        <h1 className="nta-title">K-pop Type-Them-All Challenges</h1>
        <p className="nta-blurb">
          A blank grid, a timer, and your memory. Name every member, every group, every generation
          before the clock runs out.
        </p>
      </header>

      {rosterGames.length > 0 && (
        <section>
          <h2 className="nta-idx-sec">Name all members</h2>
          <ul className="nta-idx-grid">
            {rosterGames.map((g) => (
              <li key={g.id}>
                <Link href={`/games/name-all/${g.slug}`} className="nta-idx-card">
                  <span className="nta-idx-q">{g.group_name}</span>
                  <span className="nta-idx-foot">
                    <span className="nta-idx-stat">{rosterCount(g.content)} members</span>
                    <span className="nta-idx-play">Play {'→'}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {live.length > 0 && (
        <section>
          <h2 className="nta-idx-sec">Name all groups &amp; generations</h2>
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
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
