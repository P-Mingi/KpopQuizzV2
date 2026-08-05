import { notFound } from 'next/navigation';

import { NameThemAllPlayer } from '@/components/game/name-them-all-player';
import { GameModeRail } from '@/components/game/game-mode-rail';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getNameThemAllItems } from '@/lib/db/queries/name-them-all';
import { getNameAllGames } from '@/lib/db/queries/games';
import { NAME_THEM_ALL_PLAYLISTS, getNameThemAllPlaylist } from '@/lib/games/name-them-all';
import { gameOgImages } from '@/lib/games/game-seo';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { ModeRailItem } from '@/components/game/game-mode-rail';
import type { NameAllMembersContent } from '@/lib/db/types';

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
  return NAME_THEM_ALL_PLAYLISTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const playlist = getNameThemAllPlaylist(slug);
  if (!playlist) return { title: 'Game Not Found' };

  const count = (await getNameThemAllItems(slug)).length;
  const title = count > 0 ? playlist.seoTitle.replace('{n}', String(count)) : playlist.title;

  return {
    title,
    description: playlist.seoDescription,
    openGraph: {
      title: `${playlist.title} | KpopQuiz`,
      description: playlist.seoDescription,
      url: `/games/name-them-all/${slug}`,
      images: gameOgImages('name-them-all'),
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/games/name-them-all/${slug}` },
  };
}

export default async function NameThemAllPlaylistPage({ params }: PageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const playlist = getNameThemAllPlaylist(slug);
  if (!playlist) notFound();

  const items = await safeFetch(getNameThemAllItems(slug), [], '[name-them-all] getItems');
  if (items.length === 0) notFound();

  // In-game mode rail: playlist siblings + individual name-all games from the DB.
  const [playlistCounts, nameAllGames] = await Promise.all([
    Promise.all(
      NAME_THEM_ALL_PLAYLISTS.map(async (p) => ({
        slug: p.slug,
        label: p.title,
        noun: p.itemNoun,
        count: p.slug === slug ? items.length : (await safeFetch(getNameThemAllItems(p.slug), [], `[name-them-all rail] ${p.slug}`)).length,
      })),
    ),
    safeFetch(getNameAllGames(0, 50), [], '[name-them-all rail] name-all games'),
  ]);

  // Deduplicate: DB games whose slug matches a playlist are already in the rail.
  const playlistSlugs = new Set(NAME_THEM_ALL_PLAYLISTS.map((p) => p.slug));

  const rail: ModeRailItem[] = [
    // Static playlists first
    ...playlistCounts
      .filter((r) => r.count > 0)
      .map((r) => ({ slug: r.slug, label: r.label, sub: `${r.count} ${r.noun}` })),
    // Individual name-all games from the DB (skip duplicates of playlists)
    ...nameAllGames
      .filter((g) => !playlistSlugs.has(g.slug))
      .map((g) => {
        const content = g.content as NameAllMembersContent;
        const arr = content?.members ?? content?.items ?? [];
        const count = Array.isArray(arr) ? arr.length : 0;
        return { slug: g.slug, label: g.title, sub: `${count} to name`, href: `/games/name-all/${g.slug}` };
      }),
  ];

  const intro = `${playlist.blurb} There are ${items.length} real K-pop ${playlist.itemNoun} to name before the timer runs out. Spelling is matched loosely, so punctuation-heavy names like (G)I-DLE and f(x) still count. Free and no sign-up.`;

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: playlist.title,
    url: `https://kpopquiz.org/games/name-them-all/${slug}`,
    description: playlist.seoDescription,
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
  };

  return (
    <div className="py-4 md:py-6">
      <section className="nta-wrap game-intro" style={{ paddingBottom: 0 }}>
        <Breadcrumbs
          items={[
            { label: 'Games', href: '/games' },
            { label: 'Name Them All', href: '/games/name-them-all' },
            { label: playlist.title },
          ]}
        />
        <h1 className="game-intro-h1">{playlist.title}</h1>
        <p className="game-intro-p">{intro}</p>
      </section>
      <GameModeRail base="/games/name-them-all" current={slug} items={rail} label="Switch Name Them All mode" />
      <NameThemAllPlayer playlist={playlist} items={items} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
    </div>
  );
}
