import { notFound } from 'next/navigation';

import { MatchUpPlayer } from '@/components/game/match-up-player';
import { GameModeRail } from '@/components/game/game-mode-rail';
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
  // Build safety: preview/CI builds can run without Supabase env vars, and the
  // page body constructs the service-role client during prerender, which throws
  // "supabaseUrl is required" synchronously (escaping safeFetch) and fails the
  // build. Skip build-time params when the URL is absent; dynamicParams (default)
  // still serves + caches each slug via ISR at runtime, so production is unchanged.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  return MATCH_UP_PLAYLISTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const playlist = getMatchUpPlaylist(slug);
  if (!playlist) return { title: 'Game Not Found', robots: { index: false, follow: true } };

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

  // In-game mode rail: live sibling variants only (min-gate, real data).
  const rail = (await Promise.all(
    MATCH_UP_PLAYLISTS.map(async (p) => ({
      slug: p.slug,
      label: p.title,
      count: p.slug === slug ? pool.length : (await safeFetch(getMatchUpPairs(p.slug), [], `[match-up rail] ${p.slug}`)).length,
    })),
  ))
    .filter((r) => r.count > 0)
    .map((r) => ({ slug: r.slug, label: r.label, sub: `${r.count} pairs` }));

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
      <GameModeRail base="/games/match-up" current={slug} items={rail} label="Switch Match-Up mode" />
      <MatchUpPlayer playlist={playlist} pool={pool} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
