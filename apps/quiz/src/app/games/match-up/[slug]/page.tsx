import { notFound } from 'next/navigation';

import { MatchUpPlayer } from '@/components/game/match-up-player';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getMatchUpPairs } from '@/lib/db/queries/match-up';
import { MATCH_UP_PLAYLISTS, getMatchUpPlaylist } from '@/lib/games/match-up';
import { gameOgImages } from '@/lib/games/game-seo';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams(): Array<{ slug: string }> {
  return MATCH_UP_PLAYLISTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const playlist = getMatchUpPlaylist(slug);
  if (!playlist) return { title: 'Game Not Found' };

  return {
    title: playlist.seoTitle,
    description: playlist.seoDescription,
    openGraph: {
      title: `${playlist.title} | KpopQuiz`,
      description: playlist.seoDescription,
      url: `/games/match-up/${slug}`,
      images: gameOgImages('match-up'),
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/games/match-up/${slug}` },
  };
}

export default async function MatchUpPlaylistPage({ params }: PageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const playlist = getMatchUpPlaylist(slug);
  if (!playlist) notFound();

  // Real-data gate: getMatchUpPairs returns [] below the minimum, so a thin
  // playlist 404s rather than shipping a padded board.
  const pool = await safeFetch(getMatchUpPairs(slug), [], '[match-up] getPairs');
  if (pool.length === 0) notFound();

  const intro = `${playlist.blurb} Each round samples ${playlist.round} pairs from a pool of ${pool.length} real matches, so the board is different every time. It is free, needs no sign-up, and plays on mobile or desktop.`;

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: playlist.title,
    url: `https://kpopquiz.org/games/match-up/${slug}`,
    description: playlist.seoDescription,
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
  };

  return (
    <div className="py-4 md:py-6">
      <section className="mu-wrap game-intro" style={{ paddingBottom: 0 }}>
        <Breadcrumbs
          items={[
            { label: 'Games', href: '/games' },
            { label: 'Match-Up', href: '/games/match-up' },
            { label: playlist.title },
          ]}
        />
        <h1 className="game-intro-h1">{playlist.title}</h1>
        <p className="game-intro-p">{intro}</p>
      </section>
      <MatchUpPlayer playlist={playlist} pool={pool} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
